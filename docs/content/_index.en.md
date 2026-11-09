---
title: Theme Builder
weight: 10
---

Make your own color theme for the machbase-neo web UI — with a live preview — and switch to it in
one click. Start from the built-in Dark or from one of the presets that come with the package:
**Light**, **Cyberpunk**, **Aemeath** and **Cement 98**. The presets can also be used as they are:
they are listed in **Settings → Theme** once the package is installed.

| Dark | Light |
| --- | --- |
| ![The New tab in Dark]({{< asset "images/newtab-dark.png" >}}) | ![The New tab in Light]({{< asset "images/newtab-light.png" >}}) |
| **Cyberpunk** | **Aemeath** |
| ![The New tab in Cyberpunk]({{< asset "images/newtab-cyberpunk.png" >}}) | ![The New tab in Aemeath]({{< asset "images/newtab-aemeath.png" >}}) |
| **Cement 98** | |
| ![The New tab in Cement 98]({{< asset "images/newtab-cement98.png" >}}) | |

Requires machbase-neo 8.7.2 or later.

## Open it

After installing the package from the App Store, open **Settings** (the gear at the bottom of the
left bar) → **Theme** → **Open Theme Builder**. You can also open the package from the PACKAGES list.

{{< shot src="images/settings-menu.png" alt="The Settings menu with Theme highlighted" width="230" >}}

{{< shot src="images/theme-dialog.png" alt="The Theme dialog with the Open Theme Builder button" width="480" >}}

## Make a theme

{{< shot src="images/builder-overview.png" alt="Theme Builder: the steps on the left, the live preview on the right" >}}

1. **Start from** a theme: the one you are using now, Dark, a preset, or one of your own themes.
   The presets themselves never change — what you save, once you change something, is your copy.

   {{< shot src="images/start-from.png" alt="The Start from section with Dark and the four presets" width="400" >}}

2. **Colors** — begin with the basics: **Frame** (the bars around the workspace), **Content**
   (the page inside each tab — editors, results, the New tab), **Text**, **Accent**, **Borders** (every line — dividers and the outlines of
   cards, menus, dialogs and inputs), and the two state colors **Hover** (what the pointer is over)
   and **Selection** (the selected row). Everything else follows them, so these already give you a
   whole theme. An input you are typing in, or a button reached with Tab, is outlined in the
   **Focus outline** color, which follows Accent.

   {{< shot src="images/colors-basics.png" alt="The basic colors of an example theme" width="390" >}}

3. Then adjust what you want to stand out:
   - **The groups under the basics** — **Surfaces** (Layer: cards, dialogs, menus), **Text** (Sub text,
     Icons, Text on color), **Controls** (Scrollbar) and **Signals** (Success, Warning, Error, Info, the
     Neutral gray, and their text). Change one and every part of the screen using it follows: Hover
     moves every hover at once.
   - **Using it** — under each shared color, everything that is that color: the parts of the screen
     (the left bar, the tab bar and its open tab, the side panel, the console, tables, inputs, dialogs,
     menus, tooltips) and the shared colors that simply follow it (*Section headers* under Frame,
     *Drawers* under Content, *Primary button* and *Focus outline* under Accent). Each follows its color
     until you **Customize** it; then nothing else changes it, and **Use \<color\>** lets it follow
     again. The table's hover, say, can differ from every other hover.

   {{< shot src="images/using-it.png" alt="Using it under Hover, with the table's hover customized" width="383" >}}

   Under each shared color the builder tells you where it shows (*Tab bar · Console…*; the whole
   list when you point at it), and every part's row what it follows. A basic color's row also lists
   the shared colors that change with it (*Moves: Primary button · Focus outline…* under Accent), and a worked-out
   color says where it comes from (*from Content*). **Selection** (the selected row) and the
   success / warning / error / info colors are colors of their own: changing Accent or Content leaves them. When the theme you started from
   draws a part as a shade of that color, the row says so (*follows Accent · darker, as Light has it*).
   A background never changes a text color: change **Content** to a light color and the text stays
   as it is until you change **Text** — the contrast checks under the preview say what no longer reads.

   {{< shot src="images/contrast-checks.png" alt="The contrast checks after making Content light: the text that no longer reads is marked LOW" >}}

