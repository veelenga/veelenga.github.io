---
title: Testing SES Emails in Local Development
date: 2025-11-22T14:40:00+02:00
categories:
excerpt: Learn how to effectively test AWS SES emails locally using LocalStack. Compare different email viewers including the built-in LocalStack UI, Mailpit, and a lightweight custom viewer designed specifically for development workflows.
tags:
  - aws
  - ses
  - localstack
  - testing
  - development
published: true
---

Testing email functionality during local development has always been challenging. Send test emails to real addresses and risk spamming. Use a third-party service and deal with API keys and quotas. Or worse - skip email testing entirely and hope everything works in production.

LocalStack's SES implementation solves this by intercepting email sends and storing them locally. But viewing those emails efficiently is where the real workflow improvement happens. This post introduces a lightweight bridge that connects LocalStack's SES API to Mailpit's powerful testing interface, giving you both programmatic access and a modern UI for email inspection.

![LocalStack SES Email Viewer](/images/localstack-ses-viewer/screenshot.png)

## The Problem with Testing Emails Locally

When building applications that send emails through AWS SES, developers face a dilemma. Testing in production isn't an option. AWS SES sandbox mode requires verified email addresses. Setting up a full SMTP server locally is overkill for most development workflows.

LocalStack provides SES emulation, capturing all emails sent through the service. The emails are stored in memory and accessible via an API endpoint. The challenge becomes: how do we efficiently view and debug these emails during development?

## Available Solutions

Two main approaches exist for viewing LocalStack SES emails:

### 1. LocalStack Web UI (Pro)

LocalStack Pro includes a web interface that displays captured emails. It provides a full-featured dashboard with email listing, content preview, and detailed metadata.

**Pros:**
- Comprehensive feature set
- Integrated with other LocalStack services
- Professional interface

**Cons:**
- Requires LocalStack Pro subscription
- May be overkill for basic email testing

### 2. Bridge to Mailpit

