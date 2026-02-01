import OpenAI from "openai";
import type {
  EigenAIConfig,
  EigenAIModel,
  EigenAIGenerateOptions,
  EigenAIResult,
  EigenAIVerificationResult,
  EigenAIAttestation,
  SerializedEigenAIProof,
  Message,
} from "./types.js";

const EIGENAI_ENDPOINT = "https://eigenai.eigencloud.xyz/v1";
const DEFAULT_MODEL: EigenAIModel = "gpt-oss-120b-f16";

/**
 * VerifiableEigenAI - Deterministic AI inference with re-execution verification
 *
 * Uses EigenCloud's EigenAI for deterministic LLM inference:
 * 1. Responses are deterministic given the same seed
 * 2. Anyone can re-execute the same request to verify the output
 * 3. No need to trust a third party - verification through re-execution
 *
 * This allows third parties to independently verify AI-generated content
 * by re-running the exact same inference.
 */
export class VerifiableEigenAI {
  private client: OpenAI;
  private config: EigenAIConfig;
  private endpoint: string;

  constructor(config: EigenAIConfig) {
    this.config = config;
    this.endpoint = config.endpoint || EIGENAI_ENDPOINT;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: this.endpoint,
    });
  }

  /**
   * Generate a random seed for deterministic inference
   */
  private generateSeed(): number {
    return Math.floor(Math.random() * 2147483647);
  }

  /**
   * Generate text with deterministic, verifiable inference
   *
   * @param options - Generation options
   * @returns Promise with generated text and attestation for verification
   *
   * @example
   * ```typescript
   * const result = await client.generate({
   *   prompt: "What is the capital of France?",
   *   seed: 12345, // Use specific seed for reproducibility
   * });
   *
   * console.log(result.text);
   * console.log(result.attestation.seed); // 12345
   *
   * // Anyone can verify by re-running with the same seed
   * ```
   */
  async generate(options: EigenAIGenerateOptions): Promise<EigenAIResult> {
    const model = options.model || DEFAULT_MODEL;
    const maxTokens = options.maxTokens || 1024;
    const temperature = options.temperature ?? 0; // Default to 0 for determinism
    const seed = options.seed ?? this.generateSeed();

    // Build messages array
    let messages: OpenAI.Chat.ChatCompletionMessageParam[];

    if (options.system) {
      messages = [{ role: "system", content: options.system }];
    } else {
      messages = [];
    }

    if (options.messages) {
      messages.push(
        ...options.messages.map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        }))
      );
    } else if (options.prompt) {
      messages.push({ role: "user", content: options.prompt });
    } else {
      throw new Error("Either 'messages' or 'prompt' must be provided");
    }

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        seed,
        stop: options.stop,
      });

      const text = response.choices[0]?.message?.content || "";

      // Build attestation for verification
      const attestation: EigenAIAttestation = {
        seed,
        model,
        requestId: response.id,
        requestParams: {
          messages: messages.map((m) => ({
            role: m.role as Message["role"],
            content: m.content as string,
          })),
          temperature,
          maxTokens,
        },
      };

      return {
        text,
        attestation,
        timestamp: Date.now(),
        model,
        provider: "eigenai",
        rawResponse: response,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(`EigenAI generation failed: ${message}`);
    }
  }

  /**
   * Verify a result by re-executing the same inference
   *
   * This is the core verification mechanism for EigenAI:
   * - Re-run the exact same request with the same seed
   * - Compare outputs byte-for-byte
   * - If they match, the original response is verified
   *
   * @param result - The result to verify
   * @returns Verification result with comparison details
   *
   * @example
   * ```typescript
   * const result = await client.generate({ prompt: "Hello", seed: 42 });
   * const verification = await client.verify(result);
   *
   * if (verification.isValid && verification.outputMatches) {
   *   console.log("Verified! Re-execution produced identical output.");
   * }
   * ```
   */
  async verify(result: EigenAIResult): Promise<EigenAIVerificationResult> {
    try {
      const { attestation } = result;

      // Re-execute the same request
      const response = await this.client.chat.completions.create({
        model: attestation.model,
        messages: attestation.requestParams.messages.map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
        max_tokens: attestation.requestParams.maxTokens || 1024,
        temperature: attestation.requestParams.temperature ?? 0,
        seed: attestation.seed,
      });

      const reExecutedOutput = response.choices[0]?.message?.content || "";
      const outputMatches = reExecutedOutput === result.text;

      return {
        isValid: outputMatches,
        outputMatches,
        reExecutedOutput,
        verifiedEndpoint: outputMatches ? this.endpoint : undefined,
      };
    } catch (error) {
      return {
        isValid: false,
        outputMatches: false,
        error: error instanceof Error ? error.message : "Verification failed",
      };
    }
  }

  /**
   * Verify a serialized proof by re-executing
   * Useful for verifying proofs received from third parties
   *
   * @param serialized - Serialized proof data
   * @param expectedText - The text that should be produced
   * @returns Verification result
   */
  async verifySerializedProof(
    serialized: SerializedEigenAIProof
  ): Promise<EigenAIVerificationResult> {
    try {
      const attestation = JSON.parse(
        serialized.attestationJson
      ) as EigenAIAttestation;

      // Re-execute with the attestation parameters
      const response = await this.client.chat.completions.create({
        model: attestation.model,
        messages: attestation.requestParams.messages.map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
        max_tokens: attestation.requestParams.maxTokens || 1024,
        temperature: attestation.requestParams.temperature ?? 0,
        seed: attestation.seed,
      });

      const reExecutedOutput = response.choices[0]?.message?.content || "";
      const outputMatches = reExecutedOutput === serialized.text;

      return {
        isValid: outputMatches,
        outputMatches,
        reExecutedOutput,
        verifiedEndpoint: outputMatches ? this.endpoint : undefined,
      };
    } catch (error) {
      return {
        isValid: false,
        outputMatches: false,
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
  serializeResult(result: EigenAIResult): SerializedEigenAIProof {
    return {
      attestationJson: JSON.stringify(result.attestation),
      text: result.text,
      timestamp: result.timestamp,
      model: result.model,
      provider: "eigenai",
    };
  }

  /**
   * Simple chat interface with verification
   *
   * @param prompt - The user's message
   * @param options - Optional generation parameters
   * @returns EigenAI result with attestation
   */
  async chat(
    prompt: string,
    options?: Partial<EigenAIGenerateOptions>
  ): Promise<EigenAIResult> {
    return this.generate({
      prompt,
      ...options,
    });
  }
}

/**
 * Create a verifiable EigenAI client
 *
 * @example
 * ```typescript
 * const client = createVerifiableEigenAI({
 *   apiKey: process.env.EIGENAI_API_KEY!,
 * });
 *
 * // Generate with a specific seed for reproducibility
 * const result = await client.chat("What is 2+2?", { seed: 42 });
 * console.log(result.text);
 *
 * // Verify by re-executing
 * const verification = await client.verify(result);
 * console.log("Verified:", verification.isValid);
 * console.log("Output matches:", verification.outputMatches);
 * ```
 */
export function createVerifiableEigenAI(
  config: EigenAIConfig
): VerifiableEigenAI {
  return new VerifiableEigenAI(config);
}

export default VerifiableEigenAI;
