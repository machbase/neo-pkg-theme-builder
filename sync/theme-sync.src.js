/*
 * theme-sync - the theme contract v1, for a package's app page.
 *
 * Served by the Theme Builder (cgi-bin/theme/v1/sync). An app loads it once, in <head>, after its
 * stylesheets and not deferred, and draws with var(--neo-<token>):
 *
 *     <script src="/public/neo-pkg-theme-builder/cgi-bin/theme/v1/sync"></script>
 *
 * What it does, and nothing else (contract/theme-v1.md):
 *  - before the first paint, sets every theme token on the page's <html> as --neo-<token>: the
 *    final colours the Theme Builder worked out for the theme in use (neo.theme.state, `resolved`),
 *    or the web UI's dark defaults when there is no theme or themes are off (experimentMode);
 *  - sets <html data-neo-scheme="light|dark"> and color-scheme;
 *  - when the theme changes (the browser's storage event; and again whenever the tab comes back to
 *    the front, as a tab behind others may not be told), sets them again and, when anything moved,
 *    fires `neo-theme-change` on window ({ detail: { scheme, vars } }) and calls onChange listeners;
 *  - window.neoThemeSync = { contract, revision, refresh(), onChange(fn) }.
 * It never writes storage and never asks the web UI for anything.
 *
 * Plain ES5, ASCII only: it runs as served, in whatever page loads it. The build writes the dark
 * defaults in (scripts/build.js); this file is the source, sync/v1/theme-sync.js is what is served.
 */
(function () {
    'use strict';

    var CONTRACT = 1;
    var REVISION = 1;
    var STATE_KEY = 'neo.theme.state';
    var EXPERIMENT_KEY = 'experimentMode';
    // every theme token and its value with no theme (the web UI's dark screen), written in by the build
    var DARK = /* @dark */ {};
    var SAFE_TOKEN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    var SAFE_VALUE = /^[^;{}<>\\]{1,200}$/;

    // loaded twice (an app that also got it some other way): the first copy keeps the page
    if (window.neoThemeSync && window.neoThemeSync.contract === CONTRACT) {
        window.neoThemeSync.refresh();
        return;
    }

    var ROOT = document.documentElement;
    var sWritten = {};
    var sLast = null;
    var sListeners = [];

    function read(aKey) {
        try {
            return JSON.parse(window.localStorage.getItem(aKey) || 'null');
        } catch (e) {
            return null;
        }
    }

    function copy(aFrom) {
        var sOut = {};
        for (var k in aFrom) if (Object.prototype.hasOwnProperty.call(aFrom, k)) sOut[k] = aFrom[k];
        return sOut;
    }

    /** What the page should wear now: the theme's final colours over the dark defaults. */
    function current() {
        var sVars = copy(DARK);
        var sScheme = 'dark';
        if (read(EXPERIMENT_KEY) !== true) return { scheme: sScheme, vars: sVars };
        var sState = read(STATE_KEY);
        if (!sState || sState.v !== 1 || !sState.resolved || typeof sState.resolved !== 'object') return { scheme: sScheme, vars: sVars };
        // only token names and values that cannot leave a declaration: storage is anyone's to edit
        for (var k in sState.resolved) {
            if (!Object.prototype.hasOwnProperty.call(sState.resolved, k)) continue;
            var v = sState.resolved[k];
            if (SAFE_TOKEN.test(k) && typeof v === 'string' && SAFE_VALUE.test(v.trim())) sVars[k] = v.trim();
        }
        sScheme = sState.scheme === 'light' ? 'light' : 'dark';
        return { scheme: sScheme, vars: sVars };
    }

    function keyOf(aNow) {
        return aNow.scheme + '|' + Object.keys(aNow.vars).sort().map(function (k) { return k + ':' + aNow.vars[k]; }).join(';');
    }

    function tell(aDetail) {
        var sEvent;
        try {
            sEvent = new CustomEvent('neo-theme-change', { detail: aDetail });
        } catch (e) {
            sEvent = document.createEvent('CustomEvent');
            sEvent.initCustomEvent('neo-theme-change', false, false, aDetail);
        }
        window.dispatchEvent(sEvent);
        sListeners.slice().forEach(function (fn) {
            try {
                fn(aDetail);
            } catch (e) {
                /* one app listener failing does not stop the others */
            }
        });
    }

    /** Puts the current theme on <html>; tells the page when anything moved. */
    function apply() {
        var sNow = current();
        var sKey = keyOf(sNow);
        if (sKey === sLast) return;
        sLast = sKey;
        for (var k in sWritten) if (!(k in sNow.vars)) ROOT.style.removeProperty('--neo-' + k);
        for (var t in sNow.vars) ROOT.style.setProperty('--neo-' + t, sNow.vars[t]);
        sWritten = sNow.vars;
        ROOT.setAttribute('data-neo-scheme', sNow.scheme);
        ROOT.style.colorScheme = sNow.scheme;
        tell({ scheme: sNow.scheme, vars: copy(sNow.vars) });
    }

    window.addEventListener('storage', function (e) {
        if (e.key === null || e.key === STATE_KEY || e.key === EXPERIMENT_KEY) apply();
    });
    // a tab behind others may not get the storage event (WebKit): read again when it comes back
    window.addEventListener('focus', apply);
    window.addEventListener('pageshow', apply);
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') apply();
    });

    apply();

    window.neoThemeSync = {
        contract: CONTRACT,
        revision: REVISION,
        refresh: apply,
        onChange: function (aFn) {
            if (typeof aFn !== 'function') return function () {};
            sListeners.push(aFn);
            return function () {
                sListeners = sListeners.filter(function (f) { return f !== aFn; });
            };
        },
    };
})();
