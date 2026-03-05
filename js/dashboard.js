// dashboard.js
// Panel de usuario con métricas en historial.html

import { requireAuth, getUser } from './auth.js';
import { getUserCitations } from './citations.js';
import { supabase } from './supabaseClient.js'; // importar sólo para cumplir requisito, no se usa aquí

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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderUserDashboard);
} else {
  renderUserDashboard();
}

export { renderUserDashboard };
