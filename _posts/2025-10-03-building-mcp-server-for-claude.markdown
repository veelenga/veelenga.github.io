---
title: Building an MCP Server for Claude Code
date: 2025-10-03T08:51:00+02:00
categories:
excerpt: Learn how to build a custom Model Context Protocol server for Claude Code. Master the fundamentals of MCP protocol, tool definitions, and argument handling using a real-world Mermaid diagram rendering example.
tags:
  - claude
  - mcp
  - typescript
  - ai
published: true
---

The Model Context Protocol (MCP) enables extending Claude's capabilities by adding custom tools. This guide explains how to build an MCP server using [claude-mermaid](https://github.com/veelenga/claude-mermaid) as a practical example - a server that renders Mermaid diagrams with live browser preview.

![Claude Code with MCP](/images/claude-mcp/claude-code.png)

## Understanding the MCP Protocol

MCP is an open protocol that allows AI assistants to interact with external tools through a standardized interface. Think of it as a universal adapter between Claude and any external functionality - whether that's rendering diagrams, querying databases, or calling APIs.

The protocol defines a simple request-response cycle. Claude:

1. **Discovers tools** - Queries available tools and their parameters
2. **Calls tools** - Invokes a tool with specific arguments when needed during a conversation
3. **Receives results** - Gets structured responses back to incorporate into its reasoning

The communication happens via **stdio** (standard input/output). When configuring an MCP server in Claude Code, it launches the server as a subprocess and exchanges JSON-RPC messages through stdin/stdout. This design keeps the protocol simple and language-agnostic - any program that can read stdin and write stdout can be an MCP server.

### Setting Up the Server

