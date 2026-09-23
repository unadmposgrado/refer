// userManagement.js
// Lógica y UI para la gestión de usuarios en el dashboard administrativo.

import { supabase } from './supabaseClient.js';

// cache global
let allUsers = [];
let filteredUsers = [];
let currentUserPage = 1;
const USER_PAGE_SIZE = 10;

export async function loadUsers() {
  // obtenemos campos directamente de profiles (incluye ahora email de forma nativa)
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    // include programa educativo para el nuevo campo, manteniendo los demás
    .select(`
  id,
  full_name,
  email,
  role,
  created_at,
  program_id,
  tipo_usuario,
  division,
  programs(id, nombre, nivel, division)
`);
  console.debug('[userManagement] loadUsers profiles', profiles, 'error', pErr);
  if (pErr) throw pErr;

  // ya no necesitamos mapear correos desde auth.users, profiles los contiene

  const { data: citations, error: cErr } = await supabase
    .from('citations')
    .select('user_id, model_id, source_type, model_name_custom, created_at');
  if (cErr) throw cErr;

  const { data: models, error: mErr } = await supabase
    .from('models')
    .select('id, name');
  if (mErr) throw mErr;

  const modelMap = {};
  (models || []).forEach(m => {
    modelMap[m.id] = m.name;
  });

  return (profiles || []).map(u => {
    const userCits = (citations || []).filter(c => c.user_id === u.id);
    const citationCount = userCits.length;
    const lastUsedAt = userCits.reduce((latest, citation) => {
      if (!citation.created_at) return latest;
      if (!latest || new Date(citation.created_at) > new Date(latest)) {
        return citation.created_at;
      }
      return latest;
    }, null);
    // contar modelos IA por nombre y tipos de fuente por usuario
    const mcount = {}; // conteo por nombre de modelo IA
    const typeCount = {}; // conteo por source_type (libro, article, web, thesis, etc.)
    userCits.forEach(c => {
      const rawType = (c.source_type || '').toLowerCase();
      if (rawType === 'ia') {
        const name = modelMap[c.model_id] || c.model_name_custom || '';
        if (name) {
          mcount[name] = (mcount[name] || 0) + 1;
        }
      } else {
        const key = rawType || 'otro';
        typeCount[key] = (typeCount[key] || 0) + 1;
      }
    });

    // si hay modelos IA, preservamos el comportamiento actual: mostrar nombre del modelo más usado
    let topModel = '';
    let max = 0;
    Object.entries(mcount).forEach(([mn, cnt]) => {
      if (cnt > max) {
        max = cnt;
        topModel = mn;
      }
    });

    // si no hay modelos IA, pero sí hay tipos de referencia, mostrar el tipo más usado (legible)
    if (!topModel && Object.keys(typeCount).length > 0) {
      const typeMapLabel = {
        book: 'Libro',
        article: 'Artículo',
        web: 'Página web',
        thesis: 'Tesis',
        ia: 'IA'
      };
      let topType = '';
      let topTypeCount = 0;
      Object.entries(typeCount).forEach(([t, cnt]) => {
        if (cnt > topTypeCount) {
          topTypeCount = cnt;
          topType = t;
        }
      });
      topModel = typeMapLabel[topType] || (topType ? (topType.charAt(0).toUpperCase() + topType.slice(1)) : '');
    }
    return {
      ...u,
      citationCount,
      lastUsedAt,
      topModel: topModel || '—'
    };
  });
}

function formatUserDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const dateLabel = date.toLocaleDateString('es-ES');
  const timeLabel = date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return `${dateLabel}<br>${timeLabel} hrs.`;
}

function getProgramFilterValue(usuario) {
  return getProgramEducativo(usuario) || 'Sin programa';
}

// Función auxiliar para determinar el nombre del programa educativo
// Incluye la excepción para académicos de universidad con división CAI
function getProgramEducativo(usuario) {
  const programaInstitucional = usuario.programs?.nombre || null;
  
  // Excepción: académico de universidad con división CAI
  if (
    usuario.tipo_usuario === 'academico_universidad' &&
    usuario.division === 'Coordinación Académica y de Investigación (CAI)'
  ) {
    return 'Coordinación Académica y de Investigación';
  }
  
  // Fallback al programa institucional o vacío
  return programaInstitucional || '';
}

export function calculateUserMetrics(users) {
  const total = users.length;
  const normal = users.filter(u => u.role === 'user').length;
  const admins = users.filter(u => u.role === 'admin').length;
  const metricsDiv = document.getElementById('userMetrics');
  if (metricsDiv) {
    metricsDiv.innerHTML = `
      <div class="dashboard-cards">
        <div class="card"><strong>Usuarios totales:</strong> ${total}</div>
        <div class="card"><strong>Usuarios:</strong> ${normal}</div>
        <div class="card"><strong>Administradores:</strong> ${admins}</div>
      </div>
    `;
  }
}

