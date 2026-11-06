export interface UserNode {
  id: string;
  name: string;
}

export interface BankMethodNode {
  name: string;
  limite_diario_maximo_ves: number | null;
  consumido_hoy_ves: number;
}

export interface DailyCloseNode {
  id: string; // ej: daily_2026-11-05
  fecha: string;
  capital_actual_usdt: number;
  ganancia_neta_real_ves: number;
  ganancia_neta_real_usdt: number;
  ordenes_completadas_hoy: number;
}

export interface TradeOrderNode {
  id: string;
  tipo: 'BUY' | 'SELL';
  monto_fiat: number;
  monto_cripto: number;
  tasa_ejecutada: number;
  comision_deductiva: number;
  metodo_pago: string;
  id_contraparte: string;
  timestamp: string;
  fecha_operacion?: string;
}

export interface UserGraphSummary {
  user: UserNode;
  daily_close: DailyCloseNode;
  storage: 'neo4j' | 'memory';
  metodos: Array<{
    banco: BankMethodNode;
    disponible_ves: number | null;
    consumido_hoy_ves: number;
    ordenes_asociadas: TradeOrderNode[];
  }>;
  todas_ordenes_hoy: TradeOrderNode[];
}
