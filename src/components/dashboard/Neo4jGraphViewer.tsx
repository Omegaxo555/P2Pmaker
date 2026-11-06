'use client';

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { QuickTradeLogger } from '@/components/dashboard/QuickTradeLogger';
import { useGraphTopology } from '@/hooks/useGraphTopology';
import type { GraphNode, GraphEdge } from '@/types/graphTopology';
import type { TradeOrderNode } from '@/types/neo4j';

interface Neo4jGraphViewerProps {
  orders: TradeOrderNode[];
  onOrderSaved?: () => void;
}

export function Neo4jGraphViewer({ orders, onOrderSaved }: Neo4jGraphViewerProps) {
  const { topology, isLoading, refresh } = useGraphTopology();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [editingOrder, setEditingOrder] = useState<TradeOrderNode | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');

  // Nivel de Expansión Progresiva del Grafo (0: Solo Usuario, 1: +DailyClose, 2: +BankMethods, 3: +TradeOrders)
  const [expansionTier, setExpansionTier] = useState<number>(3);
  const [isAutoExpanding, setIsAutoExpanding] = useState<boolean>(false);

  // Estado del Mapa Interactivo (Zoom & Pan)
  const [transform, setTransform] = useState<{ x: number; y: number; k: number }>({
    x: 0,
    y: 0,
    k: 1,
  });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const rawNodes = topology?.nodes || [];
  const rawEdges = topology?.edges || [];

  // Auto-expansión progresiva paso a paso
  useEffect(() => {
    if (isAutoExpanding) {
      if (expansionTier < 3) {
        const timer = setTimeout(() => {
          setExpansionTier((prev) => prev + 1);
        }, 800);
        return () => clearTimeout(timer);
      } else {
        setIsAutoExpanding(false);
      }
    }
  }, [isAutoExpanding, expansionTier]);

  const handleStartExpansion = () => {
    setExpansionTier(0);
    setIsAutoExpanding(true);
  };

  // Nodos visibles según el nivel de expansión y filtro
  const visibleNodes = useMemo(() => {
    return rawNodes.filter((n) => {
      const matchTier = n.tier <= expansionTier;
      const matchFilter = filterType === 'ALL' || n.label === filterType;
      return matchTier && matchFilter;
    });
  }, [rawNodes, expansionTier, filterType]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  const visibleEdges = useMemo(() => {
    return rawEdges.filter((e) => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to));
  }, [rawEdges, visibleNodeIds]);

  // Cálculo de Distribución en Árbol Jerárquico:
  // User (Centro Arriba) -> DailyClose (Centro) -> BankMethods (Abanico) -> TradeOrders (Hijos de su Banco)
  const nodePositions = useMemo(() => {
    const positions: Record<string, { cx: number; cy: number }> = {};
    const center = { x: 500, y: 290 };

    // TIER 0: User (x: 500, y: 80)
    const userNode = rawNodes.find((n) => n.tier === 0);
    if (userNode) {
      positions[userNode.id] = { cx: center.x, cy: 90 };
    }

    // TIER 1: DailyClose (x: 500, y: 210)
    const dailyNode = rawNodes.find((n) => n.tier === 1);
    if (dailyNode) {
      positions[dailyNode.id] = { cx: center.x, cy: 220 };
    }

    // TIER 2: BankMethods (Fila / Abanico distribuido horizontalmente a y: 350)
    const bankNodes = rawNodes.filter((n) => n.tier === 2);
    const totalBanks = bankNodes.length;
    const bankSpacingX = 280; // Distancia entre bancos
    const startBankX = center.x - ((totalBanks - 1) * bankSpacingX) / 2;

    bankNodes.forEach((b, bIdx) => {
      const bankX = totalBanks === 1 ? center.x : startBankX + bIdx * bankSpacingX;
      const bankY = 360;
      positions[b.id] = { cx: bankX, cy: bankY };

      // TIER 3: TradeOrders que pertenecen a este BankMethod
      const orderNodes = rawNodes.filter((n) => n.tier === 3 && n.parentId === b.id);
      const totalOrdersInBank = orderNodes.length;
      const orderSpacingX = 85;
      const startOrderX = bankX - ((totalOrdersInBank - 1) * orderSpacingX) / 2;

      orderNodes.forEach((ord, oIdx) => {
        const orderX =
          totalOrdersInBank === 1
            ? bankX
            : startOrderX + oIdx * orderSpacingX;
        // Alternar ligeramente en Y para evitar solapamientos si hay muchas órdenes
        const orderY = 480 + (oIdx % 2 === 0 ? 0 : 25);
        positions[ord.id] = { cx: orderX, cy: orderY };
      });
    });

    return positions;
  }, [rawNodes]);

  // Manejo de Zoom con rueda del ratón
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setTransform((prev) => {
      const nextK = Math.min(Math.max(0.35, prev.k * zoomFactor), 4.5);
      if (!svgContainerRef.current) return { ...prev, k: nextK };

      const rect = svgContainerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const nextX = mouseX - (mouseX - prev.x) * (nextK / prev.k);
      const nextY = mouseY - (mouseY - prev.y) * (nextK / prev.k);

      return { x: nextX, y: nextY, k: nextK };
    });
  }, []);

  // Manejo de Pan (Arrastre)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    setTransform((prev) => ({
      ...prev,
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    }));
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const resetView = () => {
    setTransform({ x: 0, y: 0, k: 1 });
  };

  const nodeColorMap: Record<string, { fill: string; stroke: string; text: string }> = {
    User: { fill: '#F0B90B', stroke: '#FFE043', text: '#121418' },
    DailyClose: { fill: '#E040FB', stroke: '#EA80FC', text: '#ffffff' },
    BankMethod: { fill: '#0ECB81', stroke: '#22E79B', text: '#121418' },
    TradeOrder: { fill: '#3B82F6', stroke: '#60A5FA', text: '#ffffff' },
  };

  return (
    <Card className="border-surface-600 bg-surface-800">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-600/70 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🕸️</span>
          <div>
            <h3 className="text-sm font-bold text-white">
              Grafo Jerárquico: Usuario ➔ Cierre Diario ➔ Métodos de Pago ➔ Órdenes
            </h3>
            <p className="text-[11px] text-muted">
              Expansión progresiva nodo por nodo con relaciones ordenadas y zoom interactivo
            </p>
          </div>
        </div>

        {/* Controles de Expansión Progresiva y Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Barra de Expansión Paso a Paso */}
          <div className="flex items-center bg-surface-900 px-2 py-1 rounded-lg border border-surface-700 text-xs gap-1.5">
            <span className="text-[10px] text-muted font-semibold">NIVEL:</span>
            {[
              { tier: 0, label: '1. User' },
              { tier: 1, label: '2. Cierre' },
              { tier: 2, label: '3. Bancos' },
              { tier: 3, label: '4. Órdenes' },
            ].map((st) => (
              <button
                key={st.tier}
                onClick={() => setExpansionTier(st.tier)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                  expansionTier >= st.tier
                    ? 'bg-brand text-surface-900 font-bold'
                    : 'bg-surface-800 text-muted hover:text-white'
                }`}
              >
                {st.label}
              </button>
            ))}

            <button
              onClick={handleStartExpansion}
              className="ml-1 px-2 py-0.5 rounded text-[10px] bg-surface-700 hover:bg-surface-600 text-brand font-bold border border-brand/40"
              title="Reproducir animación de expansión progresiva nodo por nodo"
            >
              ▶ Expandir
            </button>
          </div>

          <button
            onClick={resetView}
            className="px-2.5 py-1 rounded-lg bg-surface-700 hover:bg-surface-600 text-slate-200 border border-surface-600 text-xs font-medium transition-colors"
          >
            🎯 Centrar
          </button>

          <button
            onClick={() => refresh()}
            className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 text-muted hover:text-white border border-surface-600 text-xs transition-colors"
            title="Refrescar grafo"
          >
            🔄
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[520px] flex items-center justify-center gap-2 text-xs text-muted">
          <Spinner size="md" />
          <span>Cargando topología de relaciones...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Canvas SVG Interactivo (8 columnas) */}
          <div
            ref={svgContainerRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`lg:col-span-8 bg-surface-900/95 rounded-xl border border-surface-700 overflow-hidden relative h-[520px] select-none ${
              isPanning ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            {/* Controles Flotantes de Zoom */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-surface-800/90 backdrop-blur px-2 py-1 rounded-lg border border-surface-700 z-10 text-xs text-muted">
              <button
                onClick={() =>
                  setTransform((prev) => ({ ...prev, k: Math.min(4.5, prev.k * 1.25) }))
                }
                className="w-6 h-6 flex items-center justify-center bg-surface-700 hover:bg-surface-600 rounded text-white font-bold"
              >
                +
              </button>
              <span className="font-mono text-[11px] px-1 text-slate-200">
                {(transform.k * 100).toFixed(0)}%
              </span>
              <button
                onClick={() =>
                  setTransform((prev) => ({ ...prev, k: Math.max(0.35, prev.k * 0.8) }))
                }
                className="w-6 h-6 flex items-center justify-center bg-surface-700 hover:bg-surface-600 rounded text-white font-bold"
              >
                -
              </button>
            </div>

            {/* Leyenda de Capas Jerárquicas */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-2.5 text-[10px] z-10 bg-surface-800/85 backdrop-blur px-3 py-1.5 rounded-lg border border-surface-700">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand" /> 1. Usuario
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E040FB]" /> 2. Cierre Diario
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-success" /> 3. Métodos de Pago
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> 4. Órdenes Completadas
              </span>
            </div>

            <svg viewBox="0 0 1000 620" className="w-full h-full">
              <defs>
                <marker
                  id="arrow-subtle"
                  viewBox="0 0 10 10"
                  refX="17"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#848E9C" opacity="0.45" />
                </marker>
              </defs>

              <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
                {/* Cuadrícula de fondo */}
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1A1D23" strokeWidth="0.8" />
                </pattern>
                <rect x="-1500" y="-1500" width="4000" height="4000" fill="url(#grid)" />

                {/* Aristas / Relaciones Jerárquicas */}
                {visibleEdges.map((edge) => {
                  const srcPos = nodePositions[edge.from];
                  const tgtPos = nodePositions[edge.to];
                  if (!srcPos || !tgtPos) return null;

                  const midX = (srcPos.cx + tgtPos.cx) / 2;
                  const midY = (srcPos.cy + tgtPos.cy) / 2;

                  return (
                    <g key={edge.id} className="transition-all duration-500 animate-fadeIn">
                      <line
                        x1={srcPos.cx}
                        y1={srcPos.cy}
                        x2={tgtPos.cx}
                        y2={tgtPos.cy}
                        stroke="#4E5562"
                        strokeWidth={1.4}
                        opacity={0.7}
                        markerEnd="url(#arrow-subtle)"
                      />
                      <rect
                        x={midX - 35}
                        y={midY - 8}
                        width="70"
                        height="14"
                        rx="3"
                        fill="#121418"
                        opacity={0.88}
                      />
                      <text
                        x={midX}
                        y={midY + 2}
                        fill="#848E9C"
                        fontSize="7.5"
                        textAnchor="middle"
                        className="font-mono font-medium"
                      >
                        {edge.label}
                      </text>
                    </g>
                  );
                })}

                {/* Vértices / Nodos Compactos */}
                {visibleNodes.map((node) => {
                  const pos = nodePositions[node.id] || { cx: 500, cy: 300 };
                  const colors = nodeColorMap[node.label] || nodeColorMap.User;
                  const isSelected = selectedNode?.id === node.id;
                  const radius = node.label === 'User' ? 18 : node.label === 'DailyClose' ? 16 : 13;

                  return (
                    <g
                      key={node.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNode(node);
                      }}
                      className="cursor-pointer group transition-all duration-500 animate-scaleIn"
                      transform={`translate(${pos.cx}, ${pos.cy})`}
                    >
                      {/* Halo de Selección */}
                      {isSelected && (
                        <circle
                          r={radius + 7}
                          fill="none"
                          stroke="#FFE043"
                          strokeWidth="2"
                          className="animate-pulse"
                        />
                      )}

                      {/* Círculo Principal Compacto */}
                      <circle
                        r={radius}
                        fill={colors.fill}
                        stroke={isSelected ? '#ffffff' : colors.stroke}
                        strokeWidth="1.8"
                        className="transition-transform group-hover:scale-125 drop-shadow-md"
                      />

                      {/* Ícono Simbólico dentro del círculo */}
                      <text
                        textAnchor="middle"
                        dy="3.5"
                        fontSize="9"
                        fontWeight="bold"
                        fill={colors.text}
                        pointerEvents="none"
                      >
                        {node.label === 'User'
                          ? '👤'
                          : node.label === 'DailyClose'
                          ? '📅'
                          : node.label === 'BankMethod'
                          ? '🏦'
                          : '⚡'}
                      </text>

                      {/* Título de la Entidad */}
                      <text
                        textAnchor="middle"
                        dy={radius + 12}
                        fontSize="8"
                        fontWeight="600"
                        fill="#eaecef"
                        className="group-hover:fill-brand transition-colors drop-shadow"
                      >
                        {node.title.length > 22
                          ? `${node.title.substring(0, 20)}...`
                          : node.title}
                      </text>

                      {/* Subtítulo / Valores */}
                      <text
                        textAnchor="middle"
                        dy={radius + 21}
                        fontSize="6.8"
                        fill="#848E9C"
                      >
                        {node.sub.length > 26 ? `${node.sub.substring(0, 24)}...` : node.sub}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Panel Lateral Inspector de Nodo (4 columnas) */}
          <div className="lg:col-span-4 bg-surface-900/90 rounded-xl p-4 border border-surface-700 flex flex-col justify-between h-[520px]">
            <div>
              <div className="border-b border-surface-700 pb-2.5 mb-3 flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Inspector de Nodos
                </span>
                {selectedNode && (
                  <Badge
                    variant={
                      selectedNode.label === 'User'
                        ? 'brand'
                        : selectedNode.label === 'BankMethod'
                        ? 'success'
                        : selectedNode.label === 'DailyClose'
                        ? 'warning'
                        : 'neutral'
                    }
                  >
                    Tier {selectedNode.tier} • {selectedNode.label}
                  </Badge>
                )}
              </div>

              {selectedNode ? (
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] text-muted block uppercase">Entidad Seleccionada</span>
                    <h4 className="text-sm font-bold text-white">{selectedNode.title}</h4>
                    <p className="text-xs text-brand font-medium">{selectedNode.sub}</p>
                  </div>

                  {selectedNode.label === 'TradeOrder' &&
                    orders.some((order) => order.id === selectedNode.id) && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditingOrder(orders.find((order) => order.id === selectedNode.id) || null)
                      }
                      className="w-full rounded-lg bg-brand px-3 py-2 text-xs font-bold text-surface-900 transition-colors hover:bg-brand-hover"
                    >
                      Editar datos de esta orden
                    </button>
                  )}

                  <div className="bg-surface-800 p-3 rounded-lg border border-surface-700 space-y-1.5 text-xs max-h-[250px] overflow-y-auto">
                    <span className="text-[10px] text-muted block font-semibold uppercase mb-1">
                      Propiedades Cypher en Memoria:
                    </span>
                    {Object.entries(selectedNode.properties || {}).map(([key, val]) => (
                      <div
                        key={key}
                        className="flex justify-between items-center text-[11px] py-0.5 border-b border-surface-700/50"
                      >
                        <span className="text-muted font-mono">{key}:</span>
                        <span className="text-white font-semibold truncate max-w-[150px]">
                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="text-[11px] text-muted leading-relaxed">
                    💡 <strong className="text-slate-300">Estructura Jerárquica:</strong> Las órdenes completadas nacen y se desprenden exclusivamente de su método de pago correspondiente, alimentando el balance consolidado del día en el nodo central <code>DailyClose</code>.
                  </div>
                </div>
              ) : (
                <div className="h-[340px] flex flex-col items-center justify-center text-center p-4 text-muted text-xs">
                  <span className="text-3xl mb-2">🕸️</span>
                  <p className="font-semibold text-slate-300">Explorador de Grafo Jerárquico</p>
                  <p className="text-[11px] mt-1 text-muted leading-relaxed">
                    Haz clic en los botones de nivel (1 a 4) o presiona <strong>▶ Expandir</strong> para ver el árbol nacer progresivamente: Usuario ➔ Cierre ➔ Métodos ➔ Órdenes.
                  </p>
                  <p className="text-[10px] text-brand/80 mt-2 font-mono">
                    Rueda del ratón: Zoom • Arrastre: Desplazarse • Clic: Inspeccionar
                  </p>
                </div>
              )}
            </div>

            {/* Estadísticas de Nodos Visibles */}
            <div className="pt-2 border-t border-surface-700/80 flex justify-between text-[11px] text-muted font-mono">
              <span>{visibleNodes.length} de {rawNodes.length} Nodos</span>
              <span>{visibleEdges.length} Relaciones</span>
            </div>
          </div>
        </div>
      )}
      {editingOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="graph-order-editor-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditingOrder(null);
          }}
        >
          <div className="w-full max-w-4xl">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="rounded-lg border border-surface-600 bg-surface-800 px-3 py-1.5 text-xs text-white hover:bg-surface-700"
                aria-label="Cerrar editor de orden"
              >
                Cerrar
              </button>
            </div>
            <div id="graph-order-editor-title" className="sr-only">Editar orden</div>
            <QuickTradeLogger
              key={editingOrder.id}
              initialOrder={editingOrder}
              onTradeSaved={() => {
                setEditingOrder(null);
                onOrderSaved?.();
              }}
              onCancelEdit={() => setEditingOrder(null)}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
