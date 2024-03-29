---
title: Configuring MFA delete on S3 bucket
date: 2024-02-15T12:14:57+02:00
categories:
excerpt:
tags:
  - aws
  - s3
  - infrastructure
published: true
---

MFA Delete adds an additional layer of security to your S3 buckets by requiring authentication via MFA before allowing the permanent deletion of objects.
This means that even if an unauthorized user gains access to your AWS credentials, they cannot delete objects from your S3 bucket without providing a valid MFA code.

Without MFA Delete enabled, a compromised set of credentials could lead to irreversible data loss or tampering.
Malicious actors or inadvertent actions could result in the accidental deletion of critical files, causing financial losses, compliance violations, and reputational damage.
MFA Delete mitigates these risks by introducing an extra verification step, significantly reducing the likelihood of unauthorized deletions.

## Configure MFA Device in AWS Console

Before proceeding to enable MFA Delete for your S3 bucket, it's crucial to set up a Multi-Factor Authentication (MFA) device for your IAM user account.
AWS offers various MFA methods, including FIDO security keys, virtual authenticator apps, hardware TOTP tokens, and specialized options for the AWS GovCloud (US) Regions.
For a comprehensive overview of MFA options, you can refer to the [Multi-Factor Authentication (MFA) for IAM](https://aws.amazon.com/iam/features/mfa/) blog post.

In this guide, we'll walk through setting up a virtual authenticator app, a popular and convenient choice:

1. Sign in to AWS Console.
2. Access IAM User Settings. Navigate to the Identity and Access Management (IAM) dashboard by selecting IAM from the services menu.
3. Select User and Enable MFA. Locate and select the IAM user account for which you want to enable MFA. Under the "Security credentials" tab, find the "Multi-factor authentication (MFA)" section and click on "Manage MFA device."
4. Choose Virtual MFA Device. Select the option for a virtual MFA device.
5. Scan QR Code or Enter Secret Key. Using your preferred authenticator app (such as Google Authenticator or Authy), scan the QR code displayed on the screen or manually enter the provided secret key.
6. Verify MFA Configuration. After adding the MFA device to your authenticator app, you'll be prompted to enter a code generated by the app to verify the setup. Enter the code to complete the configuration process.
7. Confirmation. Once verified, MFA will be enabled for your IAM user account, adding an extra layer of security to your AWS access.

## Enable MFA delete

AWS provides flexibility in enabling MFA delete functionality either through a REST API call or via the AWS Command Line Interface (CLI).
Utilizing the CLI offers a straightforward approach to configure MFA delete, as demonstrated below:

```sh
aws s3api put-bucket-versioning --bucket BUCKET_NAME \
  --versioning-configuration Status=Enabled,MFADelete=Enabled \
  --mfa "SERIAL 123456"
```

Here's a breakdown of the parameters:

`BUCKET_NAME` - replace this with the name of the bucket for which you want to enable MFA delete.
`SERIAL` - represents the ARN (Amazon Resource Name) of the authenticator app associated with your IAM user account, which can be found in the AWS Management Console.
`123456` - this is the PIN generated by your authenticator app for the MFA operation.

For example:

```sh
aws s3api put-bucket-versioning --bucket my_unique_bucket \
  --versioning-configuration Status=Enabled,MFADelete=Disabled \
  --mfa "arn:aws:iam::1231234322:mfa/GoogleAuthenticator 352818"
```

In this example, `my_unique_bucket` is the name of the S3 bucket, `arn:aws:iam::1231234322:mfa/GoogleAuthenticator` represents the ARN of the authenticator app associated with the IAM user, and `352818` is the generated PIN for MFA authentication.

By executing this command, we enable versioning and MFA delete for the specified S3 bucket, ensuring an added layer of security to prevent unauthorized deletions of objects. This streamlined approach via the AWS CLI simplifies the process of configuring MFA delete, enhancing the protection of your data stored in Amazon S3.
