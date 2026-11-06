# Language support

The interface, error messages, tooling, and documentation are English. The speech language is a separate setting; changing the interface does not translate existing drafts, rules, snippets, or backups. New installations default to English. Existing settings retain their recognition language. Historical storage keys, IDs, and backup formats are unchanged.

## Ten priority languages

| Language | Code | Undo | Replacement command (replace Alpha with Beta) |
|---|---|---|---|
| English | `en` | undo | replace Alpha with Beta |
| Chinese (Mandarin) | `zh` | 撤销 | 把Alpha替换为Beta |
| Hindi | `hi` | पूर्ववत करें | Alpha को Beta से बदलें |
| Spanish | `es` | deshacer | cambia Alpha por Beta |
| French | `fr` | annuler | remplace Alpha par Beta |
| Arabic | `ar` | تراجع | استبدل Alpha بـBeta |
| Bengali | `bn` | পূর্বাবস্থায় ফিরুন | Alpha এর বদলে Beta লিখুন |
| Portuguese | `pt` | desfazer | substitua Alpha por Beta |
| Russian | `ru` | отменить | замени Alpha на Beta |
| Urdu | `ur` | واپس کریں | Alpha کو Beta سے بدلیں |

These are explicit supported phrases, not every possible natural-language expression. Voice controls run in Correct mode, not normal dictation. Shared control phrase sets also cover redo, copy/paste, new draft, confirmation/cancel, read/stop reading, correction/dictation modes, remembering corrections, and favorites where the respective desktop/extension action exists. The grammars live in `src/speech.ts`. Desktop and Chrome share deterministic correction and punctuation behavior; they do not have identical features.

Supported examples for deleting the last sentence and starting a paragraph:

| Code | Delete last sentence | New paragraph |
|---|---|---|
| `en` | delete last sentence | new paragraph |
| `zh` | 删除最后一句 | 新段落 |
| `hi` | आखिरी वाक्य हटाएं | नया अनुच्छेद |
| `es` | borra la última frase | nuevo párrafo |
| `fr` | supprime la dernière phrase | nouveau paragraphe |
| `ar` | احذف الجملة الأخيرة | فقرة جديدة |
| `bn` | শেষ বাক্য মুছুন | নতুন অনুচ্ছেদ |
| `pt` | exclua a última frase | novo parágrafo |
| `ru` | удали последнее предложение | новый абзац |
| `ur` | آخری جملہ حذف کریں | نیا پیراگراف |

Desktop selection, named snippet insertion, and choice numbers have explicit normalization phrases for the ten languages; manual selection and buttons remain available. Free-form rewriting/translation uses an optional compatible local Ollama model and always requires review. The default small model is not guaranteed to perform equally well in all languages.

## Desktop selection and snippets

| Code | Select Alpha | Insert snippet Beta | Choose first occurrence |
|---|---|---|---|
| `en` | select Alpha | insert snippet Beta | option one |
| `es` | selecciona Alpha | insertar plantilla Beta | opción uno |
| `zh` | 选择Alpha | 插入模板Beta | 选项一 |
| `hi` | Alpha चुनें | Beta टेम्पलेट डालें | विकल्प एक |
| `fr` | sélectionne Alpha | insère le modèle Beta | option un |
| `ar` | حدد Alpha | أدرج القالب Beta | الخيار واحد |
| `bn` | Alpha নির্বাচন করুন | Beta টেমপ্লেট সন্নিবেশ করুন | বিকল্প এক |
| `pt` | selecione Alpha | insira modelo Beta | opção um |
| `ru` | выдели Alpha | вставь шаблон Beta | вариант один |
| `ur` | Alpha منتخب کریں | Beta سانچہ داخل کریں | آپشن ایک |

Replace Alpha/Beta with actual text/snippet names. A selection must be unique; duplicate snippets require disambiguation through the interface. These navigation features are desktop-only. Spelled choice numbers one through five are supported where documented; buttons remain available for further occurrences.

## Spoken punctuation

Enable Interpret spoken punctuation only when you intend to speak punctuation commands. It is off by default and uses the explicitly selected language. Automatic recognition (`auto`) leaves spoken punctuation unchanged rather than guessing a phrase language. The recognizer can already emit punctuation without this setting.

| Code | Spoken comma | Full stop |
|---|---|---|
| `en` | comma | full stop / period |
| `zh` | 逗号 | 句号 |
| `hi` | अल्पविराम | पूर्ण विराम |
| `es` | coma | punto final |
| `fr` | virgule | point final |
| `ar` | فاصلة | نقطة |
| `bn` | কমা | পূর্ণচ্ছেদ |
| `pt` | vírgula | ponto final |
| `ru` | запятая | точка |
| `ur` | کوما | نقطہ |

Unicode-aware boundaries prevent matching inside words in spaced scripts. Chinese phrase matching also supports adjacent characters without spaces. Since these are literal phrase substitutions, enabling them can change a word you intended to dictate literally. Disable the feature for such content. Sentence deletion recognizes Latin, CJK, Arabic, Urdu, and Devanagari punctuation. Cleanup retains spoken paragraph breaks. Chinese chunks join without added spaces; other languages retain word separators and do not insert spaces before punctuation. Word counts use ICU segmentation when available.

## Text direction and portability

Draft textareas use `dir="auto"`, allowing Arabic/Urdu text to choose its own direction while interface controls remain English. Recognition output is retained as Unicode; correction uses selected ranges or a unique occurrence instead of replacing every occurrence indiscriminately. Backups preserve text and saved recognition settings across desktop/extension. Destination applications, system fonts, IMEs, and clipboard managers can affect rendering/insertion and require their own checks.

## Validation scope

Automated tests cover all ten codes, API/model language forwarding, Unicode output, documented replacement/control phrases, punctuation, backup round trips, saved-language preservation, and non-Latin sentence boundaries. Models, devices, and platform insertion are mocked where stated. These tests do not establish speech accuracy, accent coverage, dialect quality, native-speaker phrase naturalness, or platform installation.

Before marking a language validated, record model/version, device, OS, audio source, consent to use the sample, and expected transcript. Test dictation with real speakers, names/numbers/negation, corrections, silence/noise, Arabic/Urdu direction, CJK punctuation, clipboard insertion without Enter, and recovery after errors. Review results with a speaker of that language and record remaining limitations in [VALIDACION.md](VALIDACION.md). No ten-language real-speaker acceptance is claimed by this migration.
