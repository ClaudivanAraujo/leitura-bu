import { describe, expect, it } from "vitest";
import { montarEntradaHash, parseQr, sha512Hex } from "../src/bu";
import { exemploGrande, exemploPequeno } from "./extrair-manual";

describe("hash cumulativo", () => {
  it("confere os dois QR Codes do exemplo pequeno do manual", async () => {
    const extraidos = exemploPequeno();
    expect(extraidos).toHaveLength(2);
    expect(extraidos[0].hexHashColetado).toHaveLength(128);
    expect(extraidos[1].hexHashColetado).toHaveLength(128);

    const qrs = extraidos.map((item) => parseQr(item.bruto));
    expect(qrs[0].tipo).toBe("dados");
    expect(qrs[1].tipo).toBe("dados");
    if (qrs[0].tipo !== "dados" || qrs[1].tipo !== "dados") return;

    const hash1 = await sha512Hex(montarEntradaHash([], qrs[0].dados));
    const hash2 = await sha512Hex(montarEntradaHash([qrs[0]], qrs[1].dados));
    expect(hash1).toBe(qrs[0].hash);
    expect(hash2).toBe(qrs[1].hash);
    expect(qrs[1].assinatura).toHaveLength(264);
  });

  it("confere os três primeiros QR Codes do exemplo grande", async () => {
    const extraidos = exemploGrande();
    expect(extraidos).toHaveLength(9);
    expect(extraidos[1].hexHashColetado.length).toBeGreaterThan(128);
    expect(extraidos[1].hexHashColetado.startsWith(extraidos[1].bruto.match(/HASH:([0-9A-F]{128})/)?.[1] ?? "")).toBe(true);

    const qrs = extraidos.slice(0, 3).map((item) => parseQr(item.bruto));
    let anteriores: { dados: string; hash: string }[] = [];
    for (const qr of qrs) {
      if (qr.tipo !== "dados") throw new Error("QR de dados esperado");
      const calculado = await sha512Hex(montarEntradaHash(anteriores, qr.dados));
      expect(calculado).toBe(qr.hash);
      anteriores = [...anteriores, qr];
    }
  });

  it("não confirma o QR 4 do exemplo grande, porque a cópia traz 91005: 1", async () => {
    const extraidos = exemploGrande();
    expect(extraidos[3].bruto).toContain("91005: 1");
    const qrs = extraidos.slice(0, 4).map((item) => parseQr(item.bruto));
    let anteriores: { dados: string; hash: string }[] = [];
    const resultados: boolean[] = [];
    for (const qr of qrs) {
      if (qr.tipo !== "dados") throw new Error("QR de dados esperado");
      const calculado = await sha512Hex(montarEntradaHash(anteriores, qr.dados));
      resultados.push(calculado === qr.hash);
      anteriores = [...anteriores, qr];
    }
    expect(resultados).toEqual([true, true, true, false]);
  });

  it("rejeita o encadeamento sem o espaço exigido pelo manual", async () => {
    const dados1 = "UNFE:AC COMP:1";
    const dados2 = "IDEL:1 CARG:1 TIPO:0 13:1";
    const hash1 = await sha512Hex(dados1);
    const comEspaco = await sha512Hex(montarEntradaHash([{ dados: dados1, hash: hash1 }], dados2));
    const semEspaco = await sha512Hex(`${dados1} HASH:${hash1}${dados2}`);
    expect(comEspaco).not.toBe(semEspaco);
  });
});
