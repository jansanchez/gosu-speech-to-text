## Actualización de instrucciones multiplataforma — 2026-11-04

README, guías por SO, reglas de contribución y criterios de éxito alineados con preparación y compilación nativas. CI configurada para Windows x64/MSVC, Ubuntu x64, macOS ARM64 e Intel; esta edición no ejecuta GitHub Actions ni acredita instaladores en esos destinos.

Verificación local Linux: `make check` completado fuera del sandbox: documentación (20 archivos), formato, 52 pruebas TypeScript, builds web/extensión, 21 pruebas Python y 10 pruebas Rust aprobadas; una prueba gráfica Rust permanece excluida por requerir una ventana aislada. Dentro del sandbox, TestClient se bloqueó; el mismo comando fuera del sandbox pasó. Los resultados históricos y la validación manual previa se conservan debajo. La nueva suite de preparación comprueba que un entorno Python incorrecto se conserva y que un fallo de comprobaciones impide empaquetar. Windows/macOS y la instalación limpia de sus artefactos permanecen pendientes según [CRITERIOS-DE-EXITO.md](CRITERIOS-DE-EXITO.md).

## Modo mínimo · 2026-11-04

- `make check`: 52 pruebas TypeScript, 19 Python y 10 Rust; formato y compilaciones de web/extensión correctos. La prueba gráfica Rust queda excluida de la ejecución automática.
- Prueba real aislada en Hyprland 0.57: el adaptador nativo detectó una ventana GTK de prueba e insertó exactamente `GOSU: inserción áéíóú ñ 你好`. La prueba exige la identidad de esa ventana antes de escribir y no toca documentos ni terminales del usuario.
- Comprobación visual de la ventana flotante de 460 × 220 unidades lógicas, con el micrófono apagado. El atajo principal quedó registrado directamente en Hyprland.
- Configuración del atajo: captura de teclas, suspensión temporal de registros durante la selección, persistencia tras reiniciar la interfaz y restauración del atajo anterior ante un conflicto.
- Casos de interfaz: dictado independiente del borrador anterior, inserción solo al terminar, espera del último fragmento en curso, bloqueo de inserción tras abrir el editor, denegación de permisos, fallo de destino y recuperación de atajos registrados por la propia aplicación.

Se implementaron adaptadores para Windows, X11, Hyprland, portales Wayland GNOME/KDE y macOS. Solo Linux/Hyprland se probó en un escritorio real en esta sesión. No se afirma validación real del modo mínimo en Windows, Ubuntu/GNOME/KDE ni macOS. El usuario confirmó el funcionamiento del modo mínimo en Linux; la prueba aislada nueva valida inserción de texto, no precisión de reconocimiento.

---

## Preparación de mantenibilidad · 2026-11-04

`make check` ejecutado correctamente en Linux:

- 41 pruebas TypeScript: lógica, respaldos, persistencia, captura y UI de navegador/escritorio, más ejecución del controlador Chrome con dispositivo y reconocedor sustituidos.
- 14 pruebas Python de API, edición y búsqueda, y 5 pruebas de herramientas Make.
- 6 pruebas Rust: rutas, política de micrófono, conexión inicial y aislamiento entre generaciones del motor.
- Comprobación de formato, TypeScript estricto, compilación web y extensión, `cargo check --locked` y `cargo test --locked`.

Los casos nuevos incluyen rechazo de almacenamiento corrupto sin sobrescritura, fallos al guardar o eliminar audio, reintento sin duplicados, arranque simultáneo de micrófono, cancelación durante permisos y conservación de datos al reiniciar el motor. Las pruebas Python se ejecutaron fuera del sandbox: dentro de este entorno restringido, TestClient se bloquea incluso con una API vacía.

Esta evidencia no incluye micrófono e inferencia reales, instalación de paquetes ni pegado en otras aplicaciones. La CI para Linux, Windows y macOS quedó configurada; su ejecución remota no se ha verificado en esta sesión. Los dos avisos altos de dependencias npm y la actualización mayor pendiente de Transformers se documentan en CONTRIBUTING.md. Starlette también emite un aviso de deprecación del cliente de pruebas httpx; las pruebas pasan.

---

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

## 2026-11-04 — ciclo del atajo y destino al terminar

