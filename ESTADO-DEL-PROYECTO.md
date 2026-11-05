## Entrega de la funcionalidad — 2026-11-04

El usuario probó la aplicación iniciada con `make dev` en Linux/Hyprland, confirmó satisfacción con el flujo y pidió commit y push. Esta confirmación no amplía la evidencia a otros sistemas ni detalla una validación de todas las aplicaciones de destino.

Este registro acompaña al commit de la funcionalidad (base `8fba04b`): tres atajos configurables para vista, visibilidad y dictado; copia independiente del pegado; panel elevado y restauración corregida en Hyprland. Las comprobaciones completas y la prueba gráfica figuran en la sección siguiente y en VALIDACION.md. Los apartados inferiores conservan el historial de implementación; la semántica vigente es la de tres acciones separadas.

## Flujo vigente: vista, visibilidad y dictado separados — 2026-11-04

Esta sección sustituye la semántica anterior de Ctrl+Shift+M descrita debajo. Base Git `8fba04b`, cambios locales sin commit; Linux x86_64 / Hyprland 0.57.0.

- Ctrl/Cmd+Shift+M alterna editor/minimalista. Ctrl/Cmd+Shift+H oculta/restaura GOSU conservando la vista elegida. Ctrl/Cmd+Shift+Espacio inicia/termina el dictado. Tres selectores configurables, persistencia y recuperación independiente ante conflictos; migración de la nueva preferencia sin cambiar claves o formato de respaldo. Al arrancar se abre el editor; la vista oculta se recuerda en memoria mientras vive la aplicación.
- Ocultar no altera grabación/transcripción. Cambiar al editor conserva el comportamiento anterior de detener captura y cancelar inserción automática, manteniendo el trabajo recuperable. El dictado desde el editor sigue su flujo de editor; el del panel mantiene la copia e inserción de la sesión mínima.
- Visibilidad y cambio de vista serializados para pulsaciones rápidas. Nuevo puente Linux `--toggle-visibility`; `--show-minimal` alterna vistas. Tres registros separados en Hyprland/portales.
- Corregida identificación de ventana con espera de mapeo (hasta 1 s), PID o clase de aplicación conocida, rechazo de ambigüedad. La clase observada realmente es `gosu-speech-to-text`; también se excluye como destino de pegado. Hyprland necesita redimensionado explícito también al volver al editor.
- `make check` fuera del sandbox aprobado: 60 TypeScript, 21 Python, 11 Rust y una prueba gráfica excluida de la suite normal. Último ajuste de cobertura/identidad nativa: `cargo test --locked --manifest-path src-tauri/Cargo.toml hyprland::tests`, aprobado.
- Validación real `python3 /tmp/gosu-validate-window.py`: editor inicial → panel 460×220 → ocultar → restaurar panel → editor → ocultar/restaurar editor, aprobado, sin «No se encontró la ventana de GOSU». Se usó el puente de comandos del mismo manejador; no se activó micrófono ni se simularon pulsaciones globales. El script cerró su instancia de desarrollo.
- Pendientes: pulsaciones físicas, micrófono e inserción de este último flujo con las aplicaciones del usuario; otros SO/arquitecturas y consumo de recursos. No se modificaron atajos permanentes del escritorio ni se publicaron paquetes.

## Ajuste vigente de usabilidad y portapapeles — 2026-11-04

Base `8fba04b`, cambios sin commit, Linux x86_64 / Hyprland 0.57.0.

- Se mantiene el flujo editor → Ctrl+Shift+M → panel visible; el atajo de dictado inicia/termina sin ocultar. Ctrl+Shift+M oculta/muestra sin volver al editor.
- Grabar ya no exige identificar otra ventana al empezar: `dictation_prepare` solo pide autorización del portal cuando corresponde. El destino se solicita al terminar y el micrófono se detiene sin esperar esa consulta.
- Tras vaciar la cola y guardar, se copia el dictado completo antes del intento de inserción. Si falla el destino/pegado se comunica «Texto en el portapapeles»; si falla copiar se conserva el borrador y no se simula éxito. Pegar manualmente: Ctrl+V o Ctrl+Shift+V en WezTerm, con el campo enfocado mediante clic.
- Panel elevado: margen inferior del 15 % de la altura de pantalla en Tauri y Hyprland. Iniciar otro dictado no vuelve a posicionarlo si ya está visible.
- `make check` fuera del sandbox pasó: 57 TypeScript, 21 Python, 10 Rust, una prueba gráfica excluida en la suite habitual. Tras el último ajuste de detención inmediata se repitió la suite UI nativa y pasó.
- Prueba real adicional `python3 /tmp/gosu-validate-paste.py`: pegado Unicode aprobado en GTK y WezTerm aislados, sin Enter, usando el adaptador Rust. WezTerm se abrió con `--skip-config`: no valida la configuración personal ni Codex, ChatGPT o WhatsApp. Script temporal de esta sesión, no parte del repositorio.
- Pendiente validar el panel/atajos y micrófono reales del flujo nuevo, aplicaciones del usuario, posición visual y otras plataformas. RAM/CPU sin medir. No se cambió configuración permanente del compositor.

