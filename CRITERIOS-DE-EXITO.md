# Criterios de éxito

Estos criterios son la puerta de aceptación para cada cambio y cada candidato. La configuración de CI expresa lo que se debe ejecutar; los resultados se registran en [VALIDACION.md](VALIDACION.md). Un resultado en Linux no acredita Windows o macOS.

## Compilación reproducible

- **B1 — Entorno:** registrar commit, SO, arquitectura, Node 22, Python 3.12 y Rust/Cargo. Usar `npm ci`, `Cargo.lock` con `--locked` y los requisitos Python del repositorio. Rust estable y las imágenes CI pueden evolucionar: registrar sus versiones efectivas.
- **B2 — Comprobaciones:** formato, enlaces locales de documentación, pruebas TypeScript, build web/extensión, ambas suites Python y `cargo fmt`, `cargo check` y `cargo test` aprobados. No eliminar pruebas para obtener un resultado verde.
- **B3 — Paquete nativo:** generar los paquetes de [BUILD-AND-RELEASE.md](BUILD-AND-RELEASE.md) en el SO y arquitectura correspondientes. Incluir la carpeta completa del motor. Conservar logs, artefactos y SHA256 de los instaladores finales.
- **B4 — Instalación limpia:** instalar en un usuario sin Python, Node o Rust de desarrollo; abrir desde el lanzador y desde una ruta con espacios. El motor arranca y muestra estado comprensible; su proceso termina al cerrar la aplicación. El primer modelo puede necesitar red y espacio disponible.

## Dictado mínimo y accesibilidad

- **M1 — Primer uso:** el atajo predeterminado abre el panel con el motor listo; la misma combinación detiene. Si hay conflicto o falta permiso, la interfaz explica cómo resolverlo y permite elegir otra combinación.
- **M2 — Configuración:** capturar y guardar otra combinación, probarla, reiniciar y comprobar que persiste. Una combinación ocupada conserva o recupera la anterior; recargas no duplican registros ni eliminan atajos ajenos.
- **M3 — Audio:** mostrar actividad del micrófono real, estados de escucha/procesamiento/error y recuperación al denegar permisos o desconectar el dispositivo. No mostrar éxito mientras quede audio pendiente.
- **M4 — Destino:** enfocar un campo antes de activar, dictar dos sesiones e insertar únicamente el texto nuevo una vez por sesión, con tildes, Unicode y varias líneas. No simular Enter ni ejecutar/enviar el texto automáticamente.
- **M5 — Aplicaciones:** comprobar una terminal con agente, un campo de WhatsApp y Google Docs; registrar app, versión y resultado. Si el destino no admite inserción, conservar el texto y ofrecer copia sin fingir éxito.
- **M6 — Escritorios:** repetir captura de foco e inserción en Windows, macOS, Linux X11, Hyprland y un portal Wayland compatible según los destinos anunciados. El portal genérico utiliza el campo enfocado y no identifica la aplicación: registrar esa limitación y los permisos concedidos.

## Integridad y mantenimiento

- **D1 — Recuperación:** un fallo de disco, transcripción o borrado permite reintentar/recargar sin perder audio recuperable ni duplicar texto confirmado. Mantener audio → transcripción → texto e ID → borrado de audio → limpieza de ID.
- **D2 — Privacidad:** sesiones privadas permanecen en memoria; datos inválidos no provocan sobrescritura automática. No registrar audio, texto, claves ni rutas personales innecesarias en logs publicados.
- **D3 — Compatibilidad:** conservar identificadores de almacenamiento e importaciones existentes o aportar migración y pruebas. Actualizar instrucciones y criterios cuando cambia un contrato.
- **D4 — Cierre y errores:** cancelar/cerrar sin procesos huérfanos, conservar lo recuperable y comunicar los errores de permisos, motor, modelo y destino.

## Registro por plataforma

Usar una fila por artefacto y escritorio. Estados: **pendiente**, **aprobado**, **fallido** o **no aplicable con motivo**. Un criterio omitido permanece pendiente.

| Commit / artefacto / SHA256 | SO y arquitectura / escritorio | B1–B4 | M1–M6 | D1–D4 | Evidencia y pendientes |
|---|---|---|---|---|---|
| Completar al validar | Versión exacta | Estado por ID | Estado por ID | Estado por ID | Log de CI, pruebas manuales y limitaciones |

La aceptación de una mejora requiere los criterios afectados y las comprobaciones comunes; la aceptación de una distribución requiere además instalación limpia y pruebas reales de ese artefacto. Las pruebas simuladas no sustituyen micrófono, permisos ni foco real.
