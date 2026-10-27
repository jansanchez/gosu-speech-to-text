# Matriz de funciones · GOSU Speech to Text 0.3

Los estados describen el código entregado; no equivalen a una certificación multiplataforma. VALIDACION.md identifica las pruebas ejecutadas.

| Función | Escritorio | Chrome independiente |
|---|---|---|
| Dictado local por tramos | Faster Whisper, motor incluido al empaquetar | Whisper tiny WASM |
| Selección de idiomas | 32 opciones visibles + códigos Whisper admitidos por API | 32 opciones visibles |
| Órdenes concretas | Español y equivalencias parciales inglés | Gramática limitada español/inglés |
| Deshacer / rehacer | Sí, versiones y agrupación de escritura manual | Sí, operaciones de dictado/edición |
| Selección por voz | Aparición única | Selección manual |
| Reemplazos ambiguos numerados | Botones y «opción N» | Pide selección manual |
| Corrección/redacción/traducción libre | Ollama local opcional, propuesta revisable | Pendiente |
| Confirmar/cancelar propuesta con voz | Sí | No aplica |
| Aprendizaje confirmado | Guardar/olvidar reemplazos explícitos | Reglas manuales |
| Muletillas y diccionario | Manual y reversible mediante versiones | Manual |
| Puntuación hablada | Opcional español/inglés | Opcional español/inglés |
| Dudas del reconocedor | Señales del último tramo y selección al pulsar | No se inventan valores de confianza |
| Bandeja, títulos, etiquetas, favoritos | Sí | Un borrador activo con versiones |
| Unir / dividir | Sí | Pendiente |
| Plantillas | Botones y orden de voz | Botones |
| Búsqueda normal | Texto, título y etiquetas | No hay bandeja de múltiples borradores |
| Búsqueda semántica | Modelo Ollama opcional, hasta 300 borradores | Pendiente |
| Cola de audio recuperable | IndexedDB y deduplicación por ID | IndexedDB y deduplicación por ID |
| Escuchar audio pendiente | Sí | Pendiente |
| Importar grabaciones | Hasta 40 MB / 30 minutos, formato decodificable | Mismos límites |
| Sesión privada | Solo memoria, sin guardar automáticamente | Solo memoria |
| Respaldo completo | Sin cifrar o AES-GCM con contraseña | Exporta un borrador compatible con escritorio |
| Restaurar respaldo | Bandeja, versiones, preferencias y plantillas | Borrador activo, versiones, preferencias y plantillas |
| Limpieza por antigüedad | Manual, confirmada; conserva favoritos y pendientes | Borrado manual |
| Lectura de voz | Voces locales del sistema | Voces locales del sistema |
| Alto contraste / tamaño | Sí / sí | Sí / controles del navegador |
| Portapapeles | Sí | Sí |
| Pegado externo Windows | Adaptador confirmado en versión anterior; repetir pruebas 0.3 | Campos compatibles |
| Pegado X11 / macOS | Adaptadores incluidos, requieren herramientas/permisos y pruebas | Campos compatibles |
| Wayland | Copiar/pegar manual; atajos dependen del compositor | Dentro del navegador |
| Instaladores y workflow | Fuente y automatización de builds | Fuente y ZIP generado |

## Capacidades de la visión aún no implementadas

- Streaming de palabras provisionales y marcadores anclados que se mantengan después de cualquier edición; esta versión presenta tramos terminados y señales del último tramo.
- Edición sincronizada directamente dentro de aplicaciones externas con seguimiento completo del cursor y sus cambios manuales. El pegado se solicita después de revisar.
- Calibración de confianza por idioma y auditoría con hablantes, NVDA y VoiceOver.
- Órdenes deterministas traducidas a todos los idiomas del dictado.
- OAuth de Google Drive, sincronización automática, fusión de conflictos y claves entre dispositivos. Hay respaldos portables cifrados para transferir mediante archivo.
- Teléfono como micrófono remoto: requiere emparejamiento y transporte seguro, todavía no incluidos.
- Historial interno cifrado con bloqueo de la aplicación; el cifrado actual protege archivos exportados.
- Descarga integrada de Ollama/modelos de texto desde el instalador básico; actualmente es una dependencia opcional.
- Actualizador firmado y publicado, telemetría consentida de calidad y adaptador universal Wayland.
- Autorización contextual por aplicación, perfiles por proyecto con diccionarios separados y automatización de tareas externas.

No se declara que todas las funciones de la visión estén terminadas. El código disponible permite construir y ampliar este estado real del producto.
