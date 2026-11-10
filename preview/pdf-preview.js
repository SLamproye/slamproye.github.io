/* A local-only PDF reader for Quarto's VS Code HTML preview. */
(() => {
  "use strict";

  const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  if (!localHosts.has(location.hostname) || window.self === window.top) return;

  const scriptUrl = document.currentScript.src;
  const documents = new Map([
    [new URL("../files/Lamproye_CV.pdf", scriptUrl).href, "Curriculum Vitae"],
    [new URL("../papers/Lamproye_JMP.pdf", scriptUrl).href, "Job Market Paper"]
  ]);
  let installed = false;

  function install() {
    if (installed || typeof window.QuartoPreview?.getOptions !== "function" ||
        !window.QuartoPreview.getOptions()) return;
    installed = true;

    document.addEventListener("click", (event) => {
      const link = event.target.closest?.("a[href]");
      if (!link || event.button !== 0 || event.ctrlKey || event.metaKey ||
          event.shiftKey || event.altKey || link.hasAttribute("download")) return;
      const target = new URL(link.href, location.href);
      const documentUrl = new URL(target.pathname, target.origin).href;
      const documentTitle = documents.get(documentUrl);
      if (!documentTitle) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openReader(link, documentUrl, documentTitle);
    }, true);
  }

  function openReader(opener, documentUrl, documentTitle) {
    const reader = document.createElement("dialog");
    reader.setAttribute("aria-label", `${documentTitle} PDF`);
    reader.style.cssText = "position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0;background:#f2f2f2;color:#172b3a;overflow:hidden;";
    const toolbar = document.createElement("div");
    toolbar.style.cssText = "height:48px;display:flex;align-items:center;gap:16px;padding:0 12px;background:#fff;border-bottom:1px solid #ddd;font:15px system-ui;box-sizing:border-box;";
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Back to website";
    close.style.cssText = "padding:6px 12px;border:1px solid #bbb;border-radius:4px;background:white;color:#172b3a;cursor:pointer;font:inherit;";
    const title = document.createElement("strong");
    title.textContent = `${documentTitle} (PDF)`;
    toolbar.append(close, title);
    const frame = document.createElement("iframe");
    frame.title = `${documentTitle} PDF reader`;
    frame.style.cssText = "display:block;width:100%;height:calc(100% - 48px);border:0;";
    const viewer = new URL("pdfjs/web/viewer.html", scriptUrl);
    viewer.searchParams.set("file", documentUrl);
    viewer.hash = "zoom=page-width";
    frame.src = viewer.href;
    reader.append(toolbar, frame);
    reader.addEventListener("close", () => {
      frame.src = "about:blank";
      reader.remove();
      opener.focus();
    }, { once: true });
    close.addEventListener("click", () => reader.close());
    document.body.append(reader);
    reader.showModal();
    close.focus();
  }

  install();
  document.addEventListener("quarto-preview-initialized", install, { once: true });
})();