Base `8fba04b`, cambios locales sin commit, Linux x86_64. Comando `make check`: aprobado (52 TypeScript, 21 Python, 10 Rust; una prueba gráfica Rust ignorada por necesitar ventana aislada). Formato, enlaces y compilaciones web/extensión aprobados. Las regresiones simulan mostrar sin micrófono, grabar, cambiar de ventana antes de terminar, conservar el destino mientras llega el último reconocimiento y ocultar/mostrar con el mismo atajo. Pendiente: micrófono, permisos y pegado reales del flujo nuevo, medición RAM/CPU y validación nativa en otros sistemas. No se generaron ni instalaron paquetes.

## 2026-11-04 — corrección: atajos separados para panel y dictado

Base `8fba04b`, cambios locales sin commit, Linux x86_64. `make check` fuera del sandbox: aprobado, 55 TypeScript, 21 Python, 10 Rust y una prueba gráfica excluida. En sandbox TestClient agotó 60 s; se repitió fuera con éxito. Pruebas simuladas de dictados consecutivos sin ocultar, visibilidad independiente durante captura, persistencia/configuración y recuperación del atajo del panel ante conflicto, migración de preferencias y rechazo de combinaciones iguales. Pendientes: micrófono, permisos y pegado reales del flujo nuevo, medición RAM/CPU y otras plataformas. No se modificaron atajos permanentes del escritorio ni se publicaron paquetes.

## 2026-11-04 — grabar desde GOSU, copia independiente y pegado real de terminal

Base `8fba04b` + cambios locales sin commit; Linux x86_64, Hyprland 0.57.0. `make check` fuera del sandbox aprobado: 57 TypeScript, 21 Python, 10 Rust y una prueba gráfica excluida en la suite habitual. Regresiones de grabación sin destino inicial, copia anterior al intento de inserción, copia ante fallo de destino/pegado y conservación del borrador ante fallo del portapapeles. Tras el ajuste final de parada inmediata durante la consulta de destino se repitió la suite UI nativa con éxito.

Prueba real adicional: `python3 /tmp/gosu-validate-paste.py` ejecutó `cargo test --locked --manifest-path src-tauri/Cargo.toml paste_into_isolated_test_window -- --ignored --nocapture` contra GTK con clase `org.gosu.IntegrationTest` y WezTerm con clase `org.gosu.IntegrationTest.wezterm` (configuración predeterminada con `--skip-config`). Ambos recibieron exactamente el texto Unicode de prueba, sin Enter. Las ventanas y procesos de prueba se cerraron. Esto acredita portapapeles e inserción del adaptador en esos destinos aislados; no acredita micrófono, precisión, atajos reales del panel, configuración personal de WezTerm ni Codex/WhatsApp/ChatGPT. La posición del panel se elevó con un margen inferior del 15 %; pendiente inspección visual con los chats del usuario. Script temporal en `/tmp`, sin instaladores ni publicación.

## 2026-11-04 — vista y visibilidad independientes, restauración real en Hyprland

Base `8fba04b` + cambios locales sin commit. Linux x86_64, Hyprland 0.57.0. `make check` fuera del sandbox: aprobado (60 TypeScript, 21 Python, 11 Rust y una prueba gráfica excluida). Cobertura nueva: restaurar editor/panel sin abrir micrófono, pulsaciones rápidas de visibilidad, configuración/persistencia y recuperación del tercer atajo, migración sin colisiones e identificación de ventanas WebKit. Tras ampliar la cobertura de las clases de ventana y excluir GOSU como destino de pegado: `cargo test --locked --manifest-path src-tauri/Cargo.toml hyprland::tests` aprobado.

Prueba gráfica real: `python3 /tmp/gosu-validate-window.py`, script temporal de esta sesión, inicia `make dev` y utiliza los puentes `--show-minimal` y `--toggle-visibility`. Resultado final aprobado: editor → panel (460×220, flotante, posición observada 1050,1004) → ocultar → restaurar panel → editor → ocultar/restaurar editor. Clase real observada: `gosu-speech-to-text`. La primera ejecución detectó que volver al editor conservaba el tamaño pequeño; se corrigió mediante redimensionado explícito en el compositor y se repitió con éxito. No apareció el error de identificación de ventana en la ejecución final. Se cerró la instancia de prueba sin grabar audio. Esto no valida pulsaciones físicas, micrófono, reconocimiento ni otras plataformas. El historial previo de pegado aislado GTK/WezTerm conserva su alcance.

## Publicación y confirmación del usuario — 2026-11-04

