/**
 * Display width calculation for monospaced text, based on Unicode East Asian Width (UAX #11).
 *
 * Background:
 *   markdown-table-prettify pads table cells according to the "length" of their text. Its own
 *   implementation only treats CJK Unified Ideographs (kanji / hanzi / hanja) as double width, so
 *   kana, fullwidth forms, Hangul, CJK punctuation, emoji, etc. are counted as a single column and
 *   tables containing them end up misaligned. This module provides a more complete width function
 *   that is plugged into the library by patchCellWidth.ts.
 *
 * Width rules (checked in this order):
 *   0 - zero width: combining marks, zero-width characters, variation selectors, ...
 *       They are drawn on top of / between other characters and take no column of their own.
 *   2 - wide: East Asian Width "W" (Wide) and "F" (Fullwidth), e.g. kanji, kana, Hangul
 *       syllables, fullwidth ASCII, CJK punctuation and most emoji.
 *   1 - everything else, e.g. ASCII, Latin, halfwidth katakana.
 *
 * The tables below are hand-maintained subsets of the Unicode data, covering the characters that are
 * realistically used in Markdown tables. They are not generated from EastAsianWidth.txt, so very rare
 * or newly added characters may not be classified precisely.
 */

/** Inclusive range of code points: [first, last]. */
type Range = [number, number];

/**
 * Code points that occupy no column.
 * These are combining marks (accents, voiced sound marks, Hangul vowel/final jamo in decomposed
 * form), invisible formatting characters and variation selectors. They modify or join the preceding
 * character instead of being displayed on their own.
 */
const ZERO_WIDTH: Range[] = [
	[0x0300, 0x036F], // Combining Diacritical Marks
	[0x0483, 0x0489], // Cyrillic combining marks
	[0x0591, 0x05BD], // Hebrew points
	[0x0610, 0x061A], // Arabic marks
	[0x061C, 0x061C], // Arabic Letter Mark
	[0x064B, 0x065F], // Arabic harakat
	[0x00AD, 0x00AD], // Soft hyphen
	[0x034F, 0x034F], // Combining Grapheme Joiner
	[0x1160, 0x11FF], // Hangul Jamo medial vowels / final consonants (combine with the preceding initial in NFD)
	[0x1AB0, 0x1AFF], // Combining Diacritical Marks Extended
	[0x1DC0, 0x1DFF], // Combining Diacritical Marks Supplement
	[0x200B, 0x200F], // ZWSP, ZWNJ, ZWJ, LRM, RLM
	[0x202A, 0x202E], // Bidi embedding controls
	[0x2060, 0x2064], // Word joiner, invisible operators
	[0x20D0, 0x20FF], // Combining Diacritical Marks for Symbols
	[0x3099, 0x309A], // Combining kana voiced / semi-voiced sound marks
	[0xD7B0, 0xD7FF], // Hangul Jamo Extended-B (medial vowels / final consonants)
	[0xFE00, 0xFE0F], // Variation Selectors
	[0xFE20, 0xFE2F], // Combining Half Marks
	[0xFEFF, 0xFEFF], // BOM / ZWNBSP
	[0x1F3FB, 0x1F3FF], // Emoji skin tone modifiers
	[0xE0000, 0xE007F], // Tags
	[0xE0100, 0xE01EF], // Variation Selectors Supplement
];

/**
 * Code points whose East Asian Width is Wide (W) or Fullwidth (F); they occupy two columns.
 * Unnamed single entries in the U+2xxx block are emoji that have the "Wide" property
 * (e.g. U+231A WATCH, U+26A1 HIGH VOLTAGE, U+2705 WHITE HEAVY CHECK MARK).
 * The U+1Fxxx entries are the emoji blocks, excluding the code points that are not Wide.
 */
