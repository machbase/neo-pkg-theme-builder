// node --test test/preview.test.js
//
// The preview stands for the web UI: a click on any part of it opens the color that paints that part
// there. So a part of a scene may take a color role only when the web UI paints it with that role's
// token in that place — a dashboard chart bound to Accent sent a click on a chart to the color of
// every button and link, while the web UI draws the chart in the panel's own colors.
//
//   - a part's own color (GNB, Tab bar, …, Tooltips) is that part's wherever it shows;
//   - a shared color in a scene is listed below with where the web UI paints it there.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../theme-core.js');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'main.html'), 'utf8');

/** Each scene's markup, from its `data-scene-of` to the next. */
function scenes() {
    const at = [...HTML.matchAll(/data-scene-of="([a-z]+)"/g)].map((m) => [m[1], m.index]);
    return at.map(([name, start], i) => [name, HTML.slice(start, i + 1 < at.length ? at[i + 1][1] : HTML.length)]);
}

// scene → shared role → where the web UI paints it with that role's token there
const SHARED = {
    work: {
        header: 'the side panel\'s section bars — OPEN EDITORS, EXPLORER (Side: side-header-bg, which is Section headers\' bg-header)',
        surface: 'the editor and its result area (bg-secondary)',
        icon: 'the editor toolbar\'s icon buttons (text-icon)',
        toolbarHover: 'an editor toolbar button under the pointer (toolbar-hover-bg)',
        activeBg: 'an editor toolbar button that is switched on (active-bg)',
        ink: 'the chosen result sub-tab',
        muted: 'the other sub-tabs and the result meta line',
        scrollbar: 'the editor\'s scrollbar thumb',
        successText: 'the INFO level in a log line (logLevelColor: -text)',
        warningText: 'the WARN level in a log line',
        errorText: 'the ERROR level in a log line',
    },
    explorer: {
        header: 'the side panel\'s DB EXPLORER and PACKAGES bars (Side: side-header-bg, which is Section headers\' bg-header)',
        surface: 'the table page (bg-secondary)',
        ink: 'the table page\'s title, names and values; a package\'s button labels',
        link: 'where a package installs from (accent-text)',
        accent: 'the selected package\'s bar (AppStore item.scss .app-store-row--selected: accent-main) and the installed version chip (span.install: accent-main)',
        button: 'Install (button-primary-bg)',
        onAccent: 'labels on Install, the installed version and the update chip',
        warning: 'the update chip (warning-main)',
        neutralButton: 'a package\'s version chip (AppStore item.scss: neutral-main)',
    },
    newtab: {
        header: 'the side panel\'s section bars — OPEN EDITORS, EXPLORER (Side: side-header-bg, which is Section headers\' bg-header)',
        surface: 'the New tab page (Page: bg-secondary)',
        ink: 'card titles and figures; the Widgets panel\'s title and widget names',
        muted: 'the metric codes, Cancel\'s label (a secondary Button: text-muted), the Widgets panel\'s group names (.nb-panel-cat) and its search placeholder',
        raised: 'the server-pulse and "make" cards ($nb-surface = bg-elevated), and the widgets in the Widgets panel (.nb-panel-item)',
        accent: 'the server-pulse sparklines — rows appended, CPU, memory (serverMetrics.ts PULSE_METRICS: accent-light, which follows Accent)',
        button: '"Open as dashboard" and Done (button-primary-bg)',
        onAccent: 'their labels',
        panel: 'the Widgets panel Customize opens beside the page (WidgetPanel .nb-panel: bg-panel)',
    },
    dialogs: {
        surface: 'the page behind the backdrop',
        ink: 'the dialog\'s words — field labels, choices, the switch\'s note — and the menu\'s items: the page\'s text (text-primary)',
        muted: 'a field\'s placeholder; the labels of Browse and Cancel (secondary Buttons: text-muted)',
        icon: 'the help icon by a label',
        disabled: 'a disabled choice',
        focus: 'the chosen option\'s ring (border-color-focus)',
        link: 'a link in the dialog (accent-text)',
        button: 'Save (button-primary-bg)',
        accent: 'a switch turned on (accent-main)',
        listHover: 'a folding section\'s header under the pointer (Page.Collapse: list-hover-bg)',
        delete: 'Uninstall (button-danger-bg)',
        onAccent: 'labels on Save and Uninstall',
    },
    status: {
        surface: 'the page',
        ink: 'state names and message text; the failed tab\'s title',
        muted: 'section labels; Close tab\'s label (a secondary Button)',
        success: 'the Running badge and a repeat count (success-main)',
        warning: 'the Update badge, a notice, a repeat count (warning-main)',
        error: 'the Failed badge, an error notice, a repeat count (error-main)',
        info: 'the New badge (info-main)',
        neutralButton: 'a neutral badge (StatusIndicator --neutral: neutral-main)',
        highlight: 'a search match (event-match-main)',
        onAccent: 'labels on filled badges and on Retry',
        canvas: 'a tab that failed to draw (ErrorBoundary .fallback--tab: bg-canvas)',
        button: 'Retry on the failed tab (a primary Button: button-primary-bg)',
        successText: 'a running dot, a success message, the INFO level',
        warningText: 'a warning message, the Unsaved notice title, the WARN level',
        errorText: 'a stopped dot, an error message and notice title, the ERROR level',
        statusNone: 'an unknown state\'s dot (status-none)',
        link: 'a link in a message (accent-text)',
        raised: 'a toast (bg-elevated)',
        scrollbar: 'a page scrollbar thumb',
    },
    login: {
        raised: 'the sign-in box (Login.scss: bg-elevated)',
        muted: 'the user and password placeholders',
        ink: '"Remember User ID"',
        button: 'SIGN IN (button-primary-bg)',
        onAccent: 'its label',
    },
};

