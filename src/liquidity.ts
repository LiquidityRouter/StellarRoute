import { Orderbook, OrderbookLevel } from './orderbook';

export interface LiquidityInfo {
  bestBid: number;
  bestAsk: number;
  spread: number;
  spreadPct: number;
  depth: number;       // total available liquidity (ask side)
  slippage: number;    // estimated slippage for given amount
}

export function analyzeLiquidity(orderbook: Orderbook, tradeAmount: number): LiquidityInfo {
  const { bids, asks } = orderbook;

  if (!bids.length || !asks.length) {
    return { bestBid: 0, bestAsk: 0, spread: 0, spreadPct: 0, depth: 0, slippage: 0 };
  }

  const bestBid = bids[0].price;
  const bestAsk = asks[0].price;
  const spread = bestAsk - bestBid;
  const spreadPct = spread / bestAsk;

  const depth = asks.reduce((sum, l) => sum + l.amount, 0);
  const slippage = estimateSlippage(asks, tradeAmount);

  return { bestBid, bestAsk, spread, spreadPct, depth, slippage };
}

function estimateSlippage(asks: OrderbookLevel[], amount: number): number {
  let remaining = amount;
  let totalCost = 0;

  for (const level of asks) {
    if (remaining <= 0) break;
    const filled = Math.min(remaining, level.amount);
    totalCost += filled * level.price;
    remaining -= filled;
  }

  if (remaining > 0) return 1; // not enough liquidity

  const idealCost = amount * asks[0].price;
  return (totalCost - idealCost) / idealCost;
}
