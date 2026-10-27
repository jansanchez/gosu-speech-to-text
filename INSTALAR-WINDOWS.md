# GOSU Speech to Text 0.3.2: instalación de escritorio en Windows, paso a paso

Esta guía supone Windows x64 en un PC Intel/AMD. Comprueba en Configuración > Sistema > Acerca de > Tipo de sistema. En ARM64 necesitarías herramientas y una guía específica; no uses el toolchain x64 de esta guía.

## Antes de empezar: navegador y escritorio son distintos

- `npm.cmd run dev` abre una página local. Puede copiar con un botón o Ctrl+Alt+C mientras esa página esté activa. No tiene atajos globales ni pegado a otras ventanas.
- `npm.cmd run desktop` compila y abre la aplicación Windows. La interfaz debe mostrar **ESCRITORIO · 0.3.2** arriba.
- Tener la página abierta no significa que estés ejecutando la aplicación de escritorio. Rust se necesita para compilar el código de escritorio; no para la ruta de navegador.

## 1. Instalar herramientas C++

1. Abre https://visualstudio.microsoft.com/visual-cpp-build-tools/
2. Descarga **Build Tools**. No necesitas instalar el IDE completo de Visual Studio.
3. Ejecuta el instalador y acepta el permiso de Windows si aparece.
4. En **Cargas de trabajo / Workloads**, marca **Desarrollo para el escritorio con C++ / Desktop development with C++**.
5. En el panel derecho, conserva los componentes recomendados. Comprueba que incluya herramientas MSVC para x64/x86 y un Windows SDK. La versión exacta del SDK puede variar según el instalador.
6. Pulsa **Instalar** y espera a que termine. Si pide reiniciar, reinicia.
7. Si ya tenías Build Tools o Visual Studio: abre **Visual Studio Installer > Modificar** y comprueba la misma carga.

No instales solo «Visual C++ Redistributable»: ese paquete no contiene el compilador necesario para construir Tauri.

## 2. Instalar Rust

Ruta recomendada para esta guía:
1. Abre https://rust-lang.org/es/tools/install/
2. Descarga **rustup-init.exe (x64)**.
3. Ejecútalo. Debería mostrar el host `x86_64-pc-windows-msvc`.
4. Si solicita las herramientas C++, termina primero el paso 1. No elijas omitirlas como solución al error de compilación.
5. Cuando aparezcan las opciones de instalación de Rust, selecciona **1: Proceed with standard installation** y pulsa Enter.
6. Espera a que termine.
7. Cierra todas las ventanas de PowerShell/Terminal, y abre una nueva. Si usas la terminal integrada de VS Code, cierra también VS Code y vuelve a abrirlo.

Alternativa si ya utilizas winget (elige una ruta, no necesitas ambas):

```powershell
winget install --id Rustlang.Rustup --exact --source winget
```

Después, en una nueva terminal:

```powershell
rustup default stable-x86_64-pc-windows-msvc
rustup show active-toolchain
rustc --version
cargo --version
```

Deben aparecer el toolchain MSVC y las versiones de rustc/cargo. No necesitan coincidir con un número de versión específico de esta guía.

Si dice «rustc no se reconoce», verifica primero:

```powershell
Test-Path "$env:USERPROFILE\.cargo\bin\rustc.exe"
& "$env:USERPROFILE\.cargo\bin\rustc.exe" --version
```

Si por ruta completa funciona, la instalación existe y la terminal no ha tomado el PATH actualizado. Vuelve a abrir la terminal o reinicia sesión; no reinstales a ciegas.

## 3. WebView2

1. Abre https://developer.microsoft.com/microsoft-edge/webview2/#download-section
2. Busca **Evergreen Bootstrapper** y descárgalo.
3. Ejecútalo. Si WebView2 ya está instalado, no necesitas duplicarlo.

## 4. Node y Python

Si ya ejecutaste la versión anterior y sus comandos funcionan, no es necesario reinstalarlos.

- Node LTS: https://nodejs.org/ . Instalación predeterminada, incluida la opción de PATH.
- Python 3.12 x64: https://www.python.org/downloads/windows/ . Selecciona una versión de Python 3.12 que tenga **Windows installer (64-bit)**; algunas versiones posteriores de la rama solo tienen código fuente. Instala el lanzador `py` y marca Add python.exe to PATH.

En una terminal nueva:

```powershell
node --version
npm.cmd --version
py -3.12 --version
rustc --version
cargo --version
```

Si falla alguno, resuelve ese requisito antes de seguir.

## 5. Extraer y preparar el proyecto

Extrae TODO el ZIP nuevo. La carpeta que contiene `package.json`, `src` y `src-tauri` debe quedar en:

`C:\Projects\gosu-speech-to-text`

Si Windows crea una carpeta extra al extraer, mueve la carpeta interior o ajusta la ruta. Para actualizar, conserva tu carpeta anterior como respaldo y extrae el proyecto nuevo aparte. No borres sus datos de navegador/WebView.

Abre PowerShell normal; no hace falta iniciar GOSU Speech to Text como administrador:

```powershell
cd C:\Projects\gosu-speech-to-text
Test-Path .\package.json
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\diagnostico-windows.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\preparar.ps1
```

