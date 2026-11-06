'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BinanceNumberInput } from '@/components/ui/BinanceNumberInput';
import { formatBinanceNumber, formatVES } from '@/lib/utils/currency';
import type { PaymentMethodMarketRange } from '@/lib/binance/types';
import type { UserGraphSummary } from '@/types/neo4j';

interface RiskAndLimitsWidgetProps {
  graph?: UserGraphSummary | null;
  paymentMethods?: PaymentMethodMarketRange[];
  onLimitSaved?: () => void;
}

export function RiskAndLimitsWidget({ graph, paymentMethods = [], onLimitSaved }: RiskAndLimitsWidgetProps) {
  const [selectedMethod, setSelectedMethod] = useState('');
  const [limitInput, setLimitInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const methodNames = useMemo(
    () => Array.from(new Set([
      ...paymentMethods.map((method) => method.name),
      ...(graph?.metodos || []).map((method) => method.banco.name),
    ])).sort((a, b) => a.localeCompare(b)),
    [graph?.metodos, paymentMethods]
  );

  useEffect(() => {
    if (!selectedMethod && methodNames.length > 0) setSelectedMethod(methodNames[0]);
  }, [methodNames, selectedMethod]);

  useEffect(() => {
    if (!selectedMethod) return;
    const currentLimit = graph?.metodos.find((method) => method.banco.name === selectedMethod)
      ?.banco.limite_diario_maximo_ves;
    setLimitInput(currentLimit ? formatBinanceNumber(currentLimit) : '');
  }, [graph?.metodos, selectedMethod]);

  const handleMethodChange = (methodName: string) => {
    setSelectedMethod(methodName);
    setFeedback(null);
  };

  const saveLimit = async (event: React.FormEvent) => {
    event.preventDefault();
    const dailyLimitVES = Number(limitInput.replace(/,/g, ''));
    if (!selectedMethod || !Number.isFinite(dailyLimitVES) || dailyLimitVES <= 0) {
      setFeedback({ type: 'error', message: 'Selecciona un método y escribe un límite mayor que cero.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/neo4j/method-limit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ methodName: selectedMethod, dailyLimitVES }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo guardar el límite.');

      setFeedback({
        type: 'success',
        message: result.storage === 'neo4j'
          ? `Tope personal guardado para ${selectedMethod}.`
          : `Tope guardado temporalmente para ${selectedMethod}; configura Neo4j para conservarlo.`,
      });
      onLimitSaved?.();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error guardando el tope personal.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const metodos = (graph?.metodos || []).map((m) => ({
    banco: m.banco.name,
    limite_diario_maximo_ves: m.banco.limite_diario_maximo_ves,
    consumido_hoy_ves: m.consumido_hoy_ves,
    disponible_ves: m.disponible_ves,
    ordenes_count: m.ordenes_asociadas.length,
  }));

  const displayData = metodos;

  const metodosConLimite = displayData.filter((method) => method.limite_diario_maximo_ves !== null);
  const totalMax = metodosConLimite.reduce((acc, m) => acc + (m.limite_diario_maximo_ves || 0), 0);
  const totalConsumido = metodosConLimite.reduce((acc, m) => acc + m.consumido_hoy_ves, 0);
  const totalDisponible = metodosConLimite.reduce((acc, m) => acc + (m.disponible_ves || 0), 0);
  const porcentajeUso = totalMax > 0 ? (totalConsumido / totalMax) * 100 : 0;

  return (
    <Card className="border-surface-600 bg-surface-800">
      <div className="flex items-center justify-between border-b border-surface-600/70 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏦</span>
          <div>
            <h3 className="text-sm font-bold text-white">Consumo por método registrado</h3>
            <p className="text-[11px] text-muted">
              El consumo suma las órdenes de hoy. Los topes solo aparecen si fueron configurados en Neo4j.
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-muted block">Cupo disponible configurado</span>
          <span className="text-sm font-bold text-brand">
            {metodosConLimite.length ? formatVES(totalDisponible) : 'Sin configurar'}
          </span>
        </div>
      </div>

      <form onSubmit={saveLimit} className="mb-4 grid gap-3 rounded-lg border border-surface-700 bg-surface-900/70 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <div>
          <label htmlFor="daily-limit-method" className="mb-1 block text-[11px] font-semibold text-muted">
            Método de pago
          </label>
          <select
            id="daily-limit-method"
            value={selectedMethod}
            onChange={(event) => handleMethodChange(event.target.value)}
            required
            className="w-full rounded-lg border border-surface-600 bg-surface-900 px-3 py-2 text-xs text-white focus:border-brand focus:outline-none"
          >
            {methodNames.length === 0 && <option value="">Consulta métodos de Binance</option>}
            {methodNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-muted">
            Tu tope diario (VES)
          </label>
          <BinanceNumberInput
            value={limitInput}
            onChange={setLimitInput}
            placeholder="1,234,567.000"
            ariaLabel="Tope diario personal en VES"
            required
            className="w-full rounded-lg border border-surface-600 bg-surface-900 px-3 py-2 text-xs font-semibold text-white focus:border-brand focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={isSaving || !selectedMethod}
          className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-surface-900 hover:bg-brand-hover disabled:opacity-50"
        >
          {isSaving ? 'Guardando…' : 'Guardar tope'}
        </button>
        {feedback && (
          <p role="status" className={`text-xs sm:col-span-3 ${feedback.type === 'success' ? 'text-success' : 'text-danger'}`}>
            {feedback.message}
          </p>
        )}
        <p className="text-[10px] leading-relaxed text-muted sm:col-span-3">
          Este es tu límite operativo personal, no un límite oficial del banco ni de Binance. Debes verificarlo en la app de tu banco.
        </p>
      </form>

      {totalMax > 0 && (
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-muted">Consumo global diario con topes configurados</span>
            <span className="font-semibold text-white">
              {porcentajeUso.toFixed(1)}% ({formatVES(totalConsumido)} / {formatVES(totalMax)})
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full border border-surface-700 bg-surface-900">
            <div
              className={`h-full transition-all duration-500 ${
                porcentajeUso > 80 ? 'bg-danger' : porcentajeUso > 50 ? 'bg-brand' : 'bg-success'
              }`}
              style={{ width: `${Math.min(100, porcentajeUso)}%` }}
            />
          </div>
        </div>
      )}

      {displayData.length === 0 ? (
        <p className="rounded-lg border border-dashed border-surface-600 p-6 text-center text-xs text-muted">
          Los métodos aparecen aquí cuando registras una orden con ellos.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {displayData.map((item, idx) => {
          const usoMetodo = item.limite_diario_maximo_ves
            ? (item.consumido_hoy_ves / item.limite_diario_maximo_ves) * 100
            : null;

          return (
            <div
              key={idx}
              className="bg-surface-900/90 rounded-lg p-3 border border-surface-700 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-1 mb-2">
                  <span className="text-xs font-semibold text-white truncate max-w-[140px]">
                    {item.banco}
                  </span>
                  {usoMetodo === null ? (
                    <Badge variant="neutral" className="text-[10px] px-1.5 py-0">Sin tope</Badge>
                  ) : (
                    <Badge variant={usoMetodo > 80 ? 'danger' : 'success'} className="text-[10px] px-1.5 py-0">
                      {usoMetodo.toFixed(0)}% Usado
                    </Badge>
                  )}
                </div>

                <div className="text-[11px] space-y-1 mb-2">
                  <div className="flex justify-between text-muted">
                    <span>Disponible:</span>
                    <span className="font-bold text-success">
                      {item.disponible_ves === null ? 'Sin configurar' : formatVES(item.disponible_ves)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Límite máximo:</span>
                    <span className="text-slate-300">
                      {item.limite_diario_maximo_ves === null
                        ? 'Sin configurar'
                        : formatVES(item.limite_diario_maximo_ves)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Consumido hoy:</span>
                    <span className="text-amber-400 font-medium">
                      {formatVES(item.consumido_hoy_ves)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Órdenes ligadas:</span>
                    <span className="text-white font-mono">{item.ordenes_count} trades</span>
                  </div>
                </div>
              </div>

              {usoMetodo !== null && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-800">
                  <div
                    className={`h-full ${
                      usoMetodo > 80 ? 'bg-danger' : usoMetodo > 50 ? 'bg-brand' : 'bg-success'
                    }`}
                    style={{ width: `${Math.min(100, usoMetodo)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
        </div>
      )}
    </Card>
  );
}
