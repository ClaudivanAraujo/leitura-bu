import type { ArquivoBu } from "../bu/arquivo";

export type ResultadoEntrega = "compartilhado" | "baixado" | "cancelado";

export interface DestinoArquivo {
  canShare?: (dados: ShareData) => boolean;
  share?: (dados: ShareData) => Promise<void>;
  baixar: (arquivo: File) => void;
}

export function baixarArquivo(arquivo: File): void {
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = url;
  link.download = arquivo.name;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function destinoDoNavegador(): DestinoArquivo {
  return {
    canShare: (dados) => {
      try {
        return navigator.canShare?.(dados) ?? false;
      } catch {
        return false;
      }
    },
    share: navigator.share ? navigator.share.bind(navigator) : undefined,
    baixar: baixarArquivo,
  };
}

function aceitaArquivo(destino: DestinoArquivo, arquivo: File): boolean {
  if (!destino.canShare || !destino.share) return false;
  try {
    return destino.canShare({ files: [arquivo] });
  } catch {
    return false;
  }
}

/**
 * Chame isto direto no clique, sem await antes: o Android só abre a folha
 * de compartilhamento se share() começar no mesmo gesto do toque.
 */
export function entregarArquivo(arquivo: ArquivoBu, destino = destinoDoNavegador()): Promise<ResultadoEntrega> {
  const json = new File([arquivo.conteudo], arquivo.nome, { type: "application/json" });
  const texto = new File([arquivo.conteudo], arquivo.nome, { type: "text/plain" });
  const escolhido = aceitaArquivo(destino, json) ? json : aceitaArquivo(destino, texto) ? texto : null;

  if (!escolhido || !destino.share) {
    destino.baixar(json);
    return Promise.resolve("baixado");
  }

  return destino.share({ files: [escolhido], title: arquivo.nome }).then(
    () => "compartilhado",
    (erro: unknown) => {
      if (erro instanceof DOMException && erro.name === "AbortError") return "cancelado";
      destino.baixar(json);
      return "baixado";
    },
  );
}
