import { Editor } from "codemirror";
import { CliPrettify } from 'markdown-table-prettify';
import { patchCellWidth, setAmbiguousWidth } from './patchCellWidth';

// Make CliPrettify measure cells by their display width, so that tables containing
// wide characters (kana, Hangul, fullwidth forms, emoji, ...) are aligned correctly.
// This runs once when the content script is loaded into the editor.
patchCellWidth();

module.exports = {
	default: function(_context: any) {

		const plugin = function(CodeMirror) {
			// ambiguousWidth: width of East Asian Ambiguous characters (※ ○ × ① α ...), 1 or 2.
			// It is decided by the main plugin script (index.ts) from the plugin setting and the Joplin
			// UI language, and passed here through editor.execCommand's "args".
			// Test build: renamed from 'formatTable' so that it does not collide with the original plugin
			CodeMirror.defineExtension('formatTableEaw', function(ambiguousWidth?: number) {
				const cm: Editor = this; // to get autocomplete working

				// Anything other than 2 (including a missing argument, e.g. when the command is invoked
				// by another plugin without arguments) falls back to narrow, the Western default.
				setAmbiguousWidth(ambiguousWidth === 2 ? 2 : 1);

				const cursor = cm.getCursor();
				let startLine = cursor.line;
				while (startLine >=0 && cm.getLine(startLine).trimStart().charAt(0) === '|') startLine--;
				startLine++;

				let endLine = cursor.line;
				while (!!cm.getLine(endLine) && cm.getLine(endLine).trimStart().charAt(0) === '|') endLine++;
				
				const table = cm.getRange({line: startLine, ch: 0}, {line: endLine, ch: 0});
				const formatted = CliPrettify.prettify(table);
				cm.replaceRange(formatted, {line: startLine, ch: 0}, {line: endLine, ch: 0})
            });
		}

		return {
			plugin: plugin,
        }
    }
}