// theme-sync (the theme contract v1): what the build makes, what the cgi script serves, and what the
// script does in an app's page.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { generate, ROOT } = require('../scripts/build.js');

const TOKENS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tokens', 'theme-tokens.json'), 'utf8'));
const SYNC = fs.readFileSync(path.join(ROOT, 'sync', 'v1', 'theme-sync.js'), 'utf8');
const CONTRACT_TOKENS = fs.readFileSync(path.join(ROOT, 'contract', 'theme-v1.tokens'), 'utf8').split('\n').filter(Boolean);

test('the committed generated files are what the token list makes (node scripts/build.js)', () => {
    for (const [file, text] of Object.entries(generate())) {
        assert.equal(fs.readFileSync(file, 'utf8'), text, `${path.relative(ROOT, file)} is out of date: run node scripts/build.js`);
    }
});

test('the served script is ASCII, imports nothing and carries every token\'s dark default', () => {
    assert.equal(SYNC.search(/[^\x00-\x7f]/), -1);
    assert.doesNotMatch(SYNC, /\bimport\b|\brequire\(/);
    for (const t of TOKENS) assert.ok(SYNC.includes(JSON.stringify(t.name) + ':' + JSON.stringify(t.dark)), t.name);
});

test('the contract promises the app tokens: every one is in the token list, none of the web UI\'s own frame', () => {
    const names = new Set(TOKENS.map((t) => t.name));
    assert.equal(CONTRACT_TOKENS.length, 112);
    for (const n of CONTRACT_TOKENS) {
        assert.ok(names.has(n), n);
        assert.doesNotMatch(n, /^(gnb-|tabbar-|console-)|^sub-tab-active-bg$|^fx-cursor$/);
    }
});

test('the cgi script sends the built file with its byte length and a time-limited cache', () => {
    const out = execFileSync(process.execPath, [path.join(ROOT, 'cgi-bin', 'theme', 'v1', 'sync.js')]).toString('latin1');
    const at = out.indexOf('\r\n\r\n');
    const head = out.slice(0, at).split('\r\n');
    const body = out.slice(at + 4);
    assert.ok(head.includes('Content-Type: text/javascript; charset=utf-8'));
    assert.ok(head.includes('Content-Length: ' + Buffer.byteLength(SYNC)));
    assert.ok(head.includes('Cache-Control: public, max-age=300'));
    assert.ok(head.includes('X-Neo-Theme-Contract: 1'));
    assert.equal(body, SYNC);
});

// ---- the script in a page --------------------------------------------------------------------

/** A page with just what theme-sync touches: storage, <html>, events. */
function page(aItems) {
    const items = new Map(Object.entries(aItems || {}));
    const writes = [];
    const window = new EventTarget();
    const document = new EventTarget();
    const props = new Map();
    const attrs = new Map();
    document.visibilityState = 'visible';
    document.documentElement = {
        style: {
            setProperty: (k, v) => props.set(k, v),
            removeProperty: (k) => props.delete(k),
            colorScheme: '',
        },
        setAttribute: (k, v) => attrs.set(k, v),
    };
    window.localStorage = {
        getItem: (k) => (items.has(k) ? items.get(k) : null),
        setItem: (k) => writes.push(k),
        removeItem: (k) => writes.push(k),
    };
    window.CustomEvent = CustomEvent;
    const context = { window, document, CustomEvent, Object, JSON };
    const run = () => vm.runInNewContext(SYNC, context);
    run();
    const events = [];
    window.addEventListener('neo-theme-change', (e) => events.push(e.detail));
    return {
        window, document, props, attrs, writes, events, run,
        set: (k, v) => (v === null ? items.delete(k) : items.set(k, v)),
        fire: (key) => {
            const e = new Event('storage');
            e.key = key;
            window.dispatchEvent(e);
        },
    };
}
const state = (aResolved, aScheme) => JSON.stringify({ v: 1, owner: 'neo-pkg-theme-builder', scheme: aScheme || 'light', theme: { pkg: 'neo-pkg-theme-builder', stylesheet: 'presets/light.css', label: 'Light' }, set: {}, resolved: aResolved, tokens: 'x', at: 1 });

test('with no theme every token is its dark default, before anything else runs', () => {
    const p = page();
    assert.equal(p.props.size, TOKENS.length);
    for (const t of TOKENS) assert.equal(p.props.get('--neo-' + t.name), t.dark, t.name);
    assert.equal(p.attrs.get('data-neo-scheme'), 'dark');
    assert.equal(p.document.documentElement.style.colorScheme, 'dark');
});

test('the theme in use: its final colours, its scheme — and only while themes are on (experimentMode)', () => {
    const on = page({ experimentMode: 'true', 'neo.theme.state': state({ 'side-bg': '#dfe3f6' }) });
    assert.equal(on.props.get('--neo-side-bg'), '#dfe3f6');
    assert.equal(on.props.get('--neo-text-primary'), '#f1f1f1', 'a token the state does not carry stays at its dark default');
    assert.equal(on.attrs.get('data-neo-scheme'), 'light');
    const off = page({ 'neo.theme.state': state({ 'side-bg': '#dfe3f6' }) });
    assert.equal(off.props.get('--neo-side-bg'), '#252525');
    assert.equal(off.attrs.get('data-neo-scheme'), 'dark');
});

test('a change in storage is put on and told once; nothing moved, nothing told', () => {
    const p = page({ experimentMode: 'true' });
    const seen = [];
    p.window.neoThemeSync.onChange((d) => seen.push(d.scheme));
    p.set('neo.theme.state', state({ 'side-bg': '#dfe3f6' }));
    p.fire('neo.theme.state');
    assert.equal(p.props.get('--neo-side-bg'), '#dfe3f6');
    assert.equal(p.events.length, 1);
    assert.equal(p.events[0].scheme, 'light');
    assert.equal(p.events[0].vars['side-bg'], '#dfe3f6');
    assert.deepEqual(seen, ['light']);
    p.fire('neo.theme.state');
    p.fire('some-other-key');
    assert.equal(p.events.length, 1);
});

test('a tab that missed the storage event reads again when it comes back to the front', () => {
    const p = page({ experimentMode: 'true' });
    p.set('neo.theme.state', state({ 'side-bg': '#123456' }));
    p.window.dispatchEvent(new Event('focus'));
    assert.equal(p.props.get('--neo-side-bg'), '#123456');
    p.set('neo.theme.state', state({ 'side-bg': '#654321' }));
    p.document.dispatchEvent(new Event('visibilitychange'));
    assert.equal(p.props.get('--neo-side-bg'), '#654321');
});

test('what storage holds is not trusted: names and values that could leave a declaration are dropped', () => {
    const p = page({ experimentMode: 'true', 'neo.theme.state': state({ 'side-bg': 'red; } body { color: red', 'Bad Name': '#fff', 'bg-panel': '#abcdef' }) });
    assert.equal(p.props.get('--neo-side-bg'), '#252525');
    assert.equal(p.props.has('--neo-Bad Name'), false);
    assert.equal(p.props.get('--neo-bg-panel'), '#abcdef');
});

test('it never writes storage, and loaded twice the first copy keeps the page', () => {
    const p = page({ experimentMode: 'true' });
    const first = p.window.neoThemeSync;
    assert.equal(first.contract, 1);
    assert.equal(first.revision, 1);
    p.run();
    assert.equal(p.window.neoThemeSync, first);
    p.set('neo.theme.state', state({ 'side-bg': '#dfe3f6' }));
    p.fire('neo.theme.state');
    assert.equal(p.events.length, 1, 'one listener, not two');
    assert.deepEqual(p.writes, []);
});
