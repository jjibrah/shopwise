import { api, ApiError } from "../../services/apiClient";
const base = "/pharmacy/receipts";
function invalidResponse() {
  return new ApiError(
    "Pharmacy receiving returned an incomplete response. Try again.",
    { code: "INVALID_PHARMACY_RESPONSE" },
  );
}
function receipt(data, requireAttempts = false) {
  if (
    !data ||
    typeof data !== "object" ||
    typeof data.id !== "string" ||
    (requireAttempts && !Array.isArray(data.attempts))
  )
    throw invalidResponse();
  return data;
}
export const pharmacyApi = {
  list: async () => {
    const data = await api(base);
    if (
      !data ||
      !Array.isArray(data.items) ||
      !Array.isArray(data.samples) ||
      !Number.isInteger(data.limit) ||
      data.limit <= 0
    )
      throw invalidResponse();
    return data;
  },
  get: async (id) => receipt(await api(`${base}/${id}`), true),
  create: async (body) => receipt(await api(base, { method: "POST", body })),
  verify: async (id, requestId) =>
    receipt(
      await api(`${base}/${id}/verify`, {
        method: "POST",
        body: { requestId },
      }),
      true,
    ),
  decide: async (id, body) =>
    receipt(
      await api(`${base}/${id}/decision`, { method: "POST", body }),
      true,
    ),
};
