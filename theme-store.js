/*
 * theme-store.js — the theme state, kept in this browser, and the Theme Builder is its one writer.
 *
 * The web UI and every package's app only read it (contract/state-v1.md):
 *
 *   localStorage "neo.theme.state" = {
 *     v: 1, owner: "neo-pkg-theme-builder",
 *     scheme: "light" | "dark",
 *     theme: { pkg, stylesheet, label },       what was chosen (a preset of this package, or "@local" + "<id>.css")
 *     set: { token: value },                    the values the theme sets   → the web UI wears these
 *     resolved: { token: value },               every token's final colour → theme-sync puts these on an app
 *     tokens: "neo-web …",                      the token list `resolved` was worked out with
 *     loginImage?: { picture: id },             the sign-in picture, kept in IndexedDB (below)
 *     at: <ms>
 *   }
 *
 * No key: no theme (the dark defaults). Writing it is the whole notification: the browser tells every
 * other page of this origin (the storage event), the web UI and the apps included.
 *
 * The user's own themes and their sign-in pictures are the builder's too: the themes in localStorage
 * (MINE_KEY), the pictures in IndexedDB "neo-theme" / "pictures" (where the web UI's sign-in page
 * reads the one `loginImage` names). What is read back is checked again: storage is anyone's to edit.
 */
