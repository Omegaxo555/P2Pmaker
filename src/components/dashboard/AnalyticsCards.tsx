'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { formatUSDT, formatVES } from '@/lib/utils/currency';
import type { ControlFinanciero } from '@/types/analytics';

interface AnalyticsCardsProps {
  control?: ControlFinanciero | null;
}

export function AnalyticsCards({ control }: AnalyticsCardsProps) {
  const data: ControlFinanciero = control || {
    capital_actual_usdt: 1000,
    ganancia_neta_real_ves: 0,
    ganancia_neta_real_usdt: 0,
    ordenes_completadas_hoy: 0,
  };

  const hayGanancia = data.ganancia_neta_real_usdt > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Capital Actual en USDT */}
      <Card className="flex flex-col justify-between">
        <span className="text-xs uppercase tracking-wider text-muted font-semibold">
          Capital Actual
        </span>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-white tracking-tight">
            {formatUSDT(data.capital_actual_usdt)}
          </span>
          <span className="text-xs text-muted">Base</span>
        </div>
      </Card>

      {/* Ganancia Neta Real Realizada (USDT) */}
      <Card
        className={`flex flex-col justify-between ${
          hayGanancia
            ? 'border-success/40 bg-gradient-to-br from-surface-800 to-success/10'
            : 'border-surface-600 bg-surface-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted font-semibold">
            Ganancia Neta Real (USDT)
          </span>
          <span className="text-[10px] bg-surface-700 px-1.5 py-0.5 rounded text-success font-bold">
            P&L Hoy
          </span>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span
            className={`text-2xl font-bold tracking-tight ${
              hayGanancia ? 'text-success' : 'text-slate-300'
            }`}
          >
            {data.ganancia_neta_real_usdt >= 0 ? '+' : ''}
            {formatUSDT(data.ganancia_neta_real_usdt)}
          </span>
          <span className="text-[10px] text-muted">Contabilidad Real</span>
        </div>
      </Card>

      {/* Ganancia Neta Real en VES */}
      <Card className="flex flex-col justify-between">
        <span className="text-xs uppercase tracking-wider text-muted font-semibold">
          Ganancia Neta Real (VES)
        </span>
        <div className="mt-2 flex items-baseline justify-between">
          <span
            className={`text-2xl font-bold tracking-tight ${
              hayGanancia ? 'text-success' : 'text-slate-300'
            }`}
          >
            {data.ganancia_neta_real_ves >= 0 ? '+' : ''}
            {formatVES(data.ganancia_neta_real_ves)}
          </span>
          <span className="text-xs text-muted">Bolívares</span>
        </div>
      </Card>

      {/* Órdenes Completadas Hoy */}
      <Card className="flex flex-col justify-between">
        <span className="text-xs uppercase tracking-wider text-muted font-semibold">
          Órdenes Completadas Hoy
        </span>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-brand tracking-tight">
            {data.ordenes_completadas_hoy}
          </span>
          <span className="text-xs text-muted">Trades confirmados</span>
        </div>
      </Card>
    </div>
  );
}
