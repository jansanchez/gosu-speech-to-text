# Datos de GOSU Speech to Text 0.3

Este documento describe el comportamiento del código entregado; quien publique una distribución debe completar sus datos de responsable y enlaces de soporte.

## Escritorio

La captura se procesa en el dispositivo mediante Faster Whisper. Un servicio Python se inicia en 127.0.0.1, puerto dinámico, autenticado para operaciones con una clave aleatoria que se intercambia con el proceso Rust. No se expone intencionalmente a la LAN. El modelo se descarga desde Hugging Face en el primer inicio y después se utiliza su caché.

La bandeja, versiones, preferencias, plantillas y audio pendiente se guardan en IndexedDB local. El audio de cada trabajo se elimina de la cola tras guardar su resultado. El historial normal no tiene cifrado propio. El usuario puede exportar texto y respaldo, limpiar borradores antiguos, eliminar audio y borrar datos de la aplicación. Los archivos exportados, modelos y respaldos de código se administran por separado.

La sesión privada evita la persistencia automática del texto y audio nuevo de esa sesión. Usa memoria del proceso/navegador y no promete borrado forense de RAM, swap, diagnósticos del sistema o archivos exportados expresamente. Al salir se restaura la bandeja anterior. La sesión privada no cifra ni elimina datos guardados anteriormente.

Los respaldos con contraseña se cifran antes de descargarse; sin contraseña son texto JSON. No incluyen la clave local ni el audio pendiente. No existe recuperación de contraseñas.

## Editor y búsqueda opcionales

El usuario debe instalar y activar modelos locales mediante Ollama. La aplicación envía al servidor de Ollama en 127.0.0.1:11434 el fragmento seleccionado y la instrucción de edición, o consulta y hasta 300 extractos de la bandeja para búsqueda semántica. Rechaza nombres cloud y modelos que se declaren remotos. No hay integración con un proveedor de IA remoto en esta versión. Los vectores de búsqueda se cachean en memoria del motor.

Las reglas de reemplazo se guardan solo por confirmación o entrada manual. No hay entrenamiento automático ni inferencia permanente de preferencias a partir de una sola corrección.

## Chrome

Transformers.js/Whisper WASM procesa audio en el navegador. Los pesos se descargan de Hugging Face y sus dominios de distribución. Código JavaScript y WASM se empaquetan localmente. Texto, reglas, versiones y plantillas se guardan en chrome.storage.local; audio pendiente en IndexedDB, excepto en sesión privada. Los pesos permanecen en caché hasta su borrado o expulsión por el navegador.

activeTab y scripting permiten actuar en la pestaña elegida mediante el icono y solicitar inserción en el campo capturado. Se comprueba que el campo siga disponible y no haya cambiado. No se capturan contraseñas como destino. No se lee indiscriminadamente todo el contenido del navegador ni otras pestañas.

## Acciones explícitas

Copiar reemplaza el portapapeles del sistema. Pegar solicita al destino activo/recordado que pegue, después de revisar el texto; no envía mensajes ni pulsa Enter. Lectura de texto selecciona voces identificadas como locales por el navegador. Exportar o insertar texto lo entrega al destino elegido por el usuario.

No se incluye telemetría ni sincronización automática. La transferencia a Drive u otro almacenamiento se hace mediante archivos exportados por el usuario. Los diagnósticos registran arranque, modelo y errores técnicos; conviene revisarlos antes de compartirlos.
