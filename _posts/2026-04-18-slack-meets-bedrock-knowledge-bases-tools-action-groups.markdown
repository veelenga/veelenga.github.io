---
title: "Slack meets Bedrock: knowledge bases, tools, and action groups"
date: 2026-04-18T10:00:00+02:00
excerpt: "A chatbot that only answers general questions is a worse Google. This post covers how to give a Bedrock Agent domain-specific intelligence through knowledge bases, Lambda-backed action groups, and a code interpreter."
tags:
  - aws
  - bedrock
  - slack
  - system design
  - development
published: true
---

This is **part 2** of a three-part series on building a Slack bot powered by AWS Bedrock Agents.

1. [Building the gateway](/slack-meets-bedrock-building-the-gateway/)
2. **Knowledge bases, tools, and action groups** (this post)
3. [Analytics, monitoring, and production](/slack-meets-bedrock-analytics-monitoring-production/)

---

In [part 1](/slack-meets-bedrock-building-the-gateway/) we built the bridge between Slack and Bedrock. The agent can receive messages and respond. But right now, it only knows what the foundation model was trained on. Ask it about your company's security policy and it will confidently make something up.

A chatbot that can only answer general questions is a worse Google. The real value comes when it knows your data and can take actions on your behalf.

## Three types of intelligence

Bedrock Agents support three capability types, each solving a different problem:

| Capability | What it does | Example |
|---|---|---|
| Knowledge bases | Search your documents (RAG) | "What's our password rotation policy?" |
| Action groups | Call external APIs via Lambda | "Create a bug ticket for the login page" |
| Code interpreter | Execute Python in a sandbox | "Plot monthly signups from this CSV" |

The agent decides which capabilities to use based on the user's question. No routing logic needed on your side. The foundation model reads the descriptions you provide for each knowledge base and action group, then makes the call.

This is the key insight: **you describe capabilities, the model routes to them.** The quality of your descriptions directly determines how well routing works.

## Knowledge bases and RAG

RAG (Retrieval-Augmented Generation) is the pattern that lets an LLM answer questions about documents it was never trained on. Instead of fine-tuning the model, you retrieve relevant chunks at query time and include them in the context.

![RAG pipeline](/images/slack-meets-bedrock/rag-pipeline.svg)

The pipeline has two phases:

**Ingestion.** Documents go into an S3 bucket. Bedrock chunks them, generates embeddings using a model like Amazon Titan, and stores the vectors in a vector store. This happens once per sync.

**Query.** When a user asks a question, Bedrock converts the question to an embedding, searches for nearest neighbors in the vector store, retrieves the matching chunks, and feeds them to the foundation model as context.

### Setting up a knowledge base

The CloudFormation resources for a single knowledge base:

```yaml
KnowledgeBase:
  Type: AWS::Bedrock::KnowledgeBase
  Properties:
    Name: security-policies-kb
    Description: "Internal security and privacy policies"
    RoleArn: !GetAtt KnowledgeBaseRole.Arn
    KnowledgeBaseConfiguration:
      Type: VECTOR
      VectorKnowledgeBaseConfiguration:
        EmbeddingModelArn: !Ref EmbeddingModelArn
    StorageConfiguration:
      Type: S3_VECTORS
      S3VectorsConfiguration:
        VectorBucketArn: !Sub 'arn:aws:s3vectors:${AWS::Region}:${AWS::AccountId}:bucket/${VectorBucketName}'
        IndexName: security-policies-index

DataSource:
  Type: AWS::Bedrock::DataSource
  Properties:
    KnowledgeBaseId: !Ref KnowledgeBase
    Name: security-policies
    DataSourceConfiguration:
      Type: S3
      S3Configuration:
        BucketArn: !GetAtt KnowledgeBaseBucket.Arn
        InclusionPrefixes:
          - 'security-policies/'
```

Upload your documents to `s3://bucket/security-policies/`, trigger a sync, and the knowledge base is ready.

### Why separate knowledge bases matter

You could put all your documents in one knowledge base. It would work. But separate knowledge bases offer three advantages.

**Precision.** When the agent searches a focused index, the retrieved chunks are more relevant. A question about password policies won't pull up chunks from legal regulations just because they share the word "compliance."

**Independent update cycles.** Your security policies change quarterly. Your product documentation changes daily. Separate knowledge bases let you sync each on its own schedule without re-indexing everything.

