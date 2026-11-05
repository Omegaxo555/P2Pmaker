import { getNeo4jDriver } from './driver';
import type { UserGraphSummary, TradeNode } from '@/types/neo4j';

export async function getUserGraphHistory(userId: string): Promise<UserGraphSummary> {
  const driver = getNeo4jDriver();

  // Si Neo4j no está conectado o configurado, devolver datos mock iniciales
  if (!driver) {
    return {
      user: { id: userId, name: 'Paulo' },
      metodos: [
        {
          banco: { name: 'Pago Movil - Banesco', diario_max: 50000, consumido_hoy: 12000 },
          preferencia: { peso_exito: 0.95, tiempo_promedio_min: 8 },
          disponible_hoy: 38000,
        },
        {
          banco: { name: 'Pago Movil - Mercantil', diario_max: 40000, consumido_hoy: 5000 },
          preferencia: { peso_exito: 0.88, tiempo_promedio_min: 10 },
          disponible_hoy: 35000,
        },
        {
          banco: { name: 'Transferencia - Venezuela', diario_max: 100000, consumido_hoy: 45000 },
          preferencia: { peso_exito: 0.91, tiempo_promedio_min: 14 },
          disponible_hoy: 55000,
        },
      ],
      trades_recientes: [
        { id: 'trade_987', fecha: new Date().toISOString(), usdt_monto: 100, tasa: 994.5, tipo: 'BUY_MAKER', exito: true },
        { id: 'trade_986', fecha: new Date(Date.now() - 3600000).toISOString(), usdt_monto: 150, tasa: 1010.2, tipo: 'SELL_MAKER', exito: true },
      ],
      contrapartes_bloqueadas: ['bad_trader_44', 'scam_report_01'],
    };
  }

  const session = driver.session();
  try {
    const result = await session.run(
      `
      MERGE (u:User {id: $userId})
      ON CREATE SET u.name = $defaultName
      WITH u
      OPTIONAL MATCH (u)-[r:PREFIERE]->(b:BankMethod)
      OPTIONAL MATCH (u)-[:EJECUTO]->(t:Trade)
      OPTIONAL MATCH (u)-[:BLOQUEO]->(c:Contraparte)
      RETURN u,
             collect(DISTINCT { banco: b, preferencia: r }) as metodos,
             collect(DISTINCT t) as trades,
             collect(DISTINCT c.id) as bloqueados
      `,
      { userId, defaultName: process.env.DEFAULT_USER_NAME || 'Paulo' }
    );

    if (result.records.length === 0) {
      throw new Error('No user record found');
    }

    const record = result.records[0];
    const userProp = record.get('u').properties;
    const rawMetodos = record.get('metodos') || [];
    const rawTrades = record.get('trades') || [];
    const rawBloqueados = record.get('bloqueados') || [];

    const metodos = rawMetodos
      .filter((m: any) => m.banco && m.banco.properties)
      .map((m: any) => {
        const banco = m.banco.properties;
        const preferencia = m.preferencia?.properties || { peso_exito: 0.8, tiempo_promedio_min: 10 };
        const diarioMax = Number(banco.diario_max || 0);
        const consumidoHoy = Number(banco.consumido_hoy || 0);
        return {
          banco: {
            name: banco.name,
            diario_max: diarioMax,
            consumido_hoy: consumidoHoy,
          },
          preferencia: {
            peso_exito: Number(preferencia.peso_exito || 0.8),
            tiempo_promedio_min: Number(preferencia.tiempo_promedio_min || 10),
          },
          disponible_hoy: Math.max(0, diarioMax - consumidoHoy),
        };
      });

    const trades_recientes = rawTrades
      .filter((t: any) => t && t.properties)
      .map((t: any) => ({
        id: t.properties.id,
        fecha: t.properties.fecha || new Date().toISOString(),
        usdt_monto: Number(t.properties.usdt_monto || 0),
        tasa: Number(t.properties.tasa || 0),
        tipo: t.properties.tipo || 'BUY_MAKER',
        exito: t.properties.exito !== false,
      }));

    return {
      user: { id: userProp.id, name: userProp.name },
      metodos,
      trades_recientes,
      contrapartes_bloqueadas: rawBloqueados.filter(Boolean),
    };
  } finally {
    await session.close();
  }
}

export async function recordTradeOutcome(tradeData: {
  userId: string;
  tradeId: string;
  usdt_monto: number;
  tasa: number;
  tipo: 'BUY_MAKER' | 'SELL_MAKER';
  metodoPago: string;
  exito: boolean;
  tiempo_minutos?: number;
}): Promise<boolean> {
  const driver = getNeo4jDriver();
  if (!driver) return true; // simulado con éxito

  const session = driver.session();
  try {
    await session.run(
      `
      MATCH (u:User {id: $userId})
      MERGE (b:BankMethod {name: $metodoPago})
      CREATE (t:Trade {
        id: $tradeId,
        fecha: datetime(),
        usdt_monto: $usdt_monto,
        tasa: $tasa,
        tipo: $tipo,
        exito: $exito
      })
      CREATE (u)-[:EJECUTO]->(t)
      CREATE (t)-[:USO_METODO]->(b)
      SET b.consumido_hoy = coalesce(b.consumido_hoy, 0) + ($usdt_monto * $tasa)
      WITH u, b, $exito as esExito, coalesce($tiempo_minutos, 8) as duracion
      MERGE (u)-[r:PREFIERE]->(b)
      ON CREATE SET r.peso_exito = CASE WHEN esExito THEN 0.85 ELSE 0.6 END,
                    r.tiempo_promedio_min = duracion
      ON MATCH SET r.peso_exito = CASE WHEN esExito 
                                      THEN (r.peso_exito * 0.8) + 0.2 
                                      ELSE (r.peso_exito * 0.7) END,
                   r.tiempo_promedio_min = (r.tiempo_promedio_min + duracion) / 2
      RETURN u, b
      `,
      {
        userId: tradeData.userId,
        tradeId: tradeData.tradeId,
        usdt_monto: Number(tradeData.usdt_monto),
        tasa: Number(tradeData.tasa),
        tipo: tradeData.tipo,
        metodoPago: tradeData.metodoPago,
        exito: tradeData.exito,
        tiempo_minutos: tradeData.tiempo_minutos || 8,
      }
    );
    return true;
  } finally {
    await session.close();
  }
}

