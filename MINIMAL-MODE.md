# Dictado mínimo

El modo mínimo usa una ventana pequeña con el nivel real del micrófono y un solo atajo para iniciar y terminar. El editor completo sigue disponible para preferencias, historial y recuperación.

## Uso

1. Mantén GOSU abierto y espera a que el motor esté listo.
2. Pon el cursor en el campo donde quieres escribir: terminal, WhatsApp, documento u otro editor.
3. Pulsa **Ctrl+Shift+Espacio**. Aparece el indicador y comienza la grabación.
4. Habla. Las barras responden al sonido y el texto se prepara por tramos.
5. Pulsa el mismo atajo para terminar. GOSU espera los últimos fragmentos e inserta solo el dictado de esa sesión.

La ventana se oculta después de la inserción. El atajo vuelve a mostrarla para otro dictado. **Editor** permite volver al espacio completo; si se usa durante la grabación o transcripción, se cancela la inserción automática y se conserva el trabajo. **Modo mínimo** en la cabecera abre el indicador sin comenzar a grabar.

El valor inicial es **Ctrl+Shift+Espacio** en Linux/Windows y **Cmd+Shift+Espacio** en macOS. Se activa al abrir GOSU sin exigir una configuración previa, siempre que la combinación esté libre y el sistema permita registrarla.

Para cambiarlo, pulsa la combinación que aparece en la ventana mínima o abre **Preferencias**. En **Atajo de dictado mínimo**, elige **Elegir combinación**, pulsa las teclas deseadas y después **Guardar atajo**. También está visible desde la pantalla principal en **Tu atajo de dictado → Configurar**. La configuración se guarda y se restaura en los siguientes arranques. **Usar predeterminado** recupera el valor inicial.

Mientras eliges las teclas se suspenden temporalmente los atajos de GOSU. Si la nueva combinación no se puede registrar, se vuelve al último atajo válido y se muestra el error. No se sustituyen combinaciones de otras aplicaciones.

GOSU no pulsa Enter para enviar mensajes o ejecutar órdenes. Una aplicación puede cambiar el comportamiento del pegado; revisa el campo antes de enviar o ejecutar lo escrito.

## Integración según el sistema

| Sistema | Mecanismo implementado | Requisitos y alcance |
|---|---|---|
| Windows | Ventana activa y teclado Win32 | Captura HWND y proceso, comprueba el destino y usa el pegado nativo. Los destinos con privilegios superiores pueden bloquear la entrada. |
| Linux X11, incluido Ubuntu en sesión Xorg | Identificación de ventana y pegado X11 | Requiere `xdotool` y `xprop`. Distingue terminales para usar Ctrl+Shift+V. |
| Hyprland Wayland | Integración del compositor | Usa `hyprctl`, valida ventana/proceso y registra un atajo temporal propio sin reemplazar combinaciones ocupadas. |
| GNOME/KDE Wayland, incluido Ubuntu con portales compatibles | GlobalShortcuts y RemoteDesktop de XDG Desktop Portal | El sistema debe implementar ambos portales y autorizar la integración. No se solicita captura de pantalla; se pide teclado. |
| macOS | Aplicación activa y automatización del sistema | Requiere los permisos de accesibilidad/automatización que solicite macOS. |

En Wayland genérico no existe una API universal para leer la ventana activa o mover el foco a una aplicación arbitraria. El backend de portales escribe en el campo que conserva el foco y muestra **Campo activo**; mantén ese campo seleccionado durante el dictado. Envía caracteres Unicode mediante la sesión autorizada y convierte los caracteres de control en espacios para no simular Enter ni Tab. Las otras integraciones recuerdan la ventana, pero no pueden garantizar que el usuario no haya cambiado el campo o la pestaña dentro de esa misma ventana.

Que un sistema sea Ubuntu no determina sus capacidades: importan la sesión Xorg/Wayland, la versión del escritorio, sus portales y los permisos concedidos. Si una capacidad no está disponible o se deniega, GOSU informa el error y conserva el texto; no declara que se haya insertado.

## Atajos ya registrados

Durante una recarga de desarrollo, los registros nativos pueden sobrevivir al reinicio de la interfaz. GOSU consulta cuáles pertenecen a su propia instancia y los renueva. No elimina atajos de otras aplicaciones. Si otra aplicación o el compositor ya usa la combinación, selecciona otra en Preferencias.

En Hyprland, el registro es temporal y se retira al cerrar normalmente GOSU. Recargar la configuración de Hyprland puede eliminarlo: vuelve a abrir GOSU o cambia y restaura el atajo. Con GOSU en ejecución también puedes abrir solo el indicador con `gosu-speech-to-text --show-minimal`, o activar su atajo mediante `--toggle-minimal` (puente local Linux).

## Recuperación y validación

Cada dictado mínimo tiene un borrador independiente. El audio y el texto siguen el protocolo de recuperación habitual. Si falla la transcripción, no se inserta un resultado parcial. Si falla la inserción, no hay reintento automático: abre el editor para revisar y copiar el contenido. Un fallo de transporte después de enviar teclas puede dejar una inserción parcial; comprueba el destino antes de volver a pegar.

Las pruebas automatizadas cubren el ciclo del atajo, aislamiento del borrador, espera de la última transcripción, cancelación de inserción, denegación de permisos y renovación de registros propios. Las pruebas locales de Linux no certifican Windows, GNOME/KDE ni macOS: esas plataformas deben compilarse en CI y probarse en sus escritorios reales antes de distribuir.

Referencias de los protocolos: [portales de entrada](https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.RemoteDesktop.html), [atajos de portal](https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.GlobalShortcuts.html) y [dispatchers Hyprland](https://wiki.hypr.land/configuring/core/dispatchers/).
