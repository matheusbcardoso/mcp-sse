import express, { Request, Response } from "express";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import cors from "cors";

const PORT = 3000;

const server = new McpServer({
  name: "example-server",
  version: "1.0.0"
});

// ##################################################
// ... set up server resources, tools, and prompts ...

server.resource(
  "echo",
  new ResourceTemplate("echo://{message}", {
    list: undefined,
  }),
  async (uri, { message }) => ({
    contents: [{
      uri: uri.href,
      text: `Resource echo: ${message}`
    }]
  })
);

server.tool(
  "echo",
  { message: z.string() },
  async ({ message }) => ({
    content: [{ type: "text", text: `Tool echo: ${message}` }]
  })
);

server.prompt(
  "echo",
  { message: z.string() },
  ({ message }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please process this message: ${message}`
      }
    }]
  })
);

// ##################################################
// Create an Express server
const app = express();

// Configure CORS middleware to allow all origins
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    credentials: false,
  })
);

// Add a simple root route handler
app.get("/", (req, res) => {
  res.json({
    name: "MCP SSE Server",
    version: "1.0.0",
    status: "running",
    endpoints: {
      "/": "Server information (this response)",
      "/sse": "Server-Sent Events endpoint for MCP connection",
      "/messages": "POST endpoint for MCP messages",
    },
    tools: [
      { name: "add", description: "Add two numbers together" },
      { name: "search", description: "Faça pesquisas na web, tais como notícias, cotações, etc usando a Brave Search API" },
    ],
  });
});

// Simplificado: apenas uma conexão global
let transport: SSEServerTransport | null = null;

app.get("/sse", async (req: Request, res: Response) => {
  // Criar um novo transporte para esta conexão
  transport = new SSEServerTransport('/messages', res);
  
  res.on("close", () => {
    transport = null;
  });
  
  try {
    await server.connect(transport);
  } catch (error: any) {
    console.error("Error connecting transport:", error);
    res.status(500).send("Error connecting transport");
  }
});

app.post("/messages", async (req: Request, res: Response) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    console.error("No active transport connection");
    res.status(400).send('No active transport connection');
  }
});

app.listen(PORT);
console.log(`Server started on http://localhost:${PORT}  🚀`);
console.log(`Connect to SSE stream at http://localhost:${PORT}/sse`);
console.log(`Press Ctrl+C to stop the server`);