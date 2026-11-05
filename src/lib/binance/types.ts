export interface BinanceP2PRequest {
  fiat: string;
  page: number;
  rows: number;
  tradeType: 'BUY' | 'SELL';
  asset: string;
  countries: string[];
  proMerchantAds: boolean;
  shieldMerchantAds: boolean;
  filterType: string;
  periods: string[];
  additionalKycVerifyFilter: number;
  publisherType: string | null;
  payTypes: string[];
  classifies: string[];
}

export interface BinanceTradeMethod {
  payId: string;
  payMethodId: string;
  payType: string;
  payAccount: string;
  payBank: string;
  paySubBank: string;
  identifier: string;
  iconUrlColor: string;
  tradeMethodName: string;
}

export interface BinanceAdv {
  advNo: string;
  classify: string;
  tradeType: 'BUY' | 'SELL';
  asset: string;
  fiatUnit: string;
  price: string;
  initAmount: string;
  surplusAmount: string;
  maxSingleTransAmount: string;
  minSingleTransAmount: string;
  remarks: string;
  autoReplyMsg: string;
  payTimeLimit: number;
  tradeMethods: BinanceTradeMethod[];
}

export interface BinanceAdvertiser {
  userNo: string;
  realName: string;
  nickName: string;
  monthOrderCount: number;
  monthFinishRate: number;
  advConfirmTime: number;
  userType: string;
  userGrade: number;
  proMerchant: boolean;
  isBlocked: boolean;
}

export interface BinanceP2PItem {
  adv: BinanceAdv;
  advertiser: BinanceAdvertiser;
}

export interface BinanceP2PResponse {
  code: string;
  message: string;
  data: BinanceP2PItem[];
  total: number;
  success: boolean;
}

export interface OrderBookSummary {
  bestBuyPrice: number;
  bestSellPrice: number;
  spread: number;
  spreadPercent: number;
  midPrice: number;
  buyOrders: BinanceP2PItem[];
  sellOrders: BinanceP2PItem[];
  timestamp: string;
}

