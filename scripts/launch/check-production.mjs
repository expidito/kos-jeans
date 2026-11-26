// Read-only smoke: no POST, database connection, order creation or cleanup.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const localMode = process.argv.includes('--local');
const target = new URL(process.env.LAUNCH_ORIGIN || 'https://kos-jeans.vercel.app');
assert((target.protocol === 'https:' || (localMode && target.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(target.hostname))) && !target.username && !target.password && target.pathname === '/' && !target.search && !target.hash, 'Use HTTPS, or explicit loopback local mode');
const origin = target.origin;
const canonicalOrigin = localMode ? 'https://kos-jeans.vercel.app' : origin;
const checks = [], scripts = new Set(), seenTitles = new Set();
const privateValues = [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, process.env.SUPABASE_CHECKOUT_SECRET_KEY].filter(Boolean);
const tag = (html, key) => { for (const t of html.matchAll(/<meta\s[^>]*>/g)) {
    const attrs = Object.fromEntries([...t[0].matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
    if (attrs.name === key || attrs.property === key)
        return attrs.content;
} return null; };
function noPrivateData(text) { for (const value of privateValues)
    assert(!text.includes(value), 'Local/dev credential value exposed'); assert(!/\bsb_secret_[A-Za-z0-9_-]{20,}\b/.test(text), 'Private key pattern'); for (const m of text.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
    try {
        assert.notEqual(JSON.parse(Buffer.from(m[0].split('.')[1], 'base64url').toString()).role, 'service_role');
    }
    catch (e) {
        if (e.code === 'ERR_ASSERTION')
            throw e;
    }
} }
async function get(path) { return fetch(origin + path, { redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(20000) }); }
let stage = 'start';
try {
    for (const path of ['/', '/catalog', '/cart', '/checkout', '/contacts', '/delivery', '/returns', '/privacy', '/terms', '/admin/login']) {
        stage = path;
        const r = await get(path);
        assert.equal(r.status, 200, path);
        const html = await r.text();
        noPrivateData(html);
        assert(!/TEST-CATALOG-|TEST-BLOCK10-WIDE-BLUE|ТЕСТ · Джинси/.test(html));
        assert.match(r.headers.get('x-robots-tag') || '', /noindex/);
        assert.match(tag(html, 'robots') || '', /noindex/);
        const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
        assert(title);
        const description = tag(html, 'description');
        assert(description);
        if (['/', '/catalog', '/contacts', '/delivery', '/returns', '/privacy', '/terms'].includes(path)) {
            assert(!seenTitles.has(title));
            seenTitles.add(title);
            assert(html.includes('rel="canonical" href="' + canonicalOrigin + path + '"'));
            assert.equal(tag(html, 'og:url'), canonicalOrigin + path);
            assert(tag(html, 'og:title'));
            assert(tag(html, 'og:description'));
        }
        for (const m of html.matchAll(/<script[^>]+src="([^"]+)"/g)) {
            const u = new URL(m[1].replaceAll('&amp;', '&'), origin);
            if (u.origin === origin && u.pathname.startsWith('/_next/static/'))
                scripts.add(u.pathname);
        }
        if (path === '/' && process.argv.includes('--empty-home')) {
            assert(html.includes('Колекція ще готується.'));
            assert(!html.includes('Переглянути демозразок'));
        }
        if (path === '/catalog')
            assert(html.includes('Товари ще готуються.'));
        if (path === '/checkout')
            assert(!html.includes('Підтвердити замовлення'));
        if (path === '/admin/login') {
            assert(html.includes('Адміністрування ще не підключене'));
            assert([...html.matchAll(/<input[^>]+type="password"[^>]*>/g)].every(m => m[0].includes('disabled')));
        }
        checks.push({ path, status: r.status, title, descriptionPresent: true, noindex: true });
    }
    for (const path of ['/quality-launch-missing', '/catalog/test-jeans', '/product/test-wide-leg-blue', '/checkout/success', '/media/a0000000-0000-4000-8000-000000000003']) {
        stage = path;
        const r = await get(path);
        assert.equal(r.status, 404, path);
        noPrivateData(await r.text());
        checks.push({ path, status: r.status });
    }
    stage = 'admin redirect';
    const admin = await get('/admin/orders');
    assert([303, 307].includes(admin.status));
    assert.match(admin.headers.get('location') || '', /\/admin\/login/);
    checks.push({ path: '/admin/orders', status: admin.status, redirectsToLogin: true });
    stage = 'checkout disabled';
    const session = await get('/api/checkout/session');
    assert.equal(session.status, 503);
    checks.push({ path: '/api/checkout/session', status: session.status, checkoutDisabled: true });
    stage = 'robots';
    const robots = await get('/robots.txt');
    assert.equal(robots.status, 200);
    assert((await robots.text()).includes('Disallow: /'));
    stage = 'sitemap';
    const sitemap = await get('/sitemap.xml');
    assert.equal(sitemap.status, 200);
    assert(!(await sitemap.text()).includes('<loc>'));
    stage = 'static photo';
    const photo = await get('/images/storefront/hero.jpg');
    assert.equal(photo.status, 200);
    assert.match(photo.headers.get('content-type') || '', /^image\//);
    stage = 'optimizer protection';
    const optimizer = await get('/_next/image?url=%2Fmedia%2Fa0000000-0000-4000-8000-000000000003&w=640&q=75');
    assert.equal(optimizer.status, 400);
    stage = 'browser bundles';
    let bytes = 0;
    for (const path of scripts) {
        const r = await get(path);
        assert.equal(r.status, 200);
        const js = await r.text();
        bytes += Buffer.byteLength(js);
        noPrivateData(js);
    }
    if (!localMode) {
        stage = 'HTTPS redirect';
        const http = await fetch('http://' + target.host + '/', { redirect: 'manual', signal: AbortSignal.timeout(20000) });
        assert([301, 302, 307, 308].includes(http.status));
        assert.equal(new URL(http.headers.get('location'), 'http://' + target.host).origin, origin);
    }
    await mkdir('docs/checks/launch', { recursive: true });
    await writeFile('docs/checks/launch/' + (localMode ? 'local-production-smoke.json' : 'production-smoke.json'), JSON.stringify({ status: 'passed', checkedAtUTC: new Date().toISOString(), productionOrigin: origin, mode: localMode ? 'local-production' : 'remote-production', emptyHomeRequired: process.argv.includes('--empty-home'), methods: ['GET'], productionDataChanged: false, httpsCertificateValidated: !localMode, httpRedirectsToHttps: !localMode, robotsDisallowAll: true, sitemapNoTestURLs: true, privateOptimizerDenied: true, staticPhotoLoaded: true, checkedBrowserChunks: scripts.size, browserChunkBytes: bytes, localCredentialComparisons: privateValues.length, credentialValuesPrinted: false, checks }, null, 2) + '\n');
    console.log('PASS safe ' + (localMode ? 'local Production-mode' : 'Production') + ' pages/404/SEO, isolated catalog/auth/checkout, browser artifacts');
}
catch (e) {
    console.error('FAIL Production smoke at ' + stage + ': ' + (e.code === 'ERR_ASSERTION' ? 'assertion failed' : 'request failed') + '; details withheld');
    process.exitCode = 1;
}
