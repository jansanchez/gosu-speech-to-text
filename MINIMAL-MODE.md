# Dictado mínimo

El modo mínimo usa una ventana pequeña con el nivel real del micrófono y un solo atajo para iniciar y terminar. El editor completo sigue disponible para preferencias, historial y recuperación.

## Uso

1. Mantén GOSU abierto y espera a que el motor esté listo.
2. Pulsa **Ctrl+Shift+M** para alternar entre el editor y el panel minimalista. Si GOSU estaba oculto, muestra la vista elegida.
3. Pulsa **Ctrl+Shift+Espacio** para comenzar a grabar. En el editor conserva el flujo de grabación del editor; en el panel controla la sesión de dictado mínimo.
4. Habla. Puedes cambiar de aplicación o campo mientras grabas. Las barras responden al sonido y el texto se prepara por tramos.
5. Haz clic en el campo de destino (pasar el puntero por encima puede no darle el foco) y pulsa **Ctrl+Shift+Espacio** para terminar. GOSU selecciona la ventana enfocada en ese momento, espera los últimos fragmentos, copia todo el dictado al portapapeles e intenta insertarlo. Mantén el campo elegido durante el procesamiento.
6. Pulsa de nuevo el atajo de dictado para otra grabación. El panel permanece disponible. **Ctrl+Shift+H** oculta GOSU; otra pulsación restaura la misma vista (editor o minimalista). Ocultar no cierra la aplicación ni altera una grabación o transcripción en curso.

En macOS se usa **Cmd** en lugar de **Ctrl** para ambos valores iniciales. Los tres atajos están activos desde el primer inicio si el sistema permite registrarlos y están libres.

**Preferencias** y **Configurar** en la pantalla principal ofrecen tres selectores: **Iniciar o detener dictado**, **Alternar editor y modo minimalista** y **Mostrar u ocultar GOSU**. En cada uno pulsa **Elegir combinación**, introduce las teclas y pulsa **Guardar atajo**. Cada combinación se guarda por separado, con su propio valor predeterminado. No se permite usar la misma combinación para acciones diferentes. Las preferencias anteriores conservan los atajos existentes; el de visibilidad se añade con Ctrl/Cmd+Shift+H, o una alternativa libre entre las preferencias de GOSU; al cargar se añade el del panel (Ctrl/Cmd+Alt+M si Ctrl/Cmd+Shift+M ya era el de dictado).

Ocultar el panel durante la captura mantiene el micrófono activo: usa el atajo de dictado para terminar. **Editor** durante captura o procesamiento cancela la inserción automática y conserva el trabajo.

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

En Wayland genérico no existe una API universal para leer la ventana activa o mover el foco a una aplicación arbitraria. El backend de portales escribe en el campo que conserva el foco y muestra **Campo activo**; selecciona ese campo antes de terminar y mantenlo seleccionado durante el procesamiento. Envía caracteres Unicode mediante la sesión autorizada y convierte los caracteres de control en espacios para no simular Enter ni Tab. Las otras integraciones recuerdan la ventana seleccionada al terminar, pero no pueden garantizar que el usuario no haya cambiado el campo o la pestaña dentro de esa misma ventana.

Que un sistema sea Ubuntu no determina sus capacidades: importan la sesión Xorg/Wayland, la versión del escritorio, sus portales y los permisos concedidos. Si una capacidad no está disponible o se deniega, GOSU informa el error y conserva el texto; no declara que se haya insertado.

## Atajos ya registrados

Durante una recarga de desarrollo, los registros nativos pueden sobrevivir al reinicio de la interfaz. GOSU consulta cuáles pertenecen a su propia instancia y los renueva. No elimina atajos de otras aplicaciones. Si otra aplicación o el compositor ya usa la combinación, selecciona otra en Preferencias.

En Hyprland, el registro es temporal y se retira al cerrar normalmente GOSU. Recargar la configuración de Hyprland puede eliminarlo: vuelve a abrir GOSU o cambia y restaura el atajo. Con GOSU en ejecución también puedes alternar editor/panel con `gosu-speech-to-text --show-minimal`, o activar su dictado mediante `--toggle-minimal`, o mostrar/ocultar la vista actual con `--toggle-visibility` (puente local Linux).

## Recuperación y validación

Cada dictado mínimo tiene un borrador independiente. El audio y el texto siguen el protocolo de recuperación habitual. Si falla la transcripción, no se inserta un resultado parcial. Si falla identificar el destino o insertar, no hay reintento automático: el texto completo ya queda en el portapapeles y el panel lo indica. Haz clic en el campo y pega con Ctrl+V (Cmd+V en macOS), o Ctrl+Shift+V en WezTerm y otras terminales. Ctrl+Shift+B no es el pegado habitual de terminal. Si falla el propio portapapeles, se comunica el error y se conserva el borrador en el editor. Un fallo de transporte después de enviar teclas puede dejar una inserción parcial; comprueba el destino antes de volver a pegar.

Las pruebas automatizadas cubren el ciclo del atajo, aislamiento del borrador, espera de la última transcripción, cancelación de inserción, denegación de permisos y renovación de registros propios. Las pruebas locales de Linux no certifican Windows, GNOME/KDE ni macOS: esas plataformas deben compilarse en CI y probarse en sus escritorios reales antes de distribuir.

Referencias de los protocolos: [portales de entrada](https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.RemoteDesktop.html), [atajos de portal](https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.GlobalShortcuts.html) y [dispatchers Hyprland](https://wiki.hypr.land/configuring/core/dispatchers/).

Ocultar el panel no detiene una grabación activa; al terminar el dictado se cierra el micrófono y la aplicación y el modelo siguen cargados para el próximo dictado. No se ha medido el consumo de RAM/CPU de este flujo ni se descarga el modelo automáticamente. Para salir, vuelve al editor y cierra la aplicación.

El panel deja un margen inferior aproximado del 15 % de la altura de la pantalla para no tapar el campo de entrada de los chats. No se vuelve a posicionar al iniciar cada dictado si ya está visible. Puedes grabar aunque al empezar todavía tengas enfocado GOSU; el destino se necesita al terminar, no al abrir el micrófono.