**Clear citations.** When the agent cites a source, you want the user to know whether it came from a security policy or a legal document. Separate knowledge bases make attribution straightforward.

A practical setup might look like:

| Knowledge base | Sources | Update frequency |
|---|---|---|
| Security policies | Policy PDFs, compliance docs | Quarterly |
| Legal regulations | Statutory rules, regulatory filings | As published |
| Product docs | Source code, specs, runbooks | Daily or on merge |

The agent instructions tell the model when to use each one:

```
For questions about internal policies, use the security policies knowledge base.
For questions about laws and regulations, use the legal knowledge base.
For product questions, use the product knowledge base.
```

## Action groups: giving the agent hands

Knowledge bases give the agent eyes. It can read your documents. Action groups give it hands. It can take actions in external systems.

![Agent routing](/images/slack-meets-bedrock/agent-routing.svg)

An action group is a Lambda function with a function schema. You define what the function does, what parameters it accepts, and the agent decides when to call it. The interaction:

1. User says "Find tickets about the login bug"
2. Agent reads the action group descriptions, decides to call `searchTickets`
3. Bedrock invokes your Lambda with the function name and parameters
4. Lambda calls the Jira API (or whatever system), returns results
5. Agent incorporates the results into its response

### Defining the function schema

The schema lives in the agent definition. Here is an example for a ticket system integration:

```yaml
ActionGroups:
  - ActionGroupName: TicketSystem
    ActionGroupExecutor:
      Lambda: !GetAtt TicketLambda.Arn
    FunctionSchema:
      Functions:
        - Name: searchTickets
          Description: >-
            Search tickets using a query language. Build proper queries
            from the user's request. Always include a project filter.
          Parameters:
            query:
              Type: string
              Description: 'Query string with project filter'
              Required: true

        - Name: getTicket
          Description: >-
            Get full details of a ticket by key, including description,
            comments, status, assignee, and priority.
          Parameters:
            ticketKey:
              Type: string
              Description: 'Ticket key, e.g. PROJ-123'
              Required: true

        - Name: createTicket
          Description: >-
            Create a new ticket. Only create when explicitly asked.
            Clarify parameters only if essential context is missing.
          Parameters:
            summary:
              Type: string
              Description: 'Ticket title'
              Required: true
            description:
              Type: string
              Description: 'Detailed description from conversation context'
              Required: true
            issueType:
              Type: string
              Description: 'Issue type: Task, Bug, or Story. Defaults to Task.'
              Required: false
```

**The descriptions matter more than you think.** The agent uses them to decide when and how to call each function. Vague descriptions lead to wrong routing. "Search tickets" is worse than "Search tickets using a query language. Build proper queries from the user's request."

### The Lambda handler

The Lambda receives a standard Bedrock Agent event:

```json
{
  "function": "searchTickets",
  "parameters": [
    { "name": "query", "value": "project=PROJ AND text ~ \"login bug\"" }
  ],
  "sessionAttributes": {
    "user_name": "Alice Smith"
  }
}
```

Your handler extracts the function name, dispatches to the right logic, and returns a response body. The agent treats the response as a tool result and reasons about it.

A few design principles for action group Lambdas:

**Keep them thin.** The Lambda should be a bridge to your API, not a business logic layer. Validate inputs, call the API, format the response.

**Return structured text, not JSON.** The agent reads the response as natural language. A formatted text block ("Found 3 tickets: PROJ-101 (open), PROJ-102 (closed)...") works better than raw JSON.

**Use session attributes.** The gateway passes user information (name, email) as session attributes. The Lambda can use these for attribution ("Created by Alice Smith") without asking the user for their identity.

## Code interpreter

The code interpreter is a built-in action group that runs Python in a sandboxed environment. No Lambda needed. Enable it with two lines:

```yaml
- ActionGroupName: CodeInterpreter
  ParentActionGroupSignature: AMAZON.CodeInterpreter
  ActionGroupState: ENABLED
```

The agent uses it automatically when the task involves computation, data transformation, or visualization. A user uploads a CSV and asks "show me a trend chart." The agent writes Python code, executes it, and returns the generated chart as a file.

What it handles well:

| Task | Example |
|---|---|
| Data analysis | "What's the average response time in this log file?" |
| Visualization | "Plot signups by month from this spreadsheet" |
| Calculations | "Convert these quarterly numbers to annual growth rates" |
| File transformation | "Extract emails from this CSV and deduplicate" |