## Corrección vigente: dos atajos independientes — 2026-11-04

Esta sección reemplaza el ciclo de un solo atajo descrito debajo; el usuario pidió controles separados.

Base Git `8fba04b`, cambios locales sin commit, Linux x86_64.

- Dictado: Ctrl/Cmd+Shift+Espacio, inicia/termina e inserta; otra pulsación empieza otro dictado sin ocultar.
- Panel: Ctrl/Cmd+Shift+M, muestra/oculta sin alterar una captura o inserción en curso. También funciona con el botón Ocultar.
- Ambos configurables en Preferencias y en la pantalla inicial, persistidos por separado, con recuperación ante conflicto. Se conservan los atajos de dictado previos y se migra la nueva preferencia sin cambiar claves de almacenamiento ni formatos de respaldo. Se rechaza usar la misma combinación; si una preferencia antigua ya usaba Ctrl/Cmd+Shift+M, el panel recibe Ctrl/Cmd+Alt+M.
- Registros separados en Hyprland y portales Wayland, con retirada independiente. Windows/macOS/X11 usan el registro global existente.
- Destino seleccionado al terminar, no al empezar. Sin sondeo de foco ni cambios del ciclo del motor; RAM/CPU sin medir.
- `make check` fuera del sandbox aprobado: 55 TypeScript, 21 Python, 10 Rust y una prueba gráfica Rust excluida. En sandbox TestClient superó su plazo de 60 s; fuera pasó. Pendiente prueba real del nuevo flujo con micrófono/foco/pegado y en otros sistemas.

## Mejora de atajo — 2026-11-04

Base contrastada con Git: `8fba04b`, Linux x86_64; cambios de esta mejora sin commit.

- Un único atajo configurable recorre mostrar sin micrófono → grabar → terminar e insertar → ocultar en segundo plano. La confirmación ya no desaparece por temporizador.
- El destino se selecciona al pulsar terminar, antes de esperar el reconocimiento. Se puede cambiar de aplicación/campo durante la captura. Durante el procesamiento se debe mantener el campo elegido.
- Sin sondeo periódico de foco. Ocultar mantiene el modelo cargado; consumo RAM/CPU sin medir. No se añadió bandeja del sistema ni inicio automático.
- `make check` aprobado: 52 TypeScript, 21 Python, 10 Rust, 1 Rust gráfico excluido; formato, compilación web/extensión y enlaces correctos. Pruebas simuladas de ciclo completo, cambio de destino, destino fijo durante reconocimiento y mostrar sin abrir micrófono.
- Pendiente validar este nuevo flujo con micrófono, foco y pegado reales en Linux/Hyprland y las otras plataformas. No sustituye la evidencia histórica de abajo.

# Estado para retomar — 2026-11-04

## Punto de partida

Repositorio: `gosu-speech-to-text`, rama `main`. El commit funcional `1874f9e` (`feat: añadir dictado minimalista y preparar compilación multiplataforma`) se subió correctamente a `jansanchez/gosu-speech-to-text`. Antes de escribir este resumen, el árbol de trabajo estaba limpio.

El usuario trabaja en Linux/Hyprland y confirmó que el dictado mínimo funciona. Quiere una experiencia mínima manejada con un solo atajo, configurable desde el primer inicio, con actividad visible del micrófono e inserción del texto en la aplicación enfocada (terminal con agente, WhatsApp o Google Docs). También requiere Windows, Ubuntu y macOS, con software robusto y mantenible.

