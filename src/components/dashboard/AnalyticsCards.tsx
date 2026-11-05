'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { formatUSDT, formatVES } from '@/lib/utils/currency';
import type { ControlDiarioReal } from '@/types/analytics';

interface AnalyticsCardsProps {
  control?: ControlDiarioReal | null;
}

export function AnalyticsCards({ control }: AnalyticsCardsProps) {
  // Datos estrictamente reales. Si no hay registro, todo es 0.
  const data: ControlDiarioReal = control || {
    fecha: new Date().toISOString().split('T')[0],
    ordenes_completadas: 0,
    capital_rotado_usdt: 0,
    ganancia_neta_real_usdt: 0,
    ganancia_neta_real_ves: 0,
    comisiones_pagadas_usdt: 0,
  };

  const hayGanancia = data.ganancia_neta_real_usdt > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Ganancia Neta Real Realizada */}
      <Card
        className={`flex flex-col justify-between ${
          hayGanancia
            ? 'border-success/40 bg-gradient-to-br from-surface-800 to-success/10'
            : 'border-surface-600 bg-surface-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted font-semibold">
            Ganancia Neta Real (P&L Hoy)
          </span>
          <span className="text-[10px] bg-surface-700 px-1.5 py-0.5 rounded text-muted font-mono">
            {data.fecha}
          </span>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div>
            <span
              className={`text-2xl font-bold tracking-tight ${
                hayGanancia ? 'text-success' : 'text-slate-300'
              }`}
            >
              {data.ganancia_neta_real_usdt >= 0 ? '+' : ''}
              {formatUSDT(data.ganancia_neta_real_usdt)}
            </span>
            <span className="text-xs text-muted block mt-0.5">
              {formatVES(data.ganancia_neta_real_ves)}
            </span>
          </div>
          <span className="text-[10px] text-muted">Contabilidad Real</span>
        </div>
      </Card>

      {/* Órdenes Completadas Confirmadas */}
      <Card className="flex flex-col justify-between">
        <span className="text-xs uppercase tracking-wider text-muted font-semibold">
          Órdenes Confirmadas
        </span>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-white tracking-tight">
            {data.ordenes_completadas}
          </span>
          <span className="text-xs text-muted">Trades reales</span>
        </div>
      </Card>

      {/* Capital Rotado */}
      <Card className="flex flex-col justify-between">
        <span className="text-xs uppercase tracking-wider text-muted font-semibold">
          Volumen Rotado Real
        </span>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-brand tracking-tight">
            {formatUSDT(data.capital_rotado_usdt)}
          </span>
          <span className="text-xs text-muted">Hoy</span>
        </div>
      </Card>

      {/* Comisiones Maker Pagadas */}
      <Card className="flex flex-col justify-between">
        <span className="text-xs uppercase tracking-wider text-muted font-semibold">
          Comisiones Maker Pagadas
        </span>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-danger tracking-tight">
            -{formatUSDT(data.comisiones_pagadas_usdt)}
          </span>
          <span className="text-xs text-muted">0.25% Binance</span>
        </div>
      </Card>
    </div>
  );
}
