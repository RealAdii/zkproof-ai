import type { Proof } from "@reclaimprotocol/js-sdk";

/**
 * Message format for chat APIs
 */
export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Verification result
 */
export interface VerificationResult {
  /** Whether the proof is valid */
  isValid: boolean;
  /** The verified endpoint (origin) */
  verifiedEndpoint?: string;
  /** Error message if verification failed */
  error?: string;
}

/**
 * Configuration for the verifiable Claude client
 */
export interface VerifiableClaudeConfig {
  /** Anthropic API key */
  apiKey: string;
  /** Reclaim Protocol App ID (from dev.reclaimprotocol.org) */
  reclaimAppId: string;
  /** Reclaim Protocol App Secret */
  reclaimAppSecret: string;
  /** Optional: Override the Anthropic API endpoint */
  endpoint?: string;
}

/**
 * Supported Claude models
 */
export type ClaudeModel =
  | "claude-3-5-sonnet-20241022"
  | "claude-3-5-haiku-20241022"
  | "claude-3-opus-20240229"
  | "claude-3-sonnet-20240229"
  | "claude-3-haiku-20240307"
  | "claude-opus-4-5-20251101";

/**
 * Options for generating text with Claude
 */
export interface ClaudeGenerateOptions {
  /** The model to use */
  model?: ClaudeModel;
  /** Messages to send (for multi-turn conversations) */
  messages?: Message[];
  /** Single prompt (convenience for single-turn) */
  prompt?: string;
  /** System prompt */
  system?: string;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature (0-1) */
  temperature?: number;
  /** Stop sequences */
  stopSequences?: string[];
}

/**
 * Result from a verifiable Claude inference call
 */
export interface VerifiableClaudeResult {
  /** The generated text response */
  text: string;
  /** The cryptographic proof from Reclaim Protocol */
  proof: Proof;
  /** Timestamp of generation */
  timestamp: number;
  /** The model used */
  model: ClaudeModel;
  /** Verification provider */
  provider: "reclaim";
  /** Raw API response (for debugging) */
  rawResponse?: unknown;
}

/**
 * Serialized proof for storage/transmission
 */
export interface SerializedClaudeProof {
  /** The proof data as JSON string */
  proofJson: string;
  /** The response text */
  text: string;
  /** Timestamp */
  timestamp: number;
  /** Model used */
  model: ClaudeModel;
  /** Provider identifier */
  provider: "reclaim";
}

// Type aliases
export type VerifiableResult = VerifiableClaudeResult;
export type SerializedProof = SerializedClaudeProof;
export type GenerateOptions = ClaudeGenerateOptions;
