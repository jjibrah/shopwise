import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck,
  ClipboardList,
  ScanLine,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Package,
  History,
  LockKeyhole,
} from "lucide-react";
import { pharmacyApi } from "./pharmacyApi";
import { Button } from "../../components/ui/Button";
import { labels, stamp, Status, Requirement, QueryState } from "./PharmacyUi";

function BatchEvidence({ row, pending, busy, verify, act }) {
  const evidence = row.latest_evidence;
  const record = evidence?.registryRecord;
  const Icon =
    row.outcome === "matched"
      ? CheckCircle2
      : row.outcome === "unchecked"
        ? ScanLine
        : AlertTriangle;
  return (
    <section className="ph-surface ph-evidence" aria-live="polite">
      <div className="ph-panel-heading">
        <span className="ph-icon-tile">
          <ScanLine size={21} aria-hidden="true" />
        </span>
        <div>
          <h2>Batch verification</h2>
          <p>Package details compared with the demo registry.</p>
        </div>
      </div>
      <div className={`ph-verification-result ph-result-${row.outcome}`}>
        <Icon size={23} aria-hidden="true" />
        <div>
          <Status value={row.outcome} />
          <p>
            {evidence?.message ||
              "Run a demo batch check before deciding whether to accept these packages."}
          </p>
          {evidence && (
            <span className="ph-evidence-time">
              Synthetic registry · checked {stamp(evidence.checkedAt)} EAT
            </span>
          )}
        </div>
      </div>
      {record && (
        <dl className="ph-registry-facts">
          <div>
            <dt>Registry product</dt>
            <dd>{record.productCode}</dd>
          </div>
          <div>
            <dt>Registry batch</dt>
            <dd>{record.batchNumber}</dd>
          </div>
          <div>
            <dt>Registry expiry</dt>
            <dd>{record.expiry}</dd>
          </div>
          <div>
            <dt>Registry flags</dt>
            <dd>
              {record.recalled ? "Recall active" : "No recall flag"} /{" "}
              {record.registered
                ? "Demo registration active"
                : "Not registered"}
            </dd>
          </div>
        </dl>
      )}
      {pending && (
        <div className="ph-evidence-action">
          <Button
            variant="secondary"
            loading={verify.isPending}
            disabled={busy}
            onClick={() => act(verify)}
          >
            {!verify.isPending && <RefreshCw size={16} aria-hidden="true" />}
            {verify.isPending
              ? "Checking demo registry…"
              : row.outcome === "unchecked"
                ? "Check demo batch"
                : "Retry demo check"}
          </Button>
          <span>Each check is saved as evidence.</span>
        </div>
      )}
    </section>
  );
}

