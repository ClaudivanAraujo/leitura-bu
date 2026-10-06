import { describe, expect, it } from "vitest";
import { criarSessao, parseQr } from "../src/bu";
import type { QrDados } from "../src/bu";
import { exemploPequeno } from "./extrair-manual";

function certificado(indice: number): string {
  return `QRCE:${indice}:2 IDUE:2250280 MDUE:2022 CERT:${indice === 1 ? "AAAA" : "BBBB"}`;
}

describe("sessão de leitura", () => {
  it("aceita os QR Codes fora de ordem, ignora duplicata e lista o que falta", async () => {
    const [primeiro, segundo] = exemploPequeno();
    const sessao = criarSessao();

    expect(sessao.adicionar(segundo.bruto).ok).toBe(true);
    expect(sessao.descreverProgresso()).toBe("Dados 1 de 2 | Certificado 0");
    expect(sessao.progresso().dados.faltando).toEqual([1]);
    expect(sessao.progresso().completo).toBe(false);

    const repetido = sessao.adicionar(segundo.bruto);
    expect(repetido.ok && repetido.duplicado).toBe(true);
    expect(sessao.progresso().dados.lidos).toBe(1);

    sessao.adicionar(primeiro.bruto);
    expect(sessao.descreverProgresso()).toBe("Dados 2 de 2 | Certificado 0");
    expect(await sessao.podeEnviar()).toBe(false);

    const hashes = await sessao.validarHashes();
    expect(hashes.valido).toBe(true);
    expect(hashes.itens.map((item) => item.indice)).toEqual([1, 2]);

    const boletim = sessao.boletim();
    expect(boletim.cabecalho.uf).toBe("AC");
    expect(boletim.cabecalho.secao).toBe("16");
    expect(boletim.eleicoes).toHaveLength(2);

    sessao.adicionar(certificado(2));
    expect(sessao.descreverProgresso()).toBe("Dados 2 de 2 | Certificado 1 de 2");
    expect(sessao.progresso().certificado.faltando).toEqual([1]);
    sessao.adicionar(certificado(1));
    expect(sessao.descreverProgresso()).toBe("Dados 2 de 2 | Certificado 2 de 2");
    expect(sessao.certificado()).toBe("AAAABBBB");
    expect(await sessao.podeEnviar()).toBe(true);
  });

  it("não valida o QR seguinte enquanto o anterior não chegou", async () => {
    const segundo = exemploPequeno()[1];
    const sessao = criarSessao();
    sessao.adicionar(segundo.bruto);
    const hashes = await sessao.validarHashes();
    expect(hashes.valido).toBe(false);
    expect(hashes.itens).toEqual([
      {
        indice: 2,
        hashInformado: (parseQr(segundo.bruto) as QrDados).hash,
        hashCalculado: null,
        valido: null,
      },
    ]);
  });

  it("recusa outro boletim, conteúdo divergente e texto solto", () => {
    const sessao = criarSessao();
    const primeiro = exemploPequeno()[0].bruto;
    sessao.adicionar(primeiro);

    const outroBoletim = sessao.adicionar("QRBU:1:9 VRQR:6.0 ORIG:VOTA HASH:" + "AB".repeat(64));
    expect(outroBoletim.ok).toBe(false);

    const divergente = primeiro.replace("UNFE:AC", "UNFE:AM");
    const conflito = sessao.adicionar(divergente);
    expect(conflito.ok).toBe(false);
    if (!conflito.ok) expect(conflito.motivo).toMatch(/outro conteúdo/);

    const invalido = sessao.adicionar("não é qr");
    expect(invalido.ok).toBe(false);
    expect(sessao.progresso().dados.lidos).toBe(1);
  });

  it("marca o hash como inválido quando o conteúdo não corresponde", async () => {
    const sessao = criarSessao();
    const bruto = exemploPequeno()[0].bruto.replace("COMP:4", "COMP:9");
    sessao.adicionar(bruto);
    const hashes = await sessao.validarHashes();
    expect(hashes.valido).toBe(false);
    expect(hashes.itens[0].valido).toBe(false);
    expect(hashes.itens[0].hashCalculado).not.toBe(hashes.itens[0].hashInformado);
  });
});
