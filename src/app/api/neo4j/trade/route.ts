import { NextRequest, NextResponse } from 'next/server';
import { recordTradeOutcome } from '@/lib/neo4j/queries';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, tradeId, usdt_monto, tasa, tipo, metodoPago, exito, tiempo_minutos } = body;

    if (!userId || !tradeId || !usdt_monto || !tasa || !tipo || !metodoPago) {
      return NextResponse.json({ error: 'Faltan parámetros obligatorios del trade' }, { status: 400 });
    }

    await recordTradeOutcome({
      userId,
      tradeId,
      usdt_monto: Number(usdt_monto),
      tasa: Number(tasa),
      tipo,
      metodoPago,
      exito: exito !== false,
      tiempo_minutos: tiempo_minutos ? Number(tiempo_minutos) : undefined,
    });

    return NextResponse.json({ success: true, message: 'Trade y memoria guardados en Neo4j' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error guardando trade en Neo4j' },
      { status: 500 }
    );
  }
}
