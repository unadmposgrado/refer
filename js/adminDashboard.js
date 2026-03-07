// adminDashboard.js
// Panel administrativo con métricas globales y tabla filtrable

import { requireAuth, getUserRole } from './auth.js';
import { supabase } from './supabaseClient.js';

async function renderAdminDashboard() {
  await requireAuth();
  const role = await getUserRole();
  if (role !== 'admin') {
    // no damos permiso a usuarios normales; en lugar de sacar fuera
    // del dashboard simplemente dejamos de renderizar el panel global.
    console.warn('[adminDashboard] llamado por no‑admin', role);
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
  if (tableContainer) {
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

  // una vez terminado el dashboard principal, inicializamos el módulo de historial global
  renderGlobalCitationHistory();
}

// función auxiliar para el módulo de historial global
async function renderGlobalCitationHistory() {
  const container = document.getElementById('global-history-module');
  if (!container) return; // nada que hacer si no existe

  // obtener todas las citas con los campos necesarios (incluyendo programa)
  const { data, error } = await supabase
    .from('citations')
    .select(`
      id,
      created_at,
      tema,
      prompt,
      citation_text,
      llm_response,
      user_id,
      model_id,
      model_name_custom,
      models(name),
      profiles(full_name,email,program)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching global citation history:', error);
    container.innerHTML = '<p>Error cargando historial global de IA.</p>';
    return;
  }

  const citations = data || [];

  // variables de estado de paginación
  let filtered = [...citations];
  let currentPage = 1;
  const pageSize = 50;

  // helpers para métricas
  function computeSummary(records) {
    const total = records.length;
    const users = new Set();
    const modelCounts = {};
    const programCounts = {};

    records.forEach(c => {
      if (c.user_id) users.add(c.user_id);
      const m = c.models?.name || c.model_name_custom || 'Desconocido';
      modelCounts[m] = (modelCounts[m] || 0) + 1;
      const prog = c.profiles?.program || 'Desconocido';
      programCounts[prog] = (programCounts[prog] || 0) + 1;
    });

    const mostUsedModel = Object.entries(modelCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';
    const topProgram = Object.entries(programCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';

    return { total, uniqueUsers: users.size, mostUsedModel, topProgram };
  }

  // render de filtros
  function renderFilters() {
    // programas y modelos únicos para opciones
    const programs = new Set();
    const models = new Set();
    citations.forEach(c => {
      if (c.profiles?.program) programs.add(c.profiles.program);
      const m = c.models?.name || c.model_name_custom || 'Desconocido';
      models.add(m);
    });
    const programOpts = Array.from(programs).sort();
    const modelOpts = Array.from(models).sort();

    const html = `
      <input id="filter-user" type="text" placeholder="Buscar usuario">
      <select id="filter-program"><option value="">Todos</option>${programOpts.map(p=>`<option value="${p}">${p}</option>`).join('')}</select>
      <select id="filter-model"><option value="">Todos</option>${modelOpts.map(m=>`<option value="${m}">${m}</option>`).join('')}</select>
      <select id="filter-date">
        <option value="">Todas las fechas</option>
        <option value="7">Últimos 7 días</option>
        <option value="30">Últimos 30 días</option>
        <option value="365">Último año</option>
      </select>
    `;
    const filt = document.getElementById('history-filters');
    if (filt) filt.innerHTML = html;

    // añadir listeners
    ['filter-user','filter-program','filter-model','filter-date'].forEach(id=>{
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', applyFilters);
    });
  }

  function applyFilters() {
    const userVal = document.getElementById('filter-user')?.value.toLowerCase() || '';
    const progVal = document.getElementById('filter-program')?.value || '';
    const modelVal = document.getElementById('filter-model')?.value || '';
    const dateVal = document.getElementById('filter-date')?.value || '';

    filtered = citations.filter(c => {
      // usuario
      const name = (c.profiles?.full_name||'').toLowerCase();
      const email = (c.profiles?.email||'').toLowerCase();
      if (userVal) {
        if (!name.includes(userVal) && !email.includes(userVal)) return false;
      }
      // programa
      if (progVal && c.profiles?.program !== progVal) return false;
      // modelo
      const m = c.models?.name || c.model_name_custom || 'Desconocido';
      if (modelVal && m !== modelVal) return false;
      // fecha
      if (dateVal) {
        const now = new Date();
        const threshold = new Date(now.getTime() - Number(dateVal)*24*60*60*1000);
        const cDate = c.created_at ? new Date(c.created_at) : null;
        if (!cDate || cDate < threshold) return false;
      }
      return true;
    });

    currentPage = 1;
    renderSummary();
    renderTablePage();
    renderPagination();
  }

  // render de resumen
  function renderSummary() {
    const sum = computeSummary(filtered);
    const scont = document.getElementById('history-summary');
    if (!scont) return;
    scont.innerHTML = `
      <div class="dashboard-cards">
        <div class="card"><strong>Total citas:</strong> ${sum.total}</div>
        <div class="card"><strong>Usuarios activos:</strong> ${sum.uniqueUsers}</div>
        <div class="card"><strong>Modelo más usado:</strong> ${sum.mostUsedModel}</div>
        <div class="card"><strong>Programa más activo:</strong> ${sum.topProgram}</div>
      </div>
    `;
  }

  // tabla y paginación
  function renderTablePage() {
    const start = (currentPage-1)*pageSize;
    const pageItems = filtered.slice(start, start+pageSize);
    const containerTbl = document.getElementById('history-table-container');
    if (!containerTbl) return;
    if (pageItems.length === 0) {
      containerTbl.innerHTML = '<p>No hay registros.</p>';
      return;
    }
    let html = '<table class="admin-table"><thead><tr><th>Fecha</th><th>Usuario</th><th>Programa</th><th>Modelo</th><th>Tema</th><th>Prompt</th><th>Detalle</th></tr></thead><tbody>';
    pageItems.forEach(c => {
      const date = c.created_at ? new Date(c.created_at).toLocaleString('es-ES') : '';
      const user = c.profiles?.full_name || c.profiles?.email || '';
      const prog = c.profiles?.program || '';
      const m = c.models?.name || c.model_name_custom || 'Desconocido';
      let prompt = c.prompt || '';
      if (prompt.length > 50) prompt = prompt.slice(0,50)+'…';
      const modelClass = 'model-' + m.toLowerCase().replace(/\s+/g,'');
      html += `<tr>
        <td>${date}</td>
        <td>${user}</td>
        <td>${prog}</td>
        <td class="${modelClass}">${m}</td>
        <td>${c.tema||''}</td>
        <td>${prompt}</td>
        <td><button class="view-citation" data-id="${c.id}">Ver</button></td>
      </tr>`;
    });
    html += '</tbody></table>';
    containerTbl.innerHTML = html;

    // attach listeners to buttons
    containerTbl.querySelectorAll('.view-citation').forEach(btn => {
      btn.addEventListener('click', () => {
        const cid = btn.getAttribute('data-id');
        const citation = citations.find(x=>String(x.id)===cid);
        if (citation) showCitationModal(citation);
      });
    });
  }

  function renderPagination() {
    const pag = document.getElementById('history-pagination');
    if (!pag) return;
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    pag.innerHTML = `
      <button id="prev-page" ${currentPage===1?'disabled':''}>Anterior</button>
      <span>Página ${currentPage} de ${totalPages}</span>
      <button id="next-page" ${currentPage===totalPages?'disabled':''}>Siguiente</button>
    `;
    document.getElementById('prev-page')?.addEventListener('click', () => {
      if (currentPage>1) { currentPage--; renderTablePage(); renderPagination(); }
    });
    document.getElementById('next-page')?.addEventListener('click', () => {
      if (currentPage<totalPages) { currentPage++; renderTablePage(); renderPagination(); }
    });
  }

  // modal helper
  function showCitationModal(c) {
    const modal = document.createElement('div');
    modal.className = 'history-modal-overlay';
    modal.innerHTML = `
      <div class="history-modal">
        <button class="close-modal">×</button>
        <h3>Detalle de cita</h3>
        <p><strong>Usuario:</strong> ${c.profiles?.full_name||c.profiles?.email||''}</p>
        <p><strong>Programa:</strong> ${c.profiles?.program||''}</p>
        <p><strong>Modelo:</strong> ${c.models?.name||c.model_name_custom||'Desconocido'}</p>
        <p><strong>Tema:</strong> ${c.tema||''}</p>
        <p><strong>Prompt:</strong> ${c.prompt||''}</p>
        <p><strong>Respuesta:</strong> ${c.llm_response||''}</p>
        <p><strong>Referencia APA:</strong> ${c.citation_text||''}</p>
        <p><strong>Fecha:</strong> ${c.created_at?new Date(c.created_at).toLocaleString('es-ES') : ''}</p>
      </div>
    `;
    modal.addEventListener('click', e => {
      if (e.target === modal || e.target.classList.contains('close-modal')) {
        modal.remove();
      }
    });
    document.body.appendChild(modal);
  }

  // inicial render
  renderFilters();
  renderSummary();
  renderTablePage();
  renderPagination();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderAdminDashboard);
} else {
  renderAdminDashboard();
}

export { renderAdminDashboard };
