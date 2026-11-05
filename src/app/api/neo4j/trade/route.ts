import { NextRequest, NextResponse } from 'next/server';
import { executeOrderInGraph, createAdInGraph } from '@/lib/neo4j/queries';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = 'EXECUTE_ORDER', ...payload } = body;

    if (action === 'CREATE_AD') {
      const { id, tipo, tasa_publicada, fiat = 'VES', cripto = 'USDT', metodo_pago, userId = 'usr_123' } = payload;
      await createAdInGraph({
        id: id || `ad_${Date.now()}`,
        tipo,
        tasa_publicada: Number(tasa_publicada),
        fiat,
        cripto,
        metodo_pago,
        comision_maker: 0.0025,
        timestamp: new Date().toISOString(),
        userId,
      });
      return NextResponse.json({ success: true, message: 'Oferta Maker registrada (CREATE_AD)' });
    }

    // Default: EXECUTE_ORDER
    const {
      id = `ord_${Date.now()}`,
      id_anuncio,
      tipo,
      monto_fiat,
      monto_cripto,
      tasa_ejecutada,
      id_contraparte = 'contraparte_desconocida',
      metodoPago,
      userId = 'usr_123',
    } = payload;

    if (!tipo || !monto_fiat || !monto_cripto || !tasa_ejecutada || !metodoPago) {
      return NextResponse.json(
        { error: 'Faltan parámetros obligatorios de la orden ejecutada' },
        { status: 400 }
      );
    }

    const comisionDeductiva = Number((Number(monto_cripto) * 0.0025).toFixed(4));

    await executeOrderInGraph({
      id,
      id_anuncio,
      tipo,
      monto_fiat: Number(monto_fiat),
      monto_cripto: Number(monto_cripto),
      tasa_ejecutada: Number(tasa_ejecutada),
      comision_deductiva: comisionDeductiva,
      id_contraparte,
      timestamp: new Date().toISOString(),
      userId,
      metodoPago,
    });

    return NextResponse.json({
      success: true,
      message: `Orden ${id} confirmada y registrada en contabilidad real (EXECUTE_ORDER)`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error guardando orden en el grafo' },
      { status: 500 }
    );
  }
}
