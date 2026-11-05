'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import type { GraficaRendimiento } from '@/types/analytics';

interface PerformanceChartProps {
  data?: GraficaRendimiento | null;
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  const chartData = (data?.eje_x_labels || ['Ene 1', 'Ene 2', 'Ene 3', 'Ene 4', 'Ene 5']).map(
    (label, index) => ({
      fecha: label,
      capital: data?.serie_capital?.[index] ?? [1000, 1012, 1025, 1038, 1042.5][index],
      ganancia: data?.serie_ganancias?.[index] ?? [0, 12, 25, 38, 42.5][index],
    })
  );

  return (
    <Card className="flex flex-col h-[340px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Curva de Rendimiento P2P (USDT)</h3>
          <p className="text-xs text-muted">Evolución de capital y beneficio neto por ciclo de arbitraje</p>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2B313A" vertical={false} />
            <XAxis
              dataKey="fecha"
              stroke="#848E9C"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#2B313A' }}
            />
            <YAxis
              stroke="#848E9C"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#2B313A' }}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1E2329',
                borderColor: '#2B313A',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#F0B90B', fontWeight: 'bold' }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              iconType="circle"
            />
            <Line
              type="monotone"
              dataKey="capital"
              name="Capital Total (USDT)"
              stroke="#F0B90B"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#F0B90B' }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="ganancia"
              name="Ganancia Neta (USDT)"
              stroke="#0ECB81"
              strokeWidth={2}
              dot={{ r: 3, fill: '#0ECB81' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
