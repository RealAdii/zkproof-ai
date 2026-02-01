/**
 * Demo using TEE (Trusted Execution Environment) mode
 * This runs proof generation on Reclaim's infrastructure
 */
import "dotenv/config";
import { ReclaimClient } from "@reclaimprotocol/zk-fetch";
import { verifyProof } from "@reclaimprotocol/js-sdk";

const ANTHROPIC_API_ENDPOINT = "https://api.anthropic.com/v1/messages";

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║         VERIFIABLE AI INFERENCE - LIVE DEMO                  ║");
  console.log("║         Proving AI responses are real with zkTLS             ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  const client = new ReclaimClient(
    process.env.RECLAIM_APP_ID!,
    process.env.RECLAIM_APP_SECRET!
  );

  const prompt = "What is the capital of France? Answer in exactly one sentence.";

  console.log("📝 Prompt:", prompt);
  console.log("\n⏳ Sending verifiable request to Claude via zkTLS (TEE mode)...\n");

  const body = {
    model: "claude-3-5-haiku-20241022",
    max_tokens: 100,
    messages: [{ role: "user", content: prompt }],
  };

  try {
    const proof = await client.zkFetch(
      ANTHROPIC_API_ENDPOINT,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        // Enable TEE mode - runs on Reclaim's infrastructure
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

    if (!proof) {
      throw new Error("No proof returned");
    }

    // Parse the response
    const responseJson = proof.extractedParameterValues?.response;
    const response = JSON.parse(responseJson || "{}");
    const text = response.content?.[0]?.text || "";

    console.log("═══════════════════════════════════════════════════════════════");
    console.log("✅ RESPONSE RECEIVED WITH CRYPTOGRAPHIC PROOF");
    console.log("═══════════════════════════════════════════════════════════════\n");

    console.log("💬 Claude says:", text);
    console.log("\n📜 Proof Details:");
    console.log("   • Proof ID:", (proof as any).identifier?.slice(0, 30) + "...");
    console.log("   • Timestamp:", new Date().toISOString());
    console.log("   • Endpoint:", ANTHROPIC_API_ENDPOINT);

    // Verify the proof
    console.log("\n🔍 Verifying proof...");
    const isValid = await verifyProof(proof as any);

    if (isValid) {
      console.log("\n╔══════════════════════════════════════════════════════════════╗");
      console.log("║  ✅ PROOF VERIFIED - Response genuinely from Anthropic       ║");
      console.log("╚══════════════════════════════════════════════════════════════╝");
    } else {
      console.log("\n❌ PROOF VERIFICATION FAILED");
    }

    console.log("\n📦 Serialized proof (shareable):");
    console.log("   Size:", JSON.stringify(proof).length, "bytes");

  } catch (error) {
    console.error("Error:", error);
  }
}

main();
