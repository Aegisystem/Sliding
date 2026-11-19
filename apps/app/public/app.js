// Mejoras del panel. Todo funciona sin JS; esto solo ahorra clics.

// Copiar un enlace.
document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-copy]");
  if (!button) return;
  try {
    button.dataset.label ??= button.textContent;
    await navigator.clipboard.writeText(button.dataset.copy);
    button.textContent = "Enlace copiado";
    button.classList.add("is-copied");
    setTimeout(() => {
      button.textContent = button.dataset.label;
      button.classList.remove("is-copied");
    }, 2000);
  } catch {
    button.textContent = "No se pudo copiar";
  }
});

// Confirmar antes de borrar o desactivar: el enlace deja de funcionar.
document.addEventListener("submit", (event) => {
  const form = event.target;
  if (form.dataset.confirm && !confirm(form.dataset.confirm)) event.preventDefault();
});

// ── PowerPoint: se sube el PDF, y del .pptx solo sus notas (ADR 0004) ─────
// Leer el .pptx necesita JS; sin JS, «Agregar notas» no aparece y el PDF se sube solo.

const PPTX = /\.pptx$/i;
const fileError = document.querySelector("[data-file-error]");
let pptxModule = null;
const readNotes = async (file) => {
  pptxModule ??= import("/pptx-notes.js");
  const { readPptxNotes, PptxError } = await pptxModule;
  try {
    return (await readPptxNotes(file)).slides;
  } catch (error) {
    throw new Error(
      error instanceof PptxError ? error.message : "No se pudieron leer las notas de ese .pptx. Ábrelo en PowerPoint, guárdalo otra vez y vuelve a intentarlo.",
    );
  }
};

