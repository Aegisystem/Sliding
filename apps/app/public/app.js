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

// Confirmar antes de borrar: el enlace deja de funcionar.
document.addEventListener("submit", (event) => {
  const form = event.target;
  if (form.matches(".delete") && !confirm(form.dataset.confirm)) event.preventDefault();
});

// Reemplazar: elegir el archivo ya lo sube. «Mover a»: elegir la carpeta ya mueve.
document.addEventListener("change", (event) => {
  const input = event.target;
  if (input.matches(".replace input[type=file]") && input.files.length) input.form.requestSubmit();
  if (input.matches(".move select") && input.value) input.form.requestSubmit();
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

// Ordenar: «Subir» y «Bajar» en cada hilera (también con las flechas del
// teclado) o, con el mouse, arrastrar la hilera desde su código de color.
// El orden se guarda solo, en /panel/orden.
const orderError = document.querySelector("[data-order-error]");
const orderStatus = document.querySelector("[data-order-status]");
const rowsOf = (list) => [...list.children].filter((el) => el.matches("li[data-id]"));
const nameOf = (row) => row.querySelector(".session-title")?.textContent.trim() ?? "";

const pending = new Map();
function saveOrder(list) {
  clearTimeout(pending.get(list));
  pending.set(
    list,
    setTimeout(async () => {
      const response = await fetch("/panel/orden", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ parent: list.dataset.parent || null, kind: list.dataset.sortable, ids: rowsOf(list).map((r) => r.dataset.id) }),
      }).catch(() => null);
      if (orderError) orderError.hidden = Boolean(response?.ok);
    }, 350),
  );
}

// La primera no sube y la última no baja. Con aria-disabled el botón conserva el foco.
function markEnds(list) {
  const rows = rowsOf(list);
  rows.forEach((row, i) => {
    row.querySelector('[data-move="up"]')?.setAttribute("aria-disabled", String(i === 0));
    row.querySelector('[data-move="down"]')?.setAttribute("aria-disabled", String(i === rows.length - 1));
  });
}

function moved(row) {
  const list = row.parentElement;
  const rows = rowsOf(list);
  markEnds(list);
  if (orderStatus) orderStatus.textContent = `«${nameOf(row)}» quedó en el lugar ${rows.indexOf(row) + 1} de ${rows.length}.`;
  saveOrder(list);
}

// Se mueve la vecina, nunca la hilera misma: sacarla del documento, aunque sea
// un instante, le quita el puntero que la arrastra y el foco del teclado.
// Las hileras se deslizan a su lugar nuevo en vez de saltar; la que se
// arrastra no, porque va con el puntero.
const calm = matchMedia("(prefers-reduced-motion: reduce)");
function moveRow(row, place, { slideSelf = true } = {}) {
  const list = row.parentElement;
  const before = new Map(rowsOf(list).map((r) => [r, r.getBoundingClientRect().top]));
  place();
  if (calm.matches) return;
  for (const r of rowsOf(list)) {
    if (r === row && !slideSelf) continue;
    const delta = before.get(r) - r.getBoundingClientRect().top;
    if (!delta) continue;
    r.animate([{ transform: `translateY(${delta}px)` }, { transform: "none" }], { duration: 180, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
  }
}

function step(row, dir) {
  const sibling = dir === "up" ? row.previousElementSibling : row.nextElementSibling;
  if (!sibling) return;
  moveRow(row, () => (dir === "up" ? row.after(sibling) : row.before(sibling)));
  moved(row);
}

for (const list of document.querySelectorAll("[data-sortable]")) {
  if (rowsOf(list).length < 2) continue;
  list.classList.add("is-sortable");
  for (const button of list.querySelectorAll("[data-move]")) button.hidden = false;
  markEnds(list);

  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-move]");
    if (button && button.getAttribute("aria-disabled") !== "true") step(button.closest("li"), button.dataset.move);
  });

  list.addEventListener("keydown", (event) => {
    const button = event.target.closest("[data-move]");
    if (!button || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
    event.preventDefault();
    step(button.closest("li"), event.key === "ArrowUp" ? "up" : "down");
  });

  // Arrastrar es solo con el mouse: en el celular están los botones, y así
  // deslizar el dedo sobre el código sigue desplazando la página.
  list.addEventListener("pointerdown", (event) => {
    const code = event.target.closest(".session-code");
    if (!code || event.target.closest("button") || event.pointerType === "touch" || event.button !== 0) return;
    event.preventDefault();
    const row = code.closest("li");
    const start = rowsOf(list).indexOf(row);
    code.setPointerCapture(event.pointerId);
    row.classList.add("is-dragging");
    document.documentElement.classList.add("is-sorting");

    const move = (e) => {
      // Cerca del borde de la ventana, la página se desplaza sola.
      if (e.clientY < 64) scrollBy(0, -16);
      else if (e.clientY > innerHeight - 64) scrollBy(0, 16);
      // Se compara con el lugar de cada hilera en la lista, no con donde se ve:
      // mientras se desliza, la vecina todavía se dibuja en su lugar anterior.
      const y = e.clientY - list.getBoundingClientRect().top;
      const middle = (r) => r.offsetTop + r.offsetHeight / 2;
      const prev = row.previousElementSibling;
      const next = row.nextElementSibling;
      if (prev && y < middle(prev)) moveRow(row, () => row.after(prev), { slideSelf: false });
      else if (next && y > middle(next)) moveRow(row, () => row.before(next), { slideSelf: false });
    };
    const end = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", end);
      document.removeEventListener("pointercancel", end);
      row.classList.remove("is-dragging");
      document.documentElement.classList.remove("is-sorting");
      if (rowsOf(list).indexOf(row) !== start) moved(row);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", end);
    document.addEventListener("pointercancel", end);
  });
}

// Subir: elegir o soltar un archivo lo sube.
const upload = document.querySelector(".upload");
if (upload) {
  const input = upload.querySelector("input[type=file]");
  const label = upload.querySelector(".upload-file");
  const show = () => {
    if (!input.files.length) return;
    label.textContent = input.files[0].name;
    label.classList.add("has-file");
  };
  // Elegir el archivo ya lo sube, como en Reemplazar.
  input.addEventListener("change", () => {
    show();
    if (input.files.length) upload.requestSubmit();
  });
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
    input.files = event.dataTransfer.files;
    show();
    upload.requestSubmit();
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
