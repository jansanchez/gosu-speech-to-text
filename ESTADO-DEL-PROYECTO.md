# Estado al cerrar la sesión — 2026-11-05

## Punto de reanudación

- Rama `main`, versión **0.4.1**; commit funcional actual `0741fc6461d89cd336336a07804f27ddf23efc00`, etiqueta anotada `v0.4.1`. `v0.4.0` sigue en `0b32242` y no se movió.
- El usuario confirmó que ejecutó los comandos fuera de Codex y la subida funcionó. Al guardar este resumen se comprobó que `HEAD` y la referencia local `origin/main` coinciden en `0741fc6`; el árbol estaba limpio antes de esta actualización documental. No se consultó de nuevo el servidor ni se verificó el resultado de Actions 0.4.1 en este cierre.
- Los intentos anteriores desde Codex y algunos desde la terminal fallaron con `remote: fatal error in commit_refs_rules`, incluso sin `--atomic`. El usuario confirmó que el repositorio no tiene reglas configuradas. No atribuirlo a una regla concreta ni a Codex: no se estableció la causa del fallo del servidor. No se cambiaron protecciones ni se usó force push.
- `make check` de 0.4.1 aprobado fuera del sandbox en Linux/CachyOS x86_64: frontend, extensión, Python, formato y Rust. Las pruebas de plataforma macOS son simuladas; no equivalen a validar un instalador macOS.
- Correcciones incluidas: búsqueda de bibliotecas privadas del motor durante build Linux; pruebas de migración de atajos diferenciando Control y Cmd; plazo de pruebas TypeScript de 30 segundos por archivo. La versión y lockfiles están sincronizados y CI comprueba etiqueta/changelog.

## Próxima tarea

