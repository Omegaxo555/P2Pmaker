import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/ai/gemini';
import { parseAIResponse } from '@/lib/ai/parser';
import { getBinanceP2POrderBook } from '@/lib/binance/p2p';
import { getUserGraphHistory } from '@/lib/neo4j/queries';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, userId = process.env.DEFAULT_USER_ID || 'usr_123', payTypes = [] } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'El campo "prompt" es requerido' }, { status: 400 });
    }

    // 1. Obtener datos en tiempo real de Binance P2P
    const orderbook = await getBinanceP2POrderBook(payTypes, 'VES', 'USDT');

    // 2. Consultar memoria y restricciones del Grafo (Neo4j)
    const userGraph = await getUserGraphHistory(userId);

    // 3. Preparar contexto para P2P Flow AI
    const contextPrompt = `
[CONTEXTO EN VIVO PROPORCIONADO POR LAS HERRAMIENTAS]

1. MERCADO BINANCE P2P ACTUAL (USDT/VES):
- Mejor precio Compra (Anuncios de venta de USDT): ${orderbook.bestBuyPrice} VES
- Mejor precio Venta (Anuncios de compra de USDT): ${orderbook.bestSellPrice} VES
- Spread actual: ${orderbook.spread} VES (${orderbook.spreadPercent}%)
- Precio medio: ${orderbook.midPrice} VES
- Top 3 Vendedores (para comprarles USDT):
${orderbook.buyOrders.slice(0, 3).map((o, idx) => `  ${idx + 1}. ${o.advertiser.nickName} | Tasa: ${o.adv.price} VES | Min/Max: ${o.adv.minSingleTransAmount} - ${o.adv.maxSingleTransAmount} VES | Finalización: ${(o.advertiser.monthFinishRate * 100).toFixed(1)}% | Métodos: ${o.adv.tradeMethods.map(m => m.tradeMethodName).join(', ')}`).join('\n')}
- Top 3 Compradores (para venderles USDT):
${orderbook.sellOrders.slice(0, 3).map((o, idx) => `  ${idx + 1}. ${o.advertiser.nickName} | Tasa: ${o.adv.price} VES | Min/Max: ${o.adv.minSingleTransAmount} - ${o.adv.maxSingleTransAmount} VES | Finalización: ${(o.advertiser.monthFinishRate * 100).toFixed(1)}% | Métodos: ${o.adv.tradeMethods.map(m => m.tradeMethodName).join(', ')}`).join('\n')}

2. PERFIL DE GRAFO Y LÍMITES BANCARIOS DEL USUARIO (${userGraph.user.name} - ID: ${userGraph.user.id}):
- Métodos de pago y disponibilidad:
${userGraph.metodos.map(m => `  * ${m.banco.name} -> Disponible hoy: ${m.disponible_hoy} VES (Consumido: ${m.banco.consumido_hoy}/${m.banco.diario_max} VES) | Score Éxito: ${(m.preferencia.peso_exito * 100).toFixed(0)}% | Tiempo prom: ${m.preferencia.tiempo_promedio_min} min`).join('\n')}
- Contrapartes sospechosas o bloqueadas en el grafo: ${userGraph.contrapartes_bloqueadas.length > 0 ? userGraph.contrapartes_bloqueadas.join(', ') : 'Ninguna'}
- Últimos trades registrados: ${userGraph.trades_recientes.length} trades completados recientemente.

[SOLICITUD DEL USUARIO]:
"${prompt}"

Recuerda cumplir estrictamente con responder:
1. Análisis táctico en lenguaje natural.
2. El bloque JSON estructurado con \`analytics\`, \`grafica_rendimiento\` y \`recomendacion_trade\`.
`;

    // 4. Invocar a Gemini con el system prompt y datos en vivo
    const model = getGeminiModel();
    const result = await model.generateContent(contextPrompt);
    const textResponse = result.response.text();

    // 5. Parsear la respuesta dividida en narrativa + JSON para componentes React
    const { narrative, parsedJson } = parseAIResponse(textResponse);

    return NextResponse.json({
      success: true,
      narrative,
      data: parsedJson,
      raw: textResponse,
      marketSnapshot: {
        bestBuy: orderbook.bestBuyPrice,
        bestSell: orderbook.bestSellPrice,
        spread: orderbook.spread,
        timestamp: orderbook.timestamp,
      },
    });
  } catch (error: any) {
    console.error('[API p2p-assistant] Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Error interno procesando asistente P2P',
      },
      { status: 500 }
    );
  }
}