`Test-Path` debe devolver `True`. Bypass se limita al proceso de ese script.

## 6. Abrir la aplicación y su motor automático

Desde la carpeta del proyecto:

```powershell
npm.cmd run desktop
```

La primera vez descargará dependencias Rust y compilará. La ventana debe titularse **GOSU Speech to Text — Dictation & Voice Typing** y mostrar **ESCRITORIO · 0.3.2**.

El motor se inicia automáticamente. Espera a **Motor listo · base** y concede el permiso de micrófono al grabar. No se necesita una segunda terminal ni copiar una clave. Los scripts de motor/interfaz separados siguen destinados al modo web de desarrollo.

Si ya tienes una instalación anterior funcionando, usa **ACTUALIZAR-GOSU.md** para actualizarla con respaldo en vez de empezar de cero.

## 7. Copiar: botón y atajo

- Botón **Copiar**, visible en la cabecera, incluso al desplazarte.
- Botón **Copiar texto**, también debajo del editor.
- **Ctrl+Alt+C:** copia todo el borrador activo. En escritorio es global; en navegador solo funciona cuando la página de GOSU Speech to Text tiene el foco.
- Después, en el campo de WhatsApp/ChatGPT/Docs, usa **Ctrl+V** para pegar manualmente.

La copia requiere un borrador no vacío. El programa muestra «Texto copiado». Prueba primero con una frase escrita a mano; no necesitas el motor de voz para verificar el portapapeles.

## 8. Prueba exacta de atajos y pegado

Empieza con **Bloc de notas**, para separar los problemas de instalación de los de un editor web:

1. Abre la aplicación GOSU Speech to Text 0.3.2 de escritorio.
2. Escribe `Prueba de copia desde GOSU Speech to Text` en su borrador.
3. Pulsa el botón Copiar.
4. Abre Bloc de notas y pulsa Ctrl+V. Debe aparecer la frase.
5. Borra esa frase en Bloc de notas, dejando allí el cursor.
6. Con GOSU Speech to Text abierta en segundo plano, pulsa Ctrl+Alt+C, suelta las teclas y después Ctrl+V. Esto prueba la copia global.
7. Borra de nuevo la frase, deja el cursor en Bloc de notas y pulsa **Ctrl+Alt+V**, soltando las teclas. Esto solicita copiar el borrador y pegarlo en la ventana actualmente activa. No necesitas recordar un destino mediante el atajo de grabación.
8. Si el pegado simulado no funciona, usa Ctrl+Alt+C y Ctrl+V manual. La inserción depende de las restricciones de Windows y del editor; no se anuncia como universal.
9. Para dictar desde otra aplicación: deja su campo activo y pulsa **Ctrl+Shift+Espacio**. El mismo atajo detiene. Espera a la transcripción antes de pegar.

No pulsa Enter ni envía mensajes. Copiar reemplaza el contenido del portapapeles.

El botón **Pegar en destino recordado** sigue disponible: el destino se recuerda al iniciar el dictado por atajo desde otra ventana. Si inicias con el botón dentro de GOSU Speech to Text y no has recordado un destino, ese botón no sabe adónde pegar. El nuevo Ctrl+Alt+V evita esa dependencia porque usa la ventana activa al soltar el atajo.

## 9. Si falla: mensajes concretos

- **link.exe / MSVC / Windows SDK:** falta la carga de C++ del paso 1. `where.exe link` no es una comprobación suficiente en PowerShell normal: sus rutas pueden activarse mediante las herramientas de Visual Studio al compilar.
- **rustc o cargo no reconocido:** cierra la terminal y prueba las comprobaciones del paso 2.
- **Puerto 1420 ocupado:** detén otra instancia de `npm run dev` con Ctrl+C; Tauri inicia la suya.
- **Atajo no disponible:** revisa el aviso de GOSU Speech to Text. Puede haber otra aplicación usando la misma combinación. Usa los botones mientras se resuelve el conflicto.
- **Pegado bloqueado:** prueba Bloc de notas sin elevación. Windows puede bloquear entrada sintética hacia procesos con mayores privilegios. No hace falta ejecutar todo como administrador para probar el funcionamiento básico.
- **No cambia nada al usar un atajo desde WhatsApp:** confirma que el distintivo diga ESCRITORIO, no NAVEGADOR, y que los atajos aparezcan activos.
- **No veo Copiar:** confirma el distintivo 0.3.2 y escribe algo en el borrador. El botón está arriba a la derecha.

Si falla `npm.cmd run desktop`, copia desde la PRIMERA línea que diga `error` hasta el final. Para diagnóstico de instalación, comparte también la salida de `diagnostico-windows.ps1`. No compartas la clave local del motor.

## Fuentes oficiales

- https://v2.tauri.app/start/prerequisites/
- https://rust-lang.org/es/tools/install/
- https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-sendinput

El flujo de dictado/copia/pegado anterior fue confirmado por el usuario en Windows. La versión 0.3.2 comprueba Rust para Windows GNU y pruebas automatizadas; los instaladores nuevos requieren aceptación en un Windows real. Consulta VALIDACION.md.
