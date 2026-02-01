import type { Proof } from "@reclaimprotocol/js-sdk";

// ============================================
// Common Types
// ============================================

/**
 * Message format for chat APIs
 */
export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Base verification result
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
 * Verification provider type
 */
export type VerificationProvider = "reclaim" | "eigenai";

// ============================================
// Claude + Reclaim Types
// ============================================

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
 * Serialized Claude proof for storage/transmission
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

// ============================================
// EigenAI Types
// ============================================

/**
 * Configuration for the EigenAI client
 */
export interface EigenAIConfig {
  /** EigenAI API key */
  apiKey: string;
  /** Optional: Override the EigenAI API endpoint */
  endpoint?: string;
}

/**
 * Supported EigenAI models
 */
export type EigenAIModel =
  | "gpt-oss-120b-f16"
  | "qwen3-32b";

/**
 * Options for generating text with EigenAI
 */
export interface EigenAIGenerateOptions {
  /** The model to use */
  model?: EigenAIModel;
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
  /** Seed for deterministic inference (required for re-execution verification) */
  seed?: number;
  /** Stop sequences */
  stop?: string[];
}

/**
 * EigenAI attestation/signature data
 */
export interface EigenAIAttestation {
  /** The seed used for deterministic inference */
  seed: number;
  /** Model identifier */
  model: EigenAIModel;
  /** Request hash or identifier */
  requestId?: string;
  /** Operator signatures (if available) */
  signatures?: string[];
  /** Full request parameters for re-execution */
  requestParams: {
    messages: Message[];
    temperature?: number;
    maxTokens?: number;
  };
}

/**
 * Result from an EigenAI inference call
 */
export interface EigenAIResult {
  /** The generated text response */
  text: string;
  /** Attestation data for verification */
  attestation: EigenAIAttestation;
  /** Timestamp of generation */
  timestamp: number;
  /** The model used */
  model: EigenAIModel;
  /** Verification provider */
  provider: "eigenai";
  /** Raw API response (for debugging) */
  rawResponse?: unknown;
}

/**
 * Serialized EigenAI result for storage/transmission
 */
export interface SerializedEigenAIProof {
  /** The attestation data as JSON string */
  attestationJson: string;
  /** The response text */
  text: string;
  /** Timestamp */
  timestamp: number;
  /** Model used */
  model: EigenAIModel;
  /** Provider identifier */
  provider: "eigenai";
}

/**
 * EigenAI verification result with re-execution details
 */
export interface EigenAIVerificationResult extends VerificationResult {
  /** Whether re-execution produced matching output */
  outputMatches?: boolean;
  /** The re-executed output (for comparison) */
  reExecutedOutput?: string;
}

// ============================================
// Unified Types (for multi-provider support)
// ============================================

/**
 * Union of all verifiable results
 */
export type VerifiableResult = VerifiableClaudeResult | EigenAIResult;

/**
 * Union of all serialized proofs
 */
export type SerializedProof = SerializedClaudeProof | SerializedEigenAIProof;

/**
 * Type guard to check if result is from Claude
 */
export function isClaudeResult(result: VerifiableResult): result is VerifiableClaudeResult {
  return result.provider === "reclaim";
}

/**
 * Type guard to check if result is from EigenAI
 */
export function isEigenAIResult(result: VerifiableResult): result is EigenAIResult {
  return result.provider === "eigenai";
}

// Legacy type aliases for backwards compatibility
export type GenerateOptions = ClaudeGenerateOptions;
