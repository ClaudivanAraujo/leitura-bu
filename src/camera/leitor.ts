import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";
import wasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";

export type MotorLeitura = "nativo" | "zxing";

interface CodigoDetectado {
  rawValue: string;
}

interface DetectorNativo {
  detect(fonte: CanvasImageSource): Promise<CodigoDetectado[]>;
}

interface ConstrutorDetector {
  new (opcoes?: { formats?: string[] }): DetectorNativo;
  getSupportedFormats?: () => Promise<string[]>;
}

interface CapacidadesCamera extends MediaTrackCapabilities {
  torch?: boolean;
  focusMode?: string[];
}

interface AjusteCamera extends MediaTrackConstraintSet {
  torch?: boolean;
  focusMode?: string;
}

let zxingPronto: Promise<void> | null = null;

function prepararZxing(): Promise<void> {
  zxingPronto ??= prepareZXingModule({
    fireImmediately: true,
    overrides: {
      locateFile: (caminho: string, prefixo: string) => (caminho.endsWith(".wasm") ? wasmUrl : prefixo + caminho),
    },
  }).then(() => undefined);
  return zxingPronto;
}

function construtorDetector(): ConstrutorDetector | null {
  const candidato = (globalThis as { BarcodeDetector?: ConstrutorDetector }).BarcodeDetector;
  return candidato ?? null;
}

async function criarDetectorNativo(): Promise<DetectorNativo | null> {
  const Construtor = construtorDetector();
  if (!Construtor) return null;
  if (Construtor.getSupportedFormats) {
    const formatos = await Construtor.getSupportedFormats();
    if (!formatos.includes("qr_code")) return null;
  }
  return new Construtor({ formats: ["qr_code"] });
}

export function mensagemErroCamera(erro: unknown): string {
  const nome = erro instanceof DOMException ? erro.name : "";
  if (nome === "NotAllowedError" || nome === "SecurityError") {
    return "Permissão da câmera negada. Libere o acesso para este site.";
  }
  if (nome === "NotFoundError" || nome === "OverconstrainedError") {
    return "Nenhuma câmera traseira disponível.";
  }
  if (nome === "NotReadableError" || nome === "AbortError") {
    return "A câmera está em uso por outro aplicativo.";
  }
  if (typeof isSecureContext !== "undefined" && !isSecureContext) {
    return "A câmera exige HTTPS ou localhost. No celular, rode npm run dev:celular e aceite o certificado.";
  }
  return "Não foi possível abrir a câmera.";
}

async function abrirStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Câmera indisponível neste navegador.");
  }
  const traseira = { facingMode: { ideal: "environment" } };
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        ...traseira,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    });
  } catch (erro) {
    if (erro instanceof DOMException && (erro.name === "NotAllowedError" || erro.name === "SecurityError")) {
      throw erro;
    }
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: traseira,
    });
  }
}

async function aplicarFocoContinuo(trilha: MediaStreamTrack): Promise<void> {
  const capacidades = trilha.getCapabilities?.() as CapacidadesCamera | undefined;
  if (!capacidades?.focusMode?.includes("continuous")) return;
  const ajuste: AjusteCamera = { focusMode: "continuous" };
  await trilha.applyConstraints({ advanced: [ajuste] });
}

function tamanhoQuadro(video: HTMLVideoElement): { largura: number; altura: number } {
  const larguraVideo = video.videoWidth || 1280;
  const alturaVideo = video.videoHeight || 720;
  const maior = Math.max(larguraVideo, alturaVideo);
  const escala = maior > 1920 ? 1920 / maior : 1;
  return {
    largura: Math.max(1, Math.round(larguraVideo * escala)),
    altura: Math.max(1, Math.round(alturaVideo * escala)),
  };
}

