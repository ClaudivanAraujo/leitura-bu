import type { Boletim, CabecalhoBu, ItemHash, QrCertificado, QrDados } from "./tipos";

export const VERSAO_APP = "0.1.0";

export interface ArquivoBu {
  nome: string;
  conteudo: string;
}

export interface DadosArquivo {
  lidoEm: Date;
  boletim: Boletim;
  hashes: readonly ItemHash[];
  qrsDados: readonly QrDados[];
  qrsCertificado: readonly QrCertificado[];
}

function pedaco(valor: string | number | null, reserva: string): string {
  const limpo = String(valor ?? "").replace(/[^0-9A-Za-z]+/g, "");
  return limpo || reserva;
}

export function nomeArquivo(cabecalho: CabecalhoBu): string {
  return [
    "BU",
    pedaco(cabecalho.uf, "UF"),
    pedaco(cabecalho.municipio, "MUNI"),
    pedaco(cabecalho.zona, "ZONA"),
    pedaco(cabecalho.secao, "SECA"),
    `T${pedaco(cabecalho.turno, "x")}`,
  ].join("_") + ".json";
}

export function montarArquivo(dados: DadosArquivo): ArquivoBu {
  const ultimo = dados.qrsDados[dados.qrsDados.length - 1];
  const nome = nomeArquivo(dados.boletim.cabecalho);
  const documento = {
    versaoApp: VERSAO_APP,
    lidoEm: dados.lidoEm.toISOString(),
    cabecalho: dados.boletim.cabecalho,
    eleicoes: dados.boletim.eleicoes,
    hash: {
      valido: dados.hashes.length > 0 && dados.hashes.every((item) => item.valido === true),
      itens: dados.hashes.map((item) => ({
        indice: item.indice,
        informado: item.hashInformado,
        calculado: item.hashCalculado,
        valido: item.valido,
      })),
    },
    assinatura: {
      hash: ultimo?.hash ?? null,
      assi: ultimo?.assinatura ?? null,
      certificado: dados.qrsCertificado.map((qr) => qr.certificado).join(""),
      modeloUrna: dados.qrsCertificado[0]?.modelo ?? null,
      idUrna: dados.qrsCertificado[0]?.idUrna ?? dados.boletim.cabecalho.idUrna,
    },
    qrCodes: {
      dados: dados.qrsDados.map((qr) => ({
        indice: qr.indice,
        total: qr.total,
        versao: qr.versao,
        texto: qr.bruto,
      })),
      certificado: dados.qrsCertificado.map((qr) => ({
        indice: qr.indice,
        total: qr.total,
        idUrna: qr.idUrna,
        modelo: qr.modelo,
        certificado: qr.certificado,
        texto: qr.bruto,
      })),
    },
  };
  return { nome, conteudo: `${JSON.stringify(documento, null, 2)}\n` };
}
