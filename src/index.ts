import { ReclaimClient } from "@reclaimprotocol/zk-fetch";
import { verifyProof, Proof } from "@reclaimprotocol/js-sdk";
import type {
  VerifiableClaudeConfig,
  ClaudeModel,
  Message,
  ClaudeGenerateOptions,
  VerifiableClaudeResult,
  VerificationResult,
  SerializedClaudeProof,
} from "./types.js";

// Re-export everything
export * from "./types.js";
export * from "./eigenai.js";

const ANTHROPIC_API_ENDPOINT = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION = "2023-06-01";

/**
 * VerifiableClaude - A Claude API client with zkTLS verification
 *
 * Uses Reclaim Protocol to generate cryptographic proofs that:
 * 1. Requests were sent to api.anthropic.com (origin verification)
 * 2. Responses were not modified (integrity verification)
 *
 * This allows third parties to verify that AI-generated content
 * genuinely came from Anthropic's Claude API.
 */
export class VerifiableClaude {
  private reclaimClient: ReclaimClient;
  private config: VerifiableClaudeConfig;
  private endpoint: string;

  constructor(config: VerifiableClaudeConfig) {
    this.config = config;
    this.endpoint = config.endpoint || ANTHROPIC_API_ENDPOINT;
    this.reclaimClient = new ReclaimClient(
      config.reclaimAppId,
      config.reclaimAppSecret
    );
  }

  /**
   * Generate text with verifiable proof
   *
   * @param options - Generation options
   * @returns Promise with generated text and cryptographic proof
   *
   * @example
   * ```typescript
   * const result = await client.generate({
   *   prompt: "What is the capital of France?",
   *   model: "claude-3-5-sonnet-20241022",
   * });
   *
   * console.log(result.text); // "The capital of France is Paris."
   * console.log(result.proof); // Cryptographic proof
   * ```
   */
  async generate(options: ClaudeGenerateOptions): Promise<VerifiableClaudeResult> {
    const model = options.model || "claude-3-5-sonnet-20241022";
    const maxTokens = options.maxTokens || 1024;
    const temperature = options.temperature ?? 1;

    // Build messages array
    let messages: Message[];
    if (options.messages) {
      messages = options.messages;
    } else if (options.prompt) {
      messages = [{ role: "user", content: options.prompt }];
    } else {
      throw new Error("Either 'messages' or 'prompt' must be provided");
    }

    // Build request body
    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      messages,
    };

    if (options.system) {
      body.system = options.system;
    }

    if (temperature !== undefined) {
      body.temperature = temperature;
    }

    if (options.stopSequences?.length) {
      body.stop_sequences = options.stopSequences;
    }

    // Regex to extract the response - matches the full JSON response
    // This captures the entire response body for integrity verification
    const responseRegex =
      '(?<response>\\{[\\s\\S]*?"id":\\s*"msg_[^"]*"[\\s\\S]*\\})';

    try {
      // Make the zkTLS request through Reclaim Protocol
      const proof = await this.reclaimClient.zkFetch(
        `${this.endpoint}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
        {
          // These headers are used for authentication but hidden from the proof
          // (the proof verifies the response came from Anthropic without exposing your API key)
          headers: {
            "anthropic-version": ANTHROPIC_VERSION,
            "x-api-key": this.config.apiKey,
          },
          // Response matching rules - proves the response matches expected format
          responseMatches: [
            {
              type: "regex" as const,
              value: responseRegex,
            },
          ],
        }
      );

      if (!proof) {
        throw new Error("Failed to generate proof - no proof returned");
      }

      // Extract the response from the proof
      const responseJson = proof.extractedParameterValues?.response;
      if (!responseJson) {
        throw new Error("Failed to extract response from proof");
      }

      const response = JSON.parse(responseJson);

      // Extract text from Claude's response format
      let text = "";
      if (Array.isArray(response.content)) {
        const textContent = response.content.find(
          (item: { type: string; text?: string }) => item.type === "text"
        );
        text = textContent?.text || "";
      }

      return {
        text,
        proof: proof as Proof,
        timestamp: Date.now(),
        model,
        provider: "reclaim",
        rawResponse: response,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(`Verifiable generation failed: ${message}`);
    }
  }

  /**
   * Verify a proof from a previous generation
   *
   * @param result - The result containing the proof to verify
   * @returns Verification result indicating if proof is valid
   *
   * @example
   * ```typescript
   * const result = await client.generate({ prompt: "Hello" });
   * const verification = await client.verify(result);
   *
   * if (verification.isValid) {
   *   console.log("Proof verified! Response genuinely came from Anthropic.");
   * }
   * ```
   */
  async verify(result: VerifiableClaudeResult): Promise<VerificationResult> {
    try {
      const isValid = await verifyProof(result.proof);

      return {
        isValid,
        verifiedEndpoint: isValid ? `${this.endpoint}/messages` : undefined,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : "Verification failed",
      };
    }
  }

  /**
   * Verify a proof from serialized data
   * Useful for verifying proofs received from third parties
   *
   * @param serialized - Serialized proof data
   * @returns Verification result
   */
  static async verifySerializedProof(
    serialized: SerializedClaudeProof
  ): Promise<VerificationResult> {
    try {
      const proof = JSON.parse(serialized.proofJson) as Proof;
      const isValid = await verifyProof(proof);

      return {
        isValid,
        verifiedEndpoint: isValid
          ? `${ANTHROPIC_API_ENDPOINT}/messages`
          : undefined,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : "Verification failed",
      };
    }
  }

  /**
   * Serialize a result for storage or transmission
   *
   * @param result - The result to serialize
   * @returns Serialized proof that can be stored or sent to third parties
   */
  serializeResult(result: VerifiableClaudeResult): SerializedClaudeProof {
    return {
      proofJson: JSON.stringify(result.proof),
      text: result.text,
      timestamp: result.timestamp,
      model: result.model,
      provider: "reclaim",
    };
  }

  /**
   * Simple chat interface with verification
   *
   * @param prompt - The user's message
   * @param options - Optional generation parameters
   * @returns Verifiable result
   */
  async chat(
    prompt: string,
    options?: Partial<ClaudeGenerateOptions>
  ): Promise<VerifiableClaudeResult> {
    return this.generate({
      prompt,
      ...options,
    });
  }
}

/**
 * Create a verifiable Claude client
 *
 * @example
 * ```typescript
 * const client = createVerifiableClaude({
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 *   reclaimAppId: process.env.RECLAIM_APP_ID!,
 *   reclaimAppSecret: process.env.RECLAIM_APP_SECRET!,
 * });
 *
 * const result = await client.chat("Hello, Claude!");
 * console.log(result.text);
 *
 * // Verify the response came from Anthropic
 * const verification = await client.verify(result);
 * console.log("Verified:", verification.isValid);
 * ```
 */
export function createVerifiableClaude(
  config: VerifiableClaudeConfig
): VerifiableClaude {
  return new VerifiableClaude(config);
}

export default VerifiableClaude;
