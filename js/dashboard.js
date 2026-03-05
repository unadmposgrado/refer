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
      // si alguien intenta acceder sin permiso, mostramos historial en su lugar
      showHistorial();
      return;
    }
  } catch (e) {
    return; // redirección ya ejecutada
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

  let result;
  try {
    result = await getUserCitations(user);
  } catch (err) {
    console.error('Error obteniendo citas para dashboard:', err);
    result = { data: [], error: err };
  }

  const data = result.data || [];

  const totalCitations = data.length;

  // contar modelos usados
  const modelCounts = {};
  data.forEach(c => {
    let modelDisplay = '';
    if (c.model_id) {
      if (c.models && c.models.name) {
        modelDisplay = c.models.name;
      } else {
        modelDisplay = 'Modelo eliminado';
      }
    } else {
      modelDisplay = c.model_name_custom || '';
    }
    modelCounts[modelDisplay] = (modelCounts[modelDisplay] || 0) + 1;
  });

  let mostUsedModel = '';
  let maxCount = 0;
  Object.entries(modelCounts).forEach(([m, cnt]) => {
    if (cnt > maxCount) {
      maxCount = cnt;
      mostUsedModel = m;
    }
  });

  // obtener fecha de última cita por created_at
  let lastCitationDate = '';
  if (data.length) {
    const latest = data.reduce((a, b) => {
      return new Date(a.created_at) > new Date(b.created_at) ? a : b;
    });
    lastCitationDate = latest.created_at;
  }

  // contar citas del mes actual
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
      <div class="card"><strong>Modelo más usado:</strong> ${mostUsedModel || 'N/A'}</div>
      <div class="card"><strong>Última cita:</strong> ${lastCitationDate ? new Date(lastCitationDate).toLocaleString('es-ES',{year:'numeric',month:'long',day:'numeric'}) : 'N/A'}</div>
      <div class="card"><strong>Citas este mes:</strong> ${currentMonthCount}</div>
    </div>
  `;
}

// En la carga inicial, eligimos qué sección mostrar según hash
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const h = location.hash;
    if (h === '#metrics') {
      showMetrics();
    } else {
      showHistorial();
    }
    renderUserDashboard();
  });
} else {
  const h = location.hash;
  if (h === '#metrics') {
    showMetrics();
  } else {
    showHistorial();
  }
  renderUserDashboard();
}

// también añadimos a `window` para que los scripts que no importan el módulo puedan invocarlos
window.showSection = showSection;
window.showHistorial = showHistorial;
window.showMetrics = showMetrics;

export { renderUserDashboard, showSection, showHistorial, showMetrics };
