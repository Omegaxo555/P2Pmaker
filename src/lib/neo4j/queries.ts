import { getNeo4jDriver } from './driver';
import type { UserGraphSummary, TradeOrderNode, BankMethodNode, DailyCloseNode } from '@/types/neo4j';
import type { GraphTopology, GraphNode, GraphEdge } from '@/types/graphTopology';

// Almacén en memoria volátil de respaldo con órdenes iniciales
let memoryStore = {
  user: { id: 'usr_123', name: 'Paulo' },
  bancos: [
    { name: 'Pago Movil - Banesco', limite_diario_maximo_ves: 50000, consumido_hoy_ves: 0 },
    { name: 'Pago Movil - Mercantil', limite_diario_maximo_ves: 40000, consumido_hoy_ves: 0 },
    { name: 'Transferencia - Venezuela', limite_diario_maximo_ves: 100000, consumido_hoy_ves: 0 },
  ],
  ordenes: [
    {
      id: 'ord_987',
      tipo: 'BUY' as const,
      monto_fiat: 25000,
      monto_cripto: 25.12,
      tasa_ejecutada: 995.2,
      comision_deductiva: 0.0628,
      metodo_pago: 'Pago Movil - Banesco',
      id_contraparte: 'comerciante_pro_01',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'ord_988',
      tipo: 'SELL' as const,
      monto_fiat: 25500,
      monto_cripto: 25.06,
      tasa_ejecutada: 1017.5,
      comision_deductiva: 0.0626,
      metodo_pago: 'Pago Movil - Banesco',
      id_contraparte: 'comerciante_verif_02',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'ord_989',
      tipo: 'BUY' as const,
      monto_fiat: 15000,
      monto_cripto: 15.08,
      tasa_ejecutada: 994.7,
      comision_deductiva: 0.0377,
      metodo_pago: 'Pago Movil - Mercantil',
      id_contraparte: 'trader_rapido_99',
      timestamp: new Date().toISOString(),
    },
  ] as TradeOrderNode[],
};

// Sincronizar consumos iniciales
memoryStore.ordenes.forEach((o) => {
  const b = memoryStore.bancos.find((bm) => bm.name === o.metodo_pago);
  if (b) b.consumido_hoy_ves += o.monto_fiat;
});

function calcularDailyClose(ordenes: TradeOrderNode[]): DailyCloseNode {
  const today = new Date().toISOString().split('T')[0];
  const compras = ordenes.filter((o) => o.tipo === 'BUY');
  const ventas = ordenes.filter((o) => o.tipo === 'SELL');

  const totalComprasVES = compras.reduce((acc, o) => acc + o.monto_fiat, 0);
  const totalVentasVES = ventas.reduce((acc, o) => acc + o.monto_fiat, 0);
  const totalComisionesUSDT = ordenes.reduce((acc, o) => acc + o.comision_deductiva, 0);

  const tasaPromedio =
    compras.length > 0
      ? totalComprasVES / Math.max(1, compras.reduce((acc, o) => acc + o.monto_cripto, 0))
      : ventas.length > 0
      ? ventas[0].tasa_ejecutada
      : 1;

  const comisionesVES = totalComisionesUSDT * tasaPromedio;
  const gananciaVES =
    compras.length > 0 && ventas.length > 0
      ? totalVentasVES - totalComprasVES - comisionesVES
      : 0;

  const gananciaUSDT = tasaPromedio > 0 ? gananciaVES / tasaPromedio : 0;
  const capitalUSDT = 1000 + gananciaUSDT; // Capital base + P&L

  return {
    id: `daily_${today}`,
    fecha: today,
    capital_actual_usdt: Number(capitalUSDT.toFixed(2)),
    ganancia_neta_real_ves: Number(gananciaVES.toFixed(2)),
    ganancia_neta_real_usdt: Number(gananciaUSDT.toFixed(2)),
    ordenes_completadas_hoy: ordenes.length,
  };
}

