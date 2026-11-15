# Table Formatter

## What this plugin does

This plugin aligns the columns in the markdown version of your table. It will turn something like this

```sh
| city | capital of which state | Notes |
|----------|-----------|--|
| London | United Kingdom | very expensive |
| Dublin | Ireland | just as expensive, without any of the perks |
| Edinburgh | Scotland | -- |
| Oslo | Norway | You can't afford to travel there |
```

into this

```sh
| city      | capital of     | Notes                                       |
| --------- | -------------- | ------------------------------------------- |
| London    | United Kingdom | very expensive                              |
| Dublin    | Ireland        | just as expensive, without any of the perks |
| Edinburgh | Scotland       | --                                          |
| Oslo      | Norway         | You can't afford to travel there            |
```

To use, just select the table in the markdown, and right click to bring a context menu with the 'Format Table' command

## Developer notes

The main two files you will want to look at are:

- `/src/index.ts`, which contains the entry point for the plugin source code.
- `/src/manifest.json`, which is the plugin manifest. It contains information such as the plugin a name, version, etc.

## Building the plugin

The plugin is built using Webpack, which creates the compiled code in `/dist`. A JPL archive will also be created at the root, which can use to distribute the plugin.

To build the plugin, simply run `npm run dist`.

The project is setup to use TypeScript, although you can change the configuration to use plain JavaScript.

## Translations

The settings screen and menu labels are translated with gettext. The plugin follows Joplin's UI language
and falls back to English for languages without a translation.

| File | Purpose |
|---|---|
| `src/locales/messages.pot` | Template of all strings to translate, extracted from the source code |
| `src/locales/<locale>.po` | Translations of one language, e.g. `ja_JP.po` (edit with [Poedit](https://poedit.net/)) |
| `src/locales/translations.json` | Generated from the `.po` files and bundled into the plugin (not committed) |

Commands:

- `npm run i18n:extract` - extract the `_('...')` strings from `src/**/*.ts` into `messages.pot` and merge them into
  every `.po` file. Requires GNU gettext 0.24 or later for TypeScript support; the tools bundled with Poedit are used
  automatically on Windows. Set `GETTEXT_TOOLS_DIR` to use another installation.
- `npm run i18n:check` - validate the `.po` files with `msgfmt --check`.
- `npm run i18n:compile` - generate `translations.json`. Runs automatically as part of `npm run dist` and `npm test`,
  and needs only Node.js.

To change or add a UI string, wrap it in `_()` (imported from `src/i18n.ts`; the argument must be a string literal),
run `npm run i18n:extract`, then translate the new entries in the `.po` files.

To add a language, copy `messages.pot` to `src/locales/<locale>.po` using Joplin's locale code (e.g. `zh_CN.po`),
or create it from the template in Poedit, and translate it.

## Updating the plugin framework

To update the plugin framework, run `npm run update`.

In general this command tries to do the right thing - in particular it's going to merge the changes in package.json and .gitignore instead of overwriting. It will also leave "/src" as well as README.md untouched.

The file that may cause problem is "webpack.config.js" because it's going to be overwritten. For that reason, if you want to change it, consider creating a separate JavaScript file and include it in webpack.config.js. That way, when you update, you only have to restore the line that include your file.
