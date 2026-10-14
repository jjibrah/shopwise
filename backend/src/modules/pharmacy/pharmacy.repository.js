import { AppError } from '../../errors/AppError.js'
function unwrap({ data, error }) {
  if (error) {
    if (error.code === '42501') throw AppError.forbidden()
    if (['PGRST205', 'PGRST202', '42P01'].includes(error.code))
      throw new AppError(
        503,
        'PHARMACY_SCHEMA_MISSING',
        'Pharmacy receiving is not initialized in this database. Apply the pharmacy receiving migration and refresh the database schema cache.'
      )
    if (error.message?.includes('PHARMACY_CONFLICT'))
      throw AppError.conflict(
        'PHARMACY_CONFLICT',
        'This delivery changed or cannot be accepted. Refresh and review its latest check.'
      )
    if (error.message?.includes('PHARMACY_NOT_FOUND'))
      throw AppError.notFound('RECEIPT_NOT_FOUND', 'Delivery was not found')
    throw new AppError(
      500,
      'PHARMACY_STORAGE_ERROR',
      'Unable to save or load pharmacy records. Try again shortly.'
    )
  }
  return data
}
export class PharmacyRepository {
  constructor({ forAccessToken, adminClient }) {
    Object.assign(this, { forAccessToken, adminClient })
  }
  async list(shopId, token) {
    return unwrap(
      await this.forAccessToken(token)
        .from('pharmacy_receipts')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(250)
    )
  }
  async get(shopId, id, token) {
    const row = unwrap(
      await this.forAccessToken(token)
        .from('pharmacy_receipts')
        .select('*')
        .eq('shop_id', shopId)
        .eq('id', id)
        .maybeSingle()
    )
    if (!row) throw AppError.notFound('RECEIPT_NOT_FOUND', 'Delivery was not found')
    const attempts = unwrap(
      await this.forAccessToken(token)
        .from('pharmacy_verifications')
        .select('*')
        .eq('receipt_id', id)
        .order('attempt_number')
    )
    return { ...row, attempts }
  }
  async create(shopId, value, token) {
    return unwrap(
      await this.forAccessToken(token).rpc('create_pharmacy_receipt', {
        p_shop_id: shopId,
        p_input: value
      })
    )
  }
  async record(shopId, receiptId, actorId, requestId, attemptNumber, verification) {
    return unwrap(
      await this.adminClient.rpc('record_pharmacy_verification', {
        p_shop_id: shopId,
        p_receipt_id: receiptId,
        p_actor_id: actorId,
        p_request_id: requestId,
        p_attempt_number: attemptNumber,
        p_evidence: verification
      })
    )
  }
  async decide(id, value, token) {
    return unwrap(
      await this.forAccessToken(token).rpc('decide_pharmacy_receipt', {
        p_receipt_id: id,
        p_decision: value.decision,
        p_reason: value.reason,
        p_physical_inspection: value.physicalInspection
      })
    )
  }
}
