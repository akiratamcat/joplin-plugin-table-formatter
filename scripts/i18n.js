#!/usr/bin/env node
/**
 * Translation workflow helper (gettext).
 *
 * Usage:
 *   node scripts/i18n.js extract   Extract _('...') strings from src/**\/*.ts into src/locales/messages.pot
 *                                  and merge them into every src/locales/*.po (needs GNU gettext 0.24+,
 *                                  e.g. the one bundled with Poedit, for TypeScript support)
 *   node scripts/i18n.js check     Validate every .po file with msgfmt --check (needs GNU gettext)
 *   node scripts/i18n.js compile   Convert every .po file into src/locales/translations.json
 *                                  (pure Node.js, no gettext needed; run by `npm run dist` and `npm test`)
 *
 * GNU gettext tools are looked up in this order:
 *   1. the directory in the GETTEXT_TOOLS_DIR environment variable
 *   2. the tools bundled with Poedit on Windows (C:\Program Files\Poedit\GettextTools\bin)
 *   3. PATH
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const localesDir = path.join(srcDir, 'locales');
const potFile = path.join(localesDir, 'messages.pot');
const jsonFile = path.join(localesDir, 'translations.json');
const manifest = require(path.join(srcDir, 'manifest.json'));

// Built with fromCharCode so that this file contains no escape sequences that could be mangled
const BACKSLASH = String.fromCharCode(92);
const LF = String.fromCharCode(10);
const ESCAPES = { n: LF, t: String.fromCharCode(9), r: String.fromCharCode(13) };

// ---------------------------------------------------------------------------------------------
// gettext tools
// ---------------------------------------------------------------------------------------------

/** Returns the command to run a GNU gettext tool (full path when found in a known directory). */
function gettextTool(name) {
	const exe = process.platform === 'win32' ? name + '.exe' : name;
	const dirs = [];
	if (process.env.GETTEXT_TOOLS_DIR) dirs.push(process.env.GETTEXT_TOOLS_DIR);
	if (process.platform === 'win32') dirs.push('C:/Program Files/Poedit/GettextTools/bin');
	for (const dir of dirs) {
		const candidate = path.join(dir, exe);
		if (fs.existsSync(candidate)) return candidate;
	}
	return name; // fall back to PATH
}

function run(tool, args) {
	const command = gettextTool(tool);
	try {
		execFileSync(command, args, { cwd: rootDir, stdio: 'inherit' });
	} catch (error) {
		if (error.code === 'ENOENT') {
			throw new Error(`${tool} was not found. Install Poedit or GNU gettext, or set GETTEXT_TOOLS_DIR.`);
		}
		throw new Error(`${tool} failed (${command})`);
	}
}

// ---------------------------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------------------------

/** Lists the TypeScript sources that may contain UI strings (tests and type declarations excluded). */
function listSources(dir) {
	let files = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === '__tests__' || entry.name === 'locales') continue;
			files = files.concat(listSources(full));
		} else if (/\.tsx?$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) {
			files.push(full);
		}
	}
	return files;
}

/** Lists the .po files, e.g. ["src/locales/ja_JP.po"]. */
function listPoFiles() {
	if (!fs.existsSync(localesDir)) return [];
	return fs.readdirSync(localesDir).filter(f => f.endsWith('.po')).sort().map(f => path.join(localesDir, f));
}

/** Path relative to the repository root with "/" separators (stable in .pot location comments). */
function relative(file) {
	return path.relative(rootDir, file).split(path.sep).join('/');
}

// ---------------------------------------------------------------------------------------------
// PO parser (only what compile needs)
// ---------------------------------------------------------------------------------------------

/** Decodes one quoted PO string such as "a \"b\"\n" (C-style escapes). */
function unquote(text, file, lineNo) {
	const s = text.trim();
	if (s.length < 2 || s[0] !== '"' || s[s.length - 1] !== '"') {
		throw new Error(`${relative(file)}:${lineNo}: expected a quoted string`);
	}
	let out = '';
	const body = s.slice(1, -1);
	for (let i = 0; i < body.length; i++) {
		const c = body[i];
		if (c !== BACKSLASH) {
			out += c;
			continue;
		}
		const next = body[++i];
		out += ESCAPES[next] !== undefined ? ESCAPES[next] : next; // \" -> ", \\ -> \
	}
	return out;
}

/**
 * Parses a .po file into entries { msgctxt, msgid, msgidPlural, msgstr: string[], fuzzy }.
 * Obsolete entries (#~) and comments other than flags are ignored.
 */
