export interface ControlDiarioReal {
  fecha: string;
  ordenes_completadas: number;
  capital_rotado_usdt: number;
  ganancia_neta_real_usdt: number;
  ganancia_neta_real_ves: number;
  comisiones_pagadas_usdt: number;
}

export interface EstadoLimiteBanco {
  metodo_pago: string;
  limite_diario_total: number;
  limite_consumido_real: number;
  limite_disponible: number;
}

export interface RecomendacionMercadoAPI {
  tasa_compra_sugerida: number;
  tasa_venta_sugerida: number;
  spread_teorico_porc: number;
  requiere_confirmacion_usuario: boolean;
}

export interface FinancialAssistantResponse {
  control_diario_real: ControlDiarioReal;
  estado_limites_banco: EstadoLimiteBanco[];
  recomendacion_mercado_api: RecomendacionMercadoAPI;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  parsedJson?: FinancialAssistantResponse | null;
  timestamp: string;
}
