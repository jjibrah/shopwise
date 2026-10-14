import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  PackagePlus,
  Search,
  ClipboardCheck,
  ScanLine,
  PackageCheck,
  ShieldAlert,
} from "lucide-react";
import { pharmacyApi } from "./pharmacyApi";
import { labels, QueryState, Status } from "./PharmacyUi";

function ReceivingIntro() {
  return (
    <section className="ph-intro">
      <div className="ph-intro-copy">
        <h2>
          Every delivery.
          <br />A documented decision.
        </h2>
        <p>
          Record the package, compare its batch details, and keep the evidence
          before deciding what enters your demo ledger.
        </p>
        <Link className="ph-primary" to="/app/pharmacy/receive">
          <PackagePlus size={18} aria-hidden="true" />
          Receive a delivery
        </Link>
      </div>
      <div className="ph-workflow" aria-label="Receiving workflow">
        {[
          [
            ClipboardCheck,
            "Record the delivery",
            "Supplier, batch and printed expiry",
          ],
          [ScanLine, "Check the batch", "Compare with the synthetic registry"],
          [
            PackageCheck,
            "Make a decision",
            "Inspect, then accept, hold or reject",
          ],
        ].map(([Icon, title, description]) => (
          <div className="ph-workflow-step" key={title}>
            <span className="ph-workflow-icon">
              <Icon size={21} aria-hidden="true" />
            </span>
            <div>
              <strong>{title}</strong>
              <p>{description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DeliveryRecords({ items, stock }) {
  return (
    <>
      <div className="table-wrap ph-desktop-records">
        <table className="data-table">
          <caption className="sr-only">
            {stock ? "Demo batch stock" : "Recorded medicine deliveries"}
          </caption>
          <thead>
            <tr>
              <th>Medicine / batch</th>
              <th>Delivery</th>
              <th>Packages</th>
              <th>Batch check</th>
              <th>Decision</th>
              <th>
                <span className="sr-only">Record</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.medicine}</strong>
                  <span className="ph-cell-note">
                    {row.batch_number}
                    <br />
                    Expires {row.printed_expiry}
                  </span>
                </td>
                <td>
                  {row.supplier}
                  <span className="ph-cell-note">{row.delivery_reference}</span>
                </td>
                <td className="ph-quantity">
                  {row.quantity}
                  <span className="ph-cell-note">{row.unit}</span>
                </td>
                <td>
                  <Status value={row.outcome} />
                </td>
                <td>
                  <Status value={row.decision} />
                </td>
                <td>
                  <Link
                    className="ph-review-link"
                    to={`/app/pharmacy/receipts/${row.id}`}
                    aria-label={`Review ${row.medicine}, ${row.delivery_reference}`}
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul
        className="ph-mobile-records"
        aria-label={stock ? "Demo batch stock" : "Recorded medicine deliveries"}
      >
        {items.map((row) => (
          <li key={row.id}>
            <div className="ph-section-heading">
              <h3>{row.medicine}</h3>
              <Status value={row.decision} />
            </div>
            <p>{row.supplier}</p>
            <dl>
              <div>
                <dt>Batch</dt>
                <dd>{row.batch_number}</dd>
              </div>
              <div>
                <dt>Expires</dt>
                <dd>{row.printed_expiry}</dd>
              </div>
              <div>
                <dt>Packages</dt>
                <dd>
                  {row.quantity} {row.unit}
                </dd>
              </div>
              <div>
                <dt>Reference</dt>
                <dd>{row.delivery_reference}</dd>
              </div>
            </dl>
            <div className="ph-mobile-record-footer">
              <Status value={row.outcome} />
              <Link
                className="ph-text-link"
                to={`/app/pharmacy/receipts/${row.id}`}
                aria-label={`Review ${row.medicine}, ${row.delivery_reference}`}
              >
                Review
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export function ReceivingRecords({ view }) {
  const query = useQuery({
    queryKey: ["pharmacy-receipts"],
    queryFn: pharmacyApi.list,
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  if (query.isPending || query.error) return <QueryState query={query} />;
  const items = query.data.items;
  const stock = view === "stock";
  const overview = view === "overview";
  const visible = items.filter(
    (row) =>
      (!stock || ["accepted", "quarantined"].includes(row.decision)) &&
      (filter === "all" || row.decision === filter) &&
      [
        row.medicine,
        row.batch_number,
        row.delivery_reference,
        row.supplier,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
  );
  const stats = [
    ["Deliveries recorded", items.length, "Within the latest records"],
    [
      "Awaiting decision",
      items.filter((r) => r.decision === "pending").length,
      "Ready for review",
    ],
    [
      "Accepted packages",
      items
        .filter((r) => r.decision === "accepted")
        .reduce((n, r) => n + r.quantity, 0),
      "In the demo ledger",
    ],
    [
      "Quarantined packages",
      items
        .filter((r) => r.decision === "quarantined")
        .reduce((n, r) => n + r.quantity, 0),
      "Held separately",
    ],
  ];
  return (
    <>
      {overview && (
        <>
          <ReceivingIntro />
          <dl className="ph-metrics">
            {stats.map(([label, value, note]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
                <span>{note}</span>
              </div>
            ))}
          </dl>
          <div className="ph-scope-note">
            <ShieldAlert size={18} aria-hidden="true" />
            <p>
              A batch match has limits. Package serials, supplier licences and
              custody are not checked. Physical inspection is required before
              demo acceptance.
            </p>
          </div>
        </>
      )}
      <section className="ph-records">
        <div className="ph-section-heading">
          <div>
            <h2>
              {stock
                ? "Demo batch ledger"
                : overview
                  ? "Recent receiving activity"
                  : "Receiving history"}
            </h2>
            <p>
              {stock
                ? "Accepted and quarantined packages stay separate. This ledger does not supply the POS."
                : `Latest ${query.data.limit} deliveries. Times shown in East Africa Time.`}
            </p>
          </div>
          {!overview && (
            <Link className="ph-primary" to="/app/pharmacy/receive">
              <PackagePlus size={17} aria-hidden="true" />
              Receive packages
            </Link>
          )}
        </div>
        <div className="ph-filters">
          <label>
            <span className="label">Search deliveries</span>
            <div className="ph-search">
              <Search size={18} aria-hidden="true" />
              <input
                className="control"
                type="search"
                placeholder="Medicine, batch, supplier or reference"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </label>
          <label>
            <span className="label">Receiving decision</span>
            <select
              className="control"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All decisions</option>
              {(stock
                ? ["accepted", "quarantined"]
                : ["pending", "accepted", "quarantined", "rejected"]
              ).map((v) => (
                <option key={v} value={v}>
                  {labels[v]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!visible.length ? (
          <div className="ph-empty">
            <PackagePlus size={28} aria-hidden="true" />
            <h3>
              {search || filter !== "all"
                ? "No matching deliveries"
                : stock
                  ? "No packages in the ledger yet"
                  : "Your first delivery starts here"}
            </h3>
            <p>
              {search || filter !== "all"
                ? "Try another search or decision filter."
                : stock
                  ? "Accept or quarantine a recorded delivery to see it here."
                  : "Record a delivery and save a batch check to build your receiving history."}
            </p>
            {search || filter !== "all" ? (
              <button
                className="ph-text-link"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
              >
                Clear filters
              </button>
            ) : (
              <Link className="ph-text-link" to="/app/pharmacy/receive">
                Receive packages
              </Link>
            )}
          </div>
        ) : (
          <DeliveryRecords items={visible} stock={stock} />
        )}
        <div className="ph-records-footer">
          <span>
            {visible.length} {visible.length === 1 ? "delivery" : "deliveries"}{" "}
            shown
          </span>
          <span>Latest {query.data.limit} records only</span>
        </div>
      </section>
    </>
  );
}
