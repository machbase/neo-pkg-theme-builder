# The theme contract v1 — what a package's app may count on

[한국어 안내](../example/README.ko.md) · [English guide](../example/README.md)

An app that loads theme-sync draws in the theme the web UI wears. This file is the whole promise
between the Theme Builder and such an app; anything not written here may change in any release.

## Promised

| | |
| --- | --- |
| **Loading** | `<script src="/public/neo-pkg-theme-builder/cgi-bin/theme/v1/sync"></script>` in `<head>`, after the app's stylesheets, as a plain script (not `defer`, `async` or `type="module"`). It works in an app tab, a side panel (`side.html`) and a tab of its own. |
| **Tokens** | Every token in [theme-v1.tokens](theme-v1.tokens) (112) has a value on the page's `<html>` as `--neo-<token>` before the first paint, whatever the theme — with no theme, the web UI's dark default. A token renamed in the web UI keeps its old name here while v1 lasts. |
| **Scheme** | `<html data-neo-scheme="light">` or `"dark"`, and `color-scheme` set to the same. |
| **Changes** | When the values change, they are put on and then `neo-theme-change` fires on `window` with `detail: { scheme, vars }` (`vars`: every token's value by name, without the prefix). |
| **API** | `window.neoThemeSync = { contract: 1, revision, refresh(), onChange(fn) }`. `onChange` calls `fn(detail)` after each change and returns the function that stops it. |
| **Read only** | The script writes no storage and asks the web UI for nothing. |

## Not promised

- The web UI's own frame tokens (`gnb-*`, `tabbar-*`, `console-*`, `sub-tab-active-bg`) and
  `fx-cursor`: set too, but they may go.
- How values are written (`#fff`, `rgb(…)`, a shadow's form).
- How many change events come, or whether one comes for the first paint: read the values yourself
  when the app starts.
- Where the theme is kept, how the final colours are worked out, which package serves the script and
  what else is in it.
- Anything in another origin (a dev server): there the page gets the dark defaults.

## Versions

- **`revision`** grows when v1 gains something an app may test for; nothing promised above is taken
  away within v1.
- A change that would break the promise is **v2**, at `/cgi-bin/theme/v2/sync`; v1 keeps being served
  beside it, as a layer over v2, until no app needs it. When v1 ends, its address answers with a
  script that only says so in the console.
- The Theme Builder's package version is not the contract's: many releases are v1.
- An app needing v1 says so in its README: "Theme Builder 1.1.0 or later".
