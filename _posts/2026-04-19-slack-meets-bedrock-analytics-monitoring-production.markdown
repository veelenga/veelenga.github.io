---
title: "Slack meets Bedrock: analytics, monitoring, and production"
date: 2026-04-19T00:00:00+00:00
excerpt: "Deploying an AI bot is the easy part. Knowing whether it's helping anyone, catching failures before users report them, and keeping costs under control is where the real engineering happens."
tags:
  - aws
  - bedrock
  - slack
  - system design
  - development
published: true
---

This is **part 3** of a three-part series on building a Slack bot powered by AWS Bedrock Agents.

1. [Building the gateway](/slack-meets-bedrock-building-the-gateway/)
2. [Knowledge bases, tools, and action groups](/slack-meets-bedrock-knowledge-bases-tools-action-groups/)
3. **Analytics, monitoring, and production** (this post)

---

In [part 1](/slack-meets-bedrock-building-the-gateway/) we built the gateway. In [part 2](/slack-meets-bedrock-knowledge-bases-tools-action-groups/) we gave the agent knowledge and tools. The bot works. Users can ask questions, search tickets, analyze data.

Now what? How do you know which knowledge bases are actually useful? Whether the agent hallucinates? What questions users are asking? What the system costs per conversation?

Deploying an AI bot is the easy part. Understanding its behavior in production is where the real engineering happens.

## Analytics pipeline

The goal: capture every conversation event, store it cheaply, and make it queryable without running a database.

![Analytics pipeline](/images/slack-meets-bedrock/analytics.svg)

The pipeline uses four AWS services:

| Service | Role | Cost model |
|---|---|---|
| Kinesis Firehose | Buffer and deliver events | Per GB ingested |
| S3 | Store compressed event files | Per GB stored |
| Glue | Define table schema over S3 | Free (catalog only) |
| Athena | Query with SQL | Per TB scanned |

No servers. No database. Events flow in, land in S3 as gzipped JSON, and you query them with SQL when you need answers.

### What to capture

Every time the agent processes a message, the gateway publishes an event:

```json
{
  "timestamp": "2026-04-19T14:32:00Z",
  "user_id": "U024BE7LH",
  "thread_id": "1713534720.001234",
  "message_length": 142,
  "response_length": 1893,
  "knowledge_bases": ["security-policies-kb"],
  "search_queries": ["password rotation policy remote employees"],
  "rationale": "User is asking about security policy for remote workers. Searching security policies knowledge base."
}
```

Each field serves a purpose:

| Field | What it tells you |
|---|---|
| `user_id` | Who uses the bot and how often |
| `thread_id` | Conversation grouping for session analysis |
| `message_length` / `response_length` | Complexity proxy; long responses suggest detailed questions |
| `knowledge_bases` | Which KBs the agent consults; unused KBs can be removed |
| `search_queries` | What the agent actually searches for, not what the user typed |
| `rationale` | The agent's reasoning before taking action |

The `search_queries` field is especially valuable. It shows the gap between what users ask and what the agent searches. If users ask "PTO policy" but the agent searches "vacation leave entitlement policy," you learn something about your document naming.

### Firehose configuration

```yaml
EventsStream:
  Type: AWS::KinesisFirehose::DeliveryStream
  Properties:
    DeliveryStreamType: DirectPut
    ExtendedS3DestinationConfiguration:
      BucketARN: !GetAtt AnalyticsBucket.Arn
      Prefix: 'events/'
      ErrorOutputPrefix: 'errors/events/'
      CompressionFormat: GZIP
      BufferingHints:
        IntervalInSeconds: 300
        SizeInMBs: 5
```

Firehose buffers events for up to 5 minutes or 5MB, whichever comes first, then writes a single gzipped file to S3. For a bot handling 50 conversations per day, this means roughly one file per 5-minute window during active hours.

### Glue table

