// metrics.js
// Sección de métricas administrativa (dashboard de administrador accesible
// desde historial.html -> pestaña Metrics). Incluye panel de gestión de usuarios.

import { initializeUserSection } from './userManagement.js';

export async function renderMetrics() {
  const container = document.getElementById('metrics-section');
  if (!container) return;

  container.innerHTML = `
    <h2>Métricas del sistema</h2>

    <!-- sección movedora de gestión de usuarios -->
    <div id="userManagement" style="display:none;">
      <h3>Gestión de usuarios</h3>

      <div id="userMetrics"></div>

      <div class="filters">
        <input type="text" id="userSearch" placeholder="Buscar por nombre o email">
        <select id="roleFilter">
          <option value="all">Todos</option>
          <option value="user">Usuarios</option>
          <option value="admin">Administradores</option>
        </select>
      </div>

      <div class="table-responsive">
        <table id="usersTable" class="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Citas</th>
              <th>Modelo más usado</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
      <p id="userTableMessage" style="display:none;"></p>
    </div>
  `;

  // luego inicializamos la sección de usuarios (datos, eventos, etc.)
  await initializeUserSection();
}
