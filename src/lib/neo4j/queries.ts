import { getNeo4jDriver } from './driver';
import type { UserGraphSummary, OrdenNode, OfertaNode } from '@/types/neo4j';
import type { GraphTopology, GraphNode, GraphEdge } from '@/types/graphTopology';

// Estado en memoria volátil de respaldo para el usuario (si Neo4j no está conectado)
let memoryStore = {
  user: { id: 'usr_123', name: 'Paulo' },
  metodos: [
    {
      banco: { name: 'Pago Movil - Banesco', diario_max: 50000, consumido_hoy: 0 },
      disponible_hoy: 50000,
      consumido_hoy: 0,
      tiempo_promedio_min: 8,
    },
    {
      banco: { name: 'Pago Movil - Mercantil', diario_max: 40000, consumido_hoy: 0 },
      disponible_hoy: 40000,
      consumido_hoy: 0,
      tiempo_promedio_min: 10,
    },
    {
      banco: { name: 'Transferencia - Venezuela', diario_max: 100000, consumido_hoy: 0 },
      disponible_hoy: 100000,
      consumido_hoy: 0,
      tiempo_promedio_min: 14,
    },
  ],
  ordenes_reales_hoy: [] as OrdenNode[],
  ofertas: [] as OfertaNode[],
  contrapartes: [
    { id: 'comerciante_verif_01', ordenes_con_usuario: 5, liberacion_rapida: true, sospechosa: false },
    { id: 'bad_trader_44', ordenes_con_usuario: 1, liberacion_rapida: false, sospechosa: true },
  ],
};

/**
 * Calcula la balanza de P&L diaria real usando únicamente transacciones confirmadas
 */
function calcularBalanceReal(ordenes: OrdenNode[]) {
  const compras = ordenes.filter((o) => o.tipo === 'BUY');
  const ventas = ordenes.filter((o) => o.tipo === 'SELL');

  const totalPagadoComprasVES = compras.reduce((acc, o) => acc + o.monto_fiat, 0);
  const totalRecibidoVentasVES = ventas.reduce((acc, o) => acc + o.monto_fiat, 0);
  const totalComisionesUSDT = ordenes.reduce((acc, o) => acc + o.comision_deductiva, 0);

  // Tasa promedio de recompra real ponderada
  const tasaPromedioRecompra =
    compras.length > 0
      ? totalPagadoComprasVES / Math.max(1, compras.reduce((acc, o) => acc + o.monto_cripto, 0))
      : ventas.length > 0
      ? ventas[0].tasa_ejecutada
      : 1;

  const comisionesVES = totalComisionesUSDT * tasaPromedioRecompra;

  // Fórmula oficial: Ganancia_Neta_VES = Sum(Ventas_VES) - Sum(Compras_VES) - Comisiones_VES
  const gananciaNetaVES =
    compras.length > 0 && ventas.length > 0
      ? totalRecibidoVentasVES - totalPagadoComprasVES - comisionesVES
      : 0;

  const gananciaNetaUSDT = tasaPromedioRecompra > 0 ? gananciaNetaVES / tasaPromedioRecompra : 0;
  const capitalRotadoUSDT = ordenes.reduce((acc, o) => acc + o.monto_cripto, 0);

  return {
    fecha: new Date().toISOString().split('T')[0],
    ganancia_neta_ves: Number(gananciaNetaVES.toFixed(2)),
    ganancia_neta_usdt: Number(gananciaNetaUSDT.toFixed(2)),
    comisiones_totales_ves: Number(comisionesVES.toFixed(2)),
    comisiones_pagadas_usdt: Number(totalComisionesUSDT.toFixed(4)),
    ordenes_totales: ordenes.length,
    capital_rotado_usdt: Number(capitalRotadoUSDT.toFixed(2)),
  };
}