export async function getUserGraphHistory(userId: string): Promise<UserGraphSummary> {
  const driver = getNeo4jDriver();
  const dailyClose = calcularDailyClose(memoryStore.ordenes);

  if (!driver) {
    const metodos = memoryStore.bancos.map((b) => {
      const ordenesDelBanco = memoryStore.ordenes.filter((o) => o.metodo_pago === b.name);
      return {
        banco: b,
        disponible_ves: Math.max(0, b.limite_diario_maximo_ves - b.consumido_hoy_ves),
        consumido_hoy_ves: b.consumido_hoy_ves,
        ordenes_asociadas: ordenesDelBanco,
      };
    });

    return {
      user: memoryStore.user,
      daily_close: dailyClose,
      metodos,
      todas_ordenes_hoy: memoryStore.ordenes,
    };
  }

  const session = driver.session();
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await session.run(
      `
      MERGE (u:User {id: $userId})
      ON CREATE SET u.name = $defaultName
      MERGE (d:DailyClose {id: $dailyId, fecha: $today})
      MERGE (u)-[:TIENE_CIERRE]->(d)
      WITH u, d
      OPTIONAL MATCH (d)-[:OPERA_CON]->(b:BankMethod)
      OPTIONAL MATCH (b)-[:REGISTRO_ORDEN]->(o:TradeOrder)
        WHERE o.timestamp STARTS WITH $today
      RETURN u, d,
             collect(DISTINCT b) as bancos,
             collect(DISTINCT o) as ordenes
      `,
      {
        userId,
        defaultName: process.env.DEFAULT_USER_NAME || 'Paulo',
        dailyId: `daily_${today}`,
        today,
      }
    );

    const record = result.records[0];
    const uProps = record.get('u').properties;
    const rawBancos = record.get('bancos') || [];
    const rawOrdenes = record.get('ordenes') || [];

    const ordenes: TradeOrderNode[] = rawOrdenes
      .filter((o: any) => o && o.properties)
      .map((o: any) => ({
        id: o.properties.id,
        tipo: o.properties.tipo,
        monto_fiat: Number(o.properties.monto_fiat),
        monto_cripto: Number(o.properties.monto_cripto),
        tasa_ejecutada: Number(o.properties.tasa_ejecutada),
        comision_deductiva: Number(o.properties.comision_deductiva),
        metodo_pago: o.properties.metodo_pago,
        id_contraparte: o.properties.id_contraparte,
        timestamp: o.properties.timestamp,
      }));

    const finalDaily = calcularDailyClose(ordenes.length > 0 ? ordenes : memoryStore.ordenes);

    const metodos = (rawBancos.length > 0 ? rawBancos : memoryStore.bancos).map((b: any) => {
      const bp = b.properties || b;
      const max = Number(bp.limite_diario_maximo_ves || 50000);
      const consumido = Number(bp.consumido_hoy_ves || 0);
      const ords = (ordenes.length > 0 ? ordenes : memoryStore.ordenes).filter(
        (o) => o.metodo_pago === bp.name
      );
      return {
        banco: { name: bp.name, limite_diario_maximo_ves: max, consumido_hoy_ves: consumido },
        disponible_ves: Math.max(0, max - consumido),
        consumido_hoy_ves: consumido,
        ordenes_asociadas: ords,
      };
    });

    return {
      user: { id: uProps.id, name: uProps.name },
      daily_close: finalDaily,
      metodos,
      todas_ordenes_hoy: ordenes.length > 0 ? ordenes : memoryStore.ordenes,
    };
  } finally {
    await session.close();
  }
}

/**
 * Evento EXECUTE_ORDER: Registra la orden conectándola a su Método de Pago y Cierre Diario
 */
export async function executeOrderInGraph(orderData: TradeOrderNode & { userId: string }): Promise<boolean> {
  const driver = getNeo4jDriver();

  // Memoria local
  memoryStore.ordenes.unshift(orderData);
  const target = memoryStore.bancos.find((b) => b.name === orderData.metodo_pago);
  if (target) {
    target.consumido_hoy_ves += orderData.monto_fiat;
  }

  if (!driver) return true;

  const session = driver.session();
  try {
    const today = new Date().toISOString().split('T')[0];
    await session.run(
      `
      MATCH (u:User {id: $userId})
      MERGE (d:DailyClose {id: $dailyId, fecha: $today})
      MERGE (u)-[:TIENE_CIERRE]->(d)
      MERGE (b:BankMethod {name: $metodo_pago})
      MERGE (d)-[:OPERA_CON]->(b)
      CREATE (o:TradeOrder {
        id: $id,
        tipo: $tipo,
        monto_fiat: $monto_fiat,
        monto_cripto: $monto_cripto,
        tasa_ejecutada: $tasa_ejecutada,
        comision_deductiva: $comision_deductiva,
        metodo_pago: $metodo_pago,
        id_contraparte: $id_contraparte,
        timestamp: datetime()
      })
      CREATE (b)-[:REGISTRO_ORDEN]->(o)
      SET b.consumido_hoy_ves = coalesce(b.consumido_hoy_ves, 0) + $monto_fiat
      `,
      {
        ...orderData,
        dailyId: `daily_${today}`,
        today,
      }
    );
    return true;
  } finally {
    await session.close();
  }
}

