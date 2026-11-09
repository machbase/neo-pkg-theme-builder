---
title: Theme Builder Technical Documentation
weight: 10
---

The Theme Builder package lets you make your own color theme for the Machbase Neo web UI, with a live preview, and switch to it in one click.

Start from the built-in Dark or from one of the presets that come with the package: **Light**, **Cyberpunk**, **Aemeath** and **Cement 98**. The presets can also be used as they are: they are listed in **Settings → Theme** once the package is installed.

## Installation

The App Store on the left bar of Machbase Neo lists the available packages.  
Select the Theme Builder package (`neo-pkg-theme-builder`) and press the `Install` button.

Installation may take a short time, so wait until it is completed.

{{< shot src="images/package-install.png" alt="The Theme Builder package in the package list" width="262" >}}

### Requirements

- Machbase Neo 8.7.4 or later

### Uninstall

Select `neo-pkg-theme-builder` in the left panel and press **Uninstall**. If a preset was the theme in use, the web UI returns to Dark. The themes you made stay in the browser; delete them in **Settings → Theme**.

## Presets

| Dark | Light |
| :--- | :--- |
| ![The New tab in Dark](/images/newtab-dark.png) | ![The New tab in Light](/images/newtab-light.png) |
| **Cyberpunk** | **Aemeath** |
| ![The New tab in Cyberpunk](/images/newtab-cyberpunk.png) | ![The New tab in Aemeath](/images/newtab-aemeath.png) |
| **Cement 98** | |
| ![The New tab in Cement 98](/images/newtab-cement98.png) | |

## What This Documentation Covers

- Installing the package
- Opening Theme Builder and choosing a starting theme
- Setting the basic colors and customizing single parts
- Checking the result in the preview and the contrast checks
- Cursor effect, sign-in picture and individual tokens
- Saving a theme, switching themes and moving a theme to another browser

## Basic Workflow

1. Install the Theme Builder package from the App Store.
2. Open **Settings → Theme → Open Theme Builder**.
3. Choose a theme in **Start from** and give your theme a name.
4. Set the basic colors in **Colors**.
5. Under **Using it**, customize the parts that should differ.
6. Check each scene in the preview and the contrast checks under it.
7. Press **Use this theme** to save the theme and switch to it.

## Screen Layout

- Top bar
  - Theme name
  - CSS (Import CSS, Export CSS)
  - Save and Save as new theme
  - Use this theme
- Left panel
  - Start from
  - Colors
  - Cursor effect
  - Sign-in page
  - All tokens
- Right side
  - Scene tabs
  - Preview
  - Contrast checks

![The Theme Builder screen](/images/builder-overview.png)

## Documents

| Document | Contents |
| :--- | :--- |
| [Getting Started]({{< relref "getting-started" >}}) | **Start here** — opening Theme Builder · choosing a starting theme · naming your theme |
| [Colors]({{< relref "colors" >}}) | Basic colors · color groups · customizing one part · light or dark |
| [Preview]({{< relref "preview" >}}) | Six scenes · seeing what a color paints · contrast checks |
| [Cursor, Sign-in Page and Tokens]({{< relref "cursor-sign-in-and-tokens" >}}) | Cursor effect · sign-in picture · all tokens |
| [Save and Use]({{< relref "save-and-use" >}}) | Use this theme · Save · switching themes · moving a theme to another browser |
| [Release Notes]({{< relref "release-notes" >}}) | Changes in each version |

## Navigation

- [Next: Getting Started]({{< relref "getting-started" >}})
