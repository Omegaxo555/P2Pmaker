'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { BinanceNumberInput } from '@/components/ui/BinanceNumberInput';
import { formatBinanceNumber, formatVES } from '@/lib/utils/currency';
import type { PaymentMethodMarketRange } from '@/lib/binance/types';
import type { TradeOrderNode, UserGraphSummary } from '@/types/neo4j';

interface QuickTradeLoggerProps {
  graph?: UserGraphSummary | null;
  paymentMethods?: PaymentMethodMarketRange[];
  initialOrder?: TradeOrderNode | null;
  onTradeSaved?: () => void;
  onCancelEdit?: () => void;
}

export function QuickTradeLogger({
  graph,
  paymentMethods = [],
  initialOrder,
  onTradeSaved,
  onCancelEdit,
}: QuickTradeLoggerProps) {
  const [tipoOrden, setTipoOrden] = useState<'BUY' | 'SELL'>(initialOrder?.tipo || 'BUY');
  const [montoCripto, setMontoCripto] = useState<string>(
    initialOrder ? formatBinanceNumber(initialOrder.monto_cripto) : ''
  );
  const [tasaEjecutada, setTasaEjecutada] = useState<string>(
    initialOrder ? formatBinanceNumber(initialOrder.tasa_ejecutada) : ''
  );
  const [comisionPorcentaje, setComisionPorcentaje] = useState<string>(
    initialOrder && initialOrder.monto_cripto > 0
      ? formatBinanceNumber((initialOrder.comision_deductiva / initialOrder.monto_cripto) * 100)
      : ''
  );
  const [metodoPago, setMetodoPago] = useState<string>(initialOrder?.metodo_pago || '');
  const [idContraparte, setIdContraparte] = useState<string>(initialOrder?.id_contraparte || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!initialOrder && !metodoPago) {
      setMetodoPago(paymentMethods[0]?.name || graph?.metodos[0]?.banco.name || '');
    }
  }, [graph?.metodos, initialOrder, metodoPago, paymentMethods]);

  const methodRange = paymentMethods.find((method) => method.name === metodoPago);
  const orderRange = tipoOrden === 'BUY' ? methodRange?.buy : methodRange?.sell;
  const montoFiatPreview =
    Number(montoCripto.replace(/,/g, '')) * Number(tasaEjecutada.replace(/,/g, ''));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    const montoCriptoValue = Number(montoCripto.replace(/,/g, ''));
    const tasaEjecutadaValue = Number(tasaEjecutada.replace(/,/g, ''));
    const comisionPorcentajeValue = Number(comisionPorcentaje.replace(/,/g, ''));
    if (
      !Number.isFinite(montoCriptoValue) ||
      montoCriptoValue <= 0 ||
      !Number.isFinite(tasaEjecutadaValue) ||
      tasaEjecutadaValue <= 0 ||
      !Number.isFinite(comisionPorcentajeValue) ||
      comisionPorcentajeValue < 0 ||
      comisionPorcentajeValue > 100
    ) {
      setFeedback({ type: 'error', message: 'Completa monto, tasa y comisión con valores válidos.' });
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/neo4j/trade', {
        method: initialOrder ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(initialOrder ? { id: initialOrder.id } : {}),
          tipo: tipoOrden,
          monto_cripto: montoCriptoValue,
          tasa_ejecutada: tasaEjecutadaValue,
          comision_porcentaje: comisionPorcentajeValue,
          metodoPago,
          id_contraparte: idContraparte,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error al guardar la orden');

      setFeedback({
        type: 'success',
        message: initialOrder
          ? `Orden ${initialOrder.id} actualizada correctamente.`
          : `Orden registrada: ${tipoOrden} ${formatBinanceNumber(montoCriptoValue)} USDT mediante ${metodoPago}.`,
      });

      if (!initialOrder) {
        setMontoCripto('');
        setTasaEjecutada('');
        setComisionPorcentaje('');
        setIdContraparte('');
      }

      if (onTradeSaved) onTradeSaved();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error registrando orden',
      });
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
            <h3 className="text-sm font-bold text-white">
              {initialOrder ? `Editar orden ${initialOrder.id}` : 'Registrar orden'}
            </h3>
            <p className="text-[11px] text-muted">
              El monto VES se calcula automáticamente a partir de USDT y la tasa ejecutada.
            </p>
          </div>
        </div>
        <Badge variant={tipoOrden === 'BUY' ? 'success' : 'danger'}>
          {tipoOrden === 'BUY' ? 'Compra (BUY)' : 'Venta (SELL)'}
        </Badge>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
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
            <BinanceNumberInput
              value={montoCripto}
              onChange={setMontoCripto}
              ariaLabel="Monto Cripto USDT"
              placeholder="1,234.567"
              className="w-full bg-surface-900 border border-surface-600 rounded-lg py-1.5 px-3 text-xs text-white font-semibold focus:border-brand focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted block mb-1">Tasa Real (VES)</label>
            <BinanceNumberInput
              value={tasaEjecutada}
              onChange={setTasaEjecutada}
              ariaLabel="Tasa Real VES"
              placeholder="1,234.567"
              className="w-full bg-surface-900 border border-surface-600 rounded-lg py-1.5 px-3 text-xs text-white font-semibold focus:border-brand focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted block mb-1">Comisión aplicada (%)</label>
            <BinanceNumberInput
              value={comisionPorcentaje}
              onChange={setComisionPorcentaje}
              ariaLabel="Comisión aplicada porcentaje"
              placeholder="0.250"
              className="w-full bg-surface-900 border border-surface-600 rounded-lg py-1.5 px-3 text-xs text-white font-semibold focus:border-brand focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted block mb-1">Método de pago (Binance)</label>
            <input
              list="binance-payment-methods"
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value.trimStart())}
              maxLength={100}
              placeholder="Elige o escribe un método"
              required
              className="w-full bg-surface-900 border border-surface-600 rounded-lg py-1.5 px-2 text-xs text-white focus:border-brand focus:outline-none"
            />
            <datalist id="binance-payment-methods">
              {Array.from(new Set([
                ...paymentMethods.map((method) => method.name),
                ...(graph?.metodos || []).map((method) => method.banco.name),
              ])).map((name) => <option key={name} value={name} />)}
            </datalist>
            {orderRange && (
              <span className="mt-1 block text-[10px] text-muted">
                Anuncios observados para {tipoOrden}: {orderRange.min === null ? '—' : formatVES(orderRange.min)}
                {' – '}
                {orderRange.max === null ? '—' : formatVES(orderRange.max)} · {orderRange.ads} anuncios
              </span>
            )}
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
              <span className="text-xs font-bold text-white">
                {Number.isFinite(montoFiatPreview) && montoCripto && tasaEjecutada
                  ? `${formatBinanceNumber(montoFiatPreview)} VES`
                  : '—'}
              </span>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-brand hover:bg-brand-hover text-surface-900 font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isLoading ? <Spinner size="sm" /> : initialOrder ? 'Guardar cambios' : 'Registrar orden'}
            </button>
            {initialOrder && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="text-xs text-muted hover:text-white"
              >
                Cancelar
              </button>
            )}
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
