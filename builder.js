/*
 * builder.js — the Theme Builder app (main.html, opened in a neo-web app tab).
 *
 * A theme is a set of `--neo-*` variables. It starts from a theme (Dark, a preset, one of yours,
 * the one in use) and changes in two ways:
 *   - color roles (theme-core.js): the five basics and the parts that follow them. Changing a role
 *     changes only the tokens that role decides — whatever the start tuned by hand elsewhere stays;
 *   - single tokens ("All tokens"): set by hand (orange dot), kept whatever the roles do.
 * The preview is neo-web's workspace drawn with the same variables the real components read; a
 * click on any part of it opens that part's color. The parts of the screen (GNB, tab bar, side
 * panel, console) have colors of their own; every role says where it changes — in the preview
 * (pointing at a role outlines what it changes there, a change flashes it) and in the web UI
 * (impact.json, measured on every screen) — so a color never moves something you did not expect.
 *
 * Saving keeps the theme in this browser — the browser's, whoever signs in on it — and no server
 * write is needed. neo-web's Settings → Theme lists it under My themes. A start used as it is —
 * Dark, a preset (this package's index, themes.json, listed in Settings → Theme too), one of yours —
 * is not saved again: Use this theme switches to it, and Save waits for a change. The page does not read or write the saved themes itself: it asks neo-web
 * (window.parent, same origin), which keeps and checks them, by postMessage —
 * { type: 'neo-theme', action: 'themes' | 'save' | 'delete' | 'picture', request } — and is answered with the
 * browser's themes and the theme in use; { action: 'changed' } says to ask again. Choosing a
 * theme is { action: 'apply' }. Settings → Theme can ask for one of the user's themes to be opened
 * here (Edit): it comes as `edit` with a themes answer, and opens like a click on its card.
 *
 * A theme can carry a picture for the sign-in page: the file itself (a Blob), sent with the save
 * ({ action: 'save', picture }) and asked for when the theme is opened ({ action: 'picture', id }).
 * neo-web keeps it in IndexedDB and its entry only says it has one (`loginImage: true`); it shows
 * on the sign-in page of this browser only, like the theme.
 */
