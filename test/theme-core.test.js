// node --test test/theme-core.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../theme-core.js');


test('colors: hex in all lengths and rgb()/rgba(); anything else is not a color', () => {
    assert.deepEqual(C.parseColor('#abc'), [170, 187, 204, 1]);
    assert.deepEqual(C.parseColor('#f1f1f125').slice(0, 3), [241, 241, 241]);
    assert.deepEqual(C.parseColor('rgba(255, 42, 74, 0.7)'), [255, 42, 74, 0.7]);
    assert.equal(C.parseColor('0 4px 6px rgba(0,0,0,.2)'), null);
    assert.equal(C.parseColor('transparent'), null);
    assert.equal(C.toHex('rgb(0, 108, 210)'), '#006cd2');
});

test('a color picker keeps the alpha the token had', () => {
    assert.equal(C.keepAlpha('#ff0000', 'rgba(1, 2, 3, 0.12)'), 'rgba(255, 0, 0, 0.12)');
    assert.equal(C.keepAlpha('#ff0000', '#00ff00'), '#ff0000');
});

test('contrast: black on white is 21, translucent text is laid over its background', () => {
    assert.equal(Math.round(C.contrast('#000000', '#ffffff')), 21);
    assert.ok(C.contrast('rgba(255, 255, 255, 0.1)', '#000000') < 2);
});

/** The dark screen's basics made light: a light frame, content and lines, dark text. */
const lightBasics = (aOwn) => ({ ...aOwn, frame: '#e4e6ee', surface: '#fafafa', ink: '#1f1f1f', line: '#9a9aa6' });

// the dark screen's roots (tokens/_colors.scss): the signals' fills carry white text
const DARK = { frame: '#1e1e1e', surface: '#252525', ink: '#f1f1f1', accent: '#005fb8', line: '#767676', success: '#37aa3b', error: '#ff5353', warning: '#d67f00' };

test('roles: each lands on its own token; an unset role follows its parent', () => {
    const r = C.resolveRoles(DARK, 'dark');
    const d = C.derive(r, 'dark');
    // a role drawn over a base (`under`) may land as a wash: it is the role's color over that base
    for (const role of C.ROLES) assert.equal(role.under ? C.toHex(C.over(d[role.token], r[role.under])) : d[role.token], r[role.key], role.key);
    // the Delete button follows Error — until given its own
    assert.equal(r.delete, DARK.error);
    const own = C.resolveRoles({ ...DARK, delete: '#aa0000' }, 'dark');
    assert.equal(own.delete, '#aa0000');
    assert.equal(own.errorText, C.resolveRoles(DARK, 'dark').errorText, 'error text (and the stopped dot) follows Error, not Delete');
    const split = C.resolveRoles({ ...DARK, errorText: '#123456' }, 'dark');
    assert.equal(split.error, DARK.error);
    assert.equal(split.errorText, '#123456');
    for (const v of Object.values(d)) assert.ok(C.isSafeValue(v), v);
});

test('roles: text on buttons is whichever reads best on the button, and the frame has no say in it', () => {
    assert.equal(C.resolveRoles(DARK, 'dark').onAccent, '#ffffff');
    // a bright button takes a deep shade of itself, not the frame color
    const cyan = C.resolveRoles({ ...DARK, accent: '#2de2e6' }, 'dark').onAccent;
    assert.ok(C.contrast(cyan, '#2de2e6') >= 7, cyan);
    assert.equal(C.resolveRoles({ ...DARK, accent: '#2de2e6', frame: '#7a1f5c' }, 'dark').onAccent, cyan);
});

