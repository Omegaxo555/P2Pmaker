'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatVES, formatUSDT, formatPercent } from '@/lib/utils/currency';
import { calcularTasaCompraMaxima } from '@/lib/utils/calculations';

interface ArbitrageCalculatorProps {
  currentSellPrice?: number;
  currentBuyPrice?: number;
}

export function ArbitrageCalculator({ currentSellPrice = 0, currentBuyPrice = 0 }: ArbitrageCalculatorProps) {
  const [capitalUSDT, setCapitalUSDT] = useState<number>(100);
  const [margenDeseado, setMargenDeseado] = useState<number>(1.5);
  const [tasaVenta, setTasaVenta] = useState<number>(currentSellPrice || 1025);
  const [tasaCompraManual, setTasaCompraManual] = useState<number>(currentBuyPrice || 1000);
  const [modo, setModo] = useState<'AUTO_MAKER' | 'MANUAL'>('AUTO_MAKER');

  // Si actualizan precios desde el book y no ha editado
  React.useEffect(() => {
    if (currentSellPrice > 0 && tasaVenta === 1025) {
      setTasaVenta(currentSellPrice);
    }
    if (currentBuyPrice > 0 && tasaCompraManual === 1000) {
      setTasaCompraManual(currentBuyPrice);
    }
  }, [currentSellPrice, currentBuyPrice]);

  const comisionMaker = 0.0025; // 0.25%

  // Tasa de compra según la fórmula oficial de arbitraje Maker
  const tasaCompraOptima = calcularTasaCompraMaxima(tasaVenta, margenDeseado);
  const tasaCompraEfectiva = modo === 'AUTO_MAKER' ? tasaCompraOptima : tasaCompraManual;

  // Cálculos de Ciclo Completo (Vuelta Maker):
  // 1. Compra de USDT con Bolívares:
  //    Invierto monto en VES = Capital USDT * Tasa Compra
  const bolivaresInvertidos = capitalUSDT * tasaCompraEfectiva;
  const comisionCompraUSDT = capitalUSDT * comisionMaker;
  const usdtNetosRecibidos = capitalUSDT - comisionCompraUSDT;

  // 2. Venta de USDT por Bolívares:
  //    Vendo los USDT netos a la tasa de venta
  const bolivaresBrutosVenta = usdtNetosRecibidos * tasaVenta;
  const comisionVentaVES = bolivaresBrutosVenta * comisionMaker;
  const bolivaresNetosVenta = bolivaresBrutosVenta - comisionVentaVES;

  // 3. Resultado Financiero de la Vuelta:
  const gananciaNetaVES = bolivaresNetosVenta - bolivaresInvertidos;
  const gananciaNetaUSDT = tasaVenta > 0 ? gananciaNetaVES / tasaVenta : 0;
  const margenNetoReal = bolivaresInvertidos > 0 ? (gananciaNetaVES / bolivaresInvertidos) * 100 : 0;

  return (
    <Card className="border-surface-600 bg-surface-800">
      <div className="flex items-center justify-between border-b border-surface-600/70 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧮</span>
          <div>
            <h3 className="text-sm font-bold text-white">Calculadora Táctica de Ciclo Maker</h3>
            <p className="text-[11px] text-muted">
              Simulador exacto con comisiones Binance P2P (0.25% entrada + 0.25% salida)
            </p>
          </div>
        </div>
        <div className="flex bg-surface-700 p-0.5 rounded-lg border border-surface-600 text-xs">
          <button
            onClick={() => setModo('AUTO_MAKER')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              modo === 'AUTO_MAKER' ? 'bg-brand text-surface-900 font-bold' : 'text-muted hover:text-white'
            }`}
          >
            Fórmula Maker
          </button>
          <button
            onClick={() => setModo('MANUAL')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              modo === 'MANUAL' ? 'bg-brand text-surface-900 font-bold' : 'text-muted hover:text-white'
            }`}
          >
            Manual
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {/* Input Capital */}
        <div>
          <label className="text-[11px] font-semibold text-muted block mb-1">
            Capital por Vuelta (USDT)
          </label>
          <div className="relative">
            <input
              type="number"
              step="10"
              min="10"
              value={capitalUSDT}
              onChange={(e) => setCapitalUSDT(Math.max(1, Number(e.target.value)))}
              className="w-full bg-surface-900 border border-surface-600 rounded-lg py-1.5 px-3 text-sm text-white font-semibold focus:border-brand focus:outline-none"
            />
            <span className="absolute right-3 top-2 text-xs text-muted">USDT</span>
          </div>
        </div>

        {/* Input Tasa Venta */}
        <div>
          <label className="text-[11px] font-semibold text-muted block mb-1">
            Tasa de Venta Estimada (VES)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              value={tasaVenta}
              onChange={(e) => setTasaVenta(Number(e.target.value))}
              className="w-full bg-surface-900 border border-surface-600 rounded-lg py-1.5 px-3 text-sm text-white font-semibold focus:border-brand focus:outline-none"
            />
            <span className="absolute right-3 top-2 text-xs text-muted">VES</span>
          </div>
        </div>

        {/* Margen deseado o Tasa Compra Manual */}
        <div>
          {modo === 'AUTO_MAKER' ? (
            <>
              <label className="text-[11px] font-semibold text-muted block mb-1">
                Margen Objetivo Deseado (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={margenDeseado}
                  onChange={(e) => setMargenDeseado(Number(e.target.value))}
                  className="w-full bg-surface-900 border border-surface-600 rounded-lg py-1.5 px-3 text-sm text-brand font-bold focus:border-brand focus:outline-none"
                />
                <span className="absolute right-3 top-2 text-xs text-brand font-bold">%</span>
              </div>
            </>
          ) : (
            <>
              <label className="text-[11px] font-semibold text-muted block mb-1">
                Tasa de Compra Manual (VES)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={tasaCompraManual}
                  onChange={(e) => setTasaCompraManual(Number(e.target.value))}
                  className="w-full bg-surface-900 border border-surface-600 rounded-lg py-1.5 px-3 text-sm text-white font-semibold focus:border-brand focus:outline-none"
                />
                <span className="absolute right-3 top-2 text-xs text-muted">VES</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Resultados de la Vuelta */}
      <div className="bg-surface-900/80 rounded-xl p-4 border border-surface-700 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <span className="text-[10px] text-muted block uppercase tracking-wider">Tasa Publicación Compra</span>
          <span className="text-base font-bold text-brand">
            {formatVES(tasaCompraEfectiva)}
          </span>
          <span className="text-[10px] text-muted block">Máxima recomendada</span>
        </div>

        <div>
          <span className="text-[10px] text-muted block uppercase tracking-wider">Flujo de Bolívares</span>
          <span className="text-xs text-white font-medium block">
            Salida: {formatVES(bolivaresInvertidos)}
          </span>
          <span className="text-xs text-success font-medium block">
            Retorno: {formatVES(bolivaresNetosVenta)}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-muted block uppercase tracking-wider">Ganancia Neta / Vuelta</span>
          <span className={`text-base font-bold ${gananciaNetaVES >= 0 ? 'text-success' : 'text-danger'}`}>
            +{formatUSDT(gananciaNetaUSDT)}
          </span>
          <span className="text-[10px] text-success/80 block">
            ({formatVES(gananciaNetaVES)})
          </span>
        </div>

        <div>
          <span className="text-[10px] text-muted block uppercase tracking-wider">Margen Neto Real</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge variant={margenNetoReal > 1 ? 'success' : margenNetoReal > 0 ? 'warning' : 'danger'}>
              {formatPercent(margenNetoReal)}
            </Badge>
          </div>
          <span className="text-[10px] text-muted block mt-0.5">Comisiones ya deducidas</span>
        </div>
      </div>
    </Card>
  );
}

