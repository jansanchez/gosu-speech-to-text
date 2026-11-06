/** Speech phrases are language data, not interface translations. */
export const priorityLanguages = [
  ['en', 'English'],
  ['zh', 'Chinese (Mandarin)'],
  ['hi', 'Hindi'],
  ['es', 'Spanish'],
  ['fr', 'French'],
  ['ar', 'Arabic'],
  ['bn', 'Bengali'],
  ['pt', 'Portuguese'],
  ['ru', 'Russian'],
  ['ur', 'Urdu'],
] as const;

const aliases: Record<string, string[]> = {
  undo: [
    'undo',
    'deshacer',
    'deshaz eso',
    'déjalo como estaba',
    'annuler',
    'desfazer',
    'отменить',
    'تراجع',
    'واپس کریں',
    'पूर्ववत करें',
    'পূর্বাবস্থায় ফিরুন',
    '撤销',
  ],
  redo: [
    'redo',
    'rehacer',
    'rétablir',
    'refazer',
    'повторить',
    'إعادة',
    'دوبارہ کریں',
    'फिर से करें',
    'আবার করুন',
    '重做',
  ],
  copy: [
    'copy',
    'copy text',
    'copiar',
    'copia el texto',
    'copier le texte',
    'copiar texto',
    'копировать текст',
    'نسخ النص',
    'متن کاپی کریں',
    'पाठ कॉपी करें',
    'লেখা কপি করুন',
    '复制文本',
  ],
  paste: [
    'paste',
    'paste text',
    'pegar',
    'pega el texto',
    'coller le texte',
    'colar texto',
    'вставить текст',
    'لصق النص',
    'متن پیسٹ کریں',
    'पाठ पेस्ट करें',
    'লেখা পেস্ট করুন',
    '粘贴文本',
  ],
  new: [
    'new draft',
    'nuevo dictado',
    'nouveau brouillon',
    'novo rascunho',
    'новый черновик',
    'مسودة جديدة',
    'نیا مسودہ',
    'नया मसौदा',
    'নতুন খসড়া',
    '新建草稿',
  ],
  confirm: [
    'confirm change',
    'confirmar cambio',
    'aplicar cambio',
    'confirmer la modification',
    'confirmar alteração',
    'подтвердить изменение',
    'تأكيد التغيير',
    'تبدیلی کی تصدیق کریں',
    'बदलाव की पुष्टि करें',
    'পরিবর্তন নিশ্চিত করুন',
    '确认更改',
  ],
  cancel: [
    'cancel change',
    'cancelar cambio',
    'annuler la modification',
    'cancelar alteração',
    'отменить изменение',
    'إلغاء التغيير',
    'تبدیلی منسوخ کریں',
    'बदलाव रद्द करें',
    'পরিবর্তন বাতিল করুন',
    '取消更改',
  ],
  read: [
    'read text',
    'leer texto',
    'lire le texte',
    'ler texto',
    'прочитать текст',
    'قراءة النص',
    'متن پڑھیں',
    'पाठ पढ़ें',
    'লেখা পড়ুন',
    '朗读文本',
  ],
  stopRead: [
    'stop reading',
    'detener lectura',
    'arrêter la lecture',
    'parar leitura',
    'остановить чтение',
    'إيقاف القراءة',
    'پڑھنا بند کریں',
    'पढ़ना बंद करें',
    'পড়া বন্ধ করুন',
    '停止朗读',
  ],
  learn: [
    'remember correction',
    'save correction',
    'recordar corrección',
    'guardar corrección',
    'mémoriser la correction',
    'salvar correção',
    'запомнить исправление',
    'حفظ التصحيح',
    'تصحیح محفوظ کریں',
    'सुधार याद रखें',
    'সংশোধন মনে রাখুন',
    '记住更正',
  ],
  dictate: [
    'dictation mode',
    'modo dictado',
    'mode dictée',
    'modo ditado',
    'режим диктовки',
    'وضع الإملاء',
    'ڈکٹیشن موڈ',
    'डिक्टेशन मोड',
    'ডিক্টেশন মোড',
    '听写模式',
  ],
  edit: [
    'correction mode',
    'modo corrección',
    'mode correction',
    'modo correção',
    'режим исправления',
    'وضع التصحيح',
    'تصحیح موڈ',
    'सुधार मोड',
    'সংশোধন মোড',
    '更正模式',
  ],
  favorite: [
    'mark favorite',
    'marcar favorito',
    'marquer comme favori',
    'добавить в избранное',
    'إضافة إلى المفضلة',
    'پسندیدہ بنائیں',
    'पसंदीदा बनाएं',
    'প্রিয় হিসেবে চিহ্নিত করুন',
    '标记收藏',
  ],
  unfavorite: [
    'remove favorite',
    'quitar favorito',
    'retirer des favoris',
    'remover favorito',
    'удалить из избранного',
    'إزالة من المفضلة',
    'پسندیدہ ہٹائیں',
    'पसंदीदा हटाएं',
    'প্রিয় থেকে সরান',
    '取消收藏',
  ],
};
export function speechKey(text: string) {
  return text
    .normalize('NFKC')
    .trim()
    .replace(/[.!?。！？؟۔।]+$/u, '')
    .trim()
    .toLowerCase();
}
const commandMap = new Map(
  Object.entries(aliases).flatMap(([action, phrases]) =>
    phrases.map((phrase) => [speechKey(phrase), action]),
  ),
);
export function speechControl(text: string) {
  return commandMap.get(speechKey(text)) || '';
}