test('roles: shadows and the backdrop are black in both schemes — Text does not tint them', () => {
    const l = C.derive(C.resolveRoles({ ...DARK, frame: '#efefef', surface: '#ffffff', ink: '#202040' }, 'light'), 'light');
    assert.match(l['shadow-xl'], /rgba\(0, 0, 0, /);
    assert.match(C.derive(C.resolveRoles(DARK, 'dark'), 'dark')['shadow-xl'], /rgba\(0, 0, 0, /);
});

test('Text moves glyphs, never a background, in every start', () => {
    const defaults = presetDefaults();
    const glyph = /(^|-)(text|icon)(-|$)|^status-none$|^neutral-main$/; // neutral-main: the copy button's icon
    for (const [name, scheme] of [['dark', 'dark'], ['light', 'light'], ['cyberpunk', 'dark'], ['aemeath', 'light']]) {
        const vars = name === 'dark' ? {} : C.parseCss(fs.readFileSync(path.join(__dirname, '..', 'presets', name + '.css'), 'utf8'));
        const start = C.readTheme(vars, defaults, scheme);
        start.defaults = defaults;
        const shown = (out) => Object.fromEntries(Object.keys(defaults).map((t) => [t, C.shownValue(t, { ...vars, ...out }, defaults)]));
        const before = shown(C.moveVars(start, start.own, scheme)), after = shown(C.moveVars(start, { ...start.own, ink: '#5a1020' }, scheme));
        const moved = Object.keys(after).filter((t) => after[t] !== before[t] && !glyph.test(t) && C.parseColor(after[t]));
        assert.deepEqual(moved, [], name + ': backgrounds moved with Text');
    }
});

// Hover is one category: what the pointer is over, on the content and in every part.
const HOVERS = ['hover-bg', 'list-hover-bg', 'toolbar-hover-bg', 'menu-item-hover-bg', 'scrollbar-hover-thumb', 'gnb-hover-bg', 'tabbar-hover-bg', 'side-hover-bg', 'console-hover-bg', 'table-row-hover-bg'];

// One hover everywhere (11/03, the user: "one change moves every hover, alike; a part can be customized").
const BG_HOVERS = ['hover-bg', 'list-hover-bg', 'toolbar-hover-bg', 'gnb-hover-bg', 'tabbar-hover-bg', 'side-hover-bg', 'console-hover-bg', 'table-row-hover-bg', 'menu-item-hover-bg'];
test('hover: untouched, every hover is the one neutral wash', () => {
    for (const scheme of ['dark', 'light']) {
        const r = C.resolveRoles(DARK, scheme), d = C.derive(r, scheme), f = scheme === 'light' ? '#000000' : '#ffffff';
        assert.equal(d['hover-bg'], C.rgba(f, 0.07));
        for (const t of BG_HOVERS) assert.equal(d[t], d['hover-bg'], scheme + ': ' + t);
    }
});

test('hover: given a color, every hover is that color — a customized part keeps its own', () => {
    for (const scheme of ['dark', 'light']) {
        const d = C.derive(C.resolveRoles({ ...DARK, hover: '#3f9fff' }, scheme), scheme);
        for (const t of BG_HOVERS) assert.equal(d[t], '#3f9fff', scheme + ': ' + t);
        const own = C.derive(C.resolveRoles({ ...DARK, hover: '#22aa55', tableRowHover: '#ff00aa' }, scheme), scheme);
        assert.equal(own['table-row-hover-bg'], '#ff00aa');
        for (const t of BG_HOVERS.filter((x) => x !== 'table-row-hover-bg')) assert.equal(own[t], '#22aa55', scheme + ': ' + t);
    }
});

test('hover: changing Hover moves every part\'s hover, and nothing else, in every start', () => {
    const defaults = presetDefaults();
    for (const [name, scheme] of [['dark', 'dark'], ['light', 'light'], ['cyberpunk', 'dark'], ['aemeath', 'light']]) {
        const vars = name === 'dark' ? {} : C.parseCss(fs.readFileSync(path.join(__dirname, '..', 'presets', name + '.css'), 'utf8'));
        const start = C.readTheme(vars, defaults, scheme);
        start.defaults = defaults;
        const shown = (out) => Object.fromEntries(Object.keys(defaults).map((t) => [t, C.shownValue(t, { ...vars, ...out }, defaults)]));
        const pink = C.mix(C.resolveRoles(start.own, scheme, start.rel).surface, '#ff3399', 0.25);
        const before = shown(C.moveVars(start, start.own, scheme)), after = shown(C.moveVars(start, { ...start.own, hover: pink }, scheme));
        const moved = Object.keys(after).filter((t) => after[t] !== before[t]);
        // file icons are kept readable on the rows and tabs they sit on, hovered ones included: they may follow
        assert.deepEqual(moved.filter((t) => !HOVERS.includes(t) && !t.startsWith('icon-')), [], name + ': only hovers move');
        // every background hover becomes the color Hover was given — the start's tuned ones included
        for (const t of BG_HOVERS) if (t in defaults) assert.equal(after[t], pink, name + ': ' + t);
    }
});

test('hover: Content moving keeps the start\'s hover — its wash, laid over the new Content', () => {
    const defaults = presetDefaults();
    for (const [name, scheme] of [['dark', 'dark'], ['light', 'light'], ['cyberpunk', 'dark'], ['aemeath', 'light']]) {
        const vars = name === 'dark' ? {} : C.parseCss(fs.readFileSync(path.join(__dirname, '..', 'presets', name + '.css'), 'utf8'));
        const start = C.readTheme(vars, defaults, scheme);
        start.defaults = defaults;
        const r = C.resolveRoles(start.own, scheme, start.rel);
        assert.equal(r.hover, C.toHex(C.over(C.shownValue('hover-bg', vars, defaults), r.surface)), name + ': Hover is the start\'s hover over Content');
        const shown = (out) => Object.fromEntries(Object.keys(defaults).map((t) => [t, C.shownValue(t, { ...vars, ...out }, defaults)]));
        const after = shown(C.moveVars(start, { ...start.own, surface: C.mix(r.surface, scheme === 'light' ? '#d0e8ff' : '#102040', 0.5) }, scheme));
        assert.equal(after['hover-bg'], C.shownValue('hover-bg', vars, defaults), name + ': the wash stays');
        // a part's hover over its moved background leans the same way (Cyberpunk stays cyan, not the base's red)
        const hue = (c) => C.toOklch(C.toHex(c))[2], wash = C.shownValue('hover-bg', vars, defaults);
        if (C.toOklch(C.toHex(wash))[1] >= 0.03) {
            const dh = Math.abs(hue(after['side-hover-bg']) - hue(wash));
            assert.ok(Math.min(dh, 360 - dh) < 60, name + ': side hover ' + after['side-hover-bg'] + ' leans like ' + wash);
        }
    }
});

// File icons under a light scheme: each keeps its color, only as deep as the theme's own panels, selected row and tabs need (2:1 at rest).
test('file icons: a light theme deepens them only as far as it needs, a dark one keeps the Material colors', () => {
    const defaults = presetDefaults();
    const icons = Object.keys(C.ICONS);
    for (const [name, scheme] of [['light', 'light'], ['aemeath', 'light']]) {
        const vars = C.parseCss(fs.readFileSync(path.join(__dirname, '..', 'presets', name + '.css'), 'utf8'));
        const start = C.readTheme(vars, defaults, scheme);
        start.defaults = defaults;
        const r = C.resolveRoles(start.own, scheme, start.rel), grounds = C.iconGrounds(r);
        for (const t of icons) for (const g of grounds) assert.ok(C.contrast(vars[t], g) >= C.ICON_CONTRAST, `${name}: ${t} ${vars[t]} on ${g}`);
        // a whiter page needs less: the same theme with white panels and rows gets lighter icons
        const white = { ...start.own, frame: '#f4f4f6', surface: '#ffffff', panel: '#ffffff', header: '#f4f4f6', raised: '#ffffff', hover: '#f2f2f2', selection: '#e6eefc' };
        const out = C.moveVars(start, white, scheme);
        const L = (c) => C.toOklch(c)[0];
        assert.ok(icons.every((t) => L(out[t]) >= L(vars[t])) && icons.some((t) => L(out[t]) > L(vars[t]) + 0.03), name + ': lighter on white');
    }
    // the dark screen and a dark theme write none; turning to light writes them
    const dark = C.readTheme({}, defaults, 'dark');
    dark.defaults = defaults;
    assert.deepEqual(Object.keys(C.moveVars(dark, dark.own, 'dark')).filter((t) => t.startsWith('icon-')), []);
    const lit = C.moveVars(dark, lightBasics(dark.own), 'light');
    assert.deepEqual(icons.filter((t) => !(t in lit)), [], 'turned to light, the icons are written');
});

// A dark Layer (and so dialogs) beside light panels: no color reads on both, and chasing both took the icons to black.
test('file icons: a dark Layer on a light theme leaves them their colors — deep enough for the panels, never black', () => {
    const defaults = presetDefaults();
    const icons = Object.keys(C.ICONS);
    const L = (c) => C.toOklch(c)[0];
    for (const name of ['light', 'aemeath']) {
        const vars = C.parseCss(fs.readFileSync(path.join(__dirname, '..', 'presets', name + '.css'), 'utf8'));
        const start = C.readTheme(vars, defaults, 'light');
        start.defaults = defaults;
        for (const raised of ['#a07a93', '#5d5998', '#2c2c2c']) {
            const own = { ...start.own, raised };
            const out = C.moveVars(start, own, 'light');
            const r = C.resolveRoles(own, 'light', start.rel);
            for (const t of icons) {
                assert.ok(L(out[t]) >= 0.41, `${name} raised ${raised}: ${t} ${out[t]} is not black`);
                for (const g of [r.sideBg, r.surface]) assert.ok(C.contrast(out[t], g) >= C.ICON_CONTRAST, `${name} raised ${raised}: ${t} ${out[t]} on ${g}`);
            }
        }
    }
});

// A part's colors are listed under the shared color each hangs on: one change there moves them all, and one part can be given its own.
test('every part color hangs on a shared color: Hover holds every part hover, Selection every selected row', () => {
    const parts = C.ROLES.filter((d) => C.PART_GROUPS.includes(d.group));
    for (const d of parts) {
        const p = C.parentOf(d.key);
        assert.ok(p && C.ROLE[p] && !C.PART_GROUPS.includes(C.ROLE[p].group), d.key + ' hangs on a shared color');
    }
    assert.deepEqual(C.childrenOf('hover').map((d) => d.key), C.ROLES.filter((d) => d.basis === 'hover').map((d) => d.key));
    assert.deepEqual(C.childrenOf('selection').map((d) => d.key), ['activeBg', 'sideActive', 'consoleActive', 'tableRowActive']);
    assert.equal(C.parentOf('hover'), null, 'a shared color hangs on nothing');
});

test('hover: turned to the other scheme, a hover leans the new way — not the start\'s wash', () => {
    const defaults = presetDefaults();
    const dark = C.readTheme({}, defaults, 'dark');
    dark.defaults = defaults;
    const out = C.moveVars(dark, lightBasics(dark.own), 'light');
    const shown = (t) => C.shownValue(t, out, defaults);
    assert.match(out['hover-bg'], /^rgba\(0, 0, 0, /, 'a light theme\'s hover darkens');
    const content = shown('bg-secondary');
    for (const t of ['side-hover-bg', 'tabbar-hover-bg', 'gnb-hover-bg']) {
        const under = { 'side-hover-bg': 'side-bg', 'tabbar-hover-bg': 'tabbar-bg', 'gnb-hover-bg': 'gnb-bg' }[t];
        assert.ok(C.toOklch(C.toHex(C.over(shown(t), shown(under))))[0] < C.toOklch(C.toHex(shown(under)))[0], t + ' is a step darker than its part');
    }
    assert.ok(content);
});

test('rolesOf: basics are the theme\'s own; the rest keep the step from the parent they name', () => {
    const defaults = { 'bg-primary': '#111111', 'bg-secondary': '#222222', 'text-primary': '#eeeeee', 'accent-main': '#0000ff', 'border-color-strong': '#444444', 'success-main': '#00ff00', 'warning-main': '#ffaa00', 'error-main': '#ff0000', 'button-danger-bg': '#ff0000', 'button-primary-bg': '#0000ff' };
    const { own, rel } = C.rolesOf({ 'button-danger-bg': '#990000' }, defaults, 'dark');
    for (const k of ['frame', 'surface', 'ink', 'accent', 'line', 'success', 'warning', 'error']) assert.ok(k in own, k);
    assert.ok(!('delete' in own) && rel.delete, 'the delete button hangs on Error');
    const r = C.resolveRoles(own, 'dark', rel);
    assert.equal(r.delete, '#990000', 'the relation reproduces the theme');
    const moved = C.resolveRoles({ ...own, error: '#00aaff' }, 'dark', rel);
    assert.notEqual(moved.delete, '#990000', 'and moves with Error');
});

test('relation: the same step from another base, alpha kept', () => {
    const rel = C.relation('#b3263a', '#a8233a');
    assert.equal(C.applyRelation('#a8233a', rel).toLowerCase(), '#b3263a');
    const green = C.toOklch(C.applyRelation('#1f9d55', rel));
    assert.ok(Math.abs(green[2] - C.toOklch('#1f9d55')[2]) < 5, 'the hue follows the new base');
    assert.match(C.applyRelation('#1f9d55', C.relation('rgba(168, 35, 58, 0.2)', '#a8233a')), /^rgba\(.*, 0\.2\)$/);
    const o = C.toOklch('#005fb8');
    assert.equal(C.fromOklch(o[0], o[1], o[2]), '#005fb8');
});

const presetDefaults = () => Object.fromEntries(JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'theme-tokens.json'), 'utf8')).map((t) => [t.name, t.dark]));
/** Tokens that are not Accent's: text, signals, fixed colors. Changing Accent must leave them be. */
const NOT_ACCENT = /^(selected-bg|side-selected-bg|console-selected-bg|table-row-selected-bg|text-(?!on-accent)|menu-item-text|menu-item-icon|tooltip-text|neutral-main|success|warning|error|event-match|button-danger-bg|status-|color-|scrollbar-thumb-light)/;
/** Accent's own tokens: none may keep the old accent. */
const ACCENT = /^(accent-(main|hover|light|dark)|button-primary-bg|border-color-(focus|active))/; // scrollbar-hover-thumb is the scrollbar's (gray on the dark screen), not Accent's;

