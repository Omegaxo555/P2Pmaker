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

    // 1. Capa de Análisis Externo (Variables de Mercado de Binance P2P - Memoria Volátil)
    const orderbook = await getBinanceP2POrderBook(payTypes, 'VES', 'USDT');

    // 2. Capa de Aprendizaje y Memoria (Grafo de Transacciones REALES de Neo4j)
    const userGraph = await getUserGraphHistory(userId);
    const balanceReal = userGraph.cierre_diario_actual;

    // 3. Preparar contexto transparente y estricto
    const contextPrompt = `
[DATOS EXTERNOS EN VIVO - BINANCE P2P API (VARIABLES VOLÁTILES DE MERCADO)]
- Mejor Tasa Compra (Ofertas de venta de USDT): ${orderbook.bestBuyPrice} VES
- Mejor Tasa Venta (Ofertas de compra de USDT): ${orderbook.bestSellPrice} VES
- Spread Teórico: ${orderbook.spread} VES (${orderbook.spreadPercent}%)
- Timestamp mercado externo: ${orderbook.timestamp}

[DATOS REALES DEL GRAFO DEL USUARIO (CONTABILIDAD REAL CONFIRMADA)]
- Órdenes ejecutadas hoy confirmadas por el usuario: ${userGraph.ordenes_reales_hoy.length}
- Ganancia Neta Real Acumulada Hoy: ${balanceReal.ganancia_neta_usdt} USDT (${balanceReal.ganancia_neta_ves} VES)
- Capital Rotado Hoy: ${balanceReal.capital_rotado_usdt} USDT
- Comisiones Maker Pagadas Hoy: ${balanceReal.comisiones_pagadas_usdt} USDT
- Órdenes registradas en detalle:
${
  userGraph.ordenes_reales_hoy.length > 0
    ? userGraph.ordenes_reales_hoy
        .map(
          (o) =>
            `  * Orden ${o.id}: ${o.tipo} ${o.monto_cripto} USDT @ ${o.tasa_ejecutada} VES (Comisión: ${o.comision_deductiva} USDT) con Contraparte: ${o.id_contraparte}`
        )
        .join('\n')
    : '  * [NINGUNA ORDEN EJECUTADA HOY]. La ganancia real actual es estrictamente 0.00 USDT.'
}

[ESTADO DE LÍMITES BANCARIOS REALES DEL USUARIO]
${userGraph.metodos
  .map(
    (m) =>
      `  * ${m.banco.name}: Consumido Real = ${m.consumido_hoy} VES / Límite = ${m.banco.diario_max} VES -> DISPONIBLE = ${m.disponible_hoy} VES`
  )
  .join('\n')}

[SOLICITUD DEL USUARIO]:
"${prompt}"

INSTRUCCIONES CLAVE:
1. Responde de forma analítica, técnica y transparente.
2. Si aplicas fórmulas financieras, incluye la sección Markdown "### Fuentes y Sustento de Cálculo".
3. Concluye con el bloque JSON estructurado estricto.
`;

    const model = getGeminiModel();
    const result = await model.generateContent(contextPrompt);
    const textResponse = result.response.text();

    const { narrative, parsedJson } = parseAIResponse(textResponse);

    // Si por alguna razón el modelo no generó el JSON, construir el respaldo con la contabilidad REAL
    const fallbackData: FinancialAssistantResponse = parsedJson || {
      control_diario_real: {
        fecha: balanceReal.fecha,
        ordenes_completadas: balanceReal.ordenes_totales,
        capital_rotado_usdt: balanceReal.capital_rotado_usdt,
        ganancia_neta_real_usdt: balanceReal.ganancia_neta_usdt,
        ganancia_neta_real_ves: balanceReal.ganancia_neta_ves,
        comisiones_pagadas_usdt: balanceReal.comisiones_pagadas_usdt,
      },
      estado_limites_banco: userGraph.metodos.map((m) => ({
        metodo_pago: m.banco.name,
        limite_diario_total: m.banco.diario_max,
        limite_consumido_real: m.consumido_hoy,
        limite_disponible: m.disponible_hoy,
      })),
      recomendacion_mercado_api: {
        tasa_compra_sugerida: orderbook.bestBuyPrice,
        tasa_venta_sugerida: orderbook.bestSellPrice,
        spread_teorico_porc: orderbook.spreadPercent,
        requiere_confirmacion_usuario: true,
      },
    };

    return NextResponse.json({
      success: true,
      narrative,
      data: fallbackData,
      raw: textResponse,
    });
  } catch (error: any) {
    console.error('[API p2p-assistant] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error en el motor de análisis financiero' },
      { status: 500 }
    );
  }
}