Every MCP server starts with basic initialization:

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server(
  {
    name: "claude-mermaid",
    version: "1.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

The server declares its **capabilities** - in this case, that it supports tools. The `StdioServerTransport` handles all the low-level protocol communication, including JSON-RPC message parsing and validation. Once connected, the server sits idle, waiting for Claude to send requests.

## Defining Tools

Tools are the core of MCP. Each tool definition tells Claude what functionality the server provides and how to use it. Think of a tool definition as a contract between Claude and the server - it specifies what inputs are required, what the tool does, and what to expect in return.

Each tool definition includes three essential parts:

### 1. Tool Name

A unique identifier that Claude uses to call the tool:

```typescript
{ name: "mermaid_preview" }
```

### 2. Tool Description

This is critical - Claude reads this description to understand **when** and **how** to use the tool. Being specific and including context helps:

```typescript
{
  description:
    "Render a Mermaid diagram and open it in browser with live reload. " +
    "Takes Mermaid diagram code as input and generates a live preview. " +
    "Supports themes (default, forest, dark, neutral), custom backgrounds, " +
    "dimensions, and quality scaling. The diagram will auto-refresh when updated."
}
```

A good description tells Claude:
- What the tool does and when to use it
- What inputs it expects and in what format
- What output format it produces
- Any special capabilities, limitations, or side effects (like opening a browser window)

The description is where we can guide Claude's behavior. For example, adding "IMPORTANT: Automatically use this tool whenever creating a Mermaid diagram" helps ensure Claude uses the tool proactively rather than waiting to be asked.

### 3. Input Schema

The schema defines all parameters using JSON Schema format. This ensures type safety and provides clear documentation:

```typescript
{
  inputSchema: {
    type: "object",
    properties: {
      diagram: {
        type: "string",
        description: "The Mermaid diagram code to render",
      },
      preview_id: {
        type: "string",
        description: "ID for this preview session. Use different IDs for multiple diagrams.",
      },
      format: {
        type: "string",
        enum: ["png", "svg", "pdf"],
        description: "Output format (default: svg)",
        default: "svg",
      },
      // ... other properties like theme, width, height, background, scale
    },
    required: ["diagram", "preview_id"],
  },
}
```

Key aspects of the schema:

- **Required fields** - Listed in the `required` array. Claude must provide these or the call fails
- **Type constraints** - `string`, `number`, `boolean`, etc. Enforced before the handler is called
- **Enums** - Restrict to specific allowed values. Useful for options like themes or formats
- **Defaults** - Values used when parameter is omitted. These apply client-side before calling the server
- **Descriptions** - Help Claude understand each parameter's purpose and how to use it correctly

The SDK automatically validates incoming requests against this schema, so the handler can trust that required fields are present and types are correct.

## Handling Tool Requests

MCP servers respond to two types of requests:

### ListTools Request

When Claude connects to the server, it asks: "What tools do you have?" This happens once at connection time, and Claude caches the results for the duration of the session.

```typescript
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOL_DEFINITIONS };
});
```

The server returns an array of all available tool definitions. Claude uses this information to decide when and how to call each tool during conversations.

### CallTool Request

When Claude wants to use a tool, it sends a CallTool request with:
- The tool name
- The arguments (validated against the schema)

```typescript
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = request.params.arguments;

  try {
    switch (toolName) {
      case "mermaid_preview":
        return await handleMermaidPreview(args);
      case "mermaid_save":
        return await handleMermaidSave(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    throw error;
  }
});
```

## Processing Tool Arguments

When the handler receives arguments, they're already validated against the schema. This means required fields are guaranteed to be present, and types match what was specified. However, additional validation is crucial for security - especially when arguments are used to construct file paths or execute system commands.

Here's how to extract and use arguments safely:

```typescript
export async function handleMermaidPreview(args: any) {
  // Extract required arguments
  const diagram = args.diagram as string;
  const previewId = args.preview_id as string;

  // Extract optional arguments with defaults
  const format = (args.format as string) || "svg";
  const theme = (args.theme as string) || "default";
  // ... extract other optional parameters

  // Validate preview ID to prevent path traversal attacks
  const PREVIEW_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
  if (!previewId || !PREVIEW_ID_REGEX.test(previewId)) {
    throw new Error(
      "Invalid preview ID. Only alphanumeric, hyphens, and underscores allowed."
    );
  }

  // Execute the tool's logic
  const result = await renderDiagram({ diagram, previewId, format, theme });

  // Return structured response
  return {
    content: [
      {
        type: "text",
        text: `Diagram rendered successfully!\nFile: ${result.filePath}`
      }
    ]
  };
}
```

The regex validation prevents malicious inputs like `../../etc/passwd` from being used in file paths. MCP servers run with user permissions, so validating all inputs that touch the filesystem or execute commands is critical.

### Response Format

MCP tool responses follow a standard structure. The `content` array allows returning multiple pieces of information - text, images, or other data. For most tools, a single text response is sufficient:

```typescript
// Success response
return {
  content: [
    { type: "text", text: "Success message here" }
  ]
};

// Error response
return {
  content: [
    { type: "text", text: `Error: ${error.message}` }
  ],
  isError: true
};
```

The `content` array can include multiple items. The `isError` flag indicates the operation failed. When set to true, Claude understands the tool call didn't succeed and can adjust its approach or inform the user about the problem.

## Implementing Tool Logic

Here's a complete example of processing arguments and executing logic:

```typescript
async function renderDiagram(options: RenderOptions): Promise<void> {
  const { diagram, previewId, format, theme, background, width, height, scale } = options;

  // Create temporary input file
  const tempDir = join(tmpdir(), "claude-mermaid");
  await mkdir(tempDir, { recursive: true });

  const inputFile = join(tempDir, `diagram-${previewId}.mmd`);
  const outputFile = join(tempDir, `diagram-${previewId}.${format}`);

  await writeFile(inputFile, diagram, "utf-8");

  // Build command arguments from tool parameters
  const args = [
    "-y", "mmdc",
    "-i", inputFile,
    "-o", outputFile,
    "-t", theme,
    "-b", background,
    "-w", width.toString(),
    "-H", height.toString(),
    "-s", scale.toString(),
  ];

  // Execute external tool
  const { stdout, stderr } = await execFileAsync("npx", args);

  // Copy result to final location
  const liveFilePath = getDiagramFilePath(previewId, format);
  await copyFile(outputFile, liveFilePath);
}
```

Notice how each tool argument maps directly to a command-line parameter for the Mermaid CLI. This pattern - taking structured arguments and translating them to external commands or API calls - is common in MCP servers. The server acts as a bridge, converting Claude's high-level requests into specific system operations.

The function also handles file management: creating temporary directories, writing input files, executing the rendering command, and copying results to the final location. This shows how MCP tools often orchestrate multiple steps to accomplish their goal.

## Multiple Tool Pattern

Most MCP servers expose multiple related tools. Claude-mermaid has two:

1. **mermaid_preview** - Render and display a diagram
2. **mermaid_save** - Save a previously rendered diagram to disk

```typescript
const TOOL_DEFINITIONS: Tool[] = [
  {
    name: "mermaid_preview",
    description: "Render a Mermaid diagram and open it in browser...",
    inputSchema: { /* ... */ }
  },
  {
    name: "mermaid_save",
    description: "Save the current live diagram to a file path...",
    inputSchema: {
      type: "object",
      properties: {
        save_path: {
          type: "string",
          description: "Path to save the diagram file (e.g., './docs/diagram.svg')",
        },
        preview_id: {
          type: "string",
          description: "Must match the preview_id used in mermaid_preview.",
        },
        format: {
          type: "string",
          enum: ["png", "svg", "pdf"],
          default: "svg",
        },
      },
      required: ["save_path", "preview_id"],
    },
  },
];
```

This pattern allows Claude to:
1. First preview a diagram with `mermaid_preview`
2. Iterate and refine it based on visual feedback
3. Save the final version with `mermaid_save` when satisfied

Separating preview from save gives users control. They can experiment freely with previews, and only commit to disk when ready. This separation of concerns makes each tool simpler and more focused.

## Debugging MCP Servers

Debugging MCP servers is tricky because they communicate through stdin/stdout, so `console.log()` cannot be used normally.

**Solution: Write logs to files**

```typescript
import { writeFileSync, appendFileSync } from "fs";
import { join } from "path";

const logFile = join(process.env.HOME, ".config/claude-mermaid/logs/mcp.log");

export function log(level: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} [${level}] ${message} ${data ? JSON.stringify(data) : ''}\n`;
  appendFileSync(logFile, logEntry);
}

// Use it in handlers
log("INFO", "Rendering diagram", { previewId, format });
```

Then tail the log file while testing:

```bash
tail -f ~/.config/claude-mermaid/logs/mcp.log
```

**Test handlers independently**

Writing unit tests for tool handlers helps with debugging:

```typescript
import { handleMermaidPreview } from "./handlers";

test("renders diagram with default options", async () => {
  const result = await handleMermaidPreview({
    diagram: "graph TD; A-->B",
    preview_id: "test"
  });

  expect(result.content[0].text).toContain("success");
});
```

This lets us debug the logic without running the full MCP protocol. We can iterate quickly on the handler implementation, then integrate it into the MCP server once it's working correctly.

## Deploying MCP Servers

Packaging the server for easy installation:

**1. Configure package.json**

```json
{
  "name": "claude-mermaid",
  "version": "1.1.0",
  "bin": {
    "claude-mermaid": "./build/index.js"
  },
  "files": [
    "build/**/*.js",
    "build/**/*.html"
  ]
}
```

**2. Make the entry point executable**

```typescript
#!/usr/bin/env node

// Server code here
```

**3. Installation**

```bash
npm install -g claude-mermaid
claude mcp add --scope user mermaid claude-mermaid
```

## Key Takeaways

Building an MCP server comes down to understanding:

1. **The Protocol** - stdio transport, ListTools, CallTool requests
2. **Tool Definitions** - Name, description, and JSON schema
3. **Argument Handling** - Extracting, validating, and using parameters
4. **Response Format** - Structured content with success/error states
5. **Security** - Validate everything, restrict file access

The complete [claude-mermaid source code](https://github.com/veelenga/claude-mermaid) demonstrates these concepts in a real-world implementation with features like multiple tools, input validation, file-based logging, and live browser preview.

Whether building a diagram renderer, database query tool, or API integration, these MCP fundamentals provide the foundation for creating powerful extensions for Claude.

## Resources

- [MCP Specification](https://modelcontextprotocol.io/docs/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [claude-mermaid GitHub](https://github.com/veelenga/claude-mermaid)
