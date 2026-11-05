'use client';

import React, { useState } from 'react';
import { AnalyticsCards } from '@/components/dashboard/AnalyticsCards';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { TradeRecommendation } from '@/components/dashboard/TradeRecommendation';
import { ArbitrageCalculator } from '@/components/dashboard/ArbitrageCalculator';
import { RiskAndLimitsWidget } from '@/components/dashboard/RiskAndLimitsWidget';
import { QuickTradeLogger } from '@/components/dashboard/QuickTradeLogger';
import { Neo4jGraphViewer } from '@/components/dashboard/Neo4jGraphViewer';
import { OrderBookTable } from '@/components/dashboard/OrderBookTable';
import { ChatPanel } from '@/components/assistant/ChatPanel';
import { Badge } from '@/components/ui/Badge';
import { useOrderBook } from '@/hooks/useOrderBook';
import { useUserGraph } from '@/hooks/useUserGraph';
import type { AIResponsePayload } from '@/types/analytics';

export default function DashboardPage() {
  const { orderbook, isLoading: isBookLoading, refresh: refreshBook } = useOrderBook();
  const { graph, refresh: refreshGraph } = useUserGraph();

  // Estado dinámico que se retroalimenta del JSON retornado por P2P Flow AI
  const [aiData, setAiData] = useState<AIResponsePayload | null>(null);

  const handleNewAIResponse = (data: AIResponsePayload) => {
    setAiData(data);
  };

  const handleTradeSaved = () => {
    refreshGraph();
  };

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-surface-600/70 bg-surface-800/80 backdrop-blur sticky top-0 z-20 px-4 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center font-black text-surface-900 text-lg shadow-md shadow-brand/20">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-white text-base tracking-tight">P2P Flow AI</h1>
              <Badge variant="brand" className="text-[10px] py-0 px-1.5">USDT/VES</Badge>
              <Badge variant="success" className="text-[10px] py-0 px-1.5">Maker 0.25%</Badge>
            </div>
            <p className="text-[11px] text-muted hidden sm:block">
              Asistente de Arbitraje Binance P2P + Grafo de Restricciones y Aprendizaje (Neo4j)
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
            title="Refrescar mercado y límites"
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
        {/* Métricas Clave y Control Financiero */}
        <AnalyticsCards analytics={aiData?.analytics} />

        {/* Layout en 2 columnas: Analítica/Trading + Chat Asistente */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Columna Izquierda: Suite de Arbitraje Maker (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Widget Táctico Sugerido por P2P Flow AI */}
            <TradeRecommendation recommendation={aiData?.recomendacion_trade} />

            {/* Calculadora Táctica de Ciclo Maker con deducción de comisiones */}
            <ArbitrageCalculator
              currentBuyPrice={orderbook?.bestBuyPrice}
              currentSellPrice={orderbook?.bestSellPrice}
            />

            {/* Monitoreo de Riesgo y Cupos de Pago Móvil / Bancos */}
            <RiskAndLimitsWidget graph={graph} />

            {/* Formulario de Registro Rápido para retroalimentar el Grafo Neo4j */}
            <QuickTradeLogger graph={graph} onTradeSaved={handleTradeSaved} />

            {/* Visualizador del Grafo Neo4j (Nodos y Relaciones de Memoria) */}
            <Neo4jGraphViewer />

            {/* Gráfica de Rendimiento en Recharts */}
            <PerformanceChart data={aiData?.grafica_rendimiento} />

            {/* Libro P2P Binance en Vivo */}
            <OrderBookTable orderbook={orderbook} isLoading={isBookLoading} />
          </div>

          {/* Columna Derecha: Asistente RL Chat Panel (5 cols) */}
          <div className="lg:col-span-5">
            <div className="sticky top-20">
              <ChatPanel onNewAIResponse={handleNewAIResponse} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
