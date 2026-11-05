export interface UserNode {
  id: string;
  name: string;
}

export interface BankMethodNode {
  name: string;
  diario_max: number;
  consumido_hoy: number;
}

export interface TradeNode {
  id: string;
  fecha: string;
  usdt_monto: number;
  tasa: number;
  tipo: 'BUY_MAKER' | 'SELL_MAKER';
  exito?: boolean;
}

export interface PrefiereRelation {
  peso_exito: number;
  tiempo_promedio_min: number;
}

export interface UserGraphSummary {
  user: UserNode;
  metodos: Array<{
    banco: BankMethodNode;
    preferencia: PrefiereRelation;
    disponible_hoy: number;
  }>;
  trades_recientes: TradeNode[];
  contrapartes_bloqueadas: string[];
}