function showFileError(text) {
  if (!fileError) return alert(text);
  // Un aviso anterior («Notas guardadas») ya no dice lo que pasa ahora.
  for (const flash of document.querySelectorAll(".flash")) flash.hidden = flash !== fileError;
  fileError.textContent = text;
  fileError.hidden = false;
  fileError.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

for (const element of document.querySelectorAll("[data-needs-js]")) element.hidden = false;

/**
 * Sube una presentación desde Subir o Reemplazar. Con un PDF puede venir
 * también su .pptx: se leen sus notas y se mandan en `notas`, sin el archivo.
 * Devuelve el texto para mostrar mientras sube, o lanza un error para el Dueño.
 */
async function sendDeck(form, files) {
  const chosen = [...files];
  const pptx = chosen.filter((file) => PPTX.test(file.name));
  const decks = chosen.filter((file) => !PPTX.test(file.name));
  if (decks.length > 1 || pptx.length > 1) throw new Error("Elige una presentación a la vez: un .html, o un .pdf con su .pptx.");
  if (!decks.length) {
    throw new Error("Falta el PDF. Exporta tu presentación como PDF (en PowerPoint: Archivo › Exportar) y elige el PDF y el .pptx a la vez.");
  }
  const [deck] = decks;
  const notes = form.querySelector("input[name=notas]");
  notes.value = "";
  if (pptx.length) {
    if (!/\.pdf$/i.test(deck.name)) throw new Error("Las notas de un .pptx van con su PDF. Elige el PDF y el .pptx a la vez.");
    notes.value = JSON.stringify(await readNotes(pptx[0]));
  }
  // Solo la presentación va en `file`: el .pptx se queda en este computador.
  const transfer = new DataTransfer();
  transfer.items.add(deck);
  form.querySelector("input[name=file]").files = transfer.files;
  form.requestSubmit();
  return pptx.length ? `${deck.name}, con las notas de ${pptx[0].name}` : deck.name;
}

// Reemplazar: elegir el archivo ya lo sube. «Mover a»: elegir la carpeta ya mueve.
// «Agregar notas»: elegir el .pptx ya guarda sus notas.
document.addEventListener("change", async (event) => {
  const input = event.target;
  if (input.matches(".move select") && input.value) input.form.requestSubmit();
  if (!input.files?.length) return;
  if (input.matches(".replace input[type=file]")) {
    await sendDeck(input.form, input.files).catch((error) => {
      input.value = "";
      showFileError(error.message);
    });
  } else if (input.matches("[data-pptx]")) {
    try {
      input.form.querySelector("input[name=notas]").value = JSON.stringify(await readNotes(input.files[0]));
      input.form.requestSubmit();
    } catch (error) {
      showFileError(error.message);
    }
    input.value = "";
  }
});

// Cambiar el nombre de la carpeta: el formulario se abre con su botón.
const renameToggle = document.querySelector("[data-rename-toggle]");
const renameForm = document.querySelector(".rename");
if (renameToggle && renameForm) {
  renameToggle.hidden = false;
  renameForm.hidden = true;
  renameToggle.addEventListener("click", () => {
    const open = renameForm.hidden;
    renameForm.hidden = !open;
    renameToggle.setAttribute("aria-expanded", String(open));
    if (open) renameForm.querySelector("input").select();
  });
}

// «Nueva carpeta»: el botón abre el campo del nombre; Cancelar o Esc lo cierran.
// Si el nombre volvió con error, el campo ya viene abierto.
const newFolderButton = document.querySelector("[data-new-folder]");
const newFolderForm = document.querySelector(".new-folder");
if (newFolderButton && newFolderForm) {
  const field = newFolderForm.querySelector("input[name=nombre]");
  const cancel = newFolderForm.querySelector("[data-new-folder-cancel]");
  const show = (open, { focus = true } = {}) => {
    newFolderForm.hidden = !open;
    newFolderButton.setAttribute("aria-expanded", String(open));
    if (open) {
      newFolderForm.classList.remove("is-opening");
      void newFolderForm.offsetWidth;
      newFolderForm.classList.add("is-opening");
      if (focus) field.focus();
    } else if (focus) {
      newFolderButton.focus();
    }
  };
  newFolderButton.hidden = false;
  cancel.hidden = false;
  show(newFolderForm.hasAttribute("data-open"), { focus: false });
  newFolderButton.addEventListener("click", () => show(newFolderForm.hidden));
  cancel.addEventListener("click", () => show(false));
  newFolderForm.addEventListener("keydown", (event) => {
    if (event.key === "Escape") show(false);
  });
}

// «Más»: un menú abierto a la vez; se cierra al hacer clic fuera o con Esc.
const menus = () => document.querySelectorAll("details.more[open]");
document.addEventListener(
  "toggle",
  (event) => {
    if (!event.target.matches?.("details.more") || !event.target.open) return;
    for (const menu of menus()) if (menu !== event.target) menu.open = false;
  },
  true,
);
document.addEventListener("click", (event) => {
  for (const menu of menus()) if (!menu.contains(event.target)) menu.open = false;
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  for (const menu of menus()) {
    menu.open = false;
    if (menu.contains(document.activeElement)) menu.querySelector("summary").focus();
  }
});

// El árbol de carpetas: cada flecha abre o cierra lo que hay dentro. En el
// celular, el árbol entero se abre con el botón «Carpetas».
document.addEventListener("click", (event) => {
  const toggle = event.target.closest(".tree-toggle");
  if (toggle) openBranch(toggle.closest("li"), toggle.getAttribute("aria-expanded") !== "true");
});
function openBranch(item, open) {
  const toggle = item.querySelector(":scope > .tree-row > .tree-toggle");
  const branch = item.querySelector(":scope > .tree-list");
  if (!toggle || !branch) return;
  toggle.setAttribute("aria-expanded", String(open));
  branch.hidden = !open;
}
const treeOpen = document.querySelector("[data-tree-open]");
if (treeOpen) {
  const side = treeOpen.closest(".panel-side");
  treeOpen.hidden = false;
  treeOpen.addEventListener("click", () => {
    const open = !side.classList.contains("is-open");
    side.classList.toggle("is-open", open);
    treeOpen.setAttribute("aria-expanded", String(open));
  });
}

// Ordenar y mover las hileras del panel: Subir, Bajar y arrastrar (drag.js).
if (document.querySelector("[data-sortable]")) import("/drag.js");

// Subir: elegir o soltar un archivo lo sube.
const upload = document.querySelector(".upload");
if (upload) {
  const input = upload.querySelector("input[type=file]");
  const label = upload.querySelector(".upload-file");
  const idle = label.textContent;
  // Elegir el archivo (o el PDF con su .pptx) ya lo sube, como en Reemplazar.
  const start = async (files) => {
    if (!files.length) return;
    if (fileError) fileError.hidden = true;
    label.classList.add("has-file");
    label.textContent = [...files].some((file) => PPTX.test(file.name)) ? "Leyendo las notas del .pptx…" : files[0].name;
    try {
      label.textContent = `Subiendo ${await sendDeck(upload, files)}…`;
    } catch (error) {
      input.value = "";
      label.textContent = idle;
      label.classList.remove("has-file");
      showFileError(error.message);
    }
  };
  input.addEventListener("change", () => start(input.files));
  const page = document.querySelector("main");
  page.addEventListener("dragover", (event) => {
    if (input.disabled || !event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    upload.classList.add("is-dragging");
  });
  page.addEventListener("dragleave", (event) => {
    if (!page.contains(event.relatedTarget)) upload.classList.remove("is-dragging");
  });
  page.addEventListener("drop", (event) => {
    if (input.disabled || !event.dataTransfer.files.length) return;
    event.preventDefault();
    upload.classList.remove("is-dragging");
    start(event.dataTransfer.files);
  });
}

// La página de la skill: copiar o leer el texto completo.
const skillButton = document.querySelector("[data-copy-skill]");
if (skillButton) {
  const pre = document.querySelector("[data-skill-text]");
  const status = document.querySelector("[data-skill-status]");
  const load = () => fetch("/skill/html-slides.md").then((r) => (r.ok ? r.text() : Promise.reject(r.status)));
  let text = null;
  load()
    .then((t) => {
      text = t;
      pre.textContent = t;
    })
    .catch(() => {
      pre.textContent = "No se pudo cargar el texto. Usa el botón Descargar.";
    });
  skillButton.addEventListener("click", async () => {
    try {
      text ??= await load();
      await navigator.clipboard.writeText(text);
      skillButton.textContent = "Texto copiado";
      status.textContent = "Listo: pégaselo a tu IA con el pedido del paso 2.";
    } catch {
      status.textContent = "No se pudo copiar. Usa el botón Descargar.";
    }
  });
}