The gateway handles the file round-trip: download from Slack, send to Bedrock, receive output files, upload back to Slack. [Part 1](/slack-meets-bedrock-building-the-gateway/) covered the mechanics.

## Writing effective agent instructions

The agent instructions are a system prompt. They tell the foundation model who it is, what it can do, and how to behave. This is where most of the tuning happens.

A well-structured instruction set covers five areas:

**1. Identity and scope.** What the agent is and what it's for.

```
You are an internal assistant available in Slack. You help employees
with their questions and tasks.
```

**2. Knowledge base routing.** When to use each knowledge base.

```
Knowledge bases:
  - Security policies: internal security and privacy policies
  - Legal: US statutory rules and regulations
  - Product: source code, documentation, and specifications

For security questions, search the security policies knowledge base.
For legal questions, search the legal knowledge base.
For product questions, search the product knowledge base.
```

**3. Behavioral rules.** Guard against common failure modes.

```
Rules:
  1. When citing a source, include the document name and section
  2. If an answer is not in the knowledge bases, say so clearly
  3. Never invent identifiers, names, or values not present in
     retrieved content
  4. For ambiguous questions, ask for clarification
```

Rule 3 is critical. Without it, the model will hallucinate ticket numbers, policy names, and API endpoints. Explicitly telling it not to invent identifiers reduces this dramatically.

**4. Response style.** Match your audience.

```
Response style:
  - Use professional but accessible language
  - Keep responses concise and relevant
  - Avoid technical jargon unless the question is technical
```

**5. Formatting rules.** Prevent rendering issues in Slack.

```
Formatting:
  - Never use markdown formatting inside table cells
  - Keep table cells concise
  - When referencing tickets, link them: [PROJ-123](https://your-tracker/PROJ-123)
```

The formatting rules might seem minor, but they prevent a class of issues where the agent's response looks broken in Slack. Bold text inside a table cell renders differently than the agent expects.

## Connecting it all

The full agent definition ties knowledge bases and action groups together:

```yaml
BedrockAgent:
  Type: AWS::Bedrock::Agent
  Properties:
    AgentName: my-slack-agent
    FoundationModel: us.anthropic.claude-haiku-4-5-20251001-v1:0
    Instruction: !Ref AgentInstructions
    ActionGroups:
      - ActionGroupName: CodeInterpreter
        ParentActionGroupSignature: AMAZON.CodeInterpreter
        ActionGroupState: ENABLED
      - ActionGroupName: TicketSystem
        ActionGroupExecutor:
          Lambda: !GetAtt TicketLambda.Arn
        ActionGroupState: ENABLED
        FunctionSchema: ...
    KnowledgeBases:
      - KnowledgeBaseId: !Ref SecurityPoliciesKB
        KnowledgeBaseState: ENABLED
        Description: "Internal security and privacy policies"
      - KnowledgeBaseId: !Ref LegalKB
        KnowledgeBaseState: ENABLED
        Description: "US statutory rules and regulations"
      - KnowledgeBaseId: !Ref ProductKB
        KnowledgeBaseState: ENABLED
        Description: "Product source code and documentation"
```

After creating the agent, create an alias:

```yaml
AgentAlias:
  Type: AWS::Bedrock::AgentAlias
  Properties:
    AgentId: !Ref BedrockAgent
    AgentAliasName: live
```

The alias provides a stable identifier. When you update the agent (new instructions, new action groups), create a new alias version. The gateway points to the alias, not the agent directly. This gives you safe rollback if a change breaks something.

## Wrap-up

A Bedrock Agent becomes genuinely useful when it knows your data and can interact with your systems. The three capability types cover different needs:

1. **Knowledge bases** answer questions from your documents using RAG. Separate them by domain for better precision and independent update cycles.
2. **Action groups** connect the agent to external APIs through Lambda. The function schema descriptions are the primary routing mechanism.
3. **Code interpreter** handles computation, visualization, and file transformation without any custom code.

The descriptions you write for each capability determine routing quality. Invest time in them.

In [part 3](/slack-meets-bedrock-analytics-monitoring-production/), we make the system production-ready with analytics, monitoring, and deployment automation.

## Resources

- [ark](https://github.com/crystal-autobot/ark) — the Slack gateway that ties all of this together
- [Bedrock Knowledge Bases documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html)
- [Bedrock Agent action groups](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-action-create.html)
- [Bedrock Code Interpreter](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-code-interpretation.html)
- [S3 Vectors (preview)](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vectors.html)
