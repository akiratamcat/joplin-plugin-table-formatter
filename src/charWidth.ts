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
 *   A - East Asian Width "A" (Ambiguous), e.g. ※ ○ × ① α: 1 or 2, chosen by the caller,
 *       because it depends on the font (narrow in Western fonts, wide in most CJK fonts).
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
 * Code points whose East Asian Width is Ambiguous (A).
 *
 * Unicode leaves their width to the environment: Western fonts render them narrow (1 column),
 * while most Chinese, Japanese and Korean fonts render them wide (2 columns). Examples:
 *   symbols      ※ ○ ● □ ■ △ ☆ ★ × ÷ ± ° §
 *   numbers      ① ② Ⅰ Ⅱ
 *   punctuation  … ‐ ‘ ’ “ ”
 *   box drawing  ─ │ ┌
 *   letters      Greek (α β Ω), Cyrillic (А Я) and some accented Latin letters (é ü æ)
 * The width actually used is chosen by the caller (see AmbiguousWidth / ambiguousWidth.ts).
 *
 * Some ranges overlap with ZERO_WIDTH (combining marks, variation selectors). That is harmless,
 * because codePointWidth checks ZERO_WIDTH and WIDE before this table.
 */
const AMBIGUOUS: Range[] = [
	[0x00A1, 0x00A1], [0x00A4, 0x00A4], [0x00A7, 0x00A8], [0x00AA, 0x00AA], [0x00AD, 0x00AE],
	[0x00B0, 0x00B4], [0x00B6, 0x00BA], [0x00BC, 0x00BF], [0x00C6, 0x00C6], [0x00D0, 0x00D0],
	[0x00D7, 0x00D8], [0x00DE, 0x00E1], [0x00E6, 0x00E6], [0x00E8, 0x00EA], [0x00EC, 0x00ED],
	[0x00F0, 0x00F0], [0x00F2, 0x00F3], [0x00F7, 0x00FA], [0x00FC, 0x00FC], [0x00FE, 0x00FE],
	[0x0101, 0x0101], [0x0111, 0x0111], [0x0113, 0x0113], [0x011B, 0x011B], [0x0126, 0x0127],
	[0x012B, 0x012B], [0x0131, 0x0133], [0x0138, 0x0138], [0x013F, 0x0142], [0x0144, 0x0144],
	[0x0148, 0x014B], [0x014D, 0x014D], [0x0152, 0x0153], [0x0166, 0x0167], [0x016B, 0x016B],
	[0x01CE, 0x01CE], [0x01D0, 0x01D0], [0x01D2, 0x01D2], [0x01D4, 0x01D4], [0x01D6, 0x01D6],
	[0x01D8, 0x01D8], [0x01DA, 0x01DA], [0x01DC, 0x01DC], [0x0251, 0x0251], [0x0261, 0x0261],
	[0x02C4, 0x02C4], [0x02C7, 0x02C7], [0x02C9, 0x02CB], [0x02CD, 0x02CD], [0x02D0, 0x02D0],
	[0x02D8, 0x02DB], [0x02DD, 0x02DD], [0x02DF, 0x02DF], [0x0300, 0x036F], [0x0391, 0x03A1],
	[0x03A3, 0x03A9], [0x03B1, 0x03C1], [0x03C3, 0x03C9], [0x0401, 0x0401], [0x0410, 0x044F],
	[0x0451, 0x0451], [0x2010, 0x2010], [0x2013, 0x2016], [0x2018, 0x2019], [0x201C, 0x201D],
	[0x2020, 0x2022], [0x2024, 0x2027], [0x2030, 0x2030], [0x2032, 0x2033], [0x2035, 0x2035],
	[0x203B, 0x203B], [0x203E, 0x203E], [0x2074, 0x2074], [0x207F, 0x207F], [0x2081, 0x2084],
	[0x20AC, 0x20AC], [0x2103, 0x2103], [0x2105, 0x2105], [0x2109, 0x2109], [0x2113, 0x2113],
	[0x2116, 0x2116], [0x2121, 0x2122], [0x2126, 0x2126], [0x212B, 0x212B], [0x2153, 0x2154],
	[0x215B, 0x215E], [0x2160, 0x216B], [0x2170, 0x2179], [0x2189, 0x2189], [0x2190, 0x2199],
	[0x21B8, 0x21B9], [0x21D2, 0x21D2], [0x21D4, 0x21D4], [0x21E7, 0x21E7], [0x2200, 0x2200],
	[0x2202, 0x2203], [0x2207, 0x2208], [0x220B, 0x220B], [0x220F, 0x220F], [0x2211, 0x2211],
	[0x2215, 0x2215], [0x221A, 0x221A], [0x221D, 0x2220], [0x2223, 0x2223], [0x2225, 0x2225],
	[0x2227, 0x222C], [0x222E, 0x222E], [0x2234, 0x2237], [0x223C, 0x223D], [0x2248, 0x2248],
	[0x224C, 0x224C], [0x2252, 0x2252], [0x2260, 0x2261], [0x2264, 0x2267], [0x226A, 0x226B],
	[0x226E, 0x226F], [0x2282, 0x2283], [0x2286, 0x2287], [0x2295, 0x2295], [0x2299, 0x2299],
	[0x22A5, 0x22A5], [0x22BF, 0x22BF], [0x2312, 0x2312], [0x2460, 0x24E9], [0x24EB, 0x254B],
	[0x2550, 0x2573], [0x2580, 0x258F], [0x2592, 0x2595], [0x25A0, 0x25A1], [0x25A3, 0x25A9],
	[0x25B2, 0x25B3], [0x25B6, 0x25B7], [0x25BC, 0x25BD], [0x25C0, 0x25C1], [0x25C6, 0x25C8],
	[0x25CB, 0x25CB], [0x25CE, 0x25D1], [0x25E2, 0x25E5], [0x25EF, 0x25EF], [0x2605, 0x2606],
	[0x2609, 0x2609], [0x260E, 0x260F], [0x261C, 0x261C], [0x261E, 0x261E], [0x2640, 0x2640],
	[0x2642, 0x2642], [0x2660, 0x2661], [0x2663, 0x2665], [0x2667, 0x266A], [0x266C, 0x266D],
	[0x266F, 0x266F], [0x269E, 0x269F], [0x26BF, 0x26BF], [0x26C6, 0x26CD], [0x26CF, 0x26D3],
	[0x26D5, 0x26E1], [0x26E3, 0x26E3], [0x26E8, 0x26E9], [0x26EB, 0x26F1], [0x26F4, 0x26F4],
	[0x26F6, 0x26F9], [0x26FB, 0x26FC], [0x26FE, 0x26FF], [0x273D, 0x273D], [0x2776, 0x277F],
	[0x2B56, 0x2B59], [0x3248, 0x324F], [0xE000, 0xF8FF], [0xFE00, 0xFE0F], [0xFFFD, 0xFFFD],
	[0x1F100, 0x1F10A], [0x1F110, 0x1F12D], [0x1F130, 0x1F169], [0x1F170, 0x1F18D],
	[0x1F18F, 0x1F190], [0x1F19B, 0x1F1AC], [0xE0100, 0xE01EF], [0xF0000, 0xFFFFD],
	[0x100000, 0x10FFFD],
];