La implementación de las tres acciones y sus validaciones quedó publicada en `d970f81bc7f662662050dec40cffdc9e78fc1f7c` (`feat: separar atajos de vista, visibilidad y dictado`), rama `main`, con push confirmado a `origin/main`. Los registros anteriores con base `8fba04b` y cambios sin commit describen las etapas previas de esa misma implementación, no el estado actual de Git. Sus recuentos intermedios y las semánticas de uno/dos atajos son históricos; el alcance final es el de tres acciones y 60 pruebas TypeScript, 21 Python y 11 Rust aprobadas.

El usuario probó la aplicación iniciada con `make dev` en Linux/Hyprland, expresó satisfacción y solicitó commit/push. Esta confirmación general no acredita por sí sola micrófono, reconocimiento o todas las aplicaciones de destino. Resultados de CI y validación real en otros sistemas pendientes. El estado consolidado para retomar está en [ESTADO-DEL-PROYECTO.md](ESTADO-DEL-PROYECTO.md).

## 2026-11-05 — Dependencias PyAV al generar AppImage

Base `26fe01a`, con cambios locales en el coordinador de build y su prueba de regresión. Entorno CachyOS Linux x86_64, kernel 7.3.0-5-cachyos, glibc 2.44; Node v26.12.1 (distinto de la referencia Node 22 de CI), Python 3.12.15, Rust 1.99.1; PyInstaller 6.22.3.

- Confirmado: `libswresample-14658403.so.6.1.100` existe en el runtime, pero `ldd` sobre `av.libs/libavcodec-*.so.*` no la encontraba. El coordinador pasa las carpetas de bibliotecas del motor a `LD_LIBRARY_PATH` del proceso Tauri en Linux, conservando el entorno del llamador. Con ese entorno, `ldd` resolvió todas las dependencias de esa biblioteca.
- `make check`: aprobado; incluye regresión del entorno Linux y conservación del entorno Windows/macOS, suites Python y comprobaciones Rust. La prueba gráfica Rust permanece excluida por requerir ventana aislada.
- `npm run desktop:build -- --bundles appimage -- --locked` en sandbox: falló con mensaje genérico `failed to run linuxdeploy`.
- Repetición autorizada fuera del sandbox: `npm run desktop:build -- --bundles appimage --verbose -- --locked`, aprobada. linuxdeploy procesó las bibliotecas de PyAV y produjo `src-tauri/target/release/bundle/appimage/GOSU Speech to Text_0.3.2_amd64.AppImage` (334.48 MiB). `python3 scripts/checksums.py` genera el manifiesto junto a los paquetes.
- Pendiente: instalación limpia, inicio del motor desde la AppImage, micrófono, reconocimiento, permisos y pegado. Este build local no acredita compatibilidad con distribuciones de glibc anterior ni otros SO/arquitecturas. No se instaló, firmó ni publicó el paquete.
- SHA256 de la AppImage: `b16fff7f9e9270d7ba745b36b9cd21513e0ac912eed7c280782f830c087f47b7`.

## 2026-11-05 — Consolidación SemVer 0.4.0

Base `26fe01a`, cambios guardados en el commit de consolidación identificado por la etiqueta local anotada `v0.4.0`. Mismo entorno CachyOS Linux x86_64 y herramientas del registro anterior. Sin etiquetas locales ni remotas antes de consolidar (`git ls-remote --tags origin`, aprobado fuera del sandbox, salida vacía).

- `npm run brand:sync`: aprobado; sincroniza npm, Tauri, Chrome, Cargo y sus lockfiles sin actualizar dependencias.
- `make check` en sandbox: frontend aprobado; TestClient superó los 60 segundos. Repetición `make check` autorizada fuera del sandbox: aprobada, incluyendo regresiones del entorno AppImage y del control de etiquetas, compilación web/Chrome, 21 pruebas Python, formato y comprobaciones Rust (11 aprobadas y 1 gráfica excluida).
- CI de candidatos comprueba que la etiqueta `vX.Y.Z` coincide con `brand.json`, los metadatos generados y la entrada del changelog antes de empaquetar. Las pruebas rechazan etiquetas discordantes y versiones numéricas inválidas. El workflow aún no se ejecutó para esta versión.
- No se recompilaron instaladores 0.4.0 ni se subió la etiqueta. La AppImage 0.3.2 del registro anterior acredita la corrección de empaquetado de su código, no un instalador de la nueva versión. Pendientes candidatos desde la etiqueta, instalación limpia y pruebas reales por plataforma; sin firma ni publicación.