function VerificationHistory({ attempts }) {
  return (
    <section className="ph-surface ph-attempts">
      <div className="ph-panel-heading">
        <span className="ph-icon-tile">
          <History size={21} aria-hidden="true" />
        </span>
        <div>
          <h2>Verification history</h2>
          <p>
            {attempts.length
              ? `${attempts.length} saved ${attempts.length === 1 ? "check" : "checks"} for this delivery.`
              : "The evidence trail starts with your first check."}
          </p>
        </div>
      </div>
      {!attempts.length ? (
        <p className="ph-history-empty">No checks recorded yet.</p>
      ) : (
        <ol>
          {attempts.map((attempt) => (
            <li key={attempt.id}>
              <span className="ph-timeline-marker" aria-hidden="true" />
              <div className="ph-attempt-heading">
                <Status value={attempt.evidence.outcome} />
                <time dateTime={attempt.created_at}>
                  {stamp(attempt.created_at)} EAT
                </time>
              </div>
              <p>{attempt.evidence.message}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function DecisionPanel({
  row,
  pending,
  busy,
  inspected,
  setInspected,
  reason,
  setReason,
  confirmation,
  setConfirmation,
  decide,
  act,
  error,
  fresh,
  canAccept,
}) {
  return (
    <aside className="ph-aside ph-decision">
      <div className="ph-panel-heading">
        <span className="ph-icon-tile">
          <ClipboardCheck size={21} aria-hidden="true" />
        </span>
        <div>
          <h2>Receiving decision</h2>
          <p>
            {pending
              ? "Review the evidence before deciding."
              : "Saved in the demo receiving ledger."}
          </p>
        </div>
      </div>
      {pending ? (
        <>
          <div className="ph-readiness">
            <h3>Before accepting</h3>
            <ul>
              <Requirement met={row.outcome === "matched" && fresh}>
                Matching batch check within 15 minutes
              </Requirement>
              <Requirement met={inspected}>
                Physical packaging inspected
              </Requirement>
              <Requirement met={reason.trim().length >= 5}>
                Decision reason recorded
              </Requirement>
            </ul>
          </div>
          <label className={`ph-check ${inspected ? "ph-check-complete" : ""}`}>
            <input
              type="checkbox"
              checked={inspected}
              onChange={(e) => setInspected(e.target.checked)}
              disabled={busy}
            />
            <span>
              I have inspected the physical packaging, seals and printed
              details.
            </span>
          </label>
          <label>
            <span className="label">Decision reason</span>
            <textarea
              className="control"
              rows={4}
              minLength={5}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Record the inspection or reason for holding this delivery."
              disabled={busy}
              aria-describedby="ph-reason-help"
            />
          </label>
          <span className="ph-field-help" id="ph-reason-help">
            At least 5 characters. Saved with your decision.
          </span>
          {confirmation ? (
            <div
              className={`ph-confirm ph-confirm-${confirmation}`}
              role="group"
              aria-label="Confirm receiving decision"
            >
              <LockKeyhole size={19} aria-hidden="true" />
              <h3>Confirm {labels[confirmation].toLowerCase()}?</h3>
              <p>
                {row.quantity} {row.unit} will be marked{" "}
                {labels[confirmation].toLowerCase()}. This decision cannot be
                changed.
              </p>
              <Button
                variant={confirmation === "rejected" ? "danger" : "primary"}
                loading={decide.isPending}
                onClick={() => act(decide, confirmation)}
              >
                Confirm decision
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => setConfirmation(null)}
              >
                Keep reviewing
              </Button>
            </div>
          ) : (
            <div className="ph-decision-buttons">
              <Button
                disabled={busy || !canAccept || reason.trim().length < 5}
                onClick={() => setConfirmation("accepted")}
              >
                <Package size={17} aria-hidden="true" />
                Accept into demo ledger
              </Button>
              <div className="ph-secondary-decisions">
                <Button
                  variant="secondary"
                  disabled={busy || reason.trim().length < 5}
                  onClick={() => setConfirmation("quarantined")}
                >
                  Quarantine packages
                </Button>
                <Button
                  className="ph-reject-button"
                  variant="secondary"
                  disabled={busy || reason.trim().length < 5}
                  onClick={() => setConfirmation("rejected")}
                >
                  Reject delivery
                </Button>
              </div>
            </div>
          )}
          {!canAccept && (
            <p className="ph-acceptance-help">
              Acceptance needs a matching check within 15 minutes and physical
              inspection.
            </p>
          )}
          <p className="ph-final-note">
            <LockKeyhole size={14} aria-hidden="true" />
            Decisions are final in this POC. Accepted packages enter the demo
            ledger only.
          </p>
        </>
      ) : (
        <div className="ph-saved-decision">
          <Status value={row.decision} />
          <h3>Decision reason</h3>
          <p>{row.decision_reason}</p>
          <p className="ph-cell-note">
            Decision recorded {stamp(row.decided_at)} EAT
            <br />
            Physical inspection:{" "}
            {row.physical_inspection ? "Confirmed" : "Not confirmed"}
          </p>
          <Link className="ph-text-link" to="/app/pharmacy/stock">
            View demo batch ledger
          </Link>
        </div>
      )}
      {error && (
        <p className="ph-error" role="alert">
          {error}
        </p>
      )}
      <div className="ph-limit">
        <AlertTriangle size={17} aria-hidden="true" />
        <p>
          Physical authenticity, supplier licence, package serial and chain of
          custody: <strong>not checked</strong>.
        </p>
      </div>
    </aside>
  );
}

export function ReceiptDetails({ id }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["pharmacy-receipt", id],
    queryFn: () => pharmacyApi.get(id),
  });
  const [reason, setReason] = useState("");
  const [inspected, setInspected] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const verificationId = useRef(null);
  const verify = useMutation({
    mutationFn: async () => {
      verificationId.current ||= crypto.randomUUID();
      const row = await pharmacyApi.verify(id, verificationId.current);
      verificationId.current = null;
      return row;
    },
    onSuccess: (row) => {
      queryClient.setQueryData(["pharmacy-receipt", id], row);
      queryClient.invalidateQueries({ queryKey: ["pharmacy-receipts"] });
    },
  });
  const decide = useMutation({
    mutationFn: (decision) =>
      pharmacyApi.decide(id, {
        decision,
        reason,
        physicalInspection: inspected,
      }),
    onSuccess: (row) => {
      queryClient.setQueryData(["pharmacy-receipt", id], row);
      queryClient.invalidateQueries({ queryKey: ["pharmacy-receipts"] });
      setConfirmation(null);
    },
  });
  const act = async (mutation, value) => {
    setError("");
    try {
      await mutation.mutateAsync(value);
    } catch (err) {
      setError(err.message);
    }
  };
  if (query.isPending || query.error)
    return <QueryState query={query} label="Loading delivery evidence" />;
  const row = query.data;
  const evidence = row.latest_evidence;
  const pending = row.decision === "pending";
  const busy = verify.isPending || decide.isPending;
  const fresh =
    evidence && Date.now() - Date.parse(evidence.checkedAt) < 15 * 60 * 1000;
  const canAccept = row.outcome === "matched" && inspected && fresh;
  return (
    <>
      <Link className="ph-text-link ph-back" to="/app/pharmacy/history">
        Back to receiving history
      </Link>
      <section className="ph-receipt-summary">
        <div className="ph-receipt-heading">
          <div>
            <h2>{row.medicine}</h2>
            <p>
              Delivery reference <strong>{row.delivery_reference}</strong>
            </p>
          </div>
          <Status value={row.decision} />
        </div>
        <dl className="ph-facts">
          {[
            ["Supplier", row.supplier],
            ["Product identifier", row.product_code],
            ["Batch number", row.batch_number],
            ["Printed expiry", row.printed_expiry],
            ["Quantity", `${row.quantity} ${row.unit}`],
            ["Recorded (EAT)", stamp(row.created_at)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="ph-work-grid ph-review-grid">
        <div className="ph-evidence-column">
          <BatchEvidence
            row={row}
            pending={pending}
            busy={busy}
            verify={verify}
            act={act}
          />
          <VerificationHistory attempts={row.attempts} />
        </div>
        <DecisionPanel
          {...{
            row,
            pending,
            busy,
            inspected,
            setInspected,
            reason,
            setReason,
            confirmation,
            setConfirmation,
            decide,
            act,
            error,
            fresh,
            canAccept,
          }}
        />
      </div>
      <p className="ph-footnote">
        <ClipboardList size={15} aria-hidden="true" />
        <span>
          Receipt {row.id}
          <br />
          Demo evidence and decisions are retained for review.
        </span>
      </p>
    </>
  );
}
