import { CliPrettify } from 'markdown-table-prettify';
import { patchCellWidth } from '../patchCellWidth';
import { stringWidth } from '../charWidth';

describe('patchCellWidth', () => {
	beforeAll(() => patchCellWidth());

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

	test('aligns tables with mixed scripts and alignments', () => {
		const input =
			'|左|中央|右|\n|:-|:-:|-:|\n' +
			'|ＡＢＣ|한글|😀|\n' +
			'|abc|カタカナ|ｶﾀｶﾅ|\n' +
			'|「全角」|x|é|\n';
		expectAligned(CliPrettify.prettify(input));
	});

	test('ASCII-only tables are unchanged', () => {
		const input = '|a|bb|c|\n|:-|:-:|-:|\n|xxx|yy|zz|\n';
		expect(CliPrettify.prettify(input)).toBe(
			'| a   | bb |  c |\n' +
			'|:----|:--:|---:|\n' +
			'| xxx | yy | zz |\n'
		);
	});
});
