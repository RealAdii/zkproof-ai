/**
 * Simple server for the demo UI
 */
import "dotenv/config";
import http from "http";
import fs from "fs";
import path from "path";
import { ReclaimClient } from "@reclaimprotocol/zk-fetch";
import { verifyProof } from "@reclaimprotocol/js-sdk";

const PORT = 3000;

const client = new ReclaimClient(
  process.env.RECLAIM_APP_ID!,
  process.env.RECLAIM_APP_SECRET!
);

const server = http.createServer(async (req, res) => {
  // Serve the HTML page
  if (req.url === "/" || req.url === "/index.html") {
    const html = fs.readFileSync(path.join(process.cwd(), "demo-ui.html"), "utf-8");
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
    return;
  }

  // API endpoint for verifiable inference
  if (req.url === "/api/verify" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { prompt } = JSON.parse(body);

        const requestBody = {
          model: "claude-3-5-haiku-20241022",
          max_tokens: 150,
          messages: [{ role: "user", content: prompt }],
        };

        const startTime = Date.now();

        const proof = await client.zkFetch(
          "https://api.anthropic.com/v1/messages",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            useTee: true,
          },
          {
            headers: {
              "anthropic-version": "2023-06-01",
              "x-api-key": process.env.ANTHROPIC_API_KEY!,
            },
            responseMatches: [
              {
                type: "regex" as const,
                value: '(?<response>\\{[\\s\\S]*?"content"[\\s\\S]*\\})',
              },
            ],
          }
        );

        const latency = ((Date.now() - startTime) / 1000).toFixed(1);

        if (!proof) throw new Error("No proof returned");

        const responseJson = proof.extractedParameterValues?.response;
        const response = JSON.parse(responseJson || "{}");
        const text = response.content?.[0]?.text || "";

        // Verify
        const isValid = await verifyProof(proof as any);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          success: true,
          text,
          proofId: (proof as any).identifier?.slice(0, 24) + "...",
          proofSize: JSON.stringify(proof).length,
          latency,
          verified: isValid,
          timestamp: new Date().toISOString(),
          // Full proof data
          proof: {
            identifier: (proof as any).identifier,
            claimData: (proof as any).claimData,
            signatures: (proof as any).signatures,
            witnesses: (proof as any).witnesses,
            extractedParameterValues: proof.extractedParameterValues,
          },
          rawProof: JSON.stringify(proof, null, 2),
        }));
      } catch (error: any) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`\n🚀 Demo UI running at http://localhost:${PORT}\n`);
});