test('Accent moves its own family and nothing else: text and signals stay, the family leaves the old accent', () => {
    const defaults = presetDefaults();
    for (const [name, scheme] of [['light', 'light'], ['cyberpunk', 'dark'], ['aemeath', 'light']]) {
        const vars = C.parseCss(fs.readFileSync(path.join(__dirname, '..', 'presets', name + '.css'), 'utf8'));
        const start = C.readTheme(vars, defaults, scheme);
        const same = C.moveVars(start, start.own, scheme);
        assert.deepEqual(same, vars, name + ': unchanged roles give the preset back');
        const out = C.moveVars(start, { ...start.own, accent: '#1f9d55' }, scheme);
        // Cyberpunk's hint text is cyan like its accent, Light's highlight is its accent blue: alike, not kin
        assert.deepEqual(Object.keys(out).filter((t) => NOT_ACCENT.test(t) && out[t] !== same[t]), [], name + ': moved with Accent');
        const oldAccent = C.toOklch(start.own.accent);
        const stuck = Object.keys(out).filter((t) => {
            if (!ACCENT.test(t)) return false;
            const o = C.toOklch(out[t]);
            if (!o || o[1] < 0.06) return false;
            let dh = Math.abs(o[2] - oldAccent[2]); if (dh > 180) dh = 360 - dh;
            return dh < 12;
        });
        assert.deepEqual(stuck, [], name + ': still the old accent');
    }
});

test('a color that only looks like the accent is not bound to it: a gray accent and gray table text', () => {
    const defaults = presetDefaults();
    const start = C.readTheme({}, defaults, 'dark');
    const own = { ...start.own, accent: '#c4c4c4' };
    // saved with every variable, then opened again
    const saved = C.readTheme({ ...defaults, ...C.moveVars(start, own, 'dark') }, defaults, 'dark', own);
    const same = C.moveVars(saved, saved.own, 'dark');
    const out = C.moveVars(saved, { ...saved.own, accent: '#00ff00' }, 'dark');
    assert.equal(out['accent-main'], '#00ff00');
    assert.deepEqual(Object.keys(out).filter((t) => NOT_ACCENT.test(t) && out[t] !== same[t]), []);
});

test('the eight seeds older builders saved come back as roles', () => {
    const own = C.rolesFromSeeds({ scheme: 'dark', surface: '#111111', panel: '#222222', ink: '#eeeeee', accent: '#0000ff', line: '#444444', success: '#00ff00', error: '#ff0000', warning: '#ffaa00' });
    assert.equal(own.frame, '#111111');
    assert.equal(own.surface, '#222222');
    assert.equal(C.rolesFromSeeds(null), null);
});

test('every role reads from a token the web UI has, and roles are in dependency order', () => {
    const tokens = new Set(Object.keys(C.derive(C.resolveRoles(DARK, 'dark'), 'dark')));
    const seen = new Set();
    for (const r of C.ROLES) {
        assert.ok(tokens.has(r.token), r.token);
        if (r.follow) assert.ok(seen.has(r.follow), r.key + ' follows ' + r.follow + ' before it is known');
        assert.ok(C.ROLE_GROUPS.includes(r.group), r.group);
        seen.add(r.key);
    }
});

test('parseCss reads the variables and nothing that could break out of them', () => {
    const v = C.parseCss('/* --neo-x: #000; */ :root { --neo-bg-primary: #fff; --neo-shadow-sm: 0 2px 2px rgba(0, 0, 0, 0.1);\n--neo-evil: red} body{x:y}; --other: 1; --neo-Bad: #000; }');
    assert.deepEqual(v, { 'bg-primary': '#fff', 'shadow-sm': '0 2px 2px rgba(0, 0, 0, 0.1)', evil: 'red' });
});

test('toCss → parseCss gives the same variables back, in token order', () => {
    const vars = { 'text-primary': '#eeeeee', 'bg-primary': '#111111', 'shadow-sm': '0 2px 2px rgba(0, 0, 0, 0.1)' };
    const css = C.toCss(vars, { label: 'Night', scheme: 'dark', roles: C.resolveRoles(DARK, 'dark') }, ['bg-primary', 'text-primary', 'shadow-sm']);
    assert.deepEqual(C.parseCss(css), vars);
    assert.ok(css.indexOf('--neo-bg-primary') < css.indexOf('--neo-text-primary'));
    assert.match(css, /frame #1e1e1e/);
});

test('the presets parse completely', () => {
    for (const f of ['light', 'cyberpunk', 'aemeath']) {
        const css = fs.readFileSync(path.join(__dirname, '..', 'presets', f + '.css'), 'utf8');
        const v = C.parseCss(css);
        assert.equal(Object.keys(v).length, new Set([...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/--neo-([a-z0-9-]+)\s*:/g)].map((m) => m[1])).size, f);
        assert.ok(Object.keys(v).length >= 60, f);
    }
});

test('the preset index names the preset files that exist', () => {
    const index = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'themes.json'), 'utf8'));
    assert.equal(index.length, 4); // Light, Cyberpunk, Aemeath, Cement 98
    for (const e of index) {
        assert.ok(fs.existsSync(path.join(__dirname, '..', e.stylesheet)), e.stylesheet);
        assert.ok(e.label && (e.scheme === 'light' || e.scheme === 'dark'));
        assert.equal(e.swatch.length, 7);
    }
});

test('ids: a slug, made unique', () => {
    assert.equal(C.slug('Plant Floor — 2nd!'), 'plant-floor-2nd');
    assert.equal(C.slug('야간'), 'theme');
    assert.equal(C.uniqueId('night', ['night', 'night-2']), 'night-3');
    assert.equal(C.uniqueId('day', ['night']), 'day');
});

