import { NavLink, useParams } from "react-router-dom";
import {
  FlaskConical,
  LayoutGrid,
  PackagePlus,
  History,
  Layers,
} from "lucide-react";
import "@fontsource-variable/geist";
import { ReceivingRecords } from "./ReceivingRecords";
import { ReceiveForm } from "./ReceiveForm";
import { ReceiptDetails } from "./ReceiptDetails";
import "./pharmacy.css";

const navigation = [
  ["overview", "Overview", LayoutGrid],
  ["receive", "Receive packages", PackagePlus],
  ["history", "Receiving history", History],
  ["stock", "Batch ledger", Layers],
];

export function PharmacyPage() {
  const { view = "overview", receiptId } = useParams();
  return (
    <div className="pharmacy" data-ui>
      <header className="ph-heading">
        <h1>Pharmacy receiving</h1>
        <p>
          Check incoming medicine batches. Keep the evidence behind every stock
          decision.
        </p>
      </header>
      <div className="ph-demo">
        <FlaskConical size={17} aria-hidden="true" />
        <p>
          <strong>Demo workspace.</strong> Synthetic registry data. No live NTTS
          connection or authenticity certification.
        </p>
      </div>
      <nav className="ph-workspace-nav" aria-label="Pharmacy workspace">
        {navigation.map(([key, label, Icon]) => (
          <NavLink
            key={key}
            to={key === "overview" ? "/app/pharmacy" : `/app/pharmacy/${key}`}
            end
            className={({ isActive }) =>
              isActive || (receiptId && key === "history") ? "active" : ""
            }
            aria-current={receiptId && key === "history" ? "page" : undefined}
          >
            <Icon size={17} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
      {receiptId ? (
        <ReceiptDetails key={receiptId} id={receiptId} />
      ) : view === "receive" ? (
        <ReceiveForm />
      ) : (
        <ReceivingRecords key={view} view={view} />
      )}
    </div>
  );
}
