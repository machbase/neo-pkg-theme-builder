// node --test test/package.test.js
// What the web UI reads of the package itself: the presets it lists in Settings → Theme, the files
// main.html links (with the version), and the builder's own corners.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const PKG = JSON.parse(read('package.json'));

test('the presets are the package\'s themes: package.json names themes.json, and every entry is a stylesheet of the package', () => {
    assert.equal(PKG.neoTheme.index, 'themes.json');
    const index = JSON.parse(read('themes.json'));
    assert.ok(index.length > 0);
    for (const e of index) {
        assert.match(e.stylesheet, /^presets\/[a-z0-9-]+\.css$/, e.label);
        assert.ok(fs.existsSync(path.join(ROOT, e.stylesheet)), e.stylesheet);
        assert.ok(e.scheme === 'light' || e.scheme === 'dark', e.label);
    }
});

test('main.html links its files with the package\'s version', () => {
    const versions = [...read('main.html').matchAll(/\?v=([0-9.]+)/g)].map((m) => m[1]);
    assert.ok(versions.length >= 5);
    assert.deepEqual([...new Set(versions)], [PKG.version]);
});

test('the builder\'s corners follow the theme\'s roundness, as the web UI\'s do — all but circles and the small count pills', () => {
    const pills = new Set(['.tb-kids-count', 'button.tb-follow', '.tb-tab-n']);
    const fixed = [];
    let selector = '';
    read('builder.css').split('\n').forEach((line, i) => {
        const open = /^\s*([^{}]+?)\s*\{\s*$/.exec(line);
        if (open) selector = open[1];
        const radius = /^\s*border(?:-(?:top|bottom)-(?:left|right))?-radius\s*:\s*([^;]+);/.exec(line);
        if (!radius || pills.has(selector)) return;
        const bare = radius[1].replace(/calc\(\s*[\d.]+px\s*\*\s*var\(--neo-radius-scale, 1\)\s*\)/g, '');
        if (/[1-9][\d.]*px/.test(bare)) fixed.push(`builder.css:${i + 1} ${selector} { ${radius[1]} }`);
    });
    assert.deepEqual(fixed, []);
});