test('groups cover every token name pattern', () => {
    // by name, for a web UI that does not say what its tokens are
    assert.equal(C.groupOf('bg-primary'), 'Surfaces');
    assert.equal(C.groupOf('menu-bg'), 'Menus');
    assert.equal(C.groupOf('dialog-border'), 'Dialogs');
    assert.equal(C.groupOf('color-white'), 'Other');
    assert.equal(C.groupOf('side-bg'), 'Side panel');
    assert.equal(C.groupOf('table-text'), 'Tables');
    for (const [n, g] of [['accent-main', 'Accent'], ['hover-bg', 'Hover'], ['list-hover-bg', 'Hover'], ['toolbar-hover-bg', 'Hover'], ['selected-bg', 'Selection'], ['active-bg', 'Selection'], ['button-primary-bg', 'Buttons and controls'], ['neutral-main', 'Signals'], ['sub-tab-active-bg', 'Surfaces']]) assert.equal(C.groupOf(n), g, n);
    // by what the web UI says: a part's own colors under the part, the rest under their kind
    const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'theme-tokens.json'), 'utf8'));
    const by = Object.fromEntries(tokens.map((t) => [t.name, C.groupOf(t.name, t)]));
    assert.equal(by['hover-bg'], 'Hover');
    assert.equal(by['selected-bg'], 'Selection');
    assert.equal(by['bg-backdrop'], 'Backdrop and shadows');
    assert.equal(by['menu-shadow'], 'Menus');
    assert.equal(by['color-black'], 'Black and white');
    assert.equal(by['text-icon'], 'Text and icons');
    for (const t of tokens) assert.ok(C.GROUPS.indexOf(by[t.name]) >= 0 && by[t.name] !== 'Other', t.name + ' → ' + by[t.name]);
});

// ---- parts of the screen (the web UI's area tokens) -------------------------------------------

const PART = /^(gnb|tabbar|side|console|table|field|dialog)-/;
/** What each part's tokens show under `vars`, as the web UI's fallbacks resolve them. */
const shownParts = (vars, defaults) => Object.fromEntries(Object.keys(C.AREA_FALLBACK).map((t) => [t, C.toHex(C.shownValue(t, vars, defaults)) + '/' + (C.parseColor(C.shownValue(t, vars, defaults)) || [0, 0, 0, 1])[3]]));

test('every part token is one the web UI has, falling back to a token it has', () => {
    const names = new Set(Object.keys(presetDefaults()));
    for (const [t, fb] of Object.entries(C.AREA_FALLBACK)) {
        assert.ok(names.has(t), t);
        assert.ok(names.has(fb), fb);
    }
    for (const t of names) if (PART.test(t)) assert.ok(t in C.AREA_FALLBACK, t + ' has no fallback here');
});

test('Frame changes the GNB, the tab bar, the console bar and the side panel\'s section bars — not the side panel', () => {
    const defaults = presetDefaults();
    for (const [name, scheme] of [['dark', 'dark'], ['light', 'light'], ['cyberpunk', 'dark'], ['aemeath', 'light']]) {
        const vars = name === 'dark' ? {} : C.parseCss(fs.readFileSync(path.join(__dirname, '..', 'presets', name + '.css'), 'utf8'));
        const start = C.readTheme(vars, defaults, scheme);
        const out = C.moveVars(start, { ...start.own, frame: '#7a1f5c' }, scheme);
        const before = shownParts(vars, defaults), after = shownParts({ ...vars, ...out }, defaults);
        // the section bars (OPEN EDITORS, EXPLORER) are drawn like the frame's bars, as on the dark screen
        for (const t of ['gnb-bg', 'tabbar-bg', 'console-bg', 'side-header-bg']) assert.notEqual(after[t], before[t], name + ': ' + t + ' stayed');
        // (the panel's icons sit on those bars: they may turn over to stay readable on them)
        for (const t of Object.keys(C.AREA_FALLBACK).filter((x) => /^side-/.test(x) && x !== 'side-header-bg' && x !== 'side-icon')) assert.equal(after[t], before[t], name + ': ' + t + ' moved with Frame');
        // the console's content — its log, the chosen task's lines and their text — is not the frame's
        for (const t of ['console-body-bg', 'console-selected-bg', 'console-text', 'console-text-muted']) assert.equal(after[t], before[t], name + ': ' + t + ' moved with Frame');
    }
});

test('a part keeps what it showed until something it hangs on moves', () => {
    const defaults = presetDefaults();
    for (const [name, scheme] of [['light', 'light'], ['cyberpunk', 'dark'], ['aemeath', 'light']]) {
        const vars = C.parseCss(fs.readFileSync(path.join(__dirname, '..', 'presets', name + '.css'), 'utf8'));
        const start = C.readTheme(vars, defaults, scheme);
        // a part the preset gives its own color (Light's gold markers) is its own; none other is written
        assert.deepEqual(Object.keys(C.moveVars(start, start.own, scheme)).filter((t) => PART.test(t) && !(t in vars)), [], name + ': part tokens written with nothing changed');
        // Content moves the side panel's background and the console body, not the frame parts
        const out = C.moveVars(start, { ...start.own, surface: scheme === 'light' ? '#fff3e6' : '#30201a' }, scheme);
        const before = shownParts(vars, defaults), after = shownParts({ ...vars, ...out }, defaults);
        assert.notEqual(after['side-bg'], before['side-bg'], name + ': side-bg');
        assert.notEqual(after['console-body-bg'], before['console-body-bg'], name + ': console-body-bg');
        for (const t of ['gnb-bg', 'tabbar-bg', 'console-bg']) assert.equal(after[t], before[t], name + ': ' + t + ' moved with Content');
    }
});

test('a part given its own color changes alone', () => {
    const defaults = presetDefaults();
    const start = C.readTheme({}, defaults, 'dark');
    const out = C.moveVars(start, { ...start.own, sideBg: '#203040' }, 'dark');
    // the row under the pointer is a shade of the panel and moves with it; the selected row is a
    // selection (it follows Selection); the section bars are the frame's; the panel's muted text
    // stays as readable on it as it was
    assert.deepEqual(Object.keys(out).filter((t) => !t.startsWith('side-')), []);
    assert.deepEqual(Object.keys(out).filter((t) => !['side-bg', 'side-hover-bg', 'side-text-muted'].includes(t)), []);
    assert.equal(out['side-bg'], '#203040');
    const kept = C.shownValue('side-text-muted', {}, defaults);
    assert.ok(C.contrast(out['side-text-muted'] || kept, '#203040') >= Math.max(3, C.contrast(kept, '#203040')));
});

test('a table row under the pointer is the table\'s own: Accent and the menus leave it, Content and Text move it', () => {
    const defaults = presetDefaults();
    for (const [name, scheme] of [['dark', 'dark'], ['light', 'light'], ['cyberpunk', 'dark'], ['aemeath', 'light']]) {
        const vars = name === 'dark' ? {} : C.parseCss(fs.readFileSync(path.join(__dirname, '..', 'presets', name + '.css'), 'utf8'));
        const start = C.readTheme(vars, defaults, scheme);
        const before = shownParts(vars, defaults);
        const hover = (own) => shownParts({ ...vars, ...C.moveVars(start, { ...start.own, ...own }, scheme) }, defaults)['table-row-hover-bg'];
        for (const k of ['accent', 'menu', 'menuHover', 'frame']) assert.equal(hover({ [k]: '#00ff00' }), before['table-row-hover-bg'], name + ': moved with ' + k);
        // (Content no longer moves its value: every hover is the one Hover, a wash laid over whatever is under it)
    }
});

// A background never moves a text color: Content, or a part's own background, changed alone leaves
// every text, icon and text token as it was (the contrast checks say when one no longer reads).
test('a background never moves a text color', () => {
    const defaults = presetDefaults();
    const TEXT_ROLE = /^(ink|muted|icon|disabled|link|onAccent|successText|warningText|errorText|statusNone)$|Text|Icon|Muted$/;
    const TEXT_TOKEN = /^(text-|accent-text$|success-text$|warning-text$|error-text$|status-none$|menu-item-text$|menu-item-icon$|tooltip-text$)|-(text|text-muted|text-inactive|icon|icon-active)$/;
    for (const name of ['dark', 'light', 'cyberpunk', 'aemeath']) {
        const scheme = name === 'light' || name === 'aemeath' ? 'light' : 'dark';
        const vars = name === 'dark' ? {} : C.parseCss(fs.readFileSync(path.join(__dirname, '..', 'presets', name + '.css'), 'utf8'));
        const start = C.readTheme(vars, defaults, scheme);
        const r0 = C.resolveRoles(start.own, scheme, start.rel), d0 = C.derive(r0, scheme);
        for (const [bg, value] of [['surface', '#fff4e0'], ['surface', '#3a2a4a'], ['dialogBg', '#23233a'], ['menu', '#f2f2f2'], ['sideBg', '#7a1f5c']]) {
            const own = { ...start.own, [bg]: value };
            const sch = bg === 'surface' ? C.schemeOf(value, scheme) : scheme;
            const r1 = C.resolveRoles(own, sch, start.rel), d1 = C.derive(r1, sch);
            for (const d of C.ROLES) if (TEXT_ROLE.test(d.key)) assert.equal(r1[d.key], r0[d.key], `${name}: ${bg} → ${value} moved ${d.key}`);
            for (const t of Object.keys(d0)) if (TEXT_TOKEN.test(t) && !/^icon-/.test(t)) assert.equal(d1[t], d0[t], `${name}: ${bg} → ${value} moved ${t}`);
        }
    }
});

