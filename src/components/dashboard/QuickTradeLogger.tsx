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
  const [activeTab, setActiveTab] = useState<'EXECUTE_ORDER' | 'CREATE_AD'>('EXECUTE_ORDER');

  // Estado para EXECUTE_ORDER
  const [tipoOrden, setTipoOrden] = useState<'BUY' | 'SELL'>('BUY');
  const [montoCripto, setMontoCripto] = useState<number>(100);
  const [tasaEjecutada, setTasaEjecutada] = useState<number>(1000);
  const [metodoPago, setMetodoPago] = useState<string>('Pago Movil - Banesco');
  const [idContraparte, setIdContraparte] = useState<string>('comerciante_verif_01');

  // Estado para CREATE_AD
  const [tipoAd, setTipoAd] = useState<'COMPRA' | 'VENTA'>('COMPRA');
  const [tasaPublicada, setTasaPublicada] = useState<number>(995);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleExecuteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    const montoFiat = montoCripto * tasaEjecutada;

    try {
      const res = await fetch('/api/neo4j/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EXECUTE_ORDER',
          tipo: tipoOrden,
          monto_cripto: montoCripto,
          monto_fiat: montoFiat,
          tasa_ejecutada: tasaEjecutada,
          metodoPago,
          id_contraparte: idContraparte,
          userId: graph?.user?.id || 'usr_123',
        }),
      });

      if (!res.ok) throw new Error('Error al registrar la orden');

      setFeedback({
        type: 'success',
        message: `✅ Evento EXECUTE_ORDER confirmado: ${tipoOrden} ${montoCripto} USDT @ ${tasaEjecutada} VES. Contabilidad real y balance P&L actualizados.`,
      });

      if (onTradeSaved) onTradeSaved();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error registrando orden' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/neo4j/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_AD',
          tipo: tipoAd,
          tasa_publicada: tasaPublicada,
          fiat: 'VES',
          cripto: 'USDT',
          metodo_pago: metodoPago,
          userId: graph?.user?.id || 'usr_123',
        }),
      });

      if (!res.ok) throw new Error('Error al publicar oferta');

      setFeedback({
        type: 'success',
        message: `📢 Evento CREATE_AD registrado: Anuncio de ${tipoAd} publicado @ ${tasaPublicada} VES en el grafo.`,
      });

      if (onTradeSaved) onTradeSaved();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error registrando anuncio' });
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
            <h3 className="text-sm font-bold text-white">Módulo de Registro: Ofertas y Órdenes Reales</h3>
            <p className="text-[11px] text-muted">
              Telemetría oficial para la balanza diaria sin datos inventados
            </p>
          </div>
        </div>

        <div className="flex bg-surface-900 p-0.5 rounded-lg border border-surface-700 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('EXECUTE_ORDER')}
            className={`px-3 py-1 rounded font-semibold transition-colors ${
              activeTab === 'EXECUTE_ORDER'
                ? 'bg-brand text-surface-900 font-bold'
                : 'text-muted hover:text-white'
            }`}
          >
            EXECUTE_ORDER (Orden Real)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CREATE_AD')}
            className={`px-3 py-1 rounded font-semibold transition-colors ${
              activeTab === 'CREATE_AD'
                ? 'bg-brand text-surface-900 font-bold'
                : 'text-muted hover:text-white'
            }`}
          >
            CREATE_AD (Oferta Maker)
          </button>
        </div>
      </div>

      {activeTab === 'EXECUTE_ORDER' ? (
        <form onSubmit={handleExecuteOrder} className="space-y-4">
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
                  Compra (BUY)
                </button>
                <button
                  type="button"
                  onClick={() => setTipoOrden('SELL')}
                  className={`flex-1 py-1 text-xs font-semibold rounded ${
                    tipoOrden === 'SELL' ? 'bg-danger text-white' : 'text-muted hover:text-white'
                  }`}
                >
                  Venta (SELL)
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted block mb-1">Monto Cripto Real (USDT)</label>
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
              <label className="text-[11px] font-semibold text-muted block mb-1">Tasa Ejecutada (VES)</label>
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
              <label className="text-[11px] font-semibold text-muted block mb-1">Método de Pago Usado</label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="w-full bg-surface-900 border border-surface-600 rounded-lg py-1.5 px-2 text-xs text-white focus:border-brand focus:outline-none"
              >
                {(graph?.metodos || []).map((m, idx) => (
                  <option key={idx} value={m.banco.name}>
                    {m.banco.name}
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
              <label className="text-[11px] font-semibold text-muted block mb-1">ID de Contraparte (Binance Nickname)</label>
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
                {isLoading ? <Spinner size="sm" /> : 'Confirmar Orden'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <form onSubmit={handleCreateAd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-muted block mb-1">Tipo de Anuncio Maker</label>
              <div className="flex bg-surface-900 p-0.5 rounded-lg border border-surface-600">
                <button
                  type="button"
                  onClick={() => setTipoAd('COMPRA')}
                  className={`flex-1 py-1 text-xs font-semibold rounded ${
                    tipoAd === 'COMPRA' ? 'bg-success text-black' : 'text-muted hover:text-white'
                  }`}
                >
                  Compra Maker
                </button>
                <button
                  type="button"
                  onClick={() => setTipoAd('VENTA')}
                  className={`flex-1 py-1 text-xs font-semibold rounded ${
                    tipoAd === 'VENTA' ? 'bg-danger text-white' : 'text-muted hover:text-white'
                  }`}
                >
                  Venta Maker
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted block mb-1">Tasa Publicada en Binance (VES)</label>
              <input
                type="number"
                step="0.1"
                value={tasaPublicada}
                onChange={(e) => setTasaPublicada(Number(e.target.value))}
                className="w-full bg-surface-900 border border-surface-600 rounded-lg py-1.5 px-3 text-xs text-white font-semibold focus:border-brand focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted block mb-1">Método de Pago Asociado</label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="w-full bg-surface-900 border border-surface-600 rounded-lg py-1.5 px-2 text-xs text-white focus:border-brand focus:outline-none"
              >
                {(graph?.metodos || []).map((m, idx) => (
                  <option key={idx} value={m.banco.name}>
                    {m.banco.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-surface-700">
            <span className="text-[11px] text-muted">
              Comisión aplicable: <strong className="text-white">0.25% Maker Binance</strong>
            </span>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-brand hover:bg-brand-hover text-surface-900 font-bold px-4 py-2 rounded-lg text-xs transition-colors"
            >
              {isLoading ? <Spinner size="sm" /> : 'Registrar Anuncio Maker'}
            </button>
          </div>
        </form>
      )}

      {feedback && (
        <div
          className={`mt-3 p-2.5 rounded-lg text-xs border ${
            feedback.type === 'success'
              ? 'bg-success/10 border-success/30 text-success'
              : 'bg-danger/10 border-danger/30 text-danger'
          }`}
        >
          {feedback.message}
        </div>
      )}
    </Card>
  );
}
