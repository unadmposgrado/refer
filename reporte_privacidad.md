# Reporte de Uso de Datos y Cookies - Proyecto Refer

Este reporte detalla los hallazgos tras la exploración del proyecto para identificar mecanismos de almacenamiento de información del usuario y rastreo, con el fin de actualizar el aviso de privacidad.

## 1. Métodos de Almacenamiento Técnico
Aunque el código personalizado del proyecto no manipula directamente `document.cookie`, el sistema utiliza **almacenamiento local (LocalStorage)** a través de la integración con **Supabase**:
*   **Finalidad**: Mantener la sesión del usuario iniciada de forma persistente.
*   **Funcionamiento**: Supabase guarda tokens de acceso y refresco en el `localStorage` del navegador para evitar re-autenticaciones innecesarias al navegar entre páginas.
*   **Datos almacenados**: ID de sesión, tokens de autenticación (JWT) y metadatos básicos del perfil.

## 2. Información del Usuario Recopilada
El proyecto recolecta y almacena en la base de datos (Supabase) los siguientes datos proporcionados durante el registro (`js/registro.js`):
*   **Identidad**: Nombre completo y correo electrónico.
*   **Perfil Académico**: Tipo de usuario (estudiante, académico, externo), matrícula, nivel educativo, división académica y programa educativo.
*   **Metadatos**: Institución y disciplina (específicamente para usuarios externos).

## 3. Rastreo de Actividad e Historial
El sistema realiza un seguimiento de la actividad funcional del usuario:
*   **Historial de Citaciones**: Se registra cada referencia generada en la tabla `citations`, vinculándola permanentemente al `user_id` del autor (`js/citations.js`).
*   **Métricas Administrativas**: El sistema registra el uso de modelos de IA, temas consultados y fechas de actividad para fines estadísticos y de administración (`js/adminDashboard.js`).

## 4. Terceros y Rastreo Externo
*   **Scripts de Seguimiento**: **No se detectó** la presencia de herramientas de terceros para análisis de tráfico o marketing (como Google Analytics, Facebook Pixel o Hotjar).
*   **Dependencias Externas**: El proyecto utiliza CDNs para bibliotecas funcionales (`marked`, `dompurify`, `supabase-js`), las cuales son necesarias para la operación técnica pero no se utilizan para rastreo conductual en el código del proyecto.

## Recomendaciones para el Aviso de Privacidad
Se sugiere declarar explícitamente:
1. El uso de **tecnologías de almacenamiento local** para fines estrictamente funcionales (sesión de usuario).
2. La **finalidad de la recolección de datos académicos**, orientada a la personalización de las referencias y validación de la comunidad universitaria.
3. La existencia de un **historial de actividad** que el usuario puede consultar y que se utiliza para la mejora del servicio.
4. La **ausencia de transferencia de datos** a terceros con fines publicitarios.
