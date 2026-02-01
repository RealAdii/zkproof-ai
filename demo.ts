/**
 * Verifiable AI Inference - Live Demo
 * Proves AI responses genuinely came from Anthropic using zkTLS
 */
import "dotenv/config";
import { ReclaimClient } from "@reclaimprotocol/zk-fetch";
import { verifyProof } from "@reclaimprotocol/js-sdk";

// Suppress verbose logging
process.env.LOG_LEVEL = "error";

const ANTHROPIC_API_ENDPOINT = "https://api.anthropic.com/v1/messages";

async function main() {
  console.log("");
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║         VERIFIABLE AI INFERENCE - LIVE DEMO                  ║");
  console.log("║         Proving AI responses are real with zkTLS             ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");

  const client = new ReclaimClient(
    process.env.RECLAIM_APP_ID!,
    process.env.RECLAIM_APP_SECRET!
  );

  const prompt = "What is the capital of France? Answer in exactly one sentence.";

  console.log("📝 Prompt:", prompt);
  console.log("");
  console.log("⏳ Sending verifiable request to Claude via zkTLS...");
  console.log("   (generating cryptographic proof in background)");
  console.log("");

  const body = {
    model: "claude-3-5-haiku-20241022",
    max_tokens: 100,
    messages: [{ role: "user", content: prompt }],
  };

  try {
    const startTime = Date.now();

    const proof = await client.zkFetch(
      ANTHROPIC_API_ENDPOINT,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
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

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (!proof) {
      throw new Error("No proof returned");
    }

    // Parse the response
    const responseJson = proof.extractedParameterValues?.response;
    const response = JSON.parse(responseJson || "{}");
    const text = response.content?.[0]?.text || "";

    console.log("═══════════════════════════════════════════════════════════════");
    console.log("✅ RESPONSE RECEIVED WITH CRYPTOGRAPHIC PROOF");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("");
    console.log("💬 Claude says:", text);
    console.log("");
    console.log("📜 Proof Details:");
    console.log("   • Proof ID:   ", (proof as any).identifier?.slice(0, 24) + "...");
    console.log("   • Generated:  ", new Date().toISOString());
    console.log("   • Latency:    ", elapsed + "s");
    console.log("   • Endpoint:   ", ANTHROPIC_API_ENDPOINT);
    console.log("   • Proof Size: ", JSON.stringify(proof).length, "bytes");

    // Verify the proof
    console.log("");
    console.log("🔍 Verifying proof...");
    const isValid = await verifyProof(proof as any);

    console.log("");
    if (isValid) {
      console.log("╔══════════════════════════════════════════════════════════════╗");
      console.log("║  ✅ PROOF VERIFIED                                           ║");
      console.log("║                                                              ║");
      console.log("║  This response GENUINELY came from Anthropic's servers.      ║");
      console.log("║  Mathematical guarantee - no trust required.                 ║");
      console.log("╚══════════════════════════════════════════════════════════════╝");
    } else {
      console.log("╔══════════════════════════════════════════════════════════════╗");
      console.log("║  ❌ PROOF VERIFICATION FAILED                                ║");
      console.log("╚══════════════════════════════════════════════════════════════╝");
    }

    console.log("");
    console.log("📦 This proof can be shared with anyone.");
    console.log("   They can verify it without API keys or trusting you.");
    console.log("");
    console.log("════════════════════════════════════════════════════════════════");
    console.log("   In a world of AI agents, proof is everything.");
    console.log("════════════════════════════════════════════════════════════════");
    console.log("");

  } catch (error: any) {
    console.error("❌ Error:", error.message || error);
  }
}

main();
