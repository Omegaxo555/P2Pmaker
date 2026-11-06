import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { executeOrderInGraph, updateOrderInGraph } from '@/lib/neo4j/queries';
import type { TradeOrderNode } from '@/types/neo4j';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseTrade(body: unknown, id: string): (TradeOrderNode & { userId: string }) | null {
  if (!isRecord(body)) return null;

  const tipo = body.tipo;
  const montoCripto = Number(body.monto_cripto);
  const tasaEjecutada = Number(body.tasa_ejecutada);
  const comisionPorcentaje = Number(body.comision_porcentaje ?? 0);
  const metodoPago = typeof body.metodoPago === 'string' ? body.metodoPago.trim() : '';
  const contraparte =
    typeof body.id_contraparte === 'string' ? body.id_contraparte.trim() : 'comerciante_p2p';

  if (
    (tipo !== 'BUY' && tipo !== 'SELL') ||
    !Number.isFinite(montoCripto) ||
    montoCripto <= 0 ||
    !Number.isFinite(tasaEjecutada) ||
    tasaEjecutada <= 0 ||
    !Number.isFinite(comisionPorcentaje) ||
    comisionPorcentaje < 0 ||
    comisionPorcentaje > 100 ||
    !metodoPago ||
    metodoPago.length > 100 ||
    !contraparte ||
    contraparte.length > 100
  ) {
    return null;
  }

  return {
    id,
    tipo,
    monto_fiat: Number((montoCripto * tasaEjecutada).toFixed(2)),
    monto_cripto: montoCripto,
    tasa_ejecutada: tasaEjecutada,
    comision_deductiva: Number((montoCripto * (comisionPorcentaje / 100)).toFixed(4)),
    metodo_pago: metodoPago,
    id_contraparte: contraparte,
    timestamp: new Date().toISOString(),
    userId: process.env.DEFAULT_USER_ID || 'usr_123',
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const order = parseTrade(body, randomUUID());
    if (!order) {
      return NextResponse.json({ error: 'Los datos de la orden no son válidos' }, { status: 400 });
    }

    await executeOrderInGraph(order);
    return NextResponse.json({
      success: true,
      id: order.id,
      message: `Orden ${order.id} guardada en ${order.metodo_pago}.`,
    });
  } catch (error) {
    console.error('[Trade API] Error registrando orden:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error registrando la orden' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    if (
      !isRecord(body) ||
      typeof body.id !== 'string' ||
      !body.id.trim() ||
      body.id.trim().length > 100
    ) {
      return NextResponse.json({ error: 'Se requiere el identificador de la orden' }, { status: 400 });
    }

    const order = parseTrade(body, body.id.trim());
    if (!order) {
      return NextResponse.json({ error: 'Los datos de la orden no son válidos' }, { status: 400 });
    }

    const updated = await updateOrderInGraph(order);
    if (!updated) {
      return NextResponse.json({ error: 'No se encontró la orden para editar' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Orden ${order.id} actualizada.` });
  } catch (error) {
    console.error('[Trade API] Error actualizando orden:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error actualizando la orden' },
      { status: 500 }
    );
  }
}
