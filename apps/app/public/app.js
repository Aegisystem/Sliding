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
  if (!form.matches(".delete")) return;
  const ok = confirm(`¿Borrar «${form.dataset.title}»? Su enlace dejará de funcionar y no se puede deshacer.`);
  if (!ok) event.preventDefault();
});

// Reemplazar: elegir el archivo ya lo sube.
document.addEventListener("change", (event) => {
  const input = event.target;
  if (input.matches(".replace input[type=file]") && input.files.length) input.form.requestSubmit();
});

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