export function renderUsersTable(users) {
  const tbody = document.querySelector('#usersTable tbody');
  const messageP = document.getElementById('userTableMessage');
  console.debug('[userManagement] renderUsersTable called with', users);
  if (!tbody) {
    console.warn('[userManagement] tbody not found');
    return;
  }
  if (users.length === 0) {
    tbody.innerHTML = '';
    if (messageP) {
      messageP.style.display = 'block';
      messageP.textContent = 'No hay usuarios que mostrar.';
    }
    return;
  }
  if (messageP) messageP.style.display = 'none';
  tbody.innerHTML = users.map(u => `
    <tr data-user-id="${u.id}">
      <td>${u.full_name || ''}</td>
      <td>${getProgramEducativo(u)}</td>
      <td>${u.email || ''}</td>
      <td>
        <select class="roleSelect">
          <option value="user"${u.role==='user'?' selected':''}>Usuario</option>
          <option value="admin"${u.role==='admin'?' selected':''}>Admin</option>
        </select>
      </td>
      <td>${u.citationCount}</td>
      <td>${formatUserDate(u.lastUsedAt)}</td>
      <td>${formatUserDate(u.created_at)}</td>
      <td>${u.topModel}</td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.roleSelect').forEach(select => {
    select.addEventListener('change', async () => {
      const tr = select.closest('tr');
      const userId = tr.dataset.userId;
      const newRole = select.value;
      await updateUserRole(userId, newRole);
    });
  });
}

export function filterUsers(resetPage = true) {
  const searchVal = document.getElementById('userSearch').value.toLowerCase();
  const roleVal = document.getElementById('roleFilter').value;
  const programVal = document.getElementById('programFilter').value;
  const sortVal = document.getElementById('sortFilter').value;
  let filtered = allUsers;
  if (searchVal) {
    filtered = filtered.filter(u => {
      return (u.full_name || '').toLowerCase().includes(searchVal) ||
             (u.email || '').toLowerCase().includes(searchVal);
    });
  }
  if (roleVal && roleVal !== 'all') {
    filtered = filtered.filter(u => u.role === roleVal);
  }
  if (programVal && programVal !== 'all') {
    filtered = filtered.filter(u => getProgramFilterValue(u) === programVal);
  }

  filteredUsers = [...filtered].sort((first, second) => {
    if (sortVal === 'citations-desc' || sortVal === 'citations-asc') {
      const difference = first.citationCount - second.citationCount;
      return sortVal === 'citations-desc' ? -difference : difference;
    }

    if (sortVal === 'last-used-desc' || sortVal === 'last-used-asc') {
      const firstDate = first.lastUsedAt ? new Date(first.lastUsedAt).getTime() : 0;
      const secondDate = second.lastUsedAt ? new Date(second.lastUsedAt).getTime() : 0;
      const difference = firstDate - secondDate;
      return sortVal === 'last-used-desc' ? -difference : difference;
    }

    if (sortVal === 'registered-desc' || sortVal === 'registered-asc') {
      const firstDate = first.created_at ? new Date(first.created_at).getTime() : 0;
      const secondDate = second.created_at ? new Date(second.created_at).getTime() : 0;
      const difference = firstDate - secondDate;
      return sortVal === 'registered-desc' ? -difference : difference;
    }

    return (first.full_name || '').localeCompare(second.full_name || '', 'es', { sensitivity: 'base' });
  });

  if (resetPage) currentUserPage = 1;
  renderCurrentUserPage();
}

function renderCurrentUserPage() {
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USER_PAGE_SIZE));
  currentUserPage = Math.min(currentUserPage, totalPages);
  const start = (currentUserPage - 1) * USER_PAGE_SIZE;
  renderUsersTable(filteredUsers.slice(start, start + USER_PAGE_SIZE));
  renderUserPagination(totalPages);
}

function renderUserPagination(totalPages) {
  const pagination = document.getElementById('user-pagination');
  if (!pagination) return;

  pagination.innerHTML = `
    <button id="user-prev-page" ${currentUserPage === 1 ? 'disabled' : ''}>Anterior</button>
    <span>Página ${currentUserPage} de ${totalPages}</span>
    <button id="user-next-page" ${currentUserPage === totalPages ? 'disabled' : ''}>Siguiente</button>
  `;

  document.getElementById('user-prev-page')?.addEventListener('click', () => {
    if (currentUserPage > 1) {
      currentUserPage--;
      filterUsers(false);
    }
  });
  document.getElementById('user-next-page')?.addEventListener('click', () => {
    if (currentUserPage < totalPages) {
      currentUserPage++;
      filterUsers(false);
    }
  });
}

function populateProgramFilter() {
  const programFilter = document.getElementById('programFilter');
  if (!programFilter) return;

  const programs = [...new Set(allUsers.map(getProgramFilterValue))]
    .sort((first, second) => first.localeCompare(second, 'es', { sensitivity: 'base' }));
  programFilter.innerHTML = '<option value="all">Todos los programas</option>';
  programs.forEach(program => {
    const option = document.createElement('option');
    option.value = program;
    option.textContent = program;
    programFilter.appendChild(option);
  });
}

export async function updateUserRole(userId, newRole) {
  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId);
  if (error) {
    console.error('Error updating role', error);
    alert('Error al actualizar el rol');
    return;
  }
  alert('Rol actualizado');
  const user = allUsers.find(u => u.id === userId);
  if (user) user.role = newRole;
  calculateUserMetrics(allUsers);
  filterUsers();
}

export async function initializeUserSection() {
  const section = document.getElementById('userManagement');
  if (section) section.style.display = 'block';
  const loading = document.createElement('p');
  loading.id = 'userLoading';
  loading.textContent = 'Cargando usuarios...';
  section && section.appendChild(loading);
  try {
    allUsers = await loadUsers();
    console.debug('[userManagement] allUsers after load', allUsers);
    calculateUserMetrics(allUsers);
    populateProgramFilter();
    filterUsers();
    const searchInput = document.getElementById('userSearch');
    const roleInput = document.getElementById('roleFilter');
    const programInput = document.getElementById('programFilter');
    const sortInput = document.getElementById('sortFilter');
    [searchInput, roleInput, programInput, sortInput].forEach(el => {
      if (el) {
        el.addEventListener('input', filterUsers);
        el.addEventListener('change', filterUsers);
      }
    });
  } catch (e) {
    console.error('Error cargando usuarios', e);
  } finally {
    const l = document.getElementById('userLoading');
    if (l) l.remove();
  }
}
