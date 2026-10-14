import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PharmacyPage } from "./PharmacyPage";
import { pharmacyApi } from "./pharmacyApi";
vi.mock("./pharmacyApi", () => ({
  pharmacyApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    verify: vi.fn(),
    decide: vi.fn(),
  },
}));
const sample = {
  medicine: "Paracetamol 500 mg tablets",
  productCode: "DEMO-PARA-500",
  batchNumber: "DEMO-MATCH-26",
  printedExpiry: "2028-06-30",
  label: "Matching batch",
};
const receipt = {
  id: "receipt-a",
  medicine: sample.medicine,
  product_code: sample.productCode,
  batch_number: sample.batchNumber,
  printed_expiry: sample.printedExpiry,
  supplier: "Demo supplier",
  delivery_reference: "DEMO-DEL-1",
  quantity: 24,
  unit: "packs",
  created_at: new Date().toISOString(),
  decision: "pending",
  outcome: "unchecked",
  attempts: [],
};
function mount(path = "/app/pharmacy/receipts/receipt-a") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/app/pharmacy" element={<PharmacyPage />} />
          <Route path="/app/pharmacy/:view" element={<PharmacyPage />} />
          <Route
            path="/app/pharmacy/receipts/:receiptId"
            element={<PharmacyPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  pharmacyApi.list.mockResolvedValue({
    source: "demo",
    items: [],
    samples: [sample],
    limit: 250,
  });
  pharmacyApi.get.mockResolvedValue(receipt);
});
describe("pharmacy receiving decisions", () => {
  it("requires a matching check, inspection, reason and explicit confirmation to accept", async () => {
    const user = userEvent.setup();
    const evidence = {
      outcome: "matched",
      source: "demo",
      message: "Batch metadata matched. Authenticity not checked.",
      checkedAt: new Date().toISOString(),
    };
    pharmacyApi.verify.mockResolvedValue({
      ...receipt,
      outcome: "matched",
      latest_evidence: evidence,
      attempts: [{ id: "attempt-a", evidence, created_at: evidence.checkedAt }],
    });
    pharmacyApi.decide.mockResolvedValue({
      ...receipt,
      outcome: "matched",
      latest_evidence: evidence,
      decision: "accepted",
      decision_reason: "Packaging inspected",
      physical_inspection: true,
    });
    mount();
    await screen.findByText(
      "Run a demo batch check before deciding whether to accept these packages.",
    );
    const accept = screen.getByRole("button", {
      name: "Accept into demo ledger",
    });
    expect(accept).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Check demo batch" }));
    await screen.findByRole("button", { name: "Retry demo check" });
    expect(accept).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    await user.type(
      screen.getByRole("textbox", { name: "Decision reason" }),
      "Packaging inspected",
    );
    expect(accept).toBeEnabled();
    await user.click(accept);
    expect(pharmacyApi.decide).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirm decision" }));
    await waitFor(() =>
      expect(pharmacyApi.decide).toHaveBeenCalledWith("receipt-a", {
        decision: "accepted",
        reason: "Packaging inspected",
        physicalInspection: true,
      }),
    );
    expect(
      screen.getByText(
        "Synthetic registry data. No live NTTS connection or authenticity certification.",
        { exact: false },
      ),
    ).toBeInTheDocument();
  });
  it("keeps unknown batches out of accepted stock while allowing quarantine", async () => {
    pharmacyApi.get.mockResolvedValue({
      ...receipt,
      outcome: "not_found",
      latest_evidence: {
        source: "demo",
        message: "No batch found",
        outcome: "not_found",
        checkedAt: new Date().toISOString(),
      },
    });
    const user = userEvent.setup();
    mount();
    await screen.findByText("No batch found");
    await user.click(screen.getByRole("checkbox"));
    await user.type(
      screen.getByRole("textbox", { name: "Decision reason" }),
      "Hold for supplier review",
    );
    expect(
      screen.getByRole("button", { name: "Accept into demo ledger" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Quarantine packages" }),
    ).toBeEnabled();
  });
  it("preserves the receiving request ID after an ambiguous network failure", async () => {
    pharmacyApi.create.mockRejectedValue(new Error("Network unavailable"));
    const user = userEvent.setup();
    mount("/app/pharmacy/receive");
    await screen.findByRole("option", { name: "Matching batch" });
    await user.selectOptions(screen.getByLabelText("Scenario"), "0");
    await user.click(
      screen.getByRole("button", { name: "Save and review batch" }),
    );
    await screen.findByRole("alert");
    await user.click(
      screen.getByRole("button", { name: "Save and review batch" }),
    );
    await waitFor(() => expect(pharmacyApi.create).toHaveBeenCalledTimes(2));
    expect(pharmacyApi.create.mock.calls[0][0].requestId).toBe(
      pharmacyApi.create.mock.calls[1][0].requestId,
    );
  });
});
