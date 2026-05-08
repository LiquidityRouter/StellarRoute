# StellarRoute

**Liquidity Routing & Path Optimization Engine for Stellar**

A routing engine that fetches orderbooks, analyzes liquidity, optimizes path payments, and splits transactions across multiple routes — similar to what DEX aggregators do in DeFi.

## Why it matters

Stellar has powerful path payments, but developer tooling around intelligent routing is still early. StellarRoute fills that gap.

## Core Features

- **Best-path discovery** — finds the optimal route between any two assets
- **Slippage estimation** — calculates expected slippage before execution
- **Multi-path execution** — splits large orders across multiple routes to minimize impact
- **Route simulation** — dry-run a trade to preview output amounts and fees
- **Fee optimization** — accounts for Stellar base fees across all hops

## Advanced Layer

- **Graph-based routing algorithm** — models the Stellar DEX as a weighted directed graph
- **Latency-aware execution** — orders routes by expected settlement speed
- **Anchor-aware routing** — respects anchor trust lines and asset issuers

## Architecture

```
src/
  orderbook.ts     # Fetches orderbooks from Stellar Horizon API
  liquidity.ts     # Analyzes liquidity depth and spread
  graph.ts         # Builds asset graph and runs Dijkstra/Bellman-Ford
  splitter.ts      # Splits orders across multiple paths with slippage/fee estimation
  simulator.ts     # Simulates route execution without submitting
  index.ts         # Main entry point
```

## Usage

```bash
npm install
npm run build
npm start
```

## Example

```ts
import { findBestRoute } from './src/index';

const result = await findBestRoute({
  sourceAsset: 'XLM',
  destAsset: 'USDC',
  amount: '1000',
  slippageTolerance: 0.005,
});

console.log(result);
```

## Requirements

- Node.js 18+
- Access to Stellar Horizon API (public: `https://horizon.stellar.org`)
