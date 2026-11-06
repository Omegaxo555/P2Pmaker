import { NextRequest, NextResponse } from 'next/server';
import { getBinanceP2POrderBook } from '@/lib/binance/p2p';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fiat = searchParams.get('fiat') || 'VES';
    const asset = searchParams.get('asset') || 'USDT';
    const payTypesParam = searchParams.get('payTypes');
    const payTypes = payTypesParam ? payTypesParam.split(',') : [];

    const orderbook = await getBinanceP2POrderBook(payTypes, fiat, asset);
    return NextResponse.json(orderbook);
  } catch (error: any) {
    console.error('[Binance orderbook API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error consultando orderbook de Binance' },
      { status: 500 }
    );
  }
}
