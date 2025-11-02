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

AWS Bedrock provides access to foundation models like Claude.
Setting it up via CloudFormation lets us define AI infrastructure as code and makes deployments repeatable and consistent.
This guide focuses on the three core CloudFormation components needed to get a Bedrock agent running.

## The Three Essential Components

A working Bedrock setup requires exactly three things:

1. **IAM Role** - Permissions for Bedrock
2. **Bedrock Agent** - The AI agent configuration
3. **Agent Alias** - A stable reference to invoke it

Let's build each one.

## Component 1: IAM Role

The IAM role establishes trust between Bedrock and the AWS account. It's the foundation for everything else:

```yaml
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
```

**What's happening:**

- The trust policy (`AssumeRolePolicyDocument`) lets the Bedrock service use this role
- The permission (`bedrock:InvokeModel`) allows calling foundation models

The role is minimal because the agent just needs to call models.

## Component 2: Creating the Agent

The agent is where we define the AI's personality, instructions, and which model to use:

```yaml
MyAgent:
  Type: AWS::Bedrock::Agent
  Properties:
    AgentName: my-assistant
    AgentResourceRoleArn: !GetAtt MyBedrockRole.Arn
    FoundationModel: !Sub 'arn:aws:bedrock:${AWS::Region}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0'
    Instruction: |
      You are a customer support assistant. Your responsibilities:
      - Help customers troubleshoot order issues
      - Answer questions about shipping and returns
      - Escalate to a human agent if the issue is complex
```

**Breaking down each property:**

- **AgentName** - Unique identifier for this agent
- **AgentResourceRoleArn** - Reference to the IAM role created above (using `!GetAtt` to retrieve its ARN)
- **FoundationModel** - The model ARN to use. More on this below.
- **Instruction** - The system prompt. This defines the agent's behavior.

### About the Model ARN

The `FoundationModel` field uses an ARN that includes the region:

```yaml
FoundationModel: !Sub 'arn:aws:bedrock:${AWS::Region}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0'
```

Using `!Sub` with `${AWS::Region}` automatically sets the correct region when deploying, making the template portable across regions.

Find available model IDs in the Bedrock console under "Foundation models".

**The Instruction field is crucial.** It's similar to a system prompt. AWS requires instructions to be at least 40 characters long. Good instructions should:

- Define the agent's role and responsibilities
- Specify response style (tone, length, format)
- Set clear boundaries on what it should and shouldn't do

## Component 3: Agent Alias

An alias is a named reference to the agent. It's what gets invoked—not the agent itself:

```yaml
MyAgentAlias:
  Type: AWS::Bedrock::AgentAlias
  Properties:
    AgentId: !Ref MyAgent
    AgentAliasName: live
```

**Why use an alias?**

Aliases let us update the agent without changing application code.
The application calls the "live" alias, which always points to the latest version.
We can also create separate aliases like "staging" for testing before promoting to production.

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
      FoundationModel: !Sub 'arn:aws:bedrock:${AWS::Region}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0'
      Instruction: |
        You are a customer support assistant. Your responsibilities:
        - Help customers troubleshoot order issues
        - Answer questions about shipping and returns
        - Escalate to a human agent if the issue is complex

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

Deploy the stack:

```bash
aws cloudformation create-stack \
  --stack-name my-bedrock-stack \
  --template-body file://template.yml \
  --capabilities CAPABILITY_IAM
```

The `CAPABILITY_IAM` flag is required because we're creating an IAM role.

Once deployed, find the AgentId and AliasId in the stack outputs—we'll need these to invoke the agent.

## Invoking the Agent

Invoke the agent using the AgentId and AliasId from the stack outputs:

```typescript
import { BedrockAgentRuntimeClient } from '@aws-sdk/client-bedrock-agent-runtime';

const client = new BedrockAgentRuntimeClient({ region: 'eu-west-1' });
const response = await client.invokeAgent({
  agentId: 'YOUR_AGENT_ID',
  agentAliasId: 'YOUR_ALIAS_ID',
  sessionId: 'user-123',
  inputText: 'Hello, how can you help me?'
});
```

## Updating the Agent

To change the agent's behavior, update the `Instruction` field in the template and redeploy:

```bash
aws cloudformation update-stack \
  --stack-name my-bedrock-stack \
  --template-body file://template.yml \
  --capabilities CAPABILITY_IAM
```

CloudFormation detects the changes and updates the agent. The alias automatically points to the new version.

## Things to Remember

- **Use the full model ARN** with `!Sub` for automatic region handling
- **Always invoke via an alias**, not the agent directly—makes updates seamless
- **Instructions must be 40+ characters** (AWS requirement)
- **Name things clearly**—"customer-support-live" beats "agent-1"
- **Watch costs**—Bedrock charges per token

## Wrap-up

Three components work together: an IAM role for permissions, an agent with instructions, and an alias to invoke it.
CloudFormation makes the whole setup reproducible.
Deploy it to any account or region consistently.

## Resources

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [CloudFormation Agent Resource](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-bedrock-agent.html)
