import { saveCitation } from '../../../js/citations.js';

export function initLibro(container) {
  if (!container) return;

  container.innerHTML = `
    <form id="bookForm" class="form" novalidate>
      <fieldset>
        <legend>Información del libro</legend>

        <div class="form-row">
          <label for="nombre">Nombre <span class="required">*</span></label>
          <input type="text" id="nombre" name="nombre" required placeholder="Ej. Juan Luis">
        </div>

        <div class="form-row">
          <label for="apellido">Apellido <span class="required">*</span></label>
          <input type="text" id="apellido" name="apellido" required placeholder="Ej. Hidalgo">
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
          <label for="titulo">Título del libro <span class="required">*</span></label>
          <input type="text" id="titulo" name="titulo" required placeholder="Ej. Psicología cognitiva">
        </div>

        <div class="form-row">
          <label for="editorial">Editorial <span class="required">*</span></label>
          <input type="text" id="editorial" name="editorial" required placeholder="Ej. Pirámide">
        </div>

        <div class="form-row">
          <label for="doi_url">DOI o URL</label>
          <input type="text" id="doi_url" name="doi_url" placeholder="Ej. https://doi.org/xxx">
        </div>
      </fieldset>

      <div id="formError" class="form-error" aria-live="polite" style="color:var(--error);margin-bottom:1rem;"></div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Generar referencia</button>
      </div>
    </form>
  `;

  const form = container.querySelector('#bookForm');
  const formError = container.querySelector('#formError');
  const referenceEl = document.getElementById('reference');
  const copyBtn = document.getElementById('copyBtn');
  const authorPreview = container.querySelector('#authorPreview');

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

  function buildBookAPA({ nombre, apellido, anio, titulo, editorial, doi_url }) {
    const autorFormateado = formatAuthorAPA(nombre, apellido);
    const anioSafe = String(anio || '').trim();
    const tituloSafe = String(titulo || '').trim();
    const editorialSafe = String(editorial || '').trim();
    const doiUrlSafe = String(doi_url || '').trim();

    const pieces = [];
    pieces.push(`${autorFormateado} (${anioSafe}).`);
    pieces.push(`<em>${tituloSafe}</em>.`);
    pieces.push(`${editorialSafe}.`);
    if (doiUrlSafe) {
      pieces.push(doiUrlSafe);
    }

    return pieces.join(' ');
  }

  function updateAuthorPreview() {
    if (!authorPreview) return;

    const nombre = container.querySelector('#nombre').value.trim();
    const apellido = container.querySelector('#apellido').value.trim();
    const formatted = formatAuthorAPA(nombre, apellido);

    authorPreview.textContent = formatted || '-';
  }

  container.querySelector('#nombre').addEventListener('input', updateAuthorPreview);
  container.querySelector('#apellido').addEventListener('input', updateAuthorPreview);

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (formError) formError.textContent = '';

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const nombre = container.querySelector('#nombre').value.trim();
    const apellido = container.querySelector('#apellido').value.trim();
    const anio = container.querySelector('#anio').value.trim();
    const titulo = container.querySelector('#titulo').value.trim();
    const editorial = container.querySelector('#editorial').value.trim();
    const doi_url = container.querySelector('#doi_url').value.trim();

    if (!nombre || !apellido || !anio || !titulo || !editorial) {
      if (formError) formError.textContent = 'Todos los campos obligatorios deben completarse.';
      return;
    }

    const apa = buildBookAPA({ nombre, apellido, anio, titulo, editorial, doi_url });
    if (referenceEl) {
      referenceEl.innerHTML = '';
      referenceEl.innerHTML = apa;
      referenceEl.focus();
    }

    const citationData = {
      source_type: 'book',
      citation_text: apa,
      metadata: {
        autores: [
          { nombre, apellido }
        ],
        anio,
        titulo,
        editorial,
        doi_url: doi_url || null
      },
      consulta_fecha: new Date().toISOString().split('T')[0]
    };

    try {
      const { error } = await saveCitation(citationData);
      if (error) {
        console.error('Error guardando cita libro:', error);
      }
    } catch (err) {
      console.error('Error inesperado:', err);
    }
  });

  // No crear ni manejar listeners de copiar local en el módulo Libro.
  // El botón global #copyBtn ya se maneja por initIA (y persiste en la página).
}
