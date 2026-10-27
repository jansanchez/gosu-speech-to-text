import test from 'node:test';import assert from 'node:assert/strict';import {edit,clean,wav} from '../src/core.ts';
test('ambiguous replacement does not change text',()=>{const r=edit('Juan llamó a Juan.','cambia Juan por Pedro');assert.equal(r.changed,false);assert.equal(r.text,'Juan llamó a Juan.');});
test('selection limits correction and preserves surrounding text',()=>assert.equal(edit('Juan llamó a Juan.','cambia Juan por Pedro',[13,17]).text,'Juan llamó a Pedro.'));
test('negation is never discarded by cleanup',()=>assert.equal(clean('Eh, no acepto la oferta.',['eh'],{}),'no acepto la oferta.'));
test('dictionary replacement uses unicode boundaries and literal values',()=>assert.equal(clean('ne cso y dólares',[],{'ne cso':'Nexo $&'}),'Nexo $& y dólares'));
test('unrecognized instruction leaves text intact',()=>assert.equal(edit('Texto importante.','envía el mensaje').changed,false));
test('deletes final sentence only',()=>assert.equal(edit('Primera frase. Segunda frase.','borra la última frase').text,'Primera frase.'));
test('WAV encoder header and clipping',async()=>{const d=new DataView(await wav(new Float32Array([-2,0,2]),16000).arrayBuffer());assert.equal(d.getUint32(24,true),16000);assert.equal(d.getUint32(40,true),6);assert.equal(d.getInt16(44,true),-32768);assert.equal(d.getInt16(48,true),32767);});