export async function getUserGraphHistory(userId: string): Promise<UserGraphSummary> {
  const driver = getNeo4jDriver();

  if (!driver) {
    const balance = calcularBalanceReal(memoryStore.ordenes_reales_hoy);
    return {
      user: memoryStore.user,
      metodos: memoryStore.metodos,
      ordenes_reales_hoy: memoryStore.ordenes_reales_hoy,
      cierre_diario_actual: balance,
      contrapartes: memoryStore.contrapartes,
    };
  }

  const session = driver.session();
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await session.run(
      `
      MERGE (u:User {id: $userId})
      ON CREATE SET u.name = $defaultName
      WITH u
      OPTIONAL MATCH (u)-[:USO_METODO]->(b:BankMethod)
      OPTIONAL MATCH (u)-[:EJECUTO]->(o:Orden)
        WHERE o.timestamp STARTS WITH $today
      OPTIONAL MATCH (u)-[:INTERACTUO_CON]->(c:Contraparte)
      RETURN u,
             collect(DISTINCT b) as bancos,
             collect(DISTINCT o) as ordenes,
             collect(DISTINCT c) as contrapartes
      `,
      { userId, defaultName: process.env.DEFAULT_USER_NAME || 'Paulo', today }
    );

    const record = result.records[0];
    const uProps = record.get('u').properties;
    const rawBancos = record.get('bancos') || [];
    const rawOrdenes = record.get('ordenes') || [];
    const rawContrapartes = record.get('contrapartes') || [];

    const metodos = rawBancos
      .filter((b: any) => b && b.properties)
      .map((b: any) => {
        const bp = b.properties;
        const max = Number(bp.diario_max || 50000);
        const consumido = Number(bp.consumido_hoy || 0);
        return {
          banco: { name: bp.name, diario_max: max, consumido_hoy: consumido },
          disponible_hoy: Math.max(0, max - consumido),
          consumido_hoy: consumido,
          tiempo_promedio_min: Number(bp.tiempo_promedio_min || 8),
        };
      });

    const ordenes: OrdenNode[] = rawOrdenes
      .filter((o: any) => o && o.properties)
      .map((o: any) => ({
        id: o.properties.id,
        id_anuncio: o.properties.id_anuncio,
        tipo: o.properties.tipo,
        monto_fiat: Number(o.properties.monto_fiat),
        monto_cripto: Number(o.properties.monto_cripto),
        tasa_ejecutada: Number(o.properties.tasa_ejecutada),
        comision_deductiva: Number(o.properties.comision_deductiva),
        id_contraparte: o.properties.id_contraparte,
        timestamp: o.properties.timestamp,
      }));

    const contrapartes = rawContrapartes
      .filter((c: any) => c && c.properties)
      .map((c: any) => ({
        id: c.properties.id,
        ordenes_con_usuario: Number(c.properties.ordenes_con_usuario || 1),
        liberacion_rapida: Boolean(c.properties.liberacion_rapida),
        sospechosa: Boolean(c.properties.sospechosa),
      }));

    const cierre = calcularBalanceReal(ordenes);

    return {
      user: { id: uProps.id, name: uProps.name },
      metodos: metodos.length > 0 ? metodos : memoryStore.metodos,
      ordenes_reales_hoy: ordenes,
      cierre_diario_actual: cierre,
      contrapartes,
    };
  } finally {
    await session.close();
  }
}

/**
 * Evento CREATE_AD: Registro de Oferta Maker
 */
export async function createAdInGraph(adData: OfertaNode & { userId: string }): Promise<boolean> {
  const driver = getNeo4jDriver();

  if (!driver) {
    memoryStore.ofertas.unshift(adData);
    return true;
  }

  const session = driver.session();
  try {
    await session.run(
      `
      MATCH (u:User {id: $userId})
      MERGE (b:BankMethod {name: $metodo_pago})
      CREATE (a:Oferta {
        id: $id,
        tipo: $tipo,
        tasa_publicada: $tasa_publicada,
        fiat: $fiat,
        cripto: $cripto,
        metodo_pago: $metodo_pago,
        comision_maker: $comision_maker,
        timestamp: datetime()
      })
      CREATE (u)-[:PUBLICO]->(a)
      CREATE (a)-[:METODO_ASOCIADO]->(b)
      `,
      adData
    );
    return true;
  } finally {
    await session.close();
  }
}

/**
 * Evento EXECUTE_ORDER: Registro de Orden Real Ejecutada
 */
