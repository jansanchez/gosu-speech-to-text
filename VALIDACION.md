# Validación de GOSU Speech to Text 0.3.0

Fecha: 26 de octubre de 2026.

## Confirmación previa del usuario

En Windows, versión 0.2.1 + parche de arranque: dictado local, Ctrl+Alt+C y Ctrl+Alt+V funcionando. El parche está incorporado en server/engine.py. La ampliación 0.3 necesita repetir la aceptación en ese equipo.

## Ejecutado correctamente en esta entrega

- 21 pruebas Node/TypeScript y 14 pruebas Python: **35 pruebas automatizadas aprobadas**.
- TypeScript estricto y compilación Vite de producción.
- Compilación esbuild de la extensión y generación de ZIP con manifest.json en la raíz; comprobación de integridad del ZIP.
- Pruebas DOM de inserción en selección, rechazo de campo cambiado, campo eliminado y contraseña.
- Pruebas de UI nativa con IPC simulado: dictado, edición, portapapeles, audio pendiente y recuperación.
- Propuestas naturales que no cambian el borrador hasta confirmar; rechazo si el usuario modifica el borrador durante la propuesta.
- Regla personal que no se guarda hasta confirmación y sesión privada cuyo texto no llega a IndexedDB.
- Recuperación tras fallo de guardado: el resultado se persiste antes de eliminar su audio, sin volver a transcribirlo.
- Respaldos cifrados: ida/vuelta Unicode, contraseña incorrecta, alteración del cifrado, validación de formato y parámetros.
- Importación de audio: mezcla mono, conservación de muestras, partición en WAV cortos y límite de tamaño.
- API: autenticación, validación, idiomas, disponibilidad, propuestas revisables y rechazo de modelos remotos declarados. Búsqueda: similitud y caché de vectores simulados.
- `cargo check --target x86_64-pc-windows-gnu`: toda la aplicación Rust pasó la comprobación de tipos, incluido el recurso Windows y todos los comandos IPC.
- Adaptador X11: compilación como biblioteca Rust en Linux.
- Adaptador macOS: comprobación Rust de metadatos para aarch64-apple-darwin. No ejecuta AppleScript ni permisos reales.
- Motor Python empaquetado con PyInstaller en Linux: compilación, arranque, HTTP /health, cierre al desconectarse el padre y transcripción real de un WAV sintetizado con el modelo tiny local.
- Actualizador Python probado en una carpeta temporal: respalda el código anterior, conserva .venv y no copia motores ni carpetas generadas.
- El servicio HTTP informa de modelo cargando/listo/error y rechaza transcripción antes de estar listo, conservando la cola del cliente.

## Límites de esa evidencia

El entorno de pruebas de React sustituye el micrófono y el IPC Rust. Las pruebas API usan modelos simulados, excepto la inferencia del WAV indicado. Las pruebas de editor y embeddings simulan respuestas de Ollama: no se descargaron ni ejecutaron los modelos de texto para evaluar calidad real.

La comprobación Windows GNU no genera ni ejecuta un instalador Windows MSVC. Los adaptadores X11/macOS se compilan o comprueban, pero no se han probado aquí con ventanas externas. No se dispone de una auditoría visual de navegador real ni de lectores de pantalla.

La transcripción sintetizada devolvió «Tomorrow I will review the document and send replay to Carlos.» La fuente decía «send a reply», por lo que hubo un error de reconocimiento. Esto prueba ejecución, no precisión perfecta ni calidad por idioma.

## Pendiente antes de una release estable

1. Ejecutar el workflow completo y probar cada EXE/AppImage/DEB/DMG en su SO y arquitectura.
2. Repetir en Windows del usuario dictado, corrección, reinicio, Ctrl+Alt+C, Ctrl+Alt+V y recuperación de audio.
3. Probar X11, Wayland y macOS con sus permisos y cambios de foco reales.
4. Cargar la extensión en Chrome y verificar micrófono, modelo WASM, caché, inserción compatible y recuperación tras cerrar la pestaña.
5. Ejecutar Ollama con los modelos de edición/búsqueda, medir latencia y revisar nombres, cifras, negaciones y calidad por idioma.
6. Probar NVDA/VoiceOver, escalado, contraste y navegación completa con teclado.
7. Revisar los paquetes finales, sus notices y firma/notarización antes de publicación pública.

No se presentan los instaladores ni las capacidades de la visión pendientes como ya probados o terminados. FEATURES.md mantiene la matriz del producto real.

## Revisión Linux Make

- Añadido Makefile con preparación, desarrollo, pruebas, comprobación Rust, frontend, motor, AppImage, DEB, extensión e instalación local.
- Cuatro pruebas nuevas de instalación/desinstalación y limpieza: preservación de contenido del usuario, rechazo de comando existente, marcador de propiedad y no seguimiento de enlaces al limpiar.
- Total de la revisión: 21 pruebas Node + 14 API Python + 4 herramientas Linux = 39 pruebas automatizadas.
- Los objetivos make test, make frontend y make extension se ejecutaron en Linux. También se comprobó la expansión de comandos make -n. Las pruebas de instalación utilizan AppImage de prueba y un prefijo temporal; no ejecutan una GUI.
- No se afirma haber generado o ejecutado aquí los paquetes AppImage/DEB completos con WebKitGTK. Esa validación permanece en un entorno con las dependencias gráficas indicadas y mediante el workflow de release.

## Marca aprobada · 0.3.1

- Nombre público unificado: GOSU Speech to Text — Dictation & Voice Typing.
- Aplicación corta y menús: GOSU Speech to Text; proyecto/comando: gosu-speech-to-text.
- Canon de marca en brand.json y comprobación npm run brand:check antes de compilar.
- Datos heredados, cabecera de autenticación e identificador nativo conservados.
- Una prueba adicional verifica la migración del instalador Linux anterior sin eliminar archivos del usuario: 21 pruebas Node + 14 API + 5 herramientas Linux = **40 pruebas**.
- Compilaciones de interfaz y extensión aprobadas; cargo check para Windows GNU aprobado con el nombre/versión nuevos.
- Los instaladores finales y su presentación en cada sistema aún requieren comprobación en dispositivos reales.

## Corrección de rutas 0.3.2

- Preparación automática de Python antes de Tauri y empaquetado del motor antes del instalador.
- Pruebas nuevas: entorno ausente, entorno sano, Python de base ausente, conservación de entorno incompleto, instalación de paquetes y argumentos del empaquetador.
- Tres pruebas Rust de rutas: Python ausente, proyecto movido y runtime de release junto al binario.
- Total: 27 pruebas Node + 14 API + 5 herramientas Linux + 3 rutas Rust = 49 comprobaciones automatizadas.
- Compilación frontend/extensión y cargo check Windows GNU aprobados. Se conserva la identidad y el protocolo de datos.
- Los escenarios de preparación de Python se prueban con ejecución de comandos simulada; la importación del entorno existente se comprueba además con el prearranque real en Linux. Falta aceptación en el Windows donde se observó el error.

- Runtime copiado a target/release/engine y ejecutado desde esa ubicación en Linux: /health listo y cierre al desconectarse el padre. La copia conserva los permisos de ejecución.
