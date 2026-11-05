'use client';

import React, { useState, useEffect } from 'react';
import type { ChatMessage } from '@/types/analytics';
import { Badge } from '@/components/ui/Badge';
import { formatVES, formatUSDT } from '@/lib/utils/currency';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [formattedTime, setFormattedTime] = useState<string>('');

  useEffect(() => {
    try {
      const d = new Date(message.timestamp);
      setFormattedTime(
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    } catch {
      setFormattedTime('');
    }
  }, [message.timestamp]);

  const json = message.parsedJson;

  return (
    <div className={`flex flex-col mb-4 ${isUser ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-1.5 mb-1 px-1">
        <span className="text-[11px] font-semibold text-muted">
          {isUser ? 'Tú' : '📊 Asistente Financiero P2P'}
        </span>
        <span className="text-[10px] text-muted/70">{formattedTime}</span>
      </div>

      <div
        className={`max-w-[90%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-brand text-surface-900 font-medium rounded-br-none shadow-md shadow-brand/10'
            : 'bg-surface-700 border border-surface-600 text-slate-200 rounded-bl-none shadow-md'
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>

        {/* Tarjeta de Cierre Real Embebido si viene en la respuesta */}
        {json && json.control_diario_real && (
          <div className="mt-3 pt-3 border-t border-surface-600/70 text-xs text-slate-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-brand font-bold">Balanza de Ganancias Confirmada:</span>
              <Badge variant="success" className="text-[10px]">
                {json.control_diario_real.fecha}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] bg-surface-800/80 p-2.5 rounded-lg border border-surface-600/60">
              <div>
                <span className="text-muted block">Ganancia Neta Real:</span>
                <span className="text-success font-bold">
                  {formatUSDT(json.control_diario_real.ganancia_neta_real_usdt)}
                </span>
                <span className="text-[10px] text-muted block">
                  ({formatVES(json.control_diario_real.ganancia_neta_real_ves)})
                </span>
              </div>
              <div>
                <span className="text-muted block">Comisiones Deductivas:</span>
                <span className="text-danger font-semibold">
                  -{formatUSDT(json.control_diario_real.comisiones_pagadas_usdt)}
                </span>
                <span className="text-[10px] text-muted block">
                  {json.control_diario_real.ordenes_completadas} órdenes completadas
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