test('text on buttons reads on the primary and on the delete button alike', () => {
    for (const button of ['#ffd84d', '#f2c94c', '#2de2e6', '#005fb8']) {
        const r = C.resolveRoles({ ...DARK, accent: button }, 'dark');
        assert.ok(Math.min(C.contrast(r.onAccent, r.button), C.contrast(r.onAccent, r.delete)) >= 3, button + ' → ' + r.onAccent);
    }
});

test('a step from a new base never runs past white or black, and a gray base keeps the value\'s hue', () => {
    const pale = C.relation('#7fe8ff', '#2de2e6');
    const o = C.toOklch(C.applyRelation('#ff9f1c', pale));
    assert.ok(o[0] < 0.97 && o[1] > 0.05, 'a pale step over orange stays a color, not white');
    const crimson = C.relation('#a8233a', '#8a8fb0');
    const g = C.toOklch(C.applyRelation('#707070', crimson)), want = C.toOklch('#a8233a')[2];
    let dh = Math.abs(g[2] - want); if (dh > 180) dh = 360 - dh;
    assert.ok(dh < 10, 'still crimson over a gray: ' + g[2]);
});

test('the console\'s selected line is a selection: it follows Selection, not the frame', () => {
    const r0 = C.resolveRoles(DARK, 'dark');
    assert.equal(C.ROLE.consoleActive.follow, 'selection');
    assert.equal(r0.consoleActive, r0.selection);
    assert.notEqual(C.resolveRoles({ ...DARK, selection: '#1f9d55' }, 'dark').consoleActive, r0.consoleActive);
    assert.equal(C.resolveRoles({ ...DARK, frame: '#7a1f5c' }, 'dark').consoleActive, r0.consoleActive);
});

test('a selected row is a selection in every part, and a row under the pointer a shade of its own part', () => {
    const r0 = C.resolveRoles(DARK, 'dark');
    for (const k of ['sideActive', 'consoleActive']) assert.equal(C.ROLE[k].follow, 'selection', k);
    // Selection is a color of its own: Accent and Content leave every selected row; Selection moves them all
    for (const change of [{ accent: '#1f9d55' }, { surface: '#3a2a4a' }]) {
        const moved = C.resolveRoles({ ...DARK, ...change }, 'dark');
        for (const k of ['sideActive', 'consoleActive', 'tableRowActive', 'selection']) assert.equal(moved[k], r0[k], k + ' moved with ' + Object.keys(change)[0]);
    }
    const green = C.resolveRoles({ ...DARK, selection: '#1f9d55' }, 'dark');
    for (const k of ['sideActive', 'consoleActive', 'tableRowActive']) assert.equal(green[k], '#1f9d55', k + ' follows Selection');
    for (const k of ['sideHover', 'tableRowHover']) assert.equal(green[k], r0[k], k + ' moved with Selection');
    assert.ok(C.isRoot('selection'), 'Selection is the theme\'s own, like the signals');
});

test('content\'s deep background (canvas) and a disabled field follow their own kind, never the frame', () => {
    const r0 = C.resolveRoles(DARK, 'dark');
    // the canvas is Content's color, listed under it (no row of its own)
    assert.equal(C.parentOf('canvas'), 'surface');
    assert.equal(r0.canvas, r0.surface);
    // from Dark, the web UI keeps drawing it as it did (bg-primary's #1e1e1e) until Content changes it
    const defaults = presetDefaults();
    const dark = C.readTheme({}, defaults, 'dark');
    assert.equal(C.moveVars(dark, { ...dark.own, accent: '#1f9d55' }, 'dark')['bg-canvas'], undefined, 'Accent writes no canvas');
    assert.equal(C.moveVars(dark, { ...dark.own, frame: '#7a1f5c' }, 'dark')['bg-canvas'], '#1e1e1e', 'Frame leaves the canvas as it was');
    assert.equal(C.moveVars(dark, { ...dark.own, surface: '#30201a' }, 'dark')['bg-canvas'], '#30201a', 'Content moves it');
    const framed = C.resolveRoles({ ...DARK, frame: '#7a1f5c' }, 'dark');
    for (const k of ['canvas', 'fieldDisabled', 'menuHover', 'tableRowHover', 'sideHover']) assert.equal(framed[k], r0[k], k + ' moved with Frame');
    assert.notEqual(C.resolveRoles({ ...DARK, surface: '#30201a' }, 'dark').canvas, r0.canvas, 'the canvas is content');
    const accent = C.resolveRoles({ ...DARK, accent: '#1f9d55' }, 'dark');
    for (const k of ['menuHover', 'tableRowHover', 'sideHover', 'scrollbar']) assert.equal(accent[k], r0[k], k + ' (a hover is a shade of its part) moved with Accent');
});

// Sub text is helper text (counts, notes, the server version): it moves those alone. A table's column
// names are its titles and follow Text; the main text of a part (values, log lines, a dialog's body,
// the other tabs' names) is worked out from Text alone.
test('sub text moves helper text only: column names follow Text, a part\'s main text comes from Text', () => {
    const base = C.resolveRoles(DARK, 'dark');
    const icon = C.resolveRoles({ ...DARK, icon: '#ff00ff' }, 'dark');
    assert.equal(icon.sideIcon, '#ff00ff', 'the side panel icons follow Icons');
    assert.equal(icon.fieldIcon, '#ff00ff', 'an input\'s icons follow Icons');
    assert.equal(icon.sideTextMuted, base.sideTextMuted, 'the server version does not move with Icons');
    assert.equal(icon.tableHeaderText, base.tableHeaderText, 'column names do not move with Icons');
    const sub = C.resolveRoles({ ...DARK, muted: '#8899aa' }, 'dark');
    assert.equal(sub.sideTextMuted, '#8899aa', 'the server version is sub text');
    for (const k of ['tableHeaderText', 'consoleTextMuted', 'tabbarTextInactive']) assert.equal(sub[k], base[k], k + ' moved with Sub text');
    assert.equal(C.ROLE.tableHeaderText.follow, 'ink');
    const d0 = C.derive(base, 'dark'), d1 = C.derive(sub, 'dark');
    assert.deepEqual(Object.keys(d1).filter((t) => d1[t] !== d0[t]).sort(), ['side-text-muted', 'text-disabled', 'text-muted']);
    assert.equal(C.AREA_FALLBACK['side-text-muted'], 'text-muted');
    assert.equal(C.AREA_FALLBACK['table-header-text'], 'text-muted');
});

test('light or dark is the content color\'s: whichever of black and white reads better on it', () => {
    assert.equal(C.schemeOf('#252525'), 'dark');
    assert.equal(C.schemeOf('#f0f2fb'), 'light');
    assert.equal(C.schemeOf('#1b0c11'), 'dark');
    assert.equal(C.schemeOf('#f7f7fc'), 'light');
    assert.equal(C.schemeOf(undefined, 'light'), 'light', 'no content color: the start\'s');
    for (const e of JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'themes.json'), 'utf8'))) {
        const vars = C.parseCss(fs.readFileSync(path.join(__dirname, '..', e.stylesheet), 'utf8'));
        assert.equal(C.schemeOf(vars['bg-secondary']), e.scheme, e.label);
    }
});

