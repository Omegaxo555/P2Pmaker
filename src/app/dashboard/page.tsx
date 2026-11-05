'use client';

import React from 'react';
import { AnalyticsCards } from '@/components/dashboard/AnalyticsCards';
import { TradeRecommendation } from '@/components/dashboard/TradeRecommendation';
import { ArbitrageCalculator } from '@/components/dashboard/ArbitrageCalculator';
import { RiskAndLimitsWidget } from '@/components/dashboard/RiskAndLimitsWidget';
import { QuickTradeLogger } from '@/components/dashboard/QuickTradeLogger';
import { Neo4jGraphViewer } from '@/components/dashboard/Neo4jGraphViewer';
import { OrderBookTable } from '@/components/dashboard/OrderBookTable';
import { Badge } from '@/components/ui/Badge';
import { useOrderBook } from '@/hooks/useOrderBook';
import { useUserGraph } from '@/hooks/useUserGraph';

export default function DashboardPage() {
  const { orderbook, isLoading: isBookLoading, refresh: refreshBook } = useOrderBook();
  const { graph, refresh: refreshGraph } = useUserGraph();

  const handleTradeSaved = () => {
    refreshGraph();
  };

  const dClose = graph?.daily_close;

  // Control Financiero derivado de las órdenes reales
  const controlFinanciero = {
    capital_actual_usdt: dClose?.capital_actual_usdt || 1000,
    ganancia_neta_real_ves: dClose?.ganancia_neta_real_ves || 0,
    ganancia_neta_real_usdt: dClose?.ganancia_neta_real_usdt || 0,
    ordenes_completadas_hoy: dClose?.ordenes_completadas_hoy || 0,
  };

  // Sugerencia Maker derivada de la profundidad de mercado
  const sugerenciaMaker = {
    tasa_compra: orderbook?.bestBuyPrice || 0,
    tasa_venta: orderbook?.bestSellPrice || 0,
    margen_neto_estimado_porc: orderbook?.spreadPercent || 0,
    alerta_limite_banco: (graph?.metodos || []).some((m) => m.disponible_ves <= 5000),
  };

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-surface-600/70 bg-surface-800/80 backdrop-blur sticky top-0 z-20 px-4 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center font-black text-surface-900 text-lg shadow-md shadow-brand/20">
            📊
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-white text-base tracking-tight">
                Arbitraje P2P & Control Financiero
              </h1>
              <Badge variant="brand" className="text-[10px] py-0 px-1.5">USDT/VES</Badge>
              <Badge variant="success" className="text-[10px] py-0 px-1.5">Contabilidad Real</Badge>
            </div>
            <p className="text-[11px] text-muted hidden sm:block">
              Grafo Jerárquico: Usuario ➔ Cierre Diario ➔ Métodos de Pago ➔ Órdenes Confirmadas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {/* Métodos de Pago Disponibles en Grafo */}
          <div className="hidden lg:flex items-center gap-2">
            {graph?.metodos?.map((m, idx) => (
              <div key={idx} className="bg-surface-700 border border-surface-600 px-2 py-1 rounded text-[11px]">
                <span className="text-muted">{m.banco.name.split('-')[1]?.trim() || m.banco.name}: </span>
                <span className="font-semibold text-white">{m.disponible_ves.toLocaleString()} VES</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              refreshBook();
              refreshGraph();
            }}
            className="bg-surface-700 hover:bg-surface-600 text-muted hover:text-white px-2.5 py-1 rounded-lg border border-surface-600 transition-colors text-xs flex items-center gap-1.5"
            title="Refrescar datos reales"
          >
            <span>🔄</span>
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <div className="flex items-center gap-1.5 bg-surface-800 px-2.5 py-1 rounded-lg border border-surface-700">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-muted text-[11px]">En Vivo</span>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 p-4 lg:p-6 max-w-[1750px] w-full mx-auto space-y-5">
        {/* Balanza Diaria de Ganancias y Control Financiero Real */}
        <AnalyticsCards control={controlFinanciero} />

        {/* Sugerencia Maker (Profundidad API Binance) */}
        <TradeRecommendation recommendation={sugerenciaMaker} />

        {/* Grid de 2 Columnas para Herramientas de Cálculo y Registro */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Calculadora Táctica de Ciclo Maker */}
          <ArbitrageCalculator
            currentBuyPrice={orderbook?.bestBuyPrice}
            currentSellPrice={orderbook?.bestSellPrice}
          />

          {/* Módulo de Registro de Órdenes Reales vinculadas a su método de pago */}
          <QuickTradeLogger graph={graph} onTradeSaved={handleTradeSaved} />
        </div>

        {/* Monitoreo de Límites y Cupos Bancarios Reales */}
        <RiskAndLimitsWidget graph={graph} />

        {/* Visualizador del Grafo Jerárquico e Interactivo */}
        <Neo4jGraphViewer />

        {/* Libro P2P Binance en Vivo (Variables Volátiles) */}
        <OrderBookTable orderbook={orderbook} isLoading={isBookLoading} />
      </main>
    </div>
  );
}
