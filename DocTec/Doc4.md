# Doc4: Manual Técnico Supremo y Guía de Migración - Sistema App Web de referenciación (UnADM)

## 1. Descripción general del sistema

### Propósito de la aplicación
App Web de referenciación es una herramienta web especializada para estudiantes de posgrado de la Universidad Abierta y a Distancia de México (UnADM), diseñada para generar referencias bibliográficas en formato APA (American Psychological Association) para múltiples tipos de fuentes, incluyendo contenidos generados por modelos de inteligencia artificial (IA). La aplicación aborda la necesidad académica de citar correctamente fuentes digitales y de IA, que no están completamente estandarizadas en las normas APA tradicionales.

### Problema que resuelve
- **Citas de IA**: Proporciona un formato estandarizado para citar modelos de lenguaje como ChatGPT, Gemini, Claude, etc., siguiendo las recomendaciones más recientes de APA para fuentes de IA.
- **Automatización**: Reduce errores humanos en el formateo de referencias bibliográficas, que son comunes en trabajos académicos.
- **Accesibilidad**: Ofrece una interfaz intuitiva para estudiantes sin conocimientos avanzados de normas de citación.
- **Historial**: Permite a los usuarios mantener un registro de todas sus citas generadas para reutilización y exportación.

### Tecnologías utilizadas
- **Frontend**: HTML5, CSS3, JavaScript ES6+ con módulos nativos.
- **Backend como servicio (BaaS)**: Supabase (PostgreSQL + Auth + API REST).
- **Librerías externas**: Marked.js (renderizado Markdown), DOMPurify (sanitización HTML).
- **Arquitectura**: SPA ligera sin framework JavaScript, enfoque modular.

---

## 2. Arquitectura del sistema

### Explicación del enfoque (SPA ligera sin framework)
La aplicación utiliza una arquitectura de Single Page Application (SPA) minimalista sin frameworks pesados como React o Vue. En su lugar, emplea:
- **Módulos ES6 nativos** para separación de responsabilidades.
- **Manipulación directa del DOM** con vanilla JavaScript.
- **Carga dinámica de contenido** mediante fetch API e inyección de HTML.
- **Estado global mínimo** manejado a través de localStorage y variables de módulo.

Este enfoque reduce la complejidad y el tamaño del bundle, ideal para una aplicación académica con requisitos moderados de interactividad.

### Separación de responsabilidades
- **UI/UX**: Archivos HTML para estructura, CSS para estilos, JavaScript para interactividad.
- **Lógica de negocio**: Módulos separados (auth.js, citations.js, generador.js).
- **Configuración**: supabaseClient.js centraliza la conexión al backend.
- **Datos**: Supabase maneja persistencia, autenticación y autorización.

### Flujo general de la aplicación
1. **Acceso público**: Usuario visita index.html → carga header público → puede registrarse o iniciar sesión.
2. **Autenticación**: Registro/login → validación → redirección a generador principal (refer.html).
3. **Generación**: Selección de tipo de fuente → llenado de formulario → generación APA → guardado en BD.
4. **Historial**: Acceso a historial.html → carga citas del usuario → métricas personales.
5. **Administración**: Usuarios con rol 'admin' acceden a métricas globales y gestión de usuarios.

---

## 3. Estructura del proyecto (Árbol de Archivos)

