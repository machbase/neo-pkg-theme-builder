/*
 * theme-core.js — the theme builder's arithmetic, with no DOM: colors, the eight seed colors,
 * what they derive, the stylesheet a theme is saved as and reading one back.
 *
 * Loaded by main.html (window.ThemeCore) and by the tests (require).
 */
(function (aRoot, aFactory) {
    if (typeof module === 'object' && module.exports) module.exports = aFactory();
    else aRoot.ThemeCore = aFactory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // ---- colors -------------------------------------------------------------------------

    /** [r, g, b, a] of `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()` or `rgba()`; null for anything else. */
    function parseColor(aValue) {
        var c = String(aValue == null ? '' : aValue).trim();
        var m = /^#([0-9a-f]{3,8})$/i.exec(c);
        if (m) {
            var h = m[1];
            if (h.length === 3 || h.length === 4) h = h.split('').map(function (x) { return x + x; }).join('');
            if (h.length !== 6 && h.length !== 8) return null;
            return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1];
        }
        m = /^rgba?\(([^)]+)\)$/i.exec(c);
        if (m) {
            var p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
            if (p.length < 3 || p.some(isNaN)) return null;
            return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
        }
        return null;
    }

    function hex2(n) {
        n = Math.max(0, Math.min(255, Math.round(n)));
        return (n < 16 ? '0' : '') + n.toString(16);
    }

    /** `#rrggbb`, alpha dropped. */
    function toHex(aValue) {
        var p = parseColor(aValue);
        return p ? '#' + hex2(p[0]) + hex2(p[1]) + hex2(p[2]) : null;
    }

    /** `aFrom` moved `aT` of the way to `aTo` (0 → aFrom, 1 → aTo), as `#rrggbb`. */
    function mix(aFrom, aTo, aT) {
        var x = parseColor(aFrom), y = parseColor(aTo);
        return '#' + hex2(x[0] + (y[0] - x[0]) * aT) + hex2(x[1] + (y[1] - x[1]) * aT) + hex2(x[2] + (y[2] - x[2]) * aT);
    }

    function rgba(aValue, aAlpha) {
        var p = parseColor(aValue);
        return 'rgba(' + Math.round(p[0]) + ', ' + Math.round(p[1]) + ', ' + Math.round(p[2]) + ', ' + aAlpha + ')';
    }

    /** A translucent color as it shows over `aUnder` (opaque). */
    function over(aValue, aUnder) {
        var p = parseColor(aValue);
        if (!p || p[3] >= 1) return toHex(aValue);
        return mix(aUnder, toHex(aValue), p[3]);
    }

    /** `aHex` with the alpha `aOld` had: a color picker gives opaque colors, a token may be translucent. */
    function keepAlpha(aHex, aOld) {
        var p = parseColor(aOld);
        return p && p[3] < 1 ? rgba(aHex, Math.round(p[3] * 100) / 100) : aHex;
    }

    function luminance(aValue) {
        var p = parseColor(toHex(aValue)).slice(0, 3).map(function (v) {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
    }

    /** WCAG contrast ratio of a text color on a background (translucent text is laid over it first). */
    function contrast(aText, aBackground) {
        var a = luminance(over(aText, aBackground)), b = luminance(aBackground);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    }

    // ---- OKLCH: lightness, chroma, hue — the space the relations below are kept in -------------

    function lin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
    function gam(c) { c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return c * 255; }
    function toOklch(aValue) {
        var p = parseColor(aValue);
        if (!p) return null;
        var r = lin(p[0]), g = lin(p[1]), b = lin(p[2]);
        var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
        var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
        var s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
        var L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
        var A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
        var B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
        return [L, Math.sqrt(A * A + B * B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360, p[3]];
    }
    function oklchToRgb(L, C, h) {
        var A = C * Math.cos(h * Math.PI / 180), B = C * Math.sin(h * Math.PI / 180);
        var l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
        var m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
        var s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3);
        return [gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), gam(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)];
    }
    /** `#rrggbb` of an OKLCH color, its chroma reduced until it fits sRGB. */
    function fromOklch(L, C, h) {
        L = Math.max(0, Math.min(1, L));
        var lo = 0, hi = Math.max(0, C), rgb = oklchToRgb(L, hi, h);
        var inside = function (c) { return c.every(function (v) { return v >= -0.5 && v <= 255.5; }); };
        if (!inside(rgb)) {
            for (var i = 0; i < 18; i++) {
                var mid = (lo + hi) / 2;
                if (inside(oklchToRgb(L, mid, h))) lo = mid;
                else hi = mid;
            }
            rgb = oklchToRgb(L, lo, h);
        }
        return '#' + rgb.map(hex2).join('');
    }
    /** How far apart two colors look (OKLCH, alpha ignored). */
    function distance(a, b) {
        var x = toOklch(a), y = toOklch(b);
        if (!x || !y) return Infinity;
        var dh = Math.abs(x[2] - y[2]); if (dh > 180) dh = 360 - dh;
        var hueWeight = Math.min(x[1], y[1]) / 0.1;
        return Math.sqrt(Math.pow(x[0] - y[0], 2) + Math.pow(x[1] - y[1], 2) + Math.pow(Math.min(1, hueWeight) * dh / 360, 2));
    }
    /**
     * What `aValue` is to `aBase`: the lightness step, the chroma ratio and the hue turn (or the hue
     * itself when the base has none), and its alpha. Applied to another base it gives the color
     * that stands to it the same way — how a tuned theme keeps its touches while its base moves.
     */
    function relation(aValue, aBase) {
        var v = toOklch(aValue), b = toOklch(aBase);
        if (!v || !b) return null;
        var gray = b[1] < 0.02;
        var dh = v[2] - b[2]; if (dh > 180) dh -= 360; if (dh < -180) dh += 360;
        // gg: a gray step of a gray base — it takes the base's color when the base gets one
        return { dL: v[0] - b[0], L: v[0], bL: b[0], cr: gray ? null : v[1] / b[1], c: v[1], dh: gray || v[1] < 0.02 ? null : dh, h: v[2], a: v[3], gg: gray && v[1] < 0.02 };
    }
    /**
     * The value's lightness over a new base: kept where it sat between the base and the end it was
     * toward (white above, black below), so a step never runs past white or black — a pale focus
     * ring over a bright new accent stays a step paler, not white.
     */
    function moveLightness(aRel, aBaseL) {
        if (aRel.L === undefined) return aBaseL + aRel.dL;
        if (aRel.L >= aRel.bL) return aRel.bL >= 1 ? aBaseL : aBaseL + (1 - aBaseL) * ((aRel.L - aRel.bL) / (1 - aRel.bL));
        return aRel.bL <= 0 ? aBaseL : aBaseL * (aRel.L / aRel.bL);
    }
    function applyRelation(aBase, aRel) {
        var b = toOklch(aBase);
        if (!b || !aRel) return aBase;
        var tint = aRel.gg && b[1] >= 0.02;
        var C = tint ? b[1] : aRel.cr === null || b[1] < 0.02 ? aRel.c : b[1] * aRel.cr;
        // a gray new base has no hue to turn from: the value keeps its own
        var h = tint ? b[2] : aRel.dh === null || b[1] < 0.02 ? (aRel.c < 0.02 ? b[2] : aRel.h) : b[2] + aRel.dh;
        var hex = fromOklch(moveLightness(aRel, b[0]), Math.min(C, 0.37), (h + 360) % 360);
        return aRel.a < 1 ? rgba(hex, Math.round(aRel.a * 1000) / 1000) : hex;
    }

    // ---- color roles ---------------------------------------------------------------------
    // A theme is made of roles: five basics and the parts that follow them until given their own
    // color (the Delete button follows Error, LOG tables follow Delete…). Each role says which
    // token it is read back from, what it follows (`follow`, shown as "= Accent") or how it is
    // worked out (`auto`), and where it shows. The order is the dependency order.

    function far(L) { return L ? '#000000' : '#ffffff'; }
    /** The page's end: what a quieter step of the text fades toward. Not Content, so Content moving leaves text be. */
    function back(L) { return L ? '#ffffff' : '#000000'; }
    /**
     * The ends text moves between, read from Text itself — light text fades toward black and is
     * strengthened toward white, dark text the other way — not from Content: a background never moves
     * a text color (changing Content leaves every text as it was; the contrast checks say when it no
     * longer reads).
     */
    function fadeOf(r) { var o = toOklch(r.ink); return o && o[0] < 0.5 ? '#ffffff' : '#000000'; }
    function strongOf(r) { var o = toOklch(r.ink); return o && o[0] < 0.5 ? '#000000' : '#ffffff'; }
    /**
     * Hover as one category. Hover (hover-bg, read over Content) is what the pointer does on the
     * content; every part's hover is that same step over its own background, at its own
     * strength (`aK`, in units of Hover's: tabs 9/7, rows 12/7…). The step is kept as a wash — the
     * color it goes toward and how far — so it works over any background. Untouched it is the
     * neutral wash the parts always had (white on a dark scheme, black on a light one, 7%).
     */
    function hoverWash(r, L) {
        var f = far(L);
        // Hover left as the start had it: the start's own wash (Cyberpunk's cyan at 14%), over whatever Content is now
        if (r._wash) return r._wash;
        if (!r.hover || !r.surface || toHex(r.hover) === mix(r.surface, f, 0.07)) return { c: f, a: 0.07 };
        var b = parseColor(r.surface), t = parseColor(r.hover), a = 0;
        for (var i = 0; i < 3; i++) {
            var d = t[i] - b[i];
            a = Math.max(a, d > 0 ? d / (255 - b[i] || 1) : d < 0 ? -d / (b[i] || 1) : 0);
        }
        if (a < 0.005) return { c: f, a: 0.07 };
        return { c: '#' + hex2(b[0] + (t[0] - b[0]) / a) + hex2(b[1] + (t[1] - b[1]) / a) + hex2(b[2] + (t[2] - b[2]) / a), a: a };
    }
    /** The wash a theme's hover-bg is: as written when translucent, else what its color is over Content. */
    function washOf(aShown, aSurface, L) {
        var p = parseColor(aShown);
        if (!p) return null;
        if (p[3] < 1) return { c: toHex(aShown), a: Math.round(p[3] * 1000) / 1000 };
        return hoverWash({ hover: toHex(aShown), surface: aSurface }, L);
    }
    /**
     * A hover the theme tuned apart from its Hover — another hue, not a step of it (Cyberpunk's red
     * tab hover beside its cyan Hover): the part's own, which Hover moving leaves be.
     */
    function apartFromHover(aShown, aHover) {
        // the colors as written, a wash's own color included: laid over a near-black page every tint grays out
        var a = toOklch(toHex(aShown)), b = toOklch(toHex(aHover));
        if (!a || !b || a[1] < 0.03 || b[1] < 0.03) return false;
        var dh = Math.abs(a[2] - b[2]);
        return (dh > 180 ? 360 - dh : dh) > 60;
    }
    /**
     * File-type icons (neo-web's icon-* tokens): the Material colors the dark screen draws. Under a
     * light scheme each keeps that color and is deepened, hue kept, only as far as this theme needs
     * to read 2:1 on what it sits on at rest — the side panel and its selected row, the tab bar, the
     * content, raised cards and dialogs. An icon sits beside its file's name, so it needs to be told
     * apart, not read as text: held to 3:1 on every hovered row too, the presets' folders went brown.
     * (The git mark sits on its folder, not on the page: it is left alone.)
     */
    var ICONS = {
        'icon-folder': '#ffca28', 'icon-folder-git': '#ff7043', 'icon-folder-public': '#42a5f5', 'icon-sql': '#ffca28',
        'icon-tql': '#4caf50', 'icon-taz': '#26a69a', 'icon-taz-gray': '#9fa2ab', 'icon-wrk': '#42a5f5', 'icon-md': '#42a5f5',
        'icon-json': '#fbc02d', 'icon-csv': '#8bc34a', 'icon-doc': '#78909c', 'icon-image': '#26a69a', 'icon-svg': '#ffb300',
        'icon-shell': '#ff7043', 'icon-powershell': '#03a9f4', 'icon-new': '#c4c4c4', 'icon-html': '#fc7976', 'icon-css': '#399af6',
        'icon-js': '#fdda19', 'icon-dsh': '#fc7676',
    };
    function iconGrounds(r) {
        return [r.sideBg, r.sideActive, r.tabbarBg, r.surface, r.raised, r.dialogBg].filter(Boolean);
    }
    /**
     * The deepest an icon goes (oklch lightness): a folder still yellow-brown, a TQL file still green.
     * An icon is its color; deepened to black it says nothing about the file.
     */
    var ICON_FLOOR = 0.42;
    /** How well an icon must stand out from its ground (it is not the only sign of its file: the name is beside it). */
    var ICON_CONTRAST = 2;
    function iconOn(aBase, aGrounds) {
        var o = toOklch(aBase), c = aBase;
        if (!o || !aGrounds.length) return aBase;
        // A ground the icon cannot read on even at its deepest — a dark Layer or dialog beside light
        // panels — is not chased: one color cannot be deep for the one and light for the other, and
        // chasing both took every icon to black.
        var deepest = fromOklch(Math.min(o[0], ICON_FLOOR), o[1], o[2]);
        var grounds = aGrounds.filter(function (g) { return contrast(deepest, g) >= ICON_CONTRAST; });
        var worst = function (x) { return Math.min.apply(null, grounds.map(function (g) { return contrast(x, g); })); };
        if (!grounds.length) return aBase;
        for (var l = o[0]; worst(c) < ICON_CONTRAST && l > ICON_FLOOR; l -= 0.01) c = fromOklch(l, o[1], o[2]);
        return c;
    }

    // every hover token: the shared ones derive works out from Hover, and each part's
    var HOVER_TOKENS = { 'hover-bg': 1, 'list-hover-bg': 1, 'toolbar-hover-bg': 1, 'scrollbar-hover-thumb': 1, 'menu-item-hover-bg': 1, 'gnb-hover-bg': 1, 'tabbar-hover-bg': 1, 'side-hover-bg': 1, 'console-hover-bg': 1, 'table-row-hover-bg': 1 };
    function washAt(r, L, aK) {
        var w = hoverWash(r, L);
        return rgba(w.c, Math.round(Math.min(1, w.a * aK) * 1000) / 1000);
    }
    function hoverOn(r, L, aBg, aK) { return over(washAt(r, L, aK), aBg); }
    function bestOn(aFill, aOptions) {
        var best = aOptions[0], score = -1;
        aOptions.forEach(function (c) { var k = contrast(c, aFill); if (k > score) { score = k; best = c; } });
        return best;
    }

    var ROLES = [
        { key: 'frame', group: 'Basics', label: 'Frame', token: 'bg-primary', where: 'the left icon bar, the tab bar, the console\'s header' },
        { key: 'surface', group: 'Basics', label: 'Content', token: 'bg-secondary', where: 'the page inside each tab: the editors, results, the New tab, a table\'s page' },
        { key: 'ink', group: 'Basics', label: 'Text', token: 'text-primary', where: 'the main text in every part' },
        { key: 'accent', group: 'Basics', label: 'Accent', token: 'accent-main', where: 'the installed version chip, primary badges, the line under a panel editor\'s chosen tab, a switch or checkbox that is on; the active indicators, Primary buttons, links and focus outlines follow it' },
        // the line the screen shows everywhere (border-color-default, ~3,000 places): every resting line is this one color
        { key: 'line', group: 'Basics', label: 'Borders', token: 'border-color-default', under: 'surface', where: 'every line: dividers, the outlines of cards, panels, menus, dialogs and inputs' },

        // the content's own color, as on the dark screen (both #252525): one Content change moves the panels with the editors
        { key: 'panel', group: 'Surfaces', label: 'Drawers', token: 'bg-panel', where: 'panels that open beside or over a page: the New tab\'s Widgets panel (Customize), a package\'s README panel, the dashboard\'s variables drawer, Tag Analyzer\'s inset boxes', follow: 'surface' },
        // the side panel's bars are this color too (side-header-bg falls back to bg-header): one color, not two
        { key: 'header', group: 'Surfaces', label: 'Section headers', token: 'bg-header', where: 'the OPEN EDITORS, EXPLORER and PACKAGES bars in the side panel, the package switcher under them, a drawer\'s header and a package\'s README header', follow: 'frame' },
        { key: 'raised', group: 'Surfaces', label: 'Layer', token: 'bg-elevated', where: 'New tab cards, dialogs, menus, chips, table headers', auto: function (r, L) { return mix(r.surface, far(L), L ? 0.06 : 0.04); } },
        // content's deep background (the data viewer, SQL results, sign-in): content, a step darker — not the frame
        // the ground of what opens inside a page (the data viewer, a tab that failed to draw): Content's color, listed
        // under Content — not Frame's, which moves the bars around the workspace and nothing inside a page
        { key: 'canvas', group: 'Surfaces', label: 'Canvas', token: 'bg-canvas', where: 'a tab that failed to draw, the data viewer, a package while it loads, and behind the sign-in picture', follow: 'surface' },
        // what the pointer is over, as a category: every part's hover is this step over its own background
        { key: 'hover', group: 'Basics', label: 'Hover', token: 'hover-bg', where: 'the row or button under the mouse pointer', under: 'surface', auto: function (r, L) { return mix(r.surface, far(L), 0.07); } },
        // the hover by where it is: rows and folding headers outside the parts that have their own, and the icon buttons
        { key: 'listHover', group: 'Surfaces', label: 'List rows', token: 'list-hover-bg', where: 'a folding section\'s header and a row under the pointer, outside the side panel and tables', follow: 'hover', basis: 'hover', under: 'surface' },
        { key: 'toolbarHover', group: 'Surfaces', label: 'Toolbar buttons', token: 'toolbar-hover-bg', where: 'an icon button under the pointer: editor toolbars, panel headers, the eye in a password field', follow: 'hover', basis: 'hover', under: 'surface' },



        // muted text is text: by default as strong as the icons (the dark screen draws both #818181); the check asks 4.5:1, or no fainter than the icons where they read less
        { key: 'muted', group: 'Text', label: 'Sub text', token: 'text-muted', where: 'counts, notes, placeholders, the server version, the labels of Cancel and Browse', auto: function (r) { return mix(r.ink, fadeOf(r), 0.42); } },
        { key: 'icon', group: 'Text', label: 'Icons', token: 'text-icon', where: 'toolbar icons (Run, Save…) and icon-only buttons', auto: function (r) { return mix(r.ink, fadeOf(r), 0.42); } },
        { key: 'disabled', group: 'Text', label: 'Disabled text', token: 'text-disabled', where: 'the text of a control that cannot be used right now', follow: 'muted' },
        { key: 'link', group: 'Text', label: 'Accent text', token: 'accent-text', where: 'links and highlighted words', follow: 'accent', on: 'surface', min: 4.5 },

        { key: 'button', group: 'Controls', label: 'Primary button', token: 'button-primary-bg', where: 'Save, Create, OK, Apply and Install', follow: 'accent' },
        { key: 'onAccent', group: 'Text', label: 'Text on color', token: 'text-on-accent', where: 'the label on Save, Install and colored badges', auto: function (r) { return bestOnAll([r.button, r.error || r.button], ['#ffffff', mix(r.button, '#000000', 0.82), r.ink]); } },
        // a color of its own, like the signals: neither Accent nor Content moves it (`seed` is only what a
        // theme that gives none starts from — the web UI's dark selection, or a pale one on a light content)
        { key: 'selection', group: 'Basics', label: 'Selection', token: 'selected-bg', where: 'the selected row or item, a picked day or time', seed: function (r, L) { return L ? '#d6e4f7' : '#0053a0'; } },
        { key: 'activeBg', group: 'Surfaces', label: 'Active', token: 'active-bg', where: 'a button that is switched on, the chosen part of a segmented control, the pill of the open package page', follow: 'selection' },
        { key: 'focus', group: 'Controls', label: 'Focus outline', token: 'border-color-focus', where: 'the outline around the input you are typing in, or the button you reached with Tab', follow: 'accent' },

        { key: 'success', group: 'Signals', label: 'Success', token: 'success-main', where: 'green badges and status dots, success buttons and borders' },
        { key: 'warning', group: 'Signals', label: 'Warning', token: 'warning-main', where: 'orange notices, the update chip and badges, update buttons and borders' },
        { key: 'error', group: 'Signals', label: 'Error', token: 'error-main', where: 'red badges and status dots; an invalid input\'s border follows it' },
        { key: 'info', group: 'Signals', label: 'Info', token: 'info-main', where: 'blue info badges, status dots and notices', seed: function () { return '#005fb8'; } },
        // the gray family, beside the other families every chip and badge takes its color from (a chip is a shape, not a color)
        { key: 'neutralButton', group: 'Signals', label: 'Neutral', token: 'neutral-main', where: 'gray fills: a package\'s version chip, picked tags, a neutral badge or status dot — and the Copy button on code', auto: function (r, L) { return mix(r.raised, far(L), 0.3); } },
        { key: 'highlight', group: 'Signals', label: 'Match highlight', token: 'event-match-main', where: 'matched words in a search, event highlights', auto: function (r, L) { return mix(r.warning, far(L), 0.35); } },
        // a signal as text (and a status dot): readable on the content, where the fill need not be
        { key: 'successText', group: 'Signals', label: 'Success text', token: 'success-text', where: 'INFO in logs, done messages, the dot of something running', auto: function (r) { return mix(r.success, strongOf(r), 0.2); }, on: 'surface', min: 4.5 },
        { key: 'warningText', group: 'Signals', label: 'Warning text', token: 'warning-text', where: 'WARN in logs, warning messages', follow: 'warning', on: 'surface', min: 4.5 },
        { key: 'errorText', group: 'Signals', label: 'Error text', token: 'error-text', where: 'ERROR in logs, error messages, the dot of something stopped', auto: function (r) { return mix(r.error, '#ffffff', 0.25); }, on: 'surface', min: 4.5 },
        { key: 'statusNone', group: 'Signals', label: 'Unknown status', token: 'status-none', where: 'the dot of a state that is not known', follow: 'icon' },

        { key: 'delete', group: 'Controls', label: 'Danger button', token: 'button-danger-bg', where: 'Delete, Remove and Uninstall buttons', follow: 'error' },
        // the controls that have a color of their own; the buttons are their colors' (Primary button under Accent,
        // Danger button under Error), and a switch or checkbox that is on is Accent's
        { key: 'scrollbar', group: 'Controls', label: 'Scrollbar', token: 'scrollbar-thumb', where: 'scrollbar thumbs', auto: function (r, L) { return mix(r.surface, far(L), 0.25); } },

        // Parts of the screen, each with its own tokens in the web UI (tokens/_colors.scss, Areas):
        // changing one changes that part alone. They follow the basics until given their own color.
        { key: 'gnbBg', group: 'GNB', label: 'Background', token: 'gnb-bg', where: 'the icon column on the left', follow: 'frame' },
        { key: 'gnbIcon', group: 'GNB', label: 'Icons', token: 'gnb-icon', where: 'its icons', follow: 'icon', on: 'gnbBg', min: 3 },
        { key: 'gnbIconActive', group: 'GNB', label: 'Active icon', token: 'gnb-active-icon', where: 'the open panel\'s icon, a hovered icon', follow: 'icon', on: 'gnbBg', min: 4.5 },
        { key: 'gnbMarker', group: 'GNB', label: 'Active indicator', token: 'gnb-marker', where: 'the line beside the active icon', follow: 'accent' },
        { key: 'gnbHover', group: 'GNB', label: 'Hover background', token: 'gnb-hover-bg', where: 'behind a hovered icon', under: 'gnbBg', basis: 'hover', auto: function (r, L) { return hoverOn(r, L, r.gnbBg, 1); } },
        { key: 'tabbarBg', group: 'Tab bar', label: 'Background', token: 'tabbar-bg', where: 'the bar above the editors', follow: 'frame' },
        { key: 'tabbarText', group: 'Tab bar', label: 'Active tab text', token: 'tabbar-active-text', where: 'the active tab\'s name', follow: 'ink', on: 'surface', min: 4.5 },
        { key: 'tabbarTextInactive', group: 'Tab bar', label: 'Inactive tab text', token: 'tabbar-inactive-text', where: 'names of the other open tabs', auto: function (r) { return mix(r.ink, fadeOf(r), 0.32); }, on: 'tabbarBg', min: 4.5 },
        { key: 'tabbarMarker', group: 'Tab bar', label: 'Active indicator', token: 'tabbar-marker', where: 'the line on the active tab', follow: 'accent' },
        // the open tab is the page under it: Content's color until given its own
        { key: 'tabbarActiveBg', group: 'Tab bar', label: 'Active tab background', token: 'tabbar-active-bg', where: 'the open tab and the header row of its page (the toolbar, a page\'s title row)', follow: 'surface' },
        { key: 'tabbarHover', group: 'Tab bar', label: 'Hover background', token: 'tabbar-hover-bg', where: 'behind a hovered tab', under: 'tabbarBg', basis: 'hover', auto: function (r, L) { return hoverOn(r, L, r.tabbarBg, 9 / 7); } },
        { key: 'sideBg', group: 'Side panel', label: 'Background', token: 'side-bg', where: 'explorer, DB explorer, packages…', follow: 'surface' },
        // the panel's section bars are drawn like the frame's bars (dark: the frame color), not as a shade of the panel
        { key: 'sideText', group: 'Side panel', label: 'Text', token: 'side-text', where: 'names in the panel', follow: 'ink', on: 'sideBg', min: 4.5 },
        // sub text is text: it follows Sub text, not Icons (an icon color must not move the server version)
        { key: 'sideTextMuted', group: 'Side panel', label: 'Sub text', token: 'side-text-muted', where: 'counts, the server version, meta lines', follow: 'muted', on: 'sideBg', min: 3 },
        { key: 'sideIcon', group: 'Side panel', label: 'Icons', token: 'side-icon', where: 'header buttons, search, a database\'s icon', follow: 'icon', on: 'header', min: 3 },
        // drawn over the panel: kept as the color it shows there (a translucent token is read over it)
        { key: 'sideHover', group: 'Side panel', label: 'Hover background', token: 'side-hover-bg', where: 'a hovered row in the explorers and packages, and the selected package', under: 'sideBg', basis: 'hover', auto: function (r, L) { return hoverOn(r, L, r.sideBg, 12 / 7); } },
        // the selected row is a selection, as in tables and the console
        { key: 'sideActive', group: 'Side panel', label: 'Selected row', token: 'side-selected-bg', where: 'the selected file or item', follow: 'selection' },
        { key: 'consoleBg', group: 'Console', label: 'Header', token: 'console-bg', where: 'the console\'s tab bar', follow: 'frame' },
        { key: 'consoleBodyBg', group: 'Console', label: 'Background', token: 'console-body-bg', where: 'behind the log lines', follow: 'surface' },
        // the selected task's lines: a selection, as a selected row is — it follows Selection
        { key: 'consoleActive', group: 'Console', label: 'Selected line', token: 'console-selected-bg', where: 'the selected task\'s lines in the log', follow: 'selection' },
        { key: 'consoleText', group: 'Console', label: 'Selected line text', token: 'console-text', where: 'the selected task\'s lines', follow: 'ink', on: 'consoleActive', min: 4.5 },
        { key: 'consoleTextMuted', group: 'Console', label: 'Log lines', token: 'console-text-muted', where: 'the log lines', auto: function (r) { return mix(r.ink, fadeOf(r), 0.19); }, on: 'consoleBodyBg', min: 4.5 },
        // the names of the console's tabs in its header bar: their own, so the log lines' color leaves the header be
        { key: 'consoleTabText', group: 'Console', label: 'Tab names', token: 'console-tab-text', where: 'the names of the console\'s tabs, in its header bar', auto: function (r) { return mix(r.ink, fadeOf(r), 0.19); } },
        { key: 'consoleMarker', group: 'Console', label: 'Active indicator', token: 'console-marker', where: 'the line under the console\'s open tab', follow: 'accent' },
        { key: 'consoleIcon', group: 'Console', label: 'Icons', token: 'console-icon', where: 'its buttons', follow: 'icon', on: 'consoleBg', min: 3 },
        { key: 'consoleHover', group: 'Console', label: 'Hover background', token: 'console-hover-bg', where: 'behind a hovered button in its header', under: 'consoleBg', basis: 'hover', auto: function (r, L) { return hoverOn(r, L, r.consoleBg, 1); } },
        { key: 'tableHeaderBg', group: 'Tables', label: 'Header', token: 'table-header-bg', where: 'column names row', follow: 'raised' },
        { key: 'tableHeaderText', group: 'Tables', label: 'Header text', token: 'table-header-text', where: 'column names', follow: 'ink', on: 'tableHeaderBg', min: 3 },
        // the numbers at the start of each row: their own, so the column names' color leaves them be (and the other way round);
        // both hang on Text, each as the start has it (Dark: the same gray)
        { key: 'tableRowNumber', group: 'Tables', label: 'Row numbers', token: 'table-row-number-text', where: 'the numbers at the start of each row', follow: 'ink', on: 'surface', min: 3 },
        { key: 'tableStripe', group: 'Tables', label: 'Striped rows', token: 'table-stripe-bg', where: 'every other row', follow: 'raised' },
        { key: 'tableRowActive', group: 'Tables', label: 'Selected row', token: 'table-row-selected-bg', where: 'the selected row in result grids and tables', follow: 'selection' },
        { key: 'tableRowHover', group: 'Tables', label: 'Hover background', token: 'table-row-hover-bg', where: 'a hovered row', under: 'surface', basis: 'hover', auto: function (r, L) { return hoverOn(r, L, r.surface, L ? 8 / 7 : 13 / 7); } },
        { key: 'fieldBg', group: 'Inputs', label: 'Background', token: 'field-bg', where: 'inputs and closed select boxes', follow: 'raised' },
        { key: 'fieldBorder', group: 'Inputs', label: 'Border', token: 'field-border', where: 'their outline', under: 'fieldBg', follow: 'line' },
        { key: 'fieldError', group: 'Inputs', label: 'Error border', token: 'field-error-border', where: 'the outline of a field with an error', under: 'fieldBg', follow: 'error' },
        { key: 'fieldIcon', group: 'Inputs', label: 'Icons', token: 'field-icon', where: 'search and clear icons', follow: 'icon', on: 'fieldBg', min: 3 },
        { key: 'fieldDisabled', group: 'Inputs', label: 'Disabled background', token: 'field-disabled-bg', where: 'a disabled input or select', under: 'fieldBg', auto: function (r, L) { return mix(r.fieldBg, '#000000', L ? 0.05 : 0.32); } },
        { key: 'dialogBg', group: 'Dialogs', label: 'Background', token: 'dialog-bg', where: 'dialogs', follow: 'raised' },
        { key: 'dialogTitle', group: 'Dialogs', label: 'Title', token: 'dialog-title-text', where: 'the title at the top of a dialog', follow: 'ink', on: 'dialogBg', min: 4.5 },
        { key: 'menu', group: 'Menus', label: 'Background', token: 'menu-bg', where: 'context menus and open dropdown lists', follow: 'raised' },
        { key: 'menuIcon', group: 'Menus', label: 'Icons', token: 'menu-item-icon', where: 'item icons', follow: 'icon', on: 'menu', min: 3 },
        { key: 'menuHover', group: 'Menus', label: 'Hover background', token: 'menu-item-hover-bg', where: 'behind a hovered item', under: 'menu', basis: 'hover', auto: function (r, L) { return hoverOn(r, L, r.menu, 1); } },
        // tooltips sit over the content: they hang on Content, not on the frame around it
        { key: 'tooltip', group: 'Tooltips', label: 'Background', token: 'tooltip-bg', where: 'hover hints', auto: function (r, L) { return L ? mix(r.surface, far(L), 0.1) : mix(r.surface, '#000000', 0.12); } },
        { key: 'tooltipText', group: 'Tooltips', label: 'Text', token: 'tooltip-text', where: 'hint text', follow: 'ink', on: 'tooltip', min: 4.5 },
        // the board around a dashboard's panels — a panel itself is drawn in the chart theme it is set to, not in these
    ];
    /** The groups that are parts of the screen (the rest are colors several parts share). */
    var PART_GROUPS = ['GNB', 'Tab bar', 'Side panel', 'Console', 'Tables', 'Inputs', 'Dialogs', 'Menus', 'Tooltips'];

    /**
     * What each part's token falls back to in the web UI when a theme leaves it unset (the CSS
     * `var(--neo-gnb-bg, var(--neo-bg-primary, …))`): a theme made before the part had tokens shows
     * the part in that color, so reading one back reads the part as it shows.
     */
    var AREA_FALLBACK = {
        'bg-header': 'bg-primary', 'menu-border': 'border-color-default', 'dialog-border': 'border-color-default',
        'gnb-bg': 'bg-primary', 'gnb-icon': 'text-icon', 'gnb-active-icon': 'text-primary', 'gnb-marker': 'accent-main', 'gnb-hover-bg': 'hover-bg',
        'tabbar-bg': 'bg-primary', 'tabbar-active-text': 'text-primary', 'tabbar-inactive-text': 'text-tertiary', 'tabbar-marker': 'accent-main', 'tabbar-active-bg': 'bg-secondary', 'tabbar-hover-bg': 'hover-bg',
        'side-bg': 'bg-panel', 'side-header-bg': 'bg-header', 'side-text': 'text-primary', 'side-text-muted': 'text-muted', 'side-icon': 'text-icon', 'side-hover-bg': 'list-hover-bg', 'side-selected-bg': 'selected-bg',
        'console-bg': 'bg-primary', 'console-body-bg': 'bg-secondary', 'console-selected-bg': 'selected-bg', 'console-text': 'text-primary', 'console-text-muted': 'text-secondary', 'console-tab-text': 'console-text-muted', 'console-marker': 'border-color-active', 'console-icon': 'text-icon', 'console-hover-bg': 'hover-bg',
        'table-header-bg': 'bg-elevated', 'table-header-text': 'text-muted', 'table-row-number-text': 'table-header-text', 'table-stripe-bg': 'bg-elevated', 'table-row-hover-bg': 'list-hover-bg', 'table-row-selected-bg': 'selected-bg',
        'field-bg': 'bg-elevated', 'field-disabled-bg': 'bg-primary', 'bg-canvas': 'bg-primary', 'field-border': 'border-color-default', 'field-error-border': 'error-main', 'field-icon': 'text-tertiary',
        'dialog-bg': 'bg-elevated', 'dialog-title-text': 'text-primary',
        'active-bg': 'selected-bg', 'active-text': 'selected-text',
    };
    /**
     * The fallbacks the web UI says it has (theme-tokens.json `fallback`): they replace the list above, which
     * stays for a web UI that does not say yet.
     */
    function useFallbacks(aTokens) {
        (aTokens || []).forEach(function (t) { if (t && typeof t.fallback === 'string' && typeof t.name === 'string') AREA_FALLBACK[t.name] = t.fallback; });
    }
    /** A default the web UI writes as `var(--neo-x, <value>)` (text a part inherits from the page) is that value. */
    function plainDefault(aValue) {
        var m = /^var\(\s*--neo-[a-z0-9-]+\s*,\s*(.+)\)$/.exec(String(aValue == null ? '' : aValue).trim());
        return m ? m[1].trim() : aValue;
    }
    /** What `aToken` shows under the variables `aVars`: its own value, else what it falls back to, down to the default. */
    function shownValue(aToken, aVars, aDefaults) {
        if (aVars[aToken] != null) return aVars[aToken];
        var fb = AREA_FALLBACK[aToken];
        if (fb) {
            if (aVars[fb] != null) return aVars[fb];
            // a part's token that falls back to another part's (the console's hover → its bar) goes on down
            if (AREA_FALLBACK[fb]) return shownValue(fb, aVars, aDefaults);
            if (aToken in aDefaults) return plainDefault(aDefaults[aToken]);
            return shownValue(fb, aVars, aDefaults);
        }
        return plainDefault(aDefaults[aToken]);
    }
    var ROLE = {};
    ROLES.forEach(function (d) { ROLE[d.key] = d; });

    /**
     * The shared color each part's color hangs on: the one it is the same as (follow), Hover for a
     * part's hover, else the one it is worked out from. The builder lists a part's colors under it:
     * one change to the shared color moves every part that follows it, and a part can be given its
     * own color (and given it back) without leaving that row.
     */
    var DERIVED_FROM = { tabbarTextInactive: 'ink', consoleTextMuted: 'ink', consoleTabText: 'ink', fieldBorder: 'line', fieldIcon: 'icon', fieldDisabled: 'raised', tooltip: 'surface', tooltipText: 'ink' };
    function parentOf(aKey) {
        var d = ROLE[aKey];
        if (!d) return null;
        // a shared color that is another's color (Section headers is Frame's, Drawers Content's) is listed
        // under it too, not as a row of its own somewhere else; one worked out by a formula (Layer, Hover)
        // keeps its own row
        if (PART_GROUPS.indexOf(d.group) < 0) return d.follow || null;
        return d.follow || d.basis || DERIVED_FROM[aKey] || null;
    }
    /** Everything listed under `aKey`: what follows it, and what follows those, in order. */
    function descendantsOf(aKey) {
        var out = [];
        (function walk(k) { childrenOf(k).forEach(function (d) { out.push(d); walk(d.key); }); })(aKey);
        return out;
    }
    /** The part colors that hang on `aKey`, in the parts' order. */
    function childrenOf(aKey) {
        return ROLES.filter(function (d) { return parentOf(d.key) === aKey; });
    }

    /**
     * How a color moves, in words for its row: "follows X" (X changes it), "from X" (worked out from
     * X), "auto", or "custom" (its own: nothing else changes it). A follower that is not X's color
     * says which shade it is: the start theme draws it so ("as Light has it"; from Dark, the web UI's
     * own dark screen) — so a box unlike X is never called X's.
     * `aOpts`: { own, to (the role a start binds it to), start (its label; null for Dark) }.
     */
    /** The colors a theme gives directly, that others are worked out from: the basics and the three signals. */
    /** How close a follower must be to the color it follows to be that color (OKLCH distance; Light's markers are 0.25 away). */
    var SAME_COLOR = 0.035;
    function isRoot(aKey) { var d = ROLE[aKey]; return !!d && !d.follow && !d.auto && !d.basis; }
    /** The shared colors (not parts) that move when `aKey` moves — found by moving it, not by reading the formulas. */
    function dependentsOf(aKey, aOwn, aScheme, aRel) {
        var a = resolveRoles(aOwn, aScheme, aRel), probe = {};
        Object.keys(aOwn || {}).forEach(function (k) { probe[k] = aOwn[k]; });
        probe[aKey] = toHex(a[aKey]) === '#ff00ff' ? '#00ff00' : '#ff00ff';
        var b = resolveRoles(probe, aScheme, aRel);
        return ROLES.filter(function (d) { return d.key !== aKey && PART_GROUPS.indexOf(d.group) < 0 && !(aOwn && d.key in aOwn) && a[d.key] !== b[d.key]; }).map(function (d) { return d.key; });
    }
    /** The roots a worked-out shared color comes from ("from Accent and Content"). */
    function sourcesOf(aKey, aOwn, aScheme, aRel) {
        return ROLES.filter(function (d) { return isRoot(d.key) && dependentsOf(d.key, aOwn, aScheme, aRel).indexOf(aKey) >= 0; }).map(function (d) { return d.key; });
    }
    function relationText(aKey, aResolved, aOpts) {
        var d = ROLE[aKey], o = aOpts || {};
        if (!d) return '';
        if (o.own) return 'custom';
        if (o.to && ROLE[o.to]) return 'follows ' + ROLE[o.to].label;
        var p = d.follow || d.basis || parentOf(aKey);
        // a worked-out shared color names the colors it comes from: changing any of them changes it
        if (!p && d.auto && o.sources && o.sources.length) return 'from ' + o.sources.map(function (k) { return ROLE[k].label; }).join(' and ');
        if (!p) return d.auto ? 'auto' : '';
        var to = ROLE[p].label;
        // a part's hover is Hover's step over the part's own background
        if (d.basis) return 'follows ' + to;
        if (!d.follow) return 'from ' + to;
        var a = aResolved && aResolved[aKey], b = aResolved && aResolved[p];
        if (!a || !b || distance(a, b) < 0.02) return 'follows ' + to;
        var la = toOklch(a)[0], lb = toOklch(b)[0];
        var how = Math.abs(la - lb) < 0.03 ? 'another shade' : la < lb ? 'darker' : 'lighter';
        // the start draws it so (Dark: the web UI's own dark screen does)
        return 'follows ' + to + ' · ' + how + ', as ' + (o.start || 'Dark') + ' has it';
    }

    /** What a role is when it has no color of its own. */
    function autoOf(aRole, aResolved, aLight) {
        var base = aRole.follow ? aResolved[aRole.follow] : aRole.auto ? aRole.auto(aResolved, aLight) : aRole.seed ? aRole.seed(aResolved, aLight) : null;
        // text in a part reads on the part: given a background of the other lightness, it turns over
        // `on`/`min` name what a text sits on and how well it should read there — for the contrast
        // checks; the color itself is never moved by its background
        return base;
    }

    /**
     * `aFg` if it reads on `aBg` at `aMin`:1; else the same hue and chroma, turned to the other
     * lightness and pushed toward white or black until it does.
     */
    function readableOn(aFg, aBg, aMin) {
        if (contrast(aFg, aBg) >= aMin) return aFg;
        var f = toOklch(aFg), up = toOklch(aBg)[0] < 0.6;
        if (!f) return aFg;
        var L = up ? Math.max(f[0], 1 - f[0]) : Math.min(f[0], 1 - f[0]);
        for (var i = 0; i < 40; i++) {
            var c = fromOklch(L, f[1], f[2]);
            if (contrast(c, aBg) >= aMin) return c;
            L = up ? Math.min(1, L + 0.03) : Math.max(0, L - 0.03);
        }
        return up ? '#ffffff' : '#000000';
    }
    /** Of `aOptions`, the one that reads best on the worst of `aFills`. */
    function bestOnAll(aFills, aOptions) {
        var best = aOptions[0], score = -1;
        aOptions.forEach(function (c) {
            var k = Math.min.apply(null, aFills.map(function (f) { return contrast(c, f); }));
            if (k > score) { score = k; best = c; }
        });
        return best;
    }

    /**
     * Every role's color: its own (`aOwn`), else what it follows or works out — kept in the
     * relation the start theme had to it (`aRel`: role → { to, rel }), so a tuned preset moves as
     * one family when a color it hangs on moves.
     */
    function resolveRoles(aOwn, aScheme, aRel) {
        var L = aScheme === 'light', r = {};
        // Hover given a color (not left to the theme): every hover following it takes that color
        r._hoverOwn = !!(aOwn && toHex(aOwn.hover));
        r._follows = {};
        // the roots first, so a role listed before one (text on buttons, before Error) can read it
        ROOTS.forEach(function (k) { if (aOwn && toHex(aOwn[k])) r[k] = toHex(aOwn[k]); });
        ROLES.forEach(function (d) {
            var own = aOwn && aOwn[d.key];
            if (own && toHex(own)) {
                r[d.key] = toHex(own);
                return;
            }
            // a part's hover is Hover itself until the part is given its own: one change moves every hover alike
            // (its color here is that one hover on the part's own background: Hover's color itself when
            // Hover was given one, else Hover's wash over the part)
            if (d.basis) {
                r[d.key] = r._hoverOwn || !r[d.under] ? r[d.basis] : toHex(over(washAt(r, L, 1), r[d.under]));
                r._follows[d.key] = true;
                return;
            }
            var bind = aRel && aRel[d.key];
            if (bind && bind.wash && r.surface && bind.wash.scheme === (L ? 'light' : 'dark')) {
                r._wash = bind.wash;
                r[d.key] = over(rgba(bind.wash.c, bind.wash.a), r.surface);
                return;
            }
            var base = bind && bind.to ? r[bind.to] : autoOf(d, r, L);
            r[d.key] = bind ? toHex(applyRelation(base, bind.rel)) : base || '#808080';
            // the step the start took must not sink the text into its part: it reads at least as well as it did, up to the need
        });
        return r;
    }

    /** The roles a theme gives directly: no parent to follow, nothing to work out from. */
    var ROOTS = ROLES.filter(function (d) { return !d.follow && !d.auto; }).map(function (d) { return d.key; });

    /**
     * Reads a theme back as roles: the basics (and signals) as its own colors, every other role
     * as the step the theme took from the parent it names (what it follows or works out from).
     */
    function rolesOf(aVars, aDefaults, aScheme) {
        var L = aScheme === 'light', own = {}, rel = {}, r = {};
        ROLES.forEach(function (d) {
            var shown = shownValue(d.token, aVars, aDefaults);
            var v = (d.under && r[d.under] ? over(shown, r[d.under]) : toHex(shown)) || '#808080';
            var a = autoOf(d, r, L);
            if (!a || isRoot(d.key)) {
                own[d.key] = v;
            } else if (d.basis) {
                // a part's hover follows Hover: as the start wrote it until Hover changes, then Hover's own value
            } else {
                // a role keeps the parent it names (same as Layer, auto…) — never another role it merely
                // looks like in this theme — with the step the theme took from it
                var step = relation(v, a), raw = toOklch(toHex(shown)), pa = parseColor(shown);
                // a wash laid over its base (Cyberpunk's cyan hover over its near-black content) grays
                // out there: it keeps the hue it is written in, not the base's
                if (step && d.under && pa && pa[3] < 1 && raw && raw[1] >= 0.03 && step.dh === null && step.c < 0.02) {
                    step.h = raw[2];
                    step.c = 0.02;
                }
                // a follower within a hair of the color it follows is that color (the dark screen's input
                // border is 14.5% white where its lines are 13%): it moves as that color, so one change
                // leaves them one color. A step a theme took on purpose (Light's deeper markers) is kept.
                if (d.follow && distance(v, a) < SAME_COLOR) {
                    r[d.key] = v;
                    return;
                }
                rel[d.key] = { to: null, rel: step, c0: d.on && r[d.on] ? contrast(v, r[d.on]) : undefined };
                if (d.key === 'hover') {
                    rel[d.key].wash = washOf(shown, r.surface, L);
                    // a wash leans toward one end: a dark scheme's white, a light one's black — it does not cross over
                    if (rel[d.key].wash) rel[d.key].wash.scheme = aScheme === 'light' ? 'light' : 'dark';
                }
            }
            r[d.key] = v;
        });
        return { own: own, rel: rel };
    }

    /**
     * How each token the theme sets hangs on the roles: on its own derived value, or on a role of its
     * family it matches more closely (a preset's hover blue is its accent's, not a step of it). A
     * token no role decides (a fixed color) hangs on nothing and keeps its value.
     */
    function tokenBindings(aVars, aRoles, aDerived, aScheme) {
        var out = {};
        Object.keys(aVars).forEach(function (t) {
            var v = aVars[t];
            if (!parseColor(v)) return;
            var d = aDerived[t];
            if (d && parseColor(d)) out[t] = { to: null, rel: relation(v, d) };
        });
        return out;
    }

    /**
     * Light or dark — what the code editor, charts and terminal follow: whichever of black and white
     * reads better on the content (a theme does not pick it apart from its colors).
     */
    function schemeOf(aContent, aFallback) {
        var c = toHex(aContent);
        if (!c) return aFallback === 'light' ? 'light' : 'dark';
        return contrast('#000000', c) > contrast('#ffffff', c) ? 'light' : 'dark';
    }

    /** A start theme read as roles, ready to move: `{ vars, scheme, own, rel, bind }`. */
    function readTheme(aVars, aDefaults, aScheme, aSavedOwn) {
        var read = rolesOf(aVars, aDefaults, aScheme);
        var own = read.own;
        if (aSavedOwn) {
            own = {};
            Object.keys(aSavedOwn).forEach(function (k) { if (ROLE[k] && toHex(aSavedOwn[k])) own[k] = toHex(aSavedOwn[k]); });
            Object.keys(read.own).forEach(function (k) { if (!(k in own)) own[k] = read.own[k]; });
        }
        var rel = {};
        Object.keys(read.rel).forEach(function (k) { if (!(k in own)) rel[k] = read.rel[k]; });
        var R0 = resolveRoles(own, aScheme, rel);
        return { vars: aVars, defaults: aDefaults, scheme: aScheme, own: own, rel: rel, bind: tokenBindings(aVars, R0, derive(R0, aScheme), aScheme) };
    }

    /**
     * The start's variables, moved by role changes (`aOwn`, `aScheme`): a token keeps the relation
     * it had to the color it hangs on — its derived value, or the role it matched — so a tuned
     * theme moves as one family; a token the start leaves unset takes the derived value when that
     * moves.
     */
    function moveVars(aStart, aOwn, aScheme) {
        var R0 = resolveRoles(aStart.own, aStart.scheme, aStart.rel), R1 = resolveRoles(aOwn, aScheme, aStart.rel);
        var D0 = derive(R0, aStart.scheme), D1 = derive(R1, aScheme);
        var out = {};
        // Hover given a color of its own here (not moved along with Content): the shared hovers take its step
        var hoverSet = toHex(aOwn && aOwn.hover) !== toHex(aStart.own && aStart.own.hover);
        Object.keys(aStart.vars).forEach(function (t) {
            var v = aStart.vars[t], b = aStart.bind[t];
            // a file icon the start had as worked out keeps being worked out; one it tuned stays
            if (ICONS[t]) {
                out[t] = toHex(v) === toHex(D0[t]) ? D1[t] : v;
                return;
            }
            // Hover moved: every hover takes it — a part keeps a hover only when it was customized
            if (HOVER_TOKENS[t] && hoverSet && t in D1) {
                out[t] = D1[t];
                return;
            }
            if (!b) {
                out[t] = t in D1 && D1[t] !== D0[t] ? D1[t] : v;
                return;
            }
            var base0 = b.to ? R0[b.to] : D0[t], base1 = b.to ? R1[b.to] : D1[t];
            out[t] = base0 === base1 ? v : applyRelation(base1, b.rel);
        });
        Object.keys(D1).forEach(function (t) { if (!(t in aStart.vars) && D1[t] !== D0[t]) out[t] = D1[t]; });
        // under a light scheme every file icon is written, even one left the dark screen's color: neo-web
        // gives a light theme that sets none its own deeper shades (global.scss)
        if (aScheme === 'light') Object.keys(ICONS).forEach(function (t) { if (!(t in out) && t in D1) out[t] = D1[t]; });
        // A part's token the start leaves unset is written when the part changes — or when what it
        // falls back to moved, so the fallback would no longer show the part as it was (Frame moving
        // bg-header must not move the side panel's headers).
        var defaults = aStart.defaults || {};
        Object.keys(AREA_FALLBACK).forEach(function (t) {
            if (!(t in D1) || t in aStart.vars) return;
            var was = shownValue(t, aStart.vars, defaults);
            var now = D1[t] === D0[t] ? was : D1[t];
            var after = Object.assign({}, aStart.vars, out);
            delete after[t];
            // a color is written only as a value: a part whose start color is not known is left to its fallback
            if (now != null && now !== shownValue(t, after, defaults)) out[t] = now;
            else delete out[t];
        });
        return out;
    }

    /** The eight seed colors older builders saved, as roles. */
    function rolesFromSeeds(aSeeds) {
        if (!aSeeds) return null;
        var map = { surface: 'frame', panel: 'surface', ink: 'ink', accent: 'accent', line: 'line', success: 'success', error: 'error', warning: 'warning' };
        var own = {};
        Object.keys(map).forEach(function (k) { if (toHex(aSeeds[k])) own[map[k]] = toHex(aSeeds[k]); });
        return Object.keys(own).length ? own : null;
    }

    /**
     * Roles → every token they decide. Tokens left out (color constants, the scrollbar drawn
     * over dark media) keep their defaults.
     */
    function derive(r, aScheme) {
        // One hover everywhere, as the user asked: the color Hover was given, or (left to the theme) its
        // wash, which reads as the same step on every background. A part given its own keeps it.
        var Lh = aScheme === 'light';
        var H = r._hoverOwn ? r.hover : washAt(r, Lh, 1);
        var hov = function (k) { return r._follows && r._follows[k] ? H : r[k]; };
        var L = aScheme === 'light', f = far(L), shade = '#000000';
        var hover = mix(r.accent, f, 0.12);
        var t = function (k) { return mix(r.ink, fadeOf(r), k); };
        var out = {
            'bg-primary': r.frame,
            'bg-secondary': r.surface,
            'bg-header': r.header,
            'bg-elevated': r.raised,
            'bg-panel': r.panel,
            // the open sub-tab (Tag hierarchy): a step of the content, as the dark screen's gray is — not the accent
            'sub-tab-active-bg': mix(r.surface, f, 0.04),
            // fields, hovers and bubbles on the content: Content's steps, not the frame's
            'hover-bg': H,
            'list-hover-bg': hov('listHover'),
            'toolbar-hover-bg': hov('toolbarHover'),
            'selected-bg': r.selection,
            // the selected item under the pointer: a step of the selection itself, not of the accent
            'selected-hover-bg': mix(r.selection, f, 0.15),
            // what is on or current (a toggled button, the open page's pill): the selection's color until given its own
            'active-bg': r.activeBg,
            'bg-backdrop': rgba(shade, L ? 0.3 : 0.5),
            'text-primary': r.ink,
            'text-secondary': t(0.19),
            'text-tertiary': t(0.32),
            'text-disabled': r.disabled,
            'text-icon': r.icon,
            'text-muted': r.muted,
            'selected-text': mix(r.ink, strongOf(r), 0.3),
            'text-on-accent': r.onAccent,
            // every resting line is the one Borders color; the stronger line (an input under the pointer, an outlined button) a step from it
            'border-color-default': r.line,
            'border-color-strong': mix(r.line, f, 0.3),
            'border-color-focus': r.focus,
            // the line marking what is open (the console's tab, the App Store's pill, a page's tab): the accent, as the tab bar's and GNB's markers are
            'border-color-active': r.accent,
            'accent-main': r.accent,
            'accent-hover': hover,
            'accent-light': mix(r.accent, f, L ? 0.08 : 0.25),
            'accent-dark': mix(r.accent, '#000000', 0.2),
            'accent-text': r.link,
            'success-main': r.success,
            'success-text': r.successText,
            'error-main': r.error,
            'error-text': r.errorText,
            'warning-main': r.warning,
            'warning-text': r.warningText,
            'info-main': r.info,
            'event-match-main': r.highlight,
            'button-danger-bg': r.delete,
            'button-primary-bg': r.button,
            'neutral-main': r.neutralButton,
            // a running / success status fill (StatusIndicator, a page's status button): Success's, not half the Primary button's
            'success-fill': r.success,
            'button-disabled-bg': mix(r.surface, f, 0.2),
            'status-none': r.statusNone,
            'scrollbar-thumb': r.scrollbar,
            'scrollbar-hover-thumb': hoverOn(r, L, r.scrollbar, 25 / 7), // a hover on a gray thumb: a lighter gray, not the accent
            'scrollbar-border': r.line,
            'scrollbar-track-bg': r.surface,
            'switch-bg': rgba(f, 0.15),
            'switch-hover-bg': rgba(f, 0.22),
            'switch-thumb': L ? r.surface : rgba(f, 0.4),
            'switch-active-thumb': L ? r.surface : f,
            'switch-border': rgba(f, 0.18),
            'menu-shadow': '0 4px 14px ' + rgba(shade, L ? 0.14 : 0.35),
            'menu-bg': r.menu,
            'menu-border': r.line,
            'menu-item-hover-bg': hov('menuHover'),
            'menu-item-icon': r.menuIcon,
            'dialog-border': r.line,
            'tooltip-bg': r.tooltip,
            'tooltip-text': r.tooltipText,
            // the dark screen's tooltips have no border (transparent): the tooltip's own color, so a Borders
            // change does not draw one; a theme that gives them a border (Light's accent) keeps it
            'tooltip-border': r.tooltip,
            'shadow-sm': '0 2px 2px ' + rgba(shade, L ? 0.08 : 0.25),
            'shadow-md': '0 4px 6px ' + rgba(shade, L ? 0.09 : 0.25),
            'shadow-lg': '0 8px 10px ' + rgba(shade, L ? 0.11 : 0.25),
            'shadow-xl': '0 10px 25px ' + rgba(shade, L ? 0.18 : 0.5),
            'gnb-bg': r.gnbBg,
            'gnb-icon': r.gnbIcon,
            'gnb-active-icon': r.gnbIconActive,
            'gnb-marker': r.gnbMarker,
            'gnb-hover-bg': hov('gnbHover'),
            'tabbar-bg': r.tabbarBg,
            'tabbar-active-text': r.tabbarText,
            'tabbar-inactive-text': r.tabbarTextInactive,
            'tabbar-marker': r.tabbarMarker,
            'tabbar-active-bg': r.tabbarActiveBg,
            'tabbar-hover-bg': hov('tabbarHover'),
            'side-bg': r.sideBg,
            'side-header-bg': r.header,
            'side-text': r.sideText,
            'side-text-muted': r.sideTextMuted,
            'side-icon': r.sideIcon,
            'side-hover-bg': hov('sideHover'),
            'side-selected-bg': r.sideActive,
            'console-bg': r.consoleBg,
            'console-body-bg': r.consoleBodyBg,
            'console-selected-bg': r.consoleActive,
            'console-text': r.consoleText,
            'console-text-muted': r.consoleTextMuted,
            'console-tab-text': r.consoleTabText,
            'console-marker': r.consoleMarker,
            'console-icon': r.consoleIcon,
            'console-hover-bg': hov('consoleHover'),
            'table-header-bg': r.tableHeaderBg,
            'table-header-text': r.tableHeaderText,
            'table-row-number-text': r.tableRowNumber,
            'table-stripe-bg': r.tableStripe,
            'table-row-hover-bg': hov('tableRowHover'),
            'table-row-selected-bg': r.tableRowActive,
            'field-bg': r.fieldBg,
            'field-disabled-bg': r.fieldDisabled,
            'bg-canvas': r.canvas,
            'field-border': r.fieldBorder,
            'field-error-border': r.fieldError,
            'field-icon': r.fieldIcon,
            'dialog-bg': r.dialogBg,
            'dialog-title-text': r.dialogTitle,
        };
        var grounds = L ? iconGrounds(r) : null;
        Object.keys(ICONS).forEach(function (k) { out[k] = L ? iconOn(ICONS[k], grounds) : ICONS[k]; });
        return out;
    }

    // ---- tokens --------------------------------------------------------------------------

    /**
     * The token list's groups. The web UI says what each token is (theme-tokens.json `kind` and `part`,
     * from its tokenKinds.ts): a part's own colors go under the part, the rest under their kind. A web UI
     * that does not say yet is grouped by name.
     */
    var PART_ORDER = ['GNB', 'Tab bar', 'Side panel', 'Console', 'Tables', 'Inputs', 'Dialogs', 'Menus', 'Tooltips'];
    var KIND_GROUP = {
        surface: 'Surfaces', field: 'Fields', hover: 'Hover', selection: 'Selection', glyph: 'Text and icons', line: 'Borders',
        focus: 'Focus', accent: 'Accent', fill: 'Buttons and controls', signal: 'Signals', overlay: 'Backdrop and shadows', constant: 'Black and white',
        content: 'File icons', scalar: 'Shape and effects',
    };
    var NAME_GROUPS = [
        ['Surfaces', /^(bg|sub-tab)-/],
        ['Text and icons', /^text-/],
        ['Borders', /^border-/],
        ['Accent', /^accent-/],
        ['Hover', /^(list-|toolbar-)?hover-/],
        ['Selection', /^(selected|active)-/],
        ['Signals', /^(success|error|warning|info|event|status|neutral)-/],
        ['Buttons and controls', /^(button|switch|scrollbar)-/],
        ['Backdrop and shadows', /^shadow-/],
        ['File icons', /^icon-/],
        ['Shape and effects', /^(radius|fx)-/],
    ];
    var NAME_PARTS = [
        ['GNB', /^gnb-/], ['Tab bar', /^tabbar-/], ['Side panel', /^side-/], ['Console', /^console-/], ['Tables', /^table-/], ['Inputs', /^field-/],
        ['Dialogs', /^dialog-/], ['Menus', /^menu-/], ['Tooltips', /^tooltip-/],
    ];
    var GROUPS = PART_ORDER.concat(Object.keys(KIND_GROUP).map(function (k) { return KIND_GROUP[k]; }).filter(function (g, i, a) { return a.indexOf(g) === i; }));

    function groupOf(aName, aToken) {
        if (aToken && (aToken.part || aToken.kind)) return aToken.part || KIND_GROUP[aToken.kind] || 'Other';
        var i;
        for (i = 0; i < NAME_PARTS.length; i++) if (NAME_PARTS[i][1].test(aName)) return NAME_PARTS[i][0];
        for (i = 0; i < NAME_GROUPS.length; i++) if (NAME_GROUPS[i][1].test(aName)) return NAME_GROUPS[i][0];
        return 'Other';
    }

    /** A value a theme may set: one declaration's worth, nothing that ends it or the rule. */
    var SAFE_VALUE = /^[^;{}<>\\]{1,200}$/;
    var SAFE_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

    function isSafeValue(aValue) {
        return typeof aValue === 'string' && SAFE_VALUE.test(aValue.trim());
    }

    // ---- stylesheets ---------------------------------------------------------------------

    /**
     * Names older themes set a color by that the web UI renamed (the same color, a new name): read as the
     * new name when a theme leaves that unset. A token merged into another is not here — its color was one
     * place's, and spreading it over everything the other token paints would recolor more than it did.
     */
    var RENAMED = {
        'dropdown-bg': 'menu-bg', 'dropdown-border': 'menu-border', 'dropdown-option-hover-bg': 'menu-item-hover-bg',
        'success-light': 'success-text', 'error-light': 'error-text',
    };

    /** The `--neo-*` variables a stylesheet sets (comments ignored; later wins; older names as above). */
    function parseCss(aCss) {
        var sVars = {};
        var sCode = String(aCss || '').replace(/\/\*[\s\S]*?\*\//g, '');
        var re = /--neo-([a-z0-9-]+)\s*:\s*([^;}]+)/g, m;
        while ((m = re.exec(sCode))) {
            if (SAFE_NAME.test(m[1]) && isSafeValue(m[2])) sVars[m[1]] = m[2].trim();
        }
        Object.keys(RENAMED).forEach(function (n) {
            if (n in sVars && !(RENAMED[n] in sVars)) sVars[RENAMED[n]] = sVars[n];
            delete sVars[n];
        });
        return sVars;
    }

    /** The stylesheet a theme is saved as: a comment, then its variables on :root in token order. */
    function toCss(aVars, aMeta, aOrder) {
        var sNames = Object.keys(aVars);
        if (aOrder) {
            var sRank = {};
            aOrder.forEach(function (n, i) { sRank[n] = i; });
            sNames.sort(function (a, b) { return (a in sRank ? sRank[a] : 1e6) - (b in sRank ? sRank[b] : 1e6); });
        }
        var sHead = ['/*', ' * ' + (aMeta.label || 'Theme') + ' — made with neo-pkg-theme-builder', ' * scheme ' + (aMeta.scheme || 'dark')];
        if (aMeta.roles) {
            var basics = ROLES.filter(function (d) { return d.group === 'Basics'; });
            sHead.push(' * ' + basics.map(function (d) { return d.label.toLowerCase() + ' ' + aMeta.roles[d.key]; }).join(' · '));
        }
        sHead.push(' */');
        var sBody = sNames
            .filter(function (n) { return SAFE_NAME.test(n) && isSafeValue(aVars[n]); })
            .map(function (n) { return '    --neo-' + n + ': ' + aVars[n].trim() + ';'; });
        return sHead.join('\n') + '\n:root {\n' + sBody.join('\n') + '\n}\n';
    }

    /** A file-safe id from a name: lower case, `a-z 0-9 -`, never empty. */
    function slug(aName) {
        var s = String(aName || '')
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 40);
        return s || 'theme';
    }

    /** `aId`, or `aId-2`, `aId-3`… — the first not in `aTaken`. */
    function uniqueId(aId, aTaken) {
        if (aTaken.indexOf(aId) < 0) return aId;
        for (var n = 2; ; n++) if (aTaken.indexOf(aId + '-' + n) < 0) return aId + '-' + n;
    }

    /** The colors the Theme dialog shows for a theme. */
    var SWATCH_TOKENS = ['bg-primary', 'bg-secondary', 'text-primary', 'accent-main', 'border-color-strong', 'success-main', 'error-main'];

    function swatchOf(aVars, aDefaults) {
        return SWATCH_TOKENS.map(function (n) { return toHex(aVars[n] || aDefaults[n]) || '#808080'; });
    }

    return {
        parseColor: parseColor,
        toHex: toHex,
        mix: mix,
        rgba: rgba,
        over: over,
        apartFromHover: apartFromHover,
        ICONS: ICONS,
        iconGrounds: iconGrounds,
        ICON_CONTRAST: ICON_CONTRAST,
        relationText: relationText,
        dependentsOf: dependentsOf,
        sourcesOf: sourcesOf,
        isRoot: isRoot,
        keepAlpha: keepAlpha,
        contrast: contrast,
        ROLES: ROLES,
        ROLE: ROLE,
        parentOf: parentOf,
        childrenOf: childrenOf,
        descendantsOf: descendantsOf,
        ROLE_GROUPS: ['Basics', 'GNB', 'Tab bar', 'Side panel', 'Console', 'Tables', 'Inputs', 'Dialogs', 'Menus', 'Tooltips', 'Surfaces', 'Text', 'Controls', 'Signals'],
        PART_GROUPS: PART_GROUPS,
        readableOn: readableOn,
        schemeOf: schemeOf,
        AREA_FALLBACK: AREA_FALLBACK,
        useFallbacks: useFallbacks,
        shownValue: shownValue,
        autoOf: autoOf,
        resolveRoles: resolveRoles,
        rolesOf: rolesOf,
        tokenBindings: tokenBindings,
        readTheme: readTheme,
        moveVars: moveVars,
        toOklch: toOklch,
        fromOklch: fromOklch,
        distance: distance,
        relation: relation,
        applyRelation: applyRelation,
        rolesFromSeeds: rolesFromSeeds,
        derive: derive,
        groupOf: groupOf,
        GROUPS: GROUPS.concat('Other'),
        isSafeValue: isSafeValue,
        parseCss: parseCss,
        toCss: toCss,
        slug: slug,
        uniqueId: uniqueId,
        swatchOf: swatchOf,
    };
});