/**
 * Display width used for East Asian Ambiguous characters:
 * 1 = narrow (Western fonts), 2 = wide (most CJK fonts).
 */
export type AmbiguousWidth = 1 | 2;

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
 * The tables are checked in the order zero width -> wide -> ambiguous, because a few code points
 * appear in more than one table (e.g. U+3099 COMBINING KATAKANA-HIRAGANA VOICED SOUND MARK lies
 * inside the Wide kana block, U+0300-036F combining marks are also listed as Ambiguous).
 *
 * @param codePoint      Unicode code point to measure.
 * @param ambiguousWidth Width to use for East Asian Ambiguous characters (default: 1, narrow).
 */
export function codePointWidth(codePoint: number, ambiguousWidth: AmbiguousWidth = 1): number {
	if (inRanges(codePoint, ZERO_WIDTH)) return 0;
	if (inRanges(codePoint, WIDE)) return 2;
	if (inRanges(codePoint, AMBIGUOUS)) return ambiguousWidth;
	return 1;
}

/**
 * Returns the number of columns a string occupies in a monospaced font.
 *
 * @param value          Text to measure.
 * @param ambiguousWidth Width to use for East Asian Ambiguous characters (default: 1, narrow).
 *
 * @example
 * stringWidth('abc')      // 3
 * stringWidth('日本語')   // 6
 * stringWidth('e\u0301')  // 1 (e + combining acute accent)
 * stringWidth('※', 1)    // 1 (Western font)
 * stringWidth('※', 2)    // 2 (CJK font)
 */
export function stringWidth(value: string, ambiguousWidth: AmbiguousWidth = 1): number {
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
		width += codePointWidth(codePoint, ambiguousWidth);
	}
	return width;
}