(function (root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.ThemeStore = api;
})(this, function () {
    'use strict';

    var STATE_KEY = 'neo.theme.state';
    var MINE_KEY = 'neo-theme-builder.themes';
    // where the web UI kept the user's themes before the builder owned them: read once, on first use
    var LEGACY_MINE_KEY = 'neo.themes';
    var OWNER = 'neo-pkg-theme-builder';
    var LOCAL = '@local';

    var SAFE_TOKEN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    var SAFE_VALUE = /^[^;{}<>\\]{1,200}$/;
    var SAFE_ID = /^[a-z0-9][a-z0-9-]{0,47}$/;
    var SAFE_ROLE = /^[a-zA-Z][a-zA-Z0-9]{0,47}$/;
    var SAFE_PKG = /^(@local|[A-Za-z0-9][A-Za-z0-9._-]*)$/;
    var SAFE_CSS = /^(?!.*(^|\/)\.\.?(\/|$))[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*\.css$/;
    var PICTURE_TYPES = ['image/webp', 'image/png', 'image/jpeg', 'image/gif', 'image/avif'];
    var PICTURE_MAX_BYTES = 10 * 1024 * 1024;

    var has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

    // ---- storage (tests put their own in) ---------------------------------------------------

    var sStorage = null;
    function storage() {
        if (sStorage) return sStorage;
        try {
            return window.localStorage;
        } catch (e) {
            return null;
        }
    }
    function useStorage(aStorage) {
        sStorage = aStorage || null;
    }
    function readJson(aKey) {
        try {
            var s = storage();
            return s ? JSON.parse(s.getItem(aKey) || 'null') : null;
        } catch (e) {
            return null;
        }
    }
    /** Writes `aValue` (null removes the key); { ok } or { ok: false, reason } in words the builder can show. */
    function writeJson(aKey, aValue) {
        try {
            var s = storage();
            if (!s) return { ok: false, reason: 'this browser keeps nothing for the web UI' };
            if (aValue === null) s.removeItem(aKey);
            else s.setItem(aKey, JSON.stringify(aValue));
            return { ok: true };
        } catch (e) {
            var full = e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED');
            return { ok: false, reason: full ? "this browser's storage for the web UI is full" : String((e && e.message) || e) };
        }
    }

    // ---- checks ------------------------------------------------------------------------------

    /** `{ key: value }` with keys `aKey` accepts and values that cannot leave a declaration; other pairs dropped. */
    function safeMap(aValue, aKey) {
        if (!aValue || typeof aValue !== 'object' || Array.isArray(aValue)) return undefined;
        var out = {};
        Object.keys(aValue).slice(0, 512).forEach(function (k) {
            var v = aValue[k];
            if (aKey.test(k) && typeof v === 'string' && SAFE_VALUE.test(v.trim())) out[k] = v.trim();
        });
        return out;
    }

    /** One of the user's themes, checked (as saved and as read back); null: unusable. */
    function parseMine(aEntry) {
        if (!aEntry || typeof aEntry !== 'object') return null;
        var e = aEntry;
        if (typeof e.id !== 'string' || !SAFE_ID.test(e.id) || typeof e.css !== 'string' || e.css.length > 65536) return null;
        var out = {
            id: e.id,
            label: typeof e.label === 'string' && e.label.trim() ? e.label.trim() : e.id,
            scheme: e.scheme === 'light' ? 'light' : 'dark',
            css: e.css,
            swatch: Array.isArray(e.swatch) ? e.swatch.filter(function (c) { return typeof c === 'string'; }).slice(0, 8) : [],
            note: typeof e.note === 'string' ? e.note.slice(0, 24) : '',
        };
        if (e.loginImage === true) out.loginImage = true;
        var roles = safeMap(e.roles, SAFE_ROLE);
        if (roles) out.roles = roles;
        var pinned = safeMap(e.pinned, SAFE_TOKEN);
        if (pinned) out.pinned = pinned;
        if (typeof e.saved === 'number' && isFinite(e.saved)) out.saved = e.saved;
        return out;
    }

    function parseTheme(aTheme) {
        if (!aTheme || typeof aTheme !== 'object') return null;
        if (typeof aTheme.pkg !== 'string' || !SAFE_PKG.test(aTheme.pkg)) return null;
        if (typeof aTheme.stylesheet !== 'string' || !SAFE_CSS.test(aTheme.stylesheet)) return null;
        return { pkg: aTheme.pkg, stylesheet: aTheme.stylesheet, label: typeof aTheme.label === 'string' ? aTheme.label.slice(0, 80) : '' };
    }

    function parseLoginImage(aValue) {
        if (!aValue || typeof aValue !== 'object') return undefined;
        if (typeof aValue.picture === 'string' && SAFE_ID.test(aValue.picture)) return { picture: aValue.picture };
        return undefined;
    }

    /** The state as read back, checked; null: none, or not one this version can read. */
    function parseState(aValue) {
        if (!aValue || typeof aValue !== 'object' || aValue.v !== 1) return null;
        var theme = parseTheme(aValue.theme);
        var set = safeMap(aValue.set, SAFE_TOKEN);
        var resolved = safeMap(aValue.resolved, SAFE_TOKEN);
        if (!theme || !set || !resolved) return null;
        var out = {
            v: 1,
            owner: OWNER,
            scheme: aValue.scheme === 'light' ? 'light' : 'dark',
            theme: theme,
            set: set,
            resolved: resolved,
            tokens: typeof aValue.tokens === 'string' ? aValue.tokens.slice(0, 80) : '',
            at: typeof aValue.at === 'number' && isFinite(aValue.at) ? aValue.at : 0,
        };
        var picture = parseLoginImage(aValue.loginImage);
        if (picture) out.loginImage = picture;
        return out;
    }

    // ---- the state ---------------------------------------------------------------------------

    /**
     * Every token's final value under the theme's own `aSet`: its own, else what it falls back to
     * (worked out first — the list is in declaration order), else its dark default. The web UI's CSS
     * works the same chain out with var() fallbacks; this is that chain for a page that has no such CSS.
     */
    function resolve(aTokens, aSet) {
        var out = {};
        aTokens.forEach(function (t) {
            out[t.name] = has(aSet, t.name) ? aSet[t.name] : t.fallback && has(out, t.fallback) ? out[t.fallback] : t.dark;
        });
        return out;
    }

    /**
     * The state for a theme: `aTheme` { pkg, stylesheet, label }, its `aScheme`, the values it sets
     * (`aSet`, already read from its stylesheet), the token list (`aTokens`, with `aSource`).
     */
    function makeState(aTheme, aScheme, aSet, aTokens, aSource, aLoginImage) {
        var known = {};
        aTokens.forEach(function (t) { known[t.name] = true; });
        var set = {};
        Object.keys(safeMap(aSet, SAFE_TOKEN) || {}).forEach(function (k) { if (known[k]) set[k] = aSet[k].trim(); });
        var state = {
            v: 1,
            owner: OWNER,
            scheme: aScheme === 'light' ? 'light' : 'dark',
            theme: parseTheme(aTheme),
            set: set,
            resolved: resolve(aTokens, set),
            tokens: aSource || '',
            at: Date.now(),
        };
        var picture = parseLoginImage(aLoginImage);
        if (picture) state.loginImage = picture;
        return state;
    }

    function readState() {
        return parseState(readJson(STATE_KEY));
    }
    /** Wears `aState` everywhere: this write is what the other pages are told by. */
    function writeState(aState) {
        if (!parseState(aState)) return { ok: false, reason: 'the theme is not one the web UI can wear' };
        return writeJson(STATE_KEY, aState);
    }
    /** Back to the dark defaults. */
    function clearState() {
        return writeJson(STATE_KEY, null);
    }
    /** The theme in use as { pkg, stylesheet, label, scheme }; null: none (Dark). */
    function currentChoice() {
        var s = readState();
        return s ? { pkg: s.theme.pkg, stylesheet: s.theme.stylesheet, label: s.theme.label, scheme: s.scheme } : null;
    }

    // ---- the user's themes -------------------------------------------------------------------

    function readMine() {
        var list = readJson(MINE_KEY);
        if (list === null) {
            // first use: take over the themes the web UI kept before (pictures are in the same IndexedDB)
            var legacy = readJson(LEGACY_MINE_KEY);
            if (Array.isArray(legacy) && legacy.length) {
                list = legacy;
                writeJson(MINE_KEY, legacy.map(parseMine).filter(Boolean));
            }
        }
        return Array.isArray(list) ? list.map(parseMine).filter(Boolean) : [];
    }
    /** Saves one of the user's themes: over the one with its id, in its place, or after the others. */
    function saveMine(aEntry) {
        var entry = parseMine(aEntry);
        if (!entry) return { ok: false, reason: 'the theme is not one this browser can keep' };
        var list = readMine();
        var at = -1;
        list.forEach(function (t, i) { if (t.id === entry.id) at = i; });
        if (at < 0) list.push(entry);
        else list[at] = entry;
        var r = writeJson(MINE_KEY, list);
        return r.ok ? { ok: true, theme: entry } : r;
    }
    /** Deletes one of the user's themes and its picture; the theme in use, if it was this one, goes back to Dark. */
    function deleteMine(aId) {
        if (typeof aId !== 'string' || !SAFE_ID.test(aId)) return { ok: false, reason: 'no such theme' };
        var r = writeJson(MINE_KEY, readMine().filter(function (t) { return t.id !== aId; }));
        if (!r.ok) return r;
        writePicture(aId, null).catch(function () { /* a picture left behind is only space */ });
        var c = currentChoice();
        if (c && c.pkg === LOCAL && c.stylesheet === aId + '.css') clearState();
        return { ok: true };
    }

    // ---- sign-in pictures (IndexedDB "neo-theme" / "pictures", as the web UI's sign-in page reads) ----

    function isPicture(aValue) {
        return typeof Blob !== 'undefined' && aValue instanceof Blob && PICTURE_TYPES.indexOf(aValue.type) >= 0 && aValue.size > 0 && aValue.size <= PICTURE_MAX_BYTES;
    }

    var sDb = null;
    function openDb() {
        if (!sDb) {
            sDb = new Promise(function (resolveDb, reject) {
                if (typeof indexedDB === 'undefined') {
                    reject(new Error('this browser cannot keep pictures'));
                    return;
                }
                var open = indexedDB.open('neo-theme', 1);
                open.onupgradeneeded = function () { open.result.createObjectStore('pictures'); };
                open.onsuccess = function () { resolveDb(open.result); };
                open.onerror = function () { reject(open.error || new Error('this browser cannot keep pictures')); };
                open.onblocked = function () { reject(new Error('the picture store is in use by an older tab')); };
            });
            sDb.catch(function () { sDb = null; });
        }
        return sDb;
    }
    function run(aMode, aDo) {
        return openDb().then(function (db) {
            return new Promise(function (resolveRun, reject) {
                var tx = db.transaction('pictures', aMode);
                var req = aDo(tx.objectStore('pictures'));
                tx.oncomplete = function () { resolveRun(req.result); };
                tx.onerror = function () { reject(tx.error || req.error || new Error('the picture store failed')); };
                tx.onabort = function () { reject(tx.error || new Error('the picture store failed')); };
            });
        });
    }
    var indexedDbPictures = {
        get: function (k) { return run('readonly', function (s) { return s.get(k); }); },
        put: function (k, b) { return run('readwrite', function (s) { return s.put(b, k); }); },
        delete: function (k) { return run('readwrite', function (s) { return s.delete(k); }); },
    };
    var sPictures = indexedDbPictures;
    function usePictureStore(aStore) {
        sPictures = aStore || indexedDbPictures;
    }
    /** A theme's sign-in picture; null when it has none or it cannot be read. */
    function readPicture(aId) {
        return Promise.resolve()
            .then(function () { return sPictures.get(aId); })
            .then(function (v) { return isPicture(v) ? v : null; }, function () { return null; });
    }
    /** Keeps a theme's sign-in picture (null takes it away); rejects with a reason the builder can show. */
    function writePicture(aId, aBlob) {
        return Promise.resolve()
            .then(function () { return aBlob ? sPictures.put(aId, aBlob) : sPictures.delete(aId); })
            .catch(function (e) {
                throw new Error(e && e.name === 'QuotaExceededError' ? "this browser's storage for the web UI is full" : String((e && e.message) || e));
            });
    }

    return {
        STATE_KEY: STATE_KEY,
        MINE_KEY: MINE_KEY,
        OWNER: OWNER,
        LOCAL: LOCAL,
        useStorage: useStorage,
        usePictureStore: usePictureStore,
        resolve: resolve,
        makeState: makeState,
        parseState: parseState,
        readState: readState,
        writeState: writeState,
        clearState: clearState,
        currentChoice: currentChoice,
        readMine: readMine,
        saveMine: saveMine,
        deleteMine: deleteMine,
        isPicture: isPicture,
        readPicture: readPicture,
        writePicture: writePicture,
    };
});
