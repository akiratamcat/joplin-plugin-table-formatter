import joplin from 'api';
import { ContentScriptType, MenuItemLocation, SettingItemType } from 'api/types';
import { AMBIGUOUS_WIDTH_SETTING_DEFAULT, resolveAmbiguousWidth } from './ambiguousWidth';
import { _, setLocale } from './i18n';

/** Name of the section shown in Joplin's options screen for this plugin. */
const SETTINGS_SECTION = 'tableFormatter';

/**
 * Key of the setting that chooses the width of East Asian Ambiguous characters.
 * Prefixed with the plugin name because setting keys share one namespace across plugins.
 */
const SETTING_AMBIGUOUS_WIDTH = 'tableFormatter.ambiguousCharWidth';

joplin.plugins.register({
	onStart: async function() {
		// Settings registered by plugins are not persisted as definitions: they must be registered
		// again on every start (their values are kept by Joplin).
		// Choose the UI language before registering anything: Joplin keeps the labels passed at
		// registration time. Strings wrapped in _() are translated (see i18n.ts and src/locales/).
		setLocale(await joplin.settings.globalValue('locale'));

		await joplin.settings.registerSection(SETTINGS_SECTION, {
			label: _('Table Formatter'),
			iconName: 'fas fa-table',
		});
		// Rendered as a dropdown list (isEnum). The option keys are the values passed to
		// resolveAmbiguousWidth; see AmbiguousWidthSetting in ambiguousWidth.ts.
		await joplin.settings.registerSettings({
			[SETTING_AMBIGUOUS_WIDTH]: {
				value: AMBIGUOUS_WIDTH_SETTING_DEFAULT,
				type: SettingItemType.String,
				isEnum: true,
				options: {
					auto: _('Auto (2 for Japanese, Chinese and Korean UI languages, otherwise 1)'),
					'1': _('Always 1 (narrow)'),
					'2': _('Always 2 (wide)'),
				},
				public: true,
				section: SETTINGS_SECTION,
				label: _('Width of East Asian Ambiguous characters'),
				description: _('Characters such as ※ ○ × ① α are rendered narrow in Western fonts and wide in most CJK fonts. Choose the width that matches your editor font.'),
			},
		});

		joplin.contentScripts.register(ContentScriptType.CodeMirrorPlugin, "TableFormatter", "./TableFormatter.js");
		joplin.commands.register({
			// Test build: command name and label differ from the original plugin so that both can be
			// installed side by side without their commands colliding.
			name: 'formatTableEaw',
			// Shown in the Edit menu and the editor context menu. " (EAW)" is appended outside _() so that
			// the msgid stays "Format Table" and the existing translations keep working.
			label: _('Format Table') + ' (EAW)',
			execute: async () => {
				// Read the settings on every run so changes to the UI language or the plugin setting
				// apply immediately, without restarting Joplin.
				const setting = await joplin.settings.value(SETTING_AMBIGUOUS_WIDTH);
				// "locale" is Joplin's own UI language setting, e.g. "ja_JP" or "en_GB"
				const locale = await joplin.settings.globalValue('locale');
				const ambiguousWidth = resolveAmbiguousWidth(setting, locale);

				// The formatting itself runs inside the editor (TableFormatter.ts, a CodeMirror content
				// script), which cannot read plugin settings. Pass the resolved width to it as an argument
				// of the "formatTableEaw" CodeMirror extension.
				await joplin.commands.execute('editor.execCommand', { name: 'formatTableEaw', args: [ambiguousWidth] });
			}
		});
		joplin.views.menuItems.create("Format Table (EAW)", "formatTableEaw", MenuItemLocation.Edit);
		joplin.views.menuItems.create("Format Table (EAW) Context", "formatTableEaw", MenuItemLocation.EditorContextMenu);
	},
});
