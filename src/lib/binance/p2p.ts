import axios from 'axios';
import type {
  BinanceP2PRequest,
  BinanceP2PResponse,
  BinanceP2PItem,
  OrderBookSummary,
  PaymentMethodMarketRange,
} from './types';

const BINANCE_P2P_URL = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Origin': 'https://p2p.binance.com',
  'Referer': 'https://p2p.binance.com/es',
  'clienttype': 'web',
};

export async function fetchBinanceP2P(
  tradeType: 'BUY' | 'SELL',
  payTypes: string[] = [],
  rows = 10,
  fiat = 'VES',
  asset = 'USDT'
): Promise<BinanceP2PItem[]> {
  const payload: BinanceP2PRequest = {
    fiat,
    page: 1,
    rows,
    tradeType,
    asset,
    countries: [],
    proMerchantAds: false,
    shieldMerchantAds: false,
    filterType: 'all',
    periods: [],
    additionalKycVerifyFilter: 0,
    publisherType: null,
    payTypes,
    classifies: ['mass', 'profession'],
  };

  try {
    const res = await axios.post<BinanceP2PResponse>(BINANCE_P2P_URL, payload, {
      headers: DEFAULT_HEADERS,
      timeout: 8000,
    });

    if (res.data && res.data.success && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    return [];
  } catch (error) {
    console.error(`[BinanceP2P] Error fetching ${tradeType} for ${asset}/${fiat}:`, error);
    throw new Error(`No se pudo consultar el mercado P2P de Binance (${tradeType} ${asset}/${fiat})`, {
      cause: error,
    });
  }
}

export async function getBinanceP2POrderBook(
  payTypes: string[] = [],
  fiat = 'VES',
  asset = 'USDT'
): Promise<OrderBookSummary> {
  const [buyOrders, sellOrders] = await Promise.all([
    fetchBinanceP2P('BUY', payTypes, 50, fiat, asset),
    fetchBinanceP2P('SELL', payTypes, 50, fiat, asset),
  ]);

  const bestBuyPrice = buyOrders.length > 0 ? parseFloat(buyOrders[0].adv.price) : 0;
  const bestSellPrice = sellOrders.length > 0 ? parseFloat(sellOrders[0].adv.price) : 0;
  const spread = bestSellPrice > 0 && bestBuyPrice > 0 ? bestSellPrice - bestBuyPrice : 0;
  const spreadPercent = bestBuyPrice > 0 ? (spread / bestBuyPrice) * 100 : 0;
  const midPrice = bestBuyPrice > 0 && bestSellPrice > 0 ? (bestBuyPrice + bestSellPrice) / 2 : 0;
  const methods = new Map<string, PaymentMethodMarketRange>();

  const addMethods = (orders: BinanceP2PItem[], side: 'buy' | 'sell') => {
    for (const order of orders) {
      const min = Number(order.adv.minSingleTransAmount);
      const max = Number(order.adv.maxSingleTransAmount);
      for (const method of order.adv.tradeMethods) {
        const range = methods.get(method.tradeMethodName) || {
          name: method.tradeMethodName,
          buy: { min: null, max: null, ads: 0 },
          sell: { min: null, max: null, ads: 0 },
          totalAds: 0,
        };
        const sideRange = range[side];
        sideRange.min = sideRange.min === null ? min : Math.min(sideRange.min, min);
        sideRange.max = sideRange.max === null ? max : Math.max(sideRange.max, max);
        sideRange.ads += 1;
        range.totalAds += 1;
        methods.set(method.tradeMethodName, range);
      }
    }
  };

  addMethods(buyOrders, 'buy');
  addMethods(sellOrders, 'sell');

  return {
    bestBuyPrice,
    bestSellPrice,
    spread: Number(spread.toFixed(2)),
    spreadPercent: Number(spreadPercent.toFixed(2)),
    midPrice: Number(midPrice.toFixed(2)),
    buyOrders,
    sellOrders,
    paymentMethods: Array.from(methods.values()).sort((a, b) => a.name.localeCompare(b.name)),
    timestamp: new Date().toISOString(),
  };
}
