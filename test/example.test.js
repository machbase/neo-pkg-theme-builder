// node --test test/example.test.js
// The example page a package's app follows (example/): its own CSS draws with the web UI's tokens,
// then it loads theme-sync (the theme contract v1, the Theme Builder's) — no copy of anything, no colour of its own.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PAGE = fs.readFileSync(path.join(__dirname, '..', 'example', 'index.html'), 'utf8');
const HEAD = /<head>([\s\S]*?)<\/head>/.exec(PAGE)[1];
const STYLE = /<style>([\s\S]*?)<\/style>/.exec(PAGE)[1];
const FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tokens', 'theme-tokens.json'), 'utf8'));
const TOKENS = new Set((FIXTURE.tokens || FIXTURE).map((t) => t.name));
const CONTRACT = new Set(fs.readFileSync(path.join(__dirname, '..', 'contract', 'theme-v1.tokens'), 'utf8').split('\n').filter(Boolean));
const SYNC = '<script src="/public/neo-pkg-theme-builder/cgi-bin/theme/v1/sync"></script>';

test('the page loads theme-sync after its own CSS — a plain script in <head>, and nothing else of the theme', () => {
    const own = HEAD.indexOf('<style>');
    const sync = HEAD.indexOf(SYNC);
    assert.ok(own >= 0 && sync > own, 'the app\'s CSS, then theme-sync');
    const scripts = [...PAGE.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(scripts, ['/public/neo-pkg-theme-builder/cgi-bin/theme/v1/sync'], 'one script, theme-sync, and no copy of it');
    assert.doesNotMatch(PAGE, /neo\.theme\.state|localStorage/, 'the page reads nothing of the theme itself');
});

test('the page draws with the web UI\'s tokens only, with no default: theme-sync.js sets every one', () => {
    const used = [...STYLE.matchAll(/var\(--neo-([a-z0-9-]+)(\s*,)?/g)];
    assert.ok(used.length > 30);
    assert.deepEqual(used.filter((m) => !TOKENS.has(m[1])).map((m) => m[1]), [], 'a token the web UI has');
    assert.deepEqual(used.filter((m) => !CONTRACT.has(m[1])).map((m) => m[1]), [], 'a token the contract promises');
    assert.deepEqual(used.filter((m) => m[2]).map((m) => m[1]), [], 'no fallback written');
    assert.deepEqual(used.filter((m) => /^(gnb|tabbar|console)-/.test(m[1])).map((m) => m[1]), [], 'not the web UI\'s own frame');
    assert.deepEqual(STYLE.match(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/gi) || [], [], 'no colour of its own');
});
