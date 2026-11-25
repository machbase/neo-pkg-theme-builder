# neo-pkg-theme-builder — development notes

How the builder decides what a color changes, how it plugs into the web UI, and how to test it.
What the package is for and how to use it is in [README.md](README.md).


## The builder, in detail

1. **Start from** the theme in use (any package's), Dark, a preset or one of your themes.
   Presets are not changed: saving makes a copy.
2. **Colors** — the shared colors: *Basics* (Frame, Content, Text, Accent, Borders, Hover, Selection and
   the corners), then Surfaces, Text, Controls, Signals. Under each, **Using it**:
   everything that follows it (`descendantsOf`) — the colors of the parts of the screen (GNB, Tab bar,
   Side panel, Console, Tables, Inputs, Dialogs, Menus, Tooltips) and the shared colors that are only
   another's color (`follow`: Section headers is Frame's, Drawers Content's, Primary button Accent's).
   A row that follows shows the color it has now — its box and its value — and **Customize** gives it
   a color of its own;
   a group lists only the colors that are their own (the basics, the signals, Selection) or worked out
   by a formula (Layer, Hover, Sub text…). A text color is worked
   out from Text alone (`fadeOf`/`strongOf` read Text's lightness): no background moves it, and
   `on`/`min` only feed the contrast checks. The Text group holds Sub text (helper text: counts, notes, placeholders, the server
   version — 4.5:1, or no fainter than the icons where they read less), Icons and Text on color, with
   Disabled text under Sub text and Accent text under Accent; a signal has its fill
   and its text (Warning / Warning text…), the text kept readable on the content. A role follows
   another until you give it its own color ("follows Layer", "from Text", "auto"; a follower the start
   draws as a shade of its parent says so — "follows Accent · darker, as Light has it"): a part follows the basics, the
   Danger button follows Error, the side panel's sub text follows Sub text — not Icons — while a
   table's column names follow Text, and a part's main text (log lines, the
   other tabs' names) is worked out from Text alone, so Sub text moves helper text only. The
   console's tab names and its log lines are two colors (Tab names, Log lines), and its Background
   is the log body under the header. A dialog has a Title of its own; every other word in it, and in a menu, an
   input or a table, is the page's text (Text, Sub text…). **custom · reset** lets it follow again. Changing a role changes
   only the tokens that role decides; what the start tuned elsewhere stays. Light or dark — what
   the code editor, charts and terminal follow — comes from Content: whichever of black and white
   reads better on it. To make a light theme from a dark one, start from a light preset.

   **Where a color changes.** Every role says it, under its name: *Changes: GNB · Tab bar ·
   Console — also …*. The parts come from the tokens the role moves; the "also" places are the
   shared tokens it moves, where the web UI draws them (`impact.json`, measured on every screen
   of the web UI — see below). Point at a role and the preview outlines what it changes, switching to a scene that draws it
   when the one on screen does not (every role is drawn in some scene: preview.test.js);
   change it and the preview flashes what changed, with a line saying where. Frame is the GNB,
   the tab bar, the console header and Section headers — the side panel's OPEN EDITORS, EXPLORER
   and PACKAGES bars are Section headers' color in the web UI (`side-header-bg` falls back to
   `bg-header`), so they are that one row, not a second one under Side panel. The side panel itself,
   menus and tooltips hang on Content, not on Frame.
3. **All tokens** — all the web UI's variables, with a filter, grouped as the web UI says they are
   (a part's own colors under the part, the rest by kind: surfaces, hover, selection…). A token set by hand keeps its
   value (orange dot) whatever the roles do; click the dot to let it follow again.

The **preview** is the web UI in six scenes (Workspace, Explorer, New tab, Dialogs, Status,
Sign-in) drawn with the same variables the real components read.
Click any part of it to open that part's color. The contrast checks below it open the color
they measure.

**Save** keeps the theme **in this browser** (*My themes · this browser* in the
start list); its **▾** has **Save as new
theme**. **Use this theme** saves it and switches the web UI to it, with an **Undo** back to the theme
before. A start left as it is (nothing changed, its name as given) is not saved again: **Use this
theme** switches to it as it is — Dark, the preset (`{ pkg: 'neo-pkg-theme-builder', stylesheet:
'presets/….css', version }`), yours — and Save waits for a change. **CSS ▾** has Import CSS and Export CSS.

The themes are the browser's, not an account's: whoever signs in on it sees and chooses the same
ones, and they are not on the server — so nobody on another browser can change them, and they are in
this browser only. Export CSS and Import CSS move one to another browser.

Changing a color moves only what it names:

- **A color follows the parent it shows** ("same as Layer", "auto") and nothing else. A preset's touches
  are kept as the step it took from that parent, so a preset opened unchanged is the preset.
- **A part changes on its own.** GNB, Tab bar, Side panel, Console, Tables, Inputs, Dialogs, Menus,
  Tooltips each move only their own part. Frame is the frame's bars (GNB, tab bar, console header, the side
  panel's section bars); Content is what sits inside (editors, pages, the side panel, and through Layer
  the tables, inputs, dialogs and menus).
- **One thing, one color.** Inputs colors every input, Menus every open list or menu, Dialogs every
  dialog, Tables every table — whichever component draws it (the web UI names the part's token first
  everywhere). The older twins are written from the same color: a hovered option in an open list
  is Menus' *Hover background*, a select's chevron is Inputs' *Icons*.
- **Shared colors that only look alike stay apart.** A shared token the start tuned is kept close to the
  shared color it matches only when they are the same kind (text with text, fills with fills, signals
  with signals) and hang on the same basics: Cyberpunk's hint text is cyan like its accent, but it is
  text, so it stays when the accent changes (change it under *Text*); a hover background is never tied
  to an icon color or a status dot, however alike.
- **File icons are only as deep as the theme needs.** On a dark theme they are the Material colors. On a
  light one each keeps its Material color and is deepened only until it reads 1.5:1 on the theme's own side
  panel and its selected row, tab bar, content, raised cards and dialogs (the file's name is beside it); a
  yellow leans to amber as it deepens, where a deeper yellow would go olive. The light presets carry theirs;
  changing a surface works them out again; one you set yourself under *File icons* stays.
- **Hover is one category.** *Hover* (Surfaces) is what the pointer does on the content; every part's
  hover background (a GNB icon, a tab, a side panel row, a console button, a table row, a menu item)
  is the same step over that part's own background, so changing Hover moves them all and each still sits
  on its own color. A part's hover the start tuned apart — another hue, like Cyberpunk's red tab hover
  beside its cyan Hover — is that part's own: it keeps its step from its background and Hover leaves it.

## How it plugs into the web UI

`package.json` declares a theme package whose themes are the presets, listed in an index:

```json
"neoTheme": { "label": "Theme Builder", "index": "themes.json" }
```

so the web UI treats it as a theme package with an app (no Start/Stop in the App Store). The web UI's
Settings menu has no Theme item in this version: themes are chosen here, and the item comes back once
packages can add to it.

**The builder owns the theme state** (`theme-store.js`; the format is [contract/state-v1.md](contract/state-v1.md)).
It is the one page that writes it; the web UI and every package's app only read it:

| Key | What | Readers |
| --- | --- | --- |
| `neo.theme.state` | The theme in use: `{ v: 1, owner, scheme, theme: { pkg, stylesheet, label }, set, resolved, tokens, loginImage?, at }`. `set` is what the theme sets, `resolved` every token's final value (its own, its fallback's, or the dark default, over the token list). No key: Dark. | the web UI (wears `set`), theme-sync (puts `resolved` on an app) |
| `neo-theme-builder.themes` | The user's themes `[{ id, label, scheme, css, swatch, note, roles, pinned, loginImage?, saved }]`. Taken over once from `neo.themes`, where the web UI kept them before. | the builder |
| IndexedDB `neo-theme` → `pictures` | Sign-in pictures, key = the theme's id. | the builder; the web UI's sign-in page, for the one `loginImage` names |

Writing the state is the whole notification: the browser fires `storage` in every other page of the
origin. The builder's own page gets none for its own write, so after one it calls
`neoThemeSync.refresh()` itself (`worn` in builder.js). What is read back is checked again (names,
values that cannot leave a declaration, the entry's shape): storage is anyone's to edit. Deleting
the theme in use takes the state back to Dark. A save that cannot be kept — an unusable entry, the
browser's storage full — says why; Export CSS keeps a copy. An uninstall cannot reach a browser's
storage, so the web UI ignores a state whose owner is not installed any more.

A theme saved in the browser can have a picture for the sign-in page. It is the file itself (a
Blob), kept in IndexedDB before the entry is saved; the entry only says it has one (`loginImage: true`),
and the state of the theme in use names it (`loginImage: { picture: <id> }`) so the sign-in page can
read it. `readPicture` keeps the chosen file as it is when it is a WebP, PNG, JPEG, GIF or AVIF of at
most 10 MB and draws anything else (an SVG, a larger file) again as a WebP at most 1920 px on its
longer side. The preview's *Sign-in* scene shows it, or `login-default.webp` (the web UI's own
picture, made smaller) when there is none. A stylesheet sets the web UI's design tokens as CSS
variables (`--neo-<token>`) on `:root`; one it leaves out keeps the built-in dark value.

**The token list is this package's**: `tokens/theme-tokens.json`, a copy of what a neo-web release's
build writes from its token sources (`dist/theme-tokens.json`, also in the release's `web-ui.zip`),
with where it came from in `tokens/SOURCE`. `node scripts/build.js` makes the builder's copy
(`generated/builder-tokens.js`) and theme-sync (`sync/v1/theme-sync.js`) from it; both are committed,
since the package installs as its repository is at the release tag. Nothing is read from the server,
and `minServerVersion` is the machbase-neo whose web UI carries that token list.

## Parts of the screen and `impact.json`

The web UI gives each part its own tokens (`--neo-gnb-bg`, `--neo-side-text`, `--neo-field-bg`…,
neo-web `tokens/_colors.scss`, *Areas*), each falling back to the shared token the part drew with
before — so a theme that sets none of them, an older one included, looks as it did. The builder
reads a part as it shows (its token, else what it falls back to, `AREA_FALLBACK` in
theme-core.js) and writes a part's tokens only when the part changes — or when what it falls
back to moved and the fallback would no longer show the part as it was.

### Adding a part

A part's colors take their names from one list, so a new part needs no new words: **Background**,
**Header**, **Text**, **Sub text**, **Icons**, **Active icon**, **Active indicator**, **Hover background**,
**Selected row** (a console's **Selected line**), **Border**, **Disabled background**. A name of its own
only for something no other part has — a dialog's **Title**, the console's **Log
lines** and **Tab names**, a table's **Header text**, **Row numbers** and **Striped rows**, the tab bar's **Active tab
text / background** and **Inactive tab text** (test: *a part's colors are named from the one list*).

A part has **text of its own only where its ground can be the other brightness** from the page's
(the GNB, the tab bar, the side panel, the console, tooltips) or for a kind of text no shared token is
(a dialog's title, a table's column names). A part that sits on a layer of the page's brightness —
dialogs, menus, inputs, tables — writes in the shared text, so a new kind of text there needs no new
token; the contrast checks say when a theme's ground for it stops the shared text reading.

1. neo-web: the part's tokens in `tokens/_colors.scss`, *Areas* (`$x: themed(x, $the-shared-one)`),
   their kind in `tokenKinds.ts`, a reset in `_darkIsland.scss`, a row in the tokens README (in
   declaration order), and the component drawing with them.
2. theme-core.js: the part in `PART_GROUPS` and `ROLE_GROUPS`, a role per token (`group` = the part,
   `label` from the list above, `follow` the shared color it is, or `auto`), the token in `derive`.
   `AREA_FALLBACK` comes from the token list (`tokens/theme-tokens.json`).
3. The preview: draw it in a scene with `data-role` — every role is drawn somewhere (test), and a
   shared color in a scene is listed in `SHARED` with where the web UI paints it there.
4. The token list: `node scripts/tokens.js <neo-web dist/theme-tokens.json> "neo-web <release>"`,
   then `node scripts/build.js`; the Versions table in the README gets a row.

`impact.json` is where each token is drawn: `{ "tokens": { "<token>": [["<place>", <count>], …] } }`.
It is measured, not written: a canary run of the web UI's visual measurer gives every token its
own color over all 269 screen states, and `impactmap.mjs` (neo-web-regress,
`tests/support/measure/`) counts, per token, the elements each part of the screen draws in it.
Re-measure it when the web UI moves colors between tokens. Without it, roles still list their
parts, only not the "also" places.

## Themes in other packages' apps: theme-sync

An app tab is a page of its own (an iframe): the web UI's `--neo-*` do not reach it. The builder
serves the one file an app loads to wear the theme: `/public/neo-pkg-theme-builder/cgi-bin/theme/v1/sync`
(`cgi-bin/theme/v1/sync.js` sends `sync/v1/theme-sync.js` with `Content-Length` and
`Cache-Control: public, max-age=300`). Before the first paint it puts every token on the app's `<html>`
— `resolved` from the state, or the dark defaults — with `data-neo-scheme` and `color-scheme`; it
reads again on `storage` and whenever the tab comes back to the front (a tab behind others may not get
the storage event in WebKit), and fires `neo-theme-change` when anything moved. The builder's own
page loads it too.

What an app may count on is [contract/theme-v1.md](contract/theme-v1.md) (the tokens it promises:
`contract/theme-v1.tokens`). `example/` is how to use it, which token is for what, the rules and a page
drawn that way ([example/README.md](example/README.md)); `test/example.test.js` keeps that page to the
rules.

The source is `sync/theme-sync.src.js` (plain ES5, ASCII — the cgi script's `Content-Length` is its
length); `scripts/build.js` writes the dark defaults in. A change an app could notice is a contract
change: within v1 only additions (`revision`), and a break is v2 beside it (`cgi-bin/theme/v2/`).

## Tests

```sh
node scripts/build.js --check      # the committed generated files are up to date
node --test test/*.test.js
```

`preview.test.js` keeps the preview true to the web UI: a scene's part may take a shared color
(Layer, Accent, Error…) only when it is listed in `SHARED` with where the web UI paints it in that
place — a chart bound to Accent once sent a click on a dashboard chart to the color of every button,
while the web UI draws a dashboard panel in its own chart theme. The preview's scenes are divided by
what they show of the parts, not by feature: the side panel's lists (DB explorer, packages) share one
scene, Explorer.
A part's own colors (GNB … Tooltips) need no listing.
