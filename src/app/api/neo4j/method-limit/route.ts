import { NextRequest, NextResponse } from 'next/server';
import { setPaymentMethodLimit } from '@/lib/neo4j/queries';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function PUT(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    if (!isRecord(body)) {
      return NextResponse.json({ error: 'Se requiere un objeto con método y límite' }, { status: 400 });
    }

    const methodName = typeof body.methodName === 'string' ? body.methodName.trim() : '';
    const dailyLimitVES = Number(body.dailyLimitVES);
    if (
      !methodName ||
      methodName.length > 100 ||
      !Number.isFinite(dailyLimitVES) ||
      dailyLimitVES <= 0 ||
      dailyLimitVES > 1_000_000_000_000
    ) {
      return NextResponse.json(
        { error: 'Indica un método y un límite diario mayor que cero y válido' },
        { status: 400 }
      );
    }

    const userId = process.env.DEFAULT_USER_ID || 'usr_123';
    await setPaymentMethodLimit(userId, methodName, dailyLimitVES);
    return NextResponse.json({
      success: true,
      methodName,
      dailyLimitVES,
      storage: process.env.NEO4J_URI && process.env.NEO4J_USERNAME && process.env.NEO4J_PASSWORD
        ? 'neo4j'
        : 'memory',
    });
  } catch (error) {
    console.error('[Payment method limit API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error guardando el límite del método' },
      { status: 500 }
    );
  }
}
