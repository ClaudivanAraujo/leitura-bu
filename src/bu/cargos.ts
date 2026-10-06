/** Códigos da seção 1.5 do manual do TSE. */
export const NOMES_CARGO: Readonly<Record<number, string>> = {
  1: "Presidente",
  3: "Governador",
  5: "Senador",
  6: "Deputado Federal",
  7: "Deputado Estadual",
  8: "Deputado Distrital",
  11: "Prefeito",
  13: "Vereador",
  25: "Conselheiro Distrital",
};

export function nomeCargo(codigo: number): string {
  return NOMES_CARGO[codigo] ?? `Cargo ${codigo}`;
}
