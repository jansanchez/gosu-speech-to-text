# Arquitectura de GOSU Speech to Text

## Recorrido del dictado

1. `Capture` (`src/audio.ts`) captura audio mediante un AudioWorklet y emite WAV por pausas o al llegar a 18 segundos.
2. `useAudioQueue` guarda cada fragmento en IndexedDB antes de enviarlo al motor.
3. `transport.ts` usa IPC en escritorio y HTTP en desarrollo web. El escritorio comunica Rust con FastAPI por loopback.
4. El motor Python valida el WAV y ejecuta Faster Whisper bajo un bloqueo de inferencia.
5. La interfaz aplica el resultado, guarda el texto junto con el ID del fragmento procesado y después elimina ese audio.

Los cambios de esta preparación mantienen los identificadores históricos `org.voz.prototype`, `voz-state` y `voz-jobs`. No cambiar esos nombres sin una migración explícita.

## Responsabilidades

| Módulo | Responsabilidad |
|---|---|
| `src/App.tsx` | Coordina las operaciones del editor y compone la pantalla. |
| `src/components/` | Editor, bandeja y diálogo de preferencias. |
| `src/hooks/useWorkspace.ts` | Carga validada, estado local y guardado automático. |
| `src/hooks/useAudioQueue.ts` | Orden, persistencia y recuperación del audio. |
| `src/hooks/useEngine.ts` | Conexión, estado, diagnóstico y reinicio del motor. |
| `src/hooks/useGlobalShortcuts.ts` | Registro y retirada ordenados de atajos. |
| `src/hooks/useMinimalDictation.ts` | Sesión de dictado mínimo, destino capturado, finalización e inserción. |
| `src-tauri/src/minimal.rs` | Ventana mínima y selección del adaptador del sistema. |
| `src-tauri/src/hyprland.rs` | Destinos y atajos del compositor Hyprland. |
| `src-tauri/src/portal.rs` | Atajos y teclado Wayland autorizados mediante portales estándar. |
| `src/validation.ts` | Validación común de historial, preferencias y respaldos. |
| `src/persistence.ts` | Escrituras serializadas y estado de guardado. |
| `src/history.ts` | Límites del historial y agrupación de escritura manual. |
| `src/jobs.ts` | Contrato y validación de audio recuperado. |
| `src/product.ts` | Tipos, valores iniciales, órdenes de control y respaldos. |
| `src/core.ts` | Limpieza, edición determinista y codificación WAV. |
| `src/extension-state.ts` | Validación y migración del borrador de Chrome. |
| `src-tauri/src/engine.rs` | Proceso Python, conexión inicial, vigilancia y reinicio. |
| `server/` | Reconocimiento y funciones opcionales de Ollama. |

Chrome comparte captura, edición, preferencias, historial y respaldos, pero ejecuta su propio reconocedor WASM. No depende del servidor Python. Su controlador permanece en `extension/recorder.js`; las pruebas de ejecución sustituyen únicamente dispositivo y reconocedor.

## Invariantes de almacenamiento

- Un dato inválido al cargar bloquea el guardado automático. No reemplazar silenciosamente datos corruptos por un historial vacío.
- Las escrituras usan instantáneas inmutables y mantienen su orden. Una escritura anterior no puede marcar como guardado un cambio posterior pendiente.
- El guardado automático agrupa cambios durante 20 ms. Los commits de la cola y las transiciones de privacidad guardan inmediatamente y esperan su resultado.
- Primero guardar audio; después reconocer. Primero guardar texto e ID procesado; después eliminar audio.
- Si falla eliminar el audio, conservar su ID procesado. Reintentar no debe volver a aplicar la transcripción.
- Limpiar los IDs procesados solo cuando su audio ya no pueda recuperarse del almacenamiento. No truncarlos por una cantidad arbitraria.
- Si falla guardar un fragmento, conservarlo en memoria y detener la captura de escritorio. Los fragmentos sin guardar se pierden si el proceso termina.
- La sesión privada evita la persistencia automática de su contenido. No cifra el historial existente.
- El historial conserva hasta 50 entradas y aproximadamente dos millones de caracteres por pila de deshacer/rehacer. Siempre conserva la última entrada, incluso si esta supera el presupuesto.

El estado completo sigue guardándose en una sola clave; la cola usa otra. Si el volumen real exige almacenamiento por borrador o por fragmento, implementar una migración versionada y repetir las pruebas de recuperación antes de sustituir este protocolo.

## Ciclo de vida del motor

Rust inicia Python con entrada y salida por tuberías. Python devuelve una conexión JSON con puerto dinámico y token. Rust acepta una respuesta acotada, HTTP y `127.0.0.1`; el plazo inicial es de 90 segundos. Este plazo no limita la descarga posterior del modelo.

Ante salida, protocolo inválido o vencimiento, Rust limpia el proceso y expone el error. El usuario puede usar **Reiniciar motor**; los textos y audios pendientes se conservan y su reintento es explícito. Cada proceso tiene una generación: un supervisor antiguo no puede modificar el estado de su reemplazo.

## Límites de la evidencia

Tres atajos independientes y configurables controlan la vista editor/minimalista, la visibilidad de la aplicación y el inicio/fin del dictado. La vista elegida se mantiene en memoria al ocultar/restaurar; al iniciar la aplicación aparece el editor. Mostrar u ocultar no altera la captura ni cancela la inserción; abrir el editor sí cancela la inserción automática. Terminar deja el panel disponible para otro dictado. Mostrar no abre el micrófono. Cada dictado crea un borrador independiente y captura el destino enfocado al solicitar terminar, antes de esperar el cierre del micrófono y el vaciado de su cola. No consulta el foco periódicamente. Solo después guarda el texto y lo copia al portapapeles antes de intentar insertarlo. Un fallo al capturar el destino no interrumpe el vaciado de la cola ni la copia. La preparación de captura solicita permisos del portal cuando corresponde, sin exigir una ventana externa enfocada. Abrir el editor invalida la finalización automática mediante una generación de sesión. Los errores de inserción no se reintentan automáticamente.

Los atajos consultan la propiedad del registro antes de renovarlo; la cadena de registro vive en el contexto global del WebView para sobrevivir a las recargas de módulos. Hyprland tiene un puente de control Unix limitado al usuario; espera el registro de la ventana al mostrarla y admite la identidad de aplicación cuando WebKit reporta un PID diferente; GNOME/KDE usan los portales del sistema. `MINIMAL-MODE.md` detalla las capacidades y límites por sistema.

Las pruebas automatizadas sustituyen la inferencia y los dispositivos. Compilar y probar los adaptadores no demuestra precisión del reconocimiento ni garantiza permisos, foco o pegado en un escritorio real. Antes de distribuir, repetir las pruebas manuales de `VALIDACION.md` en cada sistema y arquitectura.
