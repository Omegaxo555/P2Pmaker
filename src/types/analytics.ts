export interface ControlFinanciero {
  capital_actual_usdt: number;
  ganancia_neta_real_ves: number;
  ganancia_neta_real_usdt: number;
  ordenes_completadas_hoy: number;
}

export interface LimiteBancarioActivo {
  banco: string;
  limite_diario_maximo_ves: number | null;
  consumido_hoy_ves: number;
  disponible_ves: number | null;
}

export interface SugerenciaMaker {
  tasa_compra: number;
  tasa_venta: number;
  margen_neto_estimado_porc: number;
  alerta_limite_banco: boolean;
}

export interface FinancialAssistantResponse {
  control_financiero: ControlFinanciero;
  limites_bancarios_activos: LimiteBancarioActivo[];
  sugerencia_maker: SugerenciaMaker;
}
