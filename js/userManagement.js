// userManagement.js
// Lógica y UI para la gestión de usuarios en el dashboard administrativo.

import { supabase } from './supabaseClient.js';

// cache global
let allUsers = [];

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
  program_id,
  programs(id, nombre, nivel, division)
`);
  console.debug('[userManagement] loadUsers profiles', profiles, 'error', pErr);
  if (pErr) throw pErr;

  // ya no necesitamos mapear correos desde auth.users, profiles los contiene

  const { data: citations, error: cErr } = await supabase
    .from('citations')
    .select('user_id, model_id');
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
    const mcount = {};
    userCits.forEach(c => {
      const name = modelMap[c.model_id] || '';
      if (name) {
        mcount[name] = (mcount[name] || 0) + 1;
      }
    });
    let topModel = '';
    let max = 0;
    Object.entries(mcount).forEach(([mn, cnt]) => {
      if (cnt > max) {
        max = cnt;
        topModel = mn;
      }
    });
    return {
      ...u,
      citationCount,
      topModel: topModel || '—'
    };
  });
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
      <td>${u.programs?.nombre || ''}</td>
      <td>${u.email || ''}</td>
      <td>
        <select class="roleSelect">
          <option value="user"${u.role==='user'?' selected':''}>Usuario</option>
          <option value="admin"${u.role==='admin'?' selected':''}>Admin</option>
        </select>
      </td>
      <td>${u.citationCount}</td>
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

export function filterUsers() {
  const searchVal = document.getElementById('userSearch').value.toLowerCase();
  const roleVal = document.getElementById('roleFilter').value;
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
  renderUsersTable(filtered);
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
    renderUsersTable(allUsers);
    const searchInput = document.getElementById('userSearch');
    const roleInput = document.getElementById('roleFilter');
    [searchInput, roleInput].forEach(el => {
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
