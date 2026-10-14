import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, ScanLine, Info, PackagePlus } from "lucide-react";
import { pharmacyApi } from "./pharmacyApi";
import { Button } from "../../components/ui/Button";

const blank = {
  supplier: "",
  deliveryReference: "",
  medicine: "",
  productCode: "",
  batchNumber: "",
  printedExpiry: "",
  quantity: "24",
  unit: "packs",
};
const fields = [
  ["supplier", "Supplier", "text", "Supplier name"],
  [
    "deliveryReference",
    "Delivery reference",
    "text",
    "Invoice or delivery note",
  ],
  ["medicine", "Medicine name", "text", "Name and strength on the package"],
  ["productCode", "Product identifier", "text", "Printed product identifier"],
  ["batchNumber", "Batch number", "text", "Printed batch number"],
  ["printedExpiry", "Printed expiry", "date"],
  ["quantity", "Number of packages", "number"],
  ["unit", "Package unit", "text", "For example, packs or bottles"],
];

export function ReceiveForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["pharmacy-receipts"],
    queryFn: pharmacyApi.list,
  });
  const [form, setForm] = useState(blank);
  const [sample, setSample] = useState("");
  const [error, setError] = useState("");
  const requestId = useRef(crypto.randomUUID());
  const mutation = useMutation({ mutationFn: pharmacyApi.create });
  const fill = (index) => {
    setSample(index);
    if (index === "") return;
    const record = query.data?.samples?.[Number(index)];
    if (!record) return;
    const { medicine, productCode, batchNumber, printedExpiry } = record;
    setForm({
      ...blank,
      medicine,
      productCode,
      batchNumber,
      printedExpiry,
      supplier: "Demo Nairobi Medical Supplies",
      deliveryReference: `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    });
    requestId.current = crypto.randomUUID();
    setError("");
  };
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const row = await mutation.mutateAsync({
        ...form,
        quantity: Number(form.quantity),
        requestId: requestId.current,
      });
      await queryClient.invalidateQueries({ queryKey: ["pharmacy-receipts"] });
      navigate(`/app/pharmacy/receipts/${row.id}`);
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <div className="ph-work-grid">
      <section className="ph-surface ph-receive">
        <div className="ph-panel-heading">
          <span className="ph-icon-tile">
            <PackagePlus size={21} aria-hidden="true" />
          </span>
          <div>
            <h2>Receive a delivery</h2>
            <p>One medicine batch per delivery entry.</p>
          </div>
        </div>
        <form onSubmit={submit} className="ph-form">
          <div className="ph-form-grid">
            {fields.map(([key, label, type, placeholder]) => (
              <label key={key}>
                <span className="label">{label}</span>
                <input
                  className="control"
                  name={key}
                  type={type}
                  placeholder={placeholder}
                  value={form[key]}
                  required
                  min={type === "number" ? 1 : undefined}
                  max={type === "number" ? 1000000 : undefined}
                  step={type === "number" ? 1 : undefined}
                  maxLength={
                    ["medicine", "supplier"].includes(key)
                      ? 160
                      : key === "unit"
                        ? 40
                        : 80
                  }
                  onChange={(e) => {
                    setForm({ ...form, [key]: e.target.value });
                    requestId.current = crypto.randomUUID();
                  }}
                  disabled={mutation.isPending}
                />
              </label>
            ))}
          </div>
          <div className="ph-form-note">
            <Info size={17} aria-hidden="true" />
            <p>
              Saving creates a receiving record. Checking never adds packages to
              stock automatically.
            </p>
          </div>
          {error && (
            <p className="ph-error" role="alert">
              {error}
            </p>
          )}
          <div className="ph-form-footer">
            <Button type="submit" loading={mutation.isPending}>
              {mutation.isPending
                ? "Saving delivery…"
                : "Save and review batch"}
            </Button>
            <Link className="ph-text-link" to="/app/pharmacy/history">
              Cancel
            </Link>
          </div>
        </form>
      </section>
      <aside className="ph-aside ph-demo-aside">
        <div className="ph-panel-heading">
          <span className="ph-icon-tile">
            <FlaskConical size={21} aria-hidden="true" />
          </span>
          <h2>Try a demo scenario</h2>
        </div>
        <p>Use synthetic package details to explore the receiving decisions.</p>
        {query.fetchStatus === "paused" && !query.data ? (
          <p role="alert">Reconnect to load demo scenarios.</p>
        ) : query.isPending ? (
          <p role="status">Loading demo scenarios…</p>
        ) : query.error ? (
          <p role="alert">{query.error.message}</p>
        ) : (
          <label>
            <span className="label">Scenario</span>
            <select
              className="control"
              value={sample}
              onChange={(e) => fill(e.target.value)}
              disabled={mutation.isPending}
            >
              <option value="">Choose a scenario</option>
              {query.data.samples.map((row, i) => (
                <option key={i} value={i}>
                  {row.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="ph-packaging-guide">
          <ScanLine size={22} aria-hidden="true" />
          <h3>Read from the packaging</h3>
          <p>
            Check the batch number alongside the product identifier and printed
            expiry.
          </p>
          <p>
            The medicine name is your receiving label, not an independently
            verified field.
          </p>
        </div>
        <div className="ph-form-note">
          <Info size={17} aria-hidden="true" />
          <p>
            DEMO identifiers are invented. Supplier licensing is not verified.
          </p>
        </div>
      </aside>
    </div>
  );
}
