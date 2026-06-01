// adminDashboard.js
// Panel administrativo con métricas globales y tabla filtrable

import { requireAuth, getUserRole } from './auth.js';
import { supabase } from './supabaseClient.js';
import { renderMarkdown, renderCitationDetail } from './historial.js';

const MODEL_COLORS = {
  chatgpt: '#000000',
  claude: '#d07458',
  consensus: '#5dceaa',
  copilot: '#bc4db0',
  deepseek: '#416afd',
  gemini: '#f2c93c',
  grok: '#191a1b',
  llama: '#191a1b',
  perplexity: '#000000',
  qwen: '#5f3de5'
};

const NON_IA_MODEL_ICONS = {
  book: '📘',
  article: '📄',
  web: '🌐',
  thesis: '🎓',
  tesis: '🎓',
  informe: '📑',
  documento: '📃',
  default: '📚'
};

function getModelColor(modelName) {
  const name = (modelName || '').toLowerCase().trim();
  if (!name) return '#000000';

  for (const key of Object.keys(MODEL_COLORS)) {
    if (name.includes(key)) return MODEL_COLORS[key];
  }

  return '#000000';
}

function getNonIAModelIcon(rawType) {
  const typeKey = (rawType || '').toLowerCase().trim();
  return NON_IA_MODEL_ICONS[typeKey] || NON_IA_MODEL_ICONS.default;
}

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
        <label for="filter-model">Filtrar por modelo</label>
        <select id="filter-model"><option value="">Todos</option>
          ${modelsArray.map(m=>`<option value="${m}">${m}</option>`).join('')}
        </select>
        <label for="filter-from">Fecha desde</label>
        <input type="date" id="filter-from">
        <label for="filter-to">Fecha hasta</label>
        <input type="date" id="filter-to">
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
        const modelColor = getModelColor(modelDisplay);
        const consulta = c.consulta_fecha ? new Date(c.consulta_fecha).toLocaleDateString('es-ES') : '';
        const created = c.created_at ? new Date(c.created_at).toLocaleDateString('es-ES') : '';
        let text = c.citation_text || '';
        if (text.length > 100) text = text.slice(0, 100) + '…';
        html += `<tr>
          <td>${email}</td>
          <td><span style="color: ${modelColor}; font-weight: 600; transition: color .2s ease;">${modelDisplay}</span></td>
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

  // función auxiliar para determinar el nombre del programa
  // Incluye la excepción para académicos de universidad con división CAI
  function getProgramName(citation) {
    const profile = citation.profiles || {};
    const programaInstitucional = profile.programs?.nombre || null;
    
    // Excepción: académico de universidad con división CAI
    if (
      profile.tipo_usuario === 'academico_universidad' &&
      profile.division === 'Coordinación Académica y de Investigación (CAI)'
    ) {
      return 'CAI';
    }
    
    // Fallback al programa institucional o desconocido
    return programaInstitucional || 'Desconocido';
  }

  // nueva función independiente que obtiene todo el historial desde Supabase
  async function exportarHistorialCompleto() {
    const safe = (v) => v ?? '';
    const tipoUsuarioMap = {
      estudiante_universidad: 'Estudiante UnADM',
      estudiante_externo: 'Estudiante externo',
      academico_universidad: 'Figura académica UnADM',
      externo: 'Usuario externo'
    };

    // Mapeo de source_type a tipos de referencia legibles
    const sourceTypeMap = {
      ia: 'Modelo de IA',
      book: 'Libro',
      article: 'Artículo',
      web: 'Sitio Web',
      thesis: 'Tesis',
      tesis: 'Tesis',
      informe: 'Informe',
      reporte: 'Reporte',
      documento: 'Documento'
    };

    try {
      // consulta independiente para traer todo el historial enriquecido
      // IMPORTANTE: Incluir source_type y citation_text para nueva estructura CSV
      const { data, error } = await supabase
        .from('citations')
        .select(`
          created_at,
          source_type,
          citation_text,
          tema,
          prompt,
          llm_response,
          model_name_custom,
          profiles(
            full_name,
            tipo_usuario,
            nivel_educativo,
            division,
            programs(
              nombre
            )
          ),
          models(name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching full history for CSV export:', error);
        alert('No se pudo descargar el historial. Intente de nuevo más tarde.');
        return;
      }

      const records = data || [];
      // Columnas en el orden exacto solicitado
      const headers = [
        'Fecha',
        'Hora',
        'Usuario',
        'Tipo de usuario',
        'División o coordinación',
        'Programa Institucional',
        'Tipo de referencia',
        'Referencia generada',
        'Modelo',
        'Tema',
        'Prompt',
        'Respuesta'
      ];

      const rows = records.map(c => {
        const dt = c.created_at ? new Date(c.created_at) : null;
        const fecha = dt ? dt.toLocaleDateString('es-MX') : '';
        const hora = dt
          ? dt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
          : '';

        const profile = c.profiles || {};
        const sourceType = (c.source_type || 'ia').toLowerCase();

        const usuario = safe(profile.full_name);
        const tipoUsuarioSlug = profile.tipo_usuario || '';
        const tipoUsuario = tipoUsuarioMap[tipoUsuarioSlug] || tipoUsuarioSlug || '';
        const division = safe(profile.division);
        
        // Programa Institucional: mostrar "No aplica" para usuarios de CAI
        let programaInstitucional = safe(profile.programs?.nombre);
        if (division === 'Coordinación Académica y de Investigación (CAI)') {
          programaInstitucional = 'No aplica';
        }

        // Tipo de referencia: mapear source_type a nombre legible
        const tipoReferencia = sourceTypeMap[sourceType] || sourceType || '';

        // Referencia generada: usar citation_text
        const referenciaGenerada = safe(c.citation_text);

        // Campos que solo se llenan para referencias de IA
        let modelo = '';
        let tema = '';
        let prompt = '';
        let respuesta = '';

        if (sourceType === 'ia') {
          // Solo para referencias de IA: llenar modelo, tema, prompt, respuesta
          if (c.models?.name) modelo = c.models.name;
          else if (c.model_name_custom) modelo = c.model_name_custom;

          tema = safe(c.tema);
          prompt = safe(c.prompt);
          respuesta = safe(c.llm_response);
        }
        // Para otros tipos (book, article, web, etc.): deixar vacío

        return [
          fecha,
          hora,
          usuario,
          tipoUsuario,
          division,
          programaInstitucional,
          tipoReferencia,
          referenciaGenerada,
          modelo,
          tema,
          prompt,
          respuesta
        ];
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

  // objeto global de estado de filtros
  const filters = {
    user: '',
    program: '',
    model: '',
    dateRange: ''
  };

  // helper que solicita una página al servidor y actualiza el estado local
  async function loadPage() {
    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    // construir query base
    let query = supabase
      .from('citations')
      .select(`
        id,
        created_at,
        source_type,
        tema,
        prompt,
        citation_text,
        llm_response,
        metadata,
        user_id,
        model_id,
        model_name_custom,
        models(name),
        profiles(full_name,email,tipo_usuario,division,programs(nombre, nivel, division))
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // aplicar filtros dinámicos
    // A) Filtro de usuario
    if (filters.user) {
      query = query.or(`profiles.full_name.ilike.%${filters.user}%,profiles.email.ilike.%${filters.user}%`);
    }
    // B) Filtro de programa
    if (filters.program) {
      query = query.eq('profiles.programs.nombre', filters.program);
    }
    // C) Filtro de modelo
    if (filters.model) {
      const typeMapReverse = {
        'IA': 'ia',
        'Libro': 'book',
        'Artículo': 'article',
        'Web': 'web'
      };
      const sourceType = typeMapReverse[filters.model];
      if (sourceType === 'ia') {
        query = query.or(`models.name.ilike.%${filters.model}%,model_name_custom.ilike.%${filters.model}%`);
      } else if (sourceType) {
        query = query.eq('source_type', sourceType);
      } else {
        // asumir es modelo de ia
        query = query.or(`models.name.ilike.%${filters.model}%,model_name_custom.ilike.%${filters.model}%`);
      }
    }
    // D) Filtro de fecha
    if (filters.dateRange) {
      const days = parseInt(filters.dateRange);
      const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      query = query.gte('created_at', threshold.toISOString());
    }

    // aplicar paginación
    query = query.range(from, to);

    const { data, error, count } = await query;

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
  function getReferenceTypeLabel(rawType) {
    const normalized = (rawType || '').toLowerCase().trim();
    const typeMap = {
      book: 'Libro',
      article: 'Artículo',
      web: 'Sitio Web',
      thesis: 'Tesis',
      tesis: 'Tesis',
      informe: 'Informe'
    };
    if (typeMap[normalized]) return typeMap[normalized];
    if (normalized) return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    return 'Desconocido';
  }

  function computeSummary(records) {
    const total = records.length;
    const users = new Set();
    const usageCounts = {};
    const programCounts = {};

    records.forEach(c => {
      if (c.user_id) users.add(c.user_id);
      const rawType = (c.source_type || '').toLowerCase().trim();
      const usageKey = rawType === 'ia'
        ? c.models?.name || c.model_name_custom || 'Desconocido'
        : getReferenceTypeLabel(rawType);
      usageCounts[usageKey] = (usageCounts[usageKey] || 0) + 1;
      const prog = getProgramName(c);
      programCounts[prog] = (programCounts[prog] || 0) + 1;
    });

    const mostUsedTypeOrModel = Object.entries(usageCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';
    const topProgram = Object.entries(programCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';

    return { total, uniqueUsers: users.size, mostUsedTypeOrModel, topProgram };
  }

  // render de filtros
  function renderFilters() {
    // programas y modelos únicos para opciones
    const programs = new Set();
    const models = new Set();

    const typeMap = {
      ia: 'IA',
      book: 'Libro',
      article: 'Artículo',
      web: 'Web'
    };

    citations.forEach(c => {
      const progName = getProgramName(c);
      if (progName !== 'Desconocido') {
        programs.add(progName);
      }
      const rawType = (c.source_type || '').toLowerCase();

      if (rawType === 'ia') {
        const m = c.models?.name || c.model_name_custom || 'Desconocido';
        models.add(m);
      } else {
        const tipo = typeMap[rawType] || rawType || 'Otro';
        models.add(tipo);
      }
    });
    const programOpts = Array.from(programs).sort();
    const modelOpts = Array.from(models).sort();

    const html = `
      <label for="filter-user">Buscar usuario</label>
      <input id="filter-user" type="text" placeholder="Buscar usuario">
      <label for="filter-program">Filtrar por programa</label>
      <select id="filter-program"><option value="">Todos</option>${programOpts.map(p=>`<option value="${p}">${p}</option>`).join('')}</select>
      <label for="filter-model">Filtrar por modelo</label>
      <select id="filter-model"><option value="">Todos</option>${modelOpts.map(m=>`<option value="${m}">${m}</option>`).join('')}</select>
      <label for="filter-date">Filtrar por fecha</label>
      <select id="filter-date">
        <option value="">Todas las fechas</option>
        <option value="7">Últimos 7 días</option>
        <option value="30">Últimos 30 días</option>
        <option value="365">Último año</option>
      </select>
    `;
    const filt = document.getElementById('history-filters');
    if (filt) filt.innerHTML = html;

    // añadir listeners con debounce para user
    let debounceTimer;
    ['filter-user','filter-program','filter-model','filter-date'].forEach(id=>{
      const el = document.getElementById(id);
      if (el) {
        if (id === 'filter-user') {
          el.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              filters.user = el.value.toLowerCase();
              currentPage = 1;
              loadPage();
            }, 300);
          });
        } else {
          el.addEventListener('change', () => {
            if (id === 'filter-program') filters.program = el.value;
            else if (id === 'filter-model') filters.model = el.value;
            else if (id === 'filter-date') filters.dateRange = el.value;
            currentPage = 1;
            loadPage();
          });
        }
      }
    });
  }



  // render de resumen (resume sobre los datos actualmente filtrados/paginados)
  function renderSummary() {
    const sum = computeSummary(filtered);
    const scont = document.getElementById('history-summary');
    if (!scont) return;
    scont.innerHTML = `
      <div class="dashboard-cards">
        <div class="card"><strong>Total citas:</strong> ${totalRows}</div>
        <div class="card"><strong>Usuarios activos:</strong> ${sum.uniqueUsers}</div>
        <div class="card"><strong>Tipo de referencia o modelo de IA más usado:</strong> ${sum.mostUsedTypeOrModel}</div>
        <div class="card"><strong>Programa más activo:</strong> ${sum.topProgram}</div>
      </div>
    `;
  }

  // tabla y paginación renderizada desde el arreglo `filtered` (sólo página actual)
  function renderTablePage() {
    const containerTbl = document.getElementById('history-table-container');
    if (!containerTbl) return;
    const pageItems = filtered;
    if (pageItems.length === 0) {
      containerTbl.innerHTML = '<p>No hay registros.</p>';
      return;
    }
    let html = '<table class="admin-table"><thead><tr><th class="history-date-col">Fecha</th><th>Usuario</th><th>Programa</th><th>Tipo</th><th>Modelo</th><th>Detalle</th></tr></thead><tbody>';
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
      const prog = getProgramName(c);

      const rawType = (c.source_type || '').toLowerCase();

      const typeMap = {
        ia: 'IA',
        book: 'Libro',
        article: 'Artículo',
        web: 'Web'
      };
      const tipo = typeMap[rawType] || rawType || 'Desconocido';

      let m = getNonIAModelIcon(rawType);
      if (rawType === 'ia') {
        m = c.models?.name || c.model_name_custom || 'Desconocido';
      }

      const modelColor = rawType === 'ia'
        ? getModelColor(m)
        : '#000000';

      html += `<tr>
        <td class="history-date-cell text-center">${date}</td>
        <td>${user}</td>
        <td>${prog}</td>
        <td class="text-center">${tipo}</td>
        <td class="text-center">
          <span style="color: ${modelColor}; font-weight: 600;">
            ${m}
          </span>
        </td>
        <td class="text-center">
          <button class="view-citation" data-id="${c.id}">Ver</button>
        </td>
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
    const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
    pag.innerHTML = `
      <button id="prev-page" ${currentPage===1?'disabled':''}>Anterior</button>
      <span>Página ${currentPage} de ${totalPages}</span>
      <button id="next-page" ${currentPage===totalPages?'disabled':''}>Siguiente</button>
    `;
    document.getElementById('prev-page')?.addEventListener('click', () => {
      if (currentPage>1) {
        currentPage--;
        loadPage();
      }
    });
    document.getElementById('next-page')?.addEventListener('click', () => {
      if (currentPage<totalPages) {
        currentPage++;
        loadPage();
      }
    });
  }

  // modal helper
  function showCitationModal(c) {
    const modal = document.createElement('div');
    modal.className = 'history-modal-overlay';
    const programDisplay = getProgramName(c);
    // reutilizar el render del historial individual para el detalle
    const detailHtml = renderCitationDetail(c);
    modal.innerHTML = `
      <div class="history-modal">
        <button class="close-modal">×</button>
        <h3>Detalle de cita</h3>
        <p><strong>Usuario:</strong> ${c.profiles?.full_name||c.profiles?.email||''}</p>
        <p><strong>Programa:</strong> ${programDisplay}</p>
        <div class="history-detail">${detailHtml}</div>
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