## Trabajo realizado

- Panel mínimo flotante con nivel real del micrófono. Un mismo atajo inicia y detiene; espera la cola completa e inserta únicamente el texto de esa sesión. No simula Enter.
- Atajo inicial Ctrl+Shift+Espacio en Linux/Windows y Cmd+Shift+Espacio en macOS. Captura de nueva combinación desde panel/Preferencias, persistencia, gestión de conflictos y recuperación de la combinación anterior. Registros serializados que sobreviven a recargas de desarrollo.
- Adaptadores de destino/inserción para Windows, macOS, X11, Hyprland y portales Wayland. El portal genérico depende de permisos/capacidades del compositor, utiliza el campo enfocado y no identifica la aplicación.
- Separación de componentes y hooks; validación, escrituras serializadas, historial acotado y recuperación de audio. Mantener los identificadores históricos y el protocolo descrito en ARCHITECTURE.md.
- Scripts de preparación y empaquetado con comprobaciones comunes, lockfile Cargo y hashes; CI para Windows x64/MSVC, Ubuntu x64, macOS ARM64 e Intel.
- README y guías por sistema, reglas en AGENTS.md/CONTRIBUTING.md y criterios verificables en CRITERIOS-DE-EXITO.md. Comprobador de enlaces Markdown locales integrado en `npm run check`.

## Evidencia disponible

La última ejecución completa de `make check`, fuera del sandbox, aprobó:

- 52 pruebas TypeScript.
- 21 pruebas Python (14 de API y 7 de herramientas/preparación).
- 10 pruebas Rust; una prueba gráfica queda excluida automáticamente por necesitar una ventana aislada.
- Formato, enlaces de 20 Markdown existentes en ese momento, compilación web y extensión.

Hubo validación real previa en Linux/Hyprland de panel e inserción Unicode en una ventana GTK aislada; el usuario confirmó funcionamiento. Ver VALIDACION.md para el alcance e historial. Las pruebas de interfaz/inferencia simuladas no acreditan micrófono o precisión reales en otros sistemas.

En sandbox, FastAPI TestClient puede bloquearse; el mismo `make check` fuera del sandbox pasó. Hay un aviso de deprecación de TestClient/httpx que no impidió las pruebas.

## Pendientes prioritarios

1. Revisar los resultados reales de GitHub Actions del commit subido; esta sesión no los consultó. No confundir workflow configurado con ejecución aprobada.
2. Generar e instalar candidatos nativos en Windows x64/MSVC, macOS ARM64 e Intel; validar arranque sin herramientas de desarrollo, motor y cierre sin procesos huérfanos.
3. Completar pruebas reales en Linux X11 y portales GNOME/KDE; repetir permisos, conflicto/cambio de atajo, foco e inserción en terminal, WhatsApp y Google Docs por plataforma.
4. Revisar la deuda de dependencias: la auditoría anterior notificó dos entradas altas relacionadas con sharp/Transformers 3.8.1. Consultar el estado vigente antes de actuar; la migración a Transformers 4 exige validar WASM, caché y Chrome. No aplicar `npm audit fix --force` sin revisión.
5. Firma Windows y firma/notarización macOS antes de distribución pública. El workflow actual genera artefactos sin configurar estas firmas ni publicar releases.

## Cómo retomar después del apagado

Desde la raíz del repositorio:

```bash
git status
make doctor
make dev
```

El entorno local ya fue preparado; no es necesario ejecutar `make setup` en cada inicio. Usa `make check` para validar cambios y `make appimage`/`make deb` para paquetes Linux. Windows/macOS: seguir sus guías y `scripts/configurar.py` con Python 3.12; empaquetar siempre en el mismo SO/arquitectura del destino.

Un apagado termina los procesos de desarrollo. Los audios/textos guardados se recuperan según las reglas de persistencia; las sesiones privadas y el contenido que no se haya podido guardar solo existen en memoria. Este documento conserva contexto de desarrollo, no exporta conversaciones ni datos de dictado personales.

Antes de cambiar el código, leer AGENTS.md, ARCHITECTURE.md, CONTRIBUTING.md y CRITERIOS-DE-EXITO.md. No hay una nueva mejora funcional seleccionada después de esta preparación; la siguiente prioridad propuesta es revisar CI y completar la validación de los artefactos.
