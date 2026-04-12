# 1. Descripción general del sistema

## Propósito de la aplicación
REFER es una herramienta web especializada para estudiantes de posgrado de la Universidad Abierta y a Distancia de México (UnADM), diseñada para generar referencias bibliográficas en formato APA (American Psychological Association) para múltiples tipos de fuentes, incluyendo contenidos generados por modelos de inteligencia artificial (IA). La aplicación aborda la necesidad académica de citar correctamente fuentes digitales y de IA, que no están completamente estandarizadas en las normas APA tradicionales.

## Problema que resuelve
- **Citas de IA**: Proporciona un formato estandarizado para citar modelos de lenguaje como ChatGPT, Gemini, Claude, etc., siguiendo las recomendaciones más recientes de APA para fuentes de IA.
- **Automatización**: Reduce errores humanos en la formateo de referencias bibliográficas, que son comunes en trabajos académicos.
- **Accesibilidad**: Ofrece una interfaz intuitiva para estudiantes sin conocimientos avanzados de normas de citación.
- **Historial**: Permite a los usuarios mantener un registro de todas sus citas generadas para reutilización y exportación.

## Tipo de usuarios
- **Estudiantes de posgrado**: Usuarios principales que generan citas para tesis, artículos y trabajos académicos.
- **Administradores**: Personal institucional que supervisa métricas globales, gestiona usuarios y mantiene catálogos de modelos y programas educativos.

## Tecnologías utilizadas
- **Frontend**: HTML5, CSS3, JavaScript ES6+ con módulos nativos.
- **Backend como servicio**: Supabase (PostgreSQL + Auth + API REST).
- **Librerías externas**: Marked.js (renderizado Markdown), DOMPurify (sanitización HTML).
- **Arquitectura**: SPA ligera sin framework JavaScript, enfoque modular.

## Tipo de arquitectura
Arquitectura frontend pura con backend como servicio (BaaS). El cliente maneja toda la lógica de UI y validaciones, mientras que Supabase proporciona autenticación, base de datos y API. No hay servidor propio; todo se ejecuta en el navegador con llamadas REST a Supabase.

# 2. Arquitectura del sistema

## Explicación del enfoque (SPA ligera sin framework)
La aplicación utiliza una arquitectura de Single Page Application (SPA) minimalista sin frameworks pesados como React o Vue. En su lugar, emplea:
- **Módulos ES6 nativos** para separación de responsabilidades.
- **Manipulación directa del DOM** con vanilla JavaScript.
- **Carga dinámica de contenido** mediante fetch API e inyección de HTML.
- **Estado global mínimo** manejado a través de localStorage y variables de módulo.

Este enfoque reduce la complejidad y el tamaño del bundle, ideal para una aplicación académica con requisitos moderados de interactividad.

## Separación de responsabilidades
- **UI/UX**: Archivos HTML para estructura, CSS para estilos, JavaScript para interactividad.
- **Lógica de negocio**: Módulos separados (auth.js, citations.js, generador.js).
- **Configuración**: supabaseClient.js centraliza la conexión al backend.
- **Datos**: Supabase maneja persistencia, autenticación y autorización.

## Flujo general de la aplicación
1. **Acceso público**: Usuario visita index.html → carga header público → puede registrarse o iniciar sesión.
2. **Autenticación**: Registro/login → validación → redirección a generador principal (refer.html).
3. **Generación**: Selección de tipo de fuente → llenado de formulario → generación APA → guardado en BD.
4. **Historial**: Acceso a historial.html → carga citas del usuario → métricas personales.
5. **Administración**: Usuarios con rol 'admin' acceden a métricas globales y gestión de usuarios.

## Diagrama lógico explicado en texto
```
[GitHub Pages]
    └── Servidor estático hosted
        ↓
[Cliente Browser]
    ├── HTML/CSS/JS (estático)
    ├── Autenticación (Supabase Auth)
    └── API Calls (REST/WebSocket)
        ↓
[Supabase Cloud]
    ├── Auth Service (JWT tokens)
    ├── PostgreSQL Database
    │   ├── profiles (perfiles usuario)
    │   ├── citations (referencias generadas)
    │   ├── models (catálogo IA)
    │   └── programs (programas educativos)
    └── REST API (CRUD operations)
```

El flujo de datos es unidireccional desde el cliente hacia Supabase, con respuestas JSON que se renderizan dinámicamente en el DOM.

# 3. Estructura del proyecto

