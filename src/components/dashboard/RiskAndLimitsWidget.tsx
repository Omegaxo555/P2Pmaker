'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatVES } from '@/lib/utils/currency';
import type { UserGraphSummary } from '@/types/neo4j';
import type { EstadoLimiteBanco } from '@/types/analytics';

interface RiskAndLimitsWidgetProps {
  graph?: UserGraphSummary | null;
  limitesFromAI?: EstadoLimiteBanco[];
}

export function RiskAndLimitsWidget({ graph, limitesFromAI }: RiskAndLimitsWidgetProps) {
  // Preferir datos del grafo en tiempo real
  const metodos = (graph?.metodos || []).map((m) => ({
    metodo_pago: m.banco.name,
    limite_diario_total: m.banco.diario_max,
    limite_consumido_real: m.consumido_hoy,
    limite_disponible: m.disponible_hoy,
    tiempo: m.tiempo_promedio_min,
  }));

  const displayData =
    metodos.length > 0
      ? metodos
      : (limitesFromAI || []).map((l) => ({
          ...l,
          tiempo: 8,
        }));

  const totalMax = displayData.reduce((acc, m) => acc + m.limite_diario_total, 0);
  const totalConsumido = displayData.reduce((acc, m) => acc + m.limite_consumido_real, 0);
  const totalDisponible = Math.max(0, totalMax - totalConsumido);
  const porcentajeUso = totalMax > 0 ? (totalConsumido / totalMax) * 100 : 0;

  return (
    <Card className="border-surface-600 bg-surface-800">
      <div className="flex items-center justify-between border-b border-surface-600/70 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏦</span>
          <div>
            <h3 className="text-sm font-bold text-white">Estado Real de Límites Bancarios (Grafo)</h3>
            <p className="text-[11px] text-muted">
              Telemetría y consumo acumulado real por cada método de pago
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-muted block">Cupo Total Real Disponible</span>
          <span className="text-sm font-bold text-brand">{formatVES(totalDisponible)}</span>
        </div>
      </div>

      {/* Barra de progreso global */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted">Consumo Global Acumulado Hoy</span>
          <span className="font-semibold text-white">
            {porcentajeUso.toFixed(1)}% ({formatVES(totalConsumido)} / {formatVES(totalMax)})
          </span>
        </div>
        <div className="w-full bg-surface-900 rounded-full h-2 overflow-hidden border border-surface-700">
          <div
            className={`h-full transition-all duration-500 ${
              porcentajeUso > 80 ? 'bg-danger' : porcentajeUso > 50 ? 'bg-brand' : 'bg-success'
            }`}
            style={{ width: `${Math.min(100, porcentajeUso)}%` }}
          />
        </div>
      </div>

      {/* Lista detallada por Método */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {displayData.map((item, idx) => {
          const usoMetodo =
            item.limite_diario_total > 0
              ? (item.limite_consumido_real / item.limite_diario_total) * 100
              : 0;

          return (
            <div
              key={idx}
              className="bg-surface-900/90 rounded-lg p-3 border border-surface-700 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-1 mb-2">
                  <span className="text-xs font-semibold text-white truncate max-w-[140px]">
                    {item.metodo_pago}
                  </span>
                  <Badge variant={usoMetodo > 80 ? 'danger' : 'success'} className="text-[10px] px-1.5 py-0">
                    {usoMetodo.toFixed(0)}% Consumido
                  </Badge>
                </div>

                <div className="text-[11px] space-y-1 mb-2">
                  <div className="flex justify-between text-muted">
                    <span>Disponible real:</span>
                    <span className="font-bold text-success">{formatVES(item.limite_disponible)}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Límite diario:</span>
                    <span className="text-slate-300">{formatVES(item.limite_diario_total)}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Consumido hoy:</span>
                    <span className="text-amber-400 font-medium">
                      {formatVES(item.limite_consumido_real)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Minibarra */}
              <div className="w-full bg-surface-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full ${
                    usoMetodo > 80 ? 'bg-danger' : usoMetodo > 50 ? 'bg-brand' : 'bg-success'
                  }`}
                  style={{ width: `${Math.min(100, usoMetodo)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