(function () {
    'use strict';
    var C = window.ThemeCore;
    var PKG = decodeURIComponent(location.pathname.split('/')[2] || 'neo-pkg-theme-builder');
    var BASE = '/public/' + encodeURIComponent(PKG) + '/';
    var LOCAL = '@local';

    var $ = function (id) { return document.getElementById(id); };
    var esc = function (s) {
        return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
    };
    var has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

    var state = {
        tokens: [], // [{ name, dark }] from neo-web
        defaults: {}, // name → dark default
        presets: [], // index entries (themes.json)
        mine: [], // the browser's own themes, as neo-web keeps them: { id, label, scheme, css, swatch, roles, pinned }
        choice: null, // the theme in use, as neo-web answers: { pkg, stylesheet, label, scheme } | null (Dark)
        hosted: false, // neo-web answered: the page is in its app tab and can save
        inUse: null, // the theme in use when it is not one of ours: { choice, vars }
        start: null, // { key, kind, label, scheme, vars, id?, own, pinned }
        own: {}, // role → color the theme gives it
        pinned: {}, // token → value set by hand
        name: '',
        picture: null, // the sign-in page's picture (a Blob), null: the web UI's own
        editingId: null, // the saved theme being edited (Save overwrites it)
        version: '', // this package's version: a preset used as it is is linked with it (?v=), as neo-web links package themes
        editRequest: null, // a theme neo-web asked to open here (Settings → Theme, Edit): { pkg, stylesheet }
        impact: null, // { tokens: { name → [[place, count]…] } }: where each shared token is drawn in the web UI
        busy: false,
        scene: 'work',
        open: { Basics: true },
        openKids: {}, // shared colors whose "Using it" list is open
        filter: '',
        tokenGroup: '',
    };
    // light or dark follows the content color (theme-core schemeOf), so there is nothing to switch
    Object.defineProperty(state, 'scheme', {
        enumerable: true,
        get: function () { return C.schemeOf(state.own.surface, state.start && state.start.scheme); },
    });

    // ---- what the theme is ---------------------------------------------------------------

    function resolved() {
        return C.resolveRoles(state.own, state.scheme, state.start.rel);
    }
    function startRoles() {
        var s = state.start;
        return C.resolveRoles(s.own, s.scheme, s.rel);
    }
    /** The start's variables, moved by the role changes (theme-core moveVars). */
    function startVars() {
        return C.moveVars(state.start, state.own, state.scheme);
    }
    /** The variables the theme sets for the roles `aOwn` (what is saved), only tokens this web UI has. */
    function varsFor(aOwn) {
        var v = Object.assign({}, C.moveVars(state.start, aOwn, state.scheme), state.pinned);
        Object.keys(v).forEach(function (k) { if (!has(state.defaults, k)) delete v[k]; });
        return v;
    }
    function themeVars() {
        return varsFor(state.own);
    }
    /**
     * Every token's value as the screen shows it: set, else what it falls back to — a part's token
     * takes the shared one, as the web UI's CSS does — else the dark default.
     */
    function shownFrom(aSet) {
        var out = Object.assign({}, state.defaults, aSet);
        Object.keys(C.AREA_FALLBACK).forEach(function (t) {
            if (!has(aSet, t) && has(state.defaults, t)) out[t] = C.shownValue(t, aSet, state.defaults);
        });
        return out;
    }
    function shownVars() {
        return shownFrom(themeVars());
    }

    // ---- where a role changes --------------------------------------------------------------

    /** Roles with `aKey` set to a color far from its own: what changing it would give. */
    function probed(aKey) {
        var now = resolved()[aKey];
        var own = Object.assign({}, state.own);
        own[aKey] = C.distance(now, '#ff00ff') < 0.25 ? '#00ffff' : '#ff00ff';
        return own;
    }
    var PART_OF = {};
    C.ROLES.forEach(function (d) { if (C.PART_GROUPS.indexOf(d.group) >= 0) PART_OF[d.token] = d.group; });
    /**
     * Where a role changes the web UI: the parts whose tokens it moves, and the places the shared
     * tokens it moves are drawn (measured on every screen: impact.json).
     */
    function placesOf(aKey, aNow) {
        var a = aNow || shownVars(), b = shownFrom(varsFor(probed(aKey)));
        var parts = [], also = {};
        Object.keys(b).forEach(function (t) {
            if (a[t] === b[t]) return;
            if (PART_OF[t]) {
                if (parts.indexOf(PART_OF[t]) < 0) parts.push(PART_OF[t]);
                return;
            }
            var m = state.impact && state.impact.tokens[t];
            if (m) m.forEach(function (p) { also[p[0]] = (also[p[0]] || 0) + p[1]; });
        });
        parts.forEach(function (p) { delete also[p]; });
        return { parts: parts, also: Object.keys(also).sort(function (x, y) { return also[y] - also[x]; }) };
    }
    function placesText(aPlaces, aRole) {
        var t = aPlaces.parts.join(' · ');
        if (aPlaces.also.length) t += (t ? ' — also ' : '') + aPlaces.also.slice(0, 4).join(', ') + (aPlaces.also.length > 4 ? ' +' + (aPlaces.also.length - 4) : '');
        // not measured on any screen (drawn only in states the measurement did not reach): its description
        return t || (aRole ? aRole.where : 'nothing on screen');
    }

    /** Each preview element's drawn colors: what a change is compared on. */
    function snapshot() {
        var els = $('pv').querySelectorAll('*');
        var v = new Array(els.length);
        for (var i = 0; i < els.length; i++) {
            var cs = getComputedStyle(els[i]);
            v[i] = cs.backgroundColor + '|' + cs.color + '|' + cs.borderTopColor + '|' + cs.borderLeftColor + '|' + cs.borderBottomColor + '|' + cs.fill + '|' + cs.stroke + '|' + cs.boxShadow;
        }
        return { els: els, v: v };
    }
    function changedBetween(a, b) {
        var out = [];
        for (var i = 0; i < a.els.length; i++) if (a.v[i] !== b.v[i] && draws(a.els[i], a.v[i], b.v[i])) out.push(a.els[i]);
        return out;
    }
    /** Whether a change shows: the color it changed is one the element paints with. */
    function draws(aEl, aWas, aNow) {
        var w = aWas.split('|'), n = aNow.split('|'), cs = getComputedStyle(aEl);
        // an element of a scene not on screen has no box: it draws when its scene is shown
        var r = aEl.getBoundingClientRect(), away = sceneOf(aEl) !== state.scene;
        if (!away && (!r.width || !r.height)) return false;
        var text = Array.prototype.some.call(aEl.childNodes, function (c) { return c.nodeType === 3 && c.textContent.trim(); });
        if (w[0] !== n[0] && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') return true;
        // the text color shows on text and on an svg; an <i> icon draws with its border or fill, which are checked
        // below — an <i> that only inherits the color (a package's accent bar) is not changed by it
        if (w[1] !== n[1] && (text || aEl.namespaceURI === 'http://www.w3.org/2000/svg')) return true;
        if ((w[2] !== n[2] && parseFloat(cs.borderTopWidth)) || (w[3] !== n[3] && parseFloat(cs.borderLeftWidth)) || (w[4] !== n[4] && parseFloat(cs.borderBottomWidth))) return true;
        return w[5] !== n[5] || w[6] !== n[6] || w[7] !== n[7];
    }
    function setPreviewVars(aShown) {
        var pv = $('pv');
        Object.keys(aShown).forEach(function (k) { pv.style.setProperty('--neo-' + k, aShown[k]); });
    }
    /** The preview elements a role changes: drawn once with the role far off its color, compared, put back. */
    function previewOf(aKey) {
        var a = snapshot();
        setPreviewVars(shownFrom(varsFor(probed(aKey))));
        var b = snapshot();
        setPreviewVars(shownVars());
        return changedBetween(a, b);
    }
    /** The preview elements a token changes, as a color row's do: drawn once with it far off its color, compared, put back. */
    function previewOfToken(aName) {
        var now = shownVars();
        var hex = C.toHex(now[aName]);
        if (!hex) return [];
        var set = Object.assign({}, themeVars());
        set[aName] = C.distance(hex, '#ff00ff') < 0.25 ? '#00ffff' : '#ff00ff';
        var a = snapshot();
        setPreviewVars(shownFrom(set));
        var b = snapshot();
        setPreviewVars(now);
        return changedBetween(a, b);
    }
    /** The preview scene (data-scene-of) an element is drawn in. */
    function sceneOf(aEl) {
        var s = aEl.closest && aEl.closest('[data-scene-of]');
        return s ? s.getAttribute('data-scene-of') : null;
    }
    /** The scenes the elements are drawn in, in the tabs' order. */
    function scenesOf(aEls) {
        var found = {};
        aEls.forEach(function (e) { var s = sceneOf(e); if (s) found[s] = true; });
        return Array.prototype.map.call(document.querySelectorAll('.tb-tabs [data-scene]'), function (b) { return b.getAttribute('data-scene'); }).filter(function (s) { return found[s]; });
    }
    /** The tabs of the scenes a color shows in, marked while its row is under the pointer. */
    function markTabs(aScenes) {
        Array.prototype.forEach.call(document.querySelectorAll('.tb-tabs [data-scene]'), function (b) {
            b.classList.toggle('tb-tab--has', aScenes.indexOf(b.getAttribute('data-scene')) >= 0);
        });
    }
    /** A color picked in the list or the checks: when the scene on screen does not show it, the one that does. */
    function showSceneOf(aEls) {
        var scenes = scenesOf(aEls);
        if (!scenes.length || scenes.indexOf(state.scene) >= 0) return;
        state.scene = scenes[0];
        renderPreview();
    }
    /** How many colors each scene holds, on its tab. */
    function countScenes() {
        Array.prototype.forEach.call(document.querySelectorAll('.tb-tabs [data-scene]'), function (b) {
            var scene = document.querySelector('[data-scene-of="' + b.getAttribute('data-scene') + '"]');
            var roles = {};
            if (scene) [scene].concat(Array.prototype.slice.call(scene.querySelectorAll('[data-role]'))).forEach(function (e) { var r = e.getAttribute('data-role'); if (r && C.ROLE[r]) roles[r] = true; });
            b.querySelector('.tb-tab-n').textContent = Object.keys(roles).length;
            b.title = Object.keys(roles).length + ' colors you can click in this scene';
        });
    }
    countScenes();
    var lit = [];
    var flashed = [];
    function outline(aEls, aClass) {
        lit.forEach(function (e) { e.classList.remove('pv-affected'); });
        lit = aClass === 'pv-affected' ? aEls : [];
        // a new change flashes alone: the last one's marks go
        if (aClass === 'pv-changed') {
            flashed.forEach(function (e) { e.classList.remove('pv-changed'); });
            flashed = aEls;
        }
        aEls.forEach(function (e) {
            if (aClass === 'pv-changed') {
                e.classList.remove('pv-changed');
                void e.offsetWidth;
            }
            e.classList.add(aClass);
        });
    }
    function changedRoles() {
        var a = startRoles(), b = resolved();
        return C.ROLES.filter(function (d) { return a[d.key] !== b[d.key]; }).length;
    }
    /** The theme in use (null: Dark), as neo-web last answered. */
    function currentChoice() {
        return state.choice;
    }
    function isInUse(aPkg, aStylesheet) {
        var c = currentChoice();
        return !!c && c.pkg === aPkg && c.stylesheet === aStylesheet;
    }
    function hrefOf(aPkg, aStylesheet) {
        return '/public/' + encodeURIComponent(aPkg) + '/' + aStylesheet.split('/').map(encodeURIComponent).join('/');
    }

    // ---- package files ---------------------------------------------------------------------

    function readText(aHref) {
        return fetch(aHref, { cache: 'no-store' }).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.text();
        });
    }
    function readIndex(aPath) {
        return readText(BASE + aPath)
            .then(function (t) { var j = JSON.parse(t); return Array.isArray(j) ? j : (j && j.themes) || []; })
            .catch(function () { return []; });
    }

    // ---- neo-web ---------------------------------------------------------------------------

    function tell(aMessage) {
        try {
            if (window.parent && window.parent !== window) window.parent.postMessage(Object.assign({ type: 'neo-theme' }, aMessage), location.origin);
        } catch (e) {
            /* not inside neo-web */
        }
    }

    var asked = {};
    var lastRequest = 0;
    /** Asks neo-web (themes, save, delete); resolves with its reply, rejects when nothing answers. */
    function ask(aMessage) {
        return new Promise(function (resolve, reject) {
            if (!window.parent || window.parent === window) {
                reject(new Error('open the Theme Builder from the web UI (Settings → Theme)'));
                return;
            }
            var request = ++lastRequest;
            asked[request] = {
                resolve: resolve,
                timer: setTimeout(function () {
                    delete asked[request];
                    reject(new Error('the web UI did not answer'));
                }, 5000),
            };
            tell(Object.assign({ request: request }, aMessage));
        });
    }
    /** What every reply carries: the browser's themes and the theme in use. */
    function takeReply(aReply) {
        state.hosted = true;
        state.mine = Array.isArray(aReply.themes) ? aReply.themes : [];
        state.choice = aReply.choice && typeof aReply.choice === 'object' ? aReply.choice : null;
        if (aReply.edit && typeof aReply.edit === 'object' && typeof aReply.edit.pkg === 'string' && typeof aReply.edit.stylesheet === 'string') state.editRequest = aReply.edit;
    }
    /** Asks for the browser's themes again (after a change here, in the web UI or in another tab). */
    function refreshMine() {
        return ask({ action: 'themes' }).then(
            function (r) {
                takeReply(r);
                wearChosenTheme();
                if (state.start) {
                    renderTop();
                    renderStarts();
                    openRequested();
                }
            },
            function () { /* not inside neo-web: nothing to show */ }
        );
    }
    window.addEventListener('message', function (e) {
        var d = e.data;
        if (e.origin !== location.origin || e.source !== window.parent || !d || d.type !== 'neo-theme') return;
        if (d.action === 'reply' && asked[d.request]) {
            var waiting = asked[d.request];
            delete asked[d.request];
            clearTimeout(waiting.timer);
            takeReply(d);
            waiting.resolve(d);
        } else if (d.action === 'changed') {
            refreshMine();
        }
    });

    /** The builder itself wears the theme chosen in neo-web (its stylesheet, linked as neo-web links it). */
    function wearChosenTheme() {
        var c = currentChoice();
        var local = $('host-theme-local');
        if (c && c.pkg === LOCAL) {
            var own = state.mine.find(function (e) { return e.id + '.css' === c.stylesheet; });
            if (!local) {
                local = document.createElement('style');
                local.id = 'host-theme-local';
                document.head.insertBefore(local, document.head.querySelector('link'));
            }
            local.textContent = own ? C.toCss(C.parseCss(own.css), { label: own.label, scheme: own.scheme }) : '';
            if ($('host-theme')) $('host-theme').remove();
            document.body.style.colorScheme = c.scheme === 'light' ? 'light' : 'dark';
            return;
        }
        if (local) local.remove();
        var link = $('host-theme');
        var href = c && c.pkg && c.stylesheet ? hrefOf(c.pkg, c.stylesheet) : null;
        if (!href) {
            if (link) link.remove();
            document.body.style.colorScheme = '';
            return;
        }
        if (!link) {
            link = document.createElement('link');
            link.id = 'host-theme';
            link.rel = 'stylesheet';
            document.head.insertBefore(link, document.head.querySelector('link'));
        }
        if (link.getAttribute('data-href') !== href) {
            link.setAttribute('data-href', href);
            link.href = href + '?v=' + Date.now();
        }
        document.body.style.colorScheme = c.scheme === 'light' ? 'light' : 'dark';
    }

    // ---- messages --------------------------------------------------------------------------

    var msgTimer = 0;
    function say(aText, aKind, aAction) {
        var m = $('msg');
        m.hidden = false;
        $('msg-text').textContent = aText;
        m.setAttribute('data-kind', aKind || 'info');
        var b = $('msg-action');
        b.hidden = !aAction;
        b.onclick = null;
        if (aAction) {
            b.textContent = aAction.label;
            b.onclick = function () { m.hidden = true; aAction.run(); };
        }
        clearTimeout(msgTimer);
        if (aKind !== 'error') msgTimer = setTimeout(function () { m.hidden = true; }, aAction ? 12000 : 5000);
    }

    // ---- starting points -------------------------------------------------------------------

    /** The start read as roles: its own colors and how the rest hang on them. */
    function readStart(aStart) {
        var t = C.readTheme(aStart.vars, state.defaults, aStart.scheme, aStart.roles || C.rolesFromSeeds(aStart.seeds));
        aStart.own = t.own;
        aStart.rel = t.rel;
        aStart.bind = t.bind;
        // moveVars works a part's unset token out from what it falls back to, down to these
        aStart.defaults = t.defaults;
    }
    function pinnedFor(aStart) {
        var p = {};
        Object.keys(aStart.pinned || {}).forEach(function (k) { if (has(state.defaults, k) && C.isSafeValue(aStart.pinned[k])) p[k] = aStart.pinned[k]; });
        return p;
    }
    function choose(aStart) {
        readStart(aStart);
        aStart.pinned = pinnedFor(aStart);
        state.start = aStart;
        state.own = Object.assign({}, aStart.own);
        state.pinned = Object.assign({}, aStart.pinned);
        state.picture = aStart.picture || null;
        state.editingId = aStart.kind === 'mine' ? aStart.id : null;
        state.name = nameFor(aStart);
        render();
    }
    /** The name a start gives the theme made from it (yours keeps its own). */
    function nameFor(aStart) {
        return aStart.kind === 'mine' ? aStart.label : aStart.kind === 'dark' ? 'My theme' : aStart.label + ' copy';
    }
    /**
     * The start as it is: nothing changed and the name it gave left alone. Such a theme is used as it
     * is — Dark, the preset, yours — and not saved again. A theme read from a file is kept nowhere yet.
     */
    function unchanged() {
        return !!state.start && state.start.kind !== 'import' && !dirty() && (state.name || '').trim() === nameFor(state.start);
    }
    /** What neo-web is told to wear for the start used as it is; undefined: there is nothing to switch to. */
    function startChoice() {
        var s = state.start;
        if (s.kind === 'dark') return null;
        if (s.kind === 'preset') {
            var preset = state.presets.find(function (e) { return 'preset:' + e.stylesheet === s.key; });
            return preset ? Object.assign({ pkg: PKG, stylesheet: preset.stylesheet, label: preset.label, scheme: s.scheme }, state.version ? { version: state.version } : {}) : undefined;
        }
        if (s.kind === 'mine') return { pkg: LOCAL, stylesheet: s.id + '.css', label: s.label, scheme: s.scheme };
        if (s.kind === 'inuse') return state.inUse ? state.inUse.choice : undefined;
        return undefined;
    }
    /** The start used as it is is the theme in use already. */
    function startInUse() {
        var c = startChoice();
        if (c === undefined) return false;
        return c === null ? !currentChoice() : isInUse(c.pkg, c.stylesheet);
    }
    /** Use this theme: the start as it is is switched to; a changed one is saved first (to My themes). */
    function useTheme() {
        if (state.busy || cannotSave()) return;
        if (!unchanged()) return saveTheme({ use: true });
        var choice = startChoice();
        if (choice === undefined || startInUse()) return;
        var previous = currentChoice();
        var label = choice ? choice.label : 'Dark';
        tell({ action: 'apply', choice: choice });
        say(label + ' is in use.', 'ok', {
            label: 'Undo',
            run: function () {
                tell({ action: 'apply', choice: previous && previous.pkg ? previous : null });
                say('Back to ' + (previous && previous.label ? previous.label : 'Dark') + '.', 'ok');
            },
        });
    }
    /** A theme neo-web asked to open here (Settings → Theme, Edit): opened like a click on its card. */
    function openRequested() {
        var r = state.editRequest;
        if (!r || !state.start) return;
        state.editRequest = null;
        var own = r.pkg === LOCAL ? state.mine.find(function (e) { return e.id + '.css' === r.stylesheet; }) : null;
        var preset = !own && r.pkg === PKG ? state.presets.find(function (e) { return e.stylesheet === r.stylesheet; }) : null;
        var key = own ? 'mine:' + own.id : preset ? 'preset:' + preset.stylesheet : null;
        if (!key || key === state.start.key) return;
        if (dirty() && !window.confirm('Leave the changes you made to ' + (state.name || 'this theme') + ' and open ' + (own || preset).label + '?')) return;
        if (own) chooseMine(own);
        else chooseEntry('preset', preset);
    }
    function chooseDark() {
        choose({ key: 'dark', kind: 'dark', label: 'Dark', scheme: 'dark', vars: {} });
    }
    function chooseEntry(aKind, aEntry) {
        return readText(BASE + aEntry.stylesheet).then(
            function (css) {
                choose({ key: aKind + ':' + aEntry.stylesheet, kind: aKind, id: aEntry.id, label: aEntry.label, scheme: aEntry.scheme === 'light' ? 'light' : 'dark', vars: C.parseCss(css), roles: aEntry.roles, seeds: aEntry.seeds, pinned: aEntry.pinned });
            },
            function (err) { say('Could not read ' + aEntry.stylesheet + ': ' + err.message, 'error'); }
        );
    }
    function chooseMine(aEntry) {
        choose({ key: 'mine:' + aEntry.id, kind: 'mine', id: aEntry.id, label: aEntry.label, scheme: aEntry.scheme === 'light' ? 'light' : 'dark', vars: C.parseCss(aEntry.css), roles: aEntry.roles, pinned: aEntry.pinned, picture: null });
        if (!aEntry.loginImage) return;
        // its picture is a file neo-web keeps (IndexedDB): asked for, shown when it comes
        var key = state.start.key;
        ask({ action: 'picture', id: aEntry.id }).then(
            function (r) {
                if (!state.start || state.start.key !== key || !isPicture(r.picture)) return;
                // not changed here meanwhile: the theme's picture is the one on screen
                if (state.picture === state.start.picture) state.picture = r.picture;
                state.start.picture = r.picture;
                renderLogin();
                renderPreview();
            },
            function () { /* not answered: the theme opens without its picture */ }
        );
    }
    function chooseInUse() {
        var u = state.inUse;
        choose({ key: 'inuse', kind: 'inuse', label: u.choice.label || u.choice.pkg, scheme: u.choice.scheme === 'light' ? 'light' : 'dark', vars: u.vars });
    }

    // ---- save / delete ---------------------------------------------------------------------

    /** Why Save cannot be used now, or '' when it can. */
    function cannotSave() {
        return state.hosted ? '' : 'Open the Theme Builder from the web UI (Settings → Theme) to save';
    }

    /** Saves the theme in this browser: neo-web keeps it (no server write). */
    function saveTheme(aOptions) {
        if (state.busy) return;
        if (cannotSave()) {
            say(cannotSave() + ': a theme is kept in this browser.', 'error');
            return;
        }
        var label = (state.name || '').trim() || 'My theme';
        var copy = aOptions && aOptions.copy;
        var id = !copy && state.editingId ? state.editingId : C.uniqueId(C.slug(label), state.mine.map(function (e) { return e.id; }));
        var vars = themeVars();
        var css = C.toCss(vars, { label: label, scheme: state.scheme, roles: resolved() }, state.tokens.map(function (t) { return t.name; }));
        var entry = { id: id, label: label, scheme: state.scheme, css: css, swatch: C.swatchOf(vars, state.defaults), note: 'Mine', roles: state.own, pinned: state.pinned, saved: Date.now() };
        var choice = { pkg: LOCAL, stylesheet: id + '.css', label: label, scheme: state.scheme };
        var wasInUse = isInUse(LOCAL, choice.stylesheet);
        var previous = currentChoice();
        var saved = { own: Object.assign({}, state.own), pinned: Object.assign({}, state.pinned), picture: state.picture };
        state.busy = true;
        renderTop();
        // the picture goes as the file it is; null takes the theme's away
        ask({ action: 'save', theme: entry, picture: state.picture || null })
            .then(function (r) {
                if (!r.ok) {
                    say('Could not save in this browser (' + (r.reason || 'the web UI refused it') + '). Export CSS keeps a copy.', 'error');
                    return;
                }
                state.start = { key: 'mine:' + id, kind: 'mine', id: id, label: label, scheme: choice.scheme, vars: vars, roles: saved.own, pinned: saved.pinned, picture: saved.picture };
                readStart(state.start);
                state.own = Object.assign({}, state.start.own);
                state.editingId = id;
                state.name = label;
                if (aOptions && aOptions.use) {
                    tell({ action: 'apply', choice: choice, reload: true });
                    say(label + ' is in use.', 'ok', {
                        label: 'Undo',
                        run: function () {
                            tell({ action: 'apply', choice: previous && previous.pkg ? previous : null });
                            say('Back to ' + (previous && previous.label ? previous.label : 'Dark') + '.', 'ok');
                        },
                    });
                } else if (wasInUse) {
                    tell({ action: 'apply', choice: choice, reload: true });
                    say('Saved — the theme in use is updated.', 'ok');
                } else {
                    say('Saved in this browser.', 'ok', { label: 'Use it', run: function () { tell({ action: 'apply', choice: choice, reload: true }); say(label + ' is in use.', 'ok'); } });
                }
            }, function (err) {
                say('Could not save (' + err.message + '). Export CSS keeps a copy.', 'error');
            })
            .then(function () {
                state.busy = false;
                render();
            });
    }

    function deleteMine(aEntry) {
        if (!window.confirm('Delete the theme "' + aEntry.label + '"?')) return;
        // neo-web takes the theme in use back to Dark when it is this one
        ask({ action: 'delete', id: aEntry.id }).then(
            function (r) {
                if (!r.ok) {
                    say('Delete failed: ' + (r.reason || 'the web UI refused it'), 'error');
                    return;
                }
                if (state.editingId === aEntry.id) state.editingId = null;
                say('Deleted ' + aEntry.label + '.', 'ok');
                render();
            },
            function (err) { say('Delete failed: ' + err.message, 'error'); }
        );
    }

    // ---- render: top -----------------------------------------------------------------------

    function renderTop() {
        var nameInput = $('name');
        if (document.activeElement !== nameInput) nameInput.value = state.name;
        // nothing changed: nothing to save — the start is used as it is (Use this theme)
        var same = !cannotSave() && unchanged();
        var label = state.start ? (state.start.kind === 'dark' ? 'Dark' : state.start.label) : '';
        ['save', 'save-menu-btn', 'save-copy', 'save-use'].forEach(function (b) {
            var nothing = same && b !== 'save-use';
            var inUse = same && b === 'save-use' && startInUse();
            $(b).disabled = state.busy || !!cannotSave() || nothing || inUse;
            // why it cannot be used, or what it does now, or the button's own hint (data-title)
            $(b).title = cannotSave() || (nothing ? 'No changes from ' + label + ' yet: change something to save it as your own theme' : '') ||
                (inUse ? label + ' is in use' : '') || (same && b === 'save-use' ? 'Switches the web UI to ' + label + ' as it is' : '') ||
                $(b).getAttribute('data-title') || '';
        });
    }

    // ---- render: start ---------------------------------------------------------------------

    function swatchHtml(aColors) {
        return '<span class="tb-swatch">' + aColors.map(function (c) { return '<i style="background:' + esc(c) + '"></i>'; }).join('') + '</span>';
    }
    function startHtml(aKey, aLabel, aKind, aColors, aUse, aDeletable) {
        var current = state.start && state.start.key === aKey;
        return (
            '<div class="tb-start" role="button" tabindex="0" data-start="' + esc(aKey) + '" aria-current="' + current + '">' +
            '<span class="tb-start-top"><span class="tb-start-name">' + esc(aLabel) + '</span>' +
            '<span class="tb-start-kind' + (aUse ? ' tb-start-kind--use' : '') + '">' + esc(aUse ? 'In use' : aKind) + '</span></span>' +
            // the swatch and, on a theme you saved, its Delete button share the bottom row: a button
            // the size of a control, outlined while the card is under the pointer, not a word over the card
            '<span class="tb-start-bottom">' + swatchHtml(aColors) +
            (aDeletable ? '<button type="button" class="tb-start-del" data-del="' + esc(aKey) + '" title="Delete this theme" aria-label="Delete ' + esc(aLabel) + '">Delete</button>' : '') +
            '</span></div>'
        );
    }
    function renderStarts() {
        var html = '';
        if (state.inUse) html += startHtml('inuse', state.inUse.choice.label || state.inUse.choice.pkg, '', C.swatchOf(state.inUse.vars, state.defaults), true, false);
        html += startHtml('dark', 'Dark', 'Built-in', C.swatchOf({}, state.defaults), !currentChoice(), false);
        html += state.presets.map(function (e) { return startHtml('preset:' + e.stylesheet, e.label, 'Preset', e.swatch || [], isInUse(PKG, e.stylesheet), false); }).join('');
        html += '<span class="tb-starts-label">My themes · this browser</span>';
        html += state.mine.length
            ? state.mine.map(function (e) { return startHtml('mine:' + e.id, e.label, e.scheme === 'light' ? 'Light' : 'Dark', e.swatch || [], isInUse(LOCAL, e.id + '.css'), true); }).join('')
            : '<span class="tb-starts-label">No saved themes yet.</span>';
        if (state.start && state.start.kind === 'import') html += '<span class="tb-starts-label">Imported</span>' + startHtml(state.start.key, state.start.label, 'File', C.swatchOf(state.start.vars, state.defaults), false, false);
        $('starts').innerHTML = html;
    }

    // ---- render: roles ---------------------------------------------------------------------

    /**
     * How a color moves, in its row: "follows X" (X changes it), "from X" (worked out from X), "auto",
     * or "custom" (its own color: nothing else changes it). When the start draws a following color as
     * a shade of X — Light's tab and GNB markers are a deeper gold than its Accent, so they read on the
     * light bars — the row says which shade, so a box that differs from X is never called the same.
     */
    function relText(aRole, aR) {
        var bind = state.start && state.start.rel[aRole.key];
        return C.relationText(aRole.key, aR, {
            own: has(state.own, aRole.key),
            to: bind && bind.to,
            start: state.start.kind === 'dark' && !Object.keys(state.start.vars || {}).length ? null : state.start.label,
            sources: aRole.auto && !aRole.follow && !aRole.basis ? C.sourcesOf(aRole.key, state.own, state.scheme, state.start.rel) : null,
        });
    }
    /** A root color's row: the shared colors that change with it, so none of them comes as a surprise. */
    function movesHtml(aKey) {
        if (!C.isRoot(aKey)) return '';
        var listed = C.descendantsOf(aKey).map(function (d) { return d.key; });
        var keys = C.dependentsOf(aKey, state.own, state.scheme, state.start.rel).filter(function (k) { return listed.indexOf(k) < 0; });
        if (!keys.length) return '';
        var names = keys.map(function (k) { return C.ROLE[k].label; }).join(' · ');
        return '<small class="tb-moves" title="' + esc('Changing ' + C.ROLE[aKey].label + ' also changes: ' + names + ' (and the parts that follow them)') + '">Moves: ' + esc(names) + '</small>';
    }
    function wellHtml(aKey, aLabel, aValue, aSmall) {
        return '<label class="tb-well' + (aSmall ? ' tb-well--small' : '') + '" title="' + esc(aLabel) + '"><i style="background:' + esc(aValue) + '"></i><input type="color" data-role="' + aKey + '" value="' + esc(aValue) + '" /></label>';
    }
    function hexHtml(aKey, aLabel, aValue) {
        return '<input class="tb-hex" data-role-hex="' + aKey + '" value="' + esc(aValue) + '" spellcheck="false" aria-label="' + esc(aLabel) + ' color" />';
    }
    /**
     * A part's color, in its part's group. Following: its shared color moves it, and Customize gives
     * the part its own. Its own: nothing else moves it, and "Use <shared>" gives it back.
     */
    function partRowHtml(aRole, aValue, aR) {
        var own = has(state.own, aRole.key);
        var parent = C.ROLE[C.parentOf(aRole.key)];
        // under a shared color several parts sit together: each row names its part ("Tables · Hover background")
        var isPart = C.PART_GROUPS.indexOf(aRole.group) >= 0;
        var title = isPart ? aRole.group + ' · ' + aRole.label : aRole.label;
        var name = '<b>' + esc(title) + '</b>';
        var tip = esc(title + ' — ' + aRole.where);
        if (!own) {
            return (
                '<div class="tb-role tb-kid" data-role-row="' + aRole.key + '" title="' + tip + '">' +
                '<span class="tb-kid-swatch"><i style="background:' + esc(aValue) + '"></i></span>' +
                '<span class="tb-role-text">' + name + '<small>' + esc(relText(aRole, aR)) + '</small>' + (isPart ? '' : '<small class="tb-impact" title="' + esc(aRole.where) + '">' + esc(aRole.where) + '</small>') + '</span>' +
                '<button type="button" class="tb-follow" data-customize="' + aRole.key + '" title="Give ' + esc(title) + ' its own color; ' + esc(parent ? parent.label : 'nothing') + ' no longer moves it">Customize</button>' +
                '<code class="tb-kid-hex" title="The color it has now">' + esc(aValue) + '</code>' +
                '</div>'
            );
        }
        return (
            '<div class="tb-role tb-kid tb-kid--own" data-role-row="' + aRole.key + '" title="' + tip + '">' +
            wellHtml(aRole.key, title, aValue, true) +
            '<span class="tb-role-text">' + name + '<small>custom</small>' + (isPart ? '' : '<small class="tb-impact" title="' + esc(aRole.where) + '">' + esc(aRole.where) + '</small>') + '</span>' +
            (parent ? '<button type="button" class="tb-follow" data-follow="' + aRole.key + '" title="Let it follow ' + esc(parent.label) + ' again">Use ' + esc(parent.label) + '</button>' : '<span></span>') +
            hexHtml(aRole.key, title, aValue) +
            '</div>'
        );
    }
    /** A shared color: what it is, where it shows (one line; the full list on hover), how it moves. */
    function sharedRowHtml(d, r, now) {
        var v = r[d.key];
        var own = has(state.own, d.key);
        var link = d.group === 'Basics' || !(d.follow || d.auto)
            ? '<span></span>'
            : own
              ? '<button type="button" class="tb-follow" data-follow="' + d.key + '" title="' + esc(d.follow ? 'Let it follow ' + C.ROLE[d.follow].label + ' again' : 'Let it be worked out from the other colors again') + '">custom · reset</button>'
              : '<span class="tb-follow">' + esc(relText(d, r)) + '</span>';
        var places = placesText(placesOf(d.key, now), d);
        var kids = C.descendantsOf(d.key);
        var kidsOwn = kids.filter(function (k) { return has(state.own, k.key); }).length;
        var open = !!state.openKids[d.key];
        var kidsHtml = !kids.length
            ? ''
            : '<div class="tb-kids">' +
              '<button type="button" class="tb-kids-toggle" data-kids="' + d.key + '" aria-expanded="' + open + '">' +
              'Using it <span class="tb-kids-count">' + kids.length + '</span>' +
              (kidsOwn ? '<span class="tb-kids-own">' + kidsOwn + ' custom</span>' : '') +
              '</button>' +
              // a part's box shows what the screen shows: its token as set, on the part's own background
              (open ? kids.map(function (k) { var kv = now[k.token]; return partRowHtml(k, k.under && r[k.under] && kv ? C.toHex(C.over(kv, r[k.under])) || r[k.key] : r[k.key], r); }).join('') : '') +
              '</div>';
        return (
            '<div class="tb-role" data-role-row="' + d.key + '">' +
            wellHtml(d.key, d.label, v) +
            '<span class="tb-role-text"><b>' + esc(d.label) + '</b>' +
            // what it paints, in words; the measured list of screens is there when you point at it
            '<small class="tb-impact" title="' + esc('Changes: ' + places) + '">' + esc(d.where) + '</small>' + movesHtml(d.key) + '</span>' +
            link +
            hexHtml(d.key, d.label, v) +
            '</div>' +
            kidsHtml
        );
    }
    /** Roles of a group whose color is not the start's: what the group's summary counts. */
    function changedIn(aRoles, aStart, aNow) {
        return aRoles.filter(function (d) { return aStart[d.key] !== aNow[d.key]; }).length;
    }
    function groupHtml(g, aRows, aRoles, aStart, r, aExtra) {
        var n = changedIn(aRoles, aStart, r);
        // a root color (the basics, the three signals) is always the theme's own: only a color that could follow counts as custom
        var own = aRoles.filter(function (d) { return (d.follow || d.auto || d.basis) && has(state.own, d.key); }).length;
        var sum = [n ? n + ' changed' : '', own ? own + ' custom' : ''].filter(Boolean).join(' · ');
        return (
            '<details class="tb-group" data-group="' + esc(g) + '"' + (state.open[g] ? ' open' : '') + '>' +
            '<summary>' + esc(g) + '<span class="tb-group-sum">' + esc(sum) + '</span>' + swatchHtml(aRoles.slice(0, 6).map(function (d) { return r[d.key]; })) + '</summary>' +
            aRows + (aExtra || '') + '</details>'
        );
    }
    function renderRoles() {
        var r = resolved();
        var start = startRoles();
        var n = changedRoles();
        $('mode').textContent = n ? n + ' changed from ' + (state.start.kind === 'dark' ? 'Dark' : state.start.label) : 'no changes from ' + (state.start.kind === 'dark' ? 'Dark' : state.start.label);
        var now = shownVars();
        var shared = C.ROLE_GROUPS.filter(function (g) { return C.PART_GROUPS.indexOf(g) < 0; });
        $('roles').innerHTML =
            '<div class="tb-section tb-section--first"><b>Shared colors</b><small>Change one and everything using it follows. To change one of them alone, open “Using it” under the color and Customize it.</small></div>' +
            shared.map(function (g) {
                // a color that is another's color is listed under that one, not here
                var roles = C.ROLES.filter(function (d) { return d.group === g && !C.parentOf(d.key); });
                if (!roles.length) return '';
                // a group's summary counts what is listed under its colors too
                var family = roles.concat.apply(roles, roles.map(function (d) { return C.descendantsOf(d.key); }));
                return groupHtml(g, roles.map(function (d) { return sharedRowHtml(d, r, now); }).join(''), family, start, r, g === 'Basics' ? cornersHtml() : '');
            }).join('');
    }

    // ---- render: cursor effect (cursor-fx.js draws it) --------------------------------------

    function renderEffects() {
        if (!has(state.defaults, 'fx-cursor')) {
            $('effects').innerHTML = '<p class="tb-fx-note">This neo-web has no cursor effects.</p>';
            return;
        }
        var now = String(shownVars()['fx-cursor'] || 'none').trim().toLowerCase();
        $('effects').innerHTML =
            CursorFx.EFFECTS.map(function (f) {
                return (
                    '<button type="button" class="tb-fx" data-cursor="' + esc(f.id) + '" aria-pressed="' + (f.id === now) + '">' +
                    '<span class="tb-fx-icon tb-fx-icon--' + esc(f.id) + '"></span>' +
                    '<span class="tb-role-text"><b>' + esc(f.label) + '</b><small>' + esc(f.note) + '</small></span></button>'
                );
            }).join('');
    }

    // the effect over the preview follows the theme being edited
    var fx = { name: null, light: false, stop: null };
    function syncPreviewFx() {
        var name = String(shownVars()['fx-cursor'] || 'none').trim().toLowerCase();
        var light = state.scheme === 'light';
        if (fx.stop && name === fx.name && light === fx.light) return;
        if (fx.stop) fx.stop();
        fx = { name: name, light: light, stop: CursorFx.start(name, $('pv'), light) };
    }

    var CORNERS = [['0', 'None'], ['0.5', 'Small'], ['1', 'Default'], ['1.5', 'Large'], ['2.5', 'Extra large']];
    function cornersHtml() {
        if (!has(state.defaults, 'radius-scale')) return '';
        var now = String(parseFloat(shownVars()['radius-scale']) || 0);
        return (
            '<div class="tb-role tb-corners" data-role-row="corners"><span class="tb-corner-icon" style="border-top-left-radius:' + Math.min(14, 6 * parseFloat(now)) + 'px"></span>' +
            '<span class="tb-role-text"><b>Corners</b><small title="buttons, inputs, cards, dialogs">buttons, inputs, cards, dialogs</small></span>' +
            '<span class="tb-seg tb-seg--sm">' + CORNERS.map(function (c) { return '<button type="button" data-corners="' + c[0] + '" aria-checked="' + (c[0] === now) + '">' + c[1] + '</button>'; }).join('') + '</span></div>'
        );
    }

    // ---- the sign-in page's picture ----------------------------------------------------------

    /** What neo-web keeps as it is (a picture an <img> shows, nothing that runs), and up to what size. */
    var PICTURE_TYPES = ['image/webp', 'image/png', 'image/jpeg', 'image/gif', 'image/avif'];
    var PICTURE_MAX_BYTES = 10 * 1024 * 1024;
    /** A picture neo-web would not keep is made into a WebP this wide at most. */
    var PICTURE_SIDE = 1920;
    var DEFAULT_PICTURE = BASE + 'login-default.webp';

    function isPicture(aBlob) {
        return typeof Blob !== 'undefined' && aBlob instanceof Blob && PICTURE_TYPES.indexOf(aBlob.type) >= 0 && aBlob.size > 0 && aBlob.size <= PICTURE_MAX_BYTES;
    }
    function pictureSize(aBlob) {
        return aBlob.size < 1024 * 1024 ? Math.max(1, Math.round(aBlob.size / 1024)) + ' KB' : (aBlob.size / 1024 / 1024).toFixed(1) + ' MB';
    }
    function canvasBlob(aCanvas, aType, aQuality) {
        return new Promise(function (resolve) { aCanvas.toBlob(resolve, aType, aQuality); });
    }
    /**
     * The picture to keep: the file itself when neo-web keeps it as it is; otherwise (SVG, HEIC,
     * over PICTURE_MAX_BYTES…) drawn again as a WebP at most PICTURE_SIDE on its longer side.
     */
    function readPicture(aFile) {
        return new Promise(function (resolve, reject) {
            var url = URL.createObjectURL(aFile);
            var img = new Image();
            img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
            img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('this browser cannot read it as a picture')); };
            img.src = url;
        }).then(function (img) {
            var w = img.naturalWidth, h = img.naturalHeight;
            if (!w || !h) throw new Error('the picture has no size');
            if (isPicture(aFile)) return { blob: aFile, width: w, height: h, redrawn: false };
            var scale = Math.min(1, PICTURE_SIDE / Math.max(w, h));
            var tries = 0;
            var draw = function () {
                var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
                var canvas = document.createElement('canvas');
                canvas.width = cw;
                canvas.height = ch;
                canvas.getContext('2d').drawImage(img, 0, 0, cw, ch);
                return canvasBlob(canvas, 'image/webp', 0.85)
                    .then(function (b) { return b && b.type === 'image/webp' ? b : canvasBlob(canvas, 'image/png'); })
                    .then(function (b) {
                        if (isPicture(b)) return { blob: b, width: cw, height: ch, redrawn: true };
                        if (++tries >= 6) throw new Error('it stays too large even made smaller');
                        scale *= 0.7;
                        return draw();
                    });
            };
            return draw();
        });
    }
    /** The picture on screen, as an address: one object URL per picture, let go when it changes. */
    var shownBlob = null, shownUrl = null;
    function pictureUrl() {
        if (state.picture !== shownBlob) {
            if (shownUrl) URL.revokeObjectURL(shownUrl);
            shownBlob = state.picture;
            shownUrl = state.picture ? URL.createObjectURL(state.picture) : null;
        }
        return shownUrl || DEFAULT_PICTURE;
    }
    function renderLogin() {
        var pic = state.picture;
        $('login').innerHTML =
            '<div class="tb-login-row">' +
            '<span class="tb-login-thumb" id="login-thumb"></span>' +
            '<span class="tb-role-text"><b>' + (pic ? 'Your picture' : 'The web UI\'s picture') + '</b>' +
            '<small>' + (pic ? pictureSize(pic) + ', kept with the theme' : 'behind the sign-in box') + '</small></span>' +
            '</div>' +
            '<div class="tb-login-acts">' +
            '<button type="button" class="tb-btn" data-login="pick">' + (pic ? 'Change picture…' : 'Choose a picture…') + '</button>' +
            (pic ? '<button type="button" class="tb-link" data-login="remove">Use the web UI\'s picture</button>' : '') +
            '</div>' +
            '<p class="tb-fx-note">Shown on the sign-in page in this browser while this theme is the one in use. The picture is kept as it is; an SVG, or one over ' + PICTURE_MAX_BYTES / 1024 / 1024 + ' MB, is made into a WebP at most ' + PICTURE_SIDE + ' px wide.</p>';
        var url = 'url("' + pictureUrl() + '")';
        $('login-thumb').style.backgroundImage = url;
        if (shownPicture !== url) $('pv-login-pic').style.backgroundImage = shownPicture = url;
    }
    var shownPicture = null;
    function setPicture(aBlob) {
        state.picture = aBlob;
        state.scene = 'login';
        renderLogin();
        renderPreview();
    }
    function focusLogin(aPick) {
        flash($('login'));
        if (aPick) $('login-file').click();
    }

    // ---- render: tokens --------------------------------------------------------------------

    function renderTokenGroups() {
        var groups = [];
        state.tokens.forEach(function (t) { var g = C.groupOf(t.name, t); if (groups.indexOf(g) < 0) groups.push(g); });
        groups.sort(function (a, b) { return C.GROUPS.indexOf(a) - C.GROUPS.indexOf(b); });
        $('group').innerHTML = '<option value="">All groups</option>' + groups.map(function (g) { return '<option' + (g === state.tokenGroup ? ' selected' : '') + '>' + esc(g) + '</option>'; }).join('');
    }
    function renderRows() {
        var shown = shownVars();
        var q = state.filter.trim().toLowerCase();
        $('rows').innerHTML = state.tokens
            .filter(function (t) {
                if (state.tokenGroup && C.groupOf(t.name, t) !== state.tokenGroup) return false;
                return !q || t.name.indexOf(q) >= 0 || String(shown[t.name]).toLowerCase().indexOf(q) >= 0;
            })
            .map(function (t) {
                var v = shown[t.name];
                var hex = C.toHex(v);
                var well = hex
                    ? '<label class="tb-well tb-well--small"><i style="background:' + esc(v) + '"></i><input type="color" data-token="' + t.name + '" value="' + hex + '" /></label>'
                    : '<span class="tb-well tb-well--small tb-well--none"></span>';
                return (
                    '<div class="tb-row" data-token-row="' + t.name + '">' + well +
                    '<span class="tb-row-name" title="--neo-' + t.name + ' · default ' + esc(t.dark) + '">' + t.name + '</span>' +
                    '<input type="text" data-token-text="' + t.name + '" value="' + esc(v) + '" spellcheck="false" />' +
                    (has(state.pinned, t.name) ? '<button type="button" class="tb-pin" data-unpin="' + t.name + '" title="Set by hand — click to let it follow the colors again"></button>' : '<span></span>') +
                    '</div>'
                );
            })
            .join('');
        var n = Object.keys(state.pinned).length;
        $('tuned').textContent = n ? n + ' set by hand' : '';
        $('token-count').textContent = state.tokens.length + ' tokens' + (n ? ' · ' + n + ' by hand' : '');
    }

    // ---- render: preview -------------------------------------------------------------------

    function renderPreview() {
        var shown = shownVars();
        var pv = $('pv');
        setPreviewVars(shown);
        if (state.scheme === 'light') pv.setAttribute('data-light', '');
        else pv.removeAttribute('data-light');
        pv.setAttribute('data-scene', state.scene);
        Array.prototype.forEach.call(document.querySelectorAll('.tb-tabs [data-scene]'), function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-scene') === state.scene)); });
        var val = function (t) { return shown[t] !== undefined ? shown[t] : C.shownValue(t, shown, state.defaults); };
        // the start's own value: a pair the start already draws this way is not the change's doing
        var was = function (t) { return C.shownValue(t, state.start.vars || {}, state.defaults); };
        var ratio = function (v, text, bg, bg2) {
            var r = C.contrast(v(text), C.over(v(bg), v('bg-primary')));
            return bg2 ? Math.min(r, C.contrast(v(text), C.over(v(bg2), v('bg-primary')))) : r;
        };
        var startName = state.start.kind === 'dark' ? 'Dark' : state.start.label;
        var check = function (role, label, text, bg, min, bg2) {
            var r = ratio(val, text, bg, bg2), r0 = ratio(was, text, bg, bg2);
            var ok = r >= min;
            // below the need, but as the start has it: said so, not flagged as something this theme broke
            var same = !ok && r >= r0 - 0.05;
            var mark = ok ? '<em class="ok">OK</em>' : same ? '<em class="same">as in ' + esc(startName) + '</em>' : '<em class="low">LOW</em>';
            return '<div class="tb-check" data-check-role="' + role + '" title="' + esc(text + ' on ' + bg + (bg2 ? ' and ' + bg2 : '') + ' — needs ' + min + ':1' + (same ? '; ' + startName + ' draws it ' + r0.toFixed(1) + ':1' : '') + '. Click to change it.') + '"><span>' + esc(label) + '</span><b>' + r.toFixed(1) + ':1' + mark + '</b></div>';
        };
        $('checks').innerHTML =
            check('ink', 'Text on content', 'text-primary', 'bg-secondary', 4.5) +
            // what sits on the frame parts: the other tabs' names, the console bar's tab, the GNB icons
            check('tabbarTextInactive', 'Inactive tab text', 'tabbar-inactive-text', 'tabbar-bg', 4.5) +
            check('consoleTabText', 'Console tab names', 'console-tab-text', 'console-bg', 4.5) +
            check('gnbIcon', 'GNB icons', 'gnb-icon', 'gnb-bg', 3) +
            check('sideText', 'Side panel text', 'side-text', 'side-bg', 4.5) +
            // muted text is text: 4.5:1, or where the icons beside it read less, no fainter than they are
            check('muted', 'Sub text', 'text-muted', 'bg-secondary', Math.max(3, Math.min(4.5, Math.floor(C.contrast(val('text-icon'), C.over(val('bg-secondary'), shown['bg-primary'])) * 10) / 10))) +
            check('onAccent', 'Text on color', 'text-on-accent', 'button-primary-bg', 4.5, 'button-danger-bg') +
            // the success and warning fills carry the same text (badges, success and update buttons): 3:1 at least
            check('success', 'Text on signal fills', 'text-on-accent', 'success-main', 3, 'warning-main') +
            // the parts: shown when one does not read, as giving a part a dark or light background can make it
            [['dialogTitle', 'Dialog titles', 'dialog-title-text', 'dialog-bg', 4.5], ['dialogBg', 'Text in dialogs', 'text-primary', 'dialog-bg', 4.5],
                // a dialog's other words are the page's: they must read on the dialog's ground too
                ['dialogBg', 'Sub text in dialogs', 'text-muted', 'dialog-bg', 3], ['dialogBg', 'Links in dialogs', 'accent-text', 'dialog-bg', 4.5],
                ['dialogBg', 'Disabled text in dialogs', 'text-disabled', 'dialog-bg', 3],
                ['menu', 'Menu items', 'text-primary', 'menu-bg', 4.5], ['fieldBg', 'Input text', 'text-primary', 'field-bg', 4.5],
                ['tableHeaderText', 'Table header', 'table-header-text', 'table-header-bg', 3], ['tableRowNumber', 'Row numbers', 'table-row-number-text', 'bg-secondary', 3],
                ['consoleTextMuted', 'Log lines', 'console-text-muted', 'console-body-bg', 4.5],
                ['selection', 'Selected row', 'selected-text', 'selected-bg', 4.5]]
                .filter(function (c) { return C.contrast(val(c[2]), C.over(val(c[3]), shown['bg-primary'])) < c[4]; })
                .map(function (c) { return check(c[0], c[1], c[2], c[3], c[4]); }).join('');
        var vars = themeVars();
        $('css').textContent = C.toCss(vars, { label: state.name, scheme: state.scheme, roles: resolved() }, state.tokens.map(function (t) { return t.name; }));
        $('css-count').textContent = Object.keys(vars).length + ' variables';
        syncPreviewFx();
    }

    /**
     * A color is committed when its box loses focus — the hex box or the picker closing as a button is
     * pressed — and that drew the list again under the pointer: the press landed on a button that was
     * gone, and "Use Content" (Customize, a list's toggle) did nothing. While a pointer is down the list
     * waits; the preview changes at once, and the list is drawn once the press is over (after its click).
     */
    var pointerDown = false;
    var renderPending = false;
    document.addEventListener('pointerdown', function () { pointerDown = true; }, true);
    var pointerOver = function () {
        pointerDown = false;
        if (renderPending) setTimeout(function () { if (renderPending) render(); }, 0);
    };
    document.addEventListener('pointerup', pointerOver, true);
    document.addEventListener('pointercancel', pointerOver, true);
    function render() {
        renderPending = false;
        renderTop();
        renderStarts();
        renderRoles();
        renderEffects();
        renderLogin();
        renderRows();
        renderPreview();
    }

    // ---- input: colors --------------------------------------------------------------------

    var editBefore = null; // the preview as it was when a color started changing (picker drags render live)
    /**
     * A color set for a role. Not `aFull`: the preview only (a picker being dragged, a color being typed).
     * `aFull`: kept — the list drawn again and, unless `aQuiet`, what changed outlined and said, measured
     * from where the change started (editBefore), so a change is shown as the one it is.
     */
    function setRole(aKey, aHex, aFull, aQuiet) {
        var hex = C.toHex(aHex);
        if (!hex || !/^#[0-9a-f]{6}$/i.test(aHex.trim())) {
            if (aFull) editBefore = null;
            return false;
        }
        if (!editBefore) editBefore = snapshot();
        var before = editBefore;
        if (aFull) editBefore = null;
        state.own = Object.assign({}, state.own);
        state.own[aKey] = hex;
        if (aFull) {
            if (pointerDown) {
                renderPreview();
                renderPending = true;
            } else render();
            if (aQuiet) return true;
            var changed = changedBetween(before, snapshot());
            // changed where the scene on screen does not show it: the scene that does
            showSceneOf(changed);
            outline(changed, 'pv-changed');
            var d = C.ROLE[aKey];
            say((C.PART_GROUPS.indexOf(d.group) >= 0 ? d.group + ' · ' : '') + d.label + ' — changed ' + placesText(placesOf(aKey), d) + ' (' + changed.length + ' spots in the preview).');
        } else renderPreview();
        return true;
    }
    function setToken(aName, aValue, aFull) {
        if (!C.isSafeValue(aValue)) return false;
        state.pinned = Object.assign({}, state.pinned);
        state.pinned[aName] = aValue.trim();
        if (aFull) render();
        else renderPreview();
        return true;
    }
    function hexFromInput(aValue) {
        var v = aValue.trim();
        return v.charAt(0) === '#' ? v : '#' + v;
    }

    /** A color typed in a role's box, kept: on Enter it says what it changed; on leaving the box it is kept quietly (the preview showed it as it was typed). */
    function commitHex(aInput, aQuiet) {
        if (setRole(aInput.getAttribute('data-role-hex'), hexFromInput(aInput.value), true, aQuiet)) return;
        aInput.setAttribute('aria-invalid', 'true');
        say('A color is written like #1e1e1e.', 'error');
    }
    $('roles').addEventListener('input', function (e) {
        var typed = e.target.getAttribute('data-role-hex');
        if (typed) {
            // a whole color typed: the preview shows it at once
            var v = hexFromInput(e.target.value);
            if (/^#[0-9a-f]{6}$/i.test(v)) {
                e.target.removeAttribute('aria-invalid');
                setRole(typed, v, false);
            }
            return;
        }
        var key = e.target.getAttribute('data-role');
        if (!key) return;
        setRole(key, e.target.value, false);
        e.target.previousElementSibling.style.background = e.target.value;
    });
    // Enter keeps the typed color then and there — not later, when the pointer has gone on to another row.
    // Keeping it draws the list again, which takes the box away and fires its change: that one is this one.
    var keptBox = null;
    $('roles').addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' || !e.target.getAttribute('data-role-hex')) return;
        e.preventDefault();
        keptBox = e.target;
        commitHex(e.target, false);
        keptBox = null;
    });
    $('roles').addEventListener('change', function (e) {
        if (e.target.getAttribute('data-role-hex')) {
            if (e.target !== keptBox) commitHex(e.target, true);
            return;
        }
        var key = e.target.getAttribute('data-role');
        if (!key) return;
        setRole(key, e.target.value, true);
    });
    $('effects').addEventListener('click', function (e) {
        var b = e.target.closest('[data-cursor]');
        if (!b) return;
        var cursor = b.getAttribute('data-cursor');
        state.pinned = Object.assign({}, state.pinned);
        var startCursor = String(state.start.vars['fx-cursor'] || 'none').trim().toLowerCase();
        if (cursor === startCursor) delete state.pinned['fx-cursor'];
        else state.pinned['fx-cursor'] = cursor;
        render();
    });
    $('roles').addEventListener('mouseover', function (e) {
        var row = e.target.closest && e.target.closest('[data-role-row]');
        var key = row && row.getAttribute('data-role-row');
        if (!key || !C.ROLE[key] || key === outline.key) return;
        outline.key = key;
        var touched = previewOf(key);
        outline(touched, 'pv-affected');
        markTabs(scenesOf(touched));
        // the preview shows the color under the pointer: when the scene on screen does not draw it, one
        // that does (after a moment, so sweeping down the list does not flip through the scenes)
        clearTimeout(outline.timer);
        outline.timer = setTimeout(function () { if (outline.key === key) showSceneOf(touched); }, 180);
    });
    $('roles').addEventListener('mouseleave', function () {
        clearTimeout(outline.timer);
        outline.key = null;
        outline([], 'pv-affected');
        markTabs([]);
    });
    // a token's row does what a color's row does: the preview outlines what it paints, in a scene that draws it
    $('rows').addEventListener('mouseover', function (e) {
        var row = e.target.closest && e.target.closest('[data-token-row]');
        var key = row && 'token:' + row.getAttribute('data-token-row');
        if (!key || key === outline.key) return;
        outline.key = key;
        var touched = previewOfToken(row.getAttribute('data-token-row'));
        outline(touched, 'pv-affected');
        markTabs(scenesOf(touched));
        clearTimeout(outline.timer);
        outline.timer = setTimeout(function () { if (outline.key === key) showSceneOf(touched); }, 180);
    });
    $('rows').addEventListener('mouseleave', function () {
        clearTimeout(outline.timer);
        outline.key = null;
        outline([], 'pv-affected');
        markTabs([]);
    });
    $('roles').addEventListener('click', function (e) {
        var corners = e.target.getAttribute('data-corners');
        if (corners !== null) {
            state.pinned = Object.assign({}, state.pinned);
            var startValue = String(parseFloat(state.start.vars['radius-scale'] || state.defaults['radius-scale'] || '1'));
            if (corners === startValue) delete state.pinned['radius-scale'];
            else state.pinned['radius-scale'] = corners;
            render();
            return;
        }
        var kids = e.target.closest('[data-kids]');
        if (kids) {
            var of = kids.getAttribute('data-kids');
            state.openKids[of] = !state.openKids[of];
            renderRoles();
            return;
        }
        var custom = e.target.getAttribute('data-customize');
        if (custom) {
            // its own color, starting from the one it shows now (nothing changes yet); then the picker to change it
            setRole(custom, resolved()[custom], true, true);
            focusRole(custom, true);
            return;
        }
        var key = e.target.getAttribute('data-follow');
        if (!key) return;
        e.preventDefault();
        state.own = Object.assign({}, state.own);
        delete state.own[key];
        render();
    });
    $('roles').addEventListener(
        'toggle',
        function (e) {
            var g = e.target.getAttribute && e.target.getAttribute('data-group');
            if (g) state.open[g] = e.target.open;
        },
        true
    );
    $('rows').addEventListener('input', function (e) {
        var name = e.target.getAttribute('data-token');
        if (!name) return;
        setToken(name, C.keepAlpha(e.target.value, shownVars()[name]), false);
        e.target.previousElementSibling.style.background = shownVars()[name];
    });
    $('rows').addEventListener('change', function (e) {
        var name = e.target.getAttribute('data-token') || e.target.getAttribute('data-token-text');
        if (!name) return;
        if (e.target.type === 'text') {
            var v = e.target.value.trim();
            if (v === shownVars()[name]) return;
            if (!setToken(name, v, true)) {
                e.target.setAttribute('aria-invalid', 'true');
                say('Not a value a theme can set: ' + v, 'error');
            }
        } else render();
    });
    $('rows').addEventListener('click', function (e) {
        var name = e.target.getAttribute('data-unpin');
        if (!name) return;
        state.pinned = Object.assign({}, state.pinned);
        delete state.pinned[name];
        render();
    });
    $('search').addEventListener('input', function (e) {
        state.filter = e.target.value;
        renderRows();
    });
    $('group').addEventListener('change', function (e) {
        state.tokenGroup = e.target.value;
        renderRows();
    });
    $('reset').addEventListener('click', function () {
        state.own = Object.assign({}, state.start.own);
        state.pinned = Object.assign({}, state.start.pinned);
        render();
    });
    $('name').addEventListener('input', function (e) {
        state.name = e.target.value;
        renderTop();
    });

    // ---- input: start ----------------------------------------------------------------------

    /** Whether there are changes the start does not have (Save makes the saved theme the start). */
    function dirty() {
        var same = function (a, b) { return JSON.stringify(a || {}) === JSON.stringify(b || {}); };
        return !same(state.own, state.start.own) || !same(state.pinned, state.start.pinned) || (state.picture || null) !== (state.start.picture || null);
    }

    $('starts').addEventListener('click', function (e) {
        var del = e.target.closest('[data-del]');
        if (del) {
            var key0 = del.getAttribute('data-del');
            var own = state.mine.find(function (m) { return 'mine:' + m.id === key0; });
            if (own) deleteMine(own);
            return;
        }
        var card = e.target.closest('[data-start]');
        if (!card) return;
        var key = card.getAttribute('data-start');
        if (state.start && key !== state.start.key && dirty() && !window.confirm('Leave the changes you made to ' + (state.name || 'this theme') + ' and start from another theme?')) return;
        if (key === 'dark') return chooseDark();
        if (key === 'inuse') return chooseInUse();
        var preset = state.presets.find(function (p) { return 'preset:' + p.stylesheet === key; });
        if (preset) return chooseEntry('preset', preset);
        var own = state.mine.find(function (m) { return 'mine:' + m.id === key; });
        if (own) return chooseMine(own);
    });
    $('starts').addEventListener('keydown', function (e) {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.hasAttribute('data-start')) {
            e.preventDefault();
            e.target.click();
        }
    });

    // ---- input: preview (click a part to edit its color) -----------------------------------

    function partOf(aTarget, aEvent) {
        var el = aTarget.closest && aTarget.closest('[data-login-pic],[data-role],[data-token]');
        if (el && aEvent && /^(TD|TH)$/.test(el.tagName) && !overText(el, aEvent)) {
            var row = el.parentElement && el.parentElement.closest('[data-role],[data-token]');
            if (row) el = row;
        }
        return el && $('pv').contains(el) ? el : null;
    }
    /** Whether the pointer is over the element's own text (not the space around it). */
    function overText(aEl, aEvent) {
        var range = document.createRange();
        range.selectNodeContents(aEl);
        return Array.prototype.some.call(range.getClientRects(), function (b) { return aEvent.clientX >= b.left - 2 && aEvent.clientX <= b.right + 2 && aEvent.clientY >= b.top - 2 && aEvent.clientY <= b.bottom + 2; });
    }
    function labelOf(aEl) {
        if (aEl.hasAttribute('data-login-pic')) return 'Sign-in picture — click to choose another';
        var role = aEl.getAttribute('data-role');
        if (role && C.ROLE[role]) {
            var r = C.ROLE[role];
            // a part's color is named with its part ("Tables · Hover background"), as its row is
            return (C.PART_GROUPS.indexOf(r.group) >= 0 ? r.group + ' · ' + r.label : r.label) + ' — ' + r.where;
        }
        return '--neo-' + aEl.getAttribute('data-token');
    }
    function openPicker(aInput) {
        if (!aInput) return;
        aInput.focus();
        try {
            if (aInput.showPicker) aInput.showPicker();
        } catch (e) {
            /* a picker needs a click: the row is open and highlighted anyway */
        }
    }
    function flash(aRow) {
        if (!aRow) return;
        aRow.classList.remove('flash');
        void aRow.offsetWidth;
        aRow.classList.add('flash');
        aRow.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    function focusRole(aKey, aPick) {
        var top = aKey;
        while (C.parentOf(top)) top = C.parentOf(top);
        if (top !== aKey) state.openKids[top] = true;
        state.open[C.ROLE[top].group] = true;
        renderRoles();
        var row = document.querySelector('[data-role-row="' + aKey + '"]');
        flash(row);
        showSceneOf(previewOf(aKey));
        if (aPick) openPicker(row && row.querySelector('input[type=color]'));
    }
    function focusToken(aName, aPick) {
        state.filter = aName;
        state.tokenGroup = '';
        $('search').value = aName;
        renderTokenGroups();
        renderRows();
        var row = document.querySelector('[data-token-row="' + aName + '"]');
        flash(row);
        if (aPick) openPicker(row && row.querySelector('input[type=color]'));
    }
    var hot = null;
    $('pv').addEventListener('mousemove', function (e) {
        var el = partOf(e.target, e);
        if (el !== hot) {
            if (hot) hot.classList.remove('pv-hot');
            hot = el;
            if (hot) hot.classList.add('pv-hot');
        }
        var tag = $('pv-tag');
        if (!el) {
            tag.hidden = true;
            return;
        }
        var box = $('pv').getBoundingClientRect();
        tag.hidden = false;
        tag.textContent = labelOf(el);
        var x = e.clientX - box.left + 14, y = e.clientY - box.top + 16;
        tag.style.left = Math.min(x, box.width - tag.offsetWidth - 8) + 'px';
        tag.style.top = Math.min(y, box.height - 28) + 'px';
    });
    $('pv').addEventListener('mouseleave', function () {
        if (hot) hot.classList.remove('pv-hot');
        hot = null;
        $('pv-tag').hidden = true;
    });
    $('pv').addEventListener('click', function (e) {
        var el = partOf(e.target, e);
        if (!el) return;
        if (el.hasAttribute('data-login-pic')) return focusLogin(true);
        var role = el.getAttribute('data-role');
        if (role && C.ROLE[role]) focusRole(role, true);
        else focusToken(el.getAttribute('data-token'), true);
    });
    $('checks').addEventListener('click', function (e) {
        var c = e.target.closest('[data-check-role]');
        if (c) focusRole(c.getAttribute('data-check-role'), true);
    });
    document.querySelector('.tb-tabs').addEventListener('click', function (e) {
        var tab = e.target.closest('[data-scene]');
        var s = tab && tab.getAttribute('data-scene');
        if (!s) return;
        state.scene = s;
        renderPreview();
    });

    // ---- the Sandevistan trail over the preview (neo-web draws it over the whole page) ----------

    // ---- input: top bar --------------------------------------------------------------------

    // the top bar's two menus: CSS (import, export) and Save's other way to save
    var MENU_BUTTONS = ['css-menu-btn', 'save-menu-btn'];
    function closeMenus() {
        MENU_BUTTONS.forEach(function (id) {
            $($(id).getAttribute('data-menu')).hidden = true;
            $(id).setAttribute('aria-expanded', 'false');
        });
    }
    MENU_BUTTONS.forEach(function (id) {
        $(id).addEventListener('click', function (e) {
            e.stopPropagation();
            var menu = $($(id).getAttribute('data-menu')), open = menu.hidden;
            closeMenus();
            menu.hidden = !open;
            $(id).setAttribute('aria-expanded', String(open));
        });
    });
    document.addEventListener('click', closeMenus);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenus(); });
    $('export').addEventListener('click', function () {
        var blob = new Blob([C.toCss(themeVars(), { label: state.name, scheme: state.scheme, roles: resolved() }, state.tokens.map(function (t) { return t.name; }))], { type: 'text/css' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = C.slug(state.name) + '.css';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    });
    $('import').addEventListener('click', function () { $('import-file').click(); });
    $('import-file').addEventListener('change', function (e) {
        var f = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!f) return;
        f.text().then(function (css) {
            var vars = C.parseCss(css);
            if (!Object.keys(vars).length) return say('No --neo-* variables in ' + f.name + '.', 'error');
            var label = f.name.replace(/\.css$/i, '');
            choose({ key: 'import:' + f.name, kind: 'import', label: label, scheme: C.schemeOf(vars['bg-secondary'] || vars['bg-primary'] || '#000000'), vars: vars });
            state.name = label;
            renderTop();
            say('Read ' + Object.keys(vars).length + ' variables from ' + f.name + '.', 'ok');
        });
    });
    $('login').addEventListener('click', function (e) {
        var b = e.target.closest('[data-login]');
        if (!b) return;
        if (b.getAttribute('data-login') === 'pick') return $('login-file').click();
        setPicture(null);
        say('The sign-in page shows the web UI\'s picture again once you save.', 'ok');
    });
    $('login-file').addEventListener('change', function (e) {
        var f = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!f) return;
        readPicture(f).then(
            function (p) {
                setPicture(p.blob);
                say('Sign-in picture: ' + p.width + ' × ' + p.height + ', ' + pictureSize(p.blob) + (p.redrawn ? ' (made into a WebP)' : ', as it is') + '. Save to keep it with the theme.', 'ok');
            },
            function (err) { say('Could not use ' + f.name + ': ' + err.message + '.', 'error'); }
        );
    });
    $('save').addEventListener('click', function () { saveTheme(); });
    $('save-copy').addEventListener('click', function () { saveTheme({ copy: true }); });
    $('save-use').addEventListener('click', function () { useTheme(); });

    // ---- start -----------------------------------------------------------------------------

    // the theme in use is worn once neo-web answers (refreshMine)
    Promise.all([
        fetch('/web/ui/theme-tokens.json', { cache: 'no-store' }).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        }),
        readIndex('themes.json'),
        refreshMine(),
        fetch(BASE + 'impact.json', { cache: 'no-store' }).then(
            function (r) { return r.ok ? r.json() : null; },
            function () { return null; }
        ),
        readText(BASE + 'package.json').then(
            function (t) { var v = JSON.parse(t).version; state.version = typeof v === 'string' && /^[0-9A-Za-z][0-9A-Za-z.+-]{0,39}$/.test(v) ? v : ''; },
            function () { /* no version: a preset used as it is is linked without one */ }
        ),
    ])
        .then(function (res) {
            state.impact = res[3] && res[3].tokens ? res[3] : null;
            state.tokens = res[0].filter(function (t) { return t && typeof t.name === 'string' && typeof t.dark === 'string'; });
            state.tokens.forEach(function (t) { state.defaults[t.name] = t.dark; });
            C.useFallbacks(state.tokens);
            state.presets = res[1];
            renderTokenGroups();
            // Open on the theme neo-web asked for (Settings → Theme, Edit), else on the theme in use:
            // one of ours, another package's (read from its stylesheet), or Dark.
            var r = state.editRequest;
            state.editRequest = null;
            var asked = r && r.pkg === LOCAL ? state.mine.find(function (e) { return e.id + '.css' === r.stylesheet; }) : null;
            if (asked) return chooseMine(asked);
            var askedPreset = r && r.pkg === PKG ? state.presets.find(function (e) { return e.stylesheet === r.stylesheet; }) : null;
            if (askedPreset) return chooseEntry('preset', askedPreset);
            var c = currentChoice();
            var own = c && c.pkg === LOCAL ? state.mine.find(function (e) { return e.id + '.css' === c.stylesheet; }) : null;
            if (own) return chooseMine(own);
            var preset = c && c.pkg === PKG ? state.presets.find(function (e) { return e.stylesheet === c.stylesheet; }) : null;
            if (preset) return chooseEntry('preset', preset);
            if (c && c.pkg && c.stylesheet) {
                return readText(hrefOf(c.pkg, c.stylesheet)).then(
                    function (css) {
                        state.inUse = { choice: c, vars: C.parseCss(css) };
                        chooseInUse();
                    },
                    chooseDark
                );
            }
            chooseDark();
        })
        .catch(function (err) {
            say('This web UI does not publish its theme variables (theme-tokens.json: ' + err.message + '). The builder needs a newer machbase-neo.', 'error');
        });
})();
