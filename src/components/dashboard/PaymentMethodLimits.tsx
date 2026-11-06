'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { formatVES } from '@/lib/utils/currency';
import type { PaymentMethodMarketRange } from '@/lib/binance/types';

interface PaymentMethodLimitsProps {
  methods: PaymentMethodMarketRange[];
  updatedAt?: string;
}

export function PaymentMethodLimits({ methods, updatedAt }: PaymentMethodLimitsProps) {
  return (
    <Card className="border-surface-600 bg-surface-800">
      <div className="mb-4 border-b border-surface-600/70 pb-3">
        <h2 className="text-sm font-bold text-white">Métodos y rangos de anuncios P2P</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          VES por operación, observado en anuncios públicos de Binance P2P para USDT/VES. No son límites
          bancarios ni límites universales de Binance: cada anunciante fija sus importes y estos cambian
          continuamente.
        </p>
        {updatedAt && (
          <p className="mt-1 text-[10px] text-muted">
            Consulta: {new Date(updatedAt).toLocaleString('es-VE')}
          </p>
        )}
      </div>

      {methods.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted">Binance no devolvió métodos para los anuncios consultados.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {methods.map((method) => (
            <article key={method.name} className="rounded-lg border border-surface-700 bg-surface-900/80 p-3">
              <h3 className="mb-2 truncate text-xs font-bold text-white" title={method.name}>{method.name}</h3>
              {(['buy', 'sell'] as const).map((side) => {
                const range = method[side];
                return (
                  <div key={side} className="flex items-center justify-between gap-2 border-t border-surface-700 py-2 first:border-0">
                    <div className="text-[10px] text-muted">{side === 'buy' ? 'Comprar USDT' : 'Vender USDT'}</div>
                    <div className="text-right">
                      <div className="text-[11px] font-semibold text-slate-200">
                        {range.ads
                          ? `${formatVES(range.min ?? 0)} – ${formatVES(range.max ?? 0)}`
                          : 'Sin anuncios observados'}
                      </div>
                      {!!range.ads && <div className="text-[9px] text-muted">{range.ads} anuncios</div>}
                    </div>
                  </div>
                );
              })}
            </article>
          ))}
        </div>
      )}
      <p className="mt-3 text-[10px] text-muted">
        El rango resume mínimos y máximos publicados entre los anuncios consultados; verifica siempre el anuncio concreto antes de operar.
      </p>
    </Card>
  );
}
