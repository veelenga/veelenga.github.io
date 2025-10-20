---
title: Configuring AWS Bedrock
date: 2025-10-20T10:30:00+02:00
categories:
excerpt: Learn how to set up AWS Bedrock agents using CloudFormation. Master the three essential components—IAM roles, agents, and aliases—for building AI applications.
tags:
  - aws
  - bedrock
  - cloudformation
  - ai
published: true
---

AWS Bedrock provides access to foundation models like Claude. Setting it up via CloudFormation lets us define AI infrastructure as code—making deployments repeatable and consistent.

This guide focuses on the three core CloudFormation components needed to get a Bedrock agent running.

## The Three Essential Components

A working Bedrock setup requires exactly three things:

1. **IAM Role** - Permissions for Bedrock
2. **Bedrock Agent** - Your AI agent configuration
3. **Agent Alias** - A stable reference to invoke it

Let's build each one.

## Component 1: IAM Role

The IAM role establishes trust between Bedrock and the AWS account. It's the foundation for everything else:

```yaml
BedrockAgentRole:
  Type: AWS::IAM::Role
  Properties:
    RoleName: my-bedrock-role
    AssumeRolePolicyDocument:
      Version: '2012-10-17'
      Statement:
        - Effect: Allow
          Principal:
            Service: bedrock.amazonaws.com
          Action: sts:AssumeRole
    Policies:
      - PolicyName: BedrockAgentPolicy
        PolicyDocument:
          Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Action:
                - 'bedrock:InvokeModel'
              Resource: '*'
```

**What's happening here:**

- **AssumeRolePolicyDocument** - This is the trust policy. The line `bedrock.amazonaws.com` says: "Bedrock service, we're allowing this role to be used." Without this, Bedrock can't do anything.

- **Permissions** - The `bedrock:InvokeModel` action allows the agent to call foundation models. The `*` resource means any model in the account.

That's it. The role is minimal because the agent's only job is to reason through problems—it doesn't need S3, databases, or other services to function as an agent.

## Component 2: Creating the Agent

The agent is where we define the AI's personality, instructions, and which model to use:

```yaml
MyBedrockAgent:
  Type: AWS::Bedrock::Agent
  Properties:
    AgentName: my-ai-agent
    AgentResourceRoleArn: !GetAtt BedrockAgentRole.Arn
    FoundationModel: us.anthropic.claude-3-5-sonnet-20241022-v2:0
    Instruction: |
      You are a helpful assistant. Answer questions clearly and concisely.
      If you don't know something, say so rather than guessing.
    Description: 'My first Bedrock agent'
```

**Breaking down each property:**

- **AgentName** - Unique identifier for this agent
- **AgentResourceRoleArn** - Reference to the IAM role created above (using `!GetAtt` to retrieve its ARN)
- **FoundationModel** - The model ID to use. This is Claude 3.5 Sonnet. Available models can be found in the Bedrock console
- **Instruction** - The system prompt. This defines the agent's behavior. Be specific: what's its role? What should it do? What's important to it?
- **Description** - Metadata for reference

**The Instruction field is crucial.** It's similar to a system prompt in ChatGPT. A good instruction:

- Defines the agent's role ("You are a customer support agent")
- Sets boundaries ("Don't discuss politics")
- Specifies the response style ("Be concise and professional")
- Lists key responsibilities ("Help customers resolve billing issues")

Example of a better instruction:

```yaml
Instruction: |
  You are a customer support assistant for an e-commerce platform.

  Your responsibilities:
  - Help customers troubleshoot order issues
  - Answer questions about shipping and returns
  - Escalate to a human agent if the issue is complex

  Response Guidelines:
  - Be empathetic and professional
  - Keep responses under 150 words
  - Always offer next steps

  Do not:
  - Make refund decisions beyond $50
  - Discuss internal company policies
  - Promise specific delivery dates
```

## Component 3: Agent Alias

An alias is a named reference to the agent. It's what gets invoked—not the agent itself:

