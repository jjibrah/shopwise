import { AlertCircle, Check, Circle, RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/Button";

export const labels = {
  unchecked: "Not checked",
  matched: "Batch details matched",
  mismatch: "Details mismatch",
  recalled: "Recalled batch",
  expired: "Expired batch",
  not_found: "Record not found",
  unavailable: "Check unavailable",
  pending: "Awaiting decision",
  accepted: "Accepted",
  quarantined: "Quarantined",
  rejected: "Rejected",
};
export const stamp = (value) =>
  value
    ? new Date(value).toLocaleString("en-KE", {
        timeZone: "Africa/Nairobi",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not recorded";

export function Status({ value }) {
  return (
    <span className={`ph-status ph-status-${value}`}>
      <span className="ph-status-dot" aria-hidden="true" />
      {labels[value] || value}
    </span>
  );
}

export function Requirement({ met, children }) {
  const Icon = met ? Check : Circle;
  return (
    <li className={met ? "ph-requirement met" : "ph-requirement"}>
      <Icon size={15} aria-hidden="true" />
      <span>{children}</span>
      <span className="sr-only">{met ? "Complete" : "Required"}</span>
    </li>
  );
}

export function PharmacyLoading({ label = "Loading receiving records" }) {
  return (
    <div className="ph-loading" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="ph-skeleton ph-skeleton-title" />
      <div className="ph-skeleton ph-skeleton-line" />
      <div className="ph-skeleton-grid">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="ph-skeleton ph-skeleton-field" />
        ))}
      </div>
      <div className="ph-skeleton ph-skeleton-block" />
    </div>
  );
}

export function PharmacyError({ error, retry }) {
  return (
    <section className="ph-error-state" role="alert">
      <div className="ph-state-icon">
        <AlertCircle size={24} aria-hidden="true" />
      </div>
      <h2>Unable to load receiving records</h2>
      <p>{error?.message || "Try again shortly."}</p>
      <Button variant="secondary" onClick={retry}>
        <RefreshCw size={16} aria-hidden="true" />
        Try again
      </Button>
    </section>
  );
}

export function QueryState({ query, label }) {
  if (query.fetchStatus === "paused" && !query.data)
    return (
      <PharmacyError
        error={
          new Error(
            "You are offline. Reconnect to load pharmacy receiving records.",
          )
        }
        retry={query.refetch}
      />
    );
  if (query.isPending) return <PharmacyLoading label={label} />;
  if (query.error)
    return <PharmacyError error={query.error} retry={query.refetch} />;
  return null;
}
