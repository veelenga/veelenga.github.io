---
title: Cross account Amazon ECR images
date: 2024-04-07T12:14:57+02:00
categories:
excerpt:
tags:
  - aws
  - ecr
  - infrastructure
published: true
---

Sharing Amazon ECR images across accounts is a common requirement, especially in scenarios where a CI/CD pipeline resides in one account and the production environment operates in another.
In this post, we'll explore various methods to achieve this goal, highlighting the pros and cons of each approach.

| Method                               | Description                                                                                                                                                                                                             | Pros                                     | Cons                                                                       |
|--------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------|----------------------------------------------------------------------------|
| Public ECR Repository                | Making the ECR repository public allows easy access to images across accounts. However, this approach is not recommended for production workloads due to security concerns.                                             | Easy implementation                      | Security risk; not suitable for production environments                    |
| Cross-account IAM Role               | Creating a cross-account IAM role enables controlled access for the production account to pull images from the CI/CD account. This ensures security and fine-grained access control.                                    | Secure access control                    | Requires careful IAM role setup and management                             |
| Resource-based Policy                | Utilizing a resource-based policy grants the production account the necessary permissions to pull images from the CI/CD account. Offers flexibility and security through policy enforcement.                            | Granular control over access permissions | Policy management overhead; complexity in setup and maintenance            |
| Pushing to Multiple ECR Repositories | Pushing the same image to multiple ECR repositories during the CI/CD pipeline ensures availability across accounts. This method simplifies access but requires synchronization and management of multiple repositories. | Simplified access management             | Potential synchronization issues; increased repository management overhead |
| Private Image Replication            | Replicating images from private repositories across regions or accounts provides redundancy and availability. This method ensures consistency and reliability of image distribution.                                    | High reliability and consistency         | Requires additional setup and configuration; potential data transfer costs |

Each approach offers distinct advantages and considerations.
The choice depends on factors such as security requirements, ease of implementation, and the specific needs of your infrastructure.
In this post we will explore how to implement the resource based policy approach.

## ECS resource-based policy

The resource-based policy approach involves creating a policy that grants the production account the necessary permissions to pull images from the CI/CD account.
Let's assume that the production account needs to pull ECR images from the CI/CD account to start the ECS task.
That means the CI/CD account needs to grant the production account the necessary permissions to pull images from the ECR repository.
The `RepositoryPolicyText` property of the `AWS::ECR::Repository` resource in CloudFormation allows you to define a resource-based policy for the ECR repository:

```yaml
Resources:
  MyECRRepository:
    Type: AWS::ECR::Repository
    Properties:
      RepositoryName: my-ecr-repository
      RepositoryPolicyText:
        Version: "2012-10-17"
        Statement:
          - Sid: AllowPull
            Effect: Allow
            Principal:
              AWS: !Sub "arn:aws:iam::${ProductionAccountId}:role/ecs-task-role"
            Action:
              - ecr:BatchGetImage
              - ecr:GetDownloadUrlForLayer
              - ecr:BatchCheckLayerAvailability
```

## Lambda function resource-based policy

If you need to pull the ECR to production account to deploy the Lambda function, you can use the following policy:

```yaml
Resources:
  MyECRRepository:
    Type: AWS::ECR::Repository
    Properties:
      RepositoryName: my-ecr-repository
      RepositoryPolicyText:
        Version: "2012-10-17"
        Statement:
          - Sid: AllowPull
            Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action:
              - ecr:BatchGetImage
              - ecr:GetDownloadUrlForLayer
              - ecr:BatchCheckLayerAvailability
              - ecr:GetRepositoryPolicy
              - ecr:SetRepositoryPolicy
```

The difference between the two policies is the `Principal` field and the list of actions.
Image-based lambdas can add permissions only if the principal calling Lambda has `ecr:getRepositoryPolicy` and `ecr:setRepositoryPolicy` permissions so they are required in the policy.

## Root account resource-based policy

The root based policy is the most permissive policy. It allows any account service to pull the images from the ECR repository.

```yaml
Resources:
  MyECRRepository:
    Type: AWS::ECR::Repository
    Properties:
      RepositoryName: my-ecr-repository
      RepositoryPolicyText:
        Version: "2012-10-17"
        Statement:
          - Sid: AllowPull
            Effect: Allow
            Principal:
              AWS: !Sub "arn:aws:iam::${ProductionAccountId}:root"
            Action:
              - ecr:BatchGetImage
              - ecr:GetDownloadUrlForLayer
              - ecr:BatchCheckLayerAvailability
```

However, using the root account in a resource-based policy grants the highest level of permissions within AWS.
While this approach may seem convenient for allowing any account service to pull images from the ECR repository, it comes with significant drawbacks and security concerns.

## Wrap up

In this post, we explored various methods to share Amazon ECR images across accounts.
We discussed the pros and cons of each approach and provided examples of how to implement a resource-based policy for ECR repositories.


