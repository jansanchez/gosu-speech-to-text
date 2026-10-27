# Dependencias y modelos

El código propio está bajo MIT (LICENSE). Las dependencias mantienen sus licencias originales.

- Tauri / plugins: https://github.com/tauri-apps/tauri
- React: https://github.com/facebook/react
- arboard: https://github.com/1Password/arboard
- Faster Whisper: https://github.com/SYSTRAN/faster-whisper
- CTranslate2: https://github.com/OpenNMT/CTranslate2
- PyAV / FFmpeg: https://github.com/PyAV-Org/PyAV (ver licencias de la distribución binaria concreta).
- ONNX Runtime: https://github.com/microsoft/onnxruntime
- Transformers.js: https://github.com/huggingface/transformers.js
- Whisper: https://github.com/openai/whisper
- Modelo Chrome: https://huggingface.co/onnx-community/whisper-tiny

Antes de distribuir binarios, conserva y revisa las licencias/notices de todas las dependencias empaquetadas, incluyendo PyAV/FFmpeg y las bibliotecas del motor. MIT del proyecto no sustituye estas obligaciones. Los pesos se descargan por separado.

## Modelos de texto opcionales 0.3

- Ollama: https://github.com/ollama/ollama
- Modelo de entrada para edición: https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct (licencia declarada Apache-2.0 en su ficha).
- Búsqueda multilingüe: https://huggingface.co/BAAI/bge-m3 (licencia declarada MIT en su ficha).

Los modelos de texto no se incluyen en el ZIP ni en el instalador básico: se descargan mediante la herramienta opcional. Las licencias de otros modelos que el usuario elija deben comprobarse por separado. El empaquetador Chrome copia notices de sus runtimes principales; el de Python conserva metadatos de las dependencias principales. Revisa también las dependencias transitivas y licencias del binario concreto antes de redistribuir.
