# The theme state v1 — what the web UI reads

The Theme Builder is the one writer of the theme state; the web UI reads it to wear the theme
(including on its sign-in page), and theme-sync reads it for an app. This file is the promise to the
web UI.

## Where

`localStorage["neo.theme.state"]` on the web UI's origin. No key: no theme — the dark defaults.
Writing the key is the notification: the browser fires `storage` in every other page of the origin.

## What

```js
{
  v: 1,                                   // this format; a reader ignores any other value
  owner: "neo-pkg-theme-builder",         // the package that wrote it (/public/<owner>/)
  scheme: "light" | "dark",
  theme: { pkg, stylesheet, label },      // what was chosen: a preset of the owner, or "@local" and "<id>.css"
  set: { "<token>": "<value>", … },       // the values the theme sets
  resolved: { "<token>": "<value>", … },  // every token's final value (the theme's, its fallback's, or the dark default)
  tokens: "neo-web v8.9.0",               // the token list `resolved` was worked out with
  loginImage?: { picture: "<id>" },       // a sign-in picture: IndexedDB "neo-theme", store "pictures", key <id>
  at: 1764000000000                       // when it was written (ms)
}
```

Token names are `--neo-*` names without the prefix (`/^[a-z0-9]+(-[a-z0-9]+)*$/`); a value is at most
200 characters with none of `; { } < > \`. A reader drops anything else: storage is anyone's to edit.

## How the web UI reads it

- Only in experiment mode (`experimentMode` is `true`); otherwise the dark defaults.
- It wears **`set`** and `scheme`; its own CSS fills every other token (its `var()` fallbacks). So the
  web UI's screen is right whatever token list the Theme Builder used for `resolved`.
- When `/public/<owner>/package.json` is not there (the Theme Builder was removed — an uninstall cannot
  reach a browser's storage), it ignores the state and shows the dark defaults.

## Versions

A change a reader of v1 could not read is `v: 2`; the Theme Builder then writes what the web UI it runs
on reads, and the web UI says in its release notes which versions it reads.
