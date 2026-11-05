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

  // Balanza real obtenida del grafo del usuario
  const controlDiario = {
    fecha: graph?.cierre_diario_actual?.fecha || new Date().toISOString().split('T')[0],
    ordenes_completadas: graph?.cierre_diario_actual?.ordenes_totales || 0,
    capital_rotado_usdt: graph?.cierre_diario_actual?.capital_rotado_usdt || 0,
    ganancia_neta_real_usdt: graph?.cierre_diario_actual?.ganancia_neta_usdt || 0,
    ganancia_neta_real_ves: graph?.cierre_diario_actual?.ganancia_neta_ves || 0,
    comisiones_pagadas_usdt: graph?.cierre_diario_actual?.comisiones_pagadas_usdt || 0,
  };

  // Recomendación de mercado basada estrictamente en la profundidad de la API
  const recomendacionMercado = {
    tasa_compra_sugerida: orderbook?.bestBuyPrice || 0,
    tasa_venta_sugerida: orderbook?.bestSellPrice || 0,
    spread_teorico_porc: orderbook?.spreadPercent || 0,
    requiere_confirmacion_usuario: true,
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
                Control Financiero & Arbitraje P2P Binance
              </h1>
              <Badge variant="brand" className="text-[10px] py-0 px-1.5">USDT/VES</Badge>
              <Badge variant="success" className="text-[10px] py-0 px-1.5">Contabilidad Real</Badge>
            </div>
            <p className="text-[11px] text-muted hidden sm:block">
              Grafo de Transacciones Reales (Neo4j) + Separación Estricta de Variables de Mercado (Binance API)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {/* Métodos de Pago Disponibles en Grafo */}
          <div className="hidden lg:flex items-center gap-2">
            {graph?.metodos?.map((m, idx) => (
              <div key={idx} className="bg-surface-700 border border-surface-600 px-2 py-1 rounded text-[11px]">
                <span className="text-muted">{m.banco.name.split('-')[1]?.trim() || m.banco.name}: </span>
                <span className="font-semibold text-white">{m.disponible_hoy.toLocaleString()} VES</span>
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

      {/* Main Content Dashboard - Vista completa a ancho completo */}
      <main className="flex-1 p-4 lg:p-6 max-w-[1750px] w-full mx-auto space-y-5">
        {/* Balanza Diaria de Ganancias y Control Financiero Real */}
        <AnalyticsCards control={controlDiario} />

        {/* Variables de Mercado Externas (Binance API) */}
        <TradeRecommendation recommendation={recomendacionMercado} />

        {/* Grid de 2 Columnas para Herramientas de Cálculo y Registro */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Calculadora Táctica de Ciclo Maker */}
          <ArbitrageCalculator
            currentBuyPrice={orderbook?.bestBuyPrice}
            currentSellPrice={orderbook?.bestSellPrice}
          />

          {/* Módulo de Registro: Ofertas Maker (CREATE_AD) y Órdenes Reales (EXECUTE_ORDER) */}
          <QuickTradeLogger graph={graph} onTradeSaved={handleTradeSaved} />
        </div>

        {/* Monitoreo de Límites y Cupos Bancarios Reales */}
        <RiskAndLimitsWidget graph={graph} />

        {/* Visualizador del Grafo Neo4j (Memoria & Telemetría Real) */}
        <Neo4jGraphViewer />

        {/* Libro P2P Binance en Vivo (Variables Volátiles) */}
        <OrderBookTable orderbook={orderbook} isLoading={isBookLoading} />
      </main>
    </div>
  );
}
