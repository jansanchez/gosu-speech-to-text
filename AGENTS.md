# GOSU Speech to Text

- Al retomar el proyecto, lee [ESTADO-DEL-PROYECTO.md](ESTADO-DEL-PROYECTO.md) para el avance guardado y los pendientes; contrástalo con Git y la evidencia actual.

- Lee `ARCHITECTURE.md` y `CONTRIBUTING.md` antes de cambiar almacenamiento, audio o ciclo de vida del motor.
- La aplicación incluye React/TypeScript, Tauri/Rust, FastAPI/Python y una extensión Chrome independiente. Comprueba los consumidores compartidos al cambiar `src/`.
- Conserva `org.voz.prototype`, `voz-state`, `voz-jobs` y los formatos de respaldo existentes salvo que el trabajo incluya una migración probada.
- Mantén los commits de audio en este orden: guardar audio, transcribir, guardar texto e ID procesado, eliminar audio, limpiar ID. Los errores deben conservar lo recuperable.
- Evita escrituras al cargar datos inválidos y persistencia del contenido privado.
- Usa `npm run format` y `cargo fmt --manifest-path src-tauri/Cargo.toml`. La marca se genera con `npm run brand:sync`; no edites `src/brand.ts` a mano.
- Ejecuta `npm run check`, `.venv/bin/python scripts/test-python.py` y las comprobaciones Rust descritas en `CONTRIBUTING.md`, o `make check` con el entorno preparado. Añade pruebas de regresión para cambios en integridad de datos y concurrencia.
- Distingue pruebas simuladas de validación real de micrófono, reconocimiento, permisos y pegado. No declares soporte validado en plataformas que no hayas probado.
- Comunícate con el usuario en español, pero escribe el producto para un público mundial: interfaz, mensajes, textos, documentación pública y notas de release en inglés. Esta es la preferencia del usuario para este proyecto y sus futuros productos digitales. No confundir el idioma de dictado o transcripción elegido por el usuario con el idioma de la interfaz.
- Mantén los registros internos de trabajo en español cuando ayuden a retomar el proyecto; no añadas resúmenes en español a páginas públicas en inglés. Al modificar textos existentes, adapta a inglés el contenido público afectado.

## Portabilidad y aceptación

- Usa `BUILD-AND-RELEASE.md` como contrato de compilación y `CRITERIOS-DE-EXITO.md` como puerta de aceptación. Mantén README, guías por SO, scripts y CI coherentes cuando cambien requisitos o comandos.
- Empaqueta Tauri y el motor Python en el mismo SO y arquitectura; no anuncies compatibilidad por una comprobación cruzada de Rust. Usa los lockfiles y separa los artefactos Intel/ARM.
- Conserva el atajo configurable desde el primer uso y el texto ante fallos de inserción. Nunca añadas Enter automático al dictado. Trata permisos y conflictos como estados recuperables.
- Registra commit, SO/arquitectura, comando, resultado y pendientes. No conviertas una prueba simulada o una matriz CI configurada en evidencia de instalación real.
- No publiques ni firmes versiones ni modifiques atajos del escritorio del usuario por el solo hecho de actualizar documentación o generar paquetes.

## Versionamiento

- Sigue la política SemVer y el procedimiento de [BUILD-AND-RELEASE.md](BUILD-AND-RELEASE.md). Registra funcionalidades y correcciones en [CHANGELOG.md](CHANGELOG.md).
- Agrupa funcionalidades en una versión menor y correcciones en una versión parche; no crees una etiqueta por cada commit. Actualiza `brand.json`, ejecuta `npm run brand:sync` y conserva los lockfiles sincronizados.
- Antes de etiquetar, ejecuta las comprobaciones y `npm run release:check`; usa etiquetas anotadas `vX.Y.Z` sobre el commit de versión con árbol limpio. Nunca muevas ni sobrescribas etiquetas existentes. Distingue etiqueta local, push de etiqueta, candidato y release publicada.

- Para publicar una versión aprobada, usa el workflow de Actions con `publish` y versión exacta desde main; ese flujo crea la etiqueta y la release después de comprobar y empaquetar todos los destinos. Sin aprobación explícita genera solo candidatos. No confundir ejecución de CI con aceptación real de instaladores; seguir BUILD-AND-RELEASE.md.
