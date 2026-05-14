---
title: "One Bedrock knowledge base, many vendors"
date: 2026-05-13T10:00:00+02:00
excerpt: "A knowledge base per vendor is expensive. One shared pile leaks. Metadata-tagged documents with a query-time filter sit in the middle, and that's the pattern that actually scales."
tags:
  - aws
  - bedrock
  - rag
  - multi-vendor
  - system design
published: true
---

SaaS products rarely serve a single customer.
They serve many, each with their own data, their own rules, their own boundaries.
Add a RAG-powered AI assistant on top and a new question shows up: how do we keep all that data separated inside one knowledge base?

## The problem

Picture a support chatbot used by three retailers: kitchen supplies, sporting goods, electronics.
A shopper on the electronics site must never see an answer pulled from the kitchen retailer's policy.

The catch is something we can't configure away.
RAG retrieval has no concept of a "vendor".
It returns whichever chunks score highest, and math beats business rules every time.

![The agent retrieves mixed chunks and produces a contaminated answer](/images/bedrock-kb-multivendor/the-problem.svg)

## The solution

Three architectures could fix this. The last one is the one that scales.

**A knowledge base per vendor.**
Each customer gets their own KB, their own vector index, their own ingestion pipeline.
Isolation is absolute. The cost catches up fast.
AWS caps how many knowledge bases live in one account.
Every KB needs its own sync schedule.
Shared content like return-policy templates and order-tracking FAQs gets duplicated across every vendor.
The same paragraph gets embedded a hundred times. A hundred pipelines need babysitting.
By the time the customer list grows, the operational cost outweighs the benefit.

**One knowledge base with everything mixed in.**
Cheap, simple, and unsafe.
The vector store has no idea which chunk belongs to which vendor.
A Northwind shopper can pull back Contoso's policy and the model will happily quote it (the failure shown above).
Prompt instructions like "only use Northwind content" don't help.
By the time the model reads them, it has already seen the wrong context.

**One knowledge base, every document tagged.** *The pragmatic middle.*
Still one KB. One vector index. One ingestion pipeline.
But every document carries a `vendor` label, and every search adds a filter:

> return chunks where `vendor = <caller> OR vendor = shared`

The vector store applies the filter before any chunk reaches the model.
The chunks the model doesn't see, it cannot quote.

This is the architecture that scales.
Isolation stays strong because wrong-vendor chunks are never retrieved in the first place.
The operational footprint stays small: one pipeline, one index, one bill.
Shared content lives once and gets reused.
A new vendor is a folder, not a deployment.

## File layout

The repository feeding the KB has one folder per vendor, plus a shared folder for content everyone uses:

```
kb/
├── shared/
│   ├── return_policy.md
│   ├── order_tracking.md
│   └── glossary.md
├── northwind/
│   ├── catalog.md
│   └── price_match.md
├── contoso/
│   ├── warranties.md
│   └── size_guide.md
└── fabrikam/
    ├── warranties.md
    └── tech_specs.md
```

`shared/` holds anything that applies to everyone.
Each vendor folder holds content specific to that vendor.
`warranties.md` appearing in both Contoso and Fabrikam is fine. They're two unrelated documents that happen to share a name.

![Knowledge base layout](/images/bedrock-kb-multivendor/kb-layout.svg)

## Metadata sidecars

Next to every `.md` file sits a small `.metadata.json` sidecar.
Bedrock picks these up automatically during ingestion and attaches their attributes to every chunk extracted from the source document.

A vendor sidecar:

```json
{
  "metadataAttributes": {
    "vendor": "northwind"
  }
}
```

A shared sidecar:

```json
{
  "metadataAttributes": {
    "vendor": "shared"
  }
}
```

The value is a single string.
Multi-value metadata is supported but rarely worth the complexity.
A document either belongs to one vendor or to everyone.

## The filter

![Retrieval flow](/images/bedrock-kb-multivendor/retrieval-flow.svg)

Every query carries a filter alongside it.
That filter runs inside Bedrock, before any chunk reaches the model.
Contoso and Fabrikam content isn't filtered *out* of the answer. It's never retrieved.

