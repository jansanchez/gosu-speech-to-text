import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaults,
  languages,
  punctuation,
  control,
  encodeBackup,
  decodeBackup,
} from '../src/product';
import {
  appendTranscript,
  countWords,
  normalizeNavigationCommand,
  priorityLanguages,
} from '../src/speech';
import { clean, edit } from '../src/core';
import { validateSettings } from '../src/validation';

const examples = [
  ['en', 'Hello comma world', 'Hello, world', 'undo', 'replace Alpha with Beta'],
  ['zh', '你好逗号世界', '你好，世界', '撤销', '把Alpha替换为Beta'],
  [
    'hi',
    'नमस्ते अल्पविराम दुनिया',
    'नमस्ते, दुनिया',
    'पूर्ववत करें',
    'Alpha को Beta से बदलें',
  ],
  ['es', 'Hola coma mundo', 'Hola, mundo', 'deshacer', 'cambia Alpha por Beta'],
  ['fr', 'Bonjour virgule monde', 'Bonjour, monde', 'annuler', 'remplace Alpha par Beta'],
  ['ar', 'مرحبا فاصلة عالم', 'مرحبا، عالم', 'تراجع', 'استبدل Alpha بـBeta'],
  [
    'bn',
    'হ্যালো কমা বিশ্ব',
    'হ্যালো, বিশ্ব',
    'পূর্বাবস্থায় ফিরুন',
    'Alpha এর বদলে Beta লিখুন',
  ],
  ['pt', 'Olá vírgula mundo', 'Olá, mundo', 'desfazer', 'substitua Alpha por Beta'],
  ['ru', 'Привет запятая мир', 'Привет, мир', 'отменить', 'замени Alpha на Beta'],
  ['ur', 'سلام کوما دنیا', 'سلام، دنیا', 'واپس کریں', 'Alpha کو Beta سے بدلیں'],
];
for (const [code, spoken, expected, undo, replace] of examples) {
  test(`${code}: recognition selection, punctuation, correction, and backup preserve Unicode`, async () => {
    assert.ok(priorityLanguages.some(([value]) => value === code));
    assert.ok(languages.some(([value]) => value === code));
    assert.equal(validateSettings({ ...defaults, language: code }).language, code);
    assert.equal(punctuation(spoken, code), expected);
    assert.equal(control(undo), 'undo');
    for (const ending of ['.', '。', '؟', '۔', '।'])
      assert.equal(control(`${undo}${ending}`), 'undo');
    assert.equal(control(`ordinary text ${undo}`), '');
    assert.equal(edit('Alpha', replace).text, 'Beta');
    const state = {
      active: 's',
      settings: { ...defaults, language: code },
      sessions: [
        { id: 's', text: expected, original: spoken, versions: [], done: [], created: 1 },
      ],
    };
    const restored = await decodeBackup(await encodeBackup(state, ''), '');
    assert.equal(restored.sessions[0].text, expected);
    assert.equal(restored.settings.language, code);
  });
}
test('English is the new-install default without changing existing language settings', () => {
  assert.equal(defaults.language, 'en');
  for (const [language] of priorityLanguages)
    assert.equal(validateSettings({ ...defaults, language }).language, language);
});
test('punctuation is language-specific and matches whole Unicode words', () => {
  assert.equal(punctuation('commander comma word', 'en'), 'commander, word');
  assert.equal(punctuation('Hello comma world', 'auto'), 'Hello comma world');
  assert.equal(punctuation('नमस्तेअल्पविराम', 'hi'), 'नमस्तेअल्पविराम');
  assert.equal(punctuation('Bonjour virgule monde', 'de'), 'Bonjour virgule monde');
});
test('last-sentence removal recognizes CJK, Arabic, Urdu, and Devanagari endings', () => {
  for (const text of ['你好。世界。', 'مرحبا؟ عالم؟', 'سلام۔ دنیا۔', 'नमस्ते। दुनिया।']) {
    const result = edit(text, 'delete last sentence');
    assert.equal(result.changed, true);
    assert.ok(result.text.length > 0 && result.text.length < text.length);
  }
});

test('CJK replacements work without spaces and ambiguity still requires a choice', () => {
  assert.equal(edit('你好世界。', '把世界替换为朋友').text, '你好朋友。');
  const ambiguous = edit('世界和世界', '把世界替换为朋友');
  assert.equal(ambiguous.changed, false);
  assert.equal(ambiguous.choices?.length, 2);
  assert.equal(
    edit('世界和世界', '把世界替换为朋友', ambiguous.choices![1]).text,
    '世界和朋友',
  );
});
test('correction does not split a combining-mark word; counts do not assume spaces', () => {
  assert.equal(edit('का', 'replace क with X').changed, false);
  assert.equal(countWords(''), 0);
  assert.equal(countWords('hello world'), 2);
  assert.ok(countWords('你好世界') > 1);
});

test('desktop selection, snippets, and choice numbers normalize across the ten languages', () => {
  const phrases = [
    ['en', 'select Alpha', 'insert snippet Beta', 'option 1'],
    ['es', 'select Alpha', 'insert snippet Beta', 'option 1'],
    ['fr', 'sélectionne Alpha', 'insère le modèle Beta', 'option un'],
    ['pt', 'selecione Alpha', 'insira modelo Beta', 'opção um'],
    ['ru', 'выдели Alpha', 'вставь шаблон Beta', 'вариант один'],
    ['ar', 'حدد Alpha', 'أدرج القالب Beta', 'الخيار واحد'],
    ['ur', 'Alpha منتخب کریں', 'Beta سانچہ داخل کریں', 'آپشن ایک'],
    ['hi', 'Alpha चुनें', 'Beta टेम्पलेट डालें', 'विकल्प एक'],
    ['bn', 'Alpha নির্বাচন করুন', 'Beta টেমপ্লেট সন্নিবেশ করুন', 'বিকল্প এক'],
    ['zh', '选择Alpha', '插入模板Beta', '选项一'],
  ];
  for (const [language, select, snippet, option] of phrases) {
    assert.equal(normalizeNavigationCommand(select), 'select Alpha', language);
    assert.equal(normalizeNavigationCommand(snippet), 'insert snippet Beta', language);
    assert.equal(normalizeNavigationCommand(option), 'option 1', language);
  }
});

test('correction payloads retain full-width Unicode and normalization only applies to control matching', () => {
  assert.equal(edit('Ａ', 'replace Ａ with Ｂ').text, 'Ｂ');
  assert.equal(normalizeNavigationCommand('选择Ａ'), 'select Ａ');
  assert.equal(control('ＵＮＤＯ'), 'undo');
});

test('the shared dictation pipeline preserves spoken paragraphs and CJK chunk boundaries', () => {
  assert.equal(appendTranscript('你好', '世界。', 'zh'), '你好世界。');
  assert.equal(appendTranscript('Hello', 'world', 'en'), 'Hello world');
  assert.equal(appendTranscript('مرحبا', 'عالم', 'ar'), 'مرحبا عالم');
  assert.equal(
    appendTranscript('Hello', clean(punctuation('new paragraph', 'en'), [], {}), 'en'),
    'Hello\n\n',
  );
  assert.equal(appendTranscript('Hello\n\n', 'world', 'en'), 'Hello\n\nworld');
  assert.equal(appendTranscript('Hello', punctuation('comma', 'en'), 'en'), 'Hello,');
});
