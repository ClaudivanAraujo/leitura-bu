import { montarArquivo, type ArquivoBu } from "../bu/arquivo";
import { lerCabecalho, criarSessao, type CabecalhoBu, type ItemHash, type SessaoLeitura } from "../bu";

export type TipoAviso = "novo" | "duplicado" | "erro";

export interface Aviso {
  tipo: TipoAviso;
  texto: string;
}

export interface LinhaHash {
  situacao: "ok" | "invalido" | "aguardando";
  texto: string;
}

export interface ResumoCargo {
  nome: string;
  total: string;
}

export interface EstadoTela {
  contagemDados: string;
  contagemCertificado: string;
  faltando: string;
  aviso: Aviso | null;
  hashes: LinhaHash[];
  identificacao: string[];
  cargos: ResumoCargo[];
  podeEnviar: boolean;
  dicaEnvio: string;
}

function formatarLista(numeros: readonly number[]): string {
  if (numeros.length <= 1) return numeros.join("");
  const inicio = numeros.slice(0, -1).join(", ");
  return `${inicio} e ${numeros[numeros.length - 1]}`;
}

function fraseFaltando(rotulo: string, numeros: readonly number[]): string {
  if (numeros.length === 1) return `Falta o QR de ${rotulo} ${numeros[0]}.`;
  return `Faltam os QR Codes de ${rotulo} ${formatarLista(numeros)}.`;
}

function fasePorExtenso(fase: string | null): string | null {
  if (fase === "O") return "oficial";
  if (fase === "S") return "simulado";
  if (fase === "T") return "treinamento";
  return null;
}

export function linhasDoCabecalho(cabecalho: CabecalhoBu): string[] {
  const linhas: string[] = [];
  const lugar = [cabecalho.uf, cabecalho.municipio ? `município ${cabecalho.municipio}` : null].filter(
    (parte): parte is string => Boolean(parte),
  );
  if (lugar.length > 0) linhas.push(lugar.join(" · "));

  const zona = [
    cabecalho.zona ? `Zona ${cabecalho.zona}` : null,
    cabecalho.secao ? `seção ${cabecalho.secao}` : null,
  ].filter((parte): parte is string => Boolean(parte));
  if (zona.length > 0) linhas.push(zona.join(" · "));

  const turno = [
    cabecalho.turno != null ? `Turno ${cabecalho.turno}` : null,
    fasePorExtenso(cabecalho.fase),
  ].filter((parte): parte is string => Boolean(parte));
  if (turno.length > 0) linhas.push(turno.join(" · "));

  if (cabecalho.comparecimento != null) {
    const faltosos = cabecalho.faltosos != null ? ` · faltosos ${cabecalho.faltosos}` : "";
    linhas.push(`Comparecimento ${cabecalho.comparecimento}${faltosos}`);
  }
  return linhas;
}

function contagem(lidos: number, total: number | null): string {
  return total == null ? "0" : `${lidos} de ${total}`;
}

function linhaHash(item: ItemHash): LinhaHash {
  if (item.valido === true) return { situacao: "ok", texto: `QR ${item.indice} · hash ok` };
  if (item.valido === false) return { situacao: "invalido", texto: `QR ${item.indice} · hash não confere` };
  return { situacao: "aguardando", texto: `QR ${item.indice} · aguardando os anteriores` };
}

export class ControladorLeitura {
  private sessao: SessaoLeitura = criarSessao();
  private aviso: Aviso | null = null;
  private hashes: ItemHash[] = [];
  private pronto = false;

  async registrar(texto: string): Promise<Aviso> {
    const resultado = this.sessao.adicionar(texto);
    if (!resultado.ok) {
      this.aviso = { tipo: "erro", texto: resultado.motivo };
    } else if (resultado.duplicado) {
      const nome = resultado.qr.tipo === "dados" ? "dados" : "certificado";
      this.aviso = { tipo: "duplicado", texto: `QR de ${nome} ${resultado.qr.indice} já foi lido.` };
    } else if (resultado.qr.tipo === "dados") {
      const validacao = await this.sessao.validarHashes();
      this.hashes = validacao.itens;
      const item = validacao.itens.find((candidato) => candidato.indice === resultado.qr.indice);
      this.aviso = item?.valido === false
        ? { tipo: "erro", texto: `Hash do QR de dados ${resultado.qr.indice} não confere.` }
        : { tipo: "novo", texto: `Dados ${resultado.qr.indice} de ${resultado.qr.total} lidos.` };
    } else {
      this.aviso = {
        tipo: "novo",
        texto: `Certificado ${resultado.qr.indice} de ${resultado.qr.total} lido.`,
      };
    }
    this.pronto = await this.sessao.podeEnviar();
    return this.aviso;
  }

  reiniciar(): void {
    this.sessao = criarSessao();
    this.aviso = null;
    this.hashes = [];
    this.pronto = false;
  }

  criarArquivo(lidoEm = new Date()): ArquivoBu {
    if (!this.pronto) {
      throw new Error("A leitura ainda não está pronta para envio.");
    }
    return montarArquivo({
      lidoEm,
      boletim: this.sessao.boletim(),
      hashes: this.hashes,
      qrsDados: this.sessao.qrsDados(),
      qrsCertificado: this.sessao.qrsCertificado(),
    });
  }

  estado(): EstadoTela {
    const progresso = this.sessao.progresso();
    const primeiro = this.sessao.qrsDados().find((qr) => qr.indice === 1);
    const identificacao = primeiro ? linhasDoCabecalho(lerCabecalho(primeiro.dados)) : [];
    const cargos = this.resumirCargos(progresso.dados.total != null && progresso.dados.faltando.length === 0);
    const partes: string[] = [];
    if (progresso.dados.total == null && progresso.certificado.total == null) {
      partes.push("Aguardando o primeiro QR Code.");
    } else {
      if (progresso.dados.faltando.length > 0) partes.push(fraseFaltando("dados", progresso.dados.faltando));
      if (progresso.certificado.total == null) partes.push("Falta ler o certificado da urna.");
      else if (progresso.certificado.faltando.length > 0) {
        partes.push(fraseFaltando("certificado", progresso.certificado.faltando));
      }
      if (partes.length === 0) partes.push("Todos os QR Codes foram lidos.");
    }

    let dicaEnvio = "Leia todos os QR Codes de dados e de certificado.";
    if (this.pronto) dicaEnvio = "Toque em Enviar para compartilhar o arquivo.";
    else if (progresso.completo && this.hashes.some((item) => item.valido === false)) {
      dicaEnvio = "O hash de um QR Code não confere. Reinicie e leia de novo.";
    }

    return {
      contagemDados: contagem(progresso.dados.lidos, progresso.dados.total),
      contagemCertificado: contagem(progresso.certificado.lidos, progresso.certificado.total),
      faltando: partes.join(" "),
      aviso: this.aviso,
      hashes: this.hashes.map(linhaHash),
      identificacao,
      cargos,
      podeEnviar: this.pronto,
      dicaEnvio,
    };
  }

  private resumirCargos(dadosCompletos: boolean): ResumoCargo[] {
    if (!dadosCompletos) return [];
    try {
      return this.sessao.boletim().eleicoes.flatMap((eleicao) => eleicao.cargos.map((cargo) => ({
        nome: cargo.nome,
        total: cargo.total == null ? "sem total" : cargo.total === 1 ? "1 voto" : `${cargo.total} votos`,
      })));
    } catch {
      return [];
    }
  }
}