The [localstack-aws-ses-email-viewer](https://github.com/veertech/localstack-aws-ses-email-viewer) provides a lightweight Node.js app that connects directly to LocalStack's SES API endpoint and optionally forwards emails to Mailpit via SMTP.

**Architecture:**
```
LocalStack SES → Custom Viewer → Mailpit (optional)
                      ↓
                  Simple Web UI
```

**Pros:**
- Zero configuration - just point it at LocalStack
- Lightweight (under 250 lines of code)
- Uses LocalStack's native `/_aws/ses` endpoint
- Optional Mailpit integration for advanced features
- Perfect for CI/CD and automated testing
- Fast startup and minimal resource usage
- Get both simple viewing AND advanced Mailpit features

**Cons:**
- Basic UI in the viewer itself (but that's what Mailpit is for)
- Requires Mailpit service if you want advanced features

## How LocalStack SES Works

LocalStack intercepts AWS SDK calls to SES and stores emails in memory. All emails sent through the service are accessible via:

```bash
curl http://localhost:4566/_aws/ses
```

This returns a JSON response:

```json
{
  "messages": [
    {
      "Timestamp": 1700000000000,
      "RawData": "From: sender@example.com\nTo: recipient@example.com\n...",
      "Subject": "Test Email",
      "Destination": {
        "ToAddresses": ["recipient@example.com"],
        "CcAddresses": [],
        "BccAddresses": []
      },
      "Body": {
        "html_part": "<html>...</html>",
        "text_part": "Plain text version"
      }
    }
  ]
}
```

LocalStack returns two email formats:
- **RawData**: Complete EML format with full MIME structure, attachments, and headers
- **Legacy format**: Simplified structure with basic subject, body, and recipients

The viewer handles both formats seamlessly.

## Setting Up the Viewer

### Option 1: Basic Setup (Viewer Only)

Add the viewer to your docker-compose.yml:

```yaml
version: '3.8'

services:
  localstack:
    image: localstack/localstack
    ports:
      - "4566:4566"
    environment:
      - SERVICES=ses
      - DEBUG=1

  ses-viewer:
    build:
      context: https://github.com/veertech/localstack-aws-ses-email-viewer.git#main
    ports:
      - "3005:3005"
    environment:
      - LOCALSTACK_HOST=http://localstack:4566
    depends_on:
      - localstack
```

Start the services:

```bash
docker-compose up
```

Open http://localhost:3005 to view captured emails.

### Option 2: With Mailpit Integration (Recommended)

For the best experience, enable SMTP forwarding to Mailpit:

```yaml
version: '3.8'

services:
  localstack:
    image: localstack/localstack
    ports:
      - "4566:4566"
    environment:
      - SERVICES=ses
      - DEBUG=1

  ses-viewer:
    build:
      context: https://github.com/veertech/localstack-aws-ses-email-viewer.git#main
    ports:
      - "3005:3005"
    environment:
      - LOCALSTACK_HOST=http://localstack:4566
      - SMTP_FORWARD_ENABLED=true
      - SMTP_FORWARD_HOST=mailpit
      - SMTP_FORWARD_PORT=1025
    depends_on:
      - localstack
      - mailpit

  mailpit:
    image: axllent/mailpit:latest
    ports:
      - "8025:8025"  # Web UI
      - "1025:1025"  # SMTP server
```

With this setup:
- View emails quickly at http://localhost:3005 (simple list)
- Access Mailpit's advanced UI at http://localhost:8025 (search, filtering, HTML/text toggle)
- All emails automatically appear in both interfaces
- Get the best of both worlds: simple viewer for quick checks, Mailpit for detailed inspection

## Using the Viewer

### Viewing Email Lists

The home page displays all emails in a table with:
- Unique ID for reference
- Timestamp of when the email was sent
- Recipients (To, CC, BCC)
- Subject line
- View and download actions

Emails appear newest-first, making it easy to find recent test emails.

### Inspecting Individual Emails

Click "View" to see the full email rendered in your browser. The detail view shows:
- Subject and recipients
- Full HTML content (rendered)
- List of attachments with download links

For emails with RawData, a "Download" link saves the complete email as an `.eml` file. Open it in any email client for additional inspection.

### Viewing Attachments

When emails include attachments, they're listed at the top of the detail view. Click any attachment to view or download it. The viewer sets proper content types, so images display inline and PDFs open in the browser.

### Accessing the Latest Email

For automated testing, the `/emails/latest` endpoint returns just the most recent email's HTML content:

```bash
curl http://localhost:3005/emails/latest
```

This is useful in integration tests:

```javascript
// Send email through your app
await sendWelcomeEmail('user@example.com');

// Verify it was sent
const response = await fetch('http://localhost:3005/emails/latest');
const html = await response.text();
expect(html).toContain('Welcome to our service');
```

## How SMTP Forwarding Works

When `SMTP_FORWARD_ENABLED=true`, the viewer acts as a bridge between LocalStack and Mailpit:

```javascript
async function fetchMessages() {
  const response = await fetch(apiUrl);
  const data = await response.json();
  const messages = data["messages"];

  // Forward new messages to SMTP if enabled
  await smtpForwarder.forwardMessages(messages);

  return messages;
}
```

The forwarder:
1. Tracks which messages have already been forwarded (prevents duplicates)
2. Extracts the raw email data (RawData field)
3. Sends it to Mailpit via SMTP using nodemailer
4. Preserves all email properties: headers, attachments, HTML, text

This means:
- No polling delays - emails appear immediately in both UIs
- No data loss - complete email structure is preserved
- No configuration on Mailpit side - it just receives SMTP
- Works with any SMTP server, not just Mailpit

The viewer essentially acts as an SMTP relay that understands LocalStack's API format and translates it to standard SMTP.

## Advanced Features

### Custom Columns

Display logo images from email attachments using the `EXTRA_COLUMNS` environment variable:

```yaml
environment:
  - LOCALSTACK_HOST=http://localstack:4566
  - EXTRA_COLUMNS=Logo=company-logo.png,Brand=brand-icon.png
```

This searches each email's attachments for files matching the specified names and displays them as inline images in the table. Useful for multi-tenant applications where emails include customer-specific branding.

### Integration Testing

The viewer's simple API makes it perfect for CI/CD pipelines:

```javascript
describe('Email notifications', () => {
  beforeAll(async () => {
    // Wait for services to be ready
    await waitForLocalStack();
  });

  test('sends welcome email', async () => {
    await userService.register('test@example.com');

    const emails = await fetch('http://localhost:3005/emails/latest')
      .then(r => r.text());

    expect(emails).toContain('Welcome');
    expect(emails).toContain('test@example.com');
  });
});
```

No complex SMTP assertions or email service mocking needed. Just hit the API and verify content.

## Implementation Details

The viewer is a straightforward Express.js application that:

1. Polls LocalStack's `/_aws/ses` endpoint
2. Parses emails using the `mailparser` library
3. Renders results with Pug templates

Core functionality in under 200 lines:

```javascript
app.get("/", async (_req, res, next) => {
  try {
    const messages = await fetchMessages();
    const messagesForTemplate = await Promise.all(
      messages.map(async (message, index) => {
        let email = await createEmail(message, index);
        email.id = index;
        return email;
      })
    );
    res.render("index", {
      messages: messagesForTemplate.reverse()
    });
  } catch (err) {
    next(err);
  }
});
```

The simplicity makes it easy to fork and customize for specific needs. Want to add search? Filter by recipient? Export to different formats? The codebase is small enough to modify in minutes.

## Choosing the Right Approach

**Use LocalStack Web UI (Pro) when:**
- You have a LocalStack Pro subscription
- You need comprehensive service monitoring beyond just emails
- You want a polished, professional interface integrated with other LocalStack services
- You're testing multiple AWS services together

**Use the Custom Viewer + Mailpit when:**
- You're on LocalStack Community edition (no Pro subscription needed)
- You want the best of both worlds: simple viewer + advanced Mailpit features
- You need minimal setup with powerful capabilities
- You want fast startup times for CI/CD
- You're building automated test suites (viewer's API) while also doing manual testing (Mailpit's UI)
- You want something you can easily customize (viewer is under 250 lines)
- You need both programmatic access (viewer API) and rich visual inspection (Mailpit)

**Use the Custom Viewer alone (without Mailpit) when:**
- You only need basic email viewing
- You're optimizing for minimal resource usage
- You're running in constrained environments (CI/CD with limited memory)
- You want the absolute fastest startup time

## Real-World Use Cases

### Scenario 1: Feature Development with Mailpit

While building a password reset flow, the developer needs to verify:
- Email contains the correct reset link
- Link format is valid
- Email template renders properly across email clients
- Headers are set correctly

With the viewer + Mailpit setup:
1. Trigger the reset flow in the application
2. Check the viewer at http://localhost:3005 - email appears instantly
3. Open Mailpit at http://localhost:8025 for detailed inspection
4. Use Mailpit's HTML/text toggle to check both versions
5. Use Mailpit's header inspector to verify SPF/DKIM settings
6. Test the reset link directly from either interface

The viewer gives immediate feedback, while Mailpit provides deep inspection tools when needed.

### Scenario 2: Multi-Tenant Application

Each customer has branded email templates with their logo. The `EXTRA_COLUMNS` feature displays customer logos directly in the email list, making it instantly clear which customer's emails are being sent.

### Scenario 3: CI/CD Pipeline

Integration tests verify that user registration sends a welcome email. The test creates a user, waits a moment, then checks `/emails/latest` to verify the email was sent with correct content. No need to mock email services or parse SMTP traffic.

### Scenario 4: Debugging Production Issues

A bug report claims emails aren't being sent. Reproduce it locally with LocalStack and the viewer open. Watch emails arrive (or don't) in real-time. Download the `.eml` file to inspect headers, check for attachment issues, or verify MIME structure.

## Deployment Considerations

The viewer runs as a simple Node.js service. In development:

```bash
docker-compose up
```

For shared development environments, deploy it alongside LocalStack:

```yaml
services:
  ses-viewer:
    build:
      context: https://github.com/veertech/localstack-aws-ses-email-viewer.git#main
    environment:
      - LOCALSTACK_HOST=http://localstack:4566
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.ses-viewer.rule=Host(`ses.dev.company.com`)"
```

Team members access the same email viewer at a shared URL, making it easy to debug issues together.

## Security Note

The viewer has no authentication. It's designed for local development only. Never expose it to the public internet without adding authentication. LocalStack's SES endpoint is similarly unauthenticated - appropriate for development, not production.

For shared development environments, add basic auth via reverse proxy:

```nginx
location /ses-viewer/ {
    auth_basic "Restricted";
    auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://ses-viewer:3005/;
}
```

## Wrap-up

Testing emails in local development no longer requires compromises. LocalStack captures the emails. The custom viewer makes them accessible through both a simple API and optional Mailpit integration. The workflow becomes: write code, trigger email, verify in browser.

Two main paths exist:
1. **LocalStack Pro's Web UI** - All-in-one solution if you have a subscription
2. **Custom Viewer + Mailpit** - Best choice for LocalStack Community users who want powerful features

The second approach is particularly compelling because:
- It's free and open source
- You get immediate API access for automated tests (viewer)
- You get a modern, feature-rich UI for manual inspection (Mailpit)
- The viewer is simple enough to customize for your specific needs
- Both tools work together seamlessly through SMTP forwarding

The key insight: don't skip email testing just because it's traditionally been difficult. Modern tools make it as straightforward as any other feature test. The custom viewer bridges the gap between LocalStack's SES API and Mailpit's powerful interface, giving you the best of both worlds.

## Resources

- [localstack-aws-ses-email-viewer on GitHub](https://github.com/veertech/localstack-aws-ses-email-viewer)
- [LocalStack Documentation](https://docs.localstack.cloud/user-guide/aws/ses/)
- [Mailpit](https://github.com/axllent/mailpit)
- [LocalStack Web UI](https://docs.localstack.cloud/user-guide/web-application/)