## Árbol de carpetas y archivos
```
REFER/
├── index.html              # Página de bienvenida pública
├── login.html              # Formulario de inicio de sesión
├── registro.html           # Formulario de registro
├── refer.html              # Generador principal de referencias
├── historial.html          # Historial y métricas de usuario
├── header.html             # Navegación para usuarios no autenticados
├── header-logged.html      # Navegación para usuarios autenticados
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

## Explicación del propósito de cada archivo clave

### auth.js
Implementa la capa de autenticación completa:
- `requireAuth()`: Protege rutas que requieren sesión activa.
- `requireGuest()`: Redirige usuarios autenticados de páginas públicas.
- `requireAdmin()`: Valida permisos de administrador.
- `initAuthListener()`: Escucha cambios de estado de autenticación.
- Manejo de tokens JWT y redirecciones automáticas.

### supabaseClient.js
Configuración centralizada del cliente Supabase:
- Instancia global de Supabase con URL y clave anónima.
- Configuración de opciones (auth, realtime).
- Punto único de configuración para cambios de entorno.

### dashboard.js
Controla la lógica del dashboard principal:
- Determina el rol del usuario (admin vs user).
- Redirige a funciones específicas según permisos.
- Inicializa secciones de historial o métricas.

### citations.js
Maneja todas las operaciones CRUD de citas:
- `saveCitation()`: Inserta nuevas referencias en la base de datos.
- `getUserCitations()`: Recupera historial del usuario con joins.
- `normalizeMetadata()`: Estandariza datos antes de guardar.
- Integración con lógica de formateo APA.

### historial.js
Gestiona la visualización del historial:
- `renderHistorial()`: Renderiza tabla de citas con markdown.
- `exportToHTML()`: Genera documento HTML para descarga.
- Integración con Marked.js para renderizado de prompts/respuestas.

### metrics.js
Panel administrativo básico:
- Carga métricas globales de uso.
- Renderiza dashboard para administradores.
- Integración con adminDashboard.js para funcionalidades avanzadas.

### adminDashboard.js
Dashboard completo de administración:
- `renderAdminDashboard()`: Muestra métricas globales.
- Gestión de usuarios con filtros y búsqueda.
- Historial global con paginación.
- Cálculos de estadísticas por usuario y globales.

### userManagement.js
Funcionalidades de gestión de usuarios:
- `loadUsers()`: Carga lista de usuarios con joins.
- Tablas filtrables por rol, programa, etc.
- Cálculo de métricas por usuario.

### ui-menu.js
Control de interfaz responsive:
- Manejo del menú hamburguesa en móviles.
- Toggle de visibilidad de elementos.
- Eventos de click para navegación móvil.

### Otros relevantes
- **app.js**: Inicialización global, carga de módulos principales.
- **login.js/registro.js**: Validación y envío de formularios de auth.
- **header.js**: Carga dinámica de headers según estado de sesión.
- **generador.js**: Controla la inyección de formularios por tipo de fuente.
- **types/*.js**: Lógica específica de formateo APA por tipo de fuente.

## Diferenciación entre módulos de lógica, UI y configuración
- **Configuración**: supabaseClient.js, app.js.
- **Lógica de negocio**: citations.js, auth.js, generador.js, types/*.js.
- **UI/Interfaz**: header.js, ui-menu.js, historial.js, adminDashboard.js.
- **Datos**: userManagement.js, metrics.js, catalogos/programas.js.

## 3.A Comportamiento funcional por página
### index.html
- Propósito: pantalla de bienvenida pública que presenta el servicio y ofrece acceso a login o registro.
- Estado de acceso: pública.
- Módulos JS cargados: `header.js` para renderizar navegación, `app.js` para inicialización general si aplica.
- Elementos interactivos: botones de navegación a login y registro, enlaces de información institucional, posiblemente banners o llamadas a la acción.
- Redirecciones: si el usuario ya está autenticado, puede redirigirse automáticamente a `refer.html`; de lo contrario se mantiene en la pantalla de bienvenida.

### login.html
- Propósito: formulario de inicio de sesión para usuarios ya registrados.
- Estado de acceso: pública, pero con `requireGuest()` para usuarios autenticados.
- Módulos JS cargados: `auth.js`, `login.js`, `header.js`.
- Elementos interactivos: campos de email y contraseña, botón de envío, enlace a registro, mensajes de error de validación.
- Redirecciones: envía a `refer.html` tras login exitoso; si ya hay sesión activa, redirige fuera de esta página.

### registro.html
- Propósito: formulario de creación de cuenta para nuevos usuarios.
- Estado de acceso: pública, con restricción de `requireGuest()` para quien ya tenga sesión.
- Módulos JS cargados: `auth.js`, `registro.js`, `header.js`, `catalogos/programas.js`.
- Elementos interactivos: selección de nivel educativo, división y programa, campos de nombre, email, contraseña y confirmación, checkbox de privacidad.
- Redirecciones: tras registro exitoso y confirmación, dirige a `refer.html`; si el usuario ya tiene sesión activa, redirige fuera de esta página.

### refer.html
- Propósito: interfaz principal de generación de referencias bibliográficas.
- Estado de acceso: requiere sesión autenticada (`requireAuth()`).
- Módulos JS cargados: `auth.js`, `header.js`, `generador.js`, `modules/generador/types/ia.js`, `modules/generador/types/libro.js`, `modules/generador/types/articulo.js`, `modules/generador/types/web.js`, `citations.js`.
- Elementos interactivos: selector de tipo de fuente, formularios dinámicos según tipo, campos de entrada para metadata, botón de generar y copiar referencia, visualización del resultado.
- Redirecciones: si no hay sesión valida, redirige a `index.html` o login; si el rol del usuario no coincide con el acceso, puede redirigir a la página adecuada.

### historial.html
- Propósito: mostrar historial de citas y métricas de uso para el usuario, y estadísticas globales para administradores.
- Estado de acceso: requiere sesión autenticada; parte del contenido puede requerir rol admin para funciones avanzadas.
- Módulos JS cargados: `auth.js`, `dashboard.js`, `historial.js`, `metrics.js`, `adminDashboard.js`, `userManagement.js`, `header.js`.
- Elementos interactivos: filtros, búsquedas, tablas de citas, botones de exportación, tarjetas de métricas, paneles de administración.
- Redirecciones: si no hay sesión valida, redirige a `index.html`; si usuario es admin puede acceder a métricas extendidas, en caso contrario se muestra solo historial personal.

# 4. Gestión de autenticación

## Cómo funciona Supabase Auth
La aplicación utiliza Supabase Auth para manejar autenticación basada en email/contraseña con tokens JWT. Supabase proporciona:
- Registro de usuarios con verificación de email.
- Inicio de sesión con validación de credenciales.
- Gestión automática de sesiones y tokens.
- Integración con tabla `profiles` para metadatos adicionales.

## Flujo de registro e inicio de sesión
### Registro:
1. Usuario llena formulario en registro.html.
2. Validaciones: email válido, contraseñas coinciden, privacidad aceptada.
3. `handleRegister()`: Llama `supabase.auth.signUp()`.
4. Supabase crea usuario en `auth.users` y envía email de confirmación.
5. Automáticamente inserta perfil en `profiles` con rol 'user'.
6. Redirección automática a refer.html tras confirmación.

> Nota: Si un usuario intenta iniciar sesión antes de confirmar su correo, la experiencia depende de la configuración de Supabase. En el modelo habitual de esta aplicación, el intento no debería conceder acceso completo hasta que el email haya sido verificado; en ese estado intermedio, el inicio de sesión puede devolver un error de autenticación o un estado de sesión no válido, y la aplicación debe mantenerlo en la página de login hasta que confirme el correo.

### Inicio de sesión:
1. Usuario llena formulario en login.html.
2. `handleLogin()`: Llama `supabase.auth.signInWithPassword()`.
3. Supabase valida credenciales y retorna JWT.
4. `initAuthListener()` detecta evento SIGNED_IN.
5. Redirección a refer.html.

## Manejo de sesión
- **Tokens JWT**: Almacenados automáticamente por Supabase client.
- **Persistencia**: Sesiones sobreviven refrescos de página.
- **Expiración**: 24 horas por defecto, renovable automáticamente.
- **Logout**: `supabase.auth.signOut()` limpia tokens y redirige.

## Protección de rutas (requireAuth, roles, etc.)
- `requireAuth()`: Verifica sesión activa, redirige a index.html si no.
- `requireGuest()`: Verifica no sesión, redirige a refer.html si sí.
- `requireAdmin()`: Verifica rol 'admin' en perfil, acceso denegado si no.
- Implementado con listeners de estado de autenticación.

## Flujo técnico del token JWT
Supabase emite un JWT en el momento del inicio de sesión que incluye campos estándar como `sub` (identificador del usuario), `email`, `exp` (tiempo de expiración) y, en algunos casos, `role`. El token también puede transportar campos custom como `user_metadata` y `app_metadata` que contienen datos asociados al usuario, aunque en esta aplicación el uso principal es la identificación y autorización.

El cliente no guarda el token en un cookie propia; la librería de Supabase administra la sesión en el navegador y mantiene un refresh token asociado. Cada llamada a la API de Supabase se realiza incluyendo el token en el header `Authorization: Bearer <token>`, lo que permite autenticar la petición y aplicar políticas RLS en el backend.

En una reimplementación PHP, el backend debe emitir JWT equivalentes utilizando una librería como `firebase/php-jwt`, `lcobucci/jwt` o una solución nativa de Laravel/Symfony. El token debe contener al menos `sub`, `email`, `exp` y cualquier reclamo adicional necesario para el control de roles.

Cuando el token expira, el cliente intenta renovar la sesión automáticamente mediante el refresh token gestionado por la librería Supabase. Si la renovación falla, el comportamiento esperado es forzar el cierre de sesión del usuario y redirigirlo a la página de login, evitando que la sesión caducada siga permitiendo acceso.

# 5. Modelo de datos

## Descripción de las tablas principales

### profiles
Almacena perfiles de usuario extendiendo `auth.users`:
- `id`: UUID, PK, FK a auth.users.
- `full_name`: Nombre completo.
- `email`: Email (duplicado de auth.users).
- `role`: 'user' o 'admin'.
- `program_id`: FK a programs.
- `created_at/updated_at`: Timestamps.

### citations
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
- IA:
  ```json
  {
    "modelo": "ChatGPT",
    "organizacion": "OpenAI",
    "version": "4.0",
    "url": "https://chat.openai.com",
    "tema": "Uso de IA en educación",
    "fecha_consulta": "2025-11-15",
    "prompt": "Describe las ventajas de usar IA en la investigación académica.",
    "respuesta": "ChatGPT generó una explicación sobre el uso responsable de la IA..."
  }
  ```
- Libro:
  ```json
  {
    "autores": [
      {"nombre": "Laura", "apellido": "Pérez"},
      {"nombre": "Carlos", "apellido": "García"}
    ],
    "anio": 2024,
    "titulo": "Metodología de la investigación",
    "editorial": "Editorial Universitaria",
    "doi_url": "https://doi.org/10.1234/ejemplo"
  }
  ```
- Artículo:
  ```json
  {
    "autores": [
      {"nombre": "Ana", "apellido": "López"}
    ],
    "anio": 2023,
    "titulo": "Inteligencia artificial y evaluación",
    "revista": "Revista Científica",
    "volumen": "12",
    "numero": "3",
    "paginas": "45-60",
    "doi_url": "https://doi.org/10.5678/ejemplo"
  }
  ```
- Web:
  ```json
  {
    "autor": "Instituto Nacional de Estudios",
    "anio": 2024,
    "mes": "marzo",
    "dia": 10,
    "titulo": "Políticas de acceso abierto",
    "sitio": "INEI",
    "url": "https://www.ejemplo.edu/politicas",
    "fecha_recuperacion": "2024-11-05"
  }
  ```

### models
Catálogo de modelos de IA:
- `id`: UUID, PK.
- `name`: Nombre del modelo (ej: "ChatGPT").
- `organization_responsible`: Empresa (ej: "OpenAI").
- `model_url`: URL oficial.
- `created_at`: Timestamp.

Datos precargados incluyen ChatGPT, Gemini, Claude, etc.

## Relaciones entre tablas
- `profiles` → `auth.users`: 1:1 (id).
- `profiles` → `programs`: N:1 (program_id).
- `citations` → `profiles`: N:1 (user_id).
- `citations` → `models`: N:1 opcional (model_id).
- `programs`: Independiente, referenciado por profiles.

## Campos importantes y su propósito
- **citations.citation_text**: Resultado final APA, usado para display y copia.
- **citations.metadata**: JSON para campos variables por tipo de fuente.
- **profiles.role**: Control de acceso (user/admin).
- **models**: Cache local para autocompletado en formularios.

## Uso de RLS (Row Level Security)
- **citations**: Usuarios solo ven sus citas (user_id = auth.uid()). Admins ven todas.
- **profiles**: Usuarios ven solo su perfil. Admins ven todos.
- Políticas aplicadas en Supabase para seguridad a nivel base de datos.

## Esquema SQL de referencia
La implementación actual utiliza Supabase/PostgreSQL, pero los tipos presentados son equivalentes en MySQL con ajustes menores como `UUID` → `CHAR(36)` o `VARCHAR(36)` y `JSONB` → `JSON`.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  program_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (program_id) REFERENCES programs(id)
);

CREATE TABLE citations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  model_id UUID,
  model_name_custom VARCHAR(255),
  organization_custom VARCHAR(255),
  version VARCHAR(100),
  consulta_fecha DATE,
  tema VARCHAR(500) NOT NULL,
  prompt TEXT,
  llm_response TEXT,
  citation_text TEXT NOT NULL,
  source_type VARCHAR(20) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES profiles(id),
  FOREIGN KEY (model_id) REFERENCES models(id)
);

CREATE TABLE models (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  organization_responsible VARCHAR(255) NOT NULL,
  model_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE programs (
  id UUID PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  nivel VARCHAR(100),
  division VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_citations_user_created ON citations(user_id, created_at);
CREATE INDEX idx_citations_model ON citations(model_id);
CREATE INDEX idx_profiles_program ON profiles(program_id);
```

