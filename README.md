> **Corrección de arranque 0.3.2:** si aparece os error 3, consulta [REPARAR-MOTOR.md](REPARAR-MOTOR.md). La preparación del entorno y empaquetado del motor son automáticos desde los comandos npm.

# GOSU Speech to Text — Dictation & Voice Typing

Dicta, transcribe grabaciones y corrige con tu voz. Procesamiento local, varios idiomas e inserción de texto en aplicaciones compatibles. Código MIT para Windows, Linux y macOS, más extensión Chrome independiente.

**Versión 0.3.2 · [Cómo actualizar tu instalación anterior](ACTUALIZAR-GOSU.md).**

- [LINUX-MAKE.md](LINUX-MAKE.md): make setup/dev/appimage/deb/install y requisitos Arch/Ubuntu.
- [GUIA-0.3.md](GUIA-0.3.md): uso, Ollama opcional, respaldos y empaquetado por sistema.
- [BUILD-AND-RELEASE.md](BUILD-AND-RELEASE.md): herramientas de compilación, instaladores y GitHub Actions.
- [FEATURES.md](FEATURES.md): funciones reales y pendientes por plataforma.
- [VALIDACION.md](VALIDACION.md): comprobaciones realizadas y límites de la evidencia.
- [NOMBRES.md](NOMBRES.md): identidad aprobada y compatibilidad.
- [PRIVACY.md](PRIVACY.md) / [THIRD-PARTY.md](THIRD-PARTY.md): datos y dependencias.

## Linux

Con los requisitos nativos instalados:

```bash
make setup
make dev
```

Para crear un AppImage e instalarlo en tu usuario:

```bash
make appimage
make install
```

El comando instalado es `gosu-speech-to-text`. `make help` muestra todas las opciones.

## Windows y macOS

Desde el código descomprimido, con Node 22, Rust y Python 3.12 instalados:

Windows: `py -3.12 scripts/configurar.py --dev`.

macOS: `python3.12 scripts/configurar.py --dev`.

Sustituye --dev por --build para empaquetar el motor y generar el instalador nativo. Los usuarios finales de los instaladores no necesitan Python, Node ni Rust. Ollama es opcional para edición libre y búsqueda semántica.

## Extensión

`make extension` o `npm run extension:build` y `python3 scripts/package-extension.py` generan **gosu-speech-to-text-chrome.zip**. Una copia compilada se incluye en ready/.

## Marca y datos

brand.json define el nombre, descriptor y versión. `npm run brand:sync` actualiza los metadatos; `npm run brand:check` verifica su consistencia. La identidad técnica anterior y los formatos de datos permanecen compatibles para conservar tu historial al actualizar.

Las nuevas distribuciones requieren pruebas en los sistemas correspondientes antes de publicarse como estables. FEATURES.md identifica la visión aún pendiente; esta entrega no declara completadas todas sus capacidades.
