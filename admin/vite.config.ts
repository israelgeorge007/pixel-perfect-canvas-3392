import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

type FeedbackEntry = {
  id: string;
  name: string;
  email: string;
  company: string;
  subject: string;
  message: string;
  receivedAt: string;
  status: "New";
};

function feedbackApi(): Plugin {
  const entries: FeedbackEntry[] = [];
  const allowedOrigins = new Set([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]);

  return {
    name: "admin-feedback-api",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split("?")[0] !== "/api/feedback") {
          next();
          return;
        }

        const origin = request.headers.origin;
        if (origin && !allowedOrigins.has(origin)) {
          response.statusCode = 403;
          response.end(JSON.stringify({ error: "Origin not allowed" }));
          return;
        }
        if (origin) {
          response.setHeader("Access-Control-Allow-Origin", origin);
          response.setHeader("Vary", "Origin");
          response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
          response.setHeader("Access-Control-Allow-Headers", "Content-Type");
        }

        response.setHeader("Content-Type", "application/json; charset=utf-8");
        if (request.method === "OPTIONS") {
          response.statusCode = 204;
          response.end();
          return;
        }
        if (request.method === "GET") {
          response.end(JSON.stringify(entries));
          return;
        }
        if (request.method !== "POST") {
          response.statusCode = 405;
          response.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        request.setEncoding("utf8");
        let body = "";
        request.on("data", (chunk: string) => { body += chunk; });
        request.on("end", () => {
          try {
            const payload = JSON.parse(body) as Record<string, unknown>;
            const message = typeof payload.message === "string" ? payload.message.trim() : "";
            if (!message || message.length > 2000) {
              response.statusCode = 400;
              response.end(JSON.stringify({ error: "Feedback message must contain 1 to 2000 characters" }));
              return;
            }

            const allowedCategories = ["Suggestion", "Issue", "Question", "Other"];
            const category = typeof payload.category === "string" && allowedCategories.includes(payload.category)
              ? payload.category
              : "Other";
            const entry: FeedbackEntry = {
              id: `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : "Dashboard user",
              email: typeof payload.email === "string" ? payload.email.trim() : "",
              company: typeof payload.company === "string" && payload.company.trim() ? payload.company.trim() : "Dashboard",
              subject: `${category} feedback`,
              message,
              receivedAt: new Date().toLocaleString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
              status: "New",
            };
            entries.unshift(entry);
            response.statusCode = 201;
            response.end(JSON.stringify(entry));
          } catch {
            response.statusCode = 400;
            response.end(JSON.stringify({ error: "Invalid feedback payload" }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [feedbackApi(), react()],
  server: {
    port: 4174,
    strictPort: true,
  },
  preview: {
    port: 4175,
    strictPort: true,
  },
});
