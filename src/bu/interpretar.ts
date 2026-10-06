import { nomeCargo } from "./cargos";
import { juntarFragmentos } from "./parse-qr";
import { ErroFormatoBu, type Boletim, type CabecalhoBu, type Cargo, type Eleicao, type Partido, type QrDados, type Voto } from "./tipos";

const CAMPOS_CABECALHO = new Set([
  "ORIG", "ORLC", "PROC", "DTPL", "PLEI", "TURN", "FASE", "UNFE", "MUNI", "ZONA", "SECA", "AGRE",
  "IDUE", "IDCA", "HIQT", "HICA", "VERS", "LOCA", "APTO", "APTS", "APTT", "COMP", "FALT",
  "HBBM", "HBBG", "HBSB", "DTAB", "HRAB", "DTFC", "HRFC", "JUNT", "TURM", "DTEM", "HREM",
]);

interface Token {
  chave: string;
  valor: string;
}

function tokenizar(conteudo: string): Token[] {
  if (!conteudo.trim()) return [];
  return conteudo.trim().split(/\s+/).map((token) => {
    const separador = token.indexOf(":");
    if (separador <= 0) {
      throw new ErroFormatoBu(`Registro inválido: ${token}`);
    }
    return { chave: token.slice(0, separador), valor: token.slice(separador + 1) };
  });
}

function inteiro(valor: string, campo: string): number {
  if (!/^\d+$/.test(valor)) {
    throw new ErroFormatoBu(`${campo} não é numérico: ${valor}`);
  }
  return Number(valor);
}

function cabecalhoVazio(): CabecalhoBu {
  return {
    origem: null,
    origemConfiguracao: null,
    processo: null,
    dataPleito: null,
    pleito: null,
    turno: null,
    fase: null,
    uf: null,
    municipio: null,
    zona: null,
    secao: null,
    secoesAgregadas: [],
    idUrna: null,
    idCarga: null,
    quantidadeCargas: null,
    historicoCargas: [],
    versaoSoftware: null,
    local: null,
    aptos: null,
    aptosSecao: null,
    aptosTransferidos: null,
    comparecimento: null,
    faltosos: null,
    habilitadosBiometria: null,
    habilitadosAnoNascimento: null,
    habilitadosSemBiometria: null,
    dataAbertura: null,
    horaAbertura: null,
    dataFechamento: null,
    horaFechamento: null,
    junta: null,
    turma: null,
    dataEmissao: null,
    horaEmissao: null,
  };
}

function cargoVazio(codigo: number): Cargo {
  return {
    codigo,
    nome: nomeCargo(codigo),
    tipo: -1,
    versao: null,
    partidos: [],
    votos: [],
    aptos: null,
    aptosSecao: null,
    aptosTransferidos: null,
    comparecimentoSemCandidatos: null,
    nominais: null,
    legenda: null,
    brancos: null,
    nulos: null,
    total: null,
  };
}

function partidoVazio(numero: string): Partido {
  return { numero, votosLegenda: null, total: null, candidatos: [] };
}

function voto(token: Token): Voto {
  return { numero: token.chave, votos: inteiro(token.valor, token.chave) };
}

