import { saveCitation } from '../../../js/citations.js';

export function initWeb(container) {
  if (!container) return;

  container.innerHTML = `
    <form id="webForm" class="form" novalidate>
      <fieldset>
        <legend>Información del sitio web</legend>

        <div class="form-row">
          <label for="authorType">Tipo de autor</label>
          <select id="authorType" name="authorType">
            <option value="person">Persona</option>
            <option value="organization">Organización</option>
            <option value="none">Sin autor</option>
          </select>
        </div>

        <div id="personAuthorFields" style="display:block;">
          <div class="form-row">
            <label>Autor(es) <span class="required">*</span></label>
            <div id="authorsContainer" aria-live="polite"></div>
            <button type="button" id="addAuthorBtn" class="btn-secondary" style="margin-top: 0.5rem;">Agregar autor</button>
          </div>

          <div class="form-row">
            <label>Vista previa autor</label>
            <div id="authorPreview" aria-live="polite" style="font-style:italic; color: #555;">-</div>
          </div>
        </div>

        <div id="organizationField" class="form-row" style="display:none;">
          <label for="organization">Autor organización <span class="required">*</span></label>
          <input type="text" id="organization" name="organization" placeholder="Ej. Organización Mundial de la Salud">
        </div>

        <div class="form-row">
          <label for="anio">Año</label>
          <input type="number" id="anio" name="anio" placeholder="Ej. 2024" min="1000" max="9999">
        </div>

        <div class="form-row">
          <label for="mes">Mes</label>
          <input type="text" id="mes" name="mes" placeholder="Ej. mayo">
        </div>

        <div class="form-row">
          <label for="dia">Día</label>
          <input type="number" id="dia" name="dia" placeholder="Ej. 15" min="1" max="31">
        </div>

        <div class="form-row">
          <label><input type="checkbox" id="hasRecoveryDate"> Fecha de recuperación</label>
        </div>

        <div id="recoveryFields" style="display:none;">
          <div class="form-row">
            <label for="recoveryDay">Día recuperación</label>
            <input type="number" id="recoveryDay" name="recoveryDay" placeholder="Ej. 15" min="1" max="31">
          </div>

          <div class="form-row">
            <label for="recoveryMonth">Mes recuperación</label>
            <input type="text" id="recoveryMonth" name="recoveryMonth" placeholder="Ej. mayo">
          </div>

          <div class="form-row">
            <label for="recoveryYear">Año recuperación</label>
            <input type="number" id="recoveryYear" name="recoveryYear" placeholder="Ej. 2024" min="1000" max="9999">
          </div>
        </div>

        <div class="form-row">
          <label for="titulo">Título <span class="required">*</span></label>
          <input type="text" id="titulo" name="titulo" required placeholder="Ej. Impacto global del cambio climático">
        </div>

        <div class="form-row">
          <label for="sitio">Nombre del sitio</label>
          <input type="text" id="sitio" name="sitio" placeholder="Ej. BBC News">
        </div>

        <div class="form-row">
          <label for="url">URL <span class="required">*</span></label>
          <input type="url" id="url" name="url" required placeholder="https://">
        </div>
      </fieldset>

      <div id="formError" class="form-error" aria-live="polite" style="color:var(--error);margin-bottom:1rem;"></div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Generar referencia</button>
      </div>
    </form>
  `;

  const form = container.querySelector('#webForm');
  const formError = container.querySelector('#formError');
  const referenceEl = document.getElementById('reference');
  const authorTypeSelect = container.querySelector('#authorType');
  const personAuthorFields = container.querySelector('#personAuthorFields');
  const organizationField = container.querySelector('#organizationField');
  const authorsContainer = container.querySelector('#authorsContainer');
  const addAuthorBtn = container.querySelector('#addAuthorBtn');
  const authorPreview = container.querySelector('#authorPreview');
  const hasRecoveryDate = container.querySelector('#hasRecoveryDate');
  const recoveryFields = container.querySelector('#recoveryFields');

  let authorIndex = 0;

  function extractApellidoAPA(apellido) {
    const apellidoTrim = String(apellido || '').trim();
    if (!apellidoTrim) return '';

    const cleaned = apellidoTrim.toLowerCase().replace(/\s+/g, ' ');
    const parts = apellidoTrim.split(/\s+/).filter(Boolean);

    const compuestos = ['de la', 'de los', 'de las', 'van der'];
    for (const comp of compuestos) {
      if (cleaned.startsWith(comp + ' ')) {
        const compParts = comp.split(' ').length + 1;
        if (parts.length >= compParts) {
          return parts.slice(0, compParts).join(' ');
        }
      }
      if (cleaned === comp) {
        return parts.join(' ');
      }
    }

    const simples = ['de', 'del', 'van', 'von', 'da', 'dos', 'das'];
    if (parts.length > 1 && simples.includes(parts[0].toLowerCase())) {
      return parts.slice(0, 2).join(' ');
    }

    return parts[0];
  }

  function capitalizeWord(word) {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }

  function formatIniciales(nombre) {
    return String(nombre || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => (capitalizeWord(n)[0] || '').toUpperCase() + '.')
      .join(' ');
  }

  function capitalizeApellido(apellido) {
    const lowerConnectors = ['de', 'del', 'la', 'las', 'los', 'van', 'von', 'der', 'da', 'dos', 'das'];

    return String(apellido || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word, index) => {
        const lower = word.toLowerCase();
        if (lowerConnectors.includes(lower) && index !== 0) {
          return lower;
        }
        return capitalizeWord(word);
      })
      .join(' ');
  }

  function formatAuthorAPA(nombre, apellido) {
    const nombreTrim = String(nombre || '').trim();
    const apellidoTrim = String(apellido || '').trim();

    if (!nombreTrim || !apellidoTrim) return '';

    const iniciales = formatIniciales(nombreTrim);
    if (!iniciales) return '';

    const apellidoAPA = extractApellidoAPA(apellidoTrim);
    if (!apellidoAPA) return '';

    const apellidoCapitalizado = capitalizeApellido(apellidoAPA);

    return `${apellidoCapitalizado}, ${iniciales}`;
  }

  function formatMultipleAuthorsAPA(autores) {
    if (!Array.isArray(autores) || autores.length === 0) return '';

    const autoresFormateados = autores
      .map((autor) => formatAuthorAPA(autor.nombre, autor.apellido))
      .filter(Boolean);

    if (autoresFormateados.length === 0) return '';
    if (autoresFormateados.length === 1) return autoresFormateados[0];
    if (autoresFormateados.length === 2) return `${autoresFormateados[0]} & ${autoresFormateados[1]}`;

    const ultimo = autoresFormateados.pop();
    return `${autoresFormateados.join(', ')}, & ${ultimo}`;
  }

  function formatInTextCitation(autores, anio, organization, authorType) {
    if (authorType === 'person') {
      if (!Array.isArray(autores) || autores.length === 0) return '';
      const apellidos = autores
        .map((autor) => {
          const apellidoExtraido = extractApellidoAPA(autor.apellido);
          return capitalizeApellido(apellidoExtraido);
        })
        .filter(Boolean);
      if (apellidos.length === 0) return '';

      const anioTexto = String(anio || '').trim();
      if (!anioTexto) return '';

      if (apellidos.length === 1) {
        return `${apellidos[0]}, ${anioTexto}`;
      }
      if (apellidos.length === 2) {
        return `${apellidos[0]} y ${apellidos[1]}, ${anioTexto}`;
      }
      return `${apellidos[0]} et al., ${anioTexto}`;
    }

    if (authorType === 'organization') {
      const org = String(organization || '').trim();
      const anioTexto = String(anio || '').trim();
      if (!org || !anioTexto) return '';
      return `${org}, ${anioTexto}`;
    }

    // Sin autor
    const titulo = String(container.querySelector('#titulo')?.value || '').trim();
    const anioTexto = String(anio || '').trim();
    if (!titulo || !anioTexto) return '';
    return `${titulo}, ${anioTexto}`;
  }

  function createAuthorField(index) {
    const authorGroup = document.createElement('div');
    authorGroup.className = 'author-group';
    authorGroup.dataset.index = index;

    authorGroup.innerHTML = `
      <div class="form-row" style="display:flex;gap:0.5rem;align-items:flex-end;">
        <div style="flex:1;">
          <label for="author-name-${index}">Nombre <span class="required">*</span></label>
          <input type="text" id="author-name-${index}" name="author-name-${index}" class="author-name" required placeholder="Ej. Juan Luis">
        </div>
        <div style="flex:1;">
          <label for="author-last-${index}">Apellido <span class="required">*</span></label>
          <input type="text" id="author-last-${index}" name="author-last-${index}" class="author-last" required placeholder="Ej. Hidalgo">
        </div>
        ${index > 0 ? '<button type="button" class="remove-author-btn" aria-label="Eliminar autor" style="align-self:flex-end;">Eliminar autor</button>' : ''}
      </div>
    `;

    return authorGroup;
  }

  function getAuthorsData() {
    const groups = Array.from(authorsContainer.querySelectorAll('.author-group'));
    const autores = [];

    for (const group of groups) {
      const nombreEl = group.querySelector('.author-name');
      const apellidoEl = group.querySelector('.author-last');
      const nombre = nombreEl ? String(nombreEl.value || '').trim() : '';
      const apellido = apellidoEl ? String(apellidoEl.value || '').trim() : '';

      if (!nombre || !apellido) {
        return null;
      }

      autores.push({ nombre, apellido });
    }

    return autores;
  }

  function updateAuthorPreview() {
    if (!authorPreview) return;
    const autores = getAuthorsData();
    if (!autores || autores.length === 0) {
      authorPreview.textContent = '-';
      return;
    }

    const first = autores[0];
    const formatted = formatAuthorAPA(first.nombre, first.apellido);
    authorPreview.textContent = formatted || '-';
  }

  function formatWebTitle(title) {
    const raw = String(title || '').trim();
    if (!raw) return '';

    const lower = raw.toLowerCase();
    const words = lower.split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';

    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    return words.join(' ');
  }

  function formatDate({ anio, dia, mes }) {
    const year = String(anio || '').trim();
    const month = String(mes || '').trim();
    const day = String(dia || '').trim();

    if (!year) {
      return '(s. f.)';
    }

    if (day && month) {
      return `(${year}, ${day} de ${month})`;
    }

    return `(${year})`;
  }

  function formatRecoveryDate(day, month, year, url) {
    const d = String(day || '').trim();
    const m = String(month || '').trim();
    const y = String(year || '').trim();
    const u = String(url || '').trim().replace(/[\.]+$/, '');

    if (!d || !m || !y || !u) return '';
    return `Recuperado el ${d} de ${m} de ${y} de ${u}`;
  }

  function cleanUrl(url) {
    return String(url || '').trim().replace(/[\.]+$/, '');
  }

  function buildWebAPA(data) {
    const authorType = data.author_type;
    const titulo = formatWebTitle(data.titulo);
    if (!titulo) return '';

    const dateText = formatDate({ anio: data.anio, dia: data.dia, mes: data.mes });

    const urlSanitized = cleanUrl(data.url);
    if (!urlSanitized) return '';

    const fragments = [];

    if (authorType === 'person') {
      const autores = data.autores;
      const authorText = formatMultipleAuthorsAPA(autores);
      if (!authorText) return '';
      fragments.push(`${authorText} ${dateText}.`);
      fragments.push(`<em>${titulo}</em>.`);
    } else if (authorType === 'organization') {
      const org = String(data.organization || '').trim();
      if (!org) return '';
      fragments.push(`${org} ${dateText}.`);
      fragments.push(`<em>${titulo}</em>.`);
    } else {
      fragments.push(`<em>${titulo}</em>.`);
      fragments.push(`${dateText}.`);
    }

    const sitio = String(data.sitio || '').trim();
    const orgText = String(data.organization || '').trim();
    if (sitio) {
      const hideSite = authorType === 'organization' && orgText && sitio.toLowerCase() === orgText.toLowerCase();
      if (!hideSite) {
        fragments.push(`<em>${sitio}</em>.`);
      }
    }

    if (data.has_recovery_date) {
      const recoveryText = formatRecoveryDate(data.recovery_day, data.recovery_month, data.recovery_year, urlSanitized);
      if (!recoveryText) return '';
      fragments.push(recoveryText);
    } else {
      fragments.push(urlSanitized);
    }

    const result = fragments.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    return result;
  }

  function updateAuthorTypeFields() {
    const type = authorTypeSelect.value;

    if (type === 'person') {
      personAuthorFields.style.display = 'block';
      organizationField.style.display = 'none';
      authorsContainer.querySelectorAll('.author-name, .author-last').forEach((el) => (el.required = true));
      container.querySelector('#organization').required = false;
    } else if (type === 'organization') {
      personAuthorFields.style.display = 'none';
      organizationField.style.display = 'block';
      authorsContainer.querySelectorAll('.author-name, .author-last').forEach((el) => (el.required = false));
      container.querySelector('#organization').required = true;
    } else {
      personAuthorFields.style.display = 'none';
      organizationField.style.display = 'none';
      authorsContainer.querySelectorAll('.author-name, .author-last').forEach((el) => (el.required = false));
      container.querySelector('#organization').required = false;
    }

    if (formError) formError.textContent = '';
  }

  authorTypeSelect.addEventListener('change', updateAuthorTypeFields);

  hasRecoveryDate.addEventListener('change', function () {
    recoveryFields.style.display = this.checked ? 'block' : 'none';
  });

  authorsContainer.addEventListener('input', function (event) {
    if (event.target.matches('.author-name') || event.target.matches('.author-last')) {
      updateAuthorPreview();
    }
  });

  addAuthorBtn.addEventListener('click', function () {
    authorIndex += 1;
    authorsContainer.appendChild(createAuthorField(authorIndex));
    updateAuthorPreview();
  });

  authorsContainer.addEventListener('click', function (event) {
    if (event.target.matches('.remove-author-btn')) {
      const group = event.target.closest('.author-group');
      if (group) {
        group.remove();
        updateAuthorPreview();
      }
    }
  });

  authorIndex = 0;
  authorsContainer.appendChild(createAuthorField(authorIndex));
  updateAuthorPreview();
  updateAuthorTypeFields();

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (formError) formError.textContent = '';

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const authorType = authorTypeSelect.value;
    const autores = getAuthorsData();
    const organization = String(container.querySelector('#organization').value || '').trim();
    const anio = String(container.querySelector('#anio').value || '').trim();
    const mes = String(container.querySelector('#mes').value || '').trim();
    const dia = String(container.querySelector('#dia').value || '').trim();
    const hasRecovery = Boolean(hasRecoveryDate.checked);
    const recoveryDay = String(container.querySelector('#recoveryDay').value || '').trim();
    const recoveryMonth = String(container.querySelector('#recoveryMonth').value || '').trim();
    const recoveryYear = String(container.querySelector('#recoveryYear').value || '').trim();
    const titulo = String(container.querySelector('#titulo').value || '').trim();
    const sitio = String(container.querySelector('#sitio').value || '').trim();
    const url = String(container.querySelector('#url').value || '').trim();

    if (authorType === 'person' && (!autores || autores.length === 0)) {
      if (formError) formError.textContent = 'Debe ingresar al menos un autor persona.';
      return;
    }

    if (authorType === 'organization' && !organization) {
      if (formError) formError.textContent = 'Debe ingresar el nombre de la organización.';
      return;
    }

    if (authorType === 'person' && (!autores || autores.length === 0 || !titulo || !url)) {
      if (formError) formError.textContent = 'Los campos obligatorios deben completarse.';
      return;
    }

    if (!titulo || !url) {
      if (formError) formError.textContent = 'Título y URL son obligatorios.';
      return;
    }

    if (hasRecovery && (!recoveryDay || !recoveryMonth || !recoveryYear)) {
      if (formError) formError.textContent = 'Completa todos los campos de fecha de recuperación.';
      return;
    }

    const apa = buildWebAPA({
      author_type: authorType,
      autores: autores || [],
      organization,
      anio,
      mes,
      dia,
      has_recovery_date: hasRecovery,
      recovery_day: recoveryDay,
      recovery_month: recoveryMonth,
      recovery_year: recoveryYear,
      titulo,
      sitio,
      url
    });

    if (!apa) {
      if (formError) formError.textContent = 'No se pudo generar la referencia. Verifique los datos ingresados.';
      return;
    }

    if (referenceEl) {
      referenceEl.innerHTML = '';
      referenceEl.innerHTML = apa;
      referenceEl.focus();
    }

    const inTextCitation = formatInTextCitation(autores || [], anio, organization, authorType);

    const citationData = {
      source_type: 'web',
      citation_text: apa,
      metadata: {
        author_type: authorType,
        autores: autores || [],
        organization: organization || null,
        titulo: titulo || null,
        sitio: sitio || null,
        url: url || null,
        anio: anio || null,
        mes: mes || null,
        dia: dia || null,
        has_recovery_date: hasRecovery,
        recovery_day: recoveryDay || null,
        recovery_month: recoveryMonth || null,
        recovery_year: recoveryYear || null,
        in_text_citation: inTextCitation || null
      },
      consulta_fecha: new Date().toISOString().split('T')[0]
    };

    try {
      const { error } = await saveCitation(citationData);
      if (error) {
        console.error('Error guardando cita web:', error);
      }
    } catch (err) {
      console.error('Error inesperado:', err);
    }
  });
}
