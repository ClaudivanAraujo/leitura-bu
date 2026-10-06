import { describe, expect, it } from "vitest";
import { mensagemErroCamera } from "../src/camera/leitor";
import { ControladorLeitura } from "../src/ui/controlador";
import { exemploPequeno } from "./extrair-manual";

function certificado(indice: number): string {
  return `QRCE:${indice}:2 IDUE:2250280 MDUE:2022 CERT:${indice === 1 ? "AAAA" : "BBBB"}`;
}

describe("tela de leitura", () => {
  it("mostra o progresso, a identificação e só libera o envio com tudo conferido", async () => {
    const [primeiro, segundo] = exemploPequeno();
    const leitura = new ControladorLeitura();

    expect(leitura.estado().contagemDados).toBe("0");
    expect(leitura.estado().podeEnviar).toBe(false);

    await leitura.registrar(segundo.bruto);
    expect(leitura.estado().contagemDados).toBe("1 de 2");
    expect(leitura.estado().faltando).toContain("dados 1");
    expect(leitura.estado().hashes).toEqual([
      { situacao: "aguardando", texto: "QR 2 · aguardando os anteriores" },
    ]);

    await leitura.registrar(primeiro.bruto);
    const noMeio = leitura.estado();
    expect(noMeio.contagemDados).toBe("2 de 2");
    expect(noMeio.identificacao).toContain("AC · município 1392");
    expect(noMeio.identificacao).toContain("Zona 9 · seção 16");
    expect(noMeio.identificacao.some((linha) => linha.startsWith("Comparecimento 4"))).toBe(true);
    expect(noMeio.hashes.every((linha) => linha.situacao === "ok")).toBe(true);
    expect(noMeio.cargos.map((cargo) => `${cargo.nome}: ${cargo.total}`)).toEqual([
      "Deputado Federal: 4 votos",
      "Deputado Estadual: 4 votos",
      "Senador: 8 votos",
      "Governador: 4 votos",
      "Presidente: 4 votos",
    ]);
    expect(noMeio.podeEnviar).toBe(false);
    expect(noMeio.faltando).toContain("certificado");

    await leitura.registrar(certificado(2));
    expect(leitura.estado().contagemCertificado).toBe("1 de 2");
    expect(leitura.estado().podeEnviar).toBe(false);

    const repetido = await leitura.registrar(certificado(2));
    expect(repetido.tipo).toBe("duplicado");
    expect(leitura.estado().contagemCertificado).toBe("1 de 2");

    await leitura.registrar(certificado(1));
    const pronto = leitura.estado();
    expect(pronto.contagemCertificado).toBe("2 de 2");
    expect(pronto.podeEnviar).toBe(true);
    expect(pronto.dicaEnvio).toBe("Toque em Enviar para compartilhar o arquivo.");
    expect(pronto.faltando).toBe("Todos os QR Codes foram lidos.");
  });

  it("avisa quando o hash não confere e volta ao início ao reiniciar", async () => {
    const leitura = new ControladorLeitura();
    const adulterado = exemploPequeno()[0].bruto.replace("COMP:4", "COMP:9");
    const aviso = await leitura.registrar(adulterado);
    expect(aviso.tipo).toBe("erro");
    expect(aviso.texto).toMatch(/não confere/);
    expect(leitura.estado().podeEnviar).toBe(false);

    leitura.reiniciar();
    expect(leitura.estado().contagemDados).toBe("0");
    expect(leitura.estado().aviso).toBeNull();
    expect(leitura.estado().identificacao).toEqual([]);
  });

  it("explica a falha ao abrir a câmera", () => {
    expect(mensagemErroCamera(new DOMException("negado", "NotAllowedError"))).toMatch(/Permissão/);
    expect(mensagemErroCamera(new DOMException("ausente", "NotFoundError"))).toMatch(/traseira/);
  });
});
