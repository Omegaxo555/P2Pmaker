import { getNeo4jDriver } from './driver';
import type { UserGraphSummary, TradeOrderNode, BankMethodNode, DailyCloseNode } from '@/types/neo4j';
import type { GraphTopology, GraphNode, GraphEdge } from '@/types/graphTopology';

type MemoryStore = { ordenes: TradeOrderNode[]; limites: Record<string, number> };
type AppGlobal = typeof globalThis & { p2pMemoryStore?: MemoryStore };

const appGlobal = globalThis as AppGlobal;
const memoryStore = appGlobal.p2pMemoryStore || (appGlobal.p2pMemoryStore = { ordenes: [], limites: {} });
if (!memoryStore.limites) memoryStore.limites = {};

function getTodayInVenezuela(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function calcularDailyClose(ordenes: TradeOrderNode[]): DailyCloseNode {
  const today = getTodayInVenezuela();
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
  const capitalInicialUSDT = Number(process.env.INITIAL_CAPITAL_USDT || 0);
  if (!Number.isFinite(capitalInicialUSDT) || capitalInicialUSDT < 0) {
    throw new Error('INITIAL_CAPITAL_USDT debe ser un número mayor o igual a cero');
  }
  const capitalUSDT = capitalInicialUSDT + gananciaUSDT;

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
  const today = getTodayInVenezuela();

  if (!driver) {
    const ordenes = memoryStore.ordenes.filter(
      (order) => order.fecha_operacion === today || (!order.fecha_operacion && order.timestamp.startsWith(today))
    );
    const metodoNames = Array.from(new Set([
      ...ordenes.map((order) => order.metodo_pago),
      ...Object.keys(memoryStore.limites),
    ]));
    const metodos = metodoNames.map((name) => {
      const ordenesAsociadas = ordenes.filter((order) => order.metodo_pago === name);
      const limite = memoryStore.limites[name] ?? null;
      const consumido = ordenesAsociadas.reduce((sum, order) => sum + order.monto_fiat, 0);
      return {
        banco: { name, limite_diario_maximo_ves: limite, consumido_hoy_ves: consumido },
        disponible_ves: limite === null ? null : Math.max(0, limite - consumido),
        consumido_hoy_ves: consumido,
        ordenes_asociadas: ordenesAsociadas,
      };
    });

    return {
      user: {
        id: userId,
        name: process.env.DEFAULT_USER_NAME || 'Trader',
      },
      daily_close: calcularDailyClose(ordenes),
      storage: 'memory',
      metodos,
      todas_ordenes_hoy: ordenes,
    };
  }

  const session = driver.session();
  try {
    const result = await session.run(
      `
      MERGE (u:User {id: $userId})
      ON CREATE SET u.name = $defaultName
      MERGE (d:DailyClose {id: $dailyId, fecha: $today})
      MERGE (u)-[:TIENE_CIERRE]->(d)
      WITH u, d
      OPTIONAL MATCH (d)-[:OPERA_CON]->(b:BankMethod)
      OPTIONAL MATCH (b)-[:REGISTRO_ORDEN]->(o:TradeOrder)
        WHERE coalesce(o.fecha_operacion, substring(toString(o.timestamp), 0, 10)) = $today
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
        timestamp: String(o.properties.timestamp),
        fecha_operacion: o.properties.fecha_operacion,
      }));

    const finalDaily = calcularDailyClose(ordenes);

    const metodos = rawBancos
      .filter((b: any) => b && b.properties)
      .map((b: any) => {
        const bp = b.properties || b;
        const ords = ordenes.filter((order) => order.metodo_pago === bp.name);
        const maxValue = Number(bp.limite_diario_maximo_ves);
        const max = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : null;
        const consumido = ords.reduce((sum, order) => sum + order.monto_fiat, 0);
        return {
          banco: { name: bp.name, limite_diario_maximo_ves: max, consumido_hoy_ves: consumido },
          disponible_ves: max === null ? null : Math.max(0, max - consumido),
          consumido_hoy_ves: consumido,
          ordenes_asociadas: ords,
        };
      });

    return {
      user: { id: uProps.id, name: uProps.name },
      daily_close: finalDaily,
      storage: 'neo4j',
      metodos,
      todas_ordenes_hoy: ordenes,
    };
  } finally {
    await session.close();
  }
}

export async function setPaymentMethodLimit(
  userId: string,
  methodName: string,
  dailyLimitVES: number
): Promise<void> {
  const driver = getNeo4jDriver();
  if (!driver) {
    memoryStore.limites[methodName] = dailyLimitVES;
    return;
  }

  const session = driver.session();
  try {
    const today = getTodayInVenezuela();
    await session.executeWrite((tx) =>
      tx.run(
        `
        MERGE (u:User {id: $userId})
        ON CREATE SET u.name = $defaultName
        MERGE (d:DailyClose {id: $dailyId, fecha: $today})
        MERGE (u)-[:TIENE_CIERRE]->(d)
        MERGE (b:BankMethod {name: $methodName})
        MERGE (d)-[:OPERA_CON]->(b)
        SET b.limite_diario_maximo_ves = $dailyLimitVES
        `,
        {
          userId,
          defaultName: process.env.DEFAULT_USER_NAME || 'Trader',
          dailyId: `daily_${today}`,
          today,
          methodName,
          dailyLimitVES,
        }
      )
    );
  } finally {
    await session.close();
  }
}

/**
 * Evento EXECUTE_ORDER: Registra la orden conectándola a su Método de Pago y Cierre Diario
 */
export async function executeOrderInGraph(orderData: TradeOrderNode & { userId: string }): Promise<boolean> {
  const driver = getNeo4jDriver();
  if (!driver) {
    memoryStore.ordenes.unshift({
      ...orderData,
      fecha_operacion: getTodayInVenezuela(),
    });
    return true;
  }

  const session = driver.session();
  try {
    const today = getTodayInVenezuela();
    await session.run(
      `
      MERGE (u:User {id: $userId})
      ON CREATE SET u.name = $defaultName
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
        timestamp: $timestamp,
        fecha_operacion: $today
      })
      CREATE (b)-[:REGISTRO_ORDEN]->(o)
      SET b.consumido_hoy_ves = coalesce(b.consumido_hoy_ves, 0) + $monto_fiat
      `,
      {
        ...orderData,
        defaultName: process.env.DEFAULT_USER_NAME || 'Trader',
        dailyId: `daily_${today}`,
        today,
      }
    );
    return true;
  } finally {
    await session.close();
  }
}

export async function updateOrderInGraph(
  orderData: TradeOrderNode & { userId: string }
): Promise<boolean> {
  const driver = getNeo4jDriver();
  if (!driver) {
    const index = memoryStore.ordenes.findIndex((order) => order.id === orderData.id);
    if (index === -1) return false;
    memoryStore.ordenes[index] = {
      ...memoryStore.ordenes[index],
      ...orderData,
      timestamp: memoryStore.ordenes[index].timestamp,
      fecha_operacion: memoryStore.ordenes[index].fecha_operacion,
    };
    return true;
  }

  const session = driver.session();
  try {
    const result = await session.executeWrite((tx) =>
      tx.run(
        `
        MATCH (u:User {id: $userId})-[:TIENE_CIERRE]->(d:DailyClose)
              -[:OPERA_CON]->(oldBank:BankMethod)-[oldRelation:REGISTRO_ORDEN]->(o:TradeOrder {id: $id})
        WITH d, oldBank, oldRelation, o
        SET oldBank.consumido_hoy_ves =
          CASE WHEN coalesce(oldBank.consumido_hoy_ves, 0) - o.monto_fiat < 0
            THEN 0
            ELSE coalesce(oldBank.consumido_hoy_ves, 0) - o.monto_fiat
          END
        DELETE oldRelation
        WITH d, oldBank, o
        MERGE (newBank:BankMethod {name: $metodo_pago})
        MERGE (d)-[:OPERA_CON]->(newBank)
        SET o.tipo = $tipo,
            o.monto_fiat = $monto_fiat,
            o.monto_cripto = $monto_cripto,
            o.tasa_ejecutada = $tasa_ejecutada,
            o.comision_deductiva = $comision_deductiva,
            o.metodo_pago = $metodo_pago,
            o.id_contraparte = $id_contraparte
        MERGE (newBank)-[:REGISTRO_ORDEN]->(o)
        SET newBank.consumido_hoy_ves = coalesce(newBank.consumido_hoy_ves, 0) + $monto_fiat
        RETURN o.id AS id
        `,
        orderData
      )
    );
    return result.records.length > 0;
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
    sub: `${dClose.ordenes_completadas_hoy} órdenes • P&L: ${
      dClose.ganancia_neta_real_usdt >= 0 ? '+' : ''
    }${dClose.ganancia_neta_real_usdt} USDT`,
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
  summary.metodos
    .filter((method) => method.ordenes_asociadas.length > 0)
    .forEach((m, bIdx) => {
    const bId = `bank_${encodeURIComponent(m.banco.name)}`;
    nodes.push({
      id: bId,
      label: 'BankMethod',
      title: m.banco.name,
      sub: m.disponible_ves === null
        ? `Usado: ${m.consumido_hoy_ves.toLocaleString()} VES`
        : `Disp: ${m.disponible_ves.toLocaleString()} VES (Usado: ${m.consumido_hoy_ves.toLocaleString()})`,
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
      label: m.banco.limite_diario_maximo_ves === null
        ? 'OPERA_CON'
        : `OPERA_CON (${((m.consumido_hoy_ves / Math.max(1, m.banco.limite_diario_maximo_ves)) * 100).toFixed(0)}%)`,
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