The Glue table maps a schema over the raw S3 files. No ETL, no data transformation. Just metadata.

```yaml
EventsTable:
  Type: AWS::Glue::Table
  Properties:
    DatabaseName: !Ref GlueDatabase
    TableInput:
      Name: events
      TableType: EXTERNAL_TABLE
      Parameters:
        classification: json
        compressionType: gzip
      StorageDescriptor:
        Location: !Sub 's3://${AnalyticsBucket}/events/'
        SerdeInfo:
          SerializationLibrary: org.openx.data.jsonserde.JsonSerDe
        Columns:
          - Name: timestamp
            Type: string
          - Name: user_id
            Type: string
          - Name: thread_id
            Type: string
          - Name: message_length
            Type: int
          - Name: response_length
            Type: int
          - Name: knowledge_bases
            Type: array<string>
          - Name: search_queries
            Type: array<string>
          - Name: rationale
            Type: string
```

### Useful queries

With the table in place, Athena lets you answer real questions:

**Most active users this month:**

```sql
SELECT user_id, COUNT(*) as messages
FROM events
WHERE timestamp >= '2026-04-01'
GROUP BY user_id
ORDER BY messages DESC
LIMIT 10;
```

**Knowledge base usage:**

```sql
SELECT kb, COUNT(*) as hits
FROM events
CROSS JOIN UNNEST(knowledge_bases) AS t(kb)
WHERE timestamp >= '2026-04-01'
GROUP BY kb
ORDER BY hits DESC;
```

**Questions where no knowledge base was consulted** (potential gaps):

```sql
SELECT timestamp, user_id, rationale
FROM events
WHERE cardinality(knowledge_bases) = 0
  AND timestamp >= '2026-04-01'
ORDER BY timestamp DESC
LIMIT 50;
```

That last query is gold. It shows conversations where the agent couldn't find relevant documents. Each result is a potential content gap in your knowledge bases.

## Trace parsing

Bedrock Agent responses come as an event stream. Mixed in with the actual text are trace events containing the agent's internal reasoning: which knowledge bases it consulted, what queries it ran, what its preprocessing rationale was.