```yaml
MyBedrockAgentAlias:
  Type: AWS::Bedrock::AgentAlias
  Properties:
    AgentId: !Ref MyBedrockAgent
    AgentAliasName: live
    Description: 'Live version of the agent'
```

**Why use an alias?**

Without aliases, we'd reference the agent directly. But what happens when the agent is updated? Code changes would be needed everywhere. With an alias:

- **Update the agent** → CloudFormation updates the agent definition
- **The alias automatically points to the latest version**
- **Code never changes** → It always calls the "live" alias

This is especially valuable for deploying changes. We can:

- Create an alias called "live" for production
- Create an alias called "staging" for testing
- Point whichever alias to whatever version needed

When ready to promote a tested version, simply update the alias to point to it.

## Complete Example

Here's a minimal but complete CloudFormation template:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Bedrock Agent Setup'

Resources:
  MyBedrockRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: bedrock.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: BedrockPolicy
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action: 'bedrock:InvokeModel'
                Resource: '*'

  MyAgent:
    Type: AWS::Bedrock::Agent
    Properties:
      AgentName: my-assistant
      AgentResourceRoleArn: !GetAtt MyBedrockRole.Arn
      FoundationModel: us.anthropic.claude-3-5-sonnet-20241022-v2:0
      Instruction: 'You are a helpful AI assistant.'

  MyAgentAlias:
    Type: AWS::Bedrock::AgentAlias
    Properties:
      AgentId: !Ref MyAgent
      AgentAliasName: live

Outputs:
  AgentId:
    Value: !Ref MyAgent
  AliasId:
    Value: !GetAtt MyAgentAlias.AgentAliasId
```

## Deploying

The stack is created with:

```bash
aws cloudformation create-stack \
  --stack-name my-bedrock-stack \
  --template-body file://template.yaml \
  --capabilities CAPABILITY_NAMED_IAM
```

The `--capabilities CAPABILITY_NAMED_IAM` flag is required when creating IAM roles with explicit names.

Check deployment status:

```bash
aws cloudformation describe-stacks \
  --stack-name my-bedrock-stack \
  --query 'Stacks[0].StackStatus'
```

Get the output values (AgentId and AliasId):

```bash
aws cloudformation describe-stacks \
  --stack-name my-bedrock-stack \
  --query 'Stacks[0].Outputs'
```

## Invoking the Agent

Once deployed, the agent can be invoked from anywhere:

```bash
aws bedrock-agent-runtime invoke-agent \
  --agent-id <AgentId> \
  --agent-alias-id <AliasId> \
  --session-id user-123 \
  --input-text "Hello, how are you?"
```

Or programmatically:

```typescript
const client = new BedrockAgentRuntimeClient();
const response = await client.invokeAgent({
  agentId: process.env.AGENT_ID,
  agentAliasId: process.env.ALIAS_ID,
  sessionId: 'user-123',
  inputText: 'What is 2 + 2?'
});
```

## Updating Instructions

To change the agent's behavior, the `Instruction` field is updated and the stack is redeployed:

```bash
aws cloudformation update-stack \
  --stack-name my-bedrock-stack \
  --template-body file://template.yaml \
  --capabilities CAPABILITY_NAMED_IAM
```

CloudFormation detects what changed and applies updates. The alias automatically points to the updated agent.

## Best Practices

1. **Use Aliases** - Always invoke via an alias, never the agent directly
2. **Version Instructions** - Document changes to instructions in version control
3. **Test Instructions** - Complex instructions should be tested before deployment
4. **Use Meaningful Names** - Name agents and aliases clearly (e.g., "customer-support-live", "data-analyzer-staging")
5. **Monitor Costs** - Bedrock charges per token. Monitor usage in the Bedrock console

## Key Takeaways

- **IAM Role** = Trust and permissions for Bedrock
- **Agent** = AI configuration and instructions
- **Alias** = Stable, versioned reference to invoke the agent

These three components work together to create a managed, versionable AI agent. The beauty of CloudFormation is that the entire setup becomes reproducible code—deployable to different accounts, regions, or environments consistently.

## Resources

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [CloudFormation Agent Resource](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-bedrock-agent.html)
