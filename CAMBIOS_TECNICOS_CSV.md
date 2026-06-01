# Cambios Técnicos - Exportación CSV

**Archivo**: `js/adminDashboard.js`  
**Función**: `exportarHistorialCompleto()`  
**Línea**: 293

---

## Comparación: Antes vs Después

### CONSULTA SUPABASE

#### ❌ ANTES
```javascript
const { data, error } = await supabase
  .from('citations')
  .select(`
    created_at,
    tema,
    prompt,
    llm_response,
    model_name_custom,
    profiles(
      full_name,
      tipo_usuario,
      matricula,
      nivel_educativo,
      division,
      metadata,
      programs(
        nombre,
        nivel,
        division
      )
    ),
    models(name)
  `)
  .order('created_at', { ascending: false });
```

#### ✅ DESPUÉS
```javascript
const { data, error } = await supabase
  .from('citations')
  .select(`
    created_at,
    source_type,           // ← NUEVO
    citation_text,         // ← NUEVO
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
```

**Cambios**:
- ✅ Agregado `source_type` - para identificar tipo de referencia
- ✅ Agregado `citation_text` - para la referencia generada
- ✅ Removido `metadata` - no necesario en nueva estructura
- ✅ Simplificado `programs()` - solo `nombre`

---

### HEADERS DEL CSV

#### ❌ ANTES (16 columnas)
```javascript
const headers = [
  'Fecha',
  'Hora',
  'Usuario',
  'Tipo de usuario',
  'Matrícula',              // ← REMOVIDO
  'Nivel educativo',
  'División o coordinación',
  'Programa institucional',
  'Programa externo',       // ← REMOVIDO
  'Tipo externo',           // ← REMOVIDO
  'Institución externa',    // ← REMOVIDO
  'Disciplina externa',     // ← REMOVIDO
  'Modelo',
  'Tema',
  'Prompt',
  'Respuesta del LLM'       // ← RENOMBRADO
];
```

#### ✅ DESPUÉS (13 columnas)
```javascript
const headers = [
  'Fecha',
  'Hora',
  'Usuario',
  'Tipo de usuario',
  'Nivel educativo',
  'División o coordinación',
  'Programa Institucional',
  'Tipo de referencia',      // ← NUEVO
  'Referencia generada',     // ← NUEVO
  'Modelo',
  'Tema',
  'Prompt',
  'Respuesta'
];
```

**Cambios**:
- ✅ Removidas 5 columnas innecesarias (Matrícula, Programa externo, Tipo externo, Institución externa, Disciplina externa)
- ✅ Agregadas 2 columnas nuevas (Tipo de referencia, Referencia generada)
- ✅ Renombrada columna "Respuesta del LLM" → "Respuesta"
- ✅ Total: 16 → 13 columnas

---

### MAPEO DE DATOS

#### ❌ ANTES
```javascript
const rows = records.map(c => {
  const dt = c.created_at ? new Date(c.created_at) : null;
  const fecha = dt ? dt.toLocaleDateString('es-MX') : '';
  const hora = dt
    ? dt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    : '';

  const profile = c.profiles || {};
  const metadata = profile.metadata || {};

  const usuario = safe(profile.full_name);
  const tipoUsuarioSlug = profile.tipo_usuario || '';
  const tipoUsuario = tipoUsuarioMap[tipoUsuarioSlug] || tipoUsuarioSlug || '';
  const matricula = safe(profile.matricula);                    // ← REMOVIDO
  const nivelEducativo = safe(profile.nivel_educativo);
  const division = safe(profile.division);

  const programaInstitucional = safe(profile.programs?.nombre);
  const programaExterno = safe(metadata.programa_educativo);    // ← REMOVIDO
  const tipoExterno = safe(metadata.tipo_externo);              // ← REMOVIDO
  const institucionExterna = safe(metadata.institucion);        // ← REMOVIDO
  const disciplinaExterna = safe(metadata.disciplina);          // ← REMOVIDO

  let modelo = '';
  if (c.models?.name) modelo = c.models.name;
  else if (c.model_name_custom) modelo = c.model_name_custom;
  else modelo = 'No especificado';

  const tema = safe(c.tema);
  const prompt = safe(c.prompt);
  const respuesta = safe(c.llm_response);

  return [
    fecha,
    hora,
    usuario,
    tipoUsuario,
    matricula,              // ← REMOVIDO
    nivelEducativo,
    division,
    programaInstitucional,
    programaExterno,        // ← REMOVIDO
    tipoExterno,            // ← REMOVIDO
    institucionExterna,     // ← REMOVIDO
    disciplinaExterna,      // ← REMOVIDO
    modelo,
    tema,
    prompt,
    respuesta
  ];
});
```

#### ✅ DESPUÉS
```javascript
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
  const nivelEducativo = safe(profile.nivel_educativo);
  const division = safe(profile.division);
  const programaInstitucional = safe(profile.programs?.nombre);

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
  // Para otros tipos (book, article, web, etc.): dejar vacío

  return [
    fecha,
    hora,
    usuario,
    tipoUsuario,
    nivelEducativo,
    division,
    programaInstitucional,
    tipoReferencia,        // ← NUEVO
    referenciaGenerada,    // ← NUEVO
    modelo,
    tema,
    prompt,
    respuesta
  ];
});
```

**Cambios**:
- ✅ Agregado mapeo de `source_type` → `tipoReferencia`
- ✅ Agregado `citation_text` → `referenciaGenerada`
- ✅ Removidos datos innecesarios de metadata
- ✅ Agregada lógica condicional para campos IA

---

### MAPEO DE TIPOS

#### ✅ NUEVO: sourceTypeMap
```javascript
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
```

Este mapeo convierte los valores internos `source_type` a nombres legibles en español.

**Ubicación**: Agregado al inicio de `exportarHistorialCompleto()` junto con `tipoUsuarioMap`

---

### LÓGICA CONDICIONAL PARA CAMPOS IA

#### ✅ NUEVO: Condicional `if (sourceType === 'ia')`
```javascript
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
// Para otros tipos (book, article, web, etc.): dejar vacío
```

**Garantías**:
- ✅ Para `source_type === 'ia'`: Se llenan Modelo, Tema, Prompt, Respuesta
- ✅ Para otros tipos: Estos campos permanecen vacíos
- ✅ La referencia generada (`citation_text`) se incluye siempre

---

## Tabla de Equivalencias

| Campo Anterior | Acción | Nuevo Campo |
|---|---|---|
| Fecha | ✅ Mantiene | Fecha |
| Hora | ✅ Mantiene | Hora |
| Usuario | ✅ Mantiene | Usuario |
| Tipo de usuario | ✅ Mantiene | Tipo de usuario |
| Matrícula | ❌ Removido | — |
| Nivel educativo | ✅ Mantiene | Nivel educativo |
| División o coordinación | ✅ Mantiene | División o coordinación |
| Programa institucional | ✅ Mantiene | Programa Institucional |
| Programa externo | ❌ Removido | — |
| Tipo externo | ❌ Removido | — |
| Institución externa | ❌ Removido | — |
| Disciplina externa | ❌ Removido | — |
| — | ✅ Nuevo | Tipo de referencia |
| — | ✅ Nuevo | Referencia generada |
| Modelo | ⚠️ Condicional | Modelo (solo IA) |
| Tema | ⚠️ Condicional | Tema (solo IA) |
| Prompt | ⚠️ Condicional | Prompt (solo IA) |
| Respuesta del LLM | ⚠️ Condicional | Respuesta (solo IA) |

---

## Ejemplos de Salida

### Ejemplo 1: Referencia IA

```
Fecha,Hora,Usuario,Tipo de usuario,Nivel educativo,División o coordinación,Programa Institucional,Tipo de referencia,Referencia generada,Modelo,Tema,Prompt,Respuesta
01/06/2026,14:30,"García, Juan","Estudiante UnADM","Licenciatura","Coordinación Académica","Ing. en Sistemas de Información","Modelo de IA","OpenAI. (2026). ChatGPT.","ChatGPT","Nuevas tecnologías","¿Cómo funciona la IA?","La Inteligencia Artificial es..."
```

### Ejemplo 2: Referencia Libro

```
Fecha,Hora,Usuario,Tipo de usuario,Nivel educativo,División o coordinación,Programa Institucional,Tipo de referencia,Referencia generada,Modelo,Tema,Prompt,Respuesta
01/06/2026,14:45,"López, María","Estudiante externo","Diplomado","","","Libro","García, J. (2024). Introducción a la programación. Editorial. pp. 45-67.","","","",""
```

### Ejemplo 3: Referencia Artículo

```
Fecha,Hora,Usuario,Tipo de usuario,Nivel educativo,División o coordinación,Programa Institucional,Tipo de referencia,Referencia generada,Modelo,Tema,Prompt,Respuesta
01/06/2026,15:00,"Ruiz, Pedro","Figura académica UnADM","","Coordinación de Investigación","","Artículo","Pérez, A., González, B. & Martín, C. (2023). Estudio sobre inteligencia artificial. Revista Científica, 15(3), 123-145.","","","",""
```

### Ejemplo 4: Referencia Sitio Web

```
Fecha,Hora,Usuario,Tipo de usuario,Nivel educativo,División o coordinación,Programa Institucional,Tipo de referencia,Referencia generada,Modelo,Tema,Prompt,Respuesta
01/06/2026,15:15,"Sánchez, Carlos","Usuario externo","","","","Sitio Web","Wikipedia. (2026). Artículo sobre Inteligencia Artificial. Recuperado de https://es.wikipedia.org/wiki/Inteligencia_artificial","","","",""
```

---

## Validación

- ✅ Sintaxis JavaScript: Sin errores
- ✅ Consulta Supabase: Campos válidos
- ✅ Escaping CSV: Comillas correctamente escapadas
- ✅ Codificación: UTF-8 con BOM para Excel

---

## Notas de Implementación

1. **Orden de columnas**: Crítico - debe coincidir exactamente con el array `headers`
2. **Campos vacíos para no-IA**: Importante para mantener estructura consistente
3. **Mapeo de tipos**: Extensible - agregar nuevos tipos solo requiere líneas en `sourceTypeMap`
4. **BOM para Excel**: `\uFEFF` al inicio del archivo para compatibilidad UTF-8

---

## Reutilización de Lógica Existente

El código reutiliza:
- ✅ `tipoUsuarioMap` - ya existía, se mantiene igual
- ✅ Función `safe()` - helper existente para null-safety
- ✅ Formato de fecha/hora - mismo que antes
- ✅ Escape de CSV - mismo que antes
- ✅ Blob y descarga - mismo mecanismo que antes

**No se duplicó código** - se aprovechó la infraestructura existente.

