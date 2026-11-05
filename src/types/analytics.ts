export interface Analytics {
  capital_inicial_usdt: number;
  ganancia_acumulada_usdt: number;
  vueltas_completadas: number;
  spread_promedio_porc: number;
}

export interface GraficaRendimiento {
  eje_x_labels: string[];
  serie_capital: number[];
  serie_ganancias: number[];
}

export type AccionSugerida = 'COMPRAR_MAKER' | 'VENDER_MAKER' | 'ESPERAR';

export interface RecomendacionTrade {
  accion_sugerida: AccionSugerida;
  tasa_sugerida: number;
  metodo_pago_optimo: string;
  margen_neto_estimado_porc: number;
  razon_tactica: string;
}

export interface AIResponsePayload {
  analytics: Analytics;
  grafica_rendimiento: GraficaRendimiento;
  recomendacion_trade: RecomendacionTrade;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  parsedJson?: AIResponsePayload | null;
  timestamp: string;
}

