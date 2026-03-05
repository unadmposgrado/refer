// ui-menu.js
// controla la visibilidad del menú hamburguesa en pantallas pequeñas.

export function initHamburgerMenu() {
  const btn = document.getElementById("hamburgerBtn");
  const nav = document.getElementById("headerNav");

  if (!btn || !nav) return;

  btn.addEventListener("click", () => {
    nav.classList.toggle("active");
  });

  // opcional: cerrar menú al seleccionar una opción (evita dejarlo abierto)
  nav.addEventListener('click', () => {
    if (nav.classList.contains('active')) {
      nav.classList.remove('active');
    }
  });
}
