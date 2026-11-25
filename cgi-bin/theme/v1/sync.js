'use strict';
/*
 * GET /public/neo-pkg-theme-builder/cgi-bin/theme/v1/sync — theme-sync, the theme contract v1.
 *
 * Sends sync/v1/theme-sync.js as it was built (scripts/build.js): nothing is worked out per request.
 * Content-Length is required — without it a browser on a kept-alive connection can misplace where the
 * next response starts — and the file is ASCII (the build refuses anything else), so its length in
 * characters is its length in bytes. The server hands a cgi script no conditional request headers, so
 * a 304 is out: the copy a browser keeps is limited by time instead.
 */
const fs = require('fs');
const process = require('process');

const ROOT = process.argv[1].slice(0, process.argv[1].lastIndexOf('/cgi-bin/'));

let body = null;
try {
    body = fs.readFileSync(ROOT + '/sync/v1/theme-sync.js', 'utf8');
} catch (e) {
    body = null;
}

if (body === null) {
    process.stdout.write('Status: 500 Internal Server Error\r\nContent-Type: text/plain\r\n\r\ntheme-sync v1 is missing');
} else {
    process.stdout.write('Content-Type: text/javascript; charset=utf-8\r\n');
    process.stdout.write('Content-Length: ' + body.length + '\r\n');
    process.stdout.write('Cache-Control: public, max-age=300\r\n');
    process.stdout.write('X-Neo-Theme-Contract: 1\r\n');
    process.stdout.write('\r\n');
    process.stdout.write(body);
}