export class LeitorCamera {
  private stream: MediaStream | null = null;
  private trilha: MediaStreamTrack | null = null;
  private detector: DetectorNativo | null = null;
  private timer = 0;
  private ocupado = false;
  private encerrado = true;
  private pausado = false;
  private lanterna = false;
  private suportaLanterna = false;
  private ultimoTexto = "";
  private ultimoQuando = 0;
  private ouvintes = new AbortController();
  private readonly quadroCanvas = document.createElement("canvas");
  private motor: MotorLeitura = "zxing";

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly aoLer: (texto: string) => void,
  ) {}

  async iniciar(): Promise<{ motor: MotorLeitura; lanterna: boolean }> {
    this.parar();
    this.encerrado = false;
    this.pausado = false;
    this.ouvintes = new AbortController();
    this.stream = await abrirStream();
    this.trilha = this.stream.getVideoTracks()[0] ?? null;
    if (!this.trilha) throw new Error("Nenhuma câmera traseira disponível.");

    this.video.srcObject = this.stream;
    this.video.muted = true;
    await this.video.play();
    await aplicarFocoContinuo(this.trilha).catch(() => undefined);

    const capacidades = this.trilha.getCapabilities?.() as CapacidadesCamera | undefined;
    this.suportaLanterna = Boolean(capacidades?.torch);
    this.lanterna = false;

    this.detector = await criarDetectorNativo();
    this.motor = this.detector ? "nativo" : "zxing";
    if (this.motor === "zxing") await prepararZxing();

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.pausar();
      else this.retomar();
    }, { signal: this.ouvintes.signal });

    this.agendar();
    return { motor: this.motor, lanterna: this.suportaLanterna };
  }

  parar(): void {
    this.encerrado = true;
    this.pausar();
    this.ouvintes.abort();
    this.trilha?.stop();
    this.stream?.getTracks().forEach((trilha) => trilha.stop());
    this.stream = null;
    this.trilha = null;
    this.video.srcObject = null;
    this.suportaLanterna = false;
    this.lanterna = false;
  }

  esquecer(): void {
    this.ultimoTexto = "";
    this.ultimoQuando = 0;
  }

  lanternaDisponivel(): boolean {
    return this.suportaLanterna;
  }

  lanternaLigada(): boolean {
    return this.lanterna;
  }

  async alternarLanterna(): Promise<boolean> {
    if (!this.trilha || !this.suportaLanterna) return false;
    const ligar = !this.lanterna;
    const ajuste: AjusteCamera = { torch: ligar };
    await this.trilha.applyConstraints({ advanced: [ajuste] });
    this.lanterna = ligar;
    return this.lanterna;
  }

  private pausar(): void {
    this.pausado = true;
    window.clearTimeout(this.timer);
  }

  private retomar(): void {
    if (this.encerrado) return;
    this.pausado = false;
    this.agendar();
  }

  private agendar(): void {
    if (this.encerrado || this.pausado) return;
    const espera = this.motor === "nativo" ? 200 : 350;
    this.timer = window.setTimeout(() => {
      void this.quadro();
    }, espera);
  }

  private async quadro(): Promise<void> {
    if (this.encerrado || this.pausado) return;
    if (!this.ocupado && this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && this.video.videoWidth > 0) {
      this.ocupado = true;
      try {
        const textos = await this.detectar();
        for (const texto of textos) this.receber(texto);
      } catch {
        if (this.motor === "nativo") {
          this.motor = "zxing";
          this.detector = null;
          await prepararZxing().catch(() => undefined);
        }
      } finally {
        this.ocupado = false;
      }
    }
    this.agendar();
  }

  private receber(texto: string): void {
    const textoLimpo = texto.trim();
    if (!textoLimpo) return;
    const agora = performance.now();
    if (textoLimpo === this.ultimoTexto && agora - this.ultimoQuando < 1500) return;
    this.ultimoTexto = textoLimpo;
    this.ultimoQuando = agora;
    this.aoLer(textoLimpo);
  }

  private async detectar(): Promise<string[]> {
    if (this.detector && this.motor === "nativo") {
      const codigos = await this.detector.detect(this.video);
      return codigos.map((codigo) => codigo.rawValue).filter((valor) => valor.length > 0);
    }
    return this.detectarComZxing();
  }

  private async detectarComZxing(): Promise<string[]> {
    const { largura, altura } = tamanhoQuadro(this.video);
    if (this.quadroCanvas.width !== largura) this.quadroCanvas.width = largura;
    if (this.quadroCanvas.height !== altura) this.quadroCanvas.height = altura;
    const contexto = this.quadroCanvas.getContext("2d", { willReadFrequently: true });
    if (!contexto) return [];
    contexto.drawImage(this.video, 0, 0, largura, altura);
    const imagem = contexto.getImageData(0, 0, largura, altura);
    const lidos = await readBarcodes(imagem, {
      formats: ["QRCode"],
      tryHarder: true,
      tryRotate: true,
      tryInvert: true,
      tryDownscale: false,
      tryDenoise: true,
      maxNumberOfSymbols: 3,
      textMode: "Plain",
    });
    return lidos.filter((lido) => lido.isValid && lido.text).map((lido) => lido.text);
  }
}
