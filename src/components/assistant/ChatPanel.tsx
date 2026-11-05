'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage, FinancialAssistantResponse } from '@/types/analytics';

interface ChatPanelProps {
  onNewAIResponse?: (data: FinancialAssistantResponse) => void;
}

const QUICK_PROMPTS = [
  'Genera el cierre y balanza diaria de ganancias real de hoy',
  '¿Cuál es el margen neto real de mis órdenes confirmadas?',
  'Revisa el estado de límites bancarios consumidos en mi grafo',
  'Sugiere puntos de entrada y salida basados en la profundidad de Binance',
];

export function ChatPanel({ onNewAIResponse }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `### Asistente de Arbitraje y Control Financiero P2P Binance
Sistema iniciado con separación estricta de fuentes:
- **Capa de Aprendizaje (Grafo Neo4j)**: Conectada a tu registro real de órdenes, comisiones y límites bancarios. No se generan ganancias ficticias.
- **Capa de Análisis Externo (Binance P2P)**: Variables de mercado volátiles en tiempo real.

¿En qué análisis u operación puedo asistirte hoy?`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const prompt = textToSend || input;
    if (!prompt.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/p2p-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Error al comunicarse con el asistente');
      }

      const assistantMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: resData.narrative || resData.raw,
        parsedJson: resData.data,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (resData.data && onNewAIResponse) {
        onNewAIResponse(resData.data);
      }
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Error de conexión: ${error.message}. Verifica tu configuración de GEMINI_API_KEY en .env.local`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="flex flex-col h-[650px] border-surface-600">
      {/* Encabezado */}
      <div className="flex items-center justify-between border-b border-surface-600/70 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/50 flex items-center justify-center text-brand font-bold text-sm">
            📊
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Asistente de Control Financiero</h3>
            <p className="text-[11px] text-muted">Contabilidad Real P2P Binance • Cero Datos Simulados</p>
          </div>
        </div>
      </div>

      {/* Lista de mensajes */}
      <div className="flex-1 overflow-y-auto pr-1">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted py-2 px-1">
            <Spinner size="sm" />
            <span>Consultando datos reales del grafo y profundidad de Binance...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Prompts Rápidos */}
      <div className="pt-2 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
        {QUICK_PROMPTS.map((qp, idx) => (
          <button
            key={idx}
            disabled={isLoading}
            onClick={() => handleSend(qp)}
            className="text-[11px] whitespace-nowrap bg-surface-700 hover:bg-surface-600 text-muted hover:text-white px-2.5 py-1 rounded-md border border-surface-600 transition-colors shrink-0 disabled:opacity-50"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Formulario Input */}
      <div className="pt-2 border-t border-surface-600/60 flex gap-2">
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu consulta financiera o solicitud de balance..."
          className="flex-1 bg-surface-900 border border-surface-600 rounded-lg p-2.5 text-xs text-white placeholder-muted focus:outline-none focus:border-brand resize-none"
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
          className="bg-brand hover:bg-brand-hover text-surface-900 font-bold px-4 rounded-lg text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
        >
          Enviar
        </button>
      </div>
    </Card>
  );
}
