# Dockerfile for running verifiable-inference with zkTLS
# The Reclaim zkFetch library requires Linux for Gnark ZK proofs

FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Run the demo
CMD ["npx", "tsx", "demo.ts"]
