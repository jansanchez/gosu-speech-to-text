# Dependencies and models

Original project code is MIT licensed (LICENSE). Dependencies retain their own licenses.

- Tauri / plugins: https://github.com/tauri-apps/tauri
- React: https://github.com/facebook/react
- arboard: https://github.com/1Password/arboard
- Faster Whisper: https://github.com/SYSTRAN/faster-whisper
- CTranslate2: https://github.com/OpenNMT/CTranslate2
- PyAV / FFmpeg: https://github.com/PyAV-Org/PyAV (review the licenses of the exact binary distribution).
- ONNX Runtime: https://github.com/microsoft/onnxruntime
- Transformers.js: https://github.com/huggingface/transformers.js
- Whisper: https://github.com/openai/whisper
- Modelo Chrome: https://huggingface.co/onnx-community/whisper-tiny


Before redistributing, retain and review licenses/notices for every bundled dependency, including PyAV/FFmpeg and the engine libraries. The project MIT license does not replace their requirements. Model weights are downloaded separately.

## Optional local text models

- Ollama: https://github.com/ollama/ollama
- Entry-level editing model: https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct (its model card declares Apache-2.0).
- Multilingual search: https://huggingface.co/BAAI/bge-m3 (its model card declares MIT).

Text models are not included in the ZIP or base installer; they are downloaded through optional tooling. Review licenses separately for any alternative model. Chrome packaging copies notices for its primary runtimes; Python packaging retains principal dependency metadata. Review transitive dependencies and licenses for the actual packaged binaries too.
