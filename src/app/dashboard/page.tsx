'use client';

import React, { useState } from 'react';
import { AnalyticsCards } from '@/components/dashboard/AnalyticsCards';
import { TradeRecommendation } from '@/components/dashboard/TradeRecommendation';
import { ArbitrageCalculator } from '@/components/dashboard/ArbitrageCalculator';
import { RiskAndLimitsWidget } from '@/components/dashboard/RiskAndLimitsWidget';
import { QuickTradeLogger } from '@/components/dashboard/QuickTradeLogger';
import { Neo4jGraphViewer } from '@/components/dashboard/Neo4jGraphViewer';
import { OrderHistoryTable } from '@/components/dashboard/OrderHistoryTable';
import { PaymentMethodLimits } from '@/components/dashboard/PaymentMethodLimits';
import { OrderBookTable } from '@/components/dashboard/OrderBookTable';
import { useSWRConfig } from 'swr';
import { Badge } from '@/components/ui/Badge';
import { useOrderBook } from '@/hooks/useOrderBook';
import { useUserGraph } from '@/hooks/useUserGraph';
import type { TradeOrderNode } from '@/types/neo4j';

type DashboardView = 'overview' | 'orders' | 'graph' | 'market';

const views: Array<{ id: DashboardView; label: string }> = [
  { id: 'overview', label: 'Resumen' },
  { id: 'orders', label: 'Órdenes' },
  { id: 'graph', label: 'Grafo' },
  { id: 'market', label: 'Mercado y pagos' },
];

export default function DashboardPage() {
  const [activeView, setActiveView] = useState<DashboardView>('overview');
  const [editingOrder, setEditingOrder] = useState<TradeOrderNode | null>(null);
  const { mutate } = useSWRConfig();
  const { orderbook, isLoading: isBookLoading, isError: isBookError, refresh: refreshBook } = useOrderBook();
  const { graph, refresh: refreshGraph } = useUserGraph();

  const dClose = graph?.daily_close;
  const controlFinanciero = {
    capital_actual_usdt: dClose?.capital_actual_usdt ?? 0,
    ganancia_neta_real_ves: dClose?.ganancia_neta_real_ves ?? 0,
    ganancia_neta_real_usdt: dClose?.ganancia_neta_real_usdt ?? 0,
    ordenes_completadas_hoy: dClose?.ordenes_completadas_hoy ?? 0,
  };
  const sugerenciaMaker = {
    tasa_compra: orderbook?.bestBuyPrice || 0,
    tasa_venta: orderbook?.bestSellPrice || 0,
    margen_neto_estimado_porc: orderbook?.spreadPercent || 0,
    alerta_limite_banco: (graph?.metodos || []).some(
      (method) => method.disponible_ves !== null && method.disponible_ves <= 5000
    ),
  };

  const handleTradeSaved = async () => {
    setEditingOrder(null);
    await Promise.all([
      refreshGraph(),
      mutate('/api/neo4j/topology'),
    ]);
  };

  const handleLimitSaved = async () => {
    await Promise.all([
      refreshGraph(),
      mutate('/api/neo4j/topology'),
    ]);
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface-900">
      <header className="sticky top-0 z-20 border-b border-surface-600/70 bg-surface-800/95 px-4 py-3 backdrop-blur lg:px-8">
        <div className="mx-auto flex max-w-[1750px] flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg font-black text-surface-900 shadow-md shadow-brand/20">
              P
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-white sm:text-base">P2P Flow AI</h1>
                <Badge variant="brand" className="px-1.5 py-0 text-[10px]">USDT/VES</Badge>
              </div>
              <p className="hidden text-[11px] text-muted sm:block">Control de operaciones y mercado P2P</p>
            </div>
          </div>

          <nav aria-label="Secciones principales" className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
            {views.map((view) => (
              <button
                key={view.id}
                type="button"
                aria-pressed={activeView === view.id}
                onClick={() => {
                  setActiveView(view.id);
                  if (view.id !== 'orders') setEditingOrder(null);
                }}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  activeView === view.id
                    ? 'bg-brand text-surface-900'
                    : 'text-muted hover:bg-surface-700 hover:text-white'
                }`}
              >
                {view.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 text-xs">
            <div className="hidden items-center gap-1.5 md:flex" title={graph?.storage === 'neo4j' ? 'Datos persistidos en Neo4j' : 'Modo sin persistencia: configure Neo4j para conservar datos'}>
              <span className={`h-2 w-2 rounded-full ${graph?.storage === 'neo4j' ? 'bg-success' : 'bg-amber-400'}`} />
              <span className="text-[11px] text-muted">
                {graph?.storage === 'neo4j' ? 'Neo4j persistente' : graph ? 'Memoria temporal' : 'Conectando'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                void refreshBook();
                void refreshGraph();
              }}
              className="flex items-center gap-1.5 rounded-lg border border-surface-600 bg-surface-700 px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-surface-600 hover:text-white"
              title="Actualizar datos"
            >
              <span aria-hidden="true">↻</span>
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1750px] flex-1 space-y-5 p-4 lg:p-6">
        {activeView === 'overview' && (
          <>
            <AnalyticsCards control={controlFinanciero} />
            <TradeRecommendation recommendation={sugerenciaMaker} />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <ArbitrageCalculator
                currentBuyPrice={orderbook?.bestBuyPrice}
                currentSellPrice={orderbook?.bestSellPrice}
              />
              <RiskAndLimitsWidget
                graph={graph}
                paymentMethods={orderbook?.paymentMethods}
                onLimitSaved={handleLimitSaved}
              />
            </div>
          </>
        )}

        {activeView === 'orders' && (
          <>
            <QuickTradeLogger
              key={editingOrder?.id || 'new-order'}
              graph={graph}
              paymentMethods={orderbook?.paymentMethods}
              initialOrder={editingOrder}
              onTradeSaved={handleTradeSaved}
              onCancelEdit={() => setEditingOrder(null)}
            />
            <OrderHistoryTable
              orders={graph?.todas_ordenes_hoy || []}
              onEdit={(order) => {
                setEditingOrder(order);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </>
        )}

        {activeView === 'graph' && (
          <Neo4jGraphViewer
            orders={graph?.todas_ordenes_hoy || []}
            onOrderSaved={handleTradeSaved}
          />
        )}

        {activeView === 'market' && (
          <>
            <OrderBookTable
              orderbook={orderbook}
              isLoading={isBookLoading}
              isError={Boolean(isBookError)}
            />
            <PaymentMethodLimits
              methods={orderbook?.paymentMethods || []}
              updatedAt={orderbook?.timestamp}
            />
            <p className="text-[10px] text-muted">
              Datos obtenidos de los anuncios públicos de{' '}
              <a
                href="https://p2p.binance.com/trade/all-payments/USDT?fiat=VES"
                target="_blank"
                rel="noreferrer"
                className="text-brand underline underline-offset-2"
              >
                Binance P2P
              </a>
              . Los rangos de la pantalla son una muestra dinámica, no garantías de disponibilidad ni topes bancarios.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
