import { fetchPathPayments, Asset } from './orderbook';
import { SplitResult } from './splitter';

export interface SimulationResult {
  sourceAsset: Asset;
  destAsset: Asset;
  inputAmount: string;
  expectedOutput: string;
  worstCaseOutput: string;
  totalFeeStoops: number;
  routes: Array<{
    path: string[];
    fraction: number;
    output: string;
  }>;
}

export async function simulateRoute(
  sourceAsset: Asset,
  destAsset: Asset,
  amount: string,
  split: SplitResult
): Promise<SimulationResult> {
  // Fetch Horizon's own path payment estimate for comparison
  const horizonPaths = await fetchPathPayments(sourceAsset, destAsset, amount).catch(() => []);
  const horizonBest = horizonPaths[0]?.source_amount ?? null;

  const worstCaseOutput = split.totalOutput * (1 - split.weightedSlippage);

  return {
    sourceAsset,
    destAsset,
    inputAmount: amount,
    expectedOutput: split.totalOutput.toFixed(7),
    worstCaseOutput: worstCaseOutput.toFixed(7),
    totalFeeStoops: split.totalFee,
    routes: split.routes.map(r => ({
      path: r.path.map(a => (a.issuer ? `${a.code}:${a.issuer.slice(0, 8)}…` : a.code)),
      fraction: parseFloat((r.fraction * 100).toFixed(1)),
      output: r.estimatedOutput,
    })),
  };
}
