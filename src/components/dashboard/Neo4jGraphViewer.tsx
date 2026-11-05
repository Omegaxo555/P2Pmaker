'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useGraphTopology } from '@/hooks/useGraphTopology';
import type { GraphNode, GraphEdge } from '@/types/graphTopology';

export function Neo4jGraphViewer() {
  const { topology, isLoading, refresh } = useGraphTopology();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');

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

  // Distribución Radial Inteligente por Capas y Separación Angular para evitar superposiciones
  const nodePositions = useMemo(() => {
    const positions: Record<string, { cx: number; cy: number }> = {};
    const center = { x: 500, y: 300 };

    // 1. Nodo Usuario en el centro
    const userNode = rawNodes.find((n) => n.label === 'User');
    if (userNode) {
      positions[userNode.id] = { cx: center.x, cy: center.y };
    }

    // 2. Nodos Bancarios: Semicírculo Superior (Radio 170px)
    const bankNodes = rawNodes.filter((n) => n.label === 'BankMethod');
    const totalBanks = bankNodes.length;
    bankNodes.forEach((b, i) => {
      const angle =
        totalBanks === 1
          ? -Math.PI / 2
          : -Math.PI + (Math.PI / (totalBanks + 1)) * (i + 1);
      const radius = 175;
      positions[b.id] = {
        cx: center.x + radius * Math.cos(angle),
        cy: center.y + radius * Math.sin(angle),
      };
    });

    // 3. Nodos Trades: Semicírculo Inferior (Radio 210px)
    const tradeNodes = rawNodes.filter((n) => n.label === 'Trade');
    const totalTrades = tradeNodes.length;
    tradeNodes.forEach((t, i) => {
      const angle =
        totalTrades === 1
          ? Math.PI / 2
          : (Math.PI / (totalTrades + 1)) * (i + 1);
      const radius = 215;
      positions[t.id] = {
        cx: center.x + radius * Math.cos(angle),
        cy: center.y + radius * Math.sin(angle),
      };
    });

    // 4. Nodos Contrapartes: Flanco Derecho (Radio 260px)
    const contraparteNodes = rawNodes.filter((n) => n.label === 'Contraparte');
    const totalCP = contraparteNodes.length;
    contraparteNodes.forEach((c, i) => {
      const angle = -Math.PI / 4 + ((Math.PI / 2) / Math.max(1, totalCP + 1)) * (i + 1);
      const radius = 270;
      positions[c.id] = {
        cx: center.x + radius * Math.cos(angle),
        cy: center.y + radius * Math.sin(angle),
      };
    });

    return positions;
  }, [rawNodes]);

  // Manejo de Zoom con rueda del ratón hacia el puntero
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setTransform((prev) => {
      const nextK = Math.min(Math.max(0.4, prev.k * zoomFactor), 4.5);
      if (!svgContainerRef.current) return { ...prev, k: nextK };

      const rect = svgContainerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Zoom centrado en la posición del cursor
      const nextX = mouseX - (mouseX - prev.x) * (nextK / prev.k);
      const nextY = mouseY - (mouseY - prev.y) * (nextK / prev.k);

      return { x: nextX, y: nextY, k: nextK };
    });
  }, []);

  // Manejo de Desplazamiento (Pan / Arrastre del mapa)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Solo clic izquierdo
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
    BankMethod: { fill: '#0ECB81', stroke: '#22E79B', text: '#121418' },
    Trade: { fill: '#3B82F6', stroke: '#60A5FA', text: '#ffffff' },
    Contraparte: { fill: '#F6465D', stroke: '#FF6B7E', text: '#ffffff' },
  };

  const filteredNodes =
    filterType === 'ALL' ? rawNodes : rawNodes.filter((n) => n.label === filterType);

  return (
    <Card className="border-surface-600 bg-surface-800">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-600/70 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🗺️</span>
          <div>
            <h3 className="text-sm font-bold text-white">
              Mapa de Topología del Grafo (Zoom & Desplazamiento)
            </h3>
            <p className="text-[11px] text-muted">
              Usa la rueda del ratón para hacer zoom y arrastra para desplazarte libremente
            </p>
          </div>
        </div>

        {/* Filtros de Nodos y Controles del Mapa */}
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
            onClick={resetView}
            className="px-2.5 py-1 rounded-lg bg-surface-700 hover:bg-surface-600 text-slate-200 border border-surface-600 text-xs font-medium transition-colors"
            title="Centrar y reiniciar zoom"
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
        <div className="h-[460px] flex items-center justify-center gap-2 text-xs text-muted">
          <Spinner size="md" />
          <span>Cargando topología de relaciones desde Neo4j...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Canvas SVG Interactivo con Zoom y Pan (8 columnas) */}
          <div
            ref={svgContainerRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`lg:col-span-8 bg-surface-900/90 rounded-xl border border-surface-700 overflow-hidden relative h-[480px] select-none ${
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
                  setTransform((prev) => ({ ...prev, k: Math.max(0.4, prev.k * 0.8) }))
                }
                className="w-6 h-6 flex items-center justify-center bg-surface-700 hover:bg-surface-600 rounded text-white font-bold"
              >
                -
              </button>
            </div>

            {/* Leyenda Superior */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-2 text-[10px] z-10 bg-surface-800/80 backdrop-blur px-2.5 py-1.5 rounded-lg border border-surface-700">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand" /> Usuario
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success" /> Método Bancario
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> Trade Real
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-danger" /> Riesgo
              </span>
            </div>

            <svg viewBox="0 0 1000 600" className="w-full h-full">
              <defs>
                <marker
                  id="arrow-subtle"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#848E9C" opacity="0.45" />
                </marker>
              </defs>

              {/* Contenedor Transformado para Zoom y Desplazamiento */}
              <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
                {/* Cuadrícula de Fondo Guía sutil */}
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="#1E2329"
                    strokeWidth="0.8"
                  />
                </pattern>
                <rect x="-1000" y="-1000" width="3000" height="3000" fill="url(#grid)" />

                {/* Relaciones (Edges / Aristas) */}
                {rawEdges.map((edge) => {
                  const srcPos = nodePositions[edge.from];
                  const tgtPos = nodePositions[edge.to];
                  if (!srcPos || !tgtPos) return null;

                  const isBlocked = edge.type === 'BLOQUEO';
                  const strokeColor = isBlocked ? '#F6465D' : '#5E6673';
                  const midX = (srcPos.cx + tgtPos.cx) / 2;
                  const midY = (srcPos.cy + tgtPos.cy) / 2;

                  return (
                    <g key={edge.id}>
                      <line
                        x1={srcPos.cx}
                        y1={srcPos.cy}
                        x2={tgtPos.cx}
                        y2={tgtPos.cy}
                        stroke={strokeColor}
                        strokeWidth={isBlocked ? 1.8 : 1.2}
                        strokeDasharray={isBlocked ? '3 3' : undefined}
                        opacity={0.65}
                        markerEnd="url(#arrow-subtle)"
                      />
                      <rect
                        x={midX - 32}
                        y={midY - 9}
                        width="64"
                        height="14"
                        rx="3"
                        fill="#121418"
                        opacity={0.85}
                      />
                      <text
                        x={midX}
                        y={midY + 1}
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

                {/* Nodos (Círculos más pequeños y compactos: r=15) */}
                {filteredNodes.map((node) => {
                  const pos = nodePositions[node.id] || { cx: 500, cy: 300 };
                  const colors = nodeColorMap[node.label] || nodeColorMap.User;
                  const isSelected = selectedNode?.id === node.id;
                  const radius = node.label === 'User' ? 18 : 14;

                  return (
                    <g
                      key={node.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNode(node);
                      }}
                      className="cursor-pointer group"
                      transform={`translate(${pos.cx}, ${pos.cy})`}
                    >
                      {/* Anillo de Selección Pulsante */}
                      {isSelected && (
                        <circle
                          r={radius + 8}
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

                      {/* Ícono Compacto dentro del círculo */}
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
                          : node.label === 'BankMethod'
                          ? '🏦'
                          : node.label === 'Trade'
                          ? '⚡'
                          : '🚫'}
                      </text>

                      {/* Etiqueta / Nombre bajo el nodo */}
                      <text
                        textAnchor="middle"
                        dy={radius + 13}
                        fontSize="8.5"
                        fontWeight="600"
                        fill="#eaecef"
                        className="group-hover:fill-brand transition-colors drop-shadow"
                      >
                        {node.title.length > 20
                          ? `${node.title.substring(0, 18)}...`
                          : node.title}
                      </text>

                      {/* Subtítulo bajo el nombre */}
                      <text
                        textAnchor="middle"
                        dy={radius + 22}
                        fontSize="7"
                        fill="#848E9C"
                      >
                        {node.sub}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Panel Lateral Inspector de Nodo y Propiedades (4 columnas) */}
          <div className="lg:col-span-4 bg-surface-900/90 rounded-xl p-4 border border-surface-700 flex flex-col justify-between h-[480px]">
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
                        : selectedNode.label === 'Trade'
                        ? 'neutral'
                        : 'danger'
                    }
                  >
                    {selectedNode.label}
                  </Badge>
                )}
              </div>

              {selectedNode ? (
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] text-muted block uppercase">Entidad del Grafo</span>
                    <h4 className="text-sm font-bold text-white">{selectedNode.title}</h4>
                    <p className="text-xs text-brand font-medium">{selectedNode.sub}</p>
                  </div>

                  <div className="bg-surface-800 p-3 rounded-lg border border-surface-700 space-y-1.5 text-xs max-h-[220px] overflow-y-auto">
                    <span className="text-[10px] text-muted block font-semibold uppercase mb-1">
                      Propiedades Cypher en Memoria:
                    </span>
                    {Object.entries(selectedNode.properties || {}).map(([key, val]) => (
                      <div key={key} className="flex justify-between items-center text-[11px] py-0.5 border-b border-surface-700/50">
                        <span className="text-muted font-mono">{key}:</span>
                        <span className="text-white font-semibold truncate max-w-[150px]">
                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="text-[11px] text-muted leading-relaxed">
                    💡 <strong className="text-slate-300">Rol en el Sistema:</strong> Este nodo y sus relaciones de telemetría son consultados por los algoritmos para evitar sobrepasar límites bancarios y bloquear contrapartes fraudulentas.
                  </div>
                </div>
              ) : (
                <div className="h-[300px] flex flex-col items-center justify-center text-center p-4 text-muted text-xs">
                  <span className="text-3xl mb-2">🗺️</span>
                  <p className="font-semibold text-slate-300">Explora el mapa del grafo</p>
                  <p className="text-[11px] mt-1 text-muted leading-relaxed">
                    Haz clic en cualquier vértice para inspeccionar sus propiedades, límites bancarios asociados o transacciones confirmadas.
                  </p>
                  <p className="text-[10px] text-brand/80 mt-2 font-mono">
                    Scroll: Zoom • Arrastre: Moverse • Botón Centrar: Reiniciar
                  </p>
                </div>
              )}
            </div>

            {/* Estadísticas de Nodos Totales */}
            <div className="pt-2 border-t border-surface-700/80 flex justify-between text-[11px] text-muted font-mono">
              <span>{rawNodes.length} Nodos</span>
              <span>{rawEdges.length} Relaciones</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