test('a menu set under its older dropdown-* names reads as the menu-* ones; the presets set only names the web UI reads', () => {
    assert.deepEqual(C.parseCss(':root { --neo-dropdown-bg: #123456; --neo-dropdown-border: #222222; --neo-dropdown-option-hover-bg: #333333; }'), {
        'menu-bg': '#123456',
        'menu-border': '#222222',
        'menu-item-hover-bg': '#333333',
    });
    assert.deepEqual(C.parseCss(':root { --neo-dropdown-bg: #123456; --neo-menu-bg: #654321; }'), { 'menu-bg': '#654321' }, 'the menu-* name wins');
    const known = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'theme-tokens.json'), 'utf8')).map((t) => t.name));
    for (const name of ['light', 'cyberpunk', 'aemeath']) {
        const css = fs.readFileSync(path.join(__dirname, '..', 'presets', name + '.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
        const set = [...css.matchAll(/--neo-([a-z0-9-]+)\s*:/g)].map((m) => m[1]);
        assert.deepEqual(set.filter((n) => !known.has(n)), [], name);
    }
});

test('icons, disabled text and sub text are three roles: Icons moves only icons, and sub text is never fainter than the icons', () => {
    const base = C.resolveRoles(DARK, 'dark');
    assert.equal(C.ROLE.icon.token, 'text-icon');
    assert.equal(C.ROLE.disabled.token, 'text-disabled');
    assert.equal(C.ROLE.muted.label, 'Sub text');
    const icon = C.resolveRoles({ ...DARK, icon: '#ff00ff' }, 'dark');
    assert.equal(icon.disabled, base.disabled, 'disabled text does not move with Icons');
    assert.equal(icon.muted, base.muted);
    for (const scheme of ['dark', 'light']) {
        const r = C.resolveRoles(DARK, scheme);
        assert.ok(C.contrast(r.muted, r.surface) >= C.contrast(r.icon, r.surface) - 0.01, scheme);
    }
    for (const k of ['gnb-icon', 'side-icon', 'console-icon']) assert.equal(C.AREA_FALLBACK[k], 'text-icon', k);
});

test('a signal as text and the accent as text read on the content; the fills stay theirs', () => {
    for (const scheme of ['dark', 'light']) {
        const r = C.resolveRoles({ ...DARK, success: '#ccff00', warning: '#ffee00', error: '#ff8888', accent: '#99ccff' }, scheme);
        for (const k of ['successText', 'warningText', 'errorText', 'link']) assert.ok(C.contrast(r[k], r.surface) >= 4.5 - 0.01, scheme + ' ' + k);
        const d = C.derive(r, scheme);
        assert.equal(d['warning-main'], r.warning);
        assert.equal(d['warning-text'], r.warningText);
        assert.equal(d['accent-text'], r.link);
    }
});

test('older names read as the ones the web UI has now', () => {
    assert.deepEqual(C.parseCss(':root { --neo-success-light: #111111; --neo-error-light: #222222; }'), { 'success-text': '#111111', 'error-text': '#222222' });
    assert.deepEqual(C.parseCss(':root { --neo-success-light: #111111; --neo-success-text: #555555; }'), { 'success-text': '#555555' }, 'the new name wins');
    // a merged token is not renamed: its one place's color must not spread over what the other token paints
    assert.deepEqual(C.parseCss(':root { --neo-text-hint: #333333; --neo-bg-tab-active: #444444; }'), { 'text-hint': '#333333', 'bg-tab-active': '#444444' });
});

test('the presets: muted text no fainter than 4.5 or the icons, the warning fill carries white text, its text reads on the content', () => {
    for (const name of ['light', 'cyberpunk', 'aemeath']) {
        const v = C.parseCss(fs.readFileSync(path.join(__dirname, '..', 'presets', name + '.css'), 'utf8'));
        const bg = v['bg-secondary'];
        assert.ok(C.contrast(v['text-muted'], bg) >= Math.min(4.5, C.contrast(v['text-icon'], bg)) - 0.01, name + ' muted');
        assert.ok(C.contrast(v['warning-text'], bg) >= 4.5, name + ' warning text');
        assert.ok(C.contrast(v['text-on-accent'], v['warning-main']) >= 4.5, name + ' text on the warning fill');
        for (const k of ['text-icon', 'accent-text', 'warning-text', 'success-text', 'error-text']) assert.ok(v[k], name + ' sets ' + k);
    }
});

test('the built-in fallbacks are the web UI\'s (theme-tokens.json `fallback`), and the web UI\'s replace them when it says', () => {
    const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'theme-tokens.json'), 'utf8'));
    const web = Object.fromEntries(tokens.filter((t) => t.fallback).map((t) => [t.name, t.fallback]));
    assert.deepEqual({ ...C.AREA_FALLBACK }, web);
    // a light theme that sets only the frame: the section headers show the frame, not the dark default
    const defaults = Object.fromEntries(tokens.map((t) => [t.name, t.dark]));
    assert.equal(C.shownValue('bg-header', { 'bg-primary': '#e0e4f0' }, defaults), '#e0e4f0');
});

// What a row says is what its box shows: "follows X" alone only when it is X's color. A start that
// draws a follower as a shade of X (Light's markers, a deeper gold than its Accent) says which shade.
test('a following color is called X\'s only when it is X\'s color; a shade says so', () => {
    const defaults = presetDefaults();
    for (const name of ['dark', 'light', 'cyberpunk', 'aemeath']) {
        const scheme = name === 'light' || name === 'aemeath' ? 'light' : 'dark';
        const vars = name === 'dark' ? {} : C.parseCss(fs.readFileSync(path.join(__dirname, '..', 'presets', name + '.css'), 'utf8'));
        const start = C.readTheme(vars, defaults, scheme);
        for (const own of [start.own, { ...start.own, accent: '#ffbb00', surface: scheme === 'light' ? '#fff4e0' : '#3a2a4a' }]) {
            const r = C.resolveRoles(own, scheme, start.rel);
            for (const d of C.ROLES) {
                if (!d.follow || d.key in own) continue;
                const words = C.relationText(d.key, r, { start: name === 'dark' ? null : name });
                const same = C.distance(r[d.key], r[d.follow]) < 0.02;
                assert.equal(words === 'follows ' + C.ROLE[d.follow].label, same, `${name}: ${d.key} ${r[d.key]} vs ${d.follow} ${r[d.follow]} — "${words}"`);
            }
        }
    }
    assert.equal(C.relationText('tableRowHover', {}, { own: true }), 'custom');
});

// From Dark, Content moves everything that is the content's color: the side panel and the panels with the editors.
test('Content moves the side panel, the panels and the console body with the editors', () => {
    const own = { ...DARK, surface: '#3a2a4a' };
    const r = C.resolveRoles(own, 'dark');
    for (const k of ['panel', 'sideBg', 'consoleBodyBg']) assert.equal(r[k], '#3a2a4a', k);
    for (const k of ['panel', 'sideBg', 'consoleBodyBg']) assert.equal(C.ROLE[k].follow, 'surface', k + ' follows Content');
    assert.equal(C.parentOf('sideBg'), 'surface', 'the side panel\'s background is listed as following Content');
    // light content from Dark: the same — no step of its own for the panels
    const l = C.resolveRoles({ ...DARK, surface: '#fff4e0' }, 'light');
    assert.equal(l.panel, '#fff4e0');
    assert.equal(l.sideBg, '#fff4e0');
});

// A customized part keeps its color when its shared color moves; the other parts follow.
test('a customized part stays when its shared color moves; the others follow it', () => {
    const r0 = C.resolveRoles(DARK, 'dark');
    const own = { ...DARK, tableRowHover: r0.tableRowHover, hover: '#553377' };
    const r = C.resolveRoles(own, 'dark');
    assert.equal(r.tableRowHover, r0.tableRowHover, 'the table hover is its own');
    for (const k of ['gnbHover', 'sideHover', 'menuHover']) assert.equal(r[k], '#553377', k + ' follows Hover');
});

