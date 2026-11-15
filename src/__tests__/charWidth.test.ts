import { stringWidth } from '../charWidth';

describe('stringWidth', () => {
	test.each([
		['', 0],
		['abc', 3],
		['é', 1], // precomposed
		['e\u0301', 1], // e + combining acute accent
		['漢字', 4],
		['ひらがな', 8],
		['カタカナ', 8],
		['ｶﾀｶﾅ', 4], // halfwidth katakana
		['ＡＢＣ', 6], // fullwidth latin
		['、。「」', 8], // CJK punctuation
		['　', 2], // ideographic space
		['한글', 4],
		['한국어'.normalize('NFD'), 6], // decomposed Hangul (initial + medial + final jamo)
		['한', 2], // ᄒ + ᅡ + ᆫ
		['ᄀힰ', 2], // initial + Jamo Extended-B medial
		['ㅎㅏㄴ', 6], // compatibility jamo are standalone (not combining)
		['𠮷', 2], // surrogate pair (CJK Ext. B)
		['😀', 2],
		['👍🏽', 2], // emoji + skin tone modifier
		['👨\u200D👩\u200D👧', 2], // ZWJ sequence
		['a\u200Bb', 2], // zero width space
		['か\u3099', 2], // combining voiced sound mark
	])('%s => %i', (value, expected) => {
		expect(stringWidth(value)).toBe(expected);
	});
});
