import { LeitorCamera, mensagemErroCamera, type MotorLeitura } from "../camera/leitor";
import { entregarArquivo } from "./compartilhar";
import { ControladorLeitura, type Aviso, type EstadoTela } from "./controlador";

function exigir<T extends HTMLElement>(id: string): T {
  const elemento = document.getElementById(id);
  if (!elemento) throw new Error(`Elemento #${id} não encontrado.`);
  return elemento as T;
}

function nomeMotor(motor: MotorLeitura): string {
  return motor === "nativo" ? "Detector do navegador" : "Detector alternativo";
}

export function ligarTela(): void {
  const status = exigir<HTMLParagraphElement>("status");
  const video = exigir<HTMLVideoElement>("video");
  const abrir = exigir<HTMLButtonElement>("abrir");
  const lanterna = exigir<HTMLButtonElement>("lanterna");
  const contagemDados = exigir<HTMLElement>("contagem-dados");
  const contagemCertificado = exigir<HTMLElement>("contagem-certificado");
  const faltando = exigir<HTMLParagraphElement>("faltando");
  const aviso = exigir<HTMLParagraphElement>("aviso");
  const hashes = exigir<HTMLUListElement>("hashes");
  const identificacao = exigir<HTMLElement>("identificacao");
  const campos = exigir<HTMLUListElement>("campos");
  const resumo = exigir<HTMLElement>("resumo");
  const cargos = exigir<HTMLUListElement>("cargos");
  const motor = exigir<HTMLParagraphElement>("motor");
  const reiniciar = exigir<HTMLButtonElement>("reiniciar");
  const enviar = exigir<HTMLButtonElement>("enviar");
  const dica = exigir<HTMLParagraphElement>("dica-envio");
  const mira = document.querySelector<HTMLElement>(".mira");

  const controlador = new ControladorLeitura();
  const leitor = new LeitorCamera(video, (texto) => {
    void controlador.registrar(texto).then((resultado) => {
      desenhar(controlador.estado());
      if (resultado.tipo === "novo") {
        mira?.classList.add("lida");
        window.setTimeout(() => mira?.classList.remove("lida"), 450);
        navigator.vibrate?.(70);
      }
    });
  });

  const desenhar = (estado: EstadoTela) => {
    contagemDados.textContent = estado.contagemDados;
    contagemCertificado.textContent = estado.contagemCertificado;
    faltando.textContent = estado.faltando;
    desenharAviso(aviso, estado.aviso);
    hashes.replaceChildren(...estado.hashes.map((linha) => {
      const item = document.createElement("li");
      item.className = `hash-${linha.situacao}`;
      item.textContent = linha.texto;
      return item;
    }));
    campos.replaceChildren(...estado.identificacao.map((linha) => {
      const item = document.createElement("li");
      item.textContent = linha;
      return item;
    }));
    identificacao.hidden = estado.identificacao.length === 0;
    cargos.replaceChildren(...estado.cargos.map((cargo) => {
      const item = document.createElement("li");
      item.textContent = `${cargo.nome}: ${cargo.total}`;
      return item;
    }));
    resumo.hidden = estado.cargos.length === 0;
    enviar.disabled = !estado.podeEnviar;
    dica.textContent = estado.dicaEnvio;
  };

  abrir.addEventListener("click", () => {
    abrir.disabled = true;
    status.textContent = "Abrindo a câmera…";
    void leitor.iniciar().then((info) => {
      abrir.hidden = true;
      lanterna.hidden = !info.lanterna;
      lanterna.setAttribute("aria-pressed", "false");
      motor.textContent = nomeMotor(info.motor);
      status.textContent = "Aponte para um QR Code do boletim.";
    }).catch((erro: unknown) => {
      abrir.disabled = false;
      abrir.hidden = false;
      status.textContent = mensagemErroCamera(erro);
    });
  });

  lanterna.addEventListener("click", () => {
    void leitor.alternarLanterna().then((ligada) => {
      lanterna.setAttribute("aria-pressed", ligada ? "true" : "false");
      lanterna.textContent = ligada ? "Apagar lanterna" : "Lanterna";
    }).catch(() => {
      status.textContent = "Não foi possível acender a lanterna.";
    });
  });

  reiniciar.addEventListener("click", () => {
    const estado = controlador.estado();
    const jaLeu = estado.contagemDados !== "0" || estado.contagemCertificado !== "0";
    if (jaLeu && !window.confirm("Apagar a leitura deste boletim?")) return;
    controlador.reiniciar();
    leitor.esquecer();
    desenhar(controlador.estado());
    status.textContent = "Leitura apagada. Aponte para os QR Codes.";
  });

  let enviando = false;
  enviar.addEventListener("click", () => {
    if (enviando || !controlador.estado().podeEnviar) return;
    enviando = true;
    enviar.disabled = true;
    enviar.textContent = "Enviando…";
    dica.textContent = "Abrindo o compartilhamento…";
    let arquivo;
    try {
      arquivo = controlador.criarArquivo();
    } catch (erro) {
      enviando = false;
      enviar.disabled = !controlador.estado().podeEnviar;
      enviar.textContent = "Enviar";
      const mensagem = erro instanceof Error ? erro.message : "Não foi possível montar o arquivo.";
      dica.textContent = mensagem;
      status.textContent = mensagem;
      return;
    }
    void entregarArquivo(arquivo).then((resultado) => {
      if (resultado === "compartilhado") {
        dica.textContent = "Arquivo compartilhado.";
        status.textContent = `${arquivo.nome} compartilhado.`;
      } else if (resultado === "baixado") {
        dica.textContent = "Arquivo baixado neste celular.";
        status.textContent = `${arquivo.nome} baixado.`;
      } else {
        dica.textContent = "Envio cancelado. Toque em Enviar para tentar de novo.";
        status.textContent = "Envio cancelado.";
      }
    }).finally(() => {
      enviando = false;
      enviar.disabled = !controlador.estado().podeEnviar;
      enviar.textContent = "Enviar";
    });
  });

  desenhar(controlador.estado());
}

function desenharAviso(destino: HTMLParagraphElement, avisoAtual: Aviso | null): void {
  destino.hidden = avisoAtual == null;
  destino.textContent = avisoAtual?.texto ?? "";
  if (avisoAtual) destino.dataset.tipo = avisoAtual.tipo;
  else delete destino.dataset.tipo;
}