// Changing a root color changes the shared colors listed on its row, and a worked-out color names its roots.
test('a root color lists what it moves; a worked-out color names where it comes from', () => {
    const deps = C.dependentsOf('accent', DARK, 'dark');
    for (const k of ['button', 'focus', 'link']) assert.ok(deps.includes(k), 'Accent moves ' + k);
    for (const k of ['muted', 'raised', 'successText', 'selection']) assert.ok(!deps.includes(k), 'Accent leaves ' + k);
    assert.deepEqual(C.sourcesOf('hover', DARK, 'dark'), ['surface']);
    assert.equal(C.relationText('hover', C.resolveRoles(DARK, 'dark'), { sources: C.sourcesOf('hover', DARK, 'dark') }), 'from Content');
    // a customized shared color is its own: Content no longer lists it
    assert.ok(!C.dependentsOf('surface', { ...DARK, hover: '#334455' }, 'dark').includes('hover'));
});

// One color, one kind of thing: the focus outline moves outlines only; the line marking what is open
// (the console's tab, a page's tab) is the accent's, as the tab bar's and GNB's markers are.
test('the focus outline moves focus outlines only; the line marking what is open follows Accent', () => {
    const r0 = C.resolveRoles(DARK, 'dark'), d0 = C.derive(r0, 'dark');
    assert.equal(d0['border-color-active'], DARK.accent, 'the dark screen draws it in the accent');
    const f = C.derive(C.resolveRoles({ ...DARK, focus: '#ff00ff' }, 'dark'), 'dark');
    assert.deepEqual(Object.keys(f).filter((t) => f[t] !== d0[t]), ['border-color-focus']);
    const a = C.derive(C.resolveRoles({ ...DARK, accent: '#1f9d55' }, 'dark'), 'dark');
    assert.equal(a['border-color-active'], '#1f9d55');
    assert.equal(C.ROLE.focus.label, 'Focus outline');
});

// A color that is another's color is listed under it (Section headers under Frame, Drawers and the
// open tab under Content); only a color of its own or one worked out by a formula has a row of its own.
test('a color that follows another is listed under it; the groups hold only colors of their own or worked out', () => {
    assert.equal(C.parentOf('header'), 'frame');
    assert.equal(C.parentOf('panel'), 'surface');
    const under = (k) => C.descendantsOf(k).map((d) => d.key);
    for (const k of ['header', 'gnbBg', 'tabbarBg', 'consoleBg']) assert.ok(under('frame').includes(k), 'Frame lists ' + k);
    for (const k of ['panel', 'sideBg', 'tabbarActiveBg', 'consoleBodyBg']) assert.ok(under('surface').includes(k), 'Content lists ' + k);
    for (const k of ['link', 'button', 'focus', 'gnbMarker', 'tabbarMarker']) assert.ok(under('accent').includes(k), 'Accent lists ' + k);
    for (const d of C.ROLES) if (!C.parentOf(d.key)) assert.ok(!d.follow, d.key + ' has a row of its own but only follows ' + d.follow);
    // the open tab is the content's color on the dark screen, and its own token in the web UI
    const r = C.resolveRoles({ ...DARK, surface: '#3a2a4a' }, 'dark');
    assert.equal(r.tabbarActiveBg, '#3a2a4a');
    assert.equal(C.derive(r, 'dark')['tabbar-active-bg'], '#3a2a4a');
});

// Signals are colors of their own; a status fill is Success's; the open sub-tab is the content's — Accent moves none of them.
test('Accent leaves Info, the status fill and the open sub-tab', () => {
    assert.ok(C.isRoot('info'), 'Info is a signal of its own');
    const d0 = C.derive(C.resolveRoles({ ...DARK, info: '#005fb8' }, 'dark'), 'dark');
    const a = C.derive(C.resolveRoles({ ...DARK, info: '#005fb8', accent: '#1f9d55' }, 'dark'), 'dark');
    for (const t of ['info-main', 'success-fill', 'sub-tab-active-bg']) assert.equal(a[t], d0[t], t + ' moved with Accent');
    const s = C.derive(C.resolveRoles({ ...DARK, success: '#00aa88' }, 'dark'), 'dark');
    assert.equal(s['success-fill'], '#00aa88', 'the status fill follows Success');
    assert.equal(C.ROLE.neutralButton.label, 'Neutral');
    // a chip is a shape: its colors are the families', the gray one beside the signals
    assert.equal(C.ROLE.neutralButton.group, 'Signals');
});

// One line color: changing Borders makes every resting line that color — dividers, cards, menus,
// dialogs, inputs — and the stronger line (an input under the pointer) a step from it.
test('Borders is every resting line; the input border follows it until customized', () => {
    const r = C.resolveRoles({ ...DARK, line: '#7a5a3a' }, 'dark'), d = C.derive(r, 'dark');
    for (const t of ['border-color-default', 'field-border', 'menu-border', 'dialog-border']) assert.equal(d[t], '#7a5a3a', t);
    assert.notEqual(d['border-color-strong'], '#7a5a3a', 'the stronger line is a step from it');
    assert.equal(C.ROLE.line.token, 'border-color-default', 'Borders is the line the screen shows');
    assert.equal(C.parentOf('fieldBorder'), 'line');
    const own = C.derive(C.resolveRoles({ ...DARK, line: '#7a5a3a', fieldBorder: '#335577' }, 'dark'), 'dark');
    assert.equal(own['field-border'], '#335577', 'a customized input border keeps its color');
    // the dark screen reads the line over the content: the 13% white it draws
    const dark = C.readTheme({}, presetDefaults(), 'dark');
    assert.equal(dark.own.line, C.toHex(C.over('rgba(255, 255, 255, 0.13)', '#252525')));
});

test('the basics hold the two state colors too: Hover and Selection', () => {
    const basics = C.ROLES.filter((d) => d.group === 'Basics').map((d) => d.key);
    assert.deepEqual(basics, ['frame', 'surface', 'ink', 'accent', 'line', 'hover', 'selection']);
    assert.ok(!C.isRoot('hover'), 'Hover is worked out from Content until set');
    assert.ok(C.isRoot('selection'), 'Selection is a color of its own');
});

// From Dark, a follower within a hair of its color is that color: the input border (14.5% white where
// the lines are 13%) becomes exactly the new Borders. A step a theme took on purpose stays.
test('from Dark, changing Borders leaves every line one color; a preset\'s own step stays', () => {
    const defaults = presetDefaults();
    const dark = C.readTheme({}, defaults, 'dark');
    const out = C.moveVars(dark, { ...dark.own, line: '#c08040' }, 'dark');
    // what the web UI shows for each (a part token left unset shows its fallback)
    for (const t of ['border-color-default', 'field-border', 'menu-border', 'dialog-border']) assert.equal(C.toHex(C.shownValue(t, out, defaults)), '#c08040', t);
    const cyber = C.readTheme(C.parseCss(fs.readFileSync(path.join(__dirname, '..', 'presets', 'cyberpunk.css'), 'utf8')), defaults, 'dark');
    assert.ok(cyber.rel.fieldBorder && cyber.rel.fieldBorder.rel, 'Cyberpunk\'s input border is its own step from its lines');
});

test('a Borders change draws no border where the dark screen has none (tooltips)', () => {
    const dark = C.readTheme({}, presetDefaults(), 'dark');
    const out = C.moveVars(dark, { ...dark.own, line: '#c08040' }, 'dark');
    const r = C.resolveRoles({ ...dark.own, line: '#c08040' }, 'dark', dark.rel);
    const tb = C.shownValue('tooltip-border', out, presetDefaults());
    assert.ok(tb === 'transparent' || C.toHex(tb) === C.toHex(r.tooltip), 'tooltip border stays invisible: ' + tb);
});

// An icon follows Icons, the GNB's active one too (the icons' brighter step); Text moves text.
test('the GNB\'s active icon follows Icons, not Text', () => {
    assert.equal(C.ROLE.gnbIconActive.follow, 'icon');
    // Icons is worked out from Text, so Text reaches it only through Icons: with Icons set, Text leaves it
    const own = { ...DARK, icon: '#818181' };
    const base = C.resolveRoles(own, 'dark');
    assert.equal(C.resolveRoles({ ...own, ink: '#ff00ff' }, 'dark').gnbIconActive, base.gnbIconActive, 'Text left it');
    assert.equal(C.resolveRoles({ ...own, icon: '#ff00ff' }, 'dark').gnbIconActive, '#ff00ff', 'Icons moves it');
});

