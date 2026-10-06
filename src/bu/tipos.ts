export class ErroFormatoBu extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroFormatoBu";
  }
}

export interface QrDados {
  tipo: "dados";
  indice: number;
  total: number;
  versao: string;
  dados: string;
  hash: string;
  assinatura: string | null;
  bruto: string;
}

export interface QrCertificado {
  tipo: "certificado";
  indice: number;
  total: number;
  idUrna: string;
  modelo: string;
  certificado: string;
  bruto: string;
}

export type QrCodigo = QrDados | QrCertificado;

export interface Voto {
  numero: string;
  votos: number;
}

export interface Partido {
  numero: string;
  votosLegenda: number | null;
  total: number | null;
  candidatos: Voto[];
}

export interface Cargo {
  codigo: number;
  nome: string;
  tipo: number;
  versao: string | null;
  partidos: Partido[];
  votos: Voto[];
  aptos: number | null;
  aptosSecao: number | null;
  aptosTransferidos: number | null;
  comparecimentoSemCandidatos: number | null;
  nominais: number | null;
  legenda: number | null;
  brancos: number | null;
  nulos: number | null;
  total: number | null;
}

export interface Eleicao {
  codigo: string;
  votosMajoritarios: number | null;
  votosProporcionais: number | null;
  cargos: Cargo[];
}

export interface CargaHistorico {
  sequencia: string;
  codigo: string;
}

export interface CabecalhoBu {
  origem: string | null;
  origemConfiguracao: string | null;
  processo: string | null;
  dataPleito: string | null;
  pleito: string | null;
  turno: number | null;
  fase: string | null;
  uf: string | null;
  municipio: string | null;
  zona: string | null;
  secao: string | null;
  secoesAgregadas: string[];
  idUrna: string | null;
  idCarga: string | null;
  quantidadeCargas: number | null;
  historicoCargas: CargaHistorico[];
  versaoSoftware: string | null;
  local: string | null;
  aptos: number | null;
  aptosSecao: number | null;
  aptosTransferidos: number | null;
  comparecimento: number | null;
  faltosos: number | null;
  habilitadosBiometria: number | null;
  habilitadosAnoNascimento: number | null;
  habilitadosSemBiometria: number | null;
  dataAbertura: string | null;
  horaAbertura: string | null;
  dataFechamento: string | null;
  horaFechamento: string | null;
  junta: string | null;
  turma: string | null;
  dataEmissao: string | null;
  horaEmissao: string | null;
}

export interface Boletim {
  cabecalho: CabecalhoBu;
  eleicoes: Eleicao[];
  conteudoRemontado: string;
}

export interface ContagemQr {
  lidos: number;
  total: number | null;
  faltando: number[];
}

export interface ProgressoLeitura {
  dados: ContagemQr;
  certificado: ContagemQr;
  completo: boolean;
}

export interface ItemHash {
  indice: number;
  hashInformado: string;
  hashCalculado: string | null;
  valido: boolean | null;
}

export interface ResultadoHash {
  itens: ItemHash[];
  valido: boolean;
}

export type ResultadoInclusao =
  | { ok: true; qr: QrCodigo; duplicado: boolean }
  | { ok: false; motivo: string };
