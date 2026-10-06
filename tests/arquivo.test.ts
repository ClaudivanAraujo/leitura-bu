import { describe, expect, it } from "vitest";
import { ControladorLeitura } from "../src/ui/controlador";
import { entregarArquivo, type DestinoArquivo } from "../src/ui/compartilhar";
import { exemploPequeno } from "./extrair-manual";

function certificado(indice: number): string {
  return `QRCE:${indice}:2 IDUE:2250280 MDUE:2022 CERT:${indice === 1 ? "AAAA" : "BBBB"}`;
}

async function leituraPronta(): Promise<ControladorLeitura> {
  const [primeiro, segundo] = exemploPequeno();
  const leitura = new ControladorLeitura();
  await leitura.registrar(primeiro.bruto);
  await leitura.registrar(segundo.bruto);
  await leitura.registrar(certificado(1));
  await leitura.registrar(certificado(2));
  return leitura;
}

describe("arquivo para envio", () => {
  it("gera o JSON com cabeçalho, votos, hash e os textos brutos", async () => {
    const leitura = await leituraPronta();
    const arquivo = leitura.criarArquivo(new Date("2026-10-06T18:00:00.000Z"));
    const documento = JSON.parse(arquivo.conteudo) as {
      versaoApp: string;
      lidoEm: string;
      cabecalho: { uf: string; municipio: string; zona: string; secao: string; turno: number; comparecimento: number };
      eleicoes: { cargos: { nome: string; votos: { numero: string; votos: number }[] }[] }[];
      hash: { valido: boolean; itens: { valido: boolean }[] };
      assinatura: { hash: string; assi: string; certificado: string };
      qrCodes: { dados: { texto: string }[]; certificado: { texto: string }[] };
    };

    expect(arquivo.nome).toBe("BU_AC_1392_9_16_T1.json");
    expect(documento.versaoApp).toBe("0.1.0");
    expect(documento.lidoEm).toBe("2026-10-06T18:00:00.000Z");
    expect(documento.cabecalho).toMatchObject({
      uf: "AC",
      municipio: "1392",
      zona: "9",
      secao: "16",
      turno: 1,
      comparecimento: 4,
    });
    expect(documento.eleicoes[1].cargos[0].votos).toEqual([
      { numero: "92", votos: 1 },
      { numero: "93", votos: 3 },
    ]);
    expect(documento.hash.valido).toBe(true);
    expect(documento.hash.itens).toHaveLength(2);
    expect(documento.assinatura.assi).toHaveLength(264);
    expect(documento.assinatura.certificado).toBe("AAAABBBB");
    expect(documento.qrCodes.dados).toHaveLength(2);
    expect(documento.qrCodes.dados[0].texto.startsWith("QRBU:1:2")).toBe(true);
    expect(documento.qrCodes.certificado.map((qr) => qr.texto).join(" ")).toContain("QRCE:2:2");
  });

  it("abre o compartilhamento quando o celular aceita o arquivo", async () => {
    const enviados: ShareData[] = [];
    const destino: DestinoArquivo = {
      canShare: () => true,
      share: (dados) => {
        enviados.push(dados);
        return Promise.resolve();
      },
      baixar: () => {
        throw new Error("não deveria baixar");
      },
    };
    const resultado = await entregarArquivo(
      { nome: "BU_AC_1392_9_16_T1.json", conteudo: "{}\n" },
      destino,
    );
    expect(resultado).toBe("compartilhado");
    expect(enviados[0].files?.[0].name).toBe("BU_AC_1392_9_16_T1.json");
    expect(enviados[0].files?.[0].type).toBe("application/json");
  });

  it("baixa o arquivo quando não há compartilhamento e ignora o cancelamento", async () => {
    const baixados: string[] = [];
    const semShare: DestinoArquivo = {
      canShare: () => false,
      baixar: (arquivo) => baixados.push(arquivo.name),
    };
    expect(await entregarArquivo({ nome: "BU_AC_1_1_1_T1.json", conteudo: "{}\n" }, semShare)).toBe("baixado");
    expect(baixados).toEqual(["BU_AC_1_1_1_T1.json"]);

    const cancelado: DestinoArquivo = {
      canShare: () => true,
      share: () => Promise.reject(new DOMException("cancelado", "AbortError")),
      baixar: () => {
        throw new Error("não deveria baixar");
      },
    };
    expect(await entregarArquivo({ nome: "BU_AC_1_1_1_T1.json", conteudo: "{}\n" }, cancelado)).toBe("cancelado");
  });
});
