import { describe, expect, it } from "vitest";
import { ErroFormatoBu, interpretarBoletim, juntarFragmentos, parseQr, sha512Hex } from "../src/bu";
import type { QrDados } from "../src/bu";
import { exemploPequeno } from "./extrair-manual";

async function qr(indice: number, total: number, dados: string, anteriores: QrDados[] = []): Promise<QrDados> {
  const hash = await sha512Hex(
    anteriores.length === 0
      ? dados
      : `${anteriores.map((item) => `${item.dados} HASH:${item.hash}`).join(" ")} ${dados}`,
  );
  const lido = parseQr(`QRBU:${indice}:${total} VRQR:6.0 ${dados} HASH:${hash}`);
  if (lido.tipo !== "dados") throw new Error("QR de dados esperado");
  return lido;
}

describe("parser do QR Code", () => {
  it("interpreta o boletim pequeno do manual", () => {
    const qrs = exemploPequeno().map((item) => parseQr(item.bruto));
    const dados = qrs.filter((item): item is QrDados => item.tipo === "dados");
    const boletim = interpretarBoletim(dados);
    const cabecalho = boletim.cabecalho;

    expect(cabecalho.uf).toBe("AC");
    expect(cabecalho.municipio).toBe("1392");
    expect(cabecalho.zona).toBe("9");
    expect(cabecalho.secao).toBe("16");
    expect(cabecalho.secoesAgregadas).toEqual(["17", "18", "19"]);
    expect(cabecalho.turno).toBe(1);
    expect(cabecalho.fase).toBe("S");
    expect(cabecalho.comparecimento).toBe(4);
    expect(cabecalho.faltosos).toBe(46);
    expect(cabecalho.aptos).toBe(50);
    expect(cabecalho.aptosSecao).toBe(50);
    expect(cabecalho.aptosTransferidos).toBe(0);
    expect(cabecalho.idUrna).toBe("2250280");
    expect(cabecalho.historicoCargas).toEqual([
      { sequencia: "1", codigo: "802779536993017420567657" },
    ]);

    expect(boletim.eleicoes.map((eleicao) => eleicao.codigo)).toEqual(["2102", "2101"]);

    const [gerais, presidencia] = boletim.eleicoes;
    expect(gerais.cargos.map((cargo) => [cargo.codigo, cargo.nome, cargo.tipo])).toEqual([
      [6, "Deputado Federal", 1],
      [7, "Deputado Estadual", 1],
      [5, "Senador", 0],
      [3, "Governador", 0],
    ]);

    const federal = gerais.cargos[0];
    expect(federal.partidos).toEqual([
      { numero: "92", votosLegenda: 1, total: 1, candidatos: [] },
      {
        numero: "95",
        votosLegenda: 0,
        total: 2,
        candidatos: [
          { numero: "9501", votos: 1 },
          { numero: "9502", votos: 1 },
        ],
      },
    ]);
    expect(federal.aptosSecao).toBe(50);
    expect(federal.nominais).toBe(2);
    expect(federal.legenda).toBe(1);
    expect(federal.brancos).toBe(1);
    expect(federal.nulos).toBe(0);
    expect(federal.total).toBe(4);

    const senador = gerais.cargos[2];
    expect(senador.partidos).toEqual([]);
    expect(senador.votos).toEqual([
      { numero: "921", votos: 1 },
      { numero: "931", votos: 1 },
      { numero: "941", votos: 1 },
      { numero: "951", votos: 2 },
    ]);
    expect(senador.nominais).toBe(5);
    expect(senador.legenda).toBeNull();
    expect(senador.brancos).toBe(1);
    expect(senador.nulos).toBe(2);
    expect(senador.total).toBe(8);

    const presidente = presidencia.cargos[0];
    expect(presidente.nome).toBe("Presidente");
    expect(presidente.votos).toEqual([
      { numero: "92", votos: 1 },
      { numero: "93", votos: 3 },
    ]);
    expect(presidente.nominais).toBe(4);
    expect(presidente.total).toBe(4);
  });

  it("separa APTS do cabeçalho e APTS do resumo do cargo", async () => {
    const dados = "ORIG:VOTA UNFE:AC MUNI:1 ZONA:2 SECA:3 TURN:1 FASE:O COMP:4 APTS:10 APTT:1 IDEL:9 CARG:13 TIPO:1 VERC:1 PART:11 11001:2 LEGP:1 TOTP:3 APTA:8 APTS:7 APTT:0 NOMI:2 LEGC:1 BRAN:0 NULO:0 TOTC:3";
    const boletim = interpretarBoletim([await qr(1, 1, dados)]);
    expect(boletim.cabecalho.aptosSecao).toBe(10);
    expect(boletim.cabecalho.aptosTransferidos).toBe(1);
    expect(boletim.cabecalho.comparecimento).toBe(4);
    const vereador = boletim.eleicoes[0].cargos[0];
    expect(vereador.nome).toBe("Vereador");
    expect(vereador.aptosSecao).toBe(7);
    expect(vereador.aptosTransferidos).toBe(0);
    expect(vereador.partidos[0].candidatos).toEqual([{ numero: "11001", votos: 2 }]);
  });

  it("restaura o espaço removido na emenda e junta o registro partido ao meio", () => {
    expect(juntarFragmentos(["9225:1", "9226:1"])).toBe("9225:1 9226:1");
    expect(juntarFragmentos(["CARG:1 TIPO:0 10", "01:4"])).toBe("CARG:1 TIPO:0 1001:4");
  });

  it("interpreta o voto partido entre dois QR Codes", async () => {
    const primeiro = await qr(1, 2, "ORIG:VOTA UNFE:ZZ MUNI:1 ZONA:1 SECA:1 TURN:2 FASE:T COMP:4 IDEL:1 CARG:1 TIPO:0 VERC:1 10");
    const segundo = await qr(2, 2, "01:4 APTA:4 APTS:3 APTT:1 NOMI:4 BRAN:0 NULO:0 TOTC:4", [primeiro]);
    const boletim = interpretarBoletim([segundo, primeiro]);
    expect(boletim.cabecalho.uf).toBe("ZZ");
    expect(boletim.cabecalho.turno).toBe(2);
    expect(boletim.eleicoes[0].cargos[0].votos).toEqual([{ numero: "1001", votos: 4 }]);
    expect(boletim.eleicoes[0].cargos[0].aptosSecao).toBe(3);
  });

  it("rejeita texto que não é QR de boletim", () => {
    expect(() => parseQr("https://exemplo")).toThrow(ErroFormatoBu);
    expect(() => parseQr("QRBU:1:1 VRQR:6.0 ORIG:VOTA HASH:AA")).toThrow(/128/);
  });

  it("lê o QR de certificado", () => {
    const qrCertificado = parseQr("QRCE:1:2 IDUE:2250280 MDUE:2022 CERT:ab12");
    expect(qrCertificado).toMatchObject({
      tipo: "certificado",
      indice: 1,
      total: 2,
      idUrna: "2250280",
      modelo: "2022",
      certificado: "AB12",
    });
  });
});
