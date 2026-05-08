import { Asset } from './orderbook';

export interface Edge {
  from: string;
  to: string;
  weight: number;   // negative log of exchange rate (for Dijkstra minimization)
  rate: number;
  path: Asset[];
}

export interface RouteResult {
  path: Asset[];
  rate: number;
  hops: number;
}

type Graph = Map<string, Edge[]>;

function assetKey(a: Asset): string {
  return a.issuer ? `${a.code}:${a.issuer}` : 'XLM';
}

export function buildGraph(edges: Edge[]): Graph {
  const graph: Graph = new Map();
  for (const edge of edges) {
    if (!graph.has(edge.from)) graph.set(edge.from, []);
    graph.get(edge.from)!.push(edge);
  }
  return graph;
}

export function dijkstra(graph: Graph, source: Asset, dest: Asset): RouteResult | null {
  const srcKey = assetKey(source);
  const dstKey = assetKey(dest);

  const dist = new Map<string, number>();
  const prev = new Map<string, { node: string; edge: Edge } | null>();
  const visited = new Set<string>();

  dist.set(srcKey, 0);
  prev.set(srcKey, null);

  const queue: Array<{ key: string; cost: number }> = [{ key: srcKey, cost: 0 }];

  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const { key: current } = queue.shift()!;

    if (visited.has(current)) continue;
    visited.add(current);

    if (current === dstKey) break;

    for (const edge of graph.get(current) ?? []) {
      const newCost = (dist.get(current) ?? Infinity) + edge.weight;
      if (newCost < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, newCost);
        prev.set(edge.to, { node: current, edge });
        queue.push({ key: edge.to, cost: newCost });
      }
    }
  }

  if (!dist.has(dstKey)) return null;

  // Reconstruct path
  const pathAssets: Asset[] = [];
  let cur: string | null = dstKey;
  let totalRate = 1;

  while (cur && prev.get(cur)) {
    const entry: { node: string; edge: Edge } = prev.get(cur)!;
    pathAssets.unshift(entry.edge.path[entry.edge.path.length - 1]);
    totalRate *= entry.edge.rate;
    cur = entry.node;
  }
  pathAssets.unshift(source);

  return { path: pathAssets, rate: totalRate, hops: pathAssets.length - 1 };
}

export function edgeFromRate(from: Asset, to: Asset, rate: number): Edge {
  return {
    from: assetKey(from),
    to: assetKey(to),
    weight: -Math.log(rate),
    rate,
    path: [from, to],
  };
}
