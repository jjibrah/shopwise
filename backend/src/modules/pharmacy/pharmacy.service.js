import { AppError } from '../../errors/AppError.js'
import { demoSamples, verifyDemo } from './demo.gateway.js'
export class PharmacyService {
  constructor({ repository, shopService }) {
    Object.assign(this, { repository, shopService })
  }
  async context(auth) {
    const context = await this.shopService.getCurrentShopContext(auth)
    if (context.membership.role !== 'owner' || context.shop.owner_id !== auth.userId)
      throw AppError.forbidden('Only the owner can use pharmacy receiving in this POC')
    return context.shop
  }
  async list(auth) {
    const shop = await this.context(auth)
    return {
      source: 'demo',
      samples: demoSamples,
      items: await this.repository.list(shop.id, auth.token),
      limit: 250
    }
  }
  async get(auth, id) {
    const shop = await this.context(auth)
    return this.repository.get(shop.id, id, auth.token)
  }
  async create(auth, input) {
    const shop = await this.context(auth)
    return this.repository.create(shop.id, input, auth.token)
  }
  async verify(auth, id, requestId) {
    const shop = await this.context(auth)
    const receipt = await this.repository.get(shop.id, id, auth.token)
    const existing = receipt.attempts.find((a) => a.request_id === requestId)
    if (existing) return receipt
    if (receipt.decision !== 'pending')
      throw AppError.conflict('RECEIPT_FINALIZED', 'A finalized delivery cannot be checked again')
    const evidence = verifyDemo(receipt, receipt.attempts.length + 1)
    await this.repository.record(
      shop.id,
      id,
      auth.userId,
      requestId,
      receipt.attempts.length + 1,
      evidence
    )
    return this.repository.get(shop.id, id, auth.token)
  }
  async decide(auth, id, value) {
    const shop = await this.context(auth)
    await this.repository.get(shop.id, id, auth.token)
    await this.repository.decide(id, value, auth.token)
    return this.repository.get(shop.id, id, auth.token)
  }
}
