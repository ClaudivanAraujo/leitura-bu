import { ErroFormatoBu, type QrCertificado, type QrCodigo, type QrDados } from "./tipos";

const TOKEN_COMPLETO = /^(?:[A-Z][A-Z0-9]*|\d+):[^\s]+$/;

export function juntarFragmentos(fragmentos: readonly string[]): string {
  let acumulado = "";
  for (const fragmento of fragmentos) {
    if (!fragmento) continue;
    if (!acumulado) {
      acumulado = fragmento;
      continue;
    }
    const esquerda = acumulado.slice(acumulado.lastIndexOf(" ") + 1);
    const corte = fragmento.indexOf(" ");
    const direita = corte === -1 ? fragmento : fragmento.slice(0, corte);
    const emendaEntreRegistros = TOKEN_COMPLETO.test(esquerda) && TOKEN_COMPLETO.test(direita);
    acumulado += `${emendaEntreRegistros ? " " : ""}${fragmento}`;
  }
  return acumulado;
}

function indiceTotal(valor: string, rotulo: string): { indice: number; total: number } {
  const partes = valor.split(":");
  if (partes.length !== 2 || !/^\d+$/.test(partes[0]) || !/^\d+$/.test(partes[1])) {
    throw new ErroFormatoBu(`${rotulo} inválido: ${valor}`);
  }
  const indice = Number(partes[0]);
  const total = Number(partes[1]);
  if (indice < 1 || total < 1 || indice > total) {
    throw new ErroFormatoBu(`${rotulo} fora da sequência: ${indice} de ${total}`);
  }
  return { indice, total };
}

function exigirHex(valor: string, campo: string): string {
  if (!/^[0-9A-F]+$/i.test(valor)) {
    throw new ErroFormatoBu(`${campo} não está em hexadecimal.`);
  }
  return valor.toUpperCase();
}

/**
 * Lê um QR Code de dados (QRBU) ou de certificado (QRCE).
 * O texto é o payload alfanumérico, em uma única linha.
 */
export function parseQr(bruto: string): QrCodigo {
  const texto = bruto.trim();
  if (!texto) {
    throw new ErroFormatoBu("QR Code vazio.");
  }

  const espaco = texto.indexOf(" ");
  const primeiro = espaco === -1 ? texto : texto.slice(0, espaco);
  const separador = primeiro.indexOf(":");
  if (separador <= 0) {
    throw new ErroFormatoBu("QR Code sem marca de início.");
  }
  const marca = primeiro.slice(0, separador);
  const cabeca = primeiro.slice(separador + 1);

  if (marca === "QRBU") return parseDados(texto, cabeca);
  if (marca === "QRCE") return parseCertificado(texto, cabeca);
  throw new ErroFormatoBu("QR Code não é de boletim nem de certificado.");
}

function parseDados(texto: string, cabeca: string): QrDados {
  const { indice, total } = indiceTotal(cabeca, "QRBU");
  const match = texto.match(/^QRBU:\d+:\d+ VRQR:(\d+\.\d+) ([\s\S]*?) HASH:([0-9A-Fa-f]+)(?: ASSI:([0-9A-Fa-f]+))?$/);
  if (!match) {
    throw new ErroFormatoBu("QR de dados fora do formato QRBU / VRQR / HASH.");
  }
  const versao = match[1];
  const dados = match[2];
  if (!dados) {
    throw new ErroFormatoBu("QR de dados sem conteúdo.");
  }
  const hash = exigirHex(match[3], "HASH");
  if (hash.length !== 128) {
    throw new ErroFormatoBu("HASH deve ser SHA-512 em 128 caracteres hexadecimais.");
  }
  const assinatura = match[4] ? exigirHex(match[4], "ASSI") : null;
  return { tipo: "dados", indice, total, versao, dados, hash, assinatura, bruto: texto };
}

function parseCertificado(texto: string, cabeca: string): QrCertificado {
  const { indice, total } = indiceTotal(cabeca, "QRCE");
  const campos = new Map<string, string>();
  const resto = texto.slice(texto.indexOf(" ") + 1);
  if (!resto || resto === texto) {
    throw new ErroFormatoBu("QR de certificado sem campos.");
  }
  for (const token of resto.split(/\s+/)) {
    const separador = token.indexOf(":");
    if (separador <= 0) {
      throw new ErroFormatoBu(`Registro inválido no certificado: ${token}`);
    }
    campos.set(token.slice(0, separador), token.slice(separador + 1));
  }
  const idUrna = campos.get("IDUE");
  const modelo = campos.get("MDUE");
  const certificado = campos.get("CERT");
  if (!idUrna || !modelo || !certificado) {
    throw new ErroFormatoBu("Certificado sem IDUE, MDUE ou CERT.");
  }
  return {
    tipo: "certificado",
    indice,
    total,
    idUrna,
    modelo,
    certificado: exigirHex(certificado, "CERT"),
    bruto: texto,
  };
}
