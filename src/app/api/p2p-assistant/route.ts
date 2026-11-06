import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/ai/gemini';
import { parseAIResponse } from '@/lib/ai/parser';
import { getBinanceP2POrderBook } from '@/lib/binance/p2p';
import { getUserGraphHistory } from '@/lib/neo4j/queries';
import type { FinancialAssistantResponse } from '@/types/analytics';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, userId = process.env.DEFAULT_USER_ID || 'usr_123', payTypes = [] } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'El campo "prompt" es requerido' }, { status: 400 });
    }

    const orderbook = await getBinanceP2POrderBook(payTypes, 'VES', 'USDT');
    const userGraph = await getUserGraphHistory(userId);
    const dClose = userGraph.daily_close;

    const contextPrompt = `
[CAPA DE MERCADO - VARIABLES VOLÁTILES EXTERNAS (BINANCE P2P)]
- Tasa Compra Sugerida: ${orderbook.bestBuyPrice} VES
- Tasa Venta Sugerida: ${orderbook.bestSellPrice} VES
- Spread Teórico: ${orderbook.spreadPercent}%

[CAPA DE USUARIO - HISTORIAL Y CIERRE REAL (GRAFO NEO4J)]
- Fecha Cierre: ${dClose.fecha}
- Capital Actual USDT: ${dClose.capital_actual_usdt} USDT
- Ganancia Neta Real VES: ${dClose.ganancia_neta_real_ves} VES
- Ganancia Neta Real USDT: ${dClose.ganancia_neta_real_usdt} USDT
- Órdenes Completadas Hoy: ${dClose.ordenes_completadas_hoy}

 [CONSUMO Y TOPES CONFIGURADOS POR MÉTODO]
${userGraph.metodos
  .map(
    (m) =>
      `* ${m.banco.name}: Límite = ${m.banco.limite_diario_maximo_ves ?? 'Sin configurar'} VES | Consumido = ${m.consumido_hoy_ves} VES | Disponible = ${m.disponible_ves ?? 'Sin configurar'} VES (Órdenes registradas: ${m.ordenes_asociadas.length})`
  )
  .join('\n')}

[SOLICITUD]:
"${prompt}"

Recuerda: Responde con análisis táctico estricto y concluye con el JSON correspondiente.
`;

    const model = getGeminiModel();
    const result = await model.generateContent(contextPrompt);
    const textResponse = result.response.text();

    const { narrative, parsedJson } = parseAIResponse(textResponse);

    const fallback: FinancialAssistantResponse = parsedJson || {
      control_financiero: {
        capital_actual_usdt: dClose.capital_actual_usdt,
        ganancia_neta_real_ves: dClose.ganancia_neta_real_ves,
        ganancia_neta_real_usdt: dClose.ganancia_neta_real_usdt,
        ordenes_completadas_hoy: dClose.ordenes_completadas_hoy,
      },
      limites_bancarios_activos: userGraph.metodos.map((m) => ({
        banco: m.banco.name,
        limite_diario_maximo_ves: m.banco.limite_diario_maximo_ves,
        consumido_hoy_ves: m.consumido_hoy_ves,
        disponible_ves: m.disponible_ves,
      })),
      sugerencia_maker: {
        tasa_compra: orderbook.bestBuyPrice,
        tasa_venta: orderbook.bestSellPrice,
        margen_neto_estimado_porc: orderbook.spreadPercent,
        alerta_limite_banco: userGraph.metodos.some(
          (m) => m.disponible_ves !== null && m.disponible_ves <= 5000
        ),
      },
    };

    return NextResponse.json({
      success: true,
      narrative,
      data: fallback,
      raw: textResponse,
    });
  } catch (error: any) {
    console.error('[API p2p-assistant] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error en el motor financiero' },
      { status: 500 }
    );
  }
}
