// Tests for the UI translation helpers (i18n.ts) and the bundled catalogs compiled from src/locales/*.po.
// `npm test` runs `npm run i18n:compile` first, so translations.json reflects the current .po files.
import { _, Catalogs, findCatalog, setLocale } from '../i18n';

describe('findCatalog', () => {
	// Dummy catalogs, independent of the real translations
	const catalogs: Catalogs = {
		ja_JP: { Hello: 'こんにちは' },
		zh_CN: { Hello: '你好' },
		zh_TW: { Hello: '你好 (TW)' },
		pt: { Hello: 'Olá' },
	};

	test('exact match', () => {
		expect(findCatalog('zh_TW', catalogs)).toBe(catalogs.zh_TW);
	});

	test('"-" is accepted as a separator', () => {
		expect(findCatalog('zh-TW', catalogs)).toBe(catalogs.zh_TW);
	});

	test('falls back to the language without region', () => {
		expect(findCatalog('pt_BR', catalogs)).toBe(catalogs.pt);
	});

	test('falls back to another region of the same language (first in alphabetical order)', () => {
		expect(findCatalog('ja', catalogs)).toBe(catalogs.ja_JP);
		expect(findCatalog('zh_HK', catalogs)).toBe(catalogs.zh_CN);
	});

	test('returns null when nothing matches', () => {
		expect(findCatalog('en_GB', catalogs)).toBeNull();
		expect(findCatalog('', catalogs)).toBeNull();
		expect(findCatalog(undefined, catalogs)).toBeNull();
	});
});

describe('_', () => {
	// _() uses module-level state; reset to English after each test
	afterEach(() => setLocale(null));

	test('returns the msgid when no locale is set', () => {
		expect(_('Format Table')).toBe('Format Table');
	});

	test('returns the msgid for languages without translations', () => {
		setLocale('en_GB');
		expect(_('Format Table')).toBe('Format Table');
	});

	test('returns the msgid for strings missing from the catalog', () => {
		setLocale('ja_JP');
		expect(_('Not in the catalog')).toBe('Not in the catalog');
	});

	test('translates with the bundled Japanese catalog', () => {
		setLocale('ja_JP');
		expect(_('Format Table')).toBe('表を整形');
		expect(_('Always 1 (narrow)')).toBe('常に 1（半角幅）');
	});

	// The description is split over several lines in ja_JP.po; the compiler must join them
	test('joins multi-line msgid / msgstr from the .po file', () => {
		setLocale('ja_JP');
		expect(_('Characters such as ※ ○ × ① α are rendered narrow in Western fonts and wide in most CJK fonts. Choose the width that matches your editor font.'))
			.toBe('※ ○ × ① α などの文字は、欧文フォントでは半角幅、多くの CJK フォントでは全角幅で表示されます。エディタのフォントに合わせて幅を選んでください。');
	});
});
