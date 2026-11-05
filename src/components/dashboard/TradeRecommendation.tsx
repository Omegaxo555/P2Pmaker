'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatVES, formatPercent } from '@/lib/utils/currency';
import type { RecomendacionTrade } from '@/types/analytics';

interface TradeRecommendationProps {
  recommendation?: RecomendacionTrade | null;
}

export function TradeRecommendation({ recommendation }: TradeRecommendationProps) {
  const rec: RecomendacionTrade = recommendation || {
    accion_sugerida: 'COMPRAR_MAKER',
    tasa_sugerida: 994.5,
    metodo_pago_optimo: 'Pago Movil - Banesco',
    margen_neto_estimado_porc: 1.42,
    razon_tactica:
      'Spread favorable del 1.85% entre compra/venta. Pago Móvil Banesco cuenta con 95% de éxito histórico en tu grafo y 38,000 VES de cupo disponible.',
  };

  const badgeVariant =
    rec.accion_sugerida === 'COMPRAR_MAKER'
      ? 'success'
      : rec.accion_sugerida === 'VENDER_MAKER'
      ? 'danger'
      : 'warning';

  return (
    <Card className="border-brand/40 bg-gradient-to-br from-surface-800 via-surface-800 to-brand/5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-600/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Recomendación Táctica Actual
          </h3>
        </div>
        <Badge variant={badgeVariant} className="text-xs px-3 py-1">
          {rec.accion_sugerida.replace('_', ' ')}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4">
        <div>
          <span className="text-xs text-muted block mb-1">Tasa Sugerida (Maker)</span>
          <span className="text-xl font-bold text-white">
            {formatVES(rec.tasa_sugerida)}
          </span>
        </div>

        <div>
          <span className="text-xs text-muted block mb-1">Método de Pago Óptimo</span>
          <span className="text-sm font-semibold text-brand block truncate">
            {rec.metodo_pago_optimo}
          </span>
        </div>

        <div>
          <span className="text-xs text-muted block mb-1">Margen Neto Estimado</span>
          <span className="text-xl font-bold text-success">
            {formatPercent(rec.margen_neto_estimado_porc)}
          </span>
        </div>
      </div>

      <div className="bg-surface-700/60 rounded-lg p-3 border border-surface-600 text-xs text-slate-300 leading-relaxed">
        <strong className="text-brand">Razonamiento Táctico: </strong>
        {rec.razon_tactica}
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-400/90 font-medium">
        <span>🛡️ Protocolo Titular a Titular:</span>
        <span className="text-muted">Rechaza de inmediato cualquier transferencia proveniente de terceros.</span>
      </div>
    </Card>
  );
}