export async function executeOrderInGraph(orderData: OrdenNode & { userId: string; metodoPago: string }): Promise<boolean> {
  const driver = getNeo4jDriver();

  if (!driver) {
    memoryStore.ordenes_reales_hoy.unshift(orderData);
    // Actualizar consumido del banco
    const target = memoryStore.metodos.find((m) => m.banco.name === orderData.metodoPago);
    if (target) {
      target.consumido_hoy += orderData.monto_fiat;
      target.banco.consumido_hoy += orderData.monto_fiat;
      target.disponible_hoy = Math.max(0, target.banco.diario_max - target.consumido_hoy);
    }
    return true;
  }

  const session = driver.session();
  try {
    await session.run(
      `
      MATCH (u:User {id: $userId})
      MERGE (b:BankMethod {name: $metodoPago})
      MERGE (c:Contraparte {id: $id_contraparte})
      CREATE (o:Orden {
        id: $id,
        id_anuncio: $id_anuncio,
        tipo: $tipo,
        monto_fiat: $monto_fiat,
        monto_cripto: $monto_cripto,
        tasa_ejecutada: $tasa_ejecutada,
        comision_deductiva: $comision_deductiva,
        id_contraparte: $id_contraparte,
        timestamp: datetime()
      })
      CREATE (u)-[:EJECUTO]->(o)
      CREATE (o)-[:USO_METODO]->(b)
      CREATE (o)-[:OPERA_CON]->(c)
      SET b.consumido_hoy = coalesce(b.consumido_hoy, 0) + $monto_fiat
      SET c.ordenes_con_usuario = coalesce(c.ordenes_con_usuario, 0) + 1
      `,
      orderData
    );
    return true;
  } finally {
    await session.close();
  }
}

/**
 * Topología real del grafo estructurado
 */
export async function getGraphTopology(userId: string): Promise<GraphTopology> {
  const graphSummary = await getUserGraphHistory(userId);

  const nodes: GraphNode[] = [
    {
      id: graphSummary.user.id,
      label: 'User',
      title: `${graphSummary.user.name} (Trader)`,
      sub: `ID: ${graphSummary.user.id}`,
      properties: { ...graphSummary.user, rol: 'Control Financiero P2P' },
    },
  ];

  const edges: GraphEdge[] = [];

  // Nodos de Bancos
  graphSummary.metodos.forEach((m, idx) => {
    const bId = `bank_${m.banco.name.replace(/\s+/g, '_')}`;
    nodes.push({
      id: bId,
      label: 'BankMethod',
      title: m.banco.name,
      sub: `Disp: ${m.disponible_hoy.toLocaleString()} VES (Usado: ${m.consumido_hoy.toLocaleString()})`,
      properties: {
        limite_diario_total: m.banco.diario_max,
        limite_consumido_real: m.consumido_hoy,
        limite_disponible: m.disponible_hoy,
        tiempo_promedio_liberacion: `${m.tiempo_promedio_min} min`,
      },
    });

    edges.push({
      id: `pref_${idx}`,
      from: graphSummary.user.id,
      to: bId,
      type: 'PREFIERE',
      label: `LIMITE (${((m.consumido_hoy / Math.max(1, m.banco.diario_max)) * 100).toFixed(0)}% USADO)`,
    });
  });

  // Nodos de Órdenes Reales
  graphSummary.ordenes_reales_hoy.forEach((ord, idx) => {
    const oId = ord.id;
    nodes.push({
      id: oId,
      label: 'Trade',
      title: `Orden ${ord.id}`,
      sub: `${ord.tipo}: ${ord.monto_cripto} USDT @ ${ord.tasa_ejecutada} VES`,
      properties: {
        tipo: ord.tipo,
        monto_fiat: ord.monto_fiat,
        monto_cripto: ord.monto_cripto,
        comision_maker_usdt: ord.comision_deductiva,
        contraparte: ord.id_contraparte,
        fecha: ord.timestamp,
      },
    });

    edges.push({
      id: `exec_${idx}`,
      from: graphSummary.user.id,
      to: oId,
      type: 'EJECUTO',
      label: `EXECUTE_ORDER (${ord.tipo})`,
    });
  });

  // Nodos de Contrapartes
  graphSummary.contrapartes.forEach((cp, idx) => {
    nodes.push({
      id: cp.id,
      label: 'Contraparte',
      title: cp.id,
      sub: cp.sospechosa ? 'Sospechosa (Bloqueada)' : `${cp.ordenes_con_usuario} órdenes completadas`,
      properties: cp,
    });

    edges.push({
      id: `cp_rel_${idx}`,
      from: graphSummary.user.id,
      to: cp.id,
      type: cp.sospechosa ? 'BLOQUEO' : 'PREFIERE',
      label: cp.sospechosa ? 'BLOQUEO (RIESGO)' : 'VERIFICADO',
    });
  });

  return { nodes, edges };
}
