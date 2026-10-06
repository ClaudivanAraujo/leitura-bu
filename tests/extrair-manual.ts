import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export interface QrExtraido {
  bruto: string;
  /** Hexadecimal do HASH como está na cópia do PDF, só sem espaços. */
  hexHashColetado: string;
}

function lerManual(): string {
  const arquivo = fileURLToPath(new URL("../docs/manual-bu.md", import.meta.url));
  return readFileSync(arquivo, "utf8");
}

function blocosQr(trecho: string): string[] {
  return trecho
    .split(/(?=QRBU:\d+:\d+)/)
    .map((parte) => parte.trim())
    .filter((parte) => parte.startsWith("QRBU:"));
}

/**
 * A cópia do PDF quebra a linha única do QR e insere espaços no meio do hexadecimal.
 * Aqui só se junta essa quebra: o conteúdo permanece como foi copiado, e o HASH
 * usado no QR fica com os 128 dígitos do SHA-512. Dígitos além disso são guardados
 * em hexHashColetado para o teste mostrar o excedente, sem apagá-lo do arquivo.
 */
export function qrDoBloco(bloco: string): QrExtraido {
  const linha = bloco.replace(/\s+/g, " ").trim().split(/\s+ASSINATURA\b/)[0].trim();
  const tokens = linha.split(" ");
  const saida: string[] = [];
  let hexHashColetado = "";

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.startsWith("HASH:") || token.startsWith("ASSI:")) {
      const prefixo = token.startsWith("HASH:") ? "HASH:" : "ASSI:";
      let hex = token.slice(prefixo.length);
      while (i + 1 < tokens.length && /^[0-9A-F]+$/i.test(tokens[i + 1])) {
        i += 1;
        hex += tokens[i];
      }
      hex = hex.toUpperCase();
      if (prefixo === "HASH:") {
        hexHashColetado = hex;
        if (hex.length < 128) {
          throw new Error(`HASH do manual com ${hex.length} dígitos hexadecimais.`);
        }
        saida.push(`HASH:${hex.slice(0, 128)}`);
      } else {
        saida.push(`ASSI:${hex}`);
      }
      continue;
    }
    saida.push(token);
  }

  if (!hexHashColetado) {
    throw new Error("Bloco do manual sem HASH.");
  }
  return { bruto: saida.join(" "), hexHashColetado };
}

export function exemploPequeno(): QrExtraido[] {
  const texto = lerManual();
  const inicio = texto.indexOf("QRBU:1:2 ");
  const fim = texto.indexOf("QRBU:1:9 ");
  if (inicio < 0 || fim < inicio) {
    throw new Error("Exemplo pequeno não encontrado em docs/manual-bu.md.");
  }
  return blocosQr(texto.slice(inicio, fim)).map(qrDoBloco);
}

export function exemploGrande(): QrExtraido[] {
  const texto = lerManual();
  const inicio = texto.indexOf("QRBU:1:9 ");
  const fim = texto.indexOf("1.6. Assinatura");
  if (inicio < 0 || fim < inicio) {
    throw new Error("Exemplo grande não encontrado em docs/manual-bu.md.");
  }
  return blocosQr(texto.slice(inicio, fim)).map(qrDoBloco);
}
