import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { sendSuccess } from '../../utils/apiResponse.js'
import { uuidField } from '../../utils/validation.js'
import { validateReceipt, validateDecision, validateVerification } from './pharmacy.validation.js'
export function createPharmacyRouter({ authService, pharmacyService }) {
  const router = Router()
  router.use(requireAuth(authService))
  router.get(
    '/',
    asyncHandler(async (req, res) => sendSuccess(res, await pharmacyService.list(req.auth)))
  )
  router.post(
    '/',
    asyncHandler(async (req, res) =>
      sendSuccess(res, await pharmacyService.create(req.auth, validateReceipt(req.body)), 201)
    )
  )
  router.get(
    '/:receiptId',
    asyncHandler(async (req, res) =>
      sendSuccess(
        res,
        await pharmacyService.get(req.auth, uuidField(req.params.receiptId, 'receiptId'))
      )
    )
  )
  router.post(
    '/:receiptId/verify',
    asyncHandler(async (req, res) =>
      sendSuccess(
        res,
        await pharmacyService.verify(
          req.auth,
          uuidField(req.params.receiptId, 'receiptId'),
          validateVerification(req.body)
        )
      )
    )
  )
  router.post(
    '/:receiptId/decision',
    asyncHandler(async (req, res) =>
      sendSuccess(
        res,
        await pharmacyService.decide(
          req.auth,
          uuidField(req.params.receiptId, 'receiptId'),
          validateDecision(req.body)
        )
      )
    )
  )
  return router
}
