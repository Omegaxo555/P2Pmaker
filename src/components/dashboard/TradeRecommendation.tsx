'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatVES } from '@/lib/utils/currency';
import type { SugerenciaMaker } from '@/types/analytics';

interface TradeRecommendationProps {
  recommendation?: SugerenciaMaker | null;
}

export function TradeRecommendation({ recommendation }: TradeRecommendationProps) {
  const rec = recommendation;

  return (
    <Card className="border-brand/40 bg-gradient-to-br from-surface-800 via-surface-800 to-brand/5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-600/70 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Sugerencia Maker (Profundidad API Binance)
          </h3>
        </div>
        {rec?.alerta_limite_banco && (
          <Badge variant="danger" className="text-[10px] px-2 py-0.5 animate-pulse">
            ⚠️ Alerta: Límite Bancario Crítico
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4">
        <div>
          <span className="text-xs text-muted block mb-1">Tasa Compra Sugerida (Maker)</span>
          <span className="text-xl font-bold text-success">
            {rec?.tasa_compra ? formatVES(rec.tasa_compra) : '---'}
          </span>
          <span className="text-[10px] text-muted block mt-0.5">Precio óptimo de compra</span>
        </div>

        <div>
          <span className="text-xs text-muted block mb-1">Tasa Venta Sugerida (Maker)</span>
          <span className="text-xl font-bold text-danger">
            {rec?.tasa_venta ? formatVES(rec.tasa_venta) : '---'}
          </span>
          <span className="text-[10px] text-muted block mt-0.5">Precio óptimo de venta</span>
        </div>

        <div>
          <span className="text-xs text-muted block mb-1">Margen Neto Estimado</span>
          <span className="text-xl font-bold text-brand">
            {rec?.margen_neto_estimado_porc !== undefined ? `+${rec.margen_neto_estimado_porc.toFixed(2)}%` : '---'}
          </span>
          <span className="text-[10px] text-muted block mt-0.5">Spread competitivo Maker</span>
        </div>
      </div>

      <div className="bg-surface-700/60 rounded-lg p-3 border border-surface-600 text-xs text-slate-300 leading-relaxed">
        <strong className="text-brand">Capa de Mercado Separada: </strong>
        Los precios arriba indicados provienen de la profundidad del orderbook de Binance y no alteran la contabilidad del usuario hasta la ejecución y confirmación de la orden en el grafo.
      </div>
    </Card>
  );
}
