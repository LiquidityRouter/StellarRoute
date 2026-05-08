import axios from 'axios';

export interface Asset {
  code: string;
  issuer?: string; // undefined = XLM (native)
}

export interface OrderbookLevel {
  price: number;
  amount: number;
}

export interface Orderbook {
  base: Asset;
  counter: Asset;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
}

const HORIZON = 'https://horizon.stellar.org';

function assetParam(asset: Asset): string {
  return asset.issuer
    ? `${asset.code}:${asset.issuer}`
    : 'native';
}

export async function fetchOrderbook(base: Asset, counter: Asset, limit = 20): Promise<Orderbook> {
  const url = `${HORIZON}/order_book`;
  const params = {
    selling_asset_type: base.issuer ? 'credit_alphanum4' : 'native',
    selling_asset_code: base.issuer ? base.code : undefined,
    selling_asset_issuer: base.issuer,
    buying_asset_type: counter.issuer ? 'credit_alphanum4' : 'native',
    buying_asset_code: counter.issuer ? counter.code : undefined,
    buying_asset_issuer: counter.issuer,
    limit,
  };

  const { data } = await axios.get(url, { params });

  return {
    base,
    counter,
    bids: data.bids.map((b: any) => ({ price: parseFloat(b.price), amount: parseFloat(b.amount) })),
    asks: data.asks.map((a: any) => ({ price: parseFloat(a.price), amount: parseFloat(a.amount) })),
  };
}

export async function fetchPathPayments(
  sourceAsset: Asset,
  destAsset: Asset,
  amount: string
): Promise<any[]> {
  const url = `${HORIZON}/paths/strict-receive`;
  const params = {
    source_assets: assetParam(sourceAsset),
    destination_asset_type: destAsset.issuer ? 'credit_alphanum4' : 'native',
    destination_asset_code: destAsset.issuer ? destAsset.code : undefined,
    destination_asset_issuer: destAsset.issuer,
    destination_amount: amount,
  };

  const { data } = await axios.get(url, { params });
  return data._embedded?.records ?? [];
}
