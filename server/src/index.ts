import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import api from "./routes/api.js";
import wallet from "./routes/wallet.js";
import paymaster from "./routes/paymaster.js";

const app = new Hono();

app.use("*", cors());
app.use("*", logger());

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Routes
// Frontend calls: /api → proxy strips prefix → hits these routes
app.route("/", api);
app.route("/", wallet);
app.route("/", paymaster);

const port = parseInt(process.env.PORT || "3000");

console.log(`ZapPay server listening on port ${port}`);
serve({ fetch: app.fetch, port });
