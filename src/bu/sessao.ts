import { montarEntradaHash, sha512Hex } from "./hash";
import { parseQr } from "./parse-qr";
import { interpretarBoletim } from "./interpretar";
import {
  ErroFormatoBu,
  type Boletim,
  type ItemHash,
  type ProgressoLeitura,
  type QrCertificado,
  type QrCodigo,
  type QrDados,
  type ResultadoHash,
  type ResultadoInclusao,
} from "./tipos";

function faltando(total: number | null, presentes: ReadonlySet<number>): number[] {
  if (total == null) return [];
  const lista: number[] = [];
  for (let indice = 1; indice <= total; indice += 1) {
    if (!presentes.has(indice)) lista.push(indice);
  }
  return lista;
}

function ordenarDados(qrs: readonly QrDados[]): QrDados[] {
  return [...qrs].sort((a, b) => a.indice - b.indice);
}

function ordenarCertificados(qrs: readonly QrCertificado[]): QrCertificado[] {
  return [...qrs].sort((a, b) => a.indice - b.indice);
}

export class SessaoLeitura {
  private readonly dados = new Map<number, QrDados>();
  private readonly certificados = new Map<number, QrCertificado>();
  private totalDados: number | null = null;
  private totalCertificado: number | null = null;

  adicionar(bruto: string): ResultadoInclusao {
    let qr: QrCodigo;
    try {
      qr = parseQr(bruto);
    } catch (erro) {
      const motivo = erro instanceof ErroFormatoBu ? erro.message : "QR Code inválido.";
      return { ok: false, motivo };
    }

    if (qr.tipo === "dados") return this.adicionarDados(qr);
    return this.adicionarCertificado(qr);
  }

  private adicionarDados(qr: QrDados): ResultadoInclusao {
    if (this.totalDados != null && qr.total !== this.totalDados) {
      return { ok: false, motivo: "Este QR de dados pertence a outro boletim." };
    }
    const anterior = this.dados.get(qr.indice);
    if (anterior) {
      if (anterior.bruto === qr.bruto) return { ok: true, qr: anterior, duplicado: true };
      return { ok: false, motivo: `O QR de dados ${qr.indice} já foi lido com outro conteúdo.` };
    }
    this.totalDados = qr.total;
    this.dados.set(qr.indice, qr);
    return { ok: true, qr, duplicado: false };
  }

  private adicionarCertificado(qr: QrCertificado): ResultadoInclusao {
    if (this.totalCertificado != null && qr.total !== this.totalCertificado) {
      return { ok: false, motivo: "Este QR de certificado pertence a outra urna." };
    }
    const anterior = this.certificados.get(qr.indice);
    if (anterior) {
      if (anterior.bruto === qr.bruto) return { ok: true, qr: anterior, duplicado: true };
      return { ok: false, motivo: `O QR de certificado ${qr.indice} já foi lido com outro conteúdo.` };
    }
    this.totalCertificado = qr.total;
    this.certificados.set(qr.indice, qr);
    return { ok: true, qr, duplicado: false };
  }

  progresso(): ProgressoLeitura {
    const dadosFaltando = faltando(this.totalDados, new Set(this.dados.keys()));
    const certificadoFaltando = faltando(this.totalCertificado, new Set(this.certificados.keys()));
    const dadosCompletos = this.totalDados != null && dadosFaltando.length === 0;
    const certificadoCompleto = this.totalCertificado != null && certificadoFaltando.length === 0;
    return {
      dados: { lidos: this.dados.size, total: this.totalDados, faltando: dadosFaltando },
      certificado: {
        lidos: this.certificados.size,
        total: this.totalCertificado,
        faltando: certificadoFaltando,
      },
      completo: dadosCompletos && certificadoCompleto,
    };
  }

  descreverProgresso(): string {
    const progresso = this.progresso();
    const dados = progresso.dados.total == null
      ? "Dados 0"
      : `Dados ${progresso.dados.lidos} de ${progresso.dados.total}`;
    const certificado = progresso.certificado.total == null
      ? "Certificado 0"
      : `Certificado ${progresso.certificado.lidos} de ${progresso.certificado.total}`;
    return `${dados} | ${certificado}`;
  }

  qrsDados(): QrDados[] {
    return ordenarDados([...this.dados.values()]);
  }

  qrsCertificado(): QrCertificado[] {
    return ordenarCertificados([...this.certificados.values()]);
  }

  /** Concatena os campos CERT na ordem do índice, para a validação futura da assinatura. */
  certificado(): string | null {
    const progresso = this.progresso();
    if (progresso.certificado.total == null || progresso.certificado.faltando.length > 0) return null;
    return this.qrsCertificado().map((qr) => qr.certificado).join("");
  }

  async validarHashes(): Promise<ResultadoHash> {
    const presentes = this.dados;
    const total = this.totalDados ?? 0;
    const itens: ItemHash[] = [];
    const cadeia: QrDados[] = [];
    let valido = total > 0 && presentes.size === total;

    for (let indice = 1; indice <= total; indice += 1) {
      const qr = presentes.get(indice);
      if (!qr) {
        valido = false;
        continue;
      }
      const anteriorFaltando = cadeia.length !== indice - 1;
      if (anteriorFaltando) {
        valido = false;
        itens.push({ indice, hashInformado: qr.hash, hashCalculado: null, valido: null });
        continue;
      }
      const calculado = await sha512Hex(montarEntradaHash(cadeia, qr.dados));
      const confere = calculado === qr.hash;
      if (!confere) valido = false;
      itens.push({ indice, hashInformado: qr.hash, hashCalculado: calculado, valido: confere });
      cadeia.push(qr);
    }

    return { itens, valido };
  }

  boletim(): Boletim {
    return interpretarBoletim(this.qrsDados());
  }

  async podeEnviar(): Promise<boolean> {
    if (!this.progresso().completo) return false;
    const hashes = await this.validarHashes();
    return hashes.valido;
  }
}

export function criarSessao(): SessaoLeitura {
  return new SessaoLeitura();
}
