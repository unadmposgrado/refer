// header.js
// Carga el HTML del encabezado desde "header.html" y lo inserta en cada página.
// También ejecuta inicializaciones de login/registro después de cargarlo.

function loadHeader() {
  // decidir qué archivo traer según la página actual
  let file = 'header.html';
  if (window.location.pathname.endsWith('refer.html')) {
    file = 'header-logged.html';
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

      // perfil / menú desplegable (sólo en header-logged.html)
      const profileBtn = document.getElementById('profileBtn');
      const dropdown = document.getElementById('profileDropdown');
      if (profileBtn && dropdown) {
        profileBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          const expanded = profileBtn.getAttribute('aria-expanded') === 'true';
          profileBtn.setAttribute('aria-expanded', String(!expanded));
          dropdown.classList.toggle('visible');
        });
        // cerrar al hacer clic fuera
        document.addEventListener('click', function() {
          dropdown.classList.remove('visible');
          profileBtn.setAttribute('aria-expanded', 'false');
        });

        // intentar cargar foto de perfil desde Supabase si hay sesión
        function tryLoadAvatar(){
          if (typeof supabaseClient === 'undefined') return;
          supabaseClient.auth.getUser().then(({ data: { user } }) => {
            if (user && user.user_metadata && user.user_metadata.avatar_url) {
              const imgEl = document.querySelector('.profile-img');
              if (imgEl) imgEl.src = user.user_metadata.avatar_url;
            }
          }).catch(()=>{});
        }
        // esperamos a que otros scripts (app.js) inicialicen el cliente
        setTimeout(tryLoadAvatar, 0);
      }
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
          e.preventDefault();
          if (typeof supabaseClient !== 'undefined') {
            try {
              await supabaseClient.auth.signOut();
            } catch (err) {
              console.warn('Error cerrando sesión', err);
            }
          }
          window.location.href = 'login.html';
        });
      }

      // redirección al historial
      const historyLink = document.getElementById('historyLink');
      if (historyLink) {
        historyLink.addEventListener('click', function(e) {
          // por si acaso se evita recargar misma página
          e.preventDefault();
          window.location.href = 'historial.html';
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
