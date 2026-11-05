# Compilar y probar en macOS

Consulta primero [README.md](README.md) y [criterios de éxito](CRITERIOS-DE-EXITO.md). Hay dos destinos independientes: Apple Silicon ARM64 e Intel x64. Usa una terminal, Node y Python nativos de la arquitectura elegida; no mezcles herramientas bajo Rosetta con bibliotecas ARM64.

## Preparación

Instala Node.js 22 con npm, Python 3.12 y Rust estable mediante rustup. Instala las herramientas de Xcode:

```bash
xcode-select --install
rustup component add rustfmt
node --version
python3.12 --version
rustc --version
uname -m
```

Los requisitos nativos proceden de [Tauri](https://v2.tauri.app/start/prerequisites/). Si no tienes Python 3.12, puedes instalarlo de forma separada con tu gestor de versiones; no reemplaces el Python del sistema.

Desde la raíz del proyecto:

```bash
python3.12 scripts/configurar.py
python3.12 scripts/configurar.py --dev
```

El asistente prepara `.venv`, instala dependencias y ejecuta las comprobaciones antes de iniciar o empaquetar. Si `.venv` pertenece a otro Python, consérvala con otro nombre y crea una nueva; no copies entornos desde otro equipo.

## Generar el paquete

```bash
python3.12 scripts/configurar.py --build
```

Resultado predeterminado: `src-tauri/target/release/bundle/macos/*.app`, `dmg/*.dmg` y `SHA256SUMS.txt`. No es una aplicación universal: compila de nuevo en el otro destino para producir su paquete.

## Probar permisos e inserción

Concede acceso al micrófono y los permisos de Accesibilidad/Automatización solicitados por macOS. El permiso puede depender de si ejecutas el desarrollo desde Terminal o la aplicación instalada; prueba ambos casos por separado.

Con el motor listo, enfoca el destino y pulsa **Cmd+Shift+Espacio** para comenzar y terminar. Cambia la combinación desde el panel o Preferencias y comprueba su persistencia tras reiniciar. Prueba terminal, navegador y aplicaciones objetivo según [MINIMAL-MODE.md](MINIMAL-MODE.md).

Los paquetes locales y el workflow actual no configuran firma ni notarización. Antes de distribuir, completa y valida la [firma de macOS](https://v2.tauri.app/distribute/sign/macos/) para aplicación y motor; generar un DMG no acredita esos pasos. Registra resultados reales en [VALIDACION.md](VALIDACION.md).
