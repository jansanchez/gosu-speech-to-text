"""Loopback-only transcription service. No transcript/audio persistence."""
import io
import asyncio
import sys
import os
import secrets
import threading
import wave
from contextlib import asynccontextmanager
from fastapi import FastAPI, File, UploadFile, Header, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from server.languages import LANGUAGES
from server.rewrite import RewriteRequest, rewrite
from server.semantic import SearchRequest, search

TOKEN = os.environ.get('GOSU_TOKEN') or os.environ.get('VOZ_TOKEN') or secrets.token_urlsafe(32)
MODEL_NAME = os.environ.get('GOSU_MODEL', os.environ.get('VOZ_MODEL', 'base'))
model = None
model_error = None
lock = threading.Lock()

@asynccontextmanager
async def lifespan(app):
    global model, model_error
    model = None
    model_error = None
    if not os.environ.get('VOZ_MANAGED'): print('Clave para desarrollo manual: ' + TOKEN, flush=True)
    async def load():
        global model, model_error
        try:
            from faster_whisper import WhisperModel
            print('Cargando modelo ' + MODEL_NAME + '. La primera vez se descarga desde Hugging Face.', file=sys.stderr, flush=True)
            model = await run_in_threadpool(lambda: WhisperModel(MODEL_NAME, device='cpu', compute_type='int8'))
            print('Motor local listo.', file=sys.stderr, flush=True)
        except Exception as exc:
            model_error='No se pudo cargar el modelo ('+type(exc).__name__+'). Revisa la conexión, espacio y diagnóstico; reinicia GOSU Speech to Text tras resolverlo.'
            print(model_error, file=sys.stderr, flush=True)
    loading=asyncio.create_task(load())
    try:
        yield
    finally:
        if not loading.done():loading.cancel()
        try:await loading
        except asyncio.CancelledError:pass

app=FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware,allow_origins=['http://127.0.0.1:1420','http://localhost:1420','http://tauri.localhost','https://tauri.localhost','tauri://localhost'],allow_methods=['GET','POST'],allow_headers=['X-Voz-Token','Content-Type'])

@app.get('/health')
def health():
    return {'ready':model is not None,'model':MODEL_NAME,'processing':'local','state':'ready' if model is not None else 'error' if model_error else 'loading','error':model_error}

@app.post('/transcribe')
async def transcribe(file:UploadFile=File(...),language:str=Form('es'),vocabulary:str=Form(''),x_voz_token:str=Header('')):
    if not secrets.compare_digest(x_voz_token,TOKEN):raise HTTPException(401,'Clave local incorrecta. Cópiala desde la terminal del motor.')
    if model is None:raise HTTPException(503,model_error or 'El modelo todavía se está preparando. Espera a Motor listo antes de reintentar.')
    data=await file.read(5_000_001)
    if len(data)>5_000_000:raise HTTPException(413,'Fragmento demasiado grande.')
    if len(vocabulary)>2000:raise HTTPException(400,'El diccionario es demasiado largo.')
    allowed=LANGUAGES | {'auto'}
    if language not in allowed:raise HTTPException(400,'Código de idioma no admitido por Whisper.')
    try:
        with wave.open(io.BytesIO(data)) as w:
            if w.getnchannels()!=1 or w.getsampwidth()!=2 or not 8000<=w.getframerate()<=192000 or w.getnframes()/w.getframerate()>21:
                raise ValueError('Formato o duración inválidos')
    except (wave.Error,EOFError,ValueError):raise HTTPException(400,'Se requiere audio WAV mono PCM16 de hasta 21 segundos.')
    def run():
        with lock:
            segments,info=model.transcribe(io.BytesIO(data),language=None if language=='auto' else language,beam_size=3,word_timestamps=True,vad_filter=True,condition_on_previous_text=False,initial_prompt=vocabulary or None)
            words=[]; texts=[]
            for segment in segments:
                texts.append(segment.text)
                for word in segment.words or []:
                    words.append({'text':word.word,'review':bool(word.probability<0.65)})
            return {'text':''.join(texts).strip(),'words':words,'language':info.language}
    try:return await run_in_threadpool(run)
    except Exception as exc:
        print('Fallo de inferencia:',type(exc).__name__,file=sys.stderr,flush=True)
        raise HTTPException(500,'No se pudo transcribir. Conserva o reintenta el fragmento.')


@app.post('/rewrite')
async def edit_naturally(request:RewriteRequest,x_voz_token:str=Header('')):
    if not secrets.compare_digest(x_voz_token,TOKEN):raise HTTPException(401,'Autenticación local incorrecta.')
    return await run_in_threadpool(lambda:rewrite(request))

@app.post('/search')
async def search_naturally(request:SearchRequest,x_voz_token:str=Header('')):
    if not secrets.compare_digest(x_voz_token,TOKEN):raise HTTPException(401,'Autenticación local incorrecta.')
    return await run_in_threadpool(lambda:search(request))
