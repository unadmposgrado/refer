// metrics.js
// Sección de métricas administrativa (dashboard de administrador accesible
// desde historial.html -> pestaña Metrics). Incluye panel de gestión de usuarios.

import { initializeUserSection } from './userManagement.js';
import { renderAdminDashboard } from './adminDashboard.js';

export async function renderMetrics() {
  const container = document.getElementById('metrics-section');
  if (!container) return;

  container.innerHTML = `
    <h2>Métricas del sistema</h2>

    <!-- módulo de gestión de usuarios -->
    <div class="admin-module">
      <div class="admin-module-header">
        <h3>Gestión de usuarios</h3>
      </div>
      <div class="admin-module-body">
        <div id="userManagement" style="display:none;">
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
                  <th>Programa educativo</th>
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
      </div>
    </div>

    <!-- módulo historial global de uso de IA -->
    <div class="admin-module">
      <div class="admin-module-header">
        <h2>Historial global de uso de IA</h2>
      </div>
      <div class="admin-module-body">
        <section id="global-history-module">
          <div id="history-filters"></div>
          <div id="history-summary"></div>
          <div id="history-table-container"></div>
          <div id="history-pagination"></div>
        </section>
      </div>
    </div>
  `;

  // luego inicializamos la sección de usuarios (datos, eventos, etc.)
  await initializeUserSection();
  // ahora agregamos el módulo global de historial llamando a la lógica de administrador
  renderAdminDashboard();
}
