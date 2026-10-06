import type { QrDados } from "./tipos";

const HEX = "0123456789ABCDEF";

/**
 * SHA-512 em hexadecimal maiúsculo, via crypto.subtle.
 * O conjunto alfanumérico do QR é ASCII, então UTF-8 coincide com os bytes do texto.
 */
export async function sha512Hex(texto: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(texto));
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (const byte of bytes) {
    hex += HEX[byte >> 4];
    hex += HEX[byte & 0x0f];
  }
  return hex;
}

/**
 * Entrada do hash cumulativo (manual, seção 1.6.1), confirmada nos exemplos:
 * o primeiro QR resume só o seu conteúdo; cada seguinte resume
 * `dados1 HASH:hash1 dados2 HASH:hash2 ... dadosN`, com um espaço entre as partes.
 * O cabeçalho QRBU/VRQR fica de fora. O hash anterior entra em hexadecimal maiúsculo.
 */
export function montarEntradaHash(
  anteriores: readonly Pick<QrDados, "dados" | "hash">[],
  dados: string,
): string {
  if (anteriores.length === 0) return dados;
  const prefixo = anteriores.map((qr) => `${qr.dados} HASH:${qr.hash}`).join(" ");
  return `${prefixo} ${dados}`;
}
