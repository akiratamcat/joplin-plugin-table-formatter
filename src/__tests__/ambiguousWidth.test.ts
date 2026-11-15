// Unit tests for choosing the width of East Asian Ambiguous characters (ambiguousWidth.ts).
import { isCjkLocale, resolveAmbiguousWidth } from '../ambiguousWidth';

describe('isCjkLocale', () => {
	test.each([
		// Joplin locale codes of the CJK languages
		['ja_JP', true],
		['zh_CN', true],
		['zh_TW', true],
		['ko', true], // language code without a region
		['ja-JP', true], // BCP 47 style separator
		// Other languages
		['en_GB', false],
		['en_US', false],
		['fr_FR', false],
		['jam', false], // starts with "ja" but is a different language: must match the whole code
		// Missing values
		['', false],
		[null, false],
		[undefined, false],
	])('%s => %s', (locale, expected) => {
		expect(isCjkLocale(locale)).toBe(expected);
	});
});

describe('resolveAmbiguousWidth', () => {
	test('auto follows the UI language', () => {
		expect(resolveAmbiguousWidth('auto', 'ja_JP')).toBe(2);
		expect(resolveAmbiguousWidth('auto', 'ko')).toBe(2);
		expect(resolveAmbiguousWidth('auto', 'en_US')).toBe(1);
	});

	// For users whose editor font does not match the UI language
	test('explicit values override the UI language', () => {
		expect(resolveAmbiguousWidth('1', 'ja_JP')).toBe(1);
		expect(resolveAmbiguousWidth('2', 'en_US')).toBe(2);
	});

	// A missing or corrupted setting must not break formatting
	test('unknown or missing setting is treated as auto', () => {
		expect(resolveAmbiguousWidth(undefined, 'zh_CN')).toBe(2);
		expect(resolveAmbiguousWidth('bogus', 'en_US')).toBe(1);
	});
});
