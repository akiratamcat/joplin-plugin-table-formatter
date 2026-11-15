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
