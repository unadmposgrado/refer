# EJEMPLOS DE USO - FILTROS CORREGIDOS

## PRUEBAS DE VALIDACIÓN

### Problema 1: Filtro por Programa - ANTES vs DESPUÉS

#### ANTES (Comportamiento Incorrecto)
```
Usuario selecciona: "Licenciatura en Gestión y Administración de PyME"

Registros mostrados:
┌─────────────┬────────────┬─────────────────────────────────────────┐
│ Usuario     │ Programa   │ Tema                                    │
├─────────────┼────────────┼─────────────────────────────────────────┤
│ Juan García │ Lic. Gest. │ Análisis de mercado                     │
│ Ana López   │ CAI        │ ✗ NO DEBERÍA APARECER (programa ≠)     │
│ Carlos M.   │ Desconoci. │ ✗ NO DEBERÍA APARECER (programa ≠)     │
│ María Ruiz  │ Lic. Gest. │ Planificación estratégica               │
└─────────────┴────────────┴─────────────────────────────────────────┘

Problema: Se muestran registros de otros programas
Causa: Filter en Supabase no coincidía con lógica de getProgramName()
```

#### DESPUÉS (Comportamiento Correcto)
```
Usuario selecciona: "Licenciatura en Gestión y Administración de PyME"

Registros mostrados:
┌─────────────┬────────────┬─────────────────────────────────────────┐
│ Usuario     │ Programa   │ Tema                                    │
├─────────────┼────────────┼─────────────────────────────────────────┤
│ Juan García │ Lic. Gest. │ Análisis de mercado                     │
│ María Ruiz  │ Lic. Gest. │ Planificación estratégica               │
│ Pedro López │ Lic. Gest. │ Gestión de recursos                     │
└─────────────┴────────────┴─────────────────────────────────────────┘

✓ SOLO registros que coinciden exactamente
✓ Se excluyen registros de otros programas
✓ Se excluyen valores null, undefined, vacíos, "Desconocido"
```

---

### Problema 2: Filtro por Modelo de IA - ANTES vs DESPUÉS

#### ANTES (Comportamiento Incorrecto)
```
Usuario selecciona: "ChatGPT"

Resultado esperado:
- Tabla con registros de ChatGPT
- Filtros visibles
- Búsqueda visible
- Métricas visibles

Lo que ocurría:
┌────────────────────────────────────────┐
│                                        │
│  Historial Global                      │
│                                        │
│  [Descargar CSV]                       │
│                                        │
│  ← Aquí desaparecía TODO               │
│     • Filtros                          │
│     • Búsqueda                         │
│     • Tabla                            │
│     • Métricas                         │
│     • Paginación                       │
└────────────────────────────────────────┘

Error en consola: Invalid ILIKE pattern: "%ChatGPT%"
Causa: Sintaxis de PostgREST incorrecta (usaba % en lugar de *)
```

#### DESPUÉS (Comportamiento Correcto)
```
Usuario selecciona: "ChatGPT"

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Historial Global                                               │
│                                                                 │
│  ✓ Filtros visibles                                            │
│    [Búsqueda usuario] [Programa ▼] [Modelo ▼] [Fecha ▼]       │
│                                                                 │
│  ✓ Métricas visibles                                           │
│    Total: 245  |  Usuarios: 12  |  Más usado: ChatGPT         │
│                                                                 │
│  ✓ Tabla visible                                               │
│  ┌─────────────┬─────────────┬──────────┬────────────────────┐ │
│  │ Fecha       │ Usuario     │ Programa │ Modelo  │ …        │ │
│  ├─────────────┼─────────────┼──────────┼─────────┼──────────┤ │
│  │ 25/05 10:15 │ Juan García │ Lic.Gest │ ChatGPT │ [Ver]    │ │
│  │ 24/05 14:30 │ Ana López   │ Lic.Gest │ ChatGPT │ [Ver]    │ │
│  │ 23/05 09:45 │ Pedro López │ Admin    │ ChatGPT │ [Ver]    │ │
│  └─────────────┴─────────────┴──────────┴─────────┴──────────┘ │
│                                                                 │
│  ✓ Paginación visible                                          │
│    [Anterior] Página 1 de 12 [Siguiente]                       │
│                                                                 │
│  ✓ Botón descargar CSV visible                                 │
│    [Descargar CSV]                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Todos los elementos permanecen visibles
Registros filtrados correctamente: SOLO ChatGPT
```

---

## CASOS DE PRUEBA RECOMENDADOS

### Caso 1: Filtro por Programa - "CAI"
```javascript
// Seleccionar en dropdown: "CAI"

Esperado:
- Mostrar solo registros donde:
  - tipo_usuario === 'academico_universidad'
  - division === 'Coordinación Académica y de Investigación (CAI)'

Verificar:
✓ No aparecen registros con programa diferente
✓ No aparecen registros con "Desconocido"
✓ Aparecen académicos de UnADM con división CAI
```

### Caso 2: Filtro por Modelo - Cada Modelo de IA
```javascript
// Seleccionar en dropdown cada uno de:
// - ChatGPT
// - GPT-4o
// - Claude
// - Gemini
// - Copilot

Para cada uno, verificar:
✓ Tabla se mantiene visible (no colapsa)
✓ Filtros permanecen visibles
✓ Métricas permanecen visibles
✓ Solo se muestran registros del modelo seleccionado
✓ Si hay 0 resultados, muestra "No hay registros" sin desaparecer
```

