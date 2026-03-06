// adminDashboard.js
// Panel administrativo con métricas globales y tabla filtrable

import { requireAuth, getUserRole } from './auth.js';
import { supabase } from './supabaseClient.js';

async function renderAdminDashboard() {
  await requireAuth();
  const role = await getUserRole();
  if (role !== 'admin') {
    location.href = 'index.html';
    return;
  }

  const { data, error } = await supabase
    .from('citations')
    .select(`
      *,
      profiles ( id, full_name, email, role ),
      models ( name )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching citations for admin:', error);
    return;
  }

  const citations = data || [];

  // métricas
  const totalGlobalCitations = citations.length;
  const usersSet = new Set();
  const modelCounts = {};

  citations.forEach(c => {
    if (c.user_id) usersSet.add(c.user_id);
    const modelDisplay = c.models?.name || c.model_name_custom || '—';
    if (modelDisplay !== '—') {
      modelCounts[modelDisplay] = (modelCounts[modelDisplay] || 0) + 1;
    }
  });

  const totalUsers = usersSet.size;

  // reutilizar ranking para determinar modelo más usado
  const modelRanking = Object.entries(modelCounts)
    .map(([name, cnt]) => ({ name, count: cnt }))
    .sort((a, b) => b.count - a.count);
  const modeloMasUsado = modelRanking[0]?.name || '—';

  // preparar tabla de uso de modelos ordenada descendente
  // (modelRanking ya calculado arriba aprovechando el reuse anterior)

  // render métricas y ranking
  const dash = document.getElementById('admin-dashboard');
  if (dash) {
    let rankingHtml = '';
    if (modelRanking.length) {
      rankingHtml = `
        <h3>Modelos más usados (global)</h3>
        <table class="model-ranking">
          <thead><tr><th>Modelo</th><th>Total de citas</th></tr></thead>
          <tbody>
            ${modelRanking.map(r => `<tr><td>${r.name}</td><td>${r.count}</td></tr>`).join('')}
          </tbody>
        </table>
      `;
    }

    dash.innerHTML = `
      <div class="dashboard-cards">
        <div class="card"><strong>Total citas:</strong> ${totalGlobalCitations}</div>
        <div class="card"><strong>Total usuarios:</strong> ${totalUsers}</div>
        <div class="card"><strong>Modelo más usado:</strong> ${modeloMasUsado || '—'}</div>
      </div>
      ${rankingHtml}
    `;
  }

  // preparar tabla y filtros
  const tableContainer = document.getElementById('admin-table');
  if (!tableContainer) return;

  const modelsSet = new Set();
  citations.forEach(c => {
    const m = c.models?.name || c.model_name_custom || '—';
    modelsSet.add(m);
  });
  const modelsArray = Array.from(modelsSet).sort();

  const filterHtml = `
    <div id="filters">
      <label>Modelo:
        <select id="filter-model"><option value="">Todos</option>
          ${modelsArray.map(m=>`<option value="${m}">${m}</option>`).join('')}
        </select>
      </label>
      <label>Desde <input type="date" id="filter-from"></label>
      <label>Hasta <input type="date" id="filter-to"></label>
    </div>
  `;
  tableContainer.innerHTML = filterHtml + '<div id="table-wrapper"></div>';

  const tableWrapper = document.getElementById('table-wrapper');

  function renderTable(records) {
    if (!tableWrapper) return;
    if (records.length === 0) {
      tableWrapper.innerHTML = '<p>No hay registros.</p>';
      return;
    }
    let html = '<table class="admin-table"><thead><tr><th>Usuario</th><th>Modelo</th><th>Fecha consulta</th><th>Fecha creación</th><th>Texto</th></tr></thead><tbody>';
    records.forEach(c => {
      // profiles ahora incluye el email directamente; full_name se usa como respaldo
      const email = c.profiles?.email || c.profiles?.full_name || '';
      const modelDisplay = c.models?.name || c.model_name_custom || '—';
      const consulta = c.consulta_fecha ? new Date(c.consulta_fecha).toLocaleDateString('es-ES') : '';
      const created = c.created_at ? new Date(c.created_at).toLocaleDateString('es-ES') : '';
      let text = c.citation_text || '';
      if (text.length > 100) text = text.slice(0, 100) + '…';
      html += `<tr>
        <td>${email}</td>
        <td>${modelDisplay}</td>
        <td>${consulta}</td>
        <td>${created}</td>
        <td>${text}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    tableWrapper.innerHTML = html;
  }

  // render inicial
  renderTable(citations);

  const filterModel = document.getElementById('filter-model');
  const filterFrom = document.getElementById('filter-from');
  const filterTo = document.getElementById('filter-to');
  function applyFilters() {
    const filtered = citations.filter(c => {
      const modelDisplay = c.models?.name || c.model_name_custom || '—';
      if (filterModel && filterModel.value) {
        if (modelDisplay !== filterModel.value) return false;
      }
      let cDate = c.created_at ? new Date(c.created_at) : null;
      if (filterFrom && filterFrom.value) {
        const fromDate = new Date(filterFrom.value);
        if (!cDate || cDate < fromDate) return false;
      }
      if (filterTo && filterTo.value) {
        const toDate = new Date(filterTo.value);
        if (!cDate || cDate > new Date(toDate.getTime() + 24*60*60*1000 -1)) return false;
      }
      return true;
    });
    renderTable(filtered);
  }

  [filterModel, filterFrom, filterTo].forEach(el => {
    if (el) el.addEventListener('change', applyFilters);
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderAdminDashboard);
} else {
  renderAdminDashboard();
}

export { renderAdminDashboard };
