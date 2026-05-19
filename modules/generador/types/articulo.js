import { saveCitation } from '../../../js/citations.js';

export function initArticulo(container) {
  if (!container) return;

  container.innerHTML = `
    <form id="articleForm" class="form" novalidate>
      <fieldset>
        <legend>Información del artículo</legend>

        <div class="form-row">
          <label for="articleType">Tipo de artículo</label>
          <select id="articleType" name="articleType">
            <option value="journal">Revista académica</option>
            <option value="web">Artículo web</option>
            <option value="newspaper">Periódico</option>
          </select>
        </div>

        <div class="form-row">
          <label>Autor(es) <span class="required">*</span></label>
          <div id="authorsContainer" aria-live="polite"></div>
          <button type="button" id="addAuthorBtn" class="btn-secondary" style="margin-top: 0.5rem;">Agregar autor</button>
        </div>

        <div class="form-row">
          <label>Vista previa autor</label>
          <div id="authorPreview" aria-live="polite" style="font-style:italic; color: #555;">-</div>
        </div>

        <div class="form-row">
          <label for="anio">Año <span class="required">*</span></label>
          <input type="number" id="anio" name="anio" required placeholder="Ej. 2018" min="1000" max="9999">
        </div>

        <div class="form-row">
          <label for="titulo">Título del artículo <span class="required">*</span></label>
          <input type="text" id="titulo" name="titulo" required placeholder="Ej. Impacto de la inteligencia artificial">
        </div>

        <div id="journalFields" style="display:none;">
          <div class="form-row">
            <label for="revista">Nombre de la revista <span class="required">*</span></label>
            <input type="text" id="revista" name="revista" placeholder="Ej. Journal of Science">
          </div>
          <div class="form-row">
            <label for="volumen">Volumen</label>
            <input type="text" id="volumen" name="volumen" placeholder="Ej. 15">
          </div>
          <div class="form-row">
            <label for="numero">Número</label>
            <input type="text" id="numero" name="numero" placeholder="Ej. 2">
          </div>
          <div class="form-row">
            <label for="paginas">Páginas</label>
            <input type="text" id="paginas" name="paginas" placeholder="Ej. 123-145">
          </div>
          <div class="form-row">
            <label for="doi_url">DOI o URL</label>
            <input type="text" id="doi_url" name="doi_url" placeholder="Ej. https://doi.org/xxx">
          </div>
        </div>

        <div id="webFields" style="display:none;">
          <div class="form-row">
            <label for="sitio">Nombre del sitio web <span class="required">*</span></label>
            <input type="text" id="sitio" name="sitio" placeholder="Ej. El País">
          </div>
          <div class="form-row">
            <label for="dia">Día</label>
            <input type="number" id="dia" name="dia" min="1" max="31" placeholder="Ej. 25">
          </div>
          <div class="form-row">
            <label for="mes">Mes</label>
            <input type="text" id="mes" name="mes" placeholder="Ej. marzo">
          </div>
          <div class="form-row">
            <label for="url">URL <span class="required">*</span></label>
            <input type="url" id="url" name="url" placeholder="Ej. https://example.com" required>
          </div>
        </div>

        <div id="newspaperFields" style="display:none;">
          <div class="form-row">
            <label for="periodico">Nombre del periódico <span class="required">*</span></label>
            <input type="text" id="periodico" name="periodico" placeholder="Ej. El Mundo">
          </div>
          <div class="form-row">
            <label for="dia_periodico">Día <span class="required">*</span></label>
            <input type="number" id="dia_periodico" name="dia_periodico" min="1" max="31" placeholder="Ej. 25">
          </div>
          <div class="form-row">
            <label for="mes_periodico">Mes <span class="required">*</span></label>
            <input type="text" id="mes_periodico" name="mes_periodico" placeholder="Ej. marzo">
          </div>
          <div class="form-row">
            <label for="paginas_periodico">Páginas</label>
            <input type="text" id="paginas_periodico" name="paginas_periodico" placeholder="Ej. A1, A4">
          </div>
        </div>
      </fieldset>

      <div id="formError" class="form-error" aria-live="polite" style="color:var(--error);margin-bottom:1rem;"></div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Generar referencia</button>
      </div>
    </form>
  `;

  const form = container.querySelector('#articleForm');
  const formError = container.querySelector('#formError');
  const referenceEl = document.getElementById('reference');
  const authorPreview = container.querySelector('#authorPreview');
  const authorsContainer = container.querySelector('#authorsContainer');
  const addAuthorBtn = container.querySelector('#addAuthorBtn');
  const articleTypeSelect = container.querySelector('#articleType');
  const journalFields = container.querySelector('#journalFields');
  const webFields = container.querySelector('#webFields');
  const newspaperFields = container.querySelector('#newspaperFields');

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

  function formatInTextCitation(autores, anio) {
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

  function formatArticleTitle(titulo) {
    const raw = String(titulo || '').trim();
    if (!raw) return '';

    const firstSpaceIndex = raw.indexOf(' ');
    if (firstSpaceIndex === -1) {
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    }

    const firstWord = raw.slice(0, firstSpaceIndex);
    const rest = raw.slice(firstSpaceIndex + 1);
    return `${firstWord.charAt(0).toUpperCase() + firstWord.slice(1)} ${rest}`;
  }

  function buildArticleAPA(data) {
    const autoresFormateados = formatMultipleAuthorsAPA(data.autores);
    const anioSafe = String(data.anio || '').trim();
    const tituloSafe = formatArticleTitle(data.titulo);
    if (!autoresFormateados || !anioSafe || !tituloSafe) return '';

    const pieces = [];
    pieces.push(`${autoresFormateados} (${anioSafe}${data.hasCompleteDate ? `, ${data.dateString}` : ''}).`);
    pieces.push(`${tituloSafe}.`);

    if (data.tipo === 'journal') {
      if (!data.revista) return '';
      let journalPart = `<em>${data.revista}</em>`;
      if (data.volumen) {
        journalPart += `, <em>${data.volumen}</em>`;
      }
      if (data.numero) {
        journalPart += `${data.volumen ? '' : ','}(${data.numero})`;
      }
      if (data.paginas) {
        journalPart += `, ${data.paginas}`;
      }
      journalPart = journalPart.trim();
      if (!journalPart.endsWith('.')) journalPart += '.';
      pieces.push(journalPart);
      if (data.doi_url) {
        pieces.push(data.doi_url);
      }
    } else if (data.tipo === 'web') {
      if (!data.sitio || !data.url) return '';
      let websitePart = `<em>${data.sitio}</em>.`;
      pieces.push(websitePart);
      pieces.push(data.url);
    } else if (data.tipo === 'newspaper') {
      if (!data.periodico) return '';
      let newspaperPart = `<em>${data.periodico}</em>`;
      if (data.paginas) {
        newspaperPart += `, ${data.paginas}`;
      }
      newspaperPart = newspaperPart.trim();
      if (!newspaperPart.endsWith('.')) newspaperPart += '.';
      pieces.push(newspaperPart);
    }

    return pieces.filter(Boolean).join(' ');
  }

  function updateTypeSpecificFields() {
    const type = articleTypeSelect.value;

    journalFields.style.display = type === 'journal' ? 'block' : 'none';
    webFields.style.display = type === 'web' ? 'block' : 'none';
    newspaperFields.style.display = type === 'newspaper' ? 'block' : 'none';

    const revistaEl = container.querySelector('#revista');
    const sitioEl = container.querySelector('#sitio');
    const urlEl = container.querySelector('#url');
    const periodicoEl = container.querySelector('#periodico');
    const diaPeriodicoEl = container.querySelector('#dia_periodico');
    const mesPeriodicoEl = container.querySelector('#mes_periodico');

    if (revistaEl) revistaEl.required = type === 'journal';
    if (sitioEl) sitioEl.required = type === 'web';
    if (urlEl) urlEl.required = type === 'web';
    if (periodicoEl) periodicoEl.required = type === 'newspaper';
    if (diaPeriodicoEl) diaPeriodicoEl.required = type === 'newspaper';
    if (mesPeriodicoEl) mesPeriodicoEl.required = type === 'newspaper';
  }

  // Event delegation para actualizar vista previa de autor al editar cualquiera de los campos
  authorsContainer.addEventListener('input', function (event) {
    if (event.target.matches('.author-name') || event.target.matches('.author-last')) {
      updateAuthorPreview();
    }
  });

  // Botón para agregar nuevos autores
  addAuthorBtn.addEventListener('click', function () {
    authorIndex += 1;
    authorsContainer.appendChild(createAuthorField(authorIndex));
    updateAuthorPreview();
  });

  // Eliminación dinámica de autores
  authorsContainer.addEventListener('click', function (event) {
    if (event.target.matches('.remove-author-btn')) {
      const group = event.target.closest('.author-group');
      if (group) {
        group.remove();
        updateAuthorPreview();
      }
    }
  });

  articleTypeSelect.addEventListener('change', function () {
    updateTypeSpecificFields();
  });

  authorIndex = 0;
  authorsContainer.appendChild(createAuthorField(authorIndex));
  updateAuthorPreview();
  updateTypeSpecificFields();

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (formError) formError.textContent = '';

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const autores = getAuthorsData();
    const tipo = articleTypeSelect.value;
    const anio = String(container.querySelector('#anio').value || '').trim();
    const titulo = String(container.querySelector('#titulo').value || '').trim();
    const revista = String((container.querySelector('#revista') || {}).value || '').trim();
    const volumen = String((container.querySelector('#volumen') || {}).value || '').trim();
    const numero = String((container.querySelector('#numero') || {}).value || '').trim();
    const paginas = String((container.querySelector(tipo === 'newspaper' ? '#paginas_periodico' : '#paginas') || {}).value || '').trim();
    const doi_url = String((container.querySelector('#doi_url') || {}).value || '').trim();
    const sitio = String((container.querySelector('#sitio') || {}).value || '').trim();
    const dia = String((container.querySelector(tipo === 'newspaper' ? '#dia_periodico' : '#dia') || {}).value || '').trim();
    const mes = String((container.querySelector(tipo === 'newspaper' ? '#mes_periodico' : '#mes') || {}).value || '').trim();
    const url = String((container.querySelector('#url') || {}).value || '').trim();
    const periodico = String((container.querySelector('#periodico') || {}).value || '').trim();

    if (!autores || autores.length === 0 || !anio || !titulo) {
      if (formError) formError.textContent = 'Todos los campos obligatorios deben completarse.';
      return;
    }

    if (tipo === 'journal' && !revista) {
      if (formError) formError.textContent = 'El nombre de la revista es obligatorio para Revista académica.';
      return;
    }

    if (tipo === 'web' && (!sitio || !url)) {
      if (formError) formError.textContent = 'El nombre del sitio y la URL son obligatorios para Artículo web.';
      return;
    }

    if (tipo === 'newspaper' && (!periodico || !dia || !mes)) {
      if (formError) formError.textContent = 'Nombre del periódico, día y mes son obligatorios para Periódico.';
      return;
    }

    const dateString = dia && mes ? `${dia} ${mes}` : '';
    const hasCompleteDate = Boolean(dia && mes);

    const apa = buildArticleAPA({
      autores,
      tipo,
      anio,
      titulo,
      revista,
      volumen,
      numero,
      paginas,
      doi_url,
      sitio,
      url,
      periodico,
      dia,
      mes,
      hasCompleteDate,
      dateString
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

    const inTextCitation = formatInTextCitation(autores, anio);

    const citationData = {
      source_type: 'article',
      citation_text: apa,
      metadata: {
        autores,
        tipo,
        in_text_citation: inTextCitation,
        anio,
        titulo,
        revista: revista || null,
        volumen: volumen || null,
        numero: numero || null,
        paginas: paginas || null,
        sitio: sitio || null,
        periodico: periodico || null,
        dia: dia || null,
        mes: mes || null,
        doi_url: doi_url || null,
        url: url || null
      },
      consulta_fecha: new Date().toISOString().split('T')[0]
    };

    try {
      const { error } = await saveCitation(citationData);
      if (error) {
        console.error('Error guardando cita artículo:', error);
      }
    } catch (err) {
      console.error('Error inesperado:', err);
    }
  });

  // No crear ni manejar listeners de copiar local en el módulo Artículo.
  // El botón global #copyBtn ya se maneja por initIA (y persiste en la página).
}
