'use client';

import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatUSDT, formatVES } from '@/lib/utils/currency';
import type { TradeOrderNode } from '@/types/neo4j';

interface OrderHistoryTableProps {
  orders: TradeOrderNode[];
  onEdit: (order: TradeOrderNode) => void;
}

export function OrderHistoryTable({ orders, onEdit }: OrderHistoryTableProps) {
  const [search, setSearch] = useState('');
  const visibleOrders = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return [...orders]
      .filter((order) =>
        !query ||
        order.id.toLocaleLowerCase().includes(query) ||
        order.metodo_pago.toLocaleLowerCase().includes(query) ||
        order.id_contraparte.toLocaleLowerCase().includes(query)
      )
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [orders, search]);

  return (
    <Card className="border-surface-600 bg-surface-800">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-surface-600/70 pb-3">
        <div>
          <h2 className="text-sm font-bold text-white">Órdenes de hoy</h2>
          <p className="text-[11px] text-muted">{orders.length} órdenes registradas</p>
        </div>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar ID, método o contraparte"
          aria-label="Buscar órdenes"
          className="w-full max-w-xs rounded-lg border border-surface-600 bg-surface-900 px-3 py-2 text-xs text-white outline-none focus:border-brand"
        />
      </div>

      {visibleOrders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-600 p-8 text-center text-sm text-muted">
          {orders.length ? 'No hay órdenes que coincidan con la búsqueda.' : 'Todavía no hay órdenes registradas hoy.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-xs">
            <thead className="border-b border-surface-600 text-[10px] uppercase tracking-wide text-muted">
              <tr>
                <th className="py-2 pr-3">Orden / hora</th>
                <th className="py-2 pr-3">Tipo</th>
                <th className="py-2 pr-3">USDT</th>
                <th className="py-2 pr-3">VES / tasa</th>
                <th className="py-2 pr-3">Método</th>
                <th className="py-2 pr-3">Contraparte</th>
                <th className="py-2">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              {visibleOrders.map((order) => (
                <tr key={order.id} className="hover:bg-surface-700/40">
                  <td className="py-3 pr-3">
                    <span className="block font-mono text-white">{order.id.slice(0, 12)}</span>
                    <span className="text-[10px] text-muted">
                      {new Date(order.timestamp).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <Badge variant={order.tipo === 'BUY' ? 'success' : 'danger'}>{order.tipo}</Badge>
                  </td>
                  <td className="py-3 pr-3 font-semibold text-white">{formatUSDT(order.monto_cripto)}</td>
                  <td className="py-3 pr-3">
                    <span className="block text-white">{formatVES(order.monto_fiat)}</span>
                    <span className="text-[10px] text-muted">{formatVES(order.tasa_ejecutada)}/USDT</span>
                  </td>
                  <td className="py-3 pr-3 text-slate-200">{order.metodo_pago}</td>
                  <td className="py-3 pr-3 text-slate-300">{order.id_contraparte}</td>
                  <td className="py-3">
                    <button
                      type="button"
                      onClick={() => onEdit(order)}
                      className="rounded-md border border-surface-600 px-2.5 py-1.5 font-semibold text-brand hover:bg-surface-700"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