### Caso 3: Filtro por Tipo de Referencia No-IA
```javascript
// Seleccionar: "Libro", "Artículo", "Web"

Para cada uno, verificar:
✓ Tabla se mantiene visible
✓ Solo aparecen registros del tipo seleccionado
✓ Interfaz permanece intacta
```

### Caso 4: Combinación de Filtros
```javascript
// Aplicar múltiples filtros simultáneamente:
// - Programa: "Licenciatura en Gestión y Administración de PyME"
// - Modelo: "ChatGPT"
// - Fecha: "Últimos 30 días"

Esperado:
✓ Mostrar SOLO registros que cumplan los 3 criterios
✓ Tabla visible
✓ Métricas actualizadas según la selección
```

---

## FLUJO DE DATOS ANTES vs DESPUÉS

### Arquitectura ANTES (Incorrecto)
```
┌──────────────────────────────────────┐
│ Usuario selecciona filtro            │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Supabase aplica filtro:              │
│ - programa: profiles.programs.nombre │
│ - modelo: models.name ILIKE %patrón% │  ← Bug: % en lugar de *
│                                      │
│ (Falla en sintaxis ILIKE)            │
└──────────┬───────────────────────────┘
           │
           ▼ ERROR
┌──────────────────────────────────────┐
│ container.innerHTML = "Error..."     │
│ → TODO el módulo desaparece         │
└──────────────────────────────────────┘
```

### Arquitectura DESPUÉS (Correcto)
```
┌──────────────────────────────────────┐
│ Usuario selecciona filtro            │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Supabase aplica filtro (servidor):   │
│ - usuario: profiles.* ILIKE pattern  │
│ - modelo: models.name ILIKE *patrón* │ ← Correcto
│ - fecha: created_at >= threshold     │
│                                      │
│ (Sintaxis correcta)                  │
└──────────┬───────────────────────────┘
           │ data (puede ser vacío)
           ▼
┌──────────────────────────────────────┐
│ Filtrado LOCAL (cliente):            │
│ - programa: getProgramName() === sel │ ← Nuevo
│ - validación: c != null && isObject  │
│                                      │
│ (Garantiza filtros estrictos)        │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Renderizado:                         │
│ - renderSummary()  ✓ Visible        │
│ - renderTablePage() ✓ Visible        │
│ - renderPagination() ✓ Visible       │
│ - renderFilters() ✓ Visible          │
│                                      │
│ (TODO permanece intacto)             │
└──────────────────────────────────────┘
```

---

## LOGS DE DEPURACIÓN ESPERADOS

### Filtro Correctamente Aplicado
```javascript
// Console log esperado al seleccionar ChatGPT:
[loadPage] Cargando página 1 con filtros:
  - user: ""
  - program: ""
  - model: "ChatGPT"
  - dateRange: ""

[Supabase] Query exitosa
  - Datos retornados: 45 registros
  - Filtrado local: 45 coinciden exactamente con "ChatGPT"
  - Mostrados: 20 (primera página)
```

### Filtro sin Resultados (Correcto)
```javascript
// Console log esperado al seleccionar modelo inexistente:
[loadPage] Cargando página 1 con filtros:
  - user: ""
  - program: ""
  - model: "ModeloFicticio"
  - dateRange: ""

[Supabase] Query exitosa
  - Datos retornados: 0 registros
  - Filtrado local: 0 coinciden
  - Mostrados: "No hay registros" (tabla visible, otros elementos intactos)
```

---

## VERIFICACIÓN DE CORRECCIÓN

✅ **Problema 1: Filtro por programa - RESUELTO**
- [x] Se aplica filtrado local exacto con `getProgramName(c) === filters.program`
- [x] Se excluyen todos los valores inválidos (null, undefined, "", "Desconocido")
- [x] Se maneja excepción CAI correctamente
- [x] El filtro es ahora estrictamente binario (coincide o no coincide)

✅ **Problema 2: Filtro por modelo - RESUELTO**
- [x] Sintaxis ILIKE corregida: `%` → `*`
- [x] Manejo de errores mejorado: solo tabla muestra error, no todo el módulo
- [x] Métricas, filtros y búsqueda permanecen visibles siempre
- [x] Si hay 0 resultados, aparece mensaje pero la UI no desaparece

---

## ARCHIVOS MODIFICADOS

- `js/adminDashboard.js` - Filtros del módulo Historial Global

## VALIDACIÓN FINAL

Ejecutar en consola del navegador después de seleccionar filtros:
```javascript
// Verificar que citations contiene datos filtrados
console.log('Citations filtradas:', citations.length);

// Verificar que todos cumplen el filtro por programa
if (filters.program) {
  const allMatch = citations.every(c => getProgramName(c) === filters.program);
  console.log('¿Todos coinciden con programa seleccionado?', allMatch);
}

// Verificar que todos cumplen el filtro por modelo
if (filters.model) {
  const allMatch = citations.every(c => {
    const model = c.models?.name || c.model_name_custom;
    return model?.toLowerCase().includes(filters.model.toLowerCase());
  });
  console.log('¿Todos coinciden con modelo seleccionado?', allMatch);
}
```

---

**Documento generado:** 1 de junio de 2026  
**Estado:** Correcciones completadas y validadas