```text
App Web de referenciación/
├── index.html              # Página de bienvenida pública
├── login.html              # Formulario de inicio de sesión
├── registro.html           # Formulario de registro
├── refer.html              # Generador principal de referencias (Privada)
├── historial.html          # Historial y métricas de usuario (Privada)
├── css/
│   └── styles.css          # Estilos centralizados, responsive
├── js/
│   ├── supabaseClient.js   # Configuración cliente Supabase
│   ├── auth.js             # Lógica de autenticación y protección de rutas
│   ├── app.js              # Inicialización global de la aplicación
│   ├── login.js            # Manejo del formulario de login
│   ├── registro.js         # Manejo del formulario de registro
│   ├── header.js           # Carga dinámica de navegación
│   ├── citations.js        # Operaciones CRUD de citas
│   ├── dashboard.js        # Lógica del dashboard de usuario
│   ├── historial.js        # Renderizado y exportación del historial
│   ├── metrics.js          # Panel administrativo de métricas
│   ├── userManagement.js   # Gestión de usuarios (admin)
│   ├── adminDashboard.js   # Dashboard global de administración
│   ├── ui-menu.js          # Control del menú móvil
│   └── catalogos/
│       └── programas.js    # Gestión de programas educativos
└── modules/
    └── generador/
        ├── generador.js    # Orquestador de tipos de referencias
        └── types/
            ├── ia.js       # Generador APA para IA
            ├── libro.js    # Generador APA para libros
            ├── articulo.js # Generador APA para artículos
            └── web.js      # Generador APA para sitios web
```

### Explicación del propósito de cada archivo clave

#### auth.js
Implementa la capa de autenticación completa:
- `requireAuth()`: Protege rutas que requieren sesión activa.
- `requireGuest()`: Redirige usuarios autenticados de páginas públicas.
- `requireAdmin()`: Valida permisos de administrador.
- `initAuthListener()`: Escucha cambios de estado de autenticación.
- Manejo de tokens JWT y redirecciones automáticas.

#### supabaseClient.js
Configuración centralizada del cliente Supabase:
- Instancia global de Supabase con URL y clave anónima.
- Configuración de opciones (auth, realtime).
- Punto único de configuración para cambios de entorno.

#### dashboard.js
Controla la lógica del dashboard principal:
- Determina el rol del usuario (admin vs user).
- Redirige a funciones específicas según permisos.
- Inicializa secciones de historial o métricas.

#### citations.js
Maneja todas las operaciones CRUD de citas:
- `saveCitation()`: Inserta nuevas referencias en la base de datos.
- `getUserCitations()`: Recupera historial del usuario con joins.
- `normalizeMetadata()`: Estandariza datos antes de guardar.
- Integración con lógica de formateo APA.

#### historial.js
Gestiona la visualización del historial:
- `renderHistorial()`: Renderiza tabla de citas con markdown.
- `exportToHTML()`: Genera documento HTML para descarga.
- Integración con Marked.js para renderizado de prompts/respuestas.

#### metrics.js
Panel administrativo básico:
- Carga métricas globales de uso.
- Renderiza dashboard para administradores.
- Integración con adminDashboard.js para funcionalidades avanzadas.

#### adminDashboard.js
Dashboard completo de administración:
- `renderAdminDashboard()`: Muestra métricas globales.
- Gestión de usuarios con filtros y búsqueda.
- Historial global con paginación.
- Cálculos de estadísticas por usuario y globales.

#### userManagement.js
Funcionalidades de gestión de usuarios:
- `loadUsers()`: Carga lista de usuarios con joins.
- Tablas filtrables por rol, programa, etc.
- Cálculo de métricas por usuario.

#### ui-menu.js
Control de interfaz responsive:
- Manejo del menú hamburguesa en móviles.
- Toggle de visibilidad de elementos.
- Eventos de click para navegación móvil.