function atribuirCabecalho(cabecalho: CabecalhoBu, token: Token): void {
  const { chave, valor } = token;
  switch (chave) {
    case "ORIG": cabecalho.origem = valor; break;
    case "ORLC": cabecalho.origemConfiguracao = valor; break;
    case "PROC": cabecalho.processo = valor; break;
    case "DTPL": cabecalho.dataPleito = valor; break;
    case "PLEI": cabecalho.pleito = valor; break;
    case "TURN": cabecalho.turno = inteiro(valor, chave); break;
    case "FASE": cabecalho.fase = valor; break;
    case "UNFE": cabecalho.uf = valor; break;
    case "MUNI": cabecalho.municipio = valor; break;
    case "ZONA": cabecalho.zona = valor; break;
    case "SECA": cabecalho.secao = valor; break;
    case "AGRE": cabecalho.secoesAgregadas = valor.split(".").filter(Boolean); break;
    case "IDUE": cabecalho.idUrna = valor; break;
    case "IDCA": cabecalho.idCarga = valor; break;
    case "HIQT": cabecalho.quantidadeCargas = inteiro(valor, chave); break;
    case "HICA": {
      const separador = valor.indexOf(":");
      if (separador <= 0) throw new ErroFormatoBu(`HICA inválido: ${valor}`);
      cabecalho.historicoCargas.push({
        sequencia: valor.slice(0, separador),
        codigo: valor.slice(separador + 1),
      });
      break;
    }
    case "VERS": cabecalho.versaoSoftware = valor; break;
    case "LOCA": cabecalho.local = valor; break;
    case "APTO": cabecalho.aptos = inteiro(valor, chave); break;
    case "APTS": cabecalho.aptosSecao = inteiro(valor, chave); break;
    case "APTT": cabecalho.aptosTransferidos = inteiro(valor, chave); break;
    case "COMP": cabecalho.comparecimento = inteiro(valor, chave); break;
    case "FALT": cabecalho.faltosos = inteiro(valor, chave); break;
    case "HBBM": cabecalho.habilitadosBiometria = inteiro(valor, chave); break;
    case "HBBG": cabecalho.habilitadosAnoNascimento = inteiro(valor, chave); break;
    case "HBSB": cabecalho.habilitadosSemBiometria = inteiro(valor, chave); break;
    case "DTAB": cabecalho.dataAbertura = valor; break;
    case "HRAB": cabecalho.horaAbertura = valor; break;
    case "DTFC": cabecalho.dataFechamento = valor; break;
    case "HRFC": cabecalho.horaFechamento = valor; break;
    case "JUNT": cabecalho.junta = valor; break;
    case "TURM": cabecalho.turma = valor; break;
    case "DTEM": cabecalho.dataEmissao = valor; break;
    case "HREM": cabecalho.horaEmissao = valor; break;
    default:
      throw new ErroFormatoBu(`Campo de cabeçalho desconhecido: ${chave}`);
  }
}

function atribuirResumo(cargo: Cargo, token: Token): void {
  const valor = inteiro(token.valor, token.chave);
  switch (token.chave) {
    case "APTA": cargo.aptos = valor; break;
    case "APTS": cargo.aptosSecao = valor; break;
    case "APTT": cargo.aptosTransferidos = valor; break;
    case "CSEC": cargo.comparecimentoSemCandidatos = valor; break;
    case "NOMI": cargo.nominais = valor; break;
    case "LEGC": cargo.legenda = valor; break;
    case "BRAN": cargo.brancos = valor; break;
    case "NULO": cargo.nulos = valor; break;
    case "TOTC": cargo.total = valor; break;
    default:
      throw new ErroFormatoBu(`Campo de resumo desconhecido: ${token.chave}`);
  }
}

/** Lê só o cabeçalho, parando no primeiro campo de eleição ou de cargo. */
export function lerCabecalho(conteudo: string): CabecalhoBu {
  const cabecalho = cabecalhoVazio();
  for (const token of tokenizar(conteudo)) {
    if (!CAMPOS_CABECALHO.has(token.chave)) break;
    atribuirCabecalho(cabecalho, token);
  }
  return cabecalho;
}

export function remontarConteudo(qrs: readonly QrDados[]): string {
  const ordenados = [...qrs].sort((a, b) => a.indice - b.indice);
  return juntarFragmentos(ordenados.map((qr) => qr.dados));
}

/**
 * Interpreta o conteúdo remontado. APTS e APTT do cabeçalho ficam no cabeçalho;
 * os mesmos nomes, depois de CARG, ficam no resumo daquele cargo.
 */
