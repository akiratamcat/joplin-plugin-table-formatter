/**
 * Decides how wide East Asian Ambiguous characters (※ ○ × ① α ...) should be treated.
 *
 * Unicode does not define a fixed width for these characters: Western fonts render them narrow
 * (1 column), while most Chinese, Japanese and Korean fonts render them wide (2 columns).
 * The plugin cannot inspect the editor font, so it offers a setting and, by default, guesses from
 * the Joplin UI language. Users whose font does not match the guess can override it.
 *
 * This module contains only pure functions so that it can be unit tested without Joplin.
 */
import { AmbiguousWidth } from './charWidth';

/**
 * Value of the "Width of East Asian Ambiguous characters" plugin setting.
 *   'auto' - decide from the Joplin UI language (default)
 *   '1'    - always narrow
 *   '2'    - always wide
 * The values are strings because Joplin stores enum settings by their option keys.
 */
export type AmbiguousWidthSetting = 'auto' | '1' | '2';

/** Default value of the setting. */
export const AMBIGUOUS_WIDTH_SETTING_DEFAULT: AmbiguousWidthSetting = 'auto';

/**
 * Matches Joplin locale codes of Japanese, Chinese and Korean, e.g. "ja_JP", "zh_CN", "zh_TW", "ko".
 * The language code must be followed by "_", "-" or the end of the string, so that other
 * languages whose code merely starts with the same letters (e.g. "jam") are not matched.
 */
const CJK_LOCALE = /^(ja|zh|ko)([_-]|$)/i;

/**
 * Returns true if the locale is Japanese, Chinese or Korean.
 * @param locale Joplin locale code (the "locale" global setting). Missing values are treated as non-CJK.
 */
export function isCjkLocale(locale: string | null | undefined): boolean {
	return CJK_LOCALE.test(locale || '');
}

/**
 * Decides the display width of East Asian Ambiguous characters.
 *
 * @param setting Value of the plugin setting. Unknown or missing values are treated as 'auto',
 *                so a corrupted setting still produces a sensible result.
 * @param locale  Joplin UI locale, used only when the setting is 'auto'.
 * @returns 2 for CJK locales in 'auto' mode or when forced to '2', otherwise 1.
 */
export function resolveAmbiguousWidth(setting: string | null | undefined, locale: string | null | undefined): AmbiguousWidth {
	if (setting === '1') return 1;
	if (setting === '2') return 2;
	return isCjkLocale(locale) ? 2 : 1;
}
