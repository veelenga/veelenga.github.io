---
title: AWS S3 replication across different accounts
date: 2023-02-05T15:14:57+02:00
categories:
excerpt:
tags: [aws infrastructure cloudformation]
published: true
---

AWS S3 Bucket replication is an incredibly powerful and cost-effective way to ensure your data remains safe, secure, and accessible in the cloud.
With S3 bucket replication, you can replicate entire buckets of data across multiple AWS accounts and even regions for added redundancy and reliability.
This ensures that if one region experiences a disruption or outage, your data will still be available from another region.

Replicating an S3 bucket is also very simple to do with just a few clicks in the AWS Console or through the use of APIs.
There is an [an official article on AWS docs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-walkthrough-2.html) explaining how to configure such an replication.
However, making these changes in the infrastructure-as-code is not that straightforward.
In this article we are going to replicate s3 bucket across different accounts using CloudFormation and yaml notation.

## Bucket definition

Let's assume we have defined two S3 buckets:

```yml
SourceBucket:
  Type: AWS::S3::Bucket
  Properties:
    BucketName: my-source-bucket

DestinationBucket:
  Type: AWS::S3::Bucket
  Properties:
    BucketName: my-destination-bucket
```

As the naming implies we need to replicate from `SourceBucket` to `DestinationBucket`.
Since buckets are owned by different AWS accounts we can't replicate in a usual way just defining the replication configuration on the `SourceBucket`.
In order to replicate to a bucket in a different AWS account, the `SourceBucket` must be allowed to replicate objects to the destination.
It can be done following this steps:

1. Create replication configuration on the source bucket
2. Create policy **on the source bucket** to allow replicating to the destination bucket
3. Create policy **on the destination bucket** to allow the owner of the source bucket to replicate objects

## Source bucket replication configuration

```yml
SourceBucketReplicationRole:
  Type: 'AWS::IAM::Role'
  Properties:
    AssumeRolePolicyDocument:
      Statement:
        - Action:
            - 'sts:AssumeRole'
          Effect: Allow
          Principal:
            Service:
              - s3.amazonaws.com

SourceBucket:
  Type: AWS::S3::Bucket
  Properties:
    BucketName: my-source-bucket
   VersioningConfiguration:
     Status: Enabled
   ReplicationConfiguration:
     Role: !GetAtt 'SourceBucketReplicationRole.Arn'
     Rules:
       - Destination:
           Bucket: !GetAtt 'DestinationBucket.Arn'
         Status: Enable
```

## Source bucket replication policy

```yml
SourceBucketReplicationPolicy:
  Type: 'AWS::IAM::Policy'
  Properties:
    PolicyDocument:
      Statement:
        - Action:
            - 's3:GetReplicationConfiguration'
            - 's3:ListBucket'
          Effect: Allow
          Resource: !GetAtt 'SourceBucket.Arn'
        - Action:
            - 's3:GetObjectVersion'
            - 's3:GetObjectVersionAcl'
          Effect: Allow
          Resource: !Sub '${SourceBucket.Arn}/*'
        - Action:
            - 's3:ReplicateObject'
            - 's3:ReplicateDelete'
          Effect: Allow
          Resource: !Sub '${DestinationBucket.Arn}/*'
    PolicyName: SourceBucketReplicationPolicy
    Roles:
      - !Ref SourceBucketReplicationRole
```

## Destination bucket policy

```yml
DestinationBucketPolicy:
  Type: AWS::S3::BucketPolicy
  Properties:
    Bucket: !Ref 'DestinationBucket'
    PolicyDocument:
      Version: "2012-10-17"
      Statement:
        - Sid: Set permissions for objects
          Effect: Allow
          Principal:
            AWS: !Ref SourceBucketReplicationRole
          Action:
            - s3:ReplicateObject
            - s3:ReplicateDelete
          Resource: !Sub '${Destinaionbucket}/*'
        - Sid: Set permissions on bucket
          Effect: Allow
          Principal:
            AWS: !Ref SourceBucketReplicationRole
          Action:
            - s3:List*
            - s3:GetBucketVersioning
            - s3:PutBucketVersioning
          Resource: !Ref SourceBucketReplicationRole
```
