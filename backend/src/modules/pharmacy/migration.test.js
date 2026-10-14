import test from 'node:test'
import assert from 'node:assert/strict'
import { connectionEnvironment, migrationScript } from '../../../scripts/migrate-pharmacy.mjs'
test('migration credentials are decoded into environment variables, not SQL', () => {
  const env = connectionEnvironment('postgresql://demo:p%40ss%2Fword@db.example.test:5432/postgres')
  assert.equal(env.PGPASSWORD, 'p@ss/word')
  assert.equal(env.PGSSLMODE, 'require')
  const sql = migrationScript('begin;\nselect 1;\ncommit;')
  assert.ok(!sql.includes(env.PGPASSWORD))
  assert.match(sql, /pg_advisory_xact_lock/)
  assert.match(sql, /already_applied/)
  assert.equal((sql.match(/^begin;/gm) || []).length, 1)
  assert.equal((sql.match(/^commit;/gm) || []).length, 1)
})
test('migration refuses non-database URLs and defaults local connection SSL safely', () => {
  assert.throws(() => connectionEnvironment('https://api.example.test'))
  assert.throws(() => connectionEnvironment('postgresql://localhost'))
  assert.equal(
    connectionEnvironment('postgres://user@localhost:55519/postgres').PGSSLMODE,
    'disable'
  )
})
