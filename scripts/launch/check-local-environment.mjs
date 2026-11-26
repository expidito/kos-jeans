// Reports presence/scope only. Never prints or saves credential values.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getSupabaseConfig } from '../../src/lib/supabase/config.ts';
const cli = args => JSON.parse(execFileSync('npx', ['--yes', 'supabase@3.3.0', ...args, '--output-format', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
let temp;
try {
    const config = getSupabaseConfig(), ref = new URL(config.url).hostname.split('.')[0];
    const projects = cli(['projects', 'list']).projects;
    assert(projects.some(p => (p.id === ref || p.ref === ref) && p.name === 'kos-jeans-dev'));
    assert.equal(execFileSync('git', ['check-ignore', '.env.local'], { encoding: 'utf8' }).trim(), '.env.local');
    const variables = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_CHECKOUT_SECRET_KEY', 'NEXT_PUBLIC_SITE_URL', 'VERCEL_ENV'].map(name => ({ name, present: !!process.env[name] }));
    assert(process.env.SUPABASE_CHECKOUT_SECRET_KEY?.startsWith('sb_secret_'));
    temp = await mkdtemp(join(tmpdir(), 'kos-launch-read-'));
    const path = join(temp, 'query.sql');
    await writeFile(path, 'select version from supabase_migrations.schema_migrations order by version;', { mode: 0o600 });
    const history = cli(['db', 'query', '--remote=' + ref, '--file', path, '--yes']).rows;
    const files = (await readdir('supabase/migrations')).filter(f => f.endsWith('.sql')).sort();
    let linkMatches = false;
    try {
        linkMatches = (await readFile('supabase/.temp/project-ref', 'utf8')).trim() === ref;
    }
    catch { /* explicit remote remains required */ }
    await mkdir('docs/checks/launch', { recursive: true });
    await writeFile('docs/checks/launch/local-environment.json', JSON.stringify({ status: 'passed', checkedAtUTC: new Date().toISOString(), localProjectName: 'kos-jeans-dev', localEnvIgnoredByGit: true, variables, linkedProjectMatchesDev: linkMatches, productionProjectVisible: projects.some(p => p.name === 'kos-jeans-prod'), migrationFiles: files, registeredDevMigrationVersions: history.map(r => r.version), credentialValuesPrinted: false, remoteChanges: false }, null, 2) + '\n');
    console.log('PASS local variable presence, ignored secrets file, dev target and read-only migration ledger audit');
}
catch {
    console.error('FAIL local environment audit; details withheld');
    process.exitCode = 1;
}
finally {
    if (temp)
        await rm(temp, { recursive: true, force: true });
}
