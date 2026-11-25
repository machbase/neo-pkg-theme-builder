// theme-store.js: the theme state the builder writes and every other page reads, the user's themes
// and their sign-in pictures.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const S = require('../theme-store.js');

const TOKENS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tokens', 'theme-tokens.json'), 'utf8'));
const LIGHT = { pkg: 'neo-pkg-theme-builder', stylesheet: 'presets/light.css', label: 'Light' };

const memoryStorage = () => {
    const m = new Map();
    return {
        getItem: (k) => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => m.set(k, String(v)),
        removeItem: (k) => m.delete(k),
        has: (k) => m.has(k),
    };
};
const memoryPictures = () => {
    const m = new Map();
    return { get: async (k) => m.get(k), put: async (k, b) => void m.set(k, b), delete: async (k) => void m.delete(k), m };
};
const fresh = () => {
    const storage = memoryStorage();
    S.useStorage(storage);
    const pictures = memoryPictures();
    S.usePictureStore(pictures);
    return { storage, pictures };
};

test('a token the theme leaves unset takes what it falls back to, down the chain, else its dark default', () => {
    const r = S.resolve(TOKENS, { 'bg-panel': '#dfe3f6', 'text-muted': '#6169a1' });
    assert.equal(r['bg-panel'], '#dfe3f6');
    assert.equal(r['side-bg'], '#dfe3f6', 'side-bg → bg-panel');
    assert.equal(r['table-row-number-text'], '#6169a1', 'table-row-number-text → table-header-text → text-muted');
    assert.equal(r['text-primary'], '#f1f1f1', 'unset, no fallback: the dark default');
    assert.equal(Object.keys(r).length, TOKENS.length, 'every token has a value');
    const dark = S.resolve(TOKENS, {});
    TOKENS.forEach((t) => assert.equal(dark[t.name], t.dark, t.name));
});

test('the state keeps only known tokens with values that cannot leave a declaration', () => {
    const s = S.makeState(LIGHT, 'light', { 'bg-panel': ' #dfe3f6 ', 'not-a-token': '#000', 'text-primary': 'red; } body { x', 'Bad Name': '#fff' }, TOKENS, 'neo-web v8.9.0');
    assert.deepEqual(s.set, { 'bg-panel': '#dfe3f6' });
    assert.equal(s.resolved['side-bg'], '#dfe3f6');
    assert.equal(s.resolved['text-primary'], '#f1f1f1');
    assert.equal(s.v, 1);
    assert.equal(s.owner, 'neo-pkg-theme-builder');
    assert.equal(s.scheme, 'light');
    assert.equal(s.tokens, 'neo-web v8.9.0');
    assert.deepEqual(s.theme, LIGHT);
});

test('the state is written to one key and read back checked; Dark removes it', () => {
    const { storage } = fresh();
    assert.equal(S.readState(), null);
    assert.equal(S.currentChoice(), null);
    assert.deepEqual(S.writeState(S.makeState(LIGHT, 'light', { 'bg-panel': '#dfe3f6' }, TOKENS, 'x')), { ok: true });
    assert.ok(storage.has('neo.theme.state'));
    assert.equal(S.readState().resolved['side-bg'], '#dfe3f6');
    assert.deepEqual(S.currentChoice(), { pkg: LIGHT.pkg, stylesheet: LIGHT.stylesheet, label: 'Light', scheme: 'light' });
    S.clearState();
    assert.equal(storage.has('neo.theme.state'), false);
});

test('a state this version cannot read is no state, and one that is not a theme is not written', () => {
    const { storage } = fresh();
    storage.setItem('neo.theme.state', JSON.stringify({ v: 2, theme: LIGHT, set: {}, resolved: {} }));
    assert.equal(S.readState(), null);
    storage.setItem('neo.theme.state', JSON.stringify({ v: 1, theme: { pkg: '../x', stylesheet: 'a.css' }, set: {}, resolved: {} }));
    assert.equal(S.readState(), null);
    storage.setItem('neo.theme.state', '{not json');
    assert.equal(S.readState(), null);
    assert.equal(S.writeState({ v: 1, theme: null }).ok, false);
});

test('the user\'s themes: saved over the same id, deleted with their picture, and the one in use goes back to Dark', async () => {
    const { pictures } = fresh();
    const entry = { id: 'my-blue', label: 'My Blue', scheme: 'dark', css: ':root { --neo-bg-panel: #123; }', swatch: ['#123'], roles: { surface: '#123' }, pinned: { 'bg-panel': '#123' } };
    assert.equal(S.saveMine(entry).ok, true);
    assert.equal(S.saveMine({ ...entry, label: 'My Blue 2' }).ok, true);
    assert.deepEqual(S.readMine().map((t) => t.label), ['My Blue 2']);
    assert.equal(S.saveMine({ ...entry, id: '../bad' }).ok, false);

    await S.writePicture('my-blue', new Blob(['x'], { type: 'image/png' }));
    assert.ok(S.isPicture(await S.readPicture('my-blue')));
    S.writeState(S.makeState({ pkg: '@local', stylesheet: 'my-blue.css', label: 'My Blue 2' }, 'dark', { 'bg-panel': '#123' }, TOKENS, 'x', { picture: 'my-blue' }));
    assert.deepEqual(S.readState().loginImage, { picture: 'my-blue' });

    assert.equal(S.deleteMine('my-blue').ok, true);
    await new Promise((r) => setImmediate(r));
    assert.deepEqual(S.readMine(), []);
    assert.equal(pictures.m.has('my-blue'), false);
    assert.equal(S.readState(), null, 'the deleted theme was in use: Dark');
});

test('the themes the web UI kept before (neo.themes) are taken over on first use', () => {
    const { storage } = fresh();
    storage.setItem('neo.themes', JSON.stringify([{ id: 'old-one', label: 'Old', scheme: 'light', css: ':root{}' }, { id: 'BAD ID', css: '' }]));
    assert.deepEqual(S.readMine().map((t) => t.id), ['old-one']);
    assert.ok(storage.has('neo-theme-builder.themes'));
    storage.setItem('neo.themes', JSON.stringify([]));
    assert.deepEqual(S.readMine().map((t) => t.id), ['old-one'], 'taken over once: the builder\'s own list from then on');
});

test('a picture that is not an image of an accepted kind is no picture', async () => {
    fresh();
    assert.equal(S.isPicture(new Blob(['x'], { type: 'text/html' })), false);
    assert.equal(S.isPicture(new Blob([], { type: 'image/png' })), false);
    assert.equal(await S.readPicture('none'), null);
});
