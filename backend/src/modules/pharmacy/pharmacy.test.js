import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { validateReceipt, validateDecision } from './pharmacy.validation.js'
import { verifyDemo, demoSamples } from './demo.gateway.js'
import { PharmacyService } from './pharmacy.service.js'
const now = new Date('2026-10-14T09:00:00Z')
const input = {
  requestId: randomUUID(),
  supplier: 'Demo supplier',
  deliveryReference: 'DEMO-DEL-1',
  ...demoSamples[0],
  quantity: 24,
  unit: 'packs'
}
delete input.label
const receipt = validateReceipt(input)
test('batch match explicitly leaves physical authenticity, custody and licensing unchecked', () => {
  const result = verifyDemo(receipt, 1, now)
  assert.equal(result.outcome, 'matched')
  for (const key of ['authenticity', 'supplierLicence', 'packageSerial', 'custody'])
    assert.equal(result[key], 'not_checked')
  assert.equal(result.source, 'demo')
})
test('same batch attached to another product cannot pass', () =>
  assert.equal(verifyDemo({ ...receipt, product_code: 'OTHER' }, 1, now).outcome, 'mismatch'))
test('printed expiry mismatch cannot pass', () =>
  assert.equal(
    verifyDemo({ ...receipt, printed_expiry: '2029-06-30' }, 1, now).outcome,
    'mismatch'
  ))
test('recalled and expired batch checks block acceptance outcomes', () => {
  for (const [sample, outcome] of [
    [demoSamples[1], 'recalled'],
    [demoSamples[2], 'expired']
  ])
    assert.equal(
      verifyDemo(
        validateReceipt({
          ...input,
          medicine: sample.medicine,
          productCode: sample.productCode,
          batchNumber: sample.batchNumber,
          printedExpiry: sample.printedExpiry
        }),
        1,
        now
      ).outcome,
      outcome
    )
})
test('unknown batch is inconclusive and does not claim counterfeit', () => {
  const result = verifyDemo({ ...receipt, batch_number: 'OTHER' }, 1, now)
  assert.equal(result.outcome, 'not_found')
  assert.match(result.message, /does not establish counterfeiting/)
})
test('outage simulation recovers on a new attempt', () => {
  const row = {
    ...receipt,
    product_code: 'DEMO-ORS',
    batch_number: 'DEMO-OUTAGE',
    printed_expiry: '2028-12-31'
  }
  assert.equal(verifyDemo(row, 1, now).outcome, 'unavailable')
  assert.equal(verifyDemo(row, 2, now).outcome, 'matched')
})
test('expiry uses Nairobi date and blocks the expiry day', () =>
  assert.equal(verifyDemo(receipt, 1, new Date('2028-06-29T22:00:00Z')).outcome, 'expired'))
test('rejects forged verification fields and invalid calendar dates or quantities', () => {
  for (const body of [
    { ...input, outcome: 'matched' },
    { ...input, printedExpiry: '2026-02-30' },
    { ...input, quantity: 0 },
    { ...input, quantity: 1.5 },
    { ...input, quantity: 1000001 }
  ])
    assert.throws(() => validateReceipt(body))
})
test('decisions require a reason and boolean inspection field', () => {
  assert.throws(() =>
    validateDecision({ decision: 'accepted', reason: 'yes', physicalInspection: true })
  )
  assert.throws(() =>
    validateDecision({
      decision: 'accepted',
      reason: 'Inspected packaging',
      physicalInspection: 'true'
    })
  )
})
function service(role = 'owner', attempts = [], decision = 'pending') {
  const calls = []
  const repository = {
    get: async () => ({ ...receipt, decision, attempts }),
    record: async (...args) => calls.push(args)
  }
  return {
    calls,
    value: new PharmacyService({
      repository,
      shopService: {
        getCurrentShopContext: async () => ({
          shop: { id: 'shop-a', owner_id: 'owner-a' },
          membership: { role }
        })
      }
    })
  }
}
const auth = { userId: 'owner-a', token: 'caller-jwt' }
test('receiving service denies shopkeepers before registry access', async () =>
  assert.rejects(
    () => service('shopkeeper').value.verify(auth, 'receipt', randomUUID()),
    (e) => e.statusCode === 403
  ))
test('verification retries with the same request ID reuse saved evidence', async () => {
  const id = randomUUID()
  const { value, calls } = service('owner', [{ request_id: id }])
  await value.verify(auth, 'receipt', id)
  assert.equal(calls.length, 0)
})
test('finalized deliveries cannot be reverified', async () =>
  assert.rejects(
    () => service('owner', [], 'accepted').value.verify(auth, 'receipt', randomUUID()),
    (e) => e.code === 'RECEIPT_FINALIZED'
  ))
test('verification writes include server-derived shop and actor and expected attempt number', async () => {
  const { value, calls } = service()
  await value.verify(auth, 'receipt', randomUUID())
  assert.equal(calls[0][0], 'shop-a')
  assert.equal(calls[0][2], 'owner-a')
  assert.equal(calls[0][4], 1)
})