const WIDE: Range[] = [
	[0x1100, 0x115F], // Hangul Jamo initial consonants
	[0x231A, 0x231B],
	[0x2329, 0x232A],
	[0x23E9, 0x23EC],
	[0x23F0, 0x23F0],
	[0x23F3, 0x23F3],
	[0x25FD, 0x25FE],
	[0x2614, 0x2615],
	[0x2648, 0x2653],
	[0x267F, 0x267F],
	[0x2693, 0x2693],
	[0x26A1, 0x26A1],
	[0x26AA, 0x26AB],
	[0x26BD, 0x26BE],
	[0x26C4, 0x26C5],
	[0x26CE, 0x26CE],
	[0x26D4, 0x26D4],
	[0x26EA, 0x26EA],
	[0x26F2, 0x26F3],
	[0x26F5, 0x26F5],
	[0x26FA, 0x26FA],
	[0x26FD, 0x26FD],
	[0x2705, 0x2705],
	[0x270A, 0x270B],
	[0x2728, 0x2728],
	[0x274C, 0x274C],
	[0x274E, 0x274E],
	[0x2753, 0x2755],
	[0x2757, 0x2757],
	[0x2795, 0x2797],
	[0x27B0, 0x27B0],
	[0x27BF, 0x27BF],
	[0x2B1B, 0x2B1C],
	[0x2B50, 0x2B50],
	[0x2B55, 0x2B55],
	[0x2E80, 0x303E], // CJK Radicals, Kangxi, Ideographic Description, CJK Symbols and Punctuation
	[0x3041, 0x33FF], // Hiragana, Katakana, Bopomofo, Hangul Compatibility Jamo, Kanbun, CJK Strokes, Enclosed CJK, CJK Compatibility
	[0x3400, 0x4DBF], // CJK Unified Ideographs Extension A
	[0x4E00, 0x9FFF], // CJK Unified Ideographs
	[0xA000, 0xA4CF], // Yi
	[0xA960, 0xA97F], // Hangul Jamo Extended-A
	[0xAC00, 0xD7A3], // Hangul Syllables
	[0xF900, 0xFAFF], // CJK Compatibility Ideographs
	[0xFE10, 0xFE19], // Vertical Forms
	[0xFE30, 0xFE6F], // CJK Compatibility Forms, Small Form Variants
	[0xFF00, 0xFF60], // Fullwidth ASCII variants
	[0xFFE0, 0xFFE6], // Fullwidth signs
	[0x16FE0, 0x16FE4],
	[0x17000, 0x18AFF], // Tangut
	[0x1B000, 0x1B2FF], // Kana Supplement / Extended, Nushu
	[0x1F004, 0x1F004],
	[0x1F0CF, 0x1F0CF],
	[0x1F18E, 0x1F18E],
	[0x1F191, 0x1F19A],
	[0x1F200, 0x1F251], // Enclosed Ideographic Supplement
	[0x1F300, 0x1F320], // Emoji
	[0x1F32D, 0x1F335],
	[0x1F337, 0x1F37C],
	[0x1F37E, 0x1F393],
	[0x1F3A0, 0x1F3CA],
	[0x1F3CF, 0x1F3D3],
	[0x1F3E0, 0x1F3F0],
	[0x1F3F4, 0x1F3F4],
	[0x1F3F8, 0x1F3FA],
	[0x1F400, 0x1F43E],
	[0x1F440, 0x1F440],
	[0x1F442, 0x1F4FC],
	[0x1F4FF, 0x1F53D],
	[0x1F54B, 0x1F54E],
	[0x1F550, 0x1F567],
	[0x1F57A, 0x1F57A],
	[0x1F595, 0x1F596],
	[0x1F5A4, 0x1F5A4],
	[0x1F5FB, 0x1F64F],
	[0x1F680, 0x1F6C5],
	[0x1F6CC, 0x1F6CC],
	[0x1F6D0, 0x1F6D2],
	[0x1F6D5, 0x1F6D7],
	[0x1F6DC, 0x1F6DF],
	[0x1F6EB, 0x1F6EC],
	[0x1F6F4, 0x1F6FC],
	[0x1F7E0, 0x1F7EB],
	[0x1F7F0, 0x1F7F0],
	[0x1F90C, 0x1F93A],
	[0x1F93C, 0x1F945],
	[0x1F947, 0x1F9FF],
	[0x1FA70, 0x1FAFF],
	[0x20000, 0x2FFFD], // CJK Unified Ideographs Extension B-F, Supplement
	[0x30000, 0x3FFFD], // CJK Unified Ideographs Extension G-
];

/**
 * ZERO WIDTH JOINER. Joins emoji into a single glyph, e.g.
 * MAN + ZWJ + WOMAN + ZWJ + GIRL is displayed as one "family" emoji.
 */
const ZWJ = 0x200D;

/**
 * Returns true if the code point falls into one of the ranges.
 * A linear scan is fast enough here: the tables have about 100 entries and only the cells of
 * a single table are measured per formatting.
 */
function inRanges(codePoint: number, ranges: Range[]): boolean {
	for (const [start, end] of ranges) {
		if (codePoint >= start && codePoint <= end) return true;
	}
	return false;
}

/**
 * Returns the number of columns (0, 1 or 2) a single code point occupies in a monospaced font.
 * The zero-width table is checked first, because a few code points appear in both tables
 * (e.g. U+3099 COMBINING KATAKANA-HIRAGANA VOICED SOUND MARK lies inside the Wide kana block).
 */
export function codePointWidth(codePoint: number): number {
	if (inRanges(codePoint, ZERO_WIDTH)) return 0;
	if (inRanges(codePoint, WIDE)) return 2;
	return 1;
}

/**
 * Returns the number of columns a string occupies in a monospaced font.
 *
 * @example
 * stringWidth('abc')      // 3
 * stringWidth('日本語')   // 6
 * stringWidth('e\u0301')  // 1 (e + combining acute accent)
 */
export function stringWidth(value: string): number {
	let width = 0;
	// True right after a ZWJ: the next character is merged into the preceding emoji
	let afterZwj = false;
	// for..of iterates by code point (not by UTF-16 code unit), so a surrogate pair such as
	// U+20BB7 or an emoji is handled as one character instead of two halves
	for (const char of value) {
		const codePoint = char.codePointAt(0);
		// The character joined by ZWJ is drawn as part of the preceding glyph: no extra column
		if (afterZwj) {
			afterZwj = false;
			continue;
		}
		// ZWJ itself is invisible; remember that the next character is joined
		if (codePoint === ZWJ) {
			afterZwj = true;
			continue;
		}
		width += codePointWidth(codePoint);
	}
	return width;
}
