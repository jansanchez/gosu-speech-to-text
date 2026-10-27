import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from server.app import app,TOKEN

class RewriteTests(unittest.TestCase):
    def setUp(self):self.client=TestClient(app)
    def post(self,**values):
        body={'text':'No enviar 42 mensajes.','instruction':'Hazlo más breve','model':'qwen2.5:1.5b'};body.update(values)
        return self.client.post('/rewrite',json=body,headers={'X-Voz-Token':TOKEN})
    def test_auth(self):self.assertEqual(self.client.post('/rewrite',json={'text':'x','instruction':'y'}).status_code,401)
    @patch('server.rewrite.local_post')
    def test_remote_models_refused_before_sending_text(self,post):
        self.assertEqual(self.post(model='model:cloud').status_code,400);post.assert_not_called()
        post.return_value={'remote_host':'https://remote.example'}
        self.assertEqual(self.post().status_code,400);self.assertEqual(post.call_count,1)
    @patch('server.rewrite.local_post')
    def test_review_required_and_original_sent_as_data(self,post):
        post.side_effect=[{}, {'message':{'content':'{"text":"No enviar los 42 mensajes."}'}}]
        response=self.post();self.assertEqual(response.status_code,200);self.assertTrue(response.json()['review_required']);self.assertEqual(response.json()['text'],'No enviar los 42 mensajes.')
        payload=post.call_args_list[1].args[1];self.assertIn('No enviar 42',payload['messages'][1]['content']);self.assertFalse(payload['stream'])
    @patch('server.rewrite.local_post')
    def test_malformed_proposal_is_not_applied(self,post):
        post.side_effect=[{}, {'message':{'content':'not valid json'}}]
        self.assertEqual(self.post().status_code,502)
    def test_request_limits(self):self.assertEqual(self.post(text='x'*24001).status_code,422)

if __name__=='__main__':unittest.main()
