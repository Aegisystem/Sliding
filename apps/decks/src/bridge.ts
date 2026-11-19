import type { DeckKind } from "@sliding/core";

/**
 * El puente: un script que se agrega al final de cada presentación servida.
 * Solo escucha a la app (la Pantalla que la contiene) y le avisa de vuelta.
 *
 * De la Pantalla recibe:   { sliding: 1, type: "go", to: "next" | "prev" | n }
 *                          { sliding: 1, type: "hello" }  → responde con su estado
 * A la Pantalla le envía:  { sliding: 1, type: "slide", index, total }   (html-slides)
 *                          { sliding: 1, type: "ready" }                 (genérica)
 *                          { sliding: 1, type: "key", key: "q" }         (nuevo QR)
 *
 * Con html-slides usa `show(n)` del motor y su evento `slidechange`; con
 * cualquier otra presentación simula las flechas del teclado. Una
 * Presentación en PDF no lleva el puente: public/visor.js habla igual.
 */
export function bridgeScript(appOrigin: string, kind: DeckKind): string {
  const source = `(() => {
  const APP = ${JSON.stringify(appOrigin)};
  const KIND = ${JSON.stringify(kind)};
  if (window.parent === window) return;
  const post = (message) => window.parent.postMessage(Object.assign({ sliding: 1 }, message), APP);
  const slides = () => document.querySelectorAll("section.slide");
  const current = () => Math.max(0, Array.prototype.findIndex.call(slides(), (s) => s.classList.contains("active")));
  const report = () => KIND === "html-slides" ? post({ type: "slide", index: current(), total: slides().length }) : post({ type: "ready" });
  const press = (key) => document.dispatchEvent(new KeyboardEvent("keydown", { key, code: key, bubbles: true, cancelable: true }));
  const go = (to) => {
    const show = KIND === "html-slides" && typeof window.show === "function" ? window.show : null;
    if (typeof to === "number") { if (show) show(to); return; }
    if (show) show(current() + (to === "next" ? 1 : -1));
    else press(to === "next" ? "ArrowRight" : "ArrowLeft");
  };
  document.addEventListener("slidechange", (event) => {
    const index = event.detail && typeof event.detail.index === "number" ? event.detail.index : current();
    post({ type: "slide", index, total: slides().length });
  });
  window.addEventListener("message", (event) => {
    if (event.origin !== APP || event.source !== window.parent || !event.data || event.data.sliding !== 1) return;
    if (event.data.type === "go") go(event.data.to);
    else if (event.data.type === "hello") report();
  });
  document.addEventListener("keydown", (event) => {
    if ((event.key === "q" || event.key === "Q") && !event.ctrlKey && !event.metaKey && !event.altKey && event.isTrusted) post({ type: "key", key: "q" });
  }, true);
  report();
})();`;
  return `<script data-sliding-bridge>${source}</script>`;
}

/** Agrega el puente al final del documento, haya o no `</body>`. */
export function withBridge(response: Response, appOrigin: string, kind: DeckKind): Response {
  const script = bridgeScript(appOrigin, kind);
  return new HTMLRewriter()
    .onDocument({
      end(end) {
        end.append(script, { html: true });
      },
    })
    .transform(response);
}