test('a shared color in a scene is listed with where the web UI paints it there; a part\'s own color is that part\'s', () => {
    const used = new Set();
    for (const [scene, markup] of scenes()) {
        for (const m of markup.matchAll(/data-role="([A-Za-z]+)"/g)) {
            const role = C.ROLE[m[1]];
            assert.ok(role, scene + ': ' + m[1] + ' is no color role');
            if (C.PART_GROUPS.includes(role.group)) continue;
            const why = SHARED[scene] && SHARED[scene][m[1]];
            assert.ok(why, scene + ': ' + m[1] + ' (' + role.token + ') is a shared color — say where the web UI paints it in this scene, or bind the part to its own color');
            used.add(scene + ' ' + m[1]);
        }
    }
    for (const scene of Object.keys(SHARED)) for (const role of Object.keys(SHARED[scene])) assert.ok(used.has(scene + ' ' + role), scene + ' ' + role + ' is listed but no longer used');
});

// A package's name in the side panel is the side panel's text, as the explorers' names are (neo-web item.scss).
test('the package names in the side panel are the side panel\'s text', () => {
    const names = [...HTML.matchAll(/<span class="pv-pkg-top"><b data-role="([^"]+)">/g)].map((m) => m[1]);
    assert.equal(names.length, 3);
    assert.deepEqual([...new Set(names)], ['sideText']);
});
test('the console\'s Background is its log body, not the box around its header', () => {
    const box = /<div class="pv-console"([^>]*)>\s*<div class="pv-ch" data-role="consoleBg">/.exec(HTML);
    assert.ok(box, 'the console starts with its header');
    assert.doesNotMatch(box[1], /data-role/, 'the box holding the header takes no color');
    assert.match(HTML, /<div class="pv-cbody" data-role="consoleBodyBg">/);
});
// A color you can set is one you can see: every role is drawn in some scene, so pointing at it shows it.
test('every color role is drawn somewhere in the preview', () => {
    const roles = new Set([...HTML.matchAll(/data-role="([A-Za-z]+)"/g)].map((m) => m[1]));
    const tokens = new Set([...HTML.matchAll(/data-token="([a-z0-9-]+)"/g)].map((m) => m[1]));
    // drawn itself, as its token, or through a color that follows it (Frame is the GNB, the tab bar…)
    const drawn = (d) => roles.has(d.key) || tokens.has(d.token) || C.descendantsOf(d.key).some((k) => roles.has(k.key));
    const missing = C.ROLES.filter((d) => !drawn(d)).map((d) => d.key);
    assert.deepEqual(missing, [], 'not drawn in any scene: ' + missing.join(', '));
});
// A line drawn on a part's edge is its own element: the Active indicator outlines the line, not the icon by it.
test('the GNB\'s active indicator is the line, not the icon beside it', () => {
    const items = [...HTML.matchAll(/<span class="pv-ri on"([^>]*)>(.*?)<\/span>/g)];
    assert.equal(items.length, 3);
    for (const [, attrs, inner] of items) {
        assert.doesNotMatch(attrs, /data-role/, 'the active item takes no color of its own');
        assert.match(inner, /<i class="pv-ri-line" data-role="gnbMarker"><\/i>/);
    }
});
