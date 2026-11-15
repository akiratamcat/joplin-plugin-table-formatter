/**
 * Makes markdown-table-prettify measure text by its display width (see charWidth.ts).
 *
 * Why a patch is needed:
 *   The library computes widths in two places, and neither considers East Asian Width:
 *   - Cell.prototype.getLength
 *       Used to pad every cell to the width of the longest cell in its column. It only treats
 *       CJK Unified Ideographs as double width, so kana, fullwidth forms, Hangul, ... are
 *       under-measured.
 *   - RowViewModelFactory.prototype.buildSeparator
 *       Builds the "|---|:---:|" row. It uses String.length (UTF-16 code units) of the padded
 *       cells, so the separator is too short for columns with wide characters and too long for
 *       columns with combining marks or surrogate pairs.
 *   The library offers no option or hook to customise this, so both methods are replaced.
 *
 * Why import by path:
 *   The library's entry point only exports CliPrettify, and the package ships no type declarations.
 *   The classes are therefore imported from their module files (typed as `any`).
 *   webpack bundles a single instance of each module, so the prototypes patched here are the same
 *   ones CliPrettify uses internally.
 *
 * Caveat:
 *   This depends on internal file paths and method names of markdown-table-prettify 3.x.
 *   Re-check this file (and run the tests) when upgrading the library.
 */
import { Cell } from 'markdown-table-prettify/src/models/cell';
import { RowViewModel } from 'markdown-table-prettify/src/viewModels/rowViewModel';
import { RowViewModelFactory } from 'markdown-table-prettify/src/viewModelFactories/rowViewModelFactory';
import { AmbiguousWidth, stringWidth } from './charWidth';

/** Guards against patching twice (e.g. when the content script is evaluated more than once). */
let patched = false;
/**
 * Width used for East Asian Ambiguous characters by the patched methods.
 * Kept as module-level state because the library calls getLength / buildSeparator itself, so the
 * value cannot be passed as an argument. It is set right before every formatting run.
 */
let ambiguousWidth: AmbiguousWidth = 1;

/**
 * Sets the width used for East Asian Ambiguous characters in subsequent formatting.
 * @param width 1 = narrow (Western fonts), 2 = wide (most CJK fonts)
 */
export function setAmbiguousWidth(width: AmbiguousWidth): void {
	ambiguousWidth = width;
}

/**
 * Replaces the width calculations of markdown-table-prettify with display-width aware versions.
 * Call it once before using CliPrettify. Calling it again has no effect.
 */
export function patchCellWidth(): void {
	if (patched) return;

	// Width of a cell's text, used for padding. A regular function (not an arrow function) is
	// required so that `this` refers to the Cell instance.
	Cell.prototype.getLength = function (): number {
		return stringWidth(this.getValue(), ambiguousWidth);
	};

	// Same logic as the original buildSeparator, except that the width of each padded cell is
	// measured with stringWidth instead of String.length.
	//   rows:  RowViewModel[] - the already padded cells of every row (excluding the separator)
	//   table: Table          - provides the column alignments and the line ending of the separator
	RowViewModelFactory.prototype.buildSeparator = function (rows: any[], table: any) {
		const columnCount: number = rows[0].columnCount;

		// Widest padded cell of each column. Every row is padded to the same width already, so
		// this equals the width of any cell in the column.
		const lengths: number[] = Array(columnCount).fill(0);
		for (const row of rows) {
			for (let i = 0; i < columnCount; i++) {
				lengths[i] = Math.max(lengths[i], stringWidth(row.getValueAt(i), ambiguousWidth));
			}
		}

		// Fill each column with "-" and let the alignment marker add ":" for left/center/right.
		// separatorChar and _alignmentMarkerStrategy are fields set in the original constructor.
		const values = lengths
			.map(l => this.separatorChar.repeat(l))
			.map((val, col) => this._alignmentMarkerStrategy.markerFor(table.alignments[col]).mark(val));
		return new RowViewModel(values, table.separatorEOL);
	};

	patched = true;
}
