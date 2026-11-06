/** Calculates the entry rate using a user-supplied fee rate expressed as a decimal. */
export function calcularTasaCompraMaxima(
  tasaVentaActual: number,
  margenDeseadoPorc: number,
  comisionMaker: number
): number {
  const margenDec = margenDeseadoPorc / 100;
  return Number((tasaVentaActual / (1 + margenDec + comisionMaker)).toFixed(2));
}

export function calcularSpread(precioCompra: number, precioVenta: number): number {
  if (precioCompra <= 0) return 0;
  return Number((((precioVenta - precioCompra) / precioCompra) * 100).toFixed(2));
}

export function calcularMargenNeto(
  tasaCompra: number,
  tasaVenta: number,
  comisionMaker: number
): number {
  if (tasaCompra <= 0) return 0;
  const spreadBruto = (tasaVenta - tasaCompra) / tasaCompra;
  const spreadNeto = spreadBruto - (comisionMaker * 2); // entrada y salida
  return Number((spreadNeto * 100).toFixed(2));
}
