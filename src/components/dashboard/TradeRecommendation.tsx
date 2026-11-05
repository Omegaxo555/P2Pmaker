'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatVES } from '@/lib/utils/currency';
import type { RecomendacionMercadoAPI } from '@/types/analytics';

interface TradeRecommendationProps {
  recommendation?: RecomendacionMercadoAPI | null;
}

export function TradeRecommendation({ recommendation }: TradeRecommendationProps) {
  const rec = recommendation;

  return (
    <Card className="border-brand/40 bg-gradient-to-br from-surface-800 via-surface-800 to-brand/5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-600/70 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Variables de Mercado Externas (Binance API en Vivo)
          </h3>
        </div>
        <Badge variant="warning" className="text-[10px] px-2 py-0.5">
          Memoria Volátil • Requiere Confirmación
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4">
        <div>
          <span className="text-xs text-muted block mb-1">Tasa Compra Sugerida (Maker)</span>
          <span className="text-xl font-bold text-success">
            {rec?.tasa_compra_sugerida ? formatVES(rec.tasa_compra_sugerida) : '---'}
          </span>
          <span className="text-[10px] text-muted block mt-0.5">Basado en el libro P2P actual</span>
        </div>

        <div>
          <span className="text-xs text-muted block mb-1">Tasa Venta Sugerida (Maker)</span>
          <span className="text-xl font-bold text-danger">
            {rec?.tasa_venta_sugerida ? formatVES(rec.tasa_venta_sugerida) : '---'}
          </span>
          <span className="text-[10px] text-muted block mt-0.5">Profundidad en tiempo real</span>
        </div>

        <div>
          <span className="text-xs text-muted block mb-1">Spread Teórico Estimado</span>
          <span className="text-xl font-bold text-brand">
            {rec?.spread_teorico_porc !== undefined ? `+${rec.spread_teorico_porc.toFixed(2)}%` : '---'}
          </span>
          <span className="text-[10px] text-muted block mt-0.5">Antes de comisiones de 0.25%</span>
        </div>
      </div>

      <div className="bg-surface-700/60 rounded-lg p-3 border border-surface-600 text-xs text-slate-300 leading-relaxed">
        <strong className="text-brand">Principio de Transparencia de Fuentes: </strong>
        Estos precios son variables externas y volátiles de la API. No son ganancias garantizadas ni se incorporan a tu contabilidad real hasta que ejecutes y confirmes la orden mediante el evento <code className="bg-surface-900 px-1 py-0.5 rounded text-white font-mono">EXECUTE_ORDER</code>.
      </div>
    </Card>
  );
}
