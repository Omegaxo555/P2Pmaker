'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useGraphTopology } from '@/hooks/useGraphTopology';
import type { GraphNode } from '@/types/graphTopology';

export function Neo4jGraphViewer() {
  const { topology, isLoading, refresh } = useGraphTopology();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');

  const nodes = topology?.nodes || [];
  const edges = topology?.edges || [];

  // Posicionamiento SVG para vista tipo mapa de grafo
  const getNodePosition = (node: GraphNode, index: number, total: number) => {
    if (node.label === 'User') {
      return { cx: 450, cy: 220 };
    }
    if (node.label === 'BankMethod') {
      const bankIndex = nodes.filter((n) => n.label === 'BankMethod').indexOf(node);
      const totalBanks = nodes.filter((n) => n.label === 'BankMethod').length || 1;
      const spreadX = 220 + (bankIndex * 460) / Math.max(1, totalBanks - 1);
      return { cx: spreadX, cy: 80 };
    }
    if (node.label === 'Trade') {
      const tradeIndex = nodes.filter((n) => n.label === 'Trade').indexOf(node);
      const totalTrades = nodes.filter((n) => n.label === 'Trade').length || 1;
      const spreadX = 260 + (tradeIndex * 380) / Math.max(1, totalTrades - 1);
      return { cx: spreadX, cy: 360 };
    }
    // Contrapartes
    return { cx: 780, cy: 220 };
  };

  const nodeColorMap: Record<string, { fill: string; stroke: string; text: string }> = {
    User: { fill: '#F0B90B', stroke: '#FFE043', text: '#121418' },
    BankMethod: { fill: '#0ECB81', stroke: '#22E79B', text: '#121418' },
    Trade: { fill: '#3B82F6', stroke: '#60A5FA', text: '#ffffff' },
    Contraparte: { fill: '#F6465D', stroke: '#FF6B7E', text: '#ffffff' },
  };

  const filteredNodes = filterType === 'ALL' ? nodes : nodes.filter((n) => n.label === filterType);

  return (
    <Card className="border-surface-600 bg-surface-800">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-600/70 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🕸️</span>
          <div>
            <h3 className="text-sm font-bold text-white">Visualizador del Grafo Neo4j (Memoria & RL)</h3>
            <p className="text-[11px] text-muted">
              Nodos de Usuario, Métodos Bancarios, Historial de Trades y Contrapartes Bloqueadas
            </p>
          </div>
        </div>

        {/* Filtros de Nodos y Acciones */}
        <div className="flex items-center gap-2">
          <div className="flex bg-surface-900 p-0.5 rounded-lg border border-surface-700 text-xs">
            {['ALL', 'User', 'BankMethod', 'Trade', 'Contraparte'].map((f) => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  filterType === f ? 'bg-surface-700 text-white font-bold' : 'text-muted hover:text-white'
                }`}
              >
                {f === 'ALL' ? 'Todos' : f}
              </button>
            ))}
          </div>

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
        <div className="h-[420px] flex items-center justify-center gap-2 text-xs text-muted">
          <Spinner size="md" />
          <span>Cargando topología de relaciones desde Neo4j...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Canvas SVG del Grafo (8 columnas) */}
          <div className="lg:col-span-8 bg-surface-900/90 rounded-xl border border-surface-700 overflow-hidden relative">
            {/* Leyenda Superior */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-2 text-[10px] z-10 bg-surface-800/80 backdrop-blur px-2.5 py-1.5 rounded-lg border border-surface-700">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand" /> Usuario
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-success" /> Método Bancario
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Trade
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-danger" /> Riesgo / Bloqueado
              </span>
            </div>

            <svg
              viewBox="0 0 900 450"
              className="w-full h-[420px] select-none cursor-grab active:cursor-grabbing"
            >
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="25"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#848E9C" opacity="0.6" />
                </marker>
              </defs>

              {/* Render de Relaciones (Aristas / Edges) */}
              {edges.map((edge) => {
                const sourceNode = nodes.find((n) => n.id === edge.from);
                const targetNode = nodes.find((n) => n.id === edge.to);
                if (!sourceNode || !targetNode) return null;

                const srcPos = getNodePosition(sourceNode, 0, nodes.length);
                const tgtPos = getNodePosition(targetNode, 0, nodes.length);
                const midX = (srcPos.cx + tgtPos.cx) / 2;
                const midY = (srcPos.cy + tgtPos.cy) / 2;

                const isBlocked = edge.type === 'BLOQUEO';
                const strokeColor = isBlocked ? '#F6465D' : '#848E9C';

                return (
                  <g key={edge.id} className="transition-all duration-300">
                    <line
                      x1={srcPos.cx}
                      y1={srcPos.cy}
                      x2={tgtPos.cx}
                      y2={tgtPos.cy}
                      stroke={strokeColor}
                      strokeWidth={isBlocked ? 2 : 1.5}
                      strokeDasharray={isBlocked ? '4 3' : undefined}
                      opacity={0.6}
                      markerEnd="url(#arrow)"
                    />
                    <text
                      x={midX}
                      y={midY - 4}
                      fill="#848E9C"
                      fontSize="9"
                      textAnchor="middle"
                      className="font-mono bg-surface-900"
                    >
                      {edge.label}
                    </text>
                  </g>
                );
              })}

              {/* Render de Nodos */}
              {filteredNodes.map((node, index) => {
                const pos = getNodePosition(node, index, nodes.length);
                const colors = nodeColorMap[node.label] || nodeColorMap.User;
                const isSelected = selectedNode?.id === node.id;

                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className="cursor-pointer group"
                    transform={`translate(${pos.cx}, ${pos.cy})`}
                  >
                    {/* Anillo de selección */}
                    {isSelected && (
                      <circle r="34" fill="none" stroke="#FFE043" strokeWidth="2.5" className="animate-pulse" />
                    )}

                    {/* Círculo Principal */}
                    <circle
                      r="26"
                      fill={colors.fill}
                      stroke={isSelected ? '#ffffff' : colors.stroke}
                      strokeWidth="2"
                      className="transition-transform group-hover:scale-110 drop-shadow-md"
                    />

                    {/* Ícono / Sigla en el nodo */}
                    <text
                      textAnchor="middle"
                      dy="4"
                      fontSize="11"
                      fontWeight="bold"
                      fill={colors.text}
                      pointerEvents="none"
                    >
                      {node.label === 'User' ? '👤' : node.label === 'BankMethod' ? '🏦' : node.label === 'Trade' ? '⚡' : '🚫'}
                    </text>

                    {/* Título bajo el nodo */}
                    <text
                      textAnchor="middle"
                      dy="42"
                      fontSize="10"
                      fontWeight="600"
                      fill="#eaecef"
                      className="group-hover:fill-brand transition-colors"
                    >
                      {node.title}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Panel Lateral Inspector de Nodo y Propiedades (4 columnas) */}
          <div className="lg:col-span-4 bg-surface-900/90 rounded-xl p-4 border border-surface-700 flex flex-col justify-between h-[420px]">
            <div>
              <div className="border-b border-surface-700 pb-2.5 mb-3 flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Inspector de Nodos
                </span>
                {selectedNode && (
                  <Badge variant={selectedNode.label === 'User' ? 'brand' : selectedNode.label === 'BankMethod' ? 'success' : 'neutral'}>
                    {selectedNode.label}
                  </Badge>
                )}
              </div>

              {selectedNode ? (
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] text-muted block uppercase">Identificador</span>
                    <h4 className="text-sm font-bold text-white">{selectedNode.title}</h4>
                    <p className="text-xs text-brand font-medium">{selectedNode.sub}</p>
                  </div>

                  <div className="bg-surface-800 p-3 rounded-lg border border-surface-700 space-y-1.5 text-xs">
                    <span className="text-[10px] text-muted block font-semibold uppercase mb-1">
                      Propiedades en Memoria:
                    </span>
                    {Object.entries(selectedNode.properties || {}).map(([key, val]) => (
                      <div key={key} className="flex justify-between items-center text-[11px]">
                        <span className="text-muted font-mono">{key}:</span>
                        <span className="text-white font-semibold truncate max-w-[150px]">
                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="text-[11px] text-muted leading-relaxed">
                    💡 <strong className="text-slate-300">Impacto en el Asistente:</strong> Las relaciones de este nodo determinan automáticamente las restricciones bancarias diarias y los métodos prioritarios sugeridos por P2P Flow AI.
                  </div>
                </div>
              ) : (
                <div className="h-[280px] flex flex-col items-center justify-center text-center p-4 text-muted text-xs">
                  <span className="text-3xl mb-2">👆</span>
                  <p className="font-semibold text-slate-300">Haz clic en cualquier nodo del grafo</p>
                  <p className="text-[11px] mt-1">
                    Inspecciona sus propiedades Cypher, cupos bancarios asociados, relaciones de preferencia y pesos de aprendizaje continuo.
                  </p>
                </div>
              )}
            </div>

            {/* Estadísticas de Nodos Totales */}
            <div className="pt-2 border-t border-surface-700/80 flex justify-between text-[11px] text-muted">
              <span>{nodes.length} Nodos cargados</span>
              <span>{edges.length} Relaciones activas</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