export function interpretarBoletim(qrs: readonly QrDados[]): Boletim {
  if (qrs.length === 0) {
    throw new ErroFormatoBu("Nenhum QR de dados para interpretar.");
  }
  const total = qrs[0].total;
  if (qrs.some((qr) => qr.total !== total)) {
    throw new ErroFormatoBu("Os QR Codes não pertencem ao mesmo boletim.");
  }
  const ordenados = [...qrs].sort((a, b) => a.indice - b.indice);
  for (let i = 0; i < ordenados.length; i += 1) {
    if (ordenados[i].indice !== i + 1) {
      throw new ErroFormatoBu("A sequência de QR Codes de dados está incompleta.");
    }
  }
  if (ordenados.length !== total) {
    throw new ErroFormatoBu("Ainda faltam QR Codes de dados para interpretar o boletim.");
  }

  const conteudoRemontado = juntarFragmentos(ordenados.map((qr) => qr.dados));
  const tokens = tokenizar(conteudoRemontado);
  const cabecalho = cabecalhoVazio();
  const eleicoes: Eleicao[] = [];
  let eleicao: Eleicao | null = null;
  let cargo: Cargo | null = null;
  let partido: Partido | null = null;
  let noResumo = false;

  const fecharPartido = () => {
    if (partido && cargo) cargo.partidos.push(partido);
    partido = null;
  };
  const fecharCargo = () => {
    fecharPartido();
    if (cargo && eleicao) eleicao.cargos.push(cargo);
    cargo = null;
    noResumo = false;
  };
  const fecharEleicao = () => {
    fecharCargo();
    if (eleicao) eleicoes.push(eleicao);
    eleicao = null;
  };

  for (const token of tokens) {
    const numerico = /^\d+$/.test(token.chave);

    if (!eleicao && CAMPOS_CABECALHO.has(token.chave)) {
      atribuirCabecalho(cabecalho, token);
      continue;
    }

    if (token.chave === "IDEL") {
      fecharEleicao();
      eleicao = {
        codigo: token.valor,
        votosMajoritarios: null,
        votosProporcionais: null,
        cargos: [],
      };
      continue;
    }

    if (!eleicao) {
      throw new ErroFormatoBu(`Campo fora de ordem: ${token.chave}`);
    }

    if (token.chave === "MAJO") {
      eleicao.votosMajoritarios = inteiro(token.valor, token.chave);
      continue;
    }
    if (token.chave === "PROP") {
      eleicao.votosProporcionais = inteiro(token.valor, token.chave);
      continue;
    }

    if (token.chave === "CARG") {
      fecharCargo();
      cargo = cargoVazio(inteiro(token.valor, token.chave));
      continue;
    }

    if (!cargo) {
      throw new ErroFormatoBu(`Campo de cargo fora de ordem: ${token.chave}`);
    }

    if (token.chave === "TIPO") {
      cargo.tipo = inteiro(token.valor, token.chave);
      continue;
    }
    if (token.chave === "VERC") {
      cargo.versao = token.valor;
      continue;
    }

    if (token.chave === "PART") {
      fecharPartido();
      noResumo = false;
      partido = partidoVazio(token.valor);
      continue;
    }

    if (token.chave === "LEGP" || token.chave === "TOTP") {
      if (!partido) throw new ErroFormatoBu(`${token.chave} sem partido.`);
      const quantidade = inteiro(token.valor, token.chave);
      if (token.chave === "LEGP") partido.votosLegenda = quantidade;
      else partido.total = quantidade;
      continue;
    }

    if (token.chave === "APTA") {
      fecharPartido();
      noResumo = true;
      atribuirResumo(cargo, token);
      continue;
    }

    if (noResumo && ["APTS", "APTT", "CSEC", "NOMI", "LEGC", "BRAN", "NULO", "TOTC"].includes(token.chave)) {
      atribuirResumo(cargo, token);
      continue;
    }

    if (numerico) {
      const destino = partido ? partido.candidatos : cargo.votos;
      destino.push(voto(token));
      continue;
    }

    throw new ErroFormatoBu(`Campo não reconhecido: ${token.chave}`);
  }

  fecharEleicao();
  return { cabecalho, eleicoes, conteudoRemontado };
}
