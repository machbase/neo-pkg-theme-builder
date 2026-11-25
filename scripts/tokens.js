#!/usr/bin/env node
/*
 * Takes a neo-web release's token list as this package's (tokens/theme-tokens.json) and says where it
 * came from (tokens/SOURCE). The token list is what neo-web's build writes from its token sources
 * (dist/theme-tokens.json; also in the release's web-ui.zip).
 *
 *   node scripts/tokens.js <path to theme-tokens.json> "<neo-web release, e.g. neo-web v8.9.0>"
 *   node scripts/build.js
 *
 * Refuses a list that has lost a token the theme contract v1 promises (contract/theme-v1.tokens):
 * the web UI must keep an old name until the contract lets it go.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function main() {
    const [from, source] = process.argv.slice(2);
    if (!from || !source) {
        console.error('usage: node scripts/tokens.js <theme-tokens.json> "<neo-web release>"');
        process.exit(2);
    }
    const list = JSON.parse(fs.readFileSync(from, 'utf8'));
    if (!Array.isArray(list) || !list.every((t) => t && typeof t.name === 'string' && typeof t.dark === 'string')) {
        console.error(from + ': not a token list');
        process.exit(1);
    }
    const names = new Set(list.map((t) => t.name));
    const promised = fs.readFileSync(path.join(ROOT, 'contract', 'theme-v1.tokens'), 'utf8').split('\n').filter(Boolean);
    const lost = promised.filter((n) => !names.has(n));
    if (lost.length) {
        console.error('the theme contract v1 promises tokens this list does not have: ' + lost.join(', '));
        process.exit(1);
    }
    fs.writeFileSync(path.join(ROOT, 'tokens', 'theme-tokens.json'), JSON.stringify(list, null, 1) + '\n');
    fs.writeFileSync(path.join(ROOT, 'tokens', 'SOURCE'), source.trim() + '\n');
    console.log(`tokens/theme-tokens.json: ${list.length} tokens from ${source.trim()} — now run node scripts/build.js`);
}

main();
