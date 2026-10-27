# Evolución de GOSU Speech to Text

La matriz vigente está en FEATURES.md. La guía de uso y compilación es GUIA-0.3.md.

## Base confirmada por el usuario

En Windows, versión 0.2.1 con parche de arranque: dictado local, copia global Ctrl+Alt+C y pegado global Ctrl+Alt+V. El parche está integrado en server/engine.py.

## Ampliación 0.3

Edición local opcional con vista previa, deshacer/rehacer, selección y opciones numeradas, aprendizaje explícito de reemplazos, plantillas, organización, búsqueda semántica opcional, importación de audio, sesión privada, respaldos cifrados, accesibilidad adicional y recuperación de audio en extensión. Adaptadores X11/macOS incluidos para probar.

## Validación para distribución

- Ejecutar el workflow y probar instaladores en Windows limpio, Arch/X11, Arch/Wayland y macOS por arquitectura.
- Repetir dictado/copia/pegado después de la ampliación. Probar fallos de foco y versiones tardías.
- Probar micrófono, WASM, caché y recuperación en Chrome real.
- Instalar los modelos Ollama y evaluar calidad, latencia y preservación de cifras/negaciones en voz humana.
- Auditar accesibilidad con lectores de pantalla y hablantes de distintos idiomas.
- Revisar notices de los binarios finales y configurar firma/notarización antes de publicar como estable.

## Capacidades posteriores

FEATURES.md mantiene la lista de pendientes: streaming provisional, edición dentro del destino, sincronización OAuth, teléfono como micrófono, cifrado del historial interno, actualizaciones firmadas, paridad de órdenes multilingües y adaptación a Wayland.

El criterio principal sigue siendo reducir el tiempo total hasta tener un texto correcto y revisado, sin perder cambios manuales ni información recuperable.
