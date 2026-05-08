import { Asset } from './orderbook';
import { LiquidityInfo } from './liquidity';

export interface SplitRoute {
  path: Asset[];
  fraction: number;   // 0–1
  amount: string;
  estimatedOutput: string;
  slippage: number;
  fee: number;        // in XLM stroops
}

export interface SplitResult {
  routes: SplitRoute[];
  totalOutput: number;
  totalFee: number;
  weightedSlippage: number;
}

const BASE_FEE_STROOPS = 100; // per operation

export function splitOrder(
  routes: Array<{ path: Asset[]; liquidity: LiquidityInfo; rate: number }>,
  totalAmount: number,
  slippageTolerance: number
): SplitResult {
  // Filter routes within slippage tolerance
  const viable = routes.filter(r => r.liquidity.slippage <= slippageTolerance);
  if (!viable.length) throw new Error('No viable routes within slippage tolerance');

  // Weight by inverse slippage (lower slippage = more allocation)
  const weights = viable.map(r => 1 / (r.liquidity.slippage + 0.0001));
  const totalWeight = weights.reduce((s, w) => s + w, 0);

  const splitRoutes: SplitRoute[] = viable.map((r, i) => {
    const fraction = weights[i] / totalWeight;
    const amount = totalAmount * fraction;
    const output = amount * r.rate * (1 - r.liquidity.slippage);
    const hops = r.path.length - 1;
    const fee = hops * BASE_FEE_STROOPS;

    return {
      path: r.path,
      fraction,
      amount: amount.toFixed(7),
      estimatedOutput: output.toFixed(7),
      slippage: r.liquidity.slippage,
      fee,
    };
  });

  const totalOutput = splitRoutes.reduce((s, r) => s + parseFloat(r.estimatedOutput), 0);
  const totalFee = splitRoutes.reduce((s, r) => s + r.fee, 0);
  const weightedSlippage = splitRoutes.reduce((s, r) => s + r.slippage * r.fraction, 0);

  return { routes: splitRoutes, totalOutput, totalFee, weightedSlippage };
}
