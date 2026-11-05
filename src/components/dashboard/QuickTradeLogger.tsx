'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { formatVES } from '@/lib/utils/currency';
import type { UserGraphSummary } from '@/types/neo4j';

interface QuickTradeLoggerProps {
  graph?: UserGraphSummary | null;
  onTradeSaved?: () => void;
}

export function QuickTradeLogger({ graph, onTradeSaved }: QuickTradeLoggerProps) {
  const [tipo, setTipo] = useState<'BUY_MAKER' | 'SELL_MAKER'>('BUY_MAKER');
  const [usdtMonto, setUsdtMonto] = useState<number>(100);
  const [tasa, setTasa] = useState<number>(1000);
  const [metodoPago, setMetodoPago] = useState<string>(
    graph?.metodos?.[0]?.banco.name || 'Pago Movil - Banesco'
  );
  const [tiempoMinutos, setTiempoMinutos] = useState<number>(8);
  const [esExito, setEsExito] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Actualizar método default si cambia el grafo
  React.useEffect(() => {
    if (graph?.metodos?.length && !metodoPago) {
      setMetodoPago(graph.metodos[0].banco.name);
    }
  }, [graph]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    try {
      const tradeId = `tr_${Date.now()}`;
      const res = await fetch('/api/neo4j/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: graph?.user?.id || 'usr_123',
          tradeId,
          usdt_monto: usdtMonto,
          tasa,
          tipo,
          metodoPago,
          exito: esExito,
          tiempo_minutos: tiempoMinutos,
        }),
      });

      if (!res.ok) throw new Error('Error al guardar el trade en el grafo');

      setFeedback({
        type: 'success',
        message: `✅ Trade guardado en Neo4j: ${usdtMonto} USDT @ ${tasa} VES con ${metodoPago}. Score de aprendizaje actualizado.`,
      });

      if (onTradeSaved) onTradeSaved();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `❌ ${err.message || 'No se pudo guardar'}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totalVES = usdtMonto * tasa;

  return (
    <Card className="border-surface-600 bg-surface-800">
      <div className="flex items-center justify-between border-b border-surface-600/70 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <div>
            <h3 className="text-sm font-bold text-white">Registro de Ejecución Rápida (RL Grafo)</h3>
            <p className="text-[11px] text-muted">
              Alimentar a Neo4j con tus trades reales para retroalimentar el modelo de aprendizaje
            </p>
          </div>
        </div>
        <Badge variant={tipo === 'BUY_MAKER' ? 'success' : 'danger'}>
          {tipo === 'BUY_MAKER' ? 'Compra Maker' : 'Venta Maker'}
        </Badge>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Tipo de Orden */}
          <div>
            <label className="text-[11px] font-semibold text-muted block mb-1">Tipo de Orden</label>
            <div className="flex bg-surface-900 p-0.5 rounded-lg border border-surface-600">
              <button
                type="button"
                onClick={() => setTipo('BUY_MAKER')}
                className={`flex-1 py-1 text-xs font-semibold rounded-md ${
                  tipo === 'BUY_MAKER' ? 'bg-success text-black' : 'text-muted hover:text-white'
                }`}
              >
                Compra
              </button>
              <button
                type="button"
                onClick={() => setTipo('SELL_MAKER')}
                className={`flex-1 py-1 text-xs font-semibold rounded-md ${
                  tipo === 'SELL_MAKER' ? 'bg-danger text-white' : 'text-muted hover:text-white'
                }`}
              >
                Venta
              </button>
            </div>
          </div>

          {/* Monto USDT */}
          <div>
            <label className="text-[11px] font-semibold text-muted block mb-1">Monto (USDT)</label>
            <input
              type="number"
              step="5"
              min="1"
              value={usdtMonto}
              onChange={(e) => setUsdtMonto(Number(e.target.value))}
              className="w-full bg-surface-900 border border-surface-600 rounded-lg py-1.5 px-3 text-xs text-white font-semibold focus:border-brand focus:outline-none"
              required
            />
          </div>

          {/* Tasa Ejecutada */}
          <div>
            <label className="text-[11px] font-semibold text-muted block mb-1">Tasa Ejecutada (VES)</label>
            <input
              type="number"
              step="0.1"
              value={tasa}
              onChange={(e) => setTasa(Number(e.target.value))}
              className="w-full bg-surface-900 border border-surface-600 rounded-lg py-1.5 px-3 text-xs text-white font-semibold focus:border-brand focus:outline-none"
              required
            />
          </div>

          {/* Método de Pago */}
          <div>
            <label className="text-[11px] font-semibold text-muted block mb-1">Método de Pago</label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className="w-full bg-surface-900 border border-surface-600 rounded-lg py-1.5 px-2 text-xs text-white focus:border-brand focus:outline-none"
            >
              {(graph?.metodos || []).map((m, idx) => (
                <option key={idx} value={m.banco.name}>
                  {m.banco.name} (Cupo: {m.disponible_hoy.toLocaleString()} VES)
                </option>
              ))}
              <option value="Pago Movil - Banesco">Pago Movil - Banesco</option>
              <option value="Pago Movil - Mercantil">Pago Movil - Mercantil</option>
              <option value="Transferencia - Venezuela">Transferencia - Venezuela</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center pt-1 border-t border-surface-700">
          <div>
            <label className="text-[11px] font-semibold text-muted block mb-1">Tiempo de Ejecución</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="120"
                value={tiempoMinutos}
                onChange={(e) => setTiempoMinutos(Number(e.target.value))}
                className="w-20 bg-surface-900 border border-surface-600 rounded-lg py-1 px-2 text-xs text-white"
              />
              <span className="text-xs text-muted">minutos</span>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted block mb-1">Resultado de la Operación</label>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 text-success cursor-pointer">
                <input
                  type="radio"
                  name="exito"
                  checked={esExito}
                  onChange={() => setEsExito(true)}
                  className="accent-success"
                />
                Sin problemas (100%)
              </label>
              <label className="flex items-center gap-1.5 text-danger cursor-pointer">
                <input
                  type="radio"
                  name="exito"
                  checked={!esExito}
                  onChange={() => setEsExito(false)}
                  className="accent-danger"
                />
                Retraso / Sospecha
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 sm:pt-0">
            <div className="text-right">
              <span className="text-[10px] text-muted block">Volumen Total</span>
              <span className="text-xs font-bold text-white">{formatVES(totalVES)}</span>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-brand hover:bg-brand-hover text-surface-900 font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isLoading ? <Spinner size="sm" /> : 'Guardar en Grafo'}
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`p-2.5 rounded-lg text-xs border ${
              feedback.type === 'success'
                ? 'bg-success/10 border-success/30 text-success'
                : 'bg-danger/10 border-danger/30 text-danger'
            }`}
          >
            {feedback.message}
          </div>
        )}
      </form>
    </Card>
  );
}
