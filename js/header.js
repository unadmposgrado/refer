// header.js
// Carga el HTML del encabezado desde "header.html" y lo inserta en cada página.
// También ejecuta inicializaciones de login/registro después de cargarlo.

import { supabase } from './supabaseClient.js';
import { initLogin } from './login.js';
import { initRegister } from './registro.js';
import { getUser, getUserRole } from './auth.js';

async function loadHeader() {
  // elegir qué header cargar basándonos en la sesión de Supabase
  // esto unifica la lógica para todas las páginas y evita depender
  // únicamente del nombre del archivo actual.
  let file = 'header.html';
  let user = null;
  try {
    user = await getUser();
    if (user) {
      file = 'header-logged.html';
    }
  } catch (err) {
    // si hay algún fallo durante la comprobación de sesión, dejamos
    // el header público para no bloquear la carga de la página.
    console.error('Error verificando sesión para header:', err);
  }

  fetch(file)
    .then(function(response) {
      if (!response.ok) throw new Error('No se pudo cargar el header');
      return response.text();
    })
    .then(function(html) {
      const container = document.getElementById('siteHeader');
      if (container) {
        container.innerHTML = html;
      }

      // navegación básica compartida (login/registro)
      const loginBtn = document.getElementById('loginBtn');
      if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
          e.preventDefault();
          if (!location.pathname.endsWith('login.html')) {
            location.href = 'login.html';
          }
        });
      }
      const registerBtn = document.getElementById('registerBtn');
      if (registerBtn) {
        registerBtn.addEventListener('click', function(e) {
          e.preventDefault();
          if (!location.pathname.endsWith('registro.html')) {
            location.href = 'registro.html';
          }
        });
      }

      // navegación entre secciones y páginas para usuario autenticado
      const navRefer = document.getElementById('navRefer');
      if (navRefer) {
        navRefer.addEventListener('click', function(e) {
          e.preventDefault();
          if (!location.pathname.endsWith('refer.html')) {
            location.href = 'refer.html';
          }
        });
      }

      const navHistorial = document.getElementById('navHistorial');
      if (navHistorial) {
        navHistorial.addEventListener('click', function(e) {
          e.preventDefault();
          if (location.pathname.endsWith('historial.html')) {
            if (typeof window.showHistorial === 'function') {
              window.showHistorial();
            }
          } else {
            location.href = 'historial.html#historial';
          }
        });
      }

      const navMetrics = document.getElementById('navMetrics');
      if (navMetrics) {
        // estará oculto por defecto en el HTML; desbloqueamos solo si el rol es admin
        navMetrics.hidden = true;
        getUserRole().then(role => {
          if (role === 'admin') {
            navMetrics.hidden = false;
          }
        }).catch(err => {
          console.warn('No se pudo obtener rol para métricas', err);
        });

        navMetrics.addEventListener('click', function(e) {
          e.preventDefault();
          if (location.pathname.endsWith('historial.html')) {
            if (typeof window.showMetrics === 'function') {
              window.showMetrics();
            }
          } else {
            location.href = 'historial.html#metrics';
          }
        });
      }

      const logoutLink = document.getElementById('logoutLink');
      if (logoutLink) {
        logoutLink.addEventListener('click', async function(e) {
          e.preventDefault();
          if (typeof supabase !== 'undefined') {
            try {
              await supabase.auth.signOut();
            } catch (err) {
              console.warn('Error cerrando sesión', err);
            }
          }
          location.href = 'login.html';
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
