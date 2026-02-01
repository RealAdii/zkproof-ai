/**
 * Claude + Reclaim Protocol Examples
 *
 * These examples demonstrate zkTLS verification with Claude.
 * Run with: pnpm example
 *
 * For EigenAI examples, see example-eigenai.ts (pnpm example:eigenai)
 */

import "dotenv/config";
import { createVerifiableClaude, VerifiableClaude } from "./src/index.js";

/**
 * Example: Basic verifiable chat with Claude
 */
async function basicExample() {
  const client = createVerifiableClaude({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    reclaimAppId: process.env.RECLAIM_APP_ID!,
    reclaimAppSecret: process.env.RECLAIM_APP_SECRET!,
  });

  console.log("=== Claude + Reclaim zkTLS Example ===\n");
  console.log("Sending verifiable request to Claude...\n");

  // Generate a response with proof
  const result = await client.chat(
    "What is the capital of France? Answer in one sentence.",
    {
      model: "claude-3-5-sonnet-20241022",
      maxTokens: 100,
    }
  );

  console.log("Response:", result.text);
  console.log("\nTimestamp:", new Date(result.timestamp).toISOString());
  console.log("Model:", result.model);

  // Verify the proof
  console.log("\nVerifying proof...");
  const verification = await client.verify(result);

  if (verification.isValid) {
    console.log("Proof VALID - Response genuinely came from Anthropic");
    console.log("Verified endpoint:", verification.verifiedEndpoint);
  } else {
    console.log("Proof INVALID:", verification.error);
  }

  return result;
}

/**
 * Example: Serialize and verify proof (for sharing with third parties)
 */
async function serializationExample() {
  const client = createVerifiableClaude({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    reclaimAppId: process.env.RECLAIM_APP_ID!,
    reclaimAppSecret: process.env.RECLAIM_APP_SECRET!,
  });

  console.log("\n--- Serialization Example ---\n");

  const result = await client.chat("Say 'Hello, verifiable world!'");

  // Serialize the proof for storage or transmission
  const serialized = client.serializeResult(result);
  console.log("Serialized proof (can be stored in DB or sent to others):");
  console.log("- Text:", serialized.text);
  console.log("- Model:", serialized.model);
  console.log("- Proof size:", serialized.proofJson.length, "bytes");

  // Later, anyone can verify the proof without the API key
  console.log("\nThird-party verification (no API key needed):");
  const thirdPartyVerification =
    await VerifiableClaude.verifySerializedProof(serialized);
  console.log("Valid:", thirdPartyVerification.isValid);
}

/**
 * Example: Multi-turn conversation with verification
 */
async function conversationExample() {
  const client = createVerifiableClaude({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    reclaimAppId: process.env.RECLAIM_APP_ID!,
    reclaimAppSecret: process.env.RECLAIM_APP_SECRET!,
  });

  console.log("\n--- Conversation Example ---\n");

  // First turn
  const result1 = await client.generate({
    messages: [{ role: "user", content: "My name is Alice." }],
    model: "claude-3-5-haiku-20241022",
  });
  console.log("Turn 1:", result1.text);

  // Second turn (includes history)
  const result2 = await client.generate({
    messages: [
      { role: "user", content: "My name is Alice." },
      { role: "assistant", content: result1.text },
      { role: "user", content: "What is my name?" },
    ],
    model: "claude-3-5-haiku-20241022",
  });
  console.log("Turn 2:", result2.text);

  // Verify both turns
  const v1 = await client.verify(result1);
  const v2 = await client.verify(result2);
  console.log("\nBoth turns verified:", v1.isValid && v2.isValid);
}

// Run examples
async function main() {
  // Check for required environment variables
  const required = ["ANTHROPIC_API_KEY", "RECLAIM_APP_ID", "RECLAIM_APP_SECRET"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("Missing required environment variables:", missing.join(", "));
    console.error("\nCreate a .env file with:");
    console.error("  ANTHROPIC_API_KEY=your-anthropic-key");
    console.error("  RECLAIM_APP_ID=your-reclaim-app-id");
    console.error("  RECLAIM_APP_SECRET=your-reclaim-app-secret");
    console.error("\nGet Reclaim credentials at: https://dev.reclaimprotocol.org");
    process.exit(1);
  }

  try {
    await basicExample();
    // Uncomment to run other examples:
    // await serializationExample();
    // await conversationExample();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
