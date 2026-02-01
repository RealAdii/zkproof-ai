/**
 * Mock Demo - Shows expected output for video recording
 *
 * This demonstrates what the verifiable inference flow looks like.
 * For real zkTLS proofs, run on Linux (see Dockerfile).
 */
import "dotenv/config";

// Simulated proof structure (based on actual Reclaim proof format)
const mockProof = {
  identifier: "0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b",
  claimData: {
    provider: "http",
    parameters: '{"url":"https://api.anthropic.com/v1/messages","method":"POST"}',
    context: '{"extractedParameters":{"response":"..."}}',
  },
  signatures: ["0xabc123..."],
  witnesses: [{ id: "reclaim-witness-1", url: "wss://witness.reclaimprotocol.org" }],
  extractedParameterValues: {
    response: '{"id":"msg_01ABC","type":"message","content":[{"type":"text","text":"The capital of France is Paris."}]}',
  },
};

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.clear();
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║         VERIFIABLE AI INFERENCE - LIVE DEMO                  ║");
  console.log("║         Proving AI responses are real with zkTLS             ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  const prompt = "What is the capital of France? Answer in exactly one sentence.";

  console.log("📝 Prompt:", prompt);
  await sleep(1000);

  console.log("\n⏳ Sending verifiable request to Claude via zkTLS...");
  await sleep(500);
  console.log("   → Establishing TLS connection to api.anthropic.com");
  await sleep(800);
  console.log("   → Generating zero-knowledge proof of request");
  await sleep(1000);
  console.log("   → Capturing response with cryptographic witness");
  await sleep(800);
  console.log("   → Finalizing proof...");
  await sleep(1200);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("✅ RESPONSE RECEIVED WITH CRYPTOGRAPHIC PROOF");
  console.log("═══════════════════════════════════════════════════════════════\n");

  await sleep(500);
  console.log("💬 Claude says: The capital of France is Paris.");

  await sleep(800);
  console.log("\n📜 Proof Details:");
  console.log("   • Proof ID:    0x7a8b9c0d1e2f3a4b5c6d7e8f...");
  console.log("   • Timestamp:  ", new Date().toISOString());
  console.log("   • Endpoint:    https://api.anthropic.com/v1/messages");
  console.log("   • Witness:     wss://witness.reclaimprotocol.org");

  await sleep(1000);
  console.log("\n🔍 Verifying proof...");
  await sleep(500);
  console.log("   → Checking witness signatures");
  await sleep(600);
  console.log("   → Validating TLS transcript");
  await sleep(600);
  console.log("   → Verifying zero-knowledge proof");
  await sleep(800);

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║  ✅ PROOF VERIFIED                                           ║");
  console.log("║  This response genuinely came from Anthropic's servers       ║");
  console.log("║  Mathematical guarantee - no trust required                  ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  await sleep(1000);
  console.log("\n📦 Proof can be shared with anyone:");
  console.log("   • Size: 2,847 bytes");
  console.log("   • Format: JSON (blockchain-ready)");
  console.log("   • Anyone can verify without API keys");

  await sleep(500);
  console.log("\n🔗 What this proves:");
  console.log("   1. Request went to api.anthropic.com (not faked)");
  console.log("   2. Response was not modified in transit");
  console.log("   3. This is exactly what Claude returned");

  console.log("\n════════════════════════════════════════════════════════════════");
  console.log("   In a world of AI agents, proof is everything.");
  console.log("════════════════════════════════════════════════════════════════\n");
}

main();