function parsePo(file) {
	const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
	const entries = [];
	let entry = null;
	let field = null; // name of the field that continuation lines append to

	const flush = () => {
		if (entry && entry.msgid !== undefined) entries.push(entry);
		entry = null;
		field = null;
	};
	const current = () => (entry = entry || { msgstr: [], fuzzy: false });

	lines.forEach((raw, index) => {
		const lineNo = index + 1;
		const line = raw.trim();
		if (line === '') return flush();
		if (line.startsWith('#~')) return; // obsolete entry
		if (line.startsWith('#,')) {
			if (entry && entry.msgid !== undefined) flush(); // flags start a new entry
			current().fuzzy = line.slice(2).split(',').map(f => f.trim()).includes('fuzzy');
			return;
		}
		if (line.startsWith('#')) {
			if (entry && entry.msgid !== undefined) flush();
			return;
		}

		let match;
		if ((match = /^msgctxt\s+(.*)$/.exec(line))) {
			if (entry && entry.msgid !== undefined) flush();
			current().msgctxt = unquote(match[1], file, lineNo);
			field = 'msgctxt';
		} else if ((match = /^msgid_plural\s+(.*)$/.exec(line))) {
			current().msgidPlural = unquote(match[1], file, lineNo);
			field = 'msgidPlural';
		} else if ((match = /^msgid\s+(.*)$/.exec(line))) {
			if (entry && entry.msgid !== undefined) flush();
			current().msgid = unquote(match[1], file, lineNo);
			field = 'msgid';
		} else if ((match = /^msgstr(?:\[(\d+)\])?\s+(.*)$/.exec(line))) {
			const n = match[1] === undefined ? 0 : Number(match[1]);
			current().msgstr[n] = unquote(match[2], file, lineNo);
			field = 'msgstr' + n;
		} else if (line.startsWith('"')) {
			if (!entry || !field) throw new Error(`${relative(file)}:${lineNo}: unexpected string`);
			const text = unquote(line, file, lineNo);
			if (field.startsWith('msgstr')) entry.msgstr[Number(field.slice(6))] += text;
			else entry[field] += text;
		} else {
			throw new Error(`${relative(file)}:${lineNo}: cannot parse "${line}"`);
		}
	});
	flush();
	return entries;
}

// ---------------------------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------------------------

function extract() {
	fs.mkdirSync(localesDir, { recursive: true });
	const sources = listSources(srcDir).map(relative).sort();
	run('xgettext', [
		'--language=TypeScript',
		'--from-code=UTF-8',
		'--keyword=_',
		'--add-comments=TRANSLATORS:',
		'--add-location=file',
		'--package-name=' + manifest.name,
		'--package-version=' + manifest.version,
		'--output=' + relative(potFile),
		...sources,
	]);
	console.log(`Extracted strings into ${relative(potFile)}`);

	for (const po of listPoFiles()) {
		run('msgmerge', ['--update', '--backup=none', '--add-location=file', relative(po), relative(potFile)]);
		console.log(`Merged into ${relative(po)}`);
	}
}

function check() {
	const pos = listPoFiles();
	for (const po of pos) {
		run('msgfmt', ['--check', '--statistics', '--output-file=' + os.devNull, relative(po)]);
	}
	console.log(`Checked ${pos.length} file(s)`);
}

function compile() {
	const catalogs = {};
	for (const po of listPoFiles()) {
		const locale = path.basename(po, '.po');
		const catalog = {};
		let skipped = 0;
		for (const e of parsePo(po)) {
			// Skip the header (empty msgid), untranslated and fuzzy entries; _() then shows English.
			// Plural forms and contexts are not used by the plugin, so they are skipped as well.
			if (e.msgid === '' || e.msgctxt !== undefined || e.msgidPlural !== undefined) continue;
			if (e.fuzzy || !e.msgstr[0]) {
				skipped++;
				continue;
			}
			catalog[e.msgid] = e.msgstr[0];
		}
		catalogs[locale] = catalog;
		const note = skipped ? ` (${skipped} untranslated or fuzzy, shown in English)` : '';
		console.log(`${relative(po)}: ${Object.keys(catalog).length} translation(s)${note}`);
	}
	fs.mkdirSync(localesDir, { recursive: true });
	fs.writeFileSync(jsonFile, JSON.stringify(catalogs, null, '\t') + LF, 'utf8');
	console.log(`Wrote ${relative(jsonFile)}`);
}

const commands = { extract, check, compile };
const command = process.argv[2];
if (!commands[command]) {
	console.error('Usage: node scripts/i18n.js <extract|check|compile>');
	process.exit(1);
}
try {
	commands[command]();
} catch (error) {
	console.error(error.message);
	process.exit(1);
}
