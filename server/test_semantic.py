import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from server.app import app,TOKEN
from server.semantic import cache
class SemanticTests(unittest.TestCase):
 def setUp(self):cache.clear();self.client=TestClient(app)
 def post(self,model='bge-m3'):
  return self.client.post('/search',headers={'X-Voz-Token':TOKEN},json={'query':'saludo','model':model,'documents':[{'id':'a','text':'hola'},{'id':'b','text':'despedida'}]})
 @patch('server.semantic.local_post')
 def test_cosine_ranking_and_cache(self,request):
  request.side_effect=[{}, {'embeddings':[[1,0]]},{'embeddings':[[.9,.1]]},{'embeddings':[[0,1]]}]
  result=self.post();self.assertEqual(result.status_code,200);self.assertEqual([r['id'] for r in result.json()['results']],['a','b'])
  request.side_effect=[{}];self.assertEqual(self.post().status_code,200);self.assertEqual(request.call_count,5)
 @patch('server.semantic.local_post')
 def test_invalid_or_remote_embeddings_refused(self,request):
  request.side_effect=[{}, {'embeddings':[[0,0]]}];self.assertEqual(self.post().status_code,502)
  request.reset_mock();self.assertEqual(self.post('model:cloud').status_code,400);request.assert_not_called()
if __name__=='__main__':unittest.main()
