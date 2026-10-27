> Linux tiene ahora un Makefile completo. Consulta **LINUX-MAKE.md** para la instalación y compilación con make.

# GOSU Speech to Text 0.3.2 · instalación, actualización y uso

El código fuente incluye escritorio Windows/Linux/macOS, extensión Chrome, motor de transcripción local y workflows de compilación. Incorpora el parche de arranque que el usuario confirmó funcionando en Windows y conserva Ctrl+Alt+C y Ctrl+Alt+V.

Esta versión amplía el producto con funciones reales. FEATURES.md distingue lo implementado, lo que necesita un modelo local opcional y las capacidades aún pendientes. No se afirma haber completado toda la visión de producto ni validado todos los sistemas. Se aprobaron 35 pruebas automatizadas y cargo check de toda la aplicación para Windows GNU; consulta VALIDACION.md para el alcance exacto.

## 1. Actualizar tu Windows que ya funciona

Cierra GOSU Speech to Text y detén su terminal con Ctrl+C. Descarga gosu-speech-to-text-v0.3.2-source.zip en Downloads. Ejecuta en PowerShell:

```powershell
$zip = Join-Path $env:USERPROFILE 'Downloads\gosu-speech-to-text-v0.3.2-source.zip'
$update = Join-Path $env:TEMP ('gosu-update-' + [guid]::NewGuid().ToString())
Expand-Archive -LiteralPath $zip -DestinationPath $update
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$update\gosu-speech-to-text\scripts\actualizar-windows.ps1" -ProjectPath 'D:\projects\voz'
if ($LASTEXITCODE -ne 0) { throw 'La actualización falló. Revisa el mensaje anterior.' }
Set-Location 'D:\projects\voz'
npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw 'La instalación npm falló.' }
npm.cmd run desktop
```

El actualizador respalda los archivos que reemplaza en .voz-backups. Conserva .venv, target, modelos descargados y los datos de la aplicación. El identificador org.voz.prototype y las claves de almacenamiento se mantienen. Antes de cualquier actualización importante, exporta tus dictados o un respaldo desde la aplicación.

Si quieres revertir el código, copia el contenido de la carpeta de respaldo creada sobre el proyecto y ejecuta npm ci. Los respaldos de código no sustituyen los respaldos de tus textos.

## 2. Preparar desde cero

Instala las herramientas de BUILD-AND-RELEASE.md: Python 3.12, Node 22, Rust estable y las dependencias nativas de tu sistema. INSTALAR-WINDOWS.md detalla C++ Build Tools, SDK, WebView2 y Rust. No hace falta activar venv ni copiar una clave en el escritorio.

Desde la carpeta descomprimida gosu-speech-to-text:

Windows PowerShell:

```powershell
py -3.12 scripts\configurar.py --dev
```

Linux y macOS, con Python 3.12 ya instalado:

```bash
python3.12 scripts/configurar.py --dev
```

El asistente crea .venv, instala dependencias, ejecuta las pruebas y abre el escritorio. No instala herramientas del sistema con privilegios ni cambia su configuración global. Si falta una dependencia nativa, consulta los comandos de tu distribución en BUILD-AND-RELEASE.md.

En Arch puedes usar uv:

```bash
uv python install 3.12
uv run --python 3.12 --no-project python scripts/configurar.py --dev
```

Para actualizar otro proyecto Linux/macOS desde el nuevo ZIP:

```bash
python3 scripts/actualizar.py /ruta/al/proyecto/voz
cd /ruta/al/proyecto/voz
npm ci
npm run desktop
```

Puedes revisar primero los archivos afectados añadiendo --dry-run al actualizador.

## 3. Generar instaladores

En cada SO/arquitectura correspondiente, con los requisitos instalados:

Windows:

```powershell
py -3.12 scripts\configurar.py --build
```

Linux/macOS:

```bash
python3.12 scripts/configurar.py --build
```

Resultados en src-tauri/target/release/bundle:

