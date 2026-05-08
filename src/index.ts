import { fetchOrderbook, fetchPathPayments, Asset } from './orderbook';
import { analyzeLiquidity } from './liquidity';
import { buildGraph, dijkstra, edgeFromRate } from './graph';
import { splitOrder } from './splitter';
import { simulateRoute, SimulationResult } from './simulator';

export interface RouteRequest {
  sourceAsset: Asset;
  destAsset: Asset;
  amount: string;
  slippageTolerance?: number; // default 0.5%
}

export async function findBestRoute(req: RouteRequest): Promise<SimulationResult> {
  const { sourceAsset, destAsset, amount, slippageTolerance = 0.005 } = req;
  const tradeAmount = parseFloat(amount);

  // 1. Fetch orderbook for direct pair
  const orderbook = await fetchOrderbook(sourceAsset, destAsset);
  const liquidity = analyzeLiquidity(orderbook, tradeAmount);

  // 2. Fetch Horizon path payments to discover intermediate routes
  const horizonPaths = await fetchPathPayments(sourceAsset, destAsset, amount).catch(() => []);

  // 3. Build graph from discovered paths
  const edges = horizonPaths.map((p: any) => {
    const srcAmount = parseFloat(p.source_amount);
    const dstAmount = parseFloat(p.destination_amount);
    const rate = dstAmount / srcAmount;
    return edgeFromRate(sourceAsset, destAsset, rate);
  });

  // Add direct pair edge
  if (liquidity.bestAsk > 0) {
    edges.push(edgeFromRate(sourceAsset, destAsset, 1 / liquidity.bestAsk));
  }

  const graph = buildGraph(edges);
  const bestPath = dijkstra(graph, sourceAsset, destAsset);

  // 4. Build route candidates for splitter
  const routeCandidates = horizonPaths.slice(0, 3).map((p: any) => {
    const srcAmount = parseFloat(p.source_amount);
    const dstAmount = parseFloat(p.destination_amount);
    const rate = dstAmount / srcAmount;
    const pathAssets: Asset[] = [sourceAsset, destAsset]; // simplified; full path from Horizon
    return { path: pathAssets, liquidity, rate };
  });

  if (!routeCandidates.length) {
    // Fallback: direct route
    routeCandidates.push({
      path: [sourceAsset, destAsset],
      liquidity,
      rate: bestPath?.rate ?? (1 / liquidity.bestAsk),
    });
  }

  // 5. Split order across routes
  const split = splitOrder(routeCandidates, tradeAmount, slippageTolerance);

  // 6. Simulate
  return simulateRoute(sourceAsset, destAsset, amount, split);
}

// CLI demo
async function main() {
  const USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

  const result = await findBestRoute({
    sourceAsset: { code: 'XLM' },
    destAsset: { code: 'USDC', issuer: USDC_ISSUER },
    amount: '1000',
    slippageTolerance: 0.005,
  });

  console.log('\n=== StellarRoute Result ===');
  console.log(`Input:           ${result.inputAmount} ${result.sourceAsset.code}`);
  console.log(`Expected output: ${result.expectedOutput} ${result.destAsset.code}`);
  console.log(`Worst case:      ${result.worstCaseOutput} ${result.destAsset.code}`);
  console.log(`Total fees:      ${result.totalFeeStoops} stroops`);
  console.log('\nRoutes:');
  result.routes.forEach((r, i) => {
    console.log(`  [${i + 1}] ${r.path.join(' → ')}  ${r.fraction}%  →  ${r.output}`);
  });
}

main().catch(console.error);
