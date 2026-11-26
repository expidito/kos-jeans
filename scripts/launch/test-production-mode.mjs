// Black-box regression of a built Next app. No Supabase access or remote writes.
import { spawn } from 'node:child_process';
const origin = 'http://127.0.0.1:3020';
const env = { ...process.env, VERCEL_ENV: 'production', NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '', SUPABASE_CHECKOUT_SECRET_KEY: '' };
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', '3020'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
let spawnError = false, started = false;
server.stdout.on('data', data => { if (data.toString().includes('Ready')) started = true; });
server.stderr.on('data', () => { /* drain without logging private details */ });
server.on('error', () => { spawnError = true; });
try {
    let ready = false;
    const until = Date.now() + 20000;
    while (Date.now() < until) {
        if (spawnError || server.exitCode !== null)
            throw Error('server unavailable');
        try {
            ready = started && (await fetch(origin + '/robots.txt', { signal: AbortSignal.timeout(1000) })).status === 200;
        }
        catch { /* wait for listener */ }
        if (ready)
            break;
        await new Promise(r => setTimeout(r, 100));
    }
    if (!ready)
        throw Error('server timeout');
    const check = spawn(process.execPath, ['scripts/launch/check-production.mjs', '--local', '--empty-home'], { env: { ...env, LAUNCH_ORIGIN: origin }, stdio: 'inherit' });
    await new Promise((resolve, reject) => { check.once('error', reject); check.once('exit', code => code === 0 ? resolve() : reject(Error('smoke failed'))); });
    console.log('PASS built Production-mode regression: empty home, no dev access, disabled Auth/checkout, noindex and safe 404');
}
catch {
    console.error('FAIL built Production-mode regression');
    process.exitCode = 1;
}
finally {
    server.kill('SIGTERM');
}
