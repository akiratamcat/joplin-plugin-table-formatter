// Integration tests: format tables with markdown-table-prettify after applying patchCellWidth().
//
// Each test checks that every line of the formatted table has the same display width, i.e. the
// columns line up in a monospaced font. Some tests also compare the exact output so that the
// padding and the separator row are verified character by character.
import { CliPrettify } from 'markdown-table-prettify';
import { patchCellWidth } from '../patchCellWidth';
import { stringWidth } from '../charWidth';

describe('patchCellWidth', () => {
	// The patch modifies the library's prototypes globally; apply it once for all tests
	beforeAll(() => patchCellWidth());

	/** Asserts that all non-empty lines of the formatted table have the same display width. */
	const expectAligned = (formatted: string) => {
		const lines = formatted.split('\n').filter(l => l.length > 0);
		const widths = lines.map(l => stringWidth(l));
		expect(new Set(widths).size).toBe(1);
	};

	test('aligns tables with Japanese text', () => {
		const input = '|名前|説明|\n|-|-|\n|りんご|赤い果物|\n|apple|red fruit|\n';
		const formatted = CliPrettify.prettify(input);
		expect(formatted).toBe(
			'| 名前   | 説明      |\n' +
			'|--------|-----------|\n' +
			'| りんご | 赤い果物  |\n' +
			'| apple  | red fruit |\n'
		);
		expectAligned(formatted);
	});

	// Without the buildSeparator patch the separator would be measured with String.length and
	// end up shorter than the cells, because no ASCII cell widens these columns.
	test('separator row matches columns containing only wide characters', () => {
		const input = '|見出し|列|\n|:-:|-:|\n|日本語|あいう|\n';
		const formatted = CliPrettify.prettify(input);
		expect(formatted).toBe(
			'| 見出し |     列 |\n' +
			'|:------:|-------:|\n' +
			'| 日本語 | あいう |\n'
		);
		expectAligned(formatted);
	});

	// Covers left / center / right alignment together with fullwidth Latin, Hangul, emoji,
	// katakana, halfwidth katakana, CJK brackets and a combining mark (e + U+0301).
	test('aligns tables with mixed scripts and alignments', () => {
		const input =
			'|左|中央|右|\n|:-|:-:|-:|\n' +
			'|ＡＢＣ|한글|\u{1F600}|\n' +
			'|abc|カタカナ|ｶﾀｶﾅ|\n' +
			'|「全角」|x|e\u0301|\n';
		expectAligned(CliPrettify.prettify(input));
	});

	// Regression test: the patch must not change the output for plain ASCII tables
	test('ASCII-only tables are unchanged', () => {
		const input = '|a|bb|c|\n|:-|:-:|-:|\n|xxx|yy|zz|\n';
		expect(CliPrettify.prettify(input)).toBe(
			'| a   | bb |  c |\n' +
			'|:----|:--:|---:|\n' +
			'| xxx | yy | zz |\n'
		);
	});
});