const edits: [RegExp, string][] = [
  [/^(?:remplace|remplacer) (.+?) par (.+)$/iu, 'replace $1 with $2'],
  [/^(?:substitua|substituir|troque) (.+?) por (.+)$/iu, 'replace $1 with $2'],
  [/^замени (.+?) на (.+)$/iu, 'replace $1 with $2'],
  [/^استبدل (.+?) (?:بـ|ب)\s*(.+)$/u, 'replace $1 with $2'],
  [/^(.+?) کو (.+?) سے بدلیں$/u, 'replace $1 with $2'],
  [/^(.+?) को (.+?) से बदलें$/u, 'replace $1 with $2'],
  [/^(.+?) এর বদলে (.+?) লিখুন$/u, 'replace $1 with $2'],
  [/^把\s*(.+?)\s*替换为\s*(.+)$/u, 'replace $1 with $2'],
];
const editAliases: Record<string, string[]> = {
  'delete last sentence': [
    'supprime la dernière phrase',
    'exclua a última frase',
    'удали последнее предложение',
    'احذف الجملة الأخيرة',
    'آخری جملہ حذف کریں',
    'आखिरी वाक्य हटाएं',
    'শেষ বাক্য মুছুন',
    '删除最后一句',
  ],
  'delete selection': [
    'supprime la sélection',
    'exclua a seleção',
    'удали выделенное',
    'احذف التحديد',
    'منتخب متن حذف کریں',
    'चयन हटाएं',
    'নির্বাচিত লেখা মুছুন',
    '删除选中内容',
  ],
  'new paragraph': [
    'nouveau paragraphe',
    'novo parágrafo',
    'новый абзац',
    'فقرة جديدة',
    'نیا پیراگراف',
    'नया अनुच्छेद',
    'নতুন অনুচ্ছেদ',
    '新段落',
  ],
  'make it a list': [
    'mets en liste',
    'transforme em lista',
    'сделай список',
    'حول إلى قائمة',
    'فہرست بنائیں',
    'सूची बनाएं',
    'তালিকা তৈরি করুন',
    '转为列表',
  ],
};
const editMap = new Map(
  Object.entries(editAliases).flatMap(([action, phrases]) =>
    phrases.map((phrase) => [speechKey(phrase), action]),
  ),
);
export function normalizeEditCommand(text: string) {
  const value = text
    .trim()
    .replace(/[.!?。！？؟۔।]+$/u, '')
    .trim();
  const simple = editMap.get(speechKey(value));
  if (simple) return simple;
  for (const [pattern, replacement] of edits)
    if (pattern.test(value)) return value.replace(pattern, replacement);
  return value;
}

