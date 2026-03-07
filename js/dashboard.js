// dashboard.js
// Panel de usuario con métricas en historial.html

import { requireAuth, getUserRole } from './auth.js';
import { getUserCitations } from './citations.js';
import { supabase } from './supabaseClient.js'; // importar sólo para cumplir requisito, no se usa aquí
import { renderHistorial } from './historial.js';
import { renderMetrics } from './metrics.js';

// Show / hide factories ---------------------------------------------------
function showSection(sectionId) {
  document.querySelectorAll('#dashboard section').forEach(sec => {
    sec.hidden = true;
  });
  const target = document.getElementById(sectionId);
  if (target) target.hidden = false;
}

async function showHistorial() {
  showSection('historial-section');
  // refrescar contenido cuando se vuelve a la pestaña
  await renderHistorial();

  // también renderizamos las métricas personales siempre que se muestre
  // el historial; esto cubre a usuarios y administradores y evita tener
  // que invocar la función manualmente cada vez que el admin cambie de
  // sección dentro del dashboard.
  renderUserDashboard();

  // actualizar hash para reflectar estado
  if (location.hash !== '#historial') {
    history.replaceState(null, '', 'historial.html#historial');
  }
}

async function showMetrics() {
  // no exponemos métricas si no es administrador
  try {
    await requireAuth();
    const role = await getUserRole();
    if (role !== 'admin') {
      console.warn('[dashboard] showMetrics invoked by non‑admin', role);
      // devolvemos al historial sin redirección externa
      showHistorial();
      return;
    }
  } catch (e) {
    // requireAuth ya habrá redirigido si no hay sesión
    return;
  }

  showSection('metrics-section');
  renderMetrics();
  if (location.hash !== '#metrics') {
    history.replaceState(null, '', 'historial.html#metrics');
  }
}

async function renderUserDashboard() {
  // proteger la página y capturar usuario
  let user;
  try {
    user = await requireAuth();
  } catch (e) {
    console.debug('[dashboard] requireAuth redirigió', e);
    return;
  }

  // recuperar métricas personales de las citas
  let result;
  try {
    result = await getUserCitations(user);
  } catch (err) {
    console.error('Error obteniendo citas para dashboard:', err);
    result = { data: [], error: err };
  }

  const data = result.data || [];
  const totalCitations = data.length;

  // contar modelos usados (igual que en historial)
  const modelCounts = {};
  data.forEach(c => {
    const modelDisplay = c.models?.name || c.model_name_custom || '—';
    if (modelDisplay !== '—') {
      modelCounts[modelDisplay] = (modelCounts[modelDisplay] || 0) + 1;
    }
  });

  let mostUsedModel = '';
  let maxCount = 0;
  Object.entries(modelCounts).forEach(([m, cnt]) => {
    if (cnt > maxCount) {
      maxCount = cnt;
      mostUsedModel = m;
    }
  });

  // fecha de última cita
  let lastCitationDate = '';
  if (data.length) {
    const latest = data.reduce((a, b) => {
      return new Date(a.created_at) > new Date(b.created_at) ? a : b;
    });
    lastCitationDate = latest.created_at;
  }

  // citas del mes actual
  const now = new Date();
  const currentMonthCount = data.filter(c => {
    if (!c.created_at) return false;
    const d = new Date(c.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const container = document.getElementById('user-dashboard');
  if (!container) return;

  container.innerHTML = `
    <div class="dashboard-cards">
      <div class="card"><strong>Total de citas:</strong> ${totalCitations}</div>
      <div class="card"><strong>Modelo más usado:</strong> ${mostUsedModel || '—'}</div>
      <div class="card"><strong>Última cita:</strong> ${lastCitationDate ? new Date(lastCitationDate).toLocaleString('es-ES',{year:'numeric',month:'long',day:'numeric'}) : 'N/A'}</div>
      <div class="card"><strong>Citas este mes:</strong> ${currentMonthCount}</div>
    </div>
  `;
}

// helper que encapsula la carga apropiada del dashboard para usuarios
// (y ahora también puede servirse para administradores que quieran ver
// sus métricas personales en conjunto con su historial).
async function loadUserDashboard() {
  // showHistorial ya se encarga de invocar renderUserDashboard, así que
  // simplemente esperamos a su ejecución.
  await showHistorial();
}

// inicializador que elige sección en función del rol y, dentro de él, del hash
async function initDashboardSections() {
  // protegernos contra usuarios no autenticados
  try {
    await requireAuth();
  } catch (e) {
    // requireAuth ya efectuó la redirección correspondiente
    return;
  }

  const role = await getUserRole();
  switch (role) {
    case 'admin':
      // para administradores respetamos el hash (#metrics o #historial).
      // cuando no se solicita métricas globales, mostramos el historial tal
      // como lo haría un usuario normal; showHistorial se encarga de
      // añadir las métricas personales.
      if (location.hash === '#metrics') {
        await showMetrics();
      } else {
        await showHistorial();
      }
      break;

    case 'user':
    default:
      // cualquier otro rol se comporta como usuario normal; el módulo
      // historial ya gestiona la protección internamente
      await loadUserDashboard();
      break;
  }
}

// En la carga inicial arrancamos el inicializador anterior
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboardSections);
} else {
  initDashboardSections();
}

// también añadimos a `window` para que los scripts que no importan el módulo puedan invocarlos
window.showSection = showSection;
window.showHistorial = showHistorial;
window.showMetrics = showMetrics;

export { renderUserDashboard, showSection, showHistorial, showMetrics, loadUserDashboard, initDashboardSections };
