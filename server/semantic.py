"""Optional local semantic search via Ollama embeddings; bounded in-memory cache."""
import hashlib
import math
import threading
from fastapi import HTTPException
from pydantic import BaseModel,Field
from server.rewrite import local_post

class Document(BaseModel):
    id:str=Field(max_length=200)
    text:str=Field(max_length=4000)
class SearchRequest(BaseModel):
    query:str=Field(min_length=1,max_length=1000)
    documents:list[Document]=Field(max_length=300)
    model:str=Field(default='bge-m3',min_length=1,max_length=100,pattern=r'^[A-Za-z0-9_.:/-]+$')
cache={}
cache_lock=threading.Lock()

def search(request:SearchRequest):
    if 'cloud' in request.model.lower():raise HTTPException(400,'Usa un modelo de embeddings local.')
    info=local_post('/api/show',{'model':request.model},15)
    if info.get('remote_model') or info.get('remote_host'):raise HTTPException(400,'El modelo de búsqueda debe estar instalado localmente.')
    def vector(text):
        key=hashlib.sha256((request.model+'\0'+text).encode()).hexdigest()
        with cache_lock:existing=cache.get(key)
        if existing is not None:return existing
        raw=local_post('/api/embed',{'model':request.model,'input':text},60)
        try:
            values=raw['embeddings'][0]
            if not isinstance(values,list) or not values or len(values)>8192 or any(not isinstance(n,(int,float)) or not math.isfinite(n) for n in values):raise ValueError()
            norm=math.sqrt(sum(n*n for n in values))
            if not norm:raise ValueError()
            value=[n/norm for n in values]
        except (KeyError,TypeError,ValueError,IndexError) as exc:raise HTTPException(502,'El modelo devolvió un vector no válido.') from exc
        with cache_lock:
            if len(cache)>1000:cache.clear()
            cache[key]=value
        return value
    query=vector(request.query);results=[]
    for doc in request.documents:
        values=vector(doc.text)
        if len(values)!=len(query):raise HTTPException(502,'El modelo devolvió dimensiones inconsistentes.')
        results.append({'id':doc.id,'score':sum(a*b for a,b in zip(query,values))})
    return {'results':sorted(results,key=lambda a:a['score'],reverse=True)[:20]}