| Compilación | Resultado |
|---|---|
| Windows x64 | nsis/*.exe |
| Linux x64 | appimage/*.AppImage |
| macOS ARM64 | macos/*.app y dmg/*.dmg |
| macOS Intel | macos/*.app y dmg/*.dmg, compilados en Intel |

Para DEB en Ubuntu, después de preparar el motor:

```bash
npm run desktop:build -- --bundles deb,appimage
```

Compila el AppImage público en Ubuntu 22.04 con el workflow, además de probarlo en Arch. Un build en Arch puede depender de una glibc más reciente. Cada instalador contiene su motor Python; el usuario final no instala Rust/Node/Python. Los pesos de Whisper se descargan en el primer arranque y después se reutilizan localmente.

La firma y notarización para publicación requieren configurar los certificados del editor. El workflow genera candidatos de release; no publica ni firma automáticamente. Prueba cada paquete en un equipo limpio antes de distribuirlo.

## 4. Primera sesión

1. Espera a Motor listo · base.
2. Si hay audio pendiente, usa Reintentar. Ahora puedes escucharlo antes de decidir.
3. Dicta una frase y haz una pausa. La aplicación añade el tramo terminado.
4. Revisa las palabras marcadas. Pulsarlas selecciona una aparición en el borrador para corregirla; son señales heurísticas del modelo, no probabilidades calibradas.
5. Copia o pega después de revisar. Nunca envía el mensaje ni pulsa Enter por ti.

| Atajo de escritorio | Acción |
|---|---|
| Ctrl+Shift+Space (configurable) | Iniciar/detener el modo actual |
| Ctrl+Alt+D | Iniciar dictado o detener la grabación activa |
| Ctrl+Alt+E | Iniciar corrección o detener la grabación activa |
| Ctrl+Alt+C | Copiar el borrador |
| Ctrl+Alt+V | Solicitar pegado en la ventana activa |

Los atajos pueden entrar en conflicto con los del sistema; la aplicación muestra los errores de registro. En macOS, el atajo principal CommandOrControl utiliza Command. Los atajos fijos anteriores utilizan Control+Option. Los botones siguen disponibles.

## 5. Correcciones por voz y teclado

Activa Corregir o pulsa Ctrl+Alt+E. Una orden se procesa como un tramo y termina la captura de esa orden.

- «cambia mañana por jueves» / «replace tomorrow with Thursday».
- «borra la última frase» / «delete last sentence».
- «borra la selección», «nuevo párrafo», «pon en lista».
- «selecciona mañana»: selecciona una aparición única.
- «opción uno», «opción dos»: elige entre apariciones de un reemplazo ambiguo.
- «deshacer», «rehacer», «copiar», «pegar».
- «leer texto», «detener lectura» (requiere voz local del sistema).
- «insertar plantilla saludo».
- «confirmar cambio», «cancelar cambio»: propuestas del editor natural.
- «recordar corrección»: guarda como regla personal el último reemplazo propuesto.
- «marcar favorito», «quitar favorito», «nuevo dictado», «modo dictado», «modo corrección».

Las órdenes concretas tienen gramática limitada en español y algunas equivalencias en inglés; el dictado multilingüe no significa que cada orden esté traducida a todos los idiomas. Las órdenes se interpretan en Corregir: dictar una frase que contiene la palabra copiar no copia por accidente.

Si una orden es ambigua, se ofrecen opciones o se pide seleccionar. Las correcciones libres necesitan el editor local opcional del siguiente apartado. Deshacer/rehacer también tienen botones. La escritura manual se agrupa en operaciones para evitar guardar una versión por cada letra.

## 6. Edición libre y búsqueda por significado, opcionales

El dictado y las órdenes concretas funcionan sin Ollama. Para «hazlo más breve», «corrige la redacción», «traduce al inglés» y búsqueda semántica:

1. Instala Ollama desde https://ollama.com/download para tu sistema. Es una aplicación adicional; no está incluida en el instalador básico de GOSU Speech to Text.
2. En Linux, si no lo instalas mediante tu gestor de paquetes, sigue https://docs.ollama.com/linux. En Arch puedes usar el paquete de tu distribución. Inicia el servicio o ejecuta `ollama serve` en una terminal que permanezca abierta. Windows y macOS pueden iniciar el servicio con su aplicación.
3. En otra terminal, descarga los modelos:

```bash
ollama pull qwen2.5:1.5b
ollama pull bge-m3
ollama list
```

4. En GOSU Speech to Text abre Herramientas, preferencias y respaldos > Edición natural local. Activa propuestas con Ollama y deja qwen2.5:1.5b. El modelo de búsqueda es bge-m3.
5. Selecciona un fragmento si quieres limitar la corrección. Dicta una petición en Corregir o escríbela en Escribir una petición de edición.
6. Revisa Antes y Propuesta. Aplica con el botón o diciendo «confirmar cambio» en Corregir. Si editaste manualmente mientras esperaba, no permite sobrescribir el texto cambiado.

GOSU Speech to Text se conecta solo a http://127.0.0.1:11434 y rechaza modelos identificados como remotos/cloud. No transmite texto a un proveedor externo por su cuenta. Los modelos deben descargarse antes de usar estas funciones sin Internet. La calidad y velocidad dependen del equipo y del modelo; revisa especialmente nombres, cifras y negaciones. El modelo pequeño es una opción de entrada y puedes sustituirlo por otro modelo local compatible.

La búsqueda por significado se activa con el botón de la bandeja después de escribir una consulta. Revisa hasta 300 borradores, como máximo los primeros 4000 caracteres de cada uno, y devuelve 20 resultados. Los vectores se cachean en memoria del motor; no se crea un índice permanente ni se sube la bandeja a una nube. El primer uso puede tardar más.

## 7. Preferencias personales, plantillas y bandeja

- Tras «cambia X por Y», Recordar esta corrección añade una regla solamente si la confirmas. También puedes agregar o quitar reglas en Lo que has enseñado a GOSU Speech to Text.
- Las muletillas solo se eliminan si tú las escribes y eliges modo Depurado. No se deducen reglas permanentes de una conversación.
- Guarda plantillas con nombre e insértalas con botón o por voz.
- Asigna título, etiquetas y favorito a cada borrador. La búsqueda normal incluye esos campos.
- Unir conserva el otro borrador. Dividir usa la posición del cursor y crea un segundo borrador.
- La limpieza por antigüedad muestra una confirmación y conserva favoritos y borradores con audio pendiente. No hay una tarea automática que borre información sin intervención.

## 8. Privacidad y respaldos

Sesión privada abre una bandeja temporal en memoria y vuelve a la bandeja anterior al salir. No guarda su texto ni audio nuevo en IndexedDB. No puedes cambiar de sesión con una grabación, importación o audio pendiente activo. El motor recibe audio en memoria para inferencia. No es una promesa de borrado forense de memoria, swap, registro del sistema o archivos que exportes expresamente.

El respaldo completo incluye textos, versiones, preferencias y plantillas; excluye audio pendiente y claves del motor. Sin contraseña se descarga sin cifrar. Con contraseña de al menos 10 caracteres se cifra mediante AES-GCM y PBKDF2-SHA256. Si pierdes la contraseña no hay recuperación incorporada. Máximo 20 MB de contenido antes del cifrado. El historial interno normal sigue sin cifrado propio.

Puedes guardar el archivo cifrado en una carpeta sincronizada de Drive/Dropbox y restaurarlo en otro equipo. Esto es una transferencia mediante archivo; no hay OAuth de Google, sincronización automática ni resolución de conflictos implementados.

La lectura en voz alta utiliza únicamente voces que el navegador identifica como locales. Si no hay ninguna disponible, pide instalar una voz del sistema.

## 9. Grabaciones y accesibilidad

Importar grabación acepta formatos que el WebView pueda decodificar. Límite 40 MB y 30 minutos por archivo. Se convierte a WAV mono 16 kHz por segmentos de 18 segundos y se guarda en la misma cola recuperable. Si el formato no es compatible, convierte el archivo a WAV o divídelo. Durante la importación se bloquean cambios de sesión. Importar una grabación comprimida puede necesitar bastante memoria al decodificarla.

Herramientas incluye alto contraste, tamaño del editor, umbral ajustable para voz suave y señal sonora opcional al detener. Todos los controles conservan botones, foco visible y etiquetas; falta auditoría real con NVDA/VoiceOver. El modo compacto se conserva.

## 10. Linux y macOS: pegado externo

El flujo Windows dictado/copia/pegado fue confirmado por el usuario en 0.2.1 + hotfix. La ampliación 0.3 requiere repetir esa prueba de aceptación.

Linux X11: instala xdotool (`sudo pacman -S xdotool` en Arch; `sudo apt install xdotool` en Debian/Ubuntu). El adaptador recuerda la ventana externa, activa el destino si corresponde, comprueba que siga activo y solicita Ctrl+V. Si falta la herramienta o cambia el foco, conserva el texto copiado y explica el fallo.

Wayland: se conserva el portapapeles y el uso de la ventana; el pegado automático y atajos entre aplicaciones dependen del compositor. Esta versión utiliza copia/pegado manual como alternativa. No instala un inyector privilegiado ni pretende compatibilidad universal con Wayland.

macOS: utiliza System Events/osascript y el portapapeles. Puede requerir permisos de Accesibilidad y Automatización para GOSU Speech to Text. Comprueba el destino antes de solicitar Cmd+V. El adaptador está incluido pero no ha sido ejecutado en un Mac real en esta entrega.

## 11. Extensión Chrome

Código editable en extension/. Puedes compilarlo en cualquier sistema:

```bash
npm ci
npm run extension:build
python3 scripts/package-extension.py
```

En Windows usa `py -3.12 scripts\package-extension.py` en el último paso.

- Para instalar localmente: chrome://extensions > Modo desarrollador > Cargar descomprimida > extension-dist.
- Para la tienda: gosu-speech-to-text-chrome.zip contiene manifest.json en la raíz. Necesitas cuenta de desarrollador, ficha, política de privacidad y revisión de Chrome Web Store.
- El ZIP de fuente incluye una copia compilada de la extensión en ready/gosu-speech-to-text-chrome.zip. Extráela a una carpeta estable antes de cargarla. La carpeta ready está excluida de git.
- Coloca el cursor en una página y abre GOSU Speech to Text desde el icono. En su pestaña carga el modelo, dicta y revisa antes de insertar.
- La extensión conserva audio pendiente en IndexedDB, permite reintentar, reglas manuales, plantillas, sesión privada y respaldos cifrados. El respaldo exportado puede abrirse en el escritorio. Al restaurar un respaldo de escritorio, la extensión importa el borrador activo y preferencias, no toda su bandeja.
- Usa input/textarea y algunos contenteditable. Rechaza destinos cambiados, contraseñas y ciertos editores estructurados. Google Docs y editores no compatibles requieren Copiar.
- La extensión no incluye editor libre ni búsqueda semántica de Ollama. Su motor WASM y permisos todavía necesitan validación en Chrome real. No se afirma paridad de funciones con el escritorio.
- Conserva la identidad/carpeta de la extensión al actualizar, o exporta antes de reinstalar. La versión de tienda tendrá su identidad asignada por Chrome Web Store.

## 12. GitHub y release

Publica este árbol de código en tu repositorio. No subas .venv, node_modules, motores generados, target ni ready. Conserva la licencia y notices de dependencias.

El workflow .github/workflows/release.yml genera Windows, Ubuntu Linux, macOS ARM64, macOS Intel y el ZIP Chrome mediante ejecución manual o tag v*. Consulta BUILD-AND-RELEASE.md para crear el repositorio, descargar artefactos y adjuntarlos a una release. Utiliza v0.3.2 como tag de esta versión. Los builds de escritorio generan también SHA256SUMS.txt.

Prueba paquetes en cada SO antes de marcarlos estables. No se incluyen credenciales, certificados de firma ni publicación automática a la tienda.
