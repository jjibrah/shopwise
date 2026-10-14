import { AppError } from '../../errors/AppError.js'
import {
  requireObject,
  rejectUnknownFields,
  stringField,
  uuidField,
  positiveInteger
} from '../../utils/validation.js'

export function validateReceipt(body) {
  requireObject(body)
  rejectUnknownFields(body, [
    'requestId',
    'supplier',
    'deliveryReference',
    'medicine',
    'productCode',
    'batchNumber',
    'printedExpiry',
    'quantity',
    'unit'
  ])
  const value = { request_id: uuidField(body.requestId, 'requestId') }
  for (const [field, column, max] of [
    ['supplier', 'supplier', 160],
    ['deliveryReference', 'delivery_reference', 100],
    ['medicine', 'medicine', 160],
    ['productCode', 'product_code', 80],
    ['batchNumber', 'batch_number', 80],
    ['unit', 'unit', 40]
  ]) {
    value[column] = stringField(body[field], field, { required: true, max })
  }
  const expiry = stringField(body.printedExpiry, 'printedExpiry', {
    required: true,
    pattern: /^\d{4}-\d{2}-\d{2}$/
  })
  if (
    !Number.isFinite(Date.parse(expiry)) ||
    new Date(expiry).toISOString().slice(0, 10) !== expiry
  )
    throw AppError.badRequest('VALIDATION_ERROR', 'Printed expiry must be a valid calendar date')
  value.printed_expiry = expiry
  if (!['number', 'string'].includes(typeof body.quantity) || !/^\d+$/.test(String(body.quantity)))
    throw AppError.badRequest('VALIDATION_ERROR', 'Quantity must be a whole number of packages')
  value.quantity = positiveInteger(body.quantity, 'quantity', { max: 1000000 })
  if (!value.quantity) throw AppError.badRequest('VALIDATION_ERROR', 'Quantity is required')
  return value
}

export function validateVerification(body) {
  requireObject(body)
  rejectUnknownFields(body, ['requestId'])
  return uuidField(body.requestId, 'requestId')
}

export function validateDecision(body) {
  requireObject(body)
  rejectUnknownFields(body, ['decision', 'reason', 'physicalInspection'])
  const decision = stringField(body.decision, 'decision', {
    required: true,
    pattern: /^(accepted|quarantined|rejected)$/
  })
  if (typeof body.physicalInspection !== 'boolean')
    throw AppError.badRequest('VALIDATION_ERROR', 'Physical inspection confirmation is required')
  return {
    decision,
    reason: stringField(body.reason, 'reason', { required: true, min: 5, max: 1000 }),
    physicalInspection: body.physicalInspection
  }
}