/**
 * Topología estructurada en árbol radial con niveles jerárquicos:
 * User (Tier 0) -> DailyClose (Tier 1) -> BankMethod (Tier 2) -> TradeOrder (Tier 3)
 */
export async function getGraphTopology(userId: string): Promise<GraphTopology> {
  const summary = await getUserGraphHistory(userId);
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // TIER 0: User (Raíz)
  nodes.push({
    id: summary.user.id,
    label: 'User',
    title: `${summary.user.name} (Usuario)`,
    sub: `ID: ${summary.user.id}`,
    tier: 0,
    properties: { ...summary.user, rol: 'Trader P2P' },
  });

  // TIER 1: DailyClose (Nodo Central del día actual)
  const dClose = summary.daily_close;
  nodes.push({
    id: dClose.id,
    label: 'DailyClose',
    title: `Cierre Hoy (${dClose.fecha})`,
    sub: `${dClose.ordenes_completadas_hoy} órdenes • P&L: +$${dClose.ganancia_neta_real_usdt} USDT`,
    tier: 1,
    parentId: summary.user.id,
    properties: {
      fecha: dClose.fecha,
      capital_actual_usdt: dClose.capital_actual_usdt,
      ganancia_neta_real_ves: dClose.ganancia_neta_real_ves,
      ganancia_neta_real_usdt: dClose.ganancia_neta_real_usdt,
      ordenes_hoy: dClose.ordenes_completadas_hoy,
    },
  });

  edges.push({
    id: `e_user_daily`,
    from: summary.user.id,
    to: dClose.id,
    type: 'TIENE_CIERRE',
    label: 'TIENE_CIERRE',
  });

  // TIER 2: BankMethod (Conectados al DailyClose)
  summary.metodos.forEach((m, bIdx) => {
    const bId = `bank_${m.banco.name.replace(/\s+/g, '_')}`;
    nodes.push({
      id: bId,
      label: 'BankMethod',
      title: m.banco.name,
      sub: `Disp: ${m.disponible_ves.toLocaleString()} VES (Usado: ${m.consumido_hoy_ves.toLocaleString()})`,
      tier: 2,
      parentId: dClose.id,
      properties: {
        limite_diario_maximo_ves: m.banco.limite_diario_maximo_ves,
        consumido_hoy_ves: m.consumido_hoy_ves,
        disponible_ves: m.disponible_ves,
        ordenes_en_banco: m.ordenes_asociadas.length,
      },
    });

    edges.push({
      id: `e_daily_bank_${bIdx}`,
      from: dClose.id,
      to: bId,
      type: 'OPERA_CON',
      label: `OPERA_CON (${((m.consumido_hoy_ves / Math.max(1, m.banco.limite_diario_maximo_ves)) * 100).toFixed(0)}%)`,
    });

    // TIER 3: TradeOrder (Conectadas directamente a su BankMethod)
    m.ordenes_asociadas.forEach((ord, oIdx) => {
      const oId = ord.id;
      nodes.push({
        id: oId,
        label: 'TradeOrder',
        title: `Orden #${ord.id}`,
        sub: `${ord.tipo} ${ord.monto_cripto} USDT @ ${ord.tasa_ejecutada} VES`,
        tier: 3,
        parentId: bId,
        properties: {
          tipo: ord.tipo,
          monto_fiat: ord.monto_fiat,
          monto_cripto: ord.monto_cripto,
          tasa: ord.tasa_ejecutada,
          comision_deductiva: ord.comision_deductiva,
          metodo_pago: ord.metodo_pago,
          contraparte: ord.id_contraparte,
        },
      });

      edges.push({
        id: `e_bank_order_${bIdx}_${oIdx}`,
        from: bId,
        to: oId,
        type: 'REGISTRO_ORDEN',
        label: `${ord.tipo} (${ord.monto_cripto} USDT)`,
      });
    });
  });

  return { nodes, edges };
}
