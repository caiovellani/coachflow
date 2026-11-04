type LoadValue = { toString(): string } | null;

/** 60.50 + KG -> "60,5 kg" */
export function formatLoad(load: LoadValue, unit: string = "KG"): string | null {
  if (load === null) return null;
  const value = Number(load.toString()).toLocaleString("pt-BR");
  return `${value} ${unit.toLowerCase()}`;
}