En la implementación actual existen triggers o secuencias lógicas de aplicación que aseguran la inserción automática de un registro en `profiles` cuando un usuario se crea en `auth.users`. Ese mecanismo, propio de Supabase, se materializa como una operación complementaria al registro de Auth, aunque no está expresada como un trigger SQL visible en este documento.

# 6. Flujo de generación de citas

## Cómo el usuario genera una cita
1. Usuario autenticado accede a refer.html.
2. Selecciona tipo de fuente (IA, Libro, Artículo, Web).
3. generador.js carga dinámicamente el módulo correspondiente.
4. Usuario llena formulario específico.
5. Al enviar, se valida y genera referencia APA.
6. Se guarda en BD y muestra resultado.

## Cómo se relaciona con models
Para citas de IA:
- Selector carga modelos desde tabla `models`.
- Autocompletado por URL usando `catalogoIAporDominio`.
- Si selecciona "Otro modelo", campos custom activados.
- `model_id` se guarda si existe en catálogo, sino `model_name_custom`.
`catalogoIAporDominio` es una estructura de mapeo que relaciona dominios de URL con modelos de IA conocidos. Su forma típica es un objeto o array en el módulo `ia.js` que contiene pares como `"chat.openai.com" → { name: "ChatGPT", organization: "OpenAI", url: "https://chat.openai.com" }`. Cuando el usuario ingresa una URL de plataforma, el código extrae el dominio y busca coincidencias en ese catálogo para autocompletar el modelo y la organización responsable. Esta lógica vive principalmente en `ia.js`, con el soporte de `generador.js` para manejar el flujo del formulario de IA.
## Manejo de campos personalizados
- Campos requeridos marcados con *.
- Validación HTML5 + JavaScript.
- Metadata normalizada antes de guardar.
- Campos opcionales (prompt, respuesta) renderizados con markdown.