// The console's tab names are their own: the log lines' color leaves the header be, and the other way round.
test('the console\'s tab names and its log lines are two colors', () => {
    const base = C.resolveRoles(DARK, 'dark');
    const logs = C.resolveRoles({ ...DARK, consoleTextMuted: '#ff00ff' }, 'dark');
    assert.equal(logs.consoleTabText, base.consoleTabText, 'the tab names did not move with the log lines');
    assert.equal(C.derive(logs, 'dark')['console-tab-text'], C.derive(base, 'dark')['console-tab-text']);
    const sel = C.resolveRoles({ ...DARK, consoleText: '#ff00ff' }, 'dark');
    assert.equal(sel.consoleTabText, base.consoleTabText, 'nor with the selected task\'s lines');
    assert.equal(C.AREA_FALLBACK['console-tab-text'], 'console-text-muted');
});
test('from Dark, customizing the log lines writes the tab names as they were, never an empty value', () => {
    const defaults = presetDefaults();
    const dark = C.readTheme({}, defaults, 'dark');
    const vars = C.moveVars(dark, { ...dark.own, consoleTextMuted: '#ff00ff' }, 'dark');
    assert.equal(vars['console-text-muted'], '#ff00ff');
    assert.equal(vars['console-tab-text'], defaults['console-tab-text'], 'the tab names keep their color');
    for (const [t, v] of Object.entries(vars)) assert.ok(v != null, t + ' is written with a value');
    // a start read without the web UI's defaults (the builder once dropped them) writes nothing empty either
    const bare = C.moveVars({ ...dark, defaults: undefined }, { ...dark.own, consoleTextMuted: '#ff00ff' }, 'dark');
    for (const [t, v] of Object.entries(bare)) assert.ok(v != null, t + ' is written with a value');
});
test('a dialog\'s title is its own color; its other words are the page\'s text', () => {
    const base = C.resolveRoles(DARK, 'dark');
    assert.equal(C.parentOf('dialogTitle'), 'ink', 'the title follows Text');
    const title = C.derive(C.resolveRoles({ ...DARK, dialogTitle: '#ff00ff' }, 'dark'), 'dark');
    assert.equal(title['dialog-title-text'], '#ff00ff');
    assert.equal(title['text-primary'], C.derive(base, 'dark')['text-primary'], 'the words did not move with the title');
    assert.equal(C.AREA_FALLBACK['dialog-title-text'], 'text-primary');
});
// The side panel's bars are Section headers' color in the web UI (side-header-bg falls back to bg-header):
// one row, not a second "Side panel · Section headers" that paints the same bars.
test('Section headers is one color: it moves the side panel\'s bars, and nothing else is listed for them', () => {
    const same = C.ROLES.filter((d) => d.label === 'Section headers');
    assert.deepEqual(same.map((d) => d.key), ['header']);
    const r = C.resolveRoles({ ...DARK, header: '#3a2a4a' }, 'dark');
    const v = C.derive(r, 'dark');
    assert.equal(v['bg-header'], '#3a2a4a');
    assert.equal(v['side-header-bg'], '#3a2a4a');
    assert.equal(C.AREA_FALLBACK['side-header-bg'], 'bg-header');
});
// A part's colors are named from one list (DEVELOPMENT.md, "Adding a part"): a new part reuses the names,
// and a name of its own is only for what no other part has.
test('a part\'s colors are named from the one list', () => {
    const SLOTS = ['Background', 'Header', 'Text', 'Sub text', 'Icons', 'Active icon', 'Active indicator', 'Hover background', 'Selected row', 'Selected line', 'Border', 'Disabled background'];
    const OWN = { Inputs: ['Error border'], Dialogs: ['Title'], Console: ['Log lines', 'Tab names', 'Selected line text'], Tables: ['Header text', 'Row numbers', 'Striped rows'], 'Tab bar': ['Active tab text', 'Active tab background', 'Inactive tab text'] };
    for (const d of C.ROLES) {
        if (!C.PART_GROUPS.includes(d.group)) continue;
        assert.ok(SLOTS.includes(d.label) || (OWN[d.group] || []).includes(d.label), d.group + ' · ' + d.label + ' is not a name from the list');
    }
    // every group the builder knows is shown: no group is left empty
    for (const g of C.ROLE_GROUPS) {
        if (C.PART_GROUPS.includes(g)) continue;
        assert.ok(C.ROLES.some((d) => d.group === g && !C.parentOf(d.key)), g + ' shows no row: its colors all sit under another color');
    }
    assert.ok(!C.ROLE_GROUPS.includes('States'), 'the state colors are basics (Hover, Selection) or follow one (Focus outline)');
    assert.equal(C.ROLE.onAccent.group, 'Text', 'text on a fill is a text color');
    // a group is named for what it shows: the buttons sit under their colors, so it is Controls (Scrollbar)
    assert.ok(!C.ROLE_GROUPS.includes('Buttons and controls'));
    assert.deepEqual(C.ROLES.filter((d) => d.group === 'Controls' && !C.parentOf(d.key)).map((d) => d.label), ['Scrollbar']);
});
// The console's tab line is the console's own, as the GNB's and the tab bar's are: under Accent, customizable alone.
test('the console\'s active indicator follows Accent and can be its own', () => {
    assert.equal(C.parentOf('consoleMarker'), 'accent');
    const base = C.resolveRoles(DARK, 'dark');
    assert.equal(base.consoleMarker, base.accent);
    const own = C.derive(C.resolveRoles({ ...DARK, consoleMarker: '#ff00ff' }, 'dark'), 'dark');
    assert.equal(own['console-marker'], '#ff00ff');
    for (const t of ['gnb-marker', 'tabbar-marker', 'border-color-active', 'accent-main']) assert.equal(own[t], C.derive(base, 'dark')[t], t + ' moved with the console\'s line');
    assert.equal(C.AREA_FALLBACK['console-marker'], 'border-color-active');
});
// A dialog says everything but its title in one color: its body, labels and notes are its text (dialog-text).
test('a dialog has a title of its own; menus, inputs and tables write in the page\'s text', () => {
    assert.deepEqual(C.ROLES.filter((d) => d.group === 'Dialogs').map((d) => d.label), ['Background', 'Title']);
    assert.ok(!('dialog-text-muted' in C.derive(C.resolveRoles(DARK, 'dark'), 'dark')));
    assert.ok(!C.AREA_FALLBACK['dialog-text-muted']);
    for (const t of ['dialog-text', 'menu-item-text', 'field-text', 'table-text']) assert.ok(!(t in C.derive(C.resolveRoles(DARK, 'dark'), 'dark')), t + ' is gone: the shared text is it');
    for (const g of ['Menus', 'Inputs', 'Tables']) assert.ok(!C.ROLES.some((d) => d.group === g && d.label === 'Text'), g + ' has no text of its own');
});

// "Header text 를 바꾸면 행 번호도 바뀐다" (11/06): the row numbers are a token of their own, so a table's
// column names and its row numbers are changed apart; both hang on Text, so Text still moves them together.
test('a table\'s row numbers are their own: the column names\' color leaves them be, Text moves both', () => {
    const base = C.derive(C.resolveRoles({ ...DARK }, 'dark'), 'dark');
    assert.equal(base['table-row-number-text'], base['table-header-text']);
    const header = C.derive(C.resolveRoles({ ...DARK, tableHeaderText: '#ff0000' }, 'dark'), 'dark');
    assert.equal(header['table-header-text'], '#ff0000');
    assert.equal(header['table-row-number-text'], base['table-row-number-text']);
    const numbers = C.derive(C.resolveRoles({ ...DARK, tableRowNumber: '#00ff00' }, 'dark'), 'dark');
    assert.equal(numbers['table-row-number-text'], '#00ff00');
    assert.equal(numbers['table-header-text'], base['table-header-text']);
    const text = C.derive(C.resolveRoles({ ...DARK, ink: '#ffe0a0' }, 'dark'), 'dark');
    assert.notEqual(text['table-header-text'], base['table-header-text']);
    assert.notEqual(text['table-row-number-text'], base['table-row-number-text']);
});