4. **Watch the preview.** Six scenes, each the web UI drawn in your colors: **Workspace** (the
   left bar, tabs, side panel, editor, results, console), **Explorer** (the side panel's lists — the
   DB explorer and the packages — and a table's page), **New tab** (with Customize open: its Widgets panel is a drawer), **Dialogs** (a dialog over its
   backdrop, inputs, buttons, a menu, a tooltip), **Status** (badges, status dots, messages, notices,
   log levels, a tab that failed to draw, a toast) and **Sign-in**. Each tab says
   how many colors it holds.

   | Workspace | Explorer |
   | --- | --- |
   | {{< shot src="images/scene-work.png" alt="The Workspace scene" >}} | {{< shot src="images/scene-explorer.png" alt="The Explorer scene" >}} |
   | **New tab** | **Dialogs** |
   | {{< shot src="images/scene-newtab.png" alt="The New tab scene" >}} | {{< shot src="images/scene-dialogs.png" alt="The Dialogs scene" >}} |
   | **Status** | **Sign-in** |
   | {{< shot src="images/scene-status.png" alt="The Status scene" >}} | {{< shot src="images/scene-login.png" alt="The Sign-in scene" >}} |

   Point at a color's row and the preview shows a scene it is in, with
   the parts it paints outlined, and the tabs of every scene it shows in light up. Click any part of the
   preview to jump to its color. The contrast checks under the preview warn you when text becomes
   hard to read.

   {{< shot src="images/preview-outline.png" alt="Pointing at Accent: the parts it paints are outlined and the scene tabs light up" >}}

5. **Sign-in page** — **Choose a picture…** puts your own picture behind the sign-in box; the
   *Sign-in* tab of the preview shows it. The picture is kept with the theme as it is (an SVG,
   or a file over 10 MB, is made into a WebP at most 1920 px wide). **Use the web UI's picture**
   takes it away again.

   {{< shot src="images/sign-in-page.png" alt="A chosen picture in the Sign-in page section and in the Sign-in scene" >}}

6. **All tokens** lists every color the web UI has, for when you want one exact value; point at
   one and the preview outlines what it paints, as it does for a color's row.
   **Cursor effect** adds an optional pointer effect.

   {{< shot src="images/all-tokens.png" alt="All tokens filtered by the word accent" width="400" >}}

Light or dark — the look of the code editor, charts and terminal — follows your Content color by
itself. To make a light theme, starting from the Light preset is the quickest way.

## Save and use it

- **Use this theme** saves it and switches the web UI to it right away. **Undo** takes you back.
  With nothing changed it switches to the theme you started from as it is — Dark, the preset, or
  your theme — and saves no copy.

  {{< shot src="images/use-this-theme.png" alt="The message after Use this theme, with Undo" width="451" >}}

- **Save** keeps it without switching; **Save ▾ → Save as new theme** keeps a second version. Both
  wait until you change something: a preset as it is needs no copy.

  {{< shot src="images/save-menu.png" alt="The Save menu with Save as new theme" width="317" >}}

- Switch at any time in **Settings → Theme**: Dark and the presets are under *Ready to use*, your
  themes under *My themes*. Each card shows the colors of that theme; **Edit** (the pencil) on one of
  yours opens it here.

  {{< shot src="images/theme-dialog-my-themes.png" alt="The Theme dialog with a saved theme in use under My themes" width="480" >}}

Your themes are kept **in this browser** — the browser's, whoever signs in on it — not on the server.
The sign-in page shows the theme chosen in this browser, and its picture. To take a theme
to another browser or computer, use **CSS ▾ → Export CSS** and then **Import CSS** there — the CSS
carries the colors; choose the sign-in picture there again.

{{< shot src="images/css-menu.png" alt="The CSS menu with Import CSS and Export CSS" width="404" >}}
