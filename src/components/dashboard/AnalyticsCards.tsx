'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { formatUSDT, formatPercent } from '@/lib/utils/currency';
import type { Analytics } from '@/types/analytics';

interface AnalyticsCardsProps {
  analytics?: Analytics | null;
}

export function AnalyticsCards({ analytics }: AnalyticsCardsProps) {
  const data: Analytics = analytics || {
    capital_inicial_usdt: 1000,
    ganancia_acumulada_usdt: 42.5,
    vueltas_completadas: 6,
    spread_promedio_porc: 1.85,
  };

  const roas = data.capital_inicial_usdt > 0
    ? ((data.ganancia_acumulada_usdt / data.capital_inicial_usdt) * 100).toFixed(2)
    : '0.00';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Capital Inicial */}
      <Card className="flex flex-col justify-between">
        <span className="text-xs uppercase tracking-wider text-muted font-medium">
          Capital Inicial
        </span>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-white tracking-tight">
            {formatUSDT(data.capital_inicial_usdt)}
          </span>
          <span className="text-xs text-muted">Base</span>
        </div>
      </Card>

      {/* Ganancia Acumulada */}
      <Card className="flex flex-col justify-between border-success/30 bg-gradient-to-br from-surface-800 to-success/5">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted font-medium">
            Ganancia Acumulada
          </span>
          <span className="text-xs font-semibold text-success">
            +{roas}% ROAS
          </span>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-success tracking-tight">
            +{formatUSDT(data.ganancia_acumulada_usdt)}
          </span>
          <span className="text-xs text-success/80">Neto</span>
        </div>
      </Card>

      {/* Vueltas Completadas */}
      <Card className="flex flex-col justify-between">
        <span className="text-xs uppercase tracking-wider text-muted font-medium">
          Vueltas (Ciclos Maker)
        </span>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-brand tracking-tight">
            {data.vueltas_completadas}
          </span>
          <span className="text-xs text-muted">Completadas</span>
        </div>
      </Card>

      {/* Spread Promedio */}
      <Card className="flex flex-col justify-between">
        <span className="text-xs uppercase tracking-wider text-muted font-medium">
          Spread Promedio
        </span>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-white tracking-tight">
            {formatPercent(data.spread_promedio_porc)}
          </span>
          <span className="text-xs text-muted">Por ciclo</span>
        </div>
      </Card>
    </div>
  );
}

