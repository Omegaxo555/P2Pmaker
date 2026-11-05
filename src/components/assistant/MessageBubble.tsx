'use client';

import React from 'react';
import type { ChatMessage } from '@/types/analytics';
import { Badge } from '@/components/ui/Badge';
import { formatVES } from '@/lib/utils/currency';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex flex-col mb-4 ${isUser ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-1.5 mb-1 px-1">
        <span className="text-[11px] font-semibold text-muted">
          {isUser ? 'Tú' : '🤖 P2P Flow AI'}
        </span>
        <span className="text-[10px] text-muted/70">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-brand text-surface-900 font-medium rounded-br-none shadow-md shadow-brand/10'
            : 'bg-surface-700 border border-surface-600 text-slate-200 rounded-bl-none shadow-md'
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>

        {/* Si tiene JSON estructurado, mostrar resumen táctico embebido */}
        {message.parsedJson && message.parsedJson.recomendacion_trade && (
          <div className="mt-3 pt-3 border-t border-surface-600/70 text-xs text-slate-300">
            <div className="flex items-center justify-between mb-1">
              <span className="text-brand font-semibold">Táctica Detectada:</span>
              <Badge variant="brand" className="text-[10px]">
                {message.parsedJson.recomendacion_trade.accion_sugerida}
              </Badge>
            </div>
            <div className="text-[11px] text-muted">
              Tasa: <span className="text-white font-medium">{formatVES(message.parsedJson.recomendacion_trade.tasa_sugerida)}</span> |{' '}
              Margen: <span className="text-success font-medium">+{message.parsedJson.recomendacion_trade.margen_neto_estimado_porc}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

