// markdown-table-prettify computes widths without considering East Asian Width:
//   - Cell.prototype.getLength (used for cell padding) treats only CJK ideographs as double width.
//   - RowViewModelFactory.prototype.buildSeparator (used for the "|---|" row) uses String.length.
// Replace both with an East Asian Width aware implementation. The library has no type declarations
// and does not export these classes from its entry point, so they are imported by path. webpack
// bundles a single instance of each module, so the patched prototypes are the ones CliPrettify uses.
import { Cell } from 'markdown-table-prettify/src/models/cell';
import { RowViewModel } from 'markdown-table-prettify/src/viewModels/rowViewModel';
import { RowViewModelFactory } from 'markdown-table-prettify/src/viewModelFactories/rowViewModelFactory';
import { stringWidth } from './charWidth';

let patched = false;

export function patchCellWidth(): void {
	if (patched) return;

	Cell.prototype.getLength = function (): number {
		return stringWidth(this.getValue());
	};

	RowViewModelFactory.prototype.buildSeparator = function (rows: any[], table: any) {
		const columnCount: number = rows[0].columnCount;
		const lengths: number[] = Array(columnCount).fill(0);
		for (const row of rows) {
			for (let i = 0; i < columnCount; i++) {
				lengths[i] = Math.max(lengths[i], stringWidth(row.getValueAt(i)));
			}
		}
		const values = lengths
			.map(l => this.separatorChar.repeat(l))
			.map((val, col) => this._alignmentMarkerStrategy.markerFor(table.alignments[col]).mark(val));
		return new RowViewModel(values, table.separatorEOL);
	};

	patched = true;
}
