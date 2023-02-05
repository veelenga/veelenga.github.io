---
title: AWS S3 replication across different accounts
date: 2023-02-05T15:14:57+02:00
categories:
excerpt:
tags:
  - aws
  - infrastructure
  - cloudformation
published: true
---

AWS S3 Bucket replication is an incredibly powerful and cost-effective way to ensure your data remains safe, secure, and accessible in the cloud.
With S3 bucket replication, you can replicate entire buckets of data across multiple AWS accounts and even regions for added redundancy and reliability.
This ensures that if one region experiences a disruption or outage, your data will still be available from another region.

Replicating an S3 bucket is also very simple to do with just a few clicks in the AWS Console or through the use of APIs.
There is [an official article on AWS docs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-walkthrough-2.html) explaining how to configure such a replication.
However, making these changes in the infrastructure-as-code is not that straightforward.
In this article, we are going to replicate s3 bucket across different accounts using CloudFormation and yaml notation.

## What, where, and how to replicate?

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
It can be done following these steps:

1. Create replication configuration on the source bucket
2. Create policy **on the source bucket** to allow replicating to the destination bucket
3. Create policy **on the destination bucket** to allow the owner of the source bucket to replicate objects

## Source bucket replication configuration

At the very beginning, we need a role, which will be attached to the bucket and to the policies:

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
```

In the next step, we need to attach a newly created role to the `SourceBucket` creating bucket replication configuration.
In the example below, basically, it just defines the role to be attached and the destination to replicate:

```diff
SourceBucket:
  Type: AWS::S3::Bucket
  Properties:
    BucketName: my-source-bucket
+   ReplicationConfiguration:
+     Role: !GetAtt 'SourceBucketReplicationRole.Arn'
+     Rules:
+       - Destination:
+           Bucket: !GetAtt 'DestinationBucket.Arn'
+         Status: Enable
```

## Source bucket replication policy

The most important part is to properly define the policy and attach it to our newly created role.
In the snippet below we create IAM policy with the following statements:

1. Allow performing `s3:GetReplicationConfiguration` and `s3:ListBucket` on `SourceBucket` resource.
This is obviously needed to read the replication configuration and list the bucket in order to replicate it somewhere.

2. Allow performing `s3:GetObjectVersion` and `s3:GetObjectVersionAcl`.
Replication requires versioning to be enabled.

3. Allow performing `s3:ReplicateObject` and `s3:ReplicateDelete` on `DestinationBucket`.
Obviously, `SourceBucket` must be allowed to create and delete objects during replication on `DestinationBucket`.

```yml
SourceBucketReplicationPolicy:
  Type: 'AWS::IAM::Policy'
  Properties:
    PolicyName: SourceBucketReplicationPolicy
    Roles:
      - !Ref SourceBucketReplicationRole
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
```

## Destination bucket policy

The destination bucket policy looks similar to the one we defined above but operates on the source bucket replication role.
So here we create IAM policy with the following statements:

1. Allow `s3:ReplicateObject` and `s3:ReplicateDelete` on `DestinationBucket`.
This allows resources with `SourceBucketReplicationRole` role to replicate objects to the destination bucket.

2. Allow `s:List*`, `s3:GetBucketVersioning` and `s3:PutBucketVersioning` on `SourceBucketReplicationRole`.

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
          Resource: !Sub '${DestinationBucket}/*'
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

## Change replica owner

In replication, the owner of the source object also owns the replica by default.
When the source and destination buckets are owned by different AWS accounts and you want to change replica ownership to the AWS account that owns the destination buckets, you can add optional configuration settings to change replica ownership to the AWS account that owns the destination buckets.

A few tweaks are needed to change the replica owner using our snippets above.

At first, we need to add the owner override option to the replication configuration.
Important to note, this option must be added only when the source and destination buckets are owned by different AWS accounts.

```diff
SourceBucket:
  Type: AWS::S3::Bucket
  Properties:
    BucketName: my-source-bucket
    ReplicationConfiguration:
      Role: !GetAtt 'SourceBucketReplicationRole.Arn'
      Rules:
        - Destination:
            Bucket: !GetAtt 'DestinationBucket.Arn'
+           Account: <destination-bucket-owner-account-id>
+           AccessControlTranslation:
+               Owner: 'Destination'
          Status: Enable
```

Granting Amazon S3 permission to change replica ownership.
This is the IAM role that you specified in the replication configuration that allows Amazon S3 to assume and replicate objects on your behalf.

```diff
SourceBucketReplicationPolicy:
  Type: 'AWS::IAM::Policy'
  Properties:
    PolicyName: SourceBucketReplicationPolicy
    Roles:
      - !Ref SourceBucketReplicationRole
    PolicyDocument:
      Statement:
       ....
        - Action:
            - 's3:ReplicateObject'
            - 's3:ReplicateDelete'
+           - 's3:ObjectOwnerOverrideToBucketOwner'
          Effect: Allow
          Resource: !Sub '${DestinationBucket.Arn}/*'
```

Adding permission in the destination bucket policy to allow changing replica ownership.
The owner of the destination bucket must grant the owner of the source bucket permission to change replica ownership.
This allows the destination bucket owner to accept ownership of the object replicas.

```diff
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
+           - s3:ObjectOwnerOverrideToBucketOwner
          Resource: !Sub '${DestinationBucket}/*'
          ...
```

## Wrap up

AWS S3 Bucket Replication across multiple AWS accounts is an incredibly powerful tool for businesses that need to ensure their data is secure and always available.
The best part about using the AWS S3 bucket replication feature is how easy it makes sharing files between different accounts without having to manually transfer them over each time.
However, the process of configuring such a replication using CloudFormation is not that straightforward.
But still, if you understand the idea it connects the dots. Just to wrap up, it can be done in a few steps:

1. Create the replication configuration
2. Create the policy on the source bucket to write to the destination
3. Create the policy on the destination bucket to allow replicating from the source
4. Change replica owner upon replication
