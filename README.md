# Verifiable AI Inference

**Cryptographic proof that AI responses are real.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> In a world of AI agents, proof is everything.

## The Problem

AI agents are everywhere—posting on social media, trading crypto, giving advice. But how do you know it's actually AI?

- Someone could claim their bot uses GPT-4, but have humans writing responses
- An AI agent could claim autonomous trading, but humans could be pulling strings
- There's no way to verify. You just have to **trust them**

This already happened. A popular AI agent got accused of having human moderators. They had to leak internal logs to prove autonomy. **That's not a solution.**

## The Solution

**Verifiable Inference** uses zkTLS (zero-knowledge proofs for TLS) to cryptographically prove that AI responses genuinely came from the AI provider.

```typescript
import { createVerifiableClaude } from 'verifiable-inference';

const client = createVerifiableClaude({
  apiKey: process.env.ANTHROPIC_API_KEY,
  reclaimAppId: process.env.RECLAIM_APP_ID,
  reclaimAppSecret: process.env.RECLAIM_APP_SECRET,
});

// Get response WITH cryptographic proof
const result = await client.chat("What is the capital of France?");

console.log(result.text);   // "Paris is the capital of France."
console.log(result.proof);  // Cryptographic proof (2-3KB)

// Anyone can verify - no API keys needed
const verification = await client.verify(result);
console.log(verification.isValid); // true
```

## What This Proves

1. **Origin** - The request actually went to `api.anthropic.com`
2. **Integrity** - The response wasn't modified in transit
3. **Authenticity** - This is exactly what the AI returned

## Features

- **Drop-in replacement** - Works with existing Claude/Anthropic code
- **Zero-knowledge** - API keys stay private, proofs are public
- **Third-party verifiable** - Anyone can verify without trusting you
- **Multiple providers** - Claude (zkTLS) + EigenAI (deterministic)

## Quick Start

### 1. Install

```bash
npm install
```

### 2. Configure

```bash
cp .env.example .env
```

Edit `.env` with your credentials:
- **Anthropic API Key**: [console.anthropic.com](https://console.anthropic.com/)
- **Reclaim Credentials**: [dev.reclaimprotocol.org](https://dev.reclaimprotocol.org/new-application)

### 3. Run Demo

```bash
# Terminal demo
npm run demo

# Web UI demo
npm run demo:ui
# Open http://localhost:3000
```

## API Reference

### VerifiableClaude

```typescript
import { createVerifiableClaude } from './src';

const client = createVerifiableClaude({
  apiKey: string,           // Anthropic API key
  reclaimAppId: string,     // Reclaim App ID
  reclaimAppSecret: string, // Reclaim App Secret
});

// Generate with proof
const result = await client.generate({
  prompt: "Hello",           // or use messages[]
  model: "claude-3-5-sonnet-20241022",
  maxTokens: 1024,
});

// Verify proof
const verification = await client.verify(result);

// Serialize for storage/sharing
const serialized = client.serializeResult(result);

// Third-party verification (static method)
const isValid = await VerifiableClaude.verifySerializedProof(serialized);
```

### VerifiableEigenAI

```typescript
import { createVerifiableEigenAI } from './src';

const client = createVerifiableEigenAI({
  apiKey: string, // EigenAI API key
});

// Deterministic inference with seed
const result = await client.chat("Hello", { seed: 42 });

// Verify by re-execution
const verification = await client.verify(result);
// Anyone can re-run with same seed to verify
```

## How It Works

### zkTLS (Reclaim Protocol)

```
┌─────────┐     ┌─────────────┐     ┌──────────────┐
│ Your    │────▶│ Reclaim     │────▶│ Anthropic    │
│ App     │     │ zkTLS Proxy │     │ API          │
└─────────┘     └─────────────┘     └──────────────┘
                      │
                      ▼
              ┌──────────────┐
              │ ZK Proof     │
              │ - Origin     │
              │ - Integrity  │
              └──────────────┘
```

1. Request goes through Reclaim's zkTLS proxy
2. Proxy generates zero-knowledge proof of the TLS session
3. Proof cryptographically binds request → response
4. Anyone can verify the proof without seeing the API key

### EigenAI (Deterministic)

1. Request includes a `seed` parameter
2. EigenAI returns deterministic output for that seed
3. Verification = re-run with same seed, check output matches
4. Built on EigenLayer for cryptoeconomic security

## Project Structure

```
verifiable-inference/
├── src/
│   ├── index.ts      # VerifiableClaude (zkTLS)
│   ├── eigenai.ts    # VerifiableEigenAI (deterministic)
│   └── types.ts      # TypeScript interfaces
├── demo.ts           # Terminal demo
├── demo-ui.html      # Web UI demo
├── server.ts         # Demo server
├── example.ts        # Usage examples
└── example-eigenai.ts
```

## Verification Methods Compared

| Aspect | Claude + Reclaim | EigenAI |
|--------|------------------|---------|
| **Proves** | Response came from Anthropic | Output is reproducible |
| **Verification** | ZK proof verification | Re-execution |
| **Models** | Claude 3.5, Claude 3, etc. | gpt-oss-120b, Qwen3-32B |
| **Latency** | +1-2s (proof generation) | Same as normal |
| **Third-party verify** | Check ZK proof | Re-run inference |

## Use Cases

- **AI Agents** - Prove your bot actually uses the AI you claim
- **Content Authentication** - Verify AI-generated content is real
- **Autonomous Systems** - Prove no human intervention
- **Compliance** - Auditable AI decision trails
- **Trust Marketplaces** - Verifiable AI services

## Contributing

Contributions welcome! Please read our contributing guidelines.

```bash
# Run tests
npm test

# Build
npm run build
```

## Security

- **Never commit `.env`** - It's in `.gitignore`
- **API keys are redacted** from proofs - Safe to share proofs publicly
- **Proofs are self-contained** - Verifiable without any secrets

Report security issues to: [security contact]

## Credits

- [Reclaim Protocol](https://reclaimprotocol.org/) - zkTLS infrastructure
- [EigenLayer](https://eigenlayer.xyz/) - Restaking & AVS platform
- [EigenCloud](https://eigencloud.xyz/) - Verifiable AI infrastructure
- [Anthropic](https://anthropic.com/) - Claude AI

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Built for a world where AI authenticity matters.**
