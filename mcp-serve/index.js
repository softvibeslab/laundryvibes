#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"; // this is for local testing with stdio
// import { HttpServerTransport } from "@modelcontextprotocol/sdk/server/http.js";  // for mcp server to remote hosting
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import { BASE_URL } from "./config.js";

class LaundryBuddyMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "laundry-buddy-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "login",
          description:
            "Login as a user to the Laundry Buddy system. Returns a JWT token that can be used for authenticated requests.",
          inputSchema: {
            type: "object",
            properties: {
              email: {
                type: "string",
                description: "User's email address",
              },
              password: {
                type: "string",
                description: "User's password",
              },
            },
            required: ["email", "password"],
          },
        },
        {
          name: "submit_order",
          description:
            "Submit a laundry order. Requires authentication token from login. Creates a new order with number of clothes and weight.",
          inputSchema: {
            type: "object",
            properties: {
              token: {
                type: "string",
                description:
                  "JWT authentication token obtained from the login tool",
              },
              numberOfClothes: {
                type: "number",
                description: "Number of clothes in the order (minimum 1)",
              },
              weight: {
                type: "number",
                description: "Weight of the laundry in appropriate units (minimum 0)",
              },
            },
            required: ["token", "numberOfClothes", "weight"],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "login":
            return await this.handleLogin(args);
          case "submit_order":
            return await this.handleSubmitOrder(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async handleLogin(args) {
    const { email, password } = args;

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    try {
      const response = await axios.post(`${BASE_URL}/user/login`, {
        email,
        password,
      });

      if (response.data.success) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: response.data.message,
                  token: response.data.token,
                  userId: response.data.userId,
                  name: response.data.name,
                  role: response.data.role,
                },
                null,
                2
              ),
            },
          ],
        };
      } else {
        throw new Error(response.data.message || "Login failed");
      }
    } catch (error) {
      if (error.response) {
        throw new Error(
          error.response.data.message || "Login failed with server error"
        );
      }
      throw new Error(`Login request failed: ${error.message}`);
    }
  }

  async handleSubmitOrder(args) {
    const { token, numberOfClothes, weight } = args;

    if (!token) {
      throw new Error("Authentication token is required");
    }

    if (!numberOfClothes || numberOfClothes < 1) {
      throw new Error("Number of clothes must be at least 1");
    }

    if (weight === undefined || weight < 0) {
      throw new Error("Weight must be a non-negative number");
    }

    try {
      const response = await axios.post(
        `${BASE_URL}/user/submit-order`,
        {
          numberOfClothes: parseInt(numberOfClothes),
          weight: parseInt(weight),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message: response.data.message,
                order: response.data.order,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      if (error.response) {
        throw new Error(
          error.response.data.message || "Failed to submit order"
        );
      }
      throw new Error(`Submit order request failed: ${error.message}`);
    }
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Laundry Buddy MCP server running on stdio");
  }

//     async run() {
//     const app = express();
//     const transport = new HttpServerTransport({ app }); // Initialize HTTP transport with Express app

//     // The connect method now binds the MCP handlers to the Express routes
//     await this.server.connect(transport); 

//     // Start the HTTP server
//     app.listen(PORT, () => {
//       console.error(`Laundry Buddy MCP server running on http://localhost:${PORT}`);
//       console.error(`WebSocket endpoint: ws://localhost:${PORT}/v1/mcp`);
//     });
//   }
} 

const server = new LaundryBuddyMCPServer();
server.run().catch(console.error);





