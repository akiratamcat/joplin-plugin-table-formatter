// Unit tests for the display width calculation (charWidth.ts).
//
// Invisible or combining characters are written as \u escapes so that the test data is readable;
// a raw combining mark would be indistinguishable from the precomposed character in the editor.
import { stringWidth } from '../charWidth';

describe('stringWidth', () => {
	test.each([
		// --- Basics ---
		['', 0],
		['abc', 3],

		// --- Latin with accents ---
		['\u00E9', 1], // e with acute, precomposed (one code point)
		['e\u0301', 1], // e + COMBINING ACUTE ACCENT (decomposed): the accent takes no column

		// --- Japanese ---
		['漢字', 4], // kanji were already handled by the library
		['ひらがな', 8], // hiragana
		['カタカナ', 8], // katakana
		['ｶﾀｶﾅ', 4], // halfwidth katakana stay single width
		['ＡＢＣ', 6], // fullwidth Latin letters
		['、。「」', 8], // CJK punctuation
		['\u3000', 2], // IDEOGRAPHIC SPACE (fullwidth space)
		['か\u3099', 2], // ka + COMBINING VOICED SOUND MARK (decomposed "ga")

		// --- Korean ---
		['한글', 4], // precomposed Hangul syllables (normal input)
		['한국어'.normalize('NFD'), 6], // decomposed Hangul: only the initial jamo has width
		['\u1112\u1161\u11AB', 2], // HIEUH + A + final NIEUN = decomposed "han"
		['\u1100\uD7B0', 2], // initial KIYEOK + medial from Hangul Jamo Extended-B
		['ㅎㅏㄴ', 6], // compatibility jamo are standalone letters, not combining

		// --- Characters outside the Basic Multilingual Plane (surrogate pairs) ---
		['\u{20BB7}', 2], // CJK Unified Ideographs Extension B

		// --- Emoji ---
		['\u{1F600}', 2], // GRINNING FACE
		['\u{1F44D}\u{1F3FD}', 2], // THUMBS UP + skin tone modifier
		['\u{1F468}\u200D\u{1F469}\u200D\u{1F467}', 2], // MAN + ZWJ + WOMAN + ZWJ + GIRL (one "family" glyph)

		// --- Invisible characters ---
		['a\u200Bb', 2], // ZERO WIDTH SPACE
	])('%s => %i', (value, expected) => {
		expect(stringWidth(value)).toBe(expected);
	});
});

// East Asian Ambiguous characters change width depending on the ambiguousWidth argument,
// while every other category must keep its width regardless of that argument.
describe('stringWidth with East Asian Ambiguous characters', () => {
	test.each([
		// value, width when ambiguous = 1, width when ambiguous = 2

		// --- Ambiguous: follow the argument ---
		['※', 1, 2], // reference mark
		['○●□■△☆★', 7, 14], // geometric shapes
		['×÷±°', 4, 8], // math symbols and degree sign
		['①Ⅰ', 2, 4], // circled digit, Roman numeral
		['αΩ', 2, 4], // Greek
		['АЯ', 2, 4], // Cyrillic
		['…', 1, 2], // horizontal ellipsis
		['─│┌', 3, 6], // box drawing

		// --- Not ambiguous: the argument must have no effect ---
		['abc', 3, 3], // ASCII is never affected
		['ｱｲｳ', 3, 3], // halfwidth katakana is never affected
		['漢字', 4, 4], // wide is never affected
		['e\u0301', 1, 1], // U+0301 is listed as Ambiguous too, but zero width wins
		['\u{1F170}', 1, 2], // NEGATIVE SQUARED LATIN CAPITAL LETTER A: ambiguous outside the BMP
	])('%s => %i / %i', (value, narrow, wide) => {
		expect(stringWidth(value, 1)).toBe(narrow);
		expect(stringWidth(value, 2)).toBe(wide);
	});

	// Callers that do not pass the argument (e.g. the fix branch behaviour) get Western widths
	test('defaults to narrow', () => {
		expect(stringWidth('※○')).toBe(2);
	});
});
