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
      profiles (
        id,
        full_name,
        email,
        role,
        program_id,
        programs(id, nombre, nivel, division)
      ),
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

  // helper para convertir datos a CSV y disparar la descarga (usa un BOM para Excel)
  function exportToCSV(records, filename = 'historial_uso_ia.csv') {
    if (!records || records.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }
    const headers = [
      'Fecha',
      'Usuario',
      'Programa',
      'Modelo',
      'Tema',
      'Prompt'
    ];

    const rows = records.map(c => {
      const date = c.created_at ? new Date(c.created_at).toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }) : '';
      const user = c.profiles?.full_name || c.profiles?.email || '';
      const prog = c.profiles?.programs?.nombre || 'Desconocido';
      const model = c.models?.name || c.model_name_custom || 'Desconocido';
      const tema = c.tema || '';
      const prompt = c.prompt || '';
      return [date, user, prog, model, tema, prompt];
    });

    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // nueva función independiente que obtiene todo el historial desde Supabase
  async function exportarHistorialCompleto() {
    try {
      // consulta independiente para traer todo el historial enriquecido
      const { data, error } = await supabase
        .from('citations')
        .select(`
          created_at,
          tema,
          prompt,
          llm_response,
          model_name_custom,
          profiles(full_name, programs(nombre, nivel, division)),
          models(name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching full history for CSV export:', error);
        alert('No se pudo descargar el historial. Intente de nuevo más tarde.');
        return;
      }

      const records = data || [];
      // columnas exactas solicitadas
      const headers = [
        'Fecha',
        'Hora',
        'Usuario',
        'Programa',
        'Modelo',
        'Tema',
        'Prompt',
        'Respuesta del LLM'
      ];

      const rows = records.map(c => {
        const dt = c.created_at ? new Date(c.created_at) : null;
        const fecha = dt ? dt.toLocaleDateString('es-MX') : '';
        const hora = dt
          ? dt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
          : '';
        const usuario = c.profiles?.full_name || '';
        const programa = c.profiles?.programs?.nombre || 'Desconocido';
        let modelo = '';
        if (c.models?.name) modelo = c.models.name;
        else if (c.model_name_custom) modelo = c.model_name_custom;
        else modelo = 'No especificado';
        const tema = c.tema || '';
        const prompt = c.prompt || '';
        const respuesta = c.llm_response || '';
        return [fecha, hora, usuario, programa, modelo, tema, prompt, respuesta];
      });

      const BOM = '\uFEFF';
      const csvRows = [headers.join(',')].concat(
        rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      );
      const csvContent = BOM + csvRows.join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'historial_global_uso_ia.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Unexpected error exporting full history CSV', e);
      alert('Ocurrió un error inesperado.');
    }
  }

  // --- paginación del lado del servidor --------------------------------
  // constants para control de páginas
  const PAGE_SIZE = 20;
  let currentPage = 1;
  let totalRows = 0;       // número total de registros (tras aplicar filtros locales)

  // el arreglo `citations` contendrá únicamente la página actual
  let citations = [];
  // `filtered` seguirá usándose para modificaciones locales tras aplicar
  // filtros sobre los datos cargados en la página.
  let filtered = [];

  // helper que solicita una página al servidor y actualiza el estado local
  async function loadPage() {
    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error, count } = await supabase
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
        profiles(full_name,email,programs(nombre, nivel, division))
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching global citation history:', error);
      container.innerHTML = '<p>Error cargando historial global de IA.</p>';
      citations = [];
      filtered = [];
      totalRows = 0;
      return;
    }

    citations = data || [];
    filtered = [...citations];
    totalRows = count || citations.length;

    renderSummary();
    renderTablePage();
    renderPagination();
  }

  // cargar la primera página inmediatamente
  await loadPage();

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
      const prog = c.profiles?.programs?.nombre || 'Desconocido';
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
      if (c.profiles?.programs?.nombre) programs.add(c.profiles.programs.nombre);
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
      if (progVal && c.profiles?.programs?.nombre !== progVal) return false;
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

  // render de resumen (resume sobre los datos actualmente filtrados/paginados)
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

  // tabla y paginación renderizada desde el arreglo `filtered` (sólo página actual)
  function renderTablePage() {
    const containerTbl = document.getElementById('history-table-container');
    if (!containerTbl) return;
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);
    if (pageItems.length === 0) {
      containerTbl.innerHTML = '<p>No hay registros.</p>';
      return;
    }
    let html = '<table class="admin-table"><thead><tr><th>Fecha</th><th>Usuario</th><th>Programa</th><th>Modelo</th><th>Tema</th><th>Prompt</th><th>Detalle</th></tr></thead><tbody>';
    pageItems.forEach(c => {
      // format fecha+hora sin segundos para el historial global
      const date = c.created_at ? new Date(c.created_at).toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }) : '';
      const user = c.profiles?.full_name || c.profiles?.email || '';
      const prog = c.profiles?.programs?.nombre || 'Desconocido';
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
        // buscar en la página filtrada (o en la página completa si no hay filtros)
        const citation = filtered.find(x=>String(x.id)===cid) || citations.find(x=>String(x.id)===cid);
        if (citation) showCitationModal(citation);
      });
    });
  }

  function renderPagination() {
    const pag = document.getElementById('history-pagination');
    if (!pag) return;
    // determinar si hay filtros activos
    const userVal = document.getElementById('filter-user')?.value || '';
    const progVal = document.getElementById('filter-program')?.value || '';
    const modelVal = document.getElementById('filter-model')?.value || '';
    const dateVal = document.getElementById('filter-date')?.value || '';
    const filtersActive = userVal || progVal || modelVal || dateVal;

    const totalPages = Math.max(1, Math.ceil((filtersActive ? filtered.length : totalRows) / PAGE_SIZE));
    pag.innerHTML = `
      <button id="prev-page" ${currentPage===1?'disabled':''}>Anterior</button>
      <span>Página ${currentPage} de ${totalPages}</span>
      <button id="next-page" ${currentPage===totalPages?'disabled':''}>Siguiente</button>
    `;
    document.getElementById('prev-page')?.addEventListener('click', () => {
      if (currentPage>1) {
        currentPage--;
        if (filtersActive) {
          renderTablePage();
          renderPagination();
        } else {
          loadPage();
        }
      }
    });
    document.getElementById('next-page')?.addEventListener('click', () => {
      if (currentPage<totalPages) {
        currentPage++;
        if (filtersActive) {
          renderTablePage();
          renderPagination();
        } else {
          loadPage();
        }
      }
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
        <p><strong>Programa:</strong> ${c.profiles?.programs?.nombre||'Desconocido'}</p>
        <p><strong>Modelo:</strong> ${c.models?.name||c.model_name_custom||'Desconocido'}</p>
        <p><strong>Tema:</strong> ${c.tema||''}</p>
        <p><strong>Prompt:</strong> ${c.prompt||''}</p>
        <p><strong>Respuesta:</strong> ${c.llm_response||''}</p>
        <p><strong>Referencia APA:</strong> ${c.citation_text||''}</p>
        <p><strong>Fecha:</strong> ${c.created_at?new Date(c.created_at).toLocaleString('es-ES', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }) : ''}</p>
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

  // listener para botón exportar: ahora solicita todo el historial desde el servidor
  const exportBtn = document.getElementById('export-csv');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportarHistorialCompleto);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderAdminDashboard);
} else {
  renderAdminDashboard();
}

export { renderAdminDashboard };
