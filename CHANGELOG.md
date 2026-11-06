# Historial de cambios

Se utiliza [SemVer 2.0.0](https://semver.org/lang/es/). Cada entrada agrupa los cambios de una versión; la etiqueta Git identifica su código exacto. Una etiqueta no certifica instalación ni compatibilidad en plataformas pendientes.

## [0.5.0] — 2026-11-05

### Automatización de releases

- Aprobación de una versión desde Actions; después de todas las comprobaciones y builds, creación automática de etiqueta anotada y publicación de release con seis paquetes y manifiesto SHA256.
- Verificación de hashes de los instaladores, nombres separados por plataforma/arquitectura y exclusión de archivos internos del runtime.
- Rechazo de versiones discordantes, etiquetas de otro commit, releases existentes y artefactos incompletos. Publicación mediante borrador para evitar mostrar una entrega con archivos parcialmente subidos.
- Los pushes de etiquetas y las ejecuciones sin aprobación siguen generando candidatos sin publicar. La automatización no acredita por sí sola instalación, micrófono, permisos ni firma.

## [0.4.1] — 2026-11-05

### Correcciones de validación multiplataforma

- Pruebas de migración de atajos con escenarios explícitos Linux y macOS: `CommandOrControl` equivale a Control en Linux y a Cmd/Super en macOS. Se comprueba que Control y Cmd sigan siendo distintos en macOS.
- Plazo global de pruebas TypeScript de 30 segundos por archivo: la suite de interfaz completa alcanzó el límite anterior de 15 segundos en macOS Intel. Se conservan todas las pruebas y un límite finito.
- No cambia la lógica de la aplicación. La etiqueta `v0.4.0` se conserva; los candidatos 0.4.1 requieren su propia compilación y validación.

## [0.4.0] — 2026-11-05

### Funcionalidades

- Dictado minimalista con nivel de micrófono, borradores independientes y copia del resultado antes de intentar insertarlo en otra aplicación.
- Tres atajos configurables para alternar vistas, ocultar/restaurar e iniciar/terminar dictado; migración de preferencias y recuperación ante conflictos.
- Adaptadores de inserción y permisos por plataforma, con integración Hyprland y portales Wayland; conservación del texto ante fallos, sin Enter automático.
- Preparación y empaquetado nativo del motor Python junto a Tauri; flujo de candidatos para Linux, Windows y macOS.

### Correcciones

- Resolución de bibliotecas privadas de PyAV y otros wheels al generar AppImage mediante el coordinador de build.
- Normalización de saltos de línea entre Linux y Windows y mejoras de ventana y foco del dictado mínimo.

### Mantenimiento y límites

- Versión centralizada en `brand.json`, sincronización de manifiestos y lockfiles, comprobación de etiqueta y política de releases.
- Comprobaciones locales aprobadas y AppImage 0.3.2 de diagnóstico generada antes del incremento de versión. Ese artefacto no corresponde a 0.4.0: los candidatos 0.4.0 deben recompilarse desde su etiqueta.
- Instalación limpia y validación de micrófono, reconocimiento, permisos y pegado por plataforma pendientes; consultar [VALIDACION.md](VALIDACION.md).

## Versiones anteriores

El código anterior declaraba 0.3.2, pero no se encontraron etiquetas Git locales al iniciar esta consolidación. No se asignan etiquetas retrospectivas ni se presupone una release publicada para cada commit histórico.
