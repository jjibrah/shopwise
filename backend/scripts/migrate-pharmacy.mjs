import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { fileURLToPath, URL } from 'node:url'
import process from 'node:process'
import console from 'node:console'
import dotenv from 'dotenv'

const migrationName = '20261014_add_pharmacy_receiving_poc.sql'
const migrationPath = new URL(`../../supabase/migrations/${migrationName}`, import.meta.url)

export function connectionEnvironment(connectionString) {
  let url
  try {
    url = new URL(connectionString)
  } catch {
    throw new Error('PHARMACY_DATABASE_URL must be a valid PostgreSQL connection URL.')
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !url.hostname ||
    !url.pathname.slice(1)
  )
    throw new Error('PHARMACY_DATABASE_URL must include a PostgreSQL host and database name.')
  const sslmode =
    url.searchParams.get('sslmode') ||
    (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ? 'disable' : 'require')
  if (!['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full'].includes(sslmode))
    throw new Error('Unsupported database sslmode.')
  return {
    PGHOST: url.hostname.replace(/^\[|\]$/g, ''),
    PGPORT: url.port || '5432',
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGSSLMODE: sslmode,
    PGCONNECT_TIMEOUT: '15',
    PGAPPNAME: 'shopwise-pharmacy-migration'
  }
}

export function migrationScript(source) {
  const hash = createHash('sha256').update(source).digest('hex')
  const body = source.replace(/^begin;\s*$/im, '').replace(/^commit;\s*$/im, '')
  return `\\set ON_ERROR_STOP on
begin;
select pg_advisory_xact_lock(hashtextextended('shopwise-schema-migrations',0));
create table if not exists public.shopwise_schema_migrations(name text primary key, sha256 text not null, applied_at timestamptz not null default now());
revoke all on public.shopwise_schema_migrations from public, anon, authenticated;
do $$ begin
  if exists(select 1 from public.shopwise_schema_migrations where name='${migrationName}' and sha256<>'${hash}') then
    raise exception 'The applied pharmacy migration differs from this file. Create a new migration rather than modifying an applied migration.';
  end if;
end; $$;
select exists(select 1 from public.shopwise_schema_migrations where name='${migrationName}') as already_applied \\gset
\\if :already_applied
  \\echo Pharmacy migration already applied. No changes made.
\\else
  ${body}
  insert into public.shopwise_schema_migrations(name,sha256) values('${migrationName}','${hash}');
  \\echo Pharmacy migration applied.
\\endif
commit;
notify pgrst, 'reload schema';
`
}

async function main() {
  dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true })
  const connection = process.env.PHARMACY_DATABASE_URL || process.env.DATABASE_URL
  if (!connection)
    throw new Error(
      'Set PHARMACY_DATABASE_URL in backend/.env to your Supabase PostgreSQL connection URL. SUPABASE_URL and the service-role API key cannot run SQL migrations. See docs/pharmacy-poc.md.'
    )
  const env = connectionEnvironment(connection)
  const sql = migrationScript(await readFile(migrationPath, 'utf8'))
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.env.PHARMACY_PSQL_BIN || 'psql',
      ['-X', '--no-password', '--quiet', '--set=ON_ERROR_STOP=1', '--file=-'],
      { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] }
    )
    let errorOutput = ''
    child.stdout.on('data', (value) => process.stdout.write(value))
    child.stderr.on('data', (value) => {
      errorOutput += value.toString()
    })
    child.on('error', (error) =>
      reject(
        new Error(
          error.code === 'ENOENT'
            ? 'psql is required. Install PostgreSQL client tools or set PHARMACY_PSQL_BIN to its executable.'
            : 'Unable to start the migration client.'
        )
      )
    )
    child.stdin.on('error', () => {})
    child.on('close', (code) => {
      if (code === 0) resolve()
      else {
        // Never echo connection/provider output that could contain credentials.
        const known = errorOutput.includes('already exists')
          ? 'Pharmacy tables already exist without a migration record. Verify how the migration was previously applied before rerunning.'
          : errorOutput.includes('differs from this file')
            ? 'The applied migration has a different checksum. Create a follow-up migration.'
            : 'Migration failed. Check database connectivity, credentials, owner permissions and that database.sql was applied first. Changes from this run were rolled back.'
        reject(new Error(known))
      }
    })
    child.stdin.end(sql)
  })
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
