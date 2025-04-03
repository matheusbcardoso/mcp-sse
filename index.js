import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Inicia servidor MCP
const server = new McpServer({
    name: "mcp-sse-server",
    version: "1.0.0"
});

// Define uma tool de exemplo
server.tool(
    "echo",
    {
        texto: z.string()
    },
    async ({ texto }) => {
        return {
            content: [
                {
                    type: "text",
                    text: `Você enviou: ${texto}`
                }
            ]
        };
    }
);

let transport; // Armazena a instância do transporte SSE

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.sendStatus(200); // responde apenas preflight
    }

    next(); // segue para as rotas
});

// Endpoint para abrir a conexão SSE (fluxo contínuo)
app.get("/events", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    transport = new SSEServerTransport("/message", res);
});

// Endpoint para receber mensagens do agente (POST MCP)
app.post("/message", async (req, res) => {
    if (transport) {
        await transport.handlePostMessage(req, res);
    } else {
        res.status(503).send("Conexão SSE não iniciada.");
    }
});

// Sobe o servidor HTTP
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 MCP Server via SSE rodando em http://localhost:${PORT}`);
});