In Python, building the filter for an agent invocation looks like this:

```python
def build_kb_session_state(vendor: str, kb_id: str) -> dict:
    """Build session state with a metadata filter for the agent."""
    filter_config = {
        "orAll": [
            {"equals": {"key": "vendor", "value": vendor}},
            {"equals": {"key": "vendor", "value": "shared"}},
        ]
    }

    return {
        "knowledgeBaseConfigurations": [
            {
                "knowledgeBaseId": kb_id,
                "retrievalConfiguration": {
                    "vectorSearchConfiguration": {
                        "filter": filter_config,
                        "numberOfResults": 5,
                    }
                },
            }
        ]
    }


session_state = build_kb_session_state(vendor="northwind", kb_id=KB_ID)

bedrock_agent.invoke_agent(
    agentId=AGENT_ID,
    agentAliasId=AGENT_ALIAS_ID,
    sessionId=session_id,
    sessionState=session_state,
    inputText=user_question,
)
```

Three details matter.

The filter is per-request, not per-agent.
The same agent serves every vendor.
Agent definitions stay static; the caller becomes a runtime detail.

`orAll` is Bedrock's filter syntax for OR.
There is also `andAll`, plus operators like `notEquals` and `greaterThan` for more elaborate filters.
The "this vendor OR shared" pattern covers almost every realistic case.

The vendor value must come from the authenticated session.
Never from anything the user typed.
An API that accepts a `vendor` field in the request body invites that user to change it. That's not a multi-vendor system, that's a security bug with a clever folder layout.

## Multiple data sources, one knowledge base

A Bedrock knowledge base can have many data sources.
Each one points to its own S3 prefix, syncs on its own schedule, and can chunk or parse files differently.

A reasonable split:

| Data source | Prefix | Sync cadence |
|---|---|---|
| Shared | `s3://kb-bucket/shared/` | Weekly |
| Per-vendor onboarding | `s3://kb-bucket/<vendor>/` | On change |
| Per-vendor catalogs | `s3://kb-bucket/catalogs/<vendor>/` | Nightly |

Shared content rarely changes.
Vendor content changes when a vendor edits it.
Catalogs change nightly because they're refreshed from upstream product systems.
Three different rhythms, three different data sources.

The CloudFormation skeleton:

```yaml
KnowledgeBase:
  Type: AWS::Bedrock::KnowledgeBase
  Properties:
    Name: support-assistant-kb
    RoleArn: !GetAtt KnowledgeBaseRole.Arn
    KnowledgeBaseConfiguration:
      Type: VECTOR
      VectorKnowledgeBaseConfiguration:
        EmbeddingModelArn: !Ref EmbeddingModelArn
    StorageConfiguration:
      Type: OPENSEARCH_SERVERLESS
      OpensearchServerlessConfiguration: { ... }

SharedDataSource:
  Type: AWS::Bedrock::DataSource
  Properties:
    KnowledgeBaseId: !Ref KnowledgeBase
    Name: shared
    DataSourceConfiguration:
      Type: S3
      S3Configuration:
        BucketArn: !GetAtt KnowledgeBaseBucket.Arn
        InclusionPrefixes: ['shared/']

VendorDataSource:
  Type: AWS::Bedrock::DataSource
  Properties:
    KnowledgeBaseId: !Ref KnowledgeBase
    Name: vendors
    DataSourceConfiguration:
      Type: S3
      S3Configuration:
        BucketArn: !GetAtt KnowledgeBaseBucket.Arn
        InclusionPrefixes: ['northwind/', 'contoso/', 'fabrikam/']
```

Notice that the data sources themselves know nothing about vendors.
They're just S3 paths.
All vendor identity lives in the metadata sidecars.
Moving a noisy vendor onto its own faster pipeline later doesn't require re-labeling any files.
The metadata travels with the document.

## The sync script

Hand-written sidecar files are a leak waiting to happen.
Sooner or later someone copy-pastes the wrong label onto the wrong file.
So sidecars get generated, not written.

A small script does the boring part: walk the local folder, derive the vendor name from the directory, write a fresh `.metadata.json` next to every document, push everything to S3, kick off the ingestion job.

```bash
generate_metadata() {
    local vendor=$1
    cat <<EOF
{
  "metadataAttributes": {
    "vendor": "$vendor"
  }
}
EOF
}

for vendor_dir in "$KB_DIR"/*/; do
    vendor=$(basename "$vendor_dir")
    for file in "$vendor_dir"/*.md; do
        filename=$(basename "$file")
        generate_metadata "$vendor" > "$TMP/${filename}.metadata.json"
        aws s3 cp "$TMP/${filename}.metadata.json" \
            "s3://$BUCKET/$vendor/${filename}.metadata.json"
        aws s3 cp "$file" "s3://$BUCKET/$vendor/$filename"
    done
done

aws bedrock-agent start-ingestion-job \
    --knowledge-base-id "$KB_ID" \
    --data-source-id "$DATA_SOURCE_ID"
```

A few choices in this script are deliberate.

The sidecar is uploaded *before* the document.
If Bedrock picks up the document first, it gets indexed without a `vendor` tag and the filter silently lets it through to every caller.
Upload metadata first, and it's always there when the document lands.

The folder name *is* the vendor name.
Authors never write metadata themselves.
A Contoso file accidentally labeled `vendor: northwind` because someone copied a sidecar is a leak. Generating metadata from the directory structure removes that whole class of mistake.

Metadata lives in its own file, not in the markdown header.
Header-based metadata is technically possible, but it forces every author to learn a schema.
Sidecars keep content files clean for non-technical authors.

The script doesn't try to skip unchanged files.
Bedrock detects unchanged content by hash and skips the embedding step on its own.
Re-uploading everything is idempotent on the indexing side, and dropping the local change-tracking removes a class of subtle bugs.

## Trade-offs

This pattern is good, not magical.

**Soft isolation, not hard isolation.**
The filter runs inside Bedrock.
It's a logical boundary, not a physical one.
Workloads that demand real separation (different encryption keys per vendor, different audit logs, different blast radius) still need separate KBs.
Regulated industries like HIPAA usually fall into that camp.

**Loud neighbors hurt quiet ones.**
A vendor uploading 50,000 documents slows ingestion for every vendor on the same data source.
Splitting data sources helps, but the vector index is still shared.
A vendor 10× bigger than the rest deserves their own data source.

**Be picky about what is shared.**
A shared folder bloated to thousands of files drowns every query in shared content.
A policy used by only two of eight vendors is not shared. It's a vendor-specific fact that happens to repeat.

**Test the filter. Don't trust it.**
An integration test that asks a Northwind-specific question while passing `vendor=contoso` should make the bot say it doesn't know.
Run that test on every deploy. Filters are configuration, and configuration drifts.

## Why it matters

The whole pattern fits on a note card:

1. One knowledge base. Multiple data sources, organized by S3 prefix.
2. A `.metadata.json` sidecar next to every document, tagged with `vendor`.
3. A filter on every query: `vendor = <caller> OR vendor = shared`.
4. The vendor value comes from the authenticated session, never user input.

A confused AI giving the wrong answer is bad.
A confused AI giving *another vendor's* answer is a phone call nobody wants to make.
With this pattern, the bot can still be wrong about Northwind's return policy.
It just cannot be wrong by reaching for Contoso's.

## Resources

- [Bedrock Knowledge Bases metadata and filtering](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-ds-metadata.html)
- [Bedrock retrieval filter syntax](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html)
- [Multiple data sources in one KB](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-ds.html)

### Related reading

- [Slack meets Bedrock: knowledge bases, tools, and action groups](/slack-meets-bedrock-knowledge-bases-tools-action-groups/), higher-level walkthrough of Bedrock KBs and agents
- [Slack meets Bedrock: building the gateway](/slack-meets-bedrock-building-the-gateway/), how the agent sits behind a Slack-style interface
- [Slack meets Bedrock: analytics, monitoring, and production](/slack-meets-bedrock-analytics-monitoring-production/), observability and cost for Bedrock systems
