// header.js
// Carga el HTML del encabezado desde "header.html" y lo inserta en cada página.
// También ejecuta inicializaciones de login/registro después de cargarlo.

function loadHeader() {
  fetch('header.html')
    .then(function(response) {
      if (!response.ok) throw new Error('No se pudo cargar el header');
      return response.text();
    })
    .then(function(html) {
      const container = document.getElementById('siteHeader');
      if (container) {
        container.innerHTML = html;
      }

      // agregar navegación básica a los botones del header independientemente de otros scripts
      const loginBtn = document.getElementById('loginBtn');
      if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
          e.preventDefault();
          if (!window.location.pathname.endsWith('login.html')) {
            window.location.href = 'login.html';
          }
        });
      }
      const registerBtn = document.getElementById('registerBtn');
      if (registerBtn) {
        registerBtn.addEventListener('click', function(e) {
          e.preventDefault();
          if (!window.location.pathname.endsWith('registro.html')) {
            window.location.href = 'registro.html';
          }
        });
      }

      // después de insertar, inicializa los scripts de página si existen
      if (typeof initLogin === 'function') initLogin();
      if (typeof initRegister === 'function') initRegister();
    })
    .catch(function(err) {
      console.error('Error cargando header:', err);
    });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadHeader);
} else {
  loadHeader();
}
