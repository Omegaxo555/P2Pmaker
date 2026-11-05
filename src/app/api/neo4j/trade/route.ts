import { NextRequest, NextResponse } from 'next/server';
import { executeOrderInGraph } from '@/lib/neo4j/queries';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id = `ord_${Date.now()}`,
      tipo,
      monto_fiat,
      monto_cripto,
      tasa_ejecutada,
      metodoPago,
      id_contraparte = 'comerciante_p2p',
      userId = 'usr_123',
    } = body;

    if (!tipo || !monto_fiat || !monto_cripto || !tasa_ejecutada || !metodoPago) {
      return NextResponse.json(
        { error: 'Faltan parámetros obligatorios de la orden' },
        { status: 400 }
      );
    }

    const comisionDeductiva = Number((Number(monto_cripto) * 0.0025).toFixed(4));

    await executeOrderInGraph({
      id,
      tipo,
      monto_fiat: Number(monto_fiat),
      monto_cripto: Number(monto_cripto),
      tasa_ejecutada: Number(tasa_ejecutada),
      comision_deductiva: comisionDeductiva,
      metodo_pago: metodoPago,
      id_contraparte,
      timestamp: new Date().toISOString(),
      userId,
    });

    return NextResponse.json({
      success: true,
      message: `Orden ${id} asociada al método de pago ${metodoPago} y registrada en el cierre de hoy.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error registrando orden en el grafo' },
      { status: 500 }
    );
  }
}