1. Consultar [GitHub Actions](https://github.com/jansanchez/gosu-speech-to-text/actions) para el commit `0741fc6` y la etiqueta `v0.4.1`. Confirmar por separado Checks y candidatos de Windows x64, Linux x64, macOS ARM64, macOS Intel y Chrome. Registrar enlaces y resultados efectivos.
2. Si falla un job, leer el primer error y corregir con evidencia. Los logs anteriores `job-logs.txt` y `job-logs-2.txt`, aportados en Downloads, corresponden a macOS de **0.4.0**, no a 0.4.1. Conservar las etiquetas existentes; cualquier corrección posterior necesita su versión conforme a la política del proyecto.
3. Descargar los candidatos del mismo commit, revisar hashes y validar instalación limpia e inicio/cierre del motor por SO/arquitectura. Probar micrófono, reconocimiento, permisos, atajos, conservación del texto e inserción sin Enter. No hay evidencia nueva de instalación limpia.
4. Preparar notas desde [CHANGELOG.md](CHANGELOG.md) y actualizar [VALIDACION.md](VALIDACION.md). La release pública y firmas siguen pendientes; **no se publicó ni firmó una release durante esta sesión**.
5. Mantener los pendientes funcionales del registro histórico: pruebas en aplicaciones reales y escritorios, RAM/CPU y revisión de dependencias npm.

## Retomar con Codex

Desde la raíz del proyecto, `codex resume --last` retoma la sesión más reciente; `codex resume` permite elegir. En una conversación nueva: «Lee AGENTS.md y ESTADO-DEL-PROYECTO.md, contrasta con Git y revisa los candidatos v0.4.1». No hace falta repetir setup ni modificar las etiquetas para retomar.

Esta actualización solo guarda contexto documental; no cambia código ni versión. Los registros siguientes son históricos y no sustituyen el punto de reanudación anterior.

# Corrección de candidatos — 2026-11-05

Versión vigente **0.4.1**, corrección de pruebas multiplataforma sobre `0b32242` (`v0.4.0`). `v0.4.0` se subió a GitHub y se conserva inmutable. Los candidatos de esa etiqueta fallaron en macOS por dos aserciones de atajos que confundían Control con Cmd y, en Intel, por el límite de 15 s del archivo completo de interfaz. Logs del usuario revisados; evidencia en [VALIDACION.md](VALIDACION.md).

0.4.1 cubre explícitamente Linux y macOS con escenarios simulados, conserva la distinción Control/Cmd y usa un plazo finito de 30 s por archivo. No cambia la lógica de producto. `make check` fuera del sandbox aprobado en Linux. Se prepara su commit y etiqueta anotada para repetir candidatos; consultar Git y Actions para el resultado efectivo. La aprobación local no valida macOS ni los instaladores. Sigue pendiente instalación limpia y pruebas reales antes de publicar.

Los registros siguientes son históricos; sus estados de publicación y versión corresponden a cada momento.

# Consolidación de versión — 2026-11-05

Se prepara **0.4.0** sobre la base `26fe01a`, incluyendo las funcionalidades recientes de dictado mínimo y tres atajos y la corrección de búsqueda de bibliotecas PyAV al generar AppImage. Consultar [CHANGELOG.md](CHANGELOG.md) y la política SemVer en [BUILD-AND-RELEASE.md](BUILD-AND-RELEASE.md). `brand.json` es la fuente de versión; `brand:sync` incluye ahora la entrada propia de `Cargo.lock`. `release:check` valida coherencia, changelog y etiqueta en CI. Las etiquetas son anotadas, `vX.Y.Z`, por versión agrupada; no por commit.

La consulta `git ls-remote --tags origin` fuera del sandbox no devolvió etiquetas al consolidar. La etiqueta local `v0.4.0` identifica el commit de consolidación; comprobar su existencia con Git. No se ha subido ni publicado una release en esta tarea. Los candidatos 0.4.0 necesitan recompilarse desde esa etiqueta; la AppImage local de diagnóstico sigue siendo 0.3.2 y no debe renombrarse como 0.4.0.

La corrección de AppImage está en el código fuente: el coordinador `desktop:build` pasa las carpetas de bibliotecas del motor mediante `LD_LIBRARY_PATH` solo a su proceso de compilación en Linux. La generación completa 0.3.2 fue aprobada fuera del sandbox; hash y límites en [VALIDACION.md](VALIDACION.md). Permanecen pendientes instalación limpia y validación por SO; no se declaró 1.0 estable ni se certificaron plataformas nuevas.

El siguiente registro conserva el contexto funcional anterior; sus referencias a HEAD y origin describen el estado del 4 de noviembre, no el commit de consolidación actual.

# Estado para retomar — 2026-11-04

## Punto de partida guardado

Repositorio `gosu-speech-to-text`, rama `main`. La funcionalidad está publicada en el commit [`d970f81`](https://github.com/jansanchez/gosu-speech-to-text/commit/d970f81bc7f662662050dec40cffdc9e78fc1f7c), `feat: separar atajos de vista, visibilidad y dictado`. Se verificó que `HEAD` y `origin/main` apuntaban a ese commit y que el árbol estaba limpio antes de esta actualización documental. La consolidación documental se guarda en un commit posterior a la funcionalidad, a petición del usuario; no modifica el código de la aplicación.

El usuario trabaja en Linux/CachyOS con Hyprland y usa frecuentemente WezTerm/Codex, ChatGPT y WhatsApp. Probó GOSU tras iniciarlo con `make dev`, confirmó satisfacción con el flujo y pidió publicar la funcionalidad. Esa confirmación no equivale a una prueba detallada de micrófono o de cada aplicación de destino.

Este resumen sustituye los borradores anteriores de uno o dos atajos. El historial de validaciones se conserva en [VALIDACION.md](VALIDACION.md).

## Funcionamiento vigente

| Atajo predeterminado Linux/Windows | Acción |
|---|---|
| Ctrl+Shift+M | Alternar editor y modo minimalista |
| Ctrl+Shift+H | Ocultar/restaurar GOSU conservando la vista elegida |
| Ctrl+Shift+Espacio | Iniciar/terminar el dictado |

En macOS se usa Cmd para estos valores iniciales. Los tres atajos son configurables desde Preferencias y desde la pantalla inicial, se guardan por separado y recuperan la combinación anterior ante conflictos. Las preferencias antiguas se completan sin reemplazar los atajos existentes; se evitan colisiones entre las tres acciones. La disponibilidad real depende del SO, el compositor y sus permisos.

- La aplicación inicia en el editor. Ocultar/restaurar recuerda la vista en memoria durante esa ejecución; no configura arranque automático ni añade bandeja del sistema.
- Ocultar no detiene una grabación o transcripción. Volver al editor durante un dictado mínimo detiene la captura y cancela la inserción automática, conservando el trabajo recuperable.
- En el panel, terminar espera los fragmentos pendientes y guarda el resultado; copia el dictado completo al portapapeles antes de intentar pegarlo en la ventana seleccionada al terminar. El panel permanece visible para otro dictado. El editor conserva su flujo de edición habitual.
- El micrófono puede iniciarse con GOSU enfocado, sin exigir un destino previo. Al terminar se solicita el destino y se detiene la captura sin esperar a que esa consulta responda. Seleccionar el campo mediante clic antes de terminar; mantenerlo enfocado durante el procesamiento.
- Si falla identificar el destino o pegar, el texto queda copiado y el panel lo indica. Pegar manualmente con Ctrl+V o Ctrl+Shift+V en WezTerm. Si falla el portapapeles, se conserva el borrador y se comunica el error. Nunca se envía Enter.
- Panel de 460×220 con nivel del micrófono y margen inferior aproximado del 15 % de pantalla. No se vuelve a posicionar al iniciar otra grabación si ya está visible.
- Hyprland espera el mapeo de la ventana y admite las clases `gosu-speech-to-text` y `org.voz.prototype`, con rechazo de ambigüedad y de la propia aplicación como destino. Redimensiona explícitamente al regresar al editor. Atajos separados y temporales, sin editar configuración permanente del compositor.
- Puente local Linux: `--show-minimal` alterna vistas; `--toggle-visibility` oculta/restaura; `--toggle-minimal` activa el dictado. Ver [MINIMAL-MODE.md](MINIMAL-MODE.md).
- Ocultar mantiene el motor/modelo cargados. RAM/CPU sin medir; no hay descarga automática del modelo.

## Evidencia y límites

Base de implementación `8fba04b`; cambios finalmente publicados en `d970f81`. Entorno comprobado: Linux x86_64, Hyprland 0.57.0.

- `make check` fuera del sandbox aprobado: 60 pruebas TypeScript, 21 Python y 11 Rust. Una prueba gráfica Rust se excluye de la suite habitual por necesitar una ventana aislada. Formato, enlaces Markdown y compilaciones web/extensión aprobados.
- Tras el último ajuste de identidad/cobertura: `cargo test --locked --manifest-path src-tauri/Cargo.toml hyprland::tests`, aprobado.
- Pegado real Unicode aprobado en GTK y WezTerm aislados sin Enter. WezTerm se abrió con `--skip-config`: no valida su configuración personal ni Codex, ChatGPT o WhatsApp.
- Recorrido gráfico real aprobado: editor → panel → ocultar → restaurar panel → editor → ocultar/restaurar editor. Se utilizó el puente de comandos de los mismos manejadores; no se grabó audio ni se simularon pulsaciones globales. No apareció el error «No se encontró la ventana de GOSU» en la prueba final.
- Los scripts `/tmp/gosu-validate-paste.py` y `/tmp/gosu-validate-window.py` eran herramientas temporales de esta sesión; pueden desaparecer al reiniciar y no forman parte del repositorio. Las instancias de esas pruebas se cerraron. No dar por vigente una instancia posterior de `make dev` sin comprobar procesos.
- El usuario confirmó satisfacción tras probar el flujo. Pendiente un registro detallado de pulsaciones físicas, micrófono/reconocimiento e inserción por aplicación. Otras plataformas no quedan acreditadas por estas pruebas Linux.
- En sandbox, FastAPI TestClient puede superar su plazo de 60 s; fuera pasó. Persiste un aviso de deprecación TestClient/httpx que no impide las comprobaciones.

## Pendientes prioritarios

1. Revisar GitHub Actions de `d970f81`; el push se confirmó, sus resultados CI aún no se consultaron.
2. Registrar pruebas reales del último flujo: atajos personalizados/conflictos, micrófono y recuperación de permisos, pegado en WezTerm/Codex, ChatGPT y WhatsApp. Medir RAM/CPU en reposo, grabando y transcribiendo.
3. Validar Linux X11 y portales GNOME/KDE. El portal genérico usa el campo enfocado y no identifica la aplicación. Repetir permisos/foco por escritorio.
4. Generar e instalar candidatos nativos Windows x64/MSVC, macOS ARM64 e Intel; comprobar instalación sin herramientas de desarrollo, motor y cierre sin procesos huérfanos. Compilar siempre en el mismo SO/arquitectura del destino.
5. Revisar deuda de dependencias: `make setup` notificó dos vulnerabilidades altas. La auditoría anterior las relacionó con sharp/Transformers 3.8.1; consultar `npm audit` antes de actualizar. No ejecutar `npm audit fix --force` sin revisar WASM, caché, modelos y extensión Chrome.
6. Firma Windows y firma/notarización macOS antes de distribución pública. No se firmaron, publicaron ni instalaron nuevos paquetes por este feature.

## Cómo retomar

Leer [AGENTS.md](AGENTS.md), este documento, [ARCHITECTURE.md](ARCHITECTURE.md), [CONTRIBUTING.md](CONTRIBUTING.md) y los [criterios de éxito](CRITERIOS-DE-EXITO.md). Contrastar el resumen con Git y la evidencia actual.

```bash
git status
make doctor
make dev
```

El entorno local está preparado; no hace falta `make setup` en cada inicio. `make check` verifica el proyecto. Para empaquetar, seguir [BUILD-AND-RELEASE.md](BUILD-AND-RELEASE.md) y las guías por plataforma. Los lockfiles, identificadores históricos y el protocolo audio → transcripción → texto e ID → borrado de audio → limpieza de ID deben conservarse.

Un apagado termina los procesos de desarrollo. Los datos recuperables siguen las reglas de persistencia; las sesiones privadas solo existen en memoria. Este documento guarda contexto técnico, sin exportar dictados ni datos privados.