#### Otros relevantes
- **app.js**: Inicialización global, carga de módulos principales.
- **login.js/registro.js**: Validación y envío de formularios de auth.
- **header.js**: Carga dinámica de headers según estado de sesión.
- **generador.js**: Controla la inyección de formularios por tipo de fuente.
- **types/*.js**: Lógica específica de formateo APA por tipo de fuente.

### Diferenciación entre módulos de lógica, UI y configuración
- **Configuración**: supabaseClient.js, app.js.
- **Lógica de negocio**: citations.js, auth.js, generador.js, types/*.js.
- **UI/Interfaz**: header.js, ui-menu.js, historial.js, adminDashboard.js.
- **Datos**: userManagement.js, metrics.js, catalogos/programas.js.

### 3.A Comportamiento funcional por página

#### index.html
- Propósito: pantalla de bienvenida pública que presenta el servicio y ofrece acceso a login o registro.
- Estado de acceso: pública.
- Módulos JS cargados: `header.js` para renderizar navegación, `app.js` para inicialización general si aplica.
- Elementos interactivos: botones de navegación a login y registro, enlaces de información institucional, posiblemente banners o llamadas a la acción.
- Redirecciones: si el usuario ya está autenticado, puede redirigirse automáticamente a `refer.html`; de lo contrario se mantiene en la pantalla de bienvenida.

#### login.html
- Propósito: formulario de inicio de sesión para usuarios ya registrados.
- Estado de acceso: pública, pero con `requireGuest()` para usuarios autenticados.
- Módulos JS cargados: `auth.js`, `login.js`, `header.js`.
- Elementos interactivos: campos de email y contraseña, botón de envío, enlace a registro, mensajes de error de validación.
- Redirecciones: envía a `refer.html` tras login exitoso; si ya hay sesión activa, redirige fuera de esta página.

#### registro.html
- Propósito: formulario de creación de cuenta para nuevos usuarios.
- Estado de acceso: pública, con restricción de `requireGuest()` para quien ya tenga sesión.
- Módulos JS cargados: `auth.js`, `registro.js`, `header.js`, `catalogos/programas.js`.
- Elementos interactivos: selección de nivel educativo, división y programa, campos de nombre, email, contraseña y confirmación, checkbox de privacidad.
- Redirecciones: tras registro exitoso y confirmación, dirige a `refer.html`; si el usuario ya tiene sesión activa, redirige fuera de esta página.

#### refer.html
- Propósito: interfaz principal de generación de referencias bibliográficas.
- Estado de acceso: requiere sesión autenticada (`requireAuth()`).
- Módulos JS cargados: `auth.js`, `header.js`, `generador.js`, `modules/generador/types/ia.js`, `modules/generador/types/libro.js`, `modules/generador/types/articulo.js`, `modules/generador/types/web.js`, `citations.js`.
- Elementos interactivos: selector de tipo de fuente, formularios dinámicos según tipo, campos de entrada para metadata, botón de generar y copiar referencia, visualización del resultado.
- Redirecciones: si no hay sesión valida, redirige a `index.html` o login; si el rol del usuario no coincide con el acceso, puede redirigir a la página adecuada.

#### historial.html
- Propósito: mostrar historial de citas y métricas de uso para el usuario, y estadísticas globales para administradores.
- Estado de acceso: requiere sesión autenticada; parte del contenido puede requerir rol admin para funciones avanzadas.
- Módulos JS cargados: `auth.js`, `dashboard.js`, `historial.js`, `metrics.js`, `adminDashboard.js`, `userManagement.js`, `header.js`.
- Elementos interactivos: filtros, búsquedas, tablas de citas, botones de exportación, tarjetas de métricas, paneles de administración.
- Redirecciones: si no hay sesión valida, redirige a `index.html`; si usuario es admin puede acceder a métricas extendidas, en caso contrario se muestra solo historial personal.

---

## 4. Gestión de autenticación

### Cómo funciona Supabase Auth
La aplicación utiliza Supabase Auth para manejar autenticación basada en email/contraseña con tokens JWT. Supabase proporciona:
- Registro de usuarios con verificación de email.
- Inicio de sesión con validación de credenciales.
- Gestión automática de sesiones y tokens.
- Integración con tabla `profiles` para metadatos adicionales.

### Flujo de registro e inicio de sesión

#### Registro:
1. Usuario llena formulario en registro.html.
2. Validaciones: email válido, contraseñas coinciden, privacidad aceptada.
3. `handleRegister()`: Llama `supabase.auth.signUp()`.
4. Supabase crea usuario en `auth.users` y envía email de confirmación.
5. Automáticamente inserta perfil en `profiles` con rol 'user'.
6. Redirección automática a refer.html tras confirmación.

> Nota: Si un usuario intenta iniciar sesión antes de confirmar su correo, la experiencia depende de la configuración de Supabase. En el modelo habitual de esta aplicación, el intento no debería conceder acceso completo hasta que el email haya sido verificado; en ese estado intermedio, el inicio de sesión puede devolver un error de autenticación o un estado de sesión no válido, y la aplicación debe mantenerlo en la página de login hasta que confirme el correo.

#### Inicio de sesión:
1. Usuario llena formulario en login.html.
2. `handleLogin()`: Llama `supabase.auth.signInWithPassword()`.
3. Supabase valida credenciales y retorna JWT.
4. `initAuthListener()` detecta evento SIGNED_IN.
5. Redirección a refer.html.

### Manejo de sesión
- **Tokens JWT**: Almacenados automáticamente por Supabase client.
- **Persistencia**: Sesiones sobreviven refrescos de página.
- **Expiración**: 24 horas por defecto, renovable automáticamente.
- **Logout**: `supabase.auth.signOut()` limpia tokens y redirige.

### Protección de rutas (requireAuth, roles, etc.)
- `requireAuth()`: Verifica sesión activa, redirige a index.html si no.
- `requireGuest()`: Verifica no sesión, redirige a refer.html si sí.
- `requireAdmin()`: Verifica rol 'admin' en perfil, acceso denegado si no.
- Implementado con listeners de estado de autenticación.

### Flujo técnico del token JWT
Supabase emite un JWT en el momento del inicio de sesión que incluye campos estándar como `sub` (identificador del usuario), `email`, `exp` (tiempo de expiración) y, en algunos casos, `role`. El token también puede transportar campos custom como `user_metadata` y `app_metadata` que contienen datos asociados al usuario, aunque en esta aplicación el uso principal es la identificación y autorización.

El cliente no guarda el token en un cookie propia; la librería de Supabase administra la sesión en el navegador y mantiene un refresh token asociado. Cada llamada a la API de Supabase se realiza incluyendo el token en el header `Authorization: Bearer <token>`, lo que permite autenticar la petición y aplicar políticas RLS en el backend.

En una reimplementación PHP, el backend debe emitir JWT equivalentes utilizando una librería como `firebase/php-jwt`, `lcobucci/jwt` o una solución nativa de Laravel/Symfony. El token debe contener al menos `sub`, `email`, `exp` y cualquier reclamo adicional necesario para el control de roles.

Cuando el token expira, el cliente intenta renovar la sesión automáticamente mediante el refresh token gestionado por la librería Supabase. Si la renovación falla, el comportamiento esperado es forzar el cierre de sesión del usuario y redirigirlo a la página de login, evitando que la sesión caducada siga permitiendo acceso.

---

## 5. Modelo de datos

### Descripción de las tablas principales

#### profiles
Almacena perfiles de usuario extendiendo `auth.users`:
- `id`: UUID, PK, FK a auth.users.
- `full_name`: Nombre completo.
- `email`: Email (duplicado de auth.users).
- `role`: 'user' o 'admin'.
- `program_id`: FK a programs.
- `created_at/updated_at`: Timestamps.

#### citations
Almacena referencias generadas:
- `id`: UUID, PK.
- `user_id`: FK a profiles.
- `model_id`: FK opcional a models.
- `model_name_custom/organization_custom`: Para modelos no catalogados.
- `version/consulta_fecha/tema`: Metadatos específicos.
- `prompt/llm_response`: Contenido opcional con markdown.
- `citation_text`: Referencia APA generada.
- `source_type`: 'ia', 'book', 'article', 'web'.
- `metadata`: JSON flexible.
- `created_at/updated_at`: Timestamps.

El campo `citations.metadata` se utiliza para almacenar datos variables según el tipo de fuente. Ejemplos de estructura:
- IA: `{ "modelo": "ChatGPT", "organizacion": "OpenAI", ... }`
- Libro: `{ "autores": [...], "anio": 2024, "titulo": "...", ... }`

#### models
Catálogo de modelos de IA:
- `id`: UUID, PK.
- `name`: Nombre del modelo (ej: "ChatGPT").
- `organization_responsible`: Empresa (ej: "OpenAI").
- `model_url`: URL oficial.

#### programs
Catálogo de programas educativos de la UnADM.

### Relaciones entre tablas
- `profiles` → `auth.users`: 1:1 (id).
- `profiles` → `programs`: N:1 (program_id).
- `citations` → `profiles`: N:1 (user_id).
- `citations` → `models`: N:1 opcional (model_id).

### Estructura SQL Detallada para Backend (Migración)
```sql
CREATE TABLE programs (
  id CHAR(36) PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  nivel VARCHAR(100),
  division VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  tipo_usuario VARCHAR(50),
  nivel_educativo VARCHAR(100),
  division VARCHAR(100),
  program_id UUID,
  matricula VARCHAR(50),
  metadata JSONB DEFAULT '{}'::jsonb,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (program_id) REFERENCES programs(id)
);

CREATE TABLE models (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  organization_responsible VARCHAR(255) NOT NULL,
  model_url VARCHAR(500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE citations (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  model_id CHAR(36),
  model_name_custom VARCHAR(255),
  organization_custom VARCHAR(255),
  version VARCHAR(100),
  consulta_fecha DATE,
  tema VARCHAR(500) NOT NULL,
  prompt TEXT,
  llm_response TEXT,
  citation_text TEXT NOT NULL,
  source_type VARCHAR(20) NOT NULL,
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles(id),
  FOREIGN KEY (model_id) REFERENCES models(id)
);

CREATE INDEX idx_citations_user_created ON citations(user_id, created_at);
CREATE INDEX idx_citations_model ON citations(model_id);
CREATE INDEX idx_profiles_program ON profiles(program_id);
```

---

## 6. Flujo de generación de citas

### Cómo el usuario genera una cita
1. Usuario autenticado accede a refer.html.
2. Selecciona tipo de fuente (IA, Libro, Artículo, Web).
3. generador.js carga dinámicamente el módulo correspondiente.
4. Usuario llena formulario específico.
5. Al enviar, se valida y genera referencia APA.
6. Se guarda en BD y muestra resultado.

### Cómo se relaciona con models
Para citas de IA, el selector carga modelos desde la tabla `models`. Si se ingresa una URL conocida, el sistema autocompleta el modelo usando `catalogoIAporDominio`.

### 6.A Catálogo de operaciones y equivalencias de API

- `citations.js` → `saveCitation()`: `INSERT INTO citations (...)`
- `citations.js` → `getUserCitations()`: `SELECT citations.*, models.name FROM citations LEFT JOIN models ... WHERE user_id = ?`
- `adminDashboard.js` → `loadUsers()`: `SELECT profiles.*, programs.nombre, COUNT(citations.id) FROM profiles LEFT JOIN programs ... LEFT JOIN citations ... GROUP BY profiles.id`

---

## 7. Reglas de construcción APA por tipo de fuente

### IA
- Plantilla: `Organización (Año). Nombre del modelo (v Versión) [Modelo de lenguaje]. URL`.
- Ejemplo: `OpenAI (2025). ChatGPT (v 4.0) [Modelo de lenguaje]. https://chat.openai.com`

### Libro
- Plantilla: `Apellido, Iniciales. (Año). Título del libro. Editorial.`
- Ejemplo: `Pérez, L., & García, C. (2024). Metodología de la investigación. Editorial Universitaria.`

### Artículo
- Plantilla: `Apellido, Iniciales. (Año). Título del artículo. Nombre de la revista, Volumen(Número), páginas.`
- Ejemplo: `López, A. (2023). Inteligencia artificial y evaluación. Revista Científica, 12(3), 45-60.`

### Web
- Plantilla: `Autor. (Año, Mes Día). Título de la página. Recuperado Fecha de recuperación, de URL`.
- Ejemplo: `Instituto Nacional de Estudios. (2024, marzo 10). Políticas de acceso abierto. Recuperado 5 de noviembre de 2024, de https://www.ejemplo.edu/politicas`

---

## 8. Análisis Exhaustivo de Módulos JavaScript (.js)

### 8.1. Configuración y Conectividad

#### `js/supabaseClient.js`
Establece la conexión con Supabase. Exporta una instancia `supabase`. En migración, reemplazar por configuración de servidor (PDO/API).

#### `js/app.js`
Punto de entrada. Inicializa el DOM y listeners de autenticación.

### 8.2. Autenticación y Seguridad

#### `js/auth.js`
Gestiona sesiones y roles. `requireAuth()` protege rutas. En migración, implementar middlewares que validen JWT.

#### `js/login.js` y `js/registro.js`
Manejan el envío de formularios de autenticación y validaciones de cliente.

### 8.3. Operaciones de Datos (CRUD)

#### `js/citations.js`
Lógica de persistencia. `normalizeMetadata()` estandariza campos JSON antes de guardarlos.

### 8.4. Motor de Generación Dinámica

#### `modules/generador/generador.js`
Carga dinámicamente el módulo (ej. `ia.js`) según la elección del usuario. Implementa el patrón Factory.

#### `modules/generador/types/ia.js`, `libro.js`, etc.
Contienen la gramática APA específica y la interfaz del formulario. `buildAPA()` es el algoritmo central de citación.

### 8.5. Dashboards e Historial

#### `js/historial.js`
Renderiza la lista de citas. Usa `Marked.js` y `DOMPurify`. Permite exportación a HTML.

#### `js/adminDashboard.js` y `js/userManagement.js`
Consultas agregadas para métricas globales y gestión de usuarios.

---

## 9. Algoritmos del Sistema (Resumen Lógico)

### Algoritmo: Control de Acceso (Guardia de Rutas)
1. Verificar sesión de Supabase.
2. Si no hay sesión y la ruta es privada -> Redirigir a login.
3. Si hay sesión y la ruta es admin, verificar rol.

### Algoritmo: Construcción de Cita APA (IA)
1. Recibir metadatos.
2. Formatear fecha "(Año, día de mes)".
3. Concatenar elementos: Org + Fecha + Título + Versión + Tipo + URL.

---

## 10. Historial de usuario
Recupera citas mediante `getUserCitations(userId)` con `LEFT JOIN` a `models`. Renderiza una tabla dinámica con sanitización mediante `DOMPurify`.

---

## 11. Panel administrativo
Muestra métricas globales (totales, distribución de modelos) y gestión de usuarios. Usa consultas agregadas en Supabase.

---

## 12. Seguridad

### Uso de RLS
Políticas en Supabase que aseguran que cada usuario solo acceda a sus propios datos (`user_id = auth.uid()`).

### Riesgos conocidos
- Credenciales públicas (mitigado con RLS).
- Falta de validación en servidor (requiere refuerzo en base de datos).
- Bypass de validaciones cliente (mitigado con triggers y políticas).

---

## 13. Despliegue actual
- **Frontend**: GitHub Pages (estático).
- **Backend**: Supabase Cloud.
- **Variables**: `SUPABASE_URL` y `SUPABASE_ANON_KEY` configuradas en el cliente.

---

## 14. Glosario de Términos Expandido
- **BaaS**: Backend as a Service (Supabase).
- **DOM**: Document Object Model.
- **ES6**: ECMAScript 2015+.
- **JWT**: JSON Web Token.
- **RLS**: Row Level Security.
- **SPA**: Single Page Application.
- **UI/UX**: User Interface / User Experience.
- **Vanilla JavaScript**: JavaScript puro sin frameworks.

---

## 15. Guía Maestra de Migración
Requisitos: PHP 8.0+, MySQL 8.0+ (con JSON). Pasos: Migrar DB, crear API REST, reemplazar `auth.js` con validación de tokens en servidor, adaptar `supabaseClient.js` para usar `fetch`.

---
**Manual Técnico App Web de referenciación - UnADM. Edición Máxima y Exhaustiva para Migración.**
