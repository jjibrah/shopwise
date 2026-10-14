# Pharmacy receiving proof of concept

The authenticated owner workspace opens at `/app/pharmacy`. Landing, login,
signup and onboarding are unchanged. The previous retail overview is at
`/app/retail`; existing POS features remain available.

## Initialize receiving

Install existing dependencies, then apply the base schema and existing migrations
as documented in `supabase/README.md`. This command applies only the pharmacy
migration; it does not bootstrap or reset the existing POS database.

1. In Supabase, open **Connect** and copy the PostgreSQL connection URL. Use the
   session pooler connection if the direct connection requires unavailable IPv6.
2. Put the URL, including the database password, in the ignored `backend/.env`:

   ```env
   PHARMACY_DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require
   ```

   URL-encode special characters in the user/password. `DATABASE_URL` is also
   supported. `SUPABASE_URL` and service-role API keys are not SQL credentials.
3. Install PostgreSQL client tools (`psql`), then run from the repository root:

   ```sh
   npm run migrate:pharmacy
   ```

   The command uses environment variables for credentials, an advisory lock,
   a transaction, and a checksum ledger. Repeating a successful run is safe.
   It also reloads the PostgREST schema cache. Optionally set `PHARMACY_PSQL_BIN`
   to the psql executable. No connection URL or password is printed.

If the migration was previously applied manually, the runner deliberately stops
on existing tables rather than assuming the database matches its checksum.
Have the database administrator verify the schema before recording that manual
application. Do not delete receiving tables to retry.

## Demonstration

Open **Receive packages**, choose a synthetic scenario, save the delivery, and
run **Check demo batch** on the detail screen. Scenarios include a matching batch,
recall, expiry, printed-expiry mismatch, unknown batch and connection outage.
The outage scenario succeeds on the second distinct check. Reusing a request ID
returns its saved attempt instead of creating another one.

Acceptance requires a recent matching check, physical inspection confirmation
and a reason. Quarantine/rejection also require a reason; all decisions are final
in this POC and recorded in the audit ledger. Use a new delivery for a new demo.

## Boundaries

- Every verification is synthetic; no NTTS endpoint is called.
- Batch numbers are compared with product identifiers and printed expiry.
- Matching batch metadata does not establish physical medicine authenticity.
- Supplier licensing, serial identity and chain of custody are not checked.
- Receiving is owner-only under the existing membership model.
- One medicine batch is recorded per entry. Multi-line deliveries are deferred.
- Accepted and quarantined quantities remain in an isolated receiving ledger.
  Neither can enter the POS inventory or checkout through this workflow.
- The overview/history displays the latest 250 receipts. Metrics describe those
  displayed records, not lifetime totals. Search and filters use that same set.
- Correcting records, releasing quarantined stock and live receiving-event
  submission are deferred until the authoritative API contract is available.

## Verification

```sh
npm test
npm run test:frontend
npm run build
```

Actual PostgreSQL safeguards are exercised in
`backend/tests/pharmacy/receiving.sql`. Run with psql against a disposable database
with `database.sql` and the pharmacy migration applied. Fixtures are rolled back.
It verifies RLS, forged writes, idempotency, final decisions, blocked outcomes,
stale evidence and separation from POS inventory.
