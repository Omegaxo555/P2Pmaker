/**
 * Algoritmo de Cálculo de Tasa Maker:
 * Tasa_Compra_Máxima = Tasa_Venta_Actual / (1 + Margen_Deseado + 0.0025)
 * 0.0025 representa la comisión maker de Binance P2P (0.25%)
 */
export function calcularTasaCompraMaxima(tasaVentaActual: number, margenDeseadoPorc: number): number {
  const margenDec = margenDeseadoPorc / 100;
  return Number((tasaVentaActual / (1 + margenDec + 0.0025)).toFixed(2));
}

export function calcularSpread(precioCompra: number, precioVenta: number): number {
  if (precioCompra <= 0) return 0;
  return Number((((precioVenta - precioCompra) / precioCompra) * 100).toFixed(2));
}

export function calcularMargenNeto(
  tasaCompra: number,
  tasaVenta: number,
  comisionMaker = 0.0025
): number {
  if (tasaCompra <= 0) return 0;
  const spreadBruto = (tasaVenta - tasaCompra) / tasaCompra;
  const spreadNeto = spreadBruto - (comisionMaker * 2); // entrada y salida
  return Number((spreadNeto * 100).toFixed(2));
}
