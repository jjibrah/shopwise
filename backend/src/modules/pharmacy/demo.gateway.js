// Synthetic identifiers only. No network call or assertion of physical authenticity.
export const demoSamples = [
  {
    medicine: 'Paracetamol 500 mg tablets',
    productCode: 'DEMO-PARA-500',
    batchNumber: 'DEMO-MATCH-26',
    printedExpiry: '2028-06-30',
    label: 'Matching batch'
  },
  {
    medicine: 'Amoxicillin 250 mg capsules',
    productCode: 'DEMO-AMOX-250',
    batchNumber: 'DEMO-RECALL-26',
    printedExpiry: '2028-04-30',
    label: 'Recalled batch'
  },
  {
    medicine: 'Cetirizine 10 mg tablets',
    productCode: 'DEMO-CET-10',
    batchNumber: 'DEMO-EXPIRED-25',
    printedExpiry: '2025-01-31',
    label: 'Expired batch'
  },
  {
    medicine: 'Paracetamol 500 mg tablets',
    productCode: 'DEMO-PARA-500',
    batchNumber: 'DEMO-MATCH-26',
    printedExpiry: '2029-06-30',
    label: 'Expiry mismatch'
  },
  {
    medicine: 'Ibuprofen 200 mg tablets',
    productCode: 'DEMO-IBU-200',
    batchNumber: 'DEMO-UNKNOWN',
    printedExpiry: '2028-09-30',
    label: 'Unknown batch'
  },
  {
    medicine: 'Oral rehydration salts',
    productCode: 'DEMO-ORS',
    batchNumber: 'DEMO-OUTAGE',
    printedExpiry: '2028-12-31',
    label: 'Outage, then retry'
  }
]
const records = [
  {
    productCode: 'DEMO-PARA-500',
    batchNumber: 'DEMO-MATCH-26',
    expiry: '2028-06-30',
    registered: true,
    recalled: false
  },
  {
    productCode: 'DEMO-AMOX-250',
    batchNumber: 'DEMO-RECALL-26',
    expiry: '2028-04-30',
    registered: true,
    recalled: true
  },
  {
    productCode: 'DEMO-CET-10',
    batchNumber: 'DEMO-EXPIRED-25',
    expiry: '2025-01-31',
    registered: true,
    recalled: false
  },
  {
    productCode: 'DEMO-ORS',
    batchNumber: 'DEMO-OUTAGE',
    expiry: '2028-12-31',
    registered: true,
    recalled: false
  }
]
export function kenyaDate(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}
export function verifyDemo(receipt, attemptNumber, now = new Date()) {
  const base = {
    source: 'demo',
    checkedAt: now.toISOString(),
    authenticity: 'not_checked',
    supplierLicence: 'not_checked',
    packageSerial: 'not_checked',
    custody: 'not_checked',
    registryRecord: null
  }
  if (receipt.batch_number === 'DEMO-OUTAGE' && attemptNumber === 1)
    return {
      ...base,
      outcome: 'unavailable',
      message: 'Simulated connection failure. Retry this delivery to demonstrate recovery.'
    }
  const record = records.find((r) => r.batchNumber === receipt.batch_number)
  if (!record)
    return {
      ...base,
      outcome: 'not_found',
      message:
        'No matching batch in the synthetic registry. Hold for review; this does not establish counterfeiting.'
    }
  const result = { ...base, registryRecord: record }
  if (record.productCode !== receipt.product_code || record.expiry !== receipt.printed_expiry)
    return {
      ...result,
      outcome: 'mismatch',
      message: 'Product identifier or printed expiry differs from the synthetic batch record.'
    }
  if (record.recalled)
    return {
      ...result,
      outcome: 'recalled',
      message: 'This synthetic batch has a recall flag. Keep the delivery out of accepted stock.'
    }
  if (record.expiry <= kenyaDate(now))
    return {
      ...result,
      outcome: 'expired',
      message: 'This batch has reached its expiry date. Keep the delivery out of accepted stock.'
    }
  return {
    ...result,
    outcome: 'matched',
    message:
      'Product identifier, batch and expiry match the synthetic registry. Physical authenticity, supplier licensing and custody have not been verified.'
  }
}
