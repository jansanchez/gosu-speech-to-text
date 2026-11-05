# Historial de cambios

Se utiliza [SemVer 2.0.0](https://semver.org/lang/es/). Cada entrada agrupa los cambios de una versión; la etiqueta Git identifica su código exacto. Una etiqueta no certifica instalación ni compatibilidad en plataformas pendientes.

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
