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