## Lógica del motor APA (apa.js, si aplica)
No hay apa.js separado; lógica distribuida en types/*.js:
- **ia.js**: `OpenAI (2025). ChatGPT (v 4.0) [Modelo de lenguaje]. https://chat.openai.com`
  - Campos obligatorios: organización, año de consulta, nombre del modelo, URL.
  - Campos opcionales: versión del modelo y texto adicional de tipo de fuente.
- **libro.js**: `Apellido, I. (YYYY). Título. Editorial.`
- **articulo.js**: Según subtipo (revista, web, periódico).
- **web.js**: `[Autor]. (YYYY). [Título]. Retrieved from [URL]`

## Persistencia en base de datos
- `saveCitation()` en citations.js.
- INSERT en `citations` con todos los campos.
- Metadata como JSON para flexibilidad.
- Retorna ID de cita para confirmación.

## 6.A Catálogo de operaciones y equivalencias de API
A continuación se describen las operaciones que el frontend realiza contra Supabase para el equipo de migración.

- `citations.js` → `saveCitation()`
  - Tipo: INSERT.
  - Tabla: `citations`.
  - Filtros: ninguno en la insert; el payload incluye `user_id`.
  - Payload: `{ user_id, model_id, model_name_custom, organization_custom, version, consulta_fecha, tema, prompt, llm_response, citation_text, source_type, metadata }`.
  - Resultado esperado: registro creado con `id` y metadatos de insert, confirmación de éxito.
  - SQL equivalente:
    ```sql
    INSERT INTO citations (id, user_id, model_id, model_name_custom, organization_custom, version, consulta_fecha, tema, prompt, llm_response, citation_text, source_type, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    ```

- `citations.js` → `getUserCitations(userId)`
  - Tipo: SELECT.
  - Tablas: `citations`, `models`.
  - Filtros: `WHERE user_id = auth.uid()` o `WHERE citations.user_id = ?`.
  - Payload: `{ userId }` en la ruta o token.
  - Resultado esperado: lista de citas del usuario con datos de modelo adjuntos.
  - SQL equivalente:
    ```sql
    SELECT citations.*, models.name AS model_name, models.organization_responsible
    FROM citations
    LEFT JOIN models ON citations.model_id = models.id
    WHERE citations.user_id = ?
    ORDER BY citations.created_at DESC;
    ```

- `dashboard.js` / `historial.js` → `getUserCitations(userId)`
  - Tipo: SELECT.
  - Tablas: `citations`, `models`.
  - Filtros: `WHERE citations.user_id = ?`.
  - Payload: `{ userId }`.
  - Resultado esperado: historial personal y métricas de uso.
  - SQL equivalente: mismo que el caso anterior.

- `adminDashboard.js` / `userManagement.js` → `loadUsers()`
  - Tipo: SELECT.
  - Tablas: `profiles`, `programs`, posiblemente `citations`.
  - Filtros: ninguno o `WHERE role = 'admin'`/`WHERE role = 'user'` según búsqueda.
  - Payload: parámetros de filtro opcionales.
  - Resultado esperado: lista de usuarios con programa y conteos de citas.
  - SQL equivalente:
    ```sql
    SELECT profiles.*, programs.nombre AS program_name, COUNT(citations.id) AS citation_count
    FROM profiles
    LEFT JOIN programs ON profiles.program_id = programs.id
    LEFT JOIN citations ON citations.user_id = profiles.id
    GROUP BY profiles.id, programs.nombre;
    ```

- `metrics.js` / `adminDashboard.js` → consultas de métricas globales
  - Tipo: SELECT.
  - Tablas: `citations`, `profiles`, `models`, `programs`.
  - Filtros: ninguno para totales globales; pueden aplicarse por programa o rol.
  - Payload: parámetros de filtro opcionales.
  - Resultado esperado: totales de citas, usuarios activos, distribución de modelos.
  - SQL equivalente:
    ```sql
    SELECT COUNT(*) AS total_citations FROM citations;
    SELECT profiles.role, COUNT(*) AS user_count FROM profiles GROUP BY profiles.role;
    SELECT models.name, COUNT(citations.id) AS usage_count
    FROM citations
    LEFT JOIN models ON citations.model_id = models.id
    GROUP BY models.name;
    ```

## Reglas de construcción APA por tipo de fuente
### IA
- Plantilla completa: `Organización (Año). Nombre del modelo (v Versión) [Modelo de lenguaje]. URL`.
- Obligatorios: organización, año de consulta, nombre del modelo, URL.
- Opcionales: versión del modelo, texto indicativo de tipo de fuente si no se agrega automáticamente.
- Reglas de formato: la organización va en mayúscula inicial y se separa con punto; el nombre del modelo aparece con mayúscula inicial; la versión se agrega entre paréntesis precedida de `v`; la URL se coloca al final.
- Ejemplo:
  `OpenAI (2025). ChatGPT (v 4.0) [Modelo de lenguaje]. https://chat.openai.com`

### Libro
- Plantilla completa: `Apellido, Iniciales. (Año). Título del libro. Editorial.`
- Obligatorios: autor(es), año, título, editorial.
- Opcionales: DOI o URL del libro.
- Reglas de formato: los apellidos se escriben con mayúscula inicial; las iniciales del nombre van seguidas de punto; el título del libro se mantiene en mayúscula de frase; la editorial va sin cursivas en este documento, pero en APA el título completo debería ir en cursiva.
- Manejo de múltiples autores: se separa cada autor con coma y antes del último se utiliza `&`.
- Ejemplo:
  `Pérez, L., & García, C. (2024). Metodología de la investigación. Editorial Universitaria.`

### Artículo
- Plantilla completa: `Apellido, Iniciales. (Año). Título del artículo. Nombre de la revista, Volumen(Número), páginas.`
- Obligatorios: autor(es), año, título del artículo, nombre de la revista, volumen y páginas.
- Opcionales: número de edición y DOI.
- Reglas de formato: el título del artículo se escribe en mayúscula de frase; el nombre de la revista va en mayúsculas en cada palabra y se presentaría en cursiva en APA; se coloca una coma entre nombre de revista y volumen, y paréntesis alrededor del número.
- Manejo de múltiples autores: se separa con coma y `&` antes del último autor.
- Ejemplo:
  `López, A. (2023). Inteligencia artificial y evaluación. Revista Científica, 12(3), 45-60.`

### Web
- Plantilla completa: `Autor. (Año, Mes Día). Título de la página. Recuperado Fecha de recuperación, de URL`.
- Obligatorios: autor o entidad responsable, año, título, URL.
- Opcionales: mes, día, fecha de recuperación.
- Reglas de formato: el autor puede ser una organización; la fecha de recuperación se incluye si la página es mutable o no tiene fecha de publicación exacta; el título se escribe en mayúscula de frase.
- Ejemplo:
  `Instituto Nacional de Estudios. (2024, marzo 10). Políticas de acceso abierto. Recuperado 5 de noviembre de 2024, de https://www.ejemplo.edu/politicas`

# 7. Historial de usuario

## Cómo se obtienen las citas
- `getUserCitations(userId)`: SELECT con LEFT JOIN a models.
- Ordenado por created_at DESC.
- Filtrado por user_id (RLS adicional).

## Uso de joins con models
- LEFT JOIN para incluir nombre de modelo si existe.
- Si model_id null, usar model_name_custom.
- Optimizado con índices en (user_id, created_at).

## Renderizado en frontend
- Tabla HTML con filas por cita.
- Markdown renderizado con Marked.js.
- Sanitización con DOMPurify.
- Fechas formateadas localmente.

## Consideraciones de rendimiento
- Actualmente, todas las citas se cargan en una sola consulta sin paginación real. Esto es una limitación técnica conocida que puede degradar el rendimiento para usuarios con historial extenso.
- Cache local de modelos para evitar queries repetidas.
- Queries optimizadas con índices.
- La paginación real está pendiente como mejora futura para reducir el volumen de datos transferidos y el tiempo de renderizado.

# 8. Panel administrativo

## Funcionalidades disponibles
- Dashboard global con métricas.
- Gestión de usuarios: lista, filtros, búsqueda.
- Historial global de todas las citas.
- Exportación de datos (CSV implícito).

## Métricas globales
- Total citas, usuarios activos.
- Distribución de modelos con colores.
- Top modelo global.
- Estadísticas por programa educativo.

## Gestión de usuarios
- Tabla con nombre, programa, email, rol, #citas, top-modelo.
- Filtros por rol, búsqueda por nombre/email.
- Cálculo automático de métricas por usuario.

## Filtros y consultas a Supabase
- Queries con WHERE para filtros.
- JOINs para datos relacionados.
- ORDER BY para ordenamiento.
- COUNT y GROUP BY para agregados.

# 9. Seguridad

## Uso de RLS
- Políticas en Supabase: usuarios solo acceden a sus datos.
- Admins tienen acceso total.
- Aplicado a citations y profiles.

## Validación de roles
- `requireAdmin()` verifica rol en perfil.
- Control de UI: elementos admin ocultos para users.

## Protección de datos
- Sanitización HTML con DOMPurify.
- Escape de caracteres especiales.
- Validación de entrada en cliente.

## Riesgos conocidos
- Credenciales públicas en cliente.
  - Por qué existe: el modelo BaaS/frontend-puro expone `SUPABASE_URL` y `SUPABASE_ANON_KEY` en el navegador, lo que permite que un tercero inspeccione y reutilice esas credenciales.
  - Mitigación mínima: usar políticas RLS estrictas en Supabase y, cuando sea posible, mover la lógica sensible a un backend intermedio.
- Sin validación server-side.
  - Por qué existe: el cliente realiza toda la validación y envía datos directamente a Supabase, de modo que un atacante puede manipular peticiones JSON fuera de la UI.
  - Mitigación mínima: definir validaciones y restricciones en la base de datos o en funciones de Supabase para complementar las comprobaciones de cliente.
- Sin rate limiting.
  - Por qué existe: en una arquitectura sin servidor propio, no hay control de límites de solicitudes en la capa de aplicación, y Supabase no impone límites granulares por defecto.
  - Mitigación mínima: configurar límites en Supabase o usar un proxy/backend que aplique throttling en las rutas críticas.
- Posible bypass de validaciones cliente.
  - Por qué existe: al ejecutarse todo el código en el navegador, un usuario puede modificar formularios y peticiones antes de enviarlos.
  - Mitigación mínima: reforzar la seguridad con RLS, triggers y comprobaciones de esquema en la base de datos.

# 10. Despliegue actual

## Uso de GitHub Pages (frontend)
- Archivos estáticos servidos desde GitHub Pages.
- Sin build step, archivos subidos directamente.

## Dependencia de Supabase como backend
- Todo el backend en Supabase Cloud.
- Requiere proyecto activo y configurado.

## Variables de entorno necesarias
- SUPABASE_URL
- SUPABASE_ANON_KEY
- Configuradas en supabaseClient.js

# 11. Guía de migración

## Fase 1 — Preparación del entorno
- Requisitos mínimos del servidor:
  - PHP 8.0 o superior.
  - MySQL 8.0+ o MariaDB 10.6+.
  - Apache con mod_rewrite habilitado o Nginx con reglas de reescritura equivalentes.
  - HTTPS obligatorio en producción.
  - Redis o Memcached opcional para caching de sesiones y datos si se requiere escalabilidad.
- Herramientas necesarias:
  - Composer para librerías PHP.
  - Cliente MySQL / phpMyAdmin / Adminer para gestión de base de datos.
  - Postman o cURL para pruebas de API.
  - Git para control de versiones.
  - Editor de código y servidor local de pruebas.
- Preparación adicional:
  - Crear un entorno de desarrollo separado del entorno de producción.
  - Configurar backup periódico de base de datos y archivos.
  - Verificar que el servidor puede resolver HTTPS y que no bloquea llamadas externas si se integran servicios adicionales.

## Fase 2 — Migración de la base de datos
- Exportar el esquema de Supabase:
  - Usar la consola de Supabase o el CLI para generar el SQL del esquema.
  - Exportar datos de las tablas principales: `profiles`, `citations`, `models`, `programs`.
- Adaptaciones para MySQL/MariaDB:
  - `UUID` → `CHAR(36)` o `VARCHAR(36)`.
  - `JSONB` → `JSON`.
  - `TIMESTAMP WITH TIME ZONE` → `DATETIME` o `TIMESTAMP`.
  - `ENUM` → `VARCHAR(20)` con comprobaciones de integridad a nivel de aplicación o `CHECK` donde lo soporte la base.
- Definición de tablas de referencia:
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
    id CHAR(36) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    program_id CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
- Triggers o funciones automáticas:
  - En la implementación actual, la inserción de un usuario en `auth.users` dispara la creación complementaria de un registro en `profiles`.
  - Para MySQL, ese comportamiento puede implementarse en PHP dentro del endpoint de registro o con un trigger `AFTER INSERT` sobre la tabla de usuarios si se mantiene separada.
- Migración de datos:
  - Exportar los datos existentes desde Supabase en formato CSV o SQL.
  - Ajustar campos JSON para que sean compatibles con MySQL.
  - Importar primero `programs`, luego `profiles`, `models` y finalmente `citations` para respetar dependencias.
  - Conservar los identificadores UUID como cadenas.

## Fase 3 — Reemplazo de Supabase Auth
- Librería JWT recomendada para PHP:
  - `firebase/php-jwt`, `lcobucci/jwt` o el sistema de tokens de Laravel/Symfony.
- Endpoints necesarios:
  - `POST /api/auth/register`:
    - Input: `full_name`, `email`, `password`, `program_id`, `role` opcional.
    - Proceso: validar datos, hashear contraseña con `password_hash()`, insertar en `users` y `profiles`, devolver token o mensaje de confirmación.
  - `POST /api/auth/login`:
    - Input: `email`, `password`.
    - Proceso: verificar credenciales con `password_verify()`, emitir JWT con `sub`, `email`, `role`, `exp` y cualquier claim adicional.
  - `POST /api/auth/logout`:
    - Input: token de refresh o header Authorization.
    - Proceso: invalidar refresh token en backend o limpiar sesión del cliente.
  - `POST /api/auth/refresh`:
    - Input: refresh token válido.
    - Proceso: validar refresh token, emitir nuevo JWT y posiblemente nuevo refresh token.
- Protección de rutas:
  - Implementar middleware que valide el JWT en el header `Authorization: Bearer <token>`.
  - Verificar el campo `exp` y rechazar tokens expirados.
  - Para rutas admin, comprobar el campo `role = 'admin'` en el payload.
- Expiración y refresh:
  - El backend debe devolver un token con expiración acotada y un refresh token persistente.
  - Si el refresh falla, el cliente debe cerrar sesión forzosamente y redirigir a login.

## Fase 4 — Reemplazo de la API REST de Supabase
Derivar los endpoints a partir del catálogo de operaciones publicado en este informe:

- `GET /api/models`
  - Descripción: devuelve el catálogo de modelos IA.
  - Output: lista de objetos `{ id, name, organization_responsible, model_url }`.
- `GET /api/programs`
  - Descripción: devuelve la lista de programas educativos.
  - Output: lista de objetos `{ id, nombre, nivel, division }`.
- `POST /api/citations`
  - Descripción: crea una nueva cita.
  - Input: `{ user_id, model_id, model_name_custom, organization_custom, version, consulta_fecha, tema, prompt, llm_response, citation_text, source_type, metadata }`.
  - Output: `{ id, created_at }` o confirmación de éxito.
- `GET /api/citations`
  - Descripción: obtiene las citas del usuario autenticado.
  - Filtros: `user_id` extraído del JWT.
  - Output: lista de citas con datos de modelo.
- `GET /api/users`
  - Descripción: lista de usuarios para administración.
  - Output: usuarios con programa y conteo de citas.
- `GET /api/metrics`
  - Descripción: totales globales y distribución de modelos.
  - Output: métricas agregadas.

Adicionalmente pueden implementarse endpoints complementarios:
- `GET /api/citations/{id}` para details de una cita.
- `PUT /api/citations/{id}` para actualizaciones si se requiere edición.
- `DELETE /api/citations/{id}` solo si se decide soportar eliminación.

## Fase 5 — Adaptación del frontend
- Cambiar la configuración en `supabaseClient.js` o su reemplazo para apuntar al nuevo backend PHP. En una migración efectiva este archivo deja de usar el cliente Supabase y pasa a usar `fetch` contra los nuevos endpoints.
- Módulos JavaScript que necesitan ajustes mínimos:
  - `auth.js`: adaptar los flujos de login/register/logout para usar la API propia.
  - `citations.js`: reemplazar llamadas a `supabase.from('citations')` por `fetch('/api/citations')`.
  - `dashboard.js`, `historial.js`, `adminDashboard.js`, `userManagement.js`: adaptar las consultas de datos a los nuevos endpoints.
- Mantener los archivos HTML principales y la estructura del DOM, siempre que los `id` y clases esperados por los scripts no cambien.

## Fase 6 — Verificación
Lista de comprobación funcional:
- Registro de un usuario nuevo y creación de perfil en la base de datos.
- Inicio de sesión con credenciales válidas y obtención de JWT.
- Generación de una cita de IA, guardado en `citations` y visualización del resultado.
- Generación de citas de libro, artículo y web.
- Consulta del historial de usuario y renderizado correcto del listado.
- Exportación o descarga de historial desde la interfaz.
- Acceso a la sección admin con credenciales de rol `admin` y visualización de métricas globales.
- Comprobación de que un usuario no admin no ve funcionalidades de administración.
- Prueba de expiración de sesión: el refresh token renueva el acceso y, si falla, obliga logout.

# 12. Extensibilidad

## Cómo agregar nuevos tipos de citas
- Crear nuevo archivo en types/.
- Agregar opción en generador.js.
- Implementar buildAPA específico.

## Cómo agregar nuevos modelos de IA
- INSERT en tabla models.
- Actualizar catalogoIAporDominio si aplica.

## Cómo escalar el sistema
- Separar frontend/backend.
- Agregar caching.
- Implementar paginación real.

# 13. Recomendaciones técnicas

## Mejoras futuras
- Migrar a framework (React/Vue).
- Separar frontend/backend.
- Agregar tests.

## Posible migración a framework
- React para mejor mantenibilidad.
- Componentes reutilizables.

## Separación frontend/backend
- API REST propia.
- Mejor seguridad.
- Escalabilidad.

# 14. Glosario de términos del sistema

- **BaaS**: Backend as a Service. En REFER se refiere a la dependencia de Supabase para autenticación, base de datos y API sin un servidor propio.
- **SPA**: Single Page Application. La aplicación es una SPA ligera que usa JavaScript modular para actualizar el DOM sin un framework pesado.
- **RLS**: Row Level Security. Políticas aplicadas en Supabase para que cada usuario solo acceda a sus propios datos.
- **JWT**: JSON Web Token. Token de autenticación emitido por Supabase y enviado en cada petición API dentro del header `Authorization: Bearer`.
- **refresh token**: Token de larga duración usado para renovar el JWT cuando expira, administrado por el cliente y el backend.
- **source_type**: Campo de la tabla `citations` que indica el tipo de referencia (`ia`, `book`, `article`, `web`).
- **metadata (campo JSON)**: Objeto JSON en `citations.metadata` que guarda datos variables según el tipo de fuente, como autores, URL, fecha de consulta y respuesta del modelo.
- **catalogoIAporDominio**: Mapeo de dominios de URL a modelos de IA conocidos utilizado para autocompletar el nombre del modelo y la organización responsable en citas de IA.
- **citation_text**: Texto final de la referencia en formato APA generado por el frontend y almacenado en la tabla `citations`.
- **profiles**: Tabla de perfiles de usuario asociada a `auth.users`, que almacena nombre, email, rol y programa educativo.
- **models**: Tabla de catálogo de modelos de IA con nombre, organización responsable y URL oficial.
- **programs**: Tabla de programas educativos que vincula usuarios con el contexto académico.
- **rol user**: Usuario estándar que puede generar citas y consultar su propio historial.
- **rol admin**: Usuario con permisos para ver métricas globales, gestión de usuarios e historial general.
- **requireAuth**: Función que protege páginas para usuarios autenticados; si no hay sesión activa, redirige fuera de la página.
- **requireAdmin**: Función que valida el rol de administrador antes de permitir acceso a secciones de administración.
- **normalizeMetadata**: Función que estandariza y normaliza los campos de metadatos antes de guardarlos en `citations.metadata`.
- **buildAPA**: Función de generación de texto APA que toma los datos de entrada y construye la referencia final según las reglas del tipo de fuente.
