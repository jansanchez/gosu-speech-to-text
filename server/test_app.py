"""API tests use a deterministic fake model; not an accuracy benchmark."""
import io
import wave
import unittest
import numpy as np
from types import SimpleNamespace
from fastapi.testclient import TestClient
from server import app as module

def audio():
    b=io.BytesIO()
    with wave.open(b,'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(16000);w.writeframes(b'\0\0'*16000)
    return b.getvalue()

class Model:
    def transcribe(self,*a,**kw):
        return iter([SimpleNamespace(text=' Hola Jan.',words=[SimpleNamespace(word=' Hola',probability=.99),SimpleNamespace(word=' Jan',probability=np.float32(.4))])]),SimpleNamespace(language='es')

class ApiTests(unittest.TestCase):
    def setUp(self):
        module.model=Model();self.client=TestClient(module.app)
    def post(self,data=None,token=None,language='es'):
        return self.client.post('/transcribe',files={'file':('test.wav',audio() if data is None else data,'audio/wav')},data={'language':language},headers={'X-Voz-Token':module.TOKEN if token is None else token})
    def test_not_ready_refuses_audio_without_losing_the_request_contract(self):
        module.model=None
        response=self.post()
        self.assertEqual(response.status_code,503)
        self.assertIn('modelo',response.json()['detail'])
    def test_auth(self):self.assertEqual(self.post(token='wrong').status_code,401)
    def test_invalid_audio(self):self.assertEqual(self.post(data=b'not wav').status_code,400)
    def test_invalid_language(self):self.assertEqual(self.post(language='made-up').status_code,400)
    def test_transcription_and_review(self):
        r=self.post();self.assertEqual(r.status_code,200);self.assertEqual(r.json()['text'],'Hola Jan.');self.assertTrue(r.json()['words'][1]['review'])
    def test_cors(self):
        r=self.client.options('/transcribe',headers={'Origin':'https://untrusted.example','Access-Control-Request-Method':'POST'});self.assertNotIn('access-control-allow-origin',r.headers)
    def test_health(self):self.assertEqual(self.client.get('/health').json()['processing'],'local')
if __name__=='__main__':unittest.main()