// Explicit phrase sets avoid treating ordinary punctuation words as commands in other languages.
const spoken: Record<string, [string, string][]> = {
  en: [
    ['new paragraph', '\n\n'],
    ['new line', '\n'],
    ['full stop', '.'],
    ['period', '.'],
    ['comma', ','],
    ['question mark', '?'],
    ['exclamation mark', '!'],
    ['semicolon', ';'],
    ['colon', ':'],
  ],
  es: [
    ['punto y aparte', '\n\n'],
    ['nuevo párrafo', '\n\n'],
    ['nuevo parrafo', '\n\n'],
    ['salto de línea', '\n'],
    ['salto de linea', '\n'],
    ['abre interrogación', '¿'],
    ['abre interrogacion', '¿'],
    ['cierra interrogación', '?'],
    ['cierra interrogacion', '?'],
    ['dos puntos', ':'],
    ['punto y coma', ';'],
    ['coma', ','],
    ['punto final', '.'],
  ],
  fr: [
    ['nouveau paragraphe', '\n\n'],
    ['nouvelle ligne', '\n'],
    ['point d’interrogation', '?'],
    ["point d'interrogation", '?'],
    ['point d’exclamation', '!'],
    ["point d'exclamation", '!'],
    ['point-virgule', ';'],
    ['deux-points', ':'],
    ['virgule', ','],
    ['point final', '.'],
  ],
  pt: [
    ['novo parágrafo', '\n\n'],
    ['nova linha', '\n'],
    ['ponto de interrogação', '?'],
    ['ponto de exclamação', '!'],
    ['ponto e vírgula', ';'],
    ['dois pontos', ':'],
    ['vírgula', ','],
    ['ponto final', '.'],
  ],
  ru: [
    ['новый абзац', '\n\n'],
    ['новая строка', '\n'],
    ['вопросительный знак', '?'],
    ['восклицательный знак', '!'],
    ['точка с запятой', ';'],
    ['двоеточие', ':'],
    ['запятая', ','],
    ['точка', '.'],
  ],
  ar: [
    ['فقرة جديدة', '\n\n'],
    ['سطر جديد', '\n'],
    ['علامة استفهام', '؟'],
    ['علامة تعجب', '!'],
    ['فاصلة منقوطة', '؛'],
    ['نقطتان', ':'],
    ['فاصلة', '،'],
    ['نقطة', '.'],
  ],
  hi: [
    ['नया अनुच्छेद', '\n\n'],
    ['नई पंक्ति', '\n'],
    ['प्रश्न चिह्न', '?'],
    ['विस्मयादिबोधक चिह्न', '!'],
    ['अर्धविराम', ';'],
    ['अल्पविराम', ','],
    ['पूर्ण विराम', '।'],
  ],
  bn: [
    ['নতুন অনুচ্ছেদ', '\n\n'],
    ['নতুন লাইন', '\n'],
    ['প্রশ্নবোধক চিহ্ন', '?'],
    ['বিস্ময়বোধক চিহ্ন', '!'],
    ['সেমিকোলন', ';'],
    ['কমা', ','],
    ['পূর্ণচ্ছেদ', '।'],
  ],
  ur: [
    ['نیا پیراگراف', '\n\n'],
    ['نئی سطر', '\n'],
    ['سوالیہ نشان', '؟'],
    ['علامت تعجب', '!'],
    ['سیمی کولن', '؛'],
    ['کوما', '،'],
    ['نقطہ', '۔'],
  ],
  zh: [
    ['新段落', '\n\n'],
    ['换行', '\n'],
    ['问号', '？'],
    ['感叹号', '！'],
    ['分号', '；'],
    ['冒号', '：'],
    ['逗号', '，'],
    ['句号', '。'],
  ],
};
function escape(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
export function spokenPunctuation(text: string, language: string) {
  let result = text;
  for (const [phrase, mark] of [...(spoken[language] || [])].sort(
    (a, b) => b[0].length - a[0].length,
  )) {
    const pattern =
      language === 'zh'
        ? escape(phrase)
        : `(?<![\\p{L}\\p{N}\\p{M}_])${escape(phrase)}(?![\\p{L}\\p{N}\\p{M}_])`;
    result = result.replace(new RegExp(pattern, 'giu'), () => mark);
  }
  return result
    .replace(/[ \t]+([,.;:!?،؛؟۔。！？，；：।])/gu, '$1')
    .replace(/[ \t]*\n[ \t]*/g, '\n');
}

/** ICU word segmentation supports scripts that do not separate words with spaces. */
export function countWords(text: string): number {
  if (!text.trim()) return 0;
  if (typeof Intl.Segmenter === 'function') {
    return [...new Intl.Segmenter('en', { granularity: 'word' }).segment(text)].filter(
      (part) => part.isWordLike,
    ).length;
  }
  return text.trim().split(/\s+/u).length;
}

const navigation: [RegExp, string][] = [
  [/^sélectionne\s+(.+)$/iu, 'select $1'],
  [/^selecione\s+(.+)$/iu, 'select $1'],
  [/^выдели\s+(.+)$/iu, 'select $1'],
  [/^حدد\s+(.+)$/u, 'select $1'],
  [/^(.+?) منتخب کریں$/u, 'select $1'],
  [/^(.+?) चुनें$/u, 'select $1'],
  [/^(.+?) নির্বাচন করুন$/u, 'select $1'],
  [/^选择\s*(.+)$/u, 'select $1'],
  [/^insère le modèle\s+(.+)$/iu, 'insert snippet $1'],
  [/^insira modelo\s+(.+)$/iu, 'insert snippet $1'],
  [/^вставь шаблон\s+(.+)$/iu, 'insert snippet $1'],
  [/^أدرج القالب\s+(.+)$/u, 'insert snippet $1'],
  [/^(.+?) سانچہ داخل کریں$/u, 'insert snippet $1'],
  [/^(.+?) टेम्पलेट डालें$/u, 'insert snippet $1'],
  [/^(.+?) টেমপ্লেট সন্নিবেশ করুন$/u, 'insert snippet $1'],
  [/^插入模板\s*(.+)$/u, 'insert snippet $1'],
];
const optionWords: Record<string, number> = {
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  um: 1,
  uma: 1,
  dois: 2,
  três: 3,
  quatro: 4,
  cinco: 5,
  один: 1,
  два: 2,
  три: 3,
  четыре: 4,
  пять: 5,
  واحد: 1,
  اثنان: 2,
  ثلاثة: 3,
  أربعة: 4,
  خمسة: 5,
  ایک: 1,
  دو: 2,
  تین: 3,
  چار: 4,
  پانچ: 5,
  एक: 1,
  दो: 2,
  तीन: 3,
  चार: 4,
  पांच: 5,
  এক: 1,
  দুই: 2,
  তিন: 3,
  চার: 4,
  পাঁচ: 5,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
};
export function normalizeNavigationCommand(text: string) {
  const value = text
    .trim()
    .replace(/[.!?。！？؟۔।]+$/u, '')
    .trim();
  const option = value.match(
    /^(?:option|opção|вариант|الخيار|آپشن|विकल्प|বিকল্প|选项)\s*(.+)$/iu,
  );
  if (option) {
    const key = option[1].trim().toLowerCase();
    const number = optionWords[key] || (/^[1-5]$/.test(key) ? Number(key) : 0);
    if (number) return `option ${number}`;
  }
  for (const [pattern, replacement] of navigation)
    if (pattern.test(value)) return value.replace(pattern, replacement);
  return value;
}

/** Join completed chunks without inventing spaces in CJK or stripping spoken line breaks. */
export function appendTranscript(current: string, next: string, language: string) {
  if (!next) return current;
  const cjk = language === 'zh' || language === 'ja';
  const separator =
    current &&
    !cjk &&
    !/\s$/u.test(current) &&
    !/^\s|^[,.;:!?،؛؟۔。！？，；：।]/u.test(next)
      ? ' '
      : '';
  return current + separator + next;
}
