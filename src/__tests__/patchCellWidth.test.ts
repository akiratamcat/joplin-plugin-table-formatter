// Integration tests: format tables with markdown-table-prettify after applying patchCellWidth().
//
// Each test checks that every line of the formatted table has the same display width, i.e. the
// columns line up in a monospaced font. Some tests also compare the exact output so that the
// padding and the separator row are verified character by character.
import { CliPrettify } from 'markdown-table-prettify';
import { patchCellWidth, setAmbiguousWidth } from '../patchCellWidth';
import { AmbiguousWidth, stringWidth } from '../charWidth';

describe('patchCellWidth', () => {
	// The patch modifies the library's prototypes globally; apply it once for all tests
	beforeAll(() => patchCellWidth());
	// setAmbiguousWidth is module-level state; reset it so that tests do not affect each other
	afterEach(() => setAmbiguousWidth(1));

	/**
	 * Asserts that all non-empty lines of the formatted table have the same display width.
	 * ambiguousWidth must match the width used for formatting (see setAmbiguousWidth).
	 */
	const expectAligned = (formatted: string, ambiguousWidth: AmbiguousWidth = 1) => {
		const lines = formatted.split('\n').filter(l => l.length > 0);
		const widths = lines.map(l => stringWidth(l, ambiguousWidth));
		expect(new Set(widths).size).toBe(1);
	};

	// The same table is formatted with both ambiguous widths. "※" and "○×" are Ambiguous, so their
	// padding changes, while the kanji header and the ASCII cell are measured the same way in both.
	describe('East Asian Ambiguous characters', () => {
		const input = '|記号|意味|\n|-|-|\n|※|注記|\n|○×|可否|\n|abc|英字|\n';

		// Western font: "※" = 1 column, "○×" = 2 columns
		test('narrow (1)', () => {
			setAmbiguousWidth(1);
			const formatted = CliPrettify.prettify(input);
			expect(formatted).toBe(
				'| 記号 | 意味 |\n' +
				'|------|------|\n' +
				'| ※    | 注記 |\n' +
				'| ○×   | 可否 |\n' +
				'| abc  | 英字 |\n'
			);
			expectAligned(formatted, 1);
		});

		// CJK font: "※" = 2 columns, "○×" = 4 columns (as wide as the column, so no padding)
		test('wide (2)', () => {
			setAmbiguousWidth(2);
			const formatted = CliPrettify.prettify(input);
			expect(formatted).toBe(
				'| 記号 | 意味 |\n' +
				'|------|------|\n' +
				'| ※   | 注記 |\n' +
				'| ○× | 可否 |\n' +
				'| abc  | 英字 |\n'
			);
			expectAligned(formatted, 2);
		});
	});

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
