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
  const [tipoOrden, setTipoOrden] = useState<'BUY' | 'SELL'>('BUY');
  const [montoCripto, setMontoCripto] = useState<number>(50);
  const [tasaEjecutada, setTasaEjecutada] = useState<number>(1005);
  const [metodoPago, setMetodoPago] = useState<string>('Pago Movil - Banesco');
  const [idContraparte, setIdContraparte] = useState<string>('comerciante_verif');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    const montoFiat = montoCripto * tasaEjecutada;

    try {
      const res = await fetch('/api/neo4j/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: tipoOrden,
          monto_cripto: montoCripto,
          monto_fiat: montoFiat,
          tasa_ejecutada: tasaEjecutada,
          metodoPago,
          id_contraparte: idContraparte,
          userId: graph?.user?.id || 'usr_123',
        }),
      });

      if (!res.ok) throw new Error('Error al confirmar la orden');

      setFeedback({
        type: 'success',
        message: `✅ Orden registrada en el grafo: ${tipoOrden} ${montoCripto} USDT vinculada a ${metodoPago} y al DailyClose de hoy.`,
      });

      if (onTradeSaved) onTradeSaved();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error registrando orden' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-surface-600 bg-surface-800">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-600/70 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📝</span>
          <div>
            <h3 className="text-sm font-bold text-white">Registro de Órdenes Reales (:TradeOrder)</h3>
            <p className="text-[11px] text-muted">
              Vincula cada orden ejecutada directamente a su Método de Pago en el Grafo
            </p>
          </div>
        </div>
        <Badge variant={tipoOrden === 'BUY' ? 'success' : 'danger'}>
          {tipoOrden === 'BUY' ? 'Compra (BUY)' : 'Venta (SELL)'}
        </Badge>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-muted block mb-1">Tipo de Orden</label>
            <div className="flex bg-surface-900 p-0.5 rounded-lg border border-surface-600">
              <button
                type="button"
                onClick={() => setTipoOrden('BUY')}
                className={`flex-1 py-1 text-xs font-semibold rounded ${
                  tipoOrden === 'BUY' ? 'bg-success text-black' : 'text-muted hover:text-white'
                }`}
              >
                BUY
              </button>
              <button
                type="button"
                onClick={() => setTipoOrden('SELL')}
                className={`flex-1 py-1 text-xs font-semibold rounded ${
                  tipoOrden === 'SELL' ? 'bg-danger text-white' : 'text-muted hover:text-white'
                }`}
              >
                SELL
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted block mb-1">Monto Cripto (USDT)</label>
            <input
              type="number"
              step="5"
              min="1"
              value={montoCripto}
              onChange={(e) => setMontoCripto(Number(e.target.value))}
              className="w-full bg-surface-900 border border-surface-600 rounded-lg py-1.5 px-3 text-xs text-white font-semibold focus:border-brand focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted block mb-1">Tasa Real (VES)</label>
            <input
              type="number"
              step="0.1"
              value={tasaEjecutada}
              onChange={(e) => setTasaEjecutada(Number(e.target.value))}
              className="w-full bg-surface-900 border border-surface-600 rounded-lg py-1.5 px-3 text-xs text-white font-semibold focus:border-brand focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted block mb-1">Método de Pago</label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className="w-full bg-surface-900 border border-surface-600 rounded-lg py-1.5 px-2 text-xs text-white focus:border-brand focus:outline-none"
            >
              {(graph?.metodos || []).map((m, idx) => (
                <option key={idx} value={m.banco.name}>
                  {m.banco.name} (Disp: {m.disponible_ves.toLocaleString()} VES)
                </option>
              ))}
              <option value="Pago Movil - Banesco">Pago Movil - Banesco</option>
              <option value="Pago Movil - Mercantil">Pago Movil - Mercantil</option>
              <option value="Transferencia - Venezuela">Transferencia - Venezuela</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-surface-700 items-center">
          <div>
            <label className="text-[11px] font-semibold text-muted block mb-1">Contraparte (Binance Nickname)</label>
            <input
              type="text"
              value={idContraparte}
              onChange={(e) => setIdContraparte(e.target.value)}
              placeholder="ej: comerciante_top_01"
              className="w-full bg-surface-900 border border-surface-600 rounded-lg py-1 px-3 text-xs text-white"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 sm:pt-0">
            <div className="text-right">
              <span className="text-[10px] text-muted block">Monto Fiat Real:</span>
              <span className="text-xs font-bold text-white">{formatVES(montoCripto * tasaEjecutada)}</span>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-brand hover:bg-brand-hover text-surface-900 font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isLoading ? <Spinner size="sm" /> : 'Confirmar Orden en Grafo'}
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
