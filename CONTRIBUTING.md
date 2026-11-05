# Desarrollo y mantenimiento

Consulta `ARCHITECTURE.md` para las responsabilidades y las reglas de recuperación. `README.md` y las guías por plataforma describen cómo preparar Node 22, Python 3.12, Rust y las bibliotecas nativas.

## Comprobaciones

```bash
# Enlaces locales de documentación, formato, pruebas TypeScript, compilación web y extensión
npm run check

# Ambas suites Python, con un plazo de 60 segundos por suite
.venv/bin/python scripts/test-python.py

# Comprobaciones nativas
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo check --locked --manifest-path src-tauri/Cargo.toml
cargo test --locked --manifest-path src-tauri/Cargo.toml

# Todas las anteriores, desde Linux con el entorno preparado
make check
```

En Windows, usa `.venv\Scripts\python.exe scripts\test-python.py` para las pruebas Python. Las pruebas de instalación Make solo se ejecutan en Linux.

`npm run format` aplica Prettier; `cargo fmt --manifest-path src-tauri/Cargo.toml` aplica rustfmt. Los metadatos generados de marca están excluidos de Prettier: modifícalos mediante `brand.json` y `npm run brand:sync`.

La CI ejecuta comprobaciones en cada push y pull request. Python y Rust tienen una matriz de Linux, Windows y macOS; los instaladores continúan en el workflow de candidatos de release. La configuración de estos workflows no sustituye comprobar sus resultados en GitHub.

## Pruebas de regresión

Los cambios de almacenamiento, colas o privacidad deben cubrir el fallo que corrigen: cuota de disco, interrupción, escritura o eliminación fallida, reintento y recarga. Comprobar tanto el texto como la existencia del audio y del ID procesado. Las pruebas de interfaz usan React e IndexedDB simulada; las de extensión ejecutan su controlador compilado.

El runner TypeScript tiene un plazo de 30 segundos por archivo (la suite de interfaz completa superó 15 segundos en el runner macOS Intel). El runner Python termina una suite bloqueada tras 60 segundos. En un entorno restringido, `TestClient` puede bloquearse incluso con una API vacía; comprobar el mismo comando fuera del sandbox antes de atribuirlo a la aplicación. No eliminar pruebas ni desactivar validación para ocultar ese bloqueo.

## Compatibilidad

- Conservar datos anteriores y completar valores nuevos mediante migración.
- Validar datos externos y almacenados antes de habilitar escrituras.
- Mantener los adaptadores de escritorio y Chrome y la ruta de desarrollo web.
- No introducir cambios de esquema, identificador de aplicación o claves de almacenamiento sin pruebas de migración.
- Las funciones Ollama deben seguir siendo opcionales y locales. No aplicar propuestas sin confirmación.

## Dependencias pendientes de actualización

La auditoría npm realizada durante esta preparación informa dos entradas de severidad alta: `sharp` y su dependencia ascendente `@huggingface/transformers` 3.8.1. La corrección propuesta por npm implica migrar Transformers a la versión mayor 4. Los avisos afectan bibliotecas nativas de imágenes de `sharp`; el flujo de voz de Chrome utiliza el bundle de navegador, pero esto no elimina la deuda de dependencias del repositorio.

Antes de actualizar, comprobar descarga y caché del modelo, opciones de cuantización, archivos WASM empaquetados y transcripción real en Chrome. No ejecutar `npm audit fix --force` sin revisar el cambio de API. Consultar `npm audit` para el estado vigente; el informe de hoy no es una garantía permanente.

## Preparar cambios para otros sistemas

La guía central es [BUILD-AND-RELEASE.md](BUILD-AND-RELEASE.md); las instrucciones específicas están en [Linux](LINUX-MAKE.md), [Windows](INSTALAR-WINDOWS.md) y [macOS](INSTALAR-MACOS.md). El asistente `scripts/configurar.py`, ejecutado con Python 3.12, prepara dependencias y aplica las comprobaciones comunes antes de `--dev` o `--build`.

Aplica los [criterios de éxito](CRITERIOS-DE-EXITO.md) afectados. La CI separa Windows x64/MSVC, Ubuntu x64, macOS ARM64 e Intel. Los instaladores se generan nativamente e incluyen la carpeta completa del motor; no reutilices entornos de otra plataforma. La versión de Rust estable debe registrarse cuando se valida un candidato.

`npm run docs:check` comprueba que los enlaces relativos de los Markdown de la raíz existen; forma parte de `npm run check`. No verifica enlaces externos, anclas ni exactitud de instrucciones: revisa manualmente comandos, rutas y permisos. Actualiza documentación, scripts y workflows juntos. Conserva el historial de validación y añade evidencia nueva sin presentar resultados anteriores como actuales.
