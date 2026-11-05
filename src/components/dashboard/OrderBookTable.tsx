'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatVES } from '@/lib/utils/currency';
import type { OrderBookSummary } from '@/lib/binance/types';

interface OrderBookTableProps {
  orderbook?: OrderBookSummary | null;
  isLoading?: boolean;
}

export function OrderBookTable({ orderbook, isLoading }: OrderBookTableProps) {
  const [tab, setTab] = useState<'BUY' | 'SELL'>('BUY');

  const orders = tab === 'BUY' ? orderbook?.buyOrders || [] : orderbook?.sellOrders || [];

  return (
    <Card className="flex flex-col h-[400px]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-600/60 pb-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Libro P2P Binance en Vivo</h3>
          <p className="text-xs text-muted">
            {orderbook?.bestBuyPrice ? `Compra: ${formatVES(orderbook.bestBuyPrice)} | Venta: ${formatVES(orderbook.bestSellPrice)} | Spread: ${orderbook.spreadPercent}%` : 'Conectando con Binance P2P...'}
          </p>
        </div>

        <div className="flex bg-surface-700 p-0.5 rounded-lg border border-surface-600">
          <button
            onClick={() => setTab('BUY')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              tab === 'BUY' ? 'bg-success text-black' : 'text-muted hover:text-white'
            }`}
          >
            Comprar USDT
          </button>
          <button
            onClick={() => setTab('SELL')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              tab === 'SELL' ? 'bg-danger text-white' : 'text-muted hover:text-white'
            }`}
          >
            Vender USDT
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 text-xs">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted">
            Actualizando libro de órdenes...
          </div>
        ) : orders.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted">
            No se encontraron anuncios activos para este filtro.
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="text-[11px] uppercase tracking-wider text-muted border-b border-surface-600 sticky top-0 bg-surface-800">
              <tr>
                <th className="py-2 font-medium">Comerciante</th>
                <th className="py-2 font-medium">Precio (VES)</th>
                <th className="py-2 font-medium">Disponible / Límites</th>
                <th className="py-2 font-medium">Métodos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              {orders.map((item, idx) => {
                const finishRate = (item.advertiser.monthFinishRate * 100).toFixed(1);
                const isVeryGood = item.advertiser.monthFinishRate >= 0.98;

                return (
                  <tr key={item.adv.advNo || idx} className="hover:bg-surface-700/40">
                    <td className="py-2.5">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <span className="truncate max-w-[120px]">{item.advertiser.nickName}</span>
                        {item.advertiser.proMerchant && (
                          <span className="text-[10px] bg-brand/20 text-brand px-1 rounded">PRO</span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted">
                        {item.advertiser.monthOrderCount} órdenes |{' '}
                        <span className={isVeryGood ? 'text-success font-medium' : 'text-muted'}>
                          {finishRate}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <span className={`font-bold text-sm ${tab === 'BUY' ? 'text-success' : 'text-danger'}`}>
                        {formatVES(parseFloat(item.adv.price))}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <div className="text-white font-medium">{item.adv.surplusAmount} USDT</div>
                      <div className="text-[10px] text-muted">
                        {item.adv.minSingleTransAmount} - {item.adv.maxSingleTransAmount} VES
                      </div>
                    </td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1 max-w-[150px]">
                        {item.adv.tradeMethods.slice(0, 2).map((m, mIdx) => (
                          <Badge key={mIdx} variant="neutral" className="text-[9px] py-0 px-1.5">
                            {m.tradeMethodName}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
