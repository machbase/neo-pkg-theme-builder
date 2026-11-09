---
title: Colors
weight: 30
---

Begin with the basic colors, then adjust what you want to stand out.

## Basic Colors

- **Frame**: the bars around the workspace
- **Content**: the page inside each tab — editors, results, the New tab
- **Text**: the main text in every part
- **Accent**: the active indicators, Primary buttons, links and focus outlines follow it
- **Borders**: every line — dividers and the outlines of cards, menus, dialogs and inputs
- **Hover**: what the pointer is over
- **Selection**: the selected row

Everything else follows them, so these already give you a whole theme. An input you are typing in, or a button reached with Tab, is outlined in the **Focus outline** color, which follows Accent.

{{< shot src="images/colors-basics.png" alt="The basic colors of an example theme" width="390" >}}

## Color Groups

The groups under the basics hold the other shared colors. Change one and every part of the screen using it follows: Hover moves every hover at once.

- **Surfaces**: Layer (cards, dialogs, menus)
- **Text**: Sub text, Icons, Text on color
- **Controls**: Scrollbar
- **Signals**: Success, Warning, Error, Info, the Neutral gray, and their text

## Customize One Part

**Using it**, under each shared color, lists everything that is that color: the parts of the screen (the left bar, the tab bar and its open tab, the side panel, the console, tables, inputs, dialogs, menus, tooltips) and the shared colors that simply follow it (*Section headers* under Frame, *Drawers* under Content, *Primary button* and *Focus outline* under Accent).

Each follows its color until you **Customize** it; then nothing else changes it, and **Use \<color\>** lets it follow again. The table's hover, say, can differ from every other hover.

{{< shot src="images/using-it.png" alt="Using it under Hover, with the table's hover customized" width="383" >}}

## Where a Color Shows

Under each shared color the builder tells you where it shows (*Tab bar · Console…*; the whole list when you point at it), and every part's row what it follows.

- A basic color's row also lists the shared colors that change with it (*Moves: Primary button · Focus outline…* under Accent).
- A worked-out color says where it comes from (*from Content*).
- When the theme you started from draws a part as a shade of that color, the row says so (*follows Accent · darker, as Light has it*).

**Selection** (the selected row) and the success / warning / error / info colors are colors of their own: changing Accent or Content leaves them.

## Light or Dark

The look of the code editor, charts and terminal — light or dark — follows your Content color by itself. To make a light theme, starting from the Light preset is the quickest way.

A background never changes a text color: change **Content** to a light color and the text stays as it is until you change **Text**. The contrast checks under the preview say what no longer reads.

## Navigation

- [Previous: Getting Started]({{< relref "getting-started" >}})
- [Back to Index]({{< relref "/" >}})
- [Next: Preview]({{< relref "preview" >}})
