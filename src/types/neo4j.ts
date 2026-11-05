export interface UserNode {
  id: string;
  name: string;
}

export interface BankMethodNode {
  name: string;
  diario_max: number;
  consumido_hoy: number;
}

export interface OfertaNode {
  id: string;
  tipo: 'COMPRA' | 'VENTA';
  tasa_publicada: number;
  fiat: string;
  cripto: string;
  metodo_pago: string;
  comision_maker: number;
  timestamp: string;
}

export interface OrdenNode {
  id: string;
  id_anuncio?: string;
  tipo: 'BUY' | 'SELL';
  monto_fiat: number;
  monto_cripto: number;
  tasa_ejecutada: number;
  comision_deductiva: number;
  id_contraparte: string;
  timestamp: string;
  exito?: boolean;
}

export interface ContraparteNode {
  id: string;
  ordenes_con_usuario: number;
  liberacion_rapida: boolean;
  sospechosa: boolean;
}

export interface CierreDiarioNode {
  fecha: string;
  ganancia_neta_ves: number;
  ganancia_neta_usdt: number;
  comisiones_totales_ves: number;
  comisiones_pagadas_usdt: number;
  ordenes_totales: number;
  capital_rotado_usdt: number;
}

export interface UserGraphSummary {
  user: UserNode;
  metodos: Array<{
    banco: BankMethodNode;
    disponible_hoy: number;
    consumido_hoy: number;
    tiempo_promedio_min: number;
  }>;
  ordenes_reales_hoy: OrdenNode[];
  cierre_diario_actual: CierreDiarioNode;
  contrapartes: ContraparteNode[];
}