[ark](https://github.com/crystal-autobot/ark) parses these traces in real time as the response streams in:

```
EventStream.decode(response) do |message|
  case message.event_type
  when "chunk"
    # Append text to the response buffer
    extract_text_and_citations(message)
  when "trace"
    # Extract metadata for analytics
    parse_trace(message)
  when "files"
    # Collect output files from code interpreter
    extract_files(message)
  end
end
```

Trace events contain nested JSON with varying structure depending on the trace type:

| Trace type | What it contains |
|---|---|
| `preProcessingTrace` | The agent's rationale before acting |
| `orchestrationTrace` | Which knowledge bases and action groups were invoked |
| `knowledgeBaseLookupOutput` | Retrieved document references with source names |

The preprocessor rationale is particularly useful. It shows the agent's reasoning before it does anything: "User is asking about security compliance for remote workers. I should search the security policies knowledge base." When the agent makes wrong routing decisions, this trace tells you why.

Source extraction from knowledge base lookups also matters for the user experience. The gateway collects source document names and appends them to the Slack response, so users can verify the information.

## Deployment

![Deployment architecture](/images/slack-meets-bedrock/deployment.svg)

### ECS task

The gateway runs as an ECS Fargate task. The resource requirements are minimal:

```yaml
SlackGatewayService:
  Type: AWS::ECS::Service
  Properties:
    Cluster: !Ref ECSCluster
    TaskDefinition: !Ref TaskDefinition
    DesiredCount: 1
    DeploymentConfiguration:
      MinimumHealthyPercent: 0
      MaximumPercent: 200
      DeploymentCircuitBreaker:
        Enable: true
        Rollback: true
```

A few decisions worth explaining:

**MinimumHealthyPercent: 0.** During deployment, the old task can stop before the new one starts. For a Slack bot, a few seconds of downtime during deploy is acceptable. The alternative (running two tasks simultaneously) creates duplicate message processing because both connect to the same Socket Mode WebSocket.

**Circuit breaker with rollback.** If the new task fails to start (bad image, missing env vars, crash loop), ECS automatically rolls back to the previous task definition. This prevents a bad deploy from leaving the bot permanently offline.

**128MB RAM, 128 CPU units.** The gateway is I/O bound. It spends its time waiting for Slack WebSocket events and Bedrock HTTP responses. CPU and memory usage are negligible. If you're running in a language with a larger runtime (Node.js, Python), you might need 256MB or 512MB, but the CPU allocation stays the same.

### Health checks

Socket Mode bots don't expose HTTP endpoints, so traditional health checks don't apply. A simple process-level check works:

```yaml
HealthCheck:
  Command:
    - CMD-SHELL
    - kill -0 1
  Interval: 5
  Timeout: 2
  Retries: 3
  StartPeriod: 10
```

This checks whether PID 1 (the gateway process) is alive. It doesn't verify that the Slack WebSocket is connected, but combined with Slack's own reconnection logic and ECS's restart policy, it's sufficient.

For deeper health monitoring, log a heartbeat message periodically and alert on its absence (see alarms below).

### Secrets

Two categories of secrets, handled differently:

**Slack tokens** (bot token and app-level token) are injected via ECS task definition `Secrets`, which pulls from Secrets Manager at task start. The container sees them as environment variables. They never touch disk.

**External API credentials** (e.g., Jira) are read by the Lambda function at invocation time, not cached. The Lambda calls `secretsmanager:GetSecretValue` on each request. For low-throughput bots (under 100 requests per hour), this adds negligible latency and ensures credential rotation takes effect immediately.

```yaml
SlackBotTokenSecret:
  Type: AWS::SecretsManager::Secret
  Properties:
    Name: !Sub '${AWS::StackName}/slack/bot-token'
    Description: 'Slack bot user OAuth token'
    SecretString: 'PLACEHOLDER_UPDATE_ME'
```

After deploying the stack, update the placeholder with the real token:

```bash
aws secretsmanager put-secret-value \
  --secret-id my-bot/slack/bot-token \
  --secret-string "xoxb-your-actual-token"
```

## Monitoring and alarms

### Lambda errors

If your action group Lambda starts failing, the agent loses a capability. Users get vague responses instead of ticket data.

```yaml
LambdaErrorAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    Namespace: AWS/Lambda
    MetricName: Errors
    Dimensions:
      - Name: FunctionName
        Value: !Sub '${AWS::StackName}-ticket-action-group'
    Statistic: Sum
    Period: 900
    EvaluationPeriods: 1
    Threshold: 0
    ComparisonOperator: GreaterThanThreshold
    TreatMissingData: notBreaching
    AlarmActions:
      - !Ref AlarmSNSTopic
```

This fires after a single error in any 15-minute window. Aggressive, but for a bot with low traffic, any Lambda error is worth investigating immediately.

### Gateway health

Monitor the ECS service for task restarts:

```yaml
TaskFailureAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    Namespace: ECS/ContainerInsights
    MetricName: RunningTaskCount
    Dimensions:
      - Name: ServiceName
        Value: !Ref SlackGatewayService
    Statistic: Minimum
    Period: 300
    EvaluationPeriods: 2
    Threshold: 1
    ComparisonOperator: LessThanThreshold
    TreatMissingData: breaching
```

If the running task count drops below 1 for two consecutive 5-minute periods, something is wrong. Combined with the circuit breaker, this catches both crash loops and deployment failures.

## Cost model

Understanding costs helps you set expectations and optimize. Here's what each component costs for a bot handling around 50 conversations per day.

| Component | Cost driver | Typical monthly cost |
|---|---|---|
| Bedrock Agent (Claude Haiku) | Input/output tokens | $5 to $30 |
| Knowledge base embeddings | Titan embed per sync | < $1 |
| S3 vector store | Storage + queries | < $1 |
| Firehose | GB ingested | < $1 |
| S3 (analytics) | GB stored | < $0.10 |
| Athena | TB scanned per query | < $0.50/month |
| ECS Fargate | vCPU + memory hours | $3 to $5 |
| Secrets Manager | Per secret per month | $2 (4 secrets) |
| Lambda | Invocations | < $0.10 |
| **Total** | | **$15 to $40** |

The dominant cost is Bedrock invocations. Everything else is negligible. Three ways to control it:

1. **Choose the right model.** Claude Haiku is 10 to 20x cheaper than Sonnet or Opus. For most internal bot tasks, Haiku is sufficient.
2. **Watch response lengths.** Long agent responses burn output tokens. The agent instructions can say "keep responses concise" and it actually works.
3. **Monitor knowledge base usage.** If a knowledge base is rarely consulted, consider whether it's pulling its weight. Each KB retrieval adds token cost from the retrieved chunks.

## Putting it all together

Here is the complete resource map for the system:

| Resource | Type | Purpose |
|---|---|---|
| ECS Service | Compute | Runs the gateway |
| Secrets Manager (x3) | Config | Slack tokens, API credentials |
| Bedrock Agent | AI | Foundation model + routing |
| Bedrock Agent Alias | AI | Stable deployment pointer |
| Knowledge Bases (x3) | AI | Domain-specific document search |
| Lambda | Compute | Action group handler |
| Firehose | Analytics | Event delivery |
| S3 (knowledge base) | Storage | Source documents |
| S3 (analytics) | Storage | Event archive |
| Glue Database + Table | Analytics | Schema for Athena |
| CloudWatch Alarms | Monitoring | Failure detection |

One CloudFormation stack. All resources reference each other through `!Ref` and `!GetAtt`. Deploy once, update incrementally. The agent alias gives you versioned deployments with rollback.

## Wrap-up

Three posts, one system:

1. [**The gateway**](/slack-meets-bedrock-building-the-gateway/) translates between Slack's WebSocket world and Bedrock's HTTP API. Socket Mode eliminates public endpoints. Thread timestamps map to sessions. A semaphore prevents overload.

2. [**Knowledge and tools**](/slack-meets-bedrock-knowledge-bases-tools-action-groups/) make the agent useful. Separate knowledge bases for separate domains. Lambda-backed action groups for external system access. Code interpreter for computation. Descriptions drive routing.

3. **Analytics and production** (this post) make the system observable and reliable. Firehose to S3 to Athena gives you SQL over every conversation. ECS with circuit breakers handles deployment. CloudWatch alarms catch failures.

The total infrastructure cost for a team-sized bot runs $15 to $40 per month. The dominant cost is Bedrock invocations. Everything else rounds to zero.

The most valuable thing you build isn't the bot. It's the analytics pipeline that shows you what people actually ask, what the agent can't answer, and where your documentation has gaps. That feedback loop improves both the bot and the organization it serves.

The entire gateway layer described across this series is implemented in [ark](https://github.com/crystal-autobot/ark). It handles Socket Mode, session management, Bedrock Agent invocation, trace parsing, analytics publishing, and Slack formatting in a single binary. If you're building something similar, it can save you a few weeks of plumbing.

## Resources

- [ark](https://github.com/crystal-autobot/ark) — open-source Slack gateway for AWS Bedrock Agents
- [Kinesis Firehose documentation](https://docs.aws.amazon.com/firehose/latest/dev/what-is-this-service.html)
- [Athena query documentation](https://docs.aws.amazon.com/athena/latest/ug/querying.html)
- [ECS deployment circuit breaker](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-circuit-breaker.html)
- [Bedrock Agent traces](https://docs.aws.amazon.com/bedrock/latest/userguide/trace-events.html)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html)
