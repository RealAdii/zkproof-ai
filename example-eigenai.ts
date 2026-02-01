import "dotenv/config";
import { createVerifiableEigenAI, VerifiableEigenAI } from "./src/index.js";

/**
 * Example: Basic deterministic inference with EigenAI
 */
async function basicExample() {
  const client = createVerifiableEigenAI({
    apiKey: process.env.EIGENAI_API_KEY!,
  });

  console.log("=== EigenAI Basic Example ===\n");
  console.log("Sending request to EigenAI...\n");

  // Generate a response with a specific seed for reproducibility
  const seed = 42; // Anyone using this seed will get the exact same output
  const result = await client.chat(
    "What is the capital of France? Answer in one sentence.",
    {
      model: "gpt-oss-120b-f16",
      seed,
      maxTokens: 100,
      temperature: 0, // 0 for maximum determinism
    }
  );

  console.log("Response:", result.text);
  console.log("\nAttestation details:");
  console.log("  - Seed:", result.attestation.seed);
  console.log("  - Model:", result.attestation.model);
  console.log("  - Request ID:", result.attestation.requestId);

  // Verify by re-executing
  console.log("\nVerifying by re-executing same request...");
  const verification = await client.verify(result);

  if (verification.isValid && verification.outputMatches) {
    console.log("VERIFIED - Re-execution produced identical output");
    console.log("  - Original:", result.text);
    console.log("  - Re-executed:", verification.reExecutedOutput);
  } else {
    console.log("VERIFICATION FAILED:", verification.error);
  }

  return result;
}

/**
 * Example: Demonstrate determinism
 * Running the same prompt + seed multiple times produces identical output
 */
async function determinismDemo() {
  const client = createVerifiableEigenAI({
    apiKey: process.env.EIGENAI_API_KEY!,
  });

  console.log("\n=== Determinism Demonstration ===\n");

  const prompt = "Generate a random number between 1 and 100.";
  const seed = 12345;

  console.log(`Prompt: "${prompt}"`);
  console.log(`Seed: ${seed}`);
  console.log("\nRunning 3 times with the same seed:\n");

  const results: string[] = [];

  for (let i = 1; i <= 3; i++) {
    const result = await client.chat(prompt, { seed, temperature: 0 });
    results.push(result.text);
    console.log(`  Run ${i}: ${result.text}`);
  }

  const allMatch = results.every((r) => r === results[0]);
  console.log(`\nAll outputs identical: ${allMatch ? "YES" : "NO"}`);

  if (allMatch) {
    console.log(
      "This proves determinism - anyone with the same seed gets the same output!"
    );
  }
}

/**
 * Example: Third-party verification
 * Shows how someone else can verify a result they received
 */
async function thirdPartyVerification() {
  const client = createVerifiableEigenAI({
    apiKey: process.env.EIGENAI_API_KEY!,
  });

  console.log("\n=== Third-Party Verification Example ===\n");

  // Agent generates a response
  console.log("1. Agent generates response...");
  const result = await client.chat("What is 2 + 2?", {
    seed: 999,
    temperature: 0,
  });
  console.log(`   Response: ${result.text}`);

  // Agent serializes and publishes the proof
  console.log("\n2. Agent serializes proof for publication...");
  const serialized = client.serializeResult(result);
  console.log("   Serialized proof:");
  console.log(`   - Text: ${serialized.text}`);
  console.log(`   - Model: ${serialized.model}`);
  console.log(`   - Provider: ${serialized.provider}`);
  console.log(`   - Attestation size: ${serialized.attestationJson.length} bytes`);

  // Third party receives the serialized proof and verifies
  console.log("\n3. Third party verifies the proof...");
  console.log("   (simulating third party with their own EigenAI access)");

  const thirdPartyClient = createVerifiableEigenAI({
    apiKey: process.env.EIGENAI_API_KEY!, // Third party uses their own key
  });

  const thirdPartyVerification =
    await thirdPartyClient.verifySerializedProof(serialized);

  if (thirdPartyVerification.isValid) {
    console.log("\n   VERIFIED by third party!");
    console.log(`   - Output matches: ${thirdPartyVerification.outputMatches}`);
    console.log(`   - Their re-execution: ${thirdPartyVerification.reExecutedOutput}`);
  } else {
    console.log(`\n   Verification failed: ${thirdPartyVerification.error}`);
  }
}

/**
 * Example: Compare with Claude (if both are configured)
 */
async function compareProviders() {
  // Check if Claude is also configured
  if (
    !process.env.ANTHROPIC_API_KEY ||
    !process.env.RECLAIM_APP_ID ||
    !process.env.RECLAIM_APP_SECRET
  ) {
    console.log("\n=== Provider Comparison (Skipped) ===");
    console.log("Set ANTHROPIC_API_KEY, RECLAIM_APP_ID, RECLAIM_APP_SECRET to compare\n");
    return;
  }

  const { createVerifiableClaude } = await import("./src/index.js");

  console.log("\n=== Provider Comparison ===\n");

  const eigenAI = createVerifiableEigenAI({
    apiKey: process.env.EIGENAI_API_KEY!,
  });

  const claude = createVerifiableClaude({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    reclaimAppId: process.env.RECLAIM_APP_ID!,
    reclaimAppSecret: process.env.RECLAIM_APP_SECRET!,
  });

  const prompt = "Explain quantum computing in one sentence.";

  console.log(`Prompt: "${prompt}"\n`);

  // Query both
  console.log("Querying EigenAI...");
  const eigenResult = await eigenAI.chat(prompt, { seed: 42 });
  console.log(`EigenAI (${eigenResult.model}): ${eigenResult.text}\n`);

  console.log("Querying Claude...");
  const claudeResult = await claude.chat(prompt, {
    model: "claude-3-5-haiku-20241022",
  });
  console.log(`Claude (${claudeResult.model}): ${claudeResult.text}\n`);

  // Verify both
  console.log("Verifying EigenAI (re-execution)...");
  const eigenVerification = await eigenAI.verify(eigenResult);
  console.log(`  Valid: ${eigenVerification.isValid}`);

  console.log("Verifying Claude (zkTLS)...");
  const claudeVerification = await claude.verify(claudeResult);
  console.log(`  Valid: ${claudeVerification.isValid}`);

  console.log("\n--- Summary ---");
  console.log("EigenAI: Deterministic re-execution verification");
  console.log("Claude:  zkTLS proof of API origin");
}

// Main
async function main() {
  if (!process.env.EIGENAI_API_KEY) {
    console.error("Missing EIGENAI_API_KEY environment variable");
    console.error("\nGet your API key at: https://determinal.eigenarcade.com");
    console.error("Or check: https://developers.eigencloud.xyz");
    process.exit(1);
  }

  try {
    await basicExample();
    await determinismDemo();
    await thirdPartyVerification();
    await compareProviders();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
