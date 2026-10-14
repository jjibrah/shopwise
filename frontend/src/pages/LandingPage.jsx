import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ScanLine,
  Package,
  FileCheck2,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import {
  PharmacyBrand,
  PharmacyMark,
} from "../components/branding/PharmacyBrand";
import "../styles/landing.css";

const stages = [
  {
    name: "Receive",
    title: "Know what comes in.",
    text: "The planned receiving workflow brings supplier, medicine, batch and expiry details into one stock record.",
    status: "Delivery recorded",
    detail: "Supplier reference",
    value: "DEL-2026-0142",
  },
  {
    name: "Review",
    title: "Keep stock in sight.",
    text: "Batch and expiry views are part of the pharmacy roadmap, helping your team identify stock that needs attention.",
    status: "Stock reviewed",
    detail: "Expiry date",
    value: "30 September 2027",
  },
  {
    name: "Dispense",
    title: "Keep a clear record.",
    text: "Connect the sale at the counter with the medicine record. The pharmacy workflow is being designed around dispensing traceability.",
    status: "Dispensing recorded",
    detail: "Transaction reference",
    value: "DK-2026-0086",
  },
  {
    name: "Report",
    title: "Prepare for NTTS.",
    text: "The planned NTTS connection will bring submission status and follow-up into the same workspace. Integration is in development.",
    status: "Awaiting integration",
    detail: "NTTS submission",
    value: "Not connected",
  },
];
export function LandingPage() {
  const auth = useAuth();
  const root = useRef(null);
  const [stage, setStage] = useState(0);
  const workspace = auth.role === "owner" ? "/app" : "/pos";
  const destination = auth.isAuthenticated ? workspace : "/signup";
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.12 },
    );
    root.current
      ?.querySelectorAll(".ph-reveal")
      .forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
  return (
    <div className="pharmacy-site" ref={root}>
      <a href="#main-content" className="ph-skip">
        Skip to content
      </a>
      <header className="ph-nav ph-container">
        <PharmacyBrand />
        <nav aria-label="Main navigation">
          <a href="#workspace">The workspace</a>
          <a href="#traceability">NTTS roadmap</a>
          <a href="#questions">Questions</a>
        </nav>
        <div className="ph-nav-account">
          {!auth.isAuthenticated && <Link to="/login">Sign in</Link>}
          <Link className="ph-button ph-button-small" to={destination}>
            {auth.isAuthenticated ? "Open workspace" : "Get started"}
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </header>
      <main id="main-content">
        <section className="ph-hero ph-container">
          <div className="ph-hero-copy">
            <h1>
              <span>Care at</span>
              <span>the counter.</span>
            </h1>
            <p>
              A pharmacy POS for Kenya. Bring sales, stock and your team
              together, with NTTS traceability at the heart of what comes next.
            </p>
            <div className="ph-hero-actions">
              <Link className="ph-button" to={destination}>
                {auth.isAuthenticated
                  ? "Open your workspace"
                  : "Create your workspace"}
                <ArrowUpRight size={19} />
              </Link>
              <a className="ph-text-link" href="#traceability">
                Explore the NTTS roadmap <ArrowRight size={17} />
              </a>
            </div>
            <div className="ph-hero-note">
              <span className="ph-dot" />
              Built around independent Kenyan pharmacies.
            </div>
          </div>
          <div className="ph-hero-product">
            <PharmacyPreview />
            <p className="ph-preview-caption">
              A look at the pharmacy workspace we’re building. Sample records.
            </p>
          </div>
        </section>
        <div className="ph-context ph-container">
          <span>From your shelf to the patient.</span>
          <p>Everyday point of sale. A clearer path to traceability.</p>
          <a href="#workspace" aria-label="Explore the pharmacy workspace">
            <ArrowRight size={24} />
          </a>
        </div>
        <section className="ph-workspace ph-container" id="workspace">
          <div className="ph-section-intro ph-reveal">
            <h2>
              Your daily work.
              <br />
              Better connected.
            </h2>
            <p>
              Start with the essentials already in Dukani. Build towards the
              records a pharmacy needs.
            </p>
          </div>
          <div className="ph-feature-row ph-reveal">
            <div>
              <h3>A calmer counter.</h3>
              <p>
                Manage checkout, receipts and payment status in a focused
                workspace. Give your team access to the tools they need.
              </p>
              <span className="ph-feature-status">
                <Check size={16} />
                Existing POS foundation
              </span>
            </div>
            <div className="ph-fragment ph-receipt" data-ui>
              <div>
                <strong>Sale receipt</strong>
                <span>Sample · DK-0086</span>
              </div>
              <p>
                <span>Saline nasal spray</span>
                <strong>KES 480.00</strong>
              </p>
              <p>
                <span>Payment method</span>
                <span>Cash</span>
              </p>
              <footer>
                <span>Total paid</span>
                <strong>KES 480.00</strong>
              </footer>
            </div>
          </div>
          <div className="ph-feature-row ph-reveal">
            <div>
              <h3>A clearer shelf.</h3>
              <p>
                See stock balances and inventory movements today. Batch, expiry
                and medicine identification are the next layer on our pharmacy
                roadmap.
              </p>
              <span className="ph-feature-status">
                <Package size={16} />
                Pharmacy stock tools planned
              </span>
            </div>
            <div className="ph-fragment ph-stock" data-ui>
              <strong>Batch view · concept</strong>
              <div className="ph-stock-line">
                <span>
                  Saline nasal spray<small>Batch SL-2408 · 24 units</small>
                </span>
                <span>Sep 2027</span>
              </div>
              <div className="ph-stock-line">
                <span>
                  Oral rehydration salts<small>Batch OR-2311 · 12 units</small>
                </span>
                <span className="ph-expiry">Review expiry</span>
              </div>
              <p>Sample stock · not connected to live inventory</p>
            </div>
          </div>
          <div className="ph-feature-row ph-reveal">
            <div>
              <h3>A record that follows.</h3>
              <p>
                The planned NTTS integration connects the medicine journey to
                your daily operations, with a clear view of what still needs to
                be submitted.
              </p>
              <span className="ph-feature-status">
                <FileCheck2 size={16} />
                NTTS integration in development
              </span>
            </div>
            <div className="ph-fragment ph-submission" data-ui>
              <FileCheck2 size={32} />
              <strong>A place for every record.</strong>
              <p>Receiving → Stock → Dispensing → Reporting</p>
              <span>NTTS connection: planned</span>
            </div>
          </div>
        </section>
        <section className="ph-trace" id="traceability">
          <div className="ph-container">
            <div className="ph-section-intro ph-reveal">
              <h2>Follow the medicine.</h2>
              <p>
                Explore our planned pharmacy workflow, from delivery to a record
                prepared for national traceability.
              </p>
            </div>
            <div
              className="ph-stage-tabs"
              role="tablist"
              aria-label="Planned medicine journey"
            >
              {stages.map((item, index) => (
                <button
                  key={item.name}
                  id={`journey-tab-${index}`}
                  role="tab"
                  aria-selected={stage === index}
                  aria-controls="journey-panel"
                  tabIndex={stage === index ? 0 : -1}
                  onClick={() => setStage(index)}
                  onKeyDown={(event) => {
                    if (
                      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                        event.key,
                      )
                    )
                      return;
                    event.preventDefault();
                    const next =
                      event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? 3
                          : (stage + (event.key === "ArrowRight" ? 1 : 3)) % 4;
                    setStage(next);
                    document.getElementById(`journey-tab-${next}`)?.focus();
                  }}
                >
                  {item.name}
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
            <div
              className="ph-journey"
              id="journey-panel"
              role="tabpanel"
              tabIndex={0}
              aria-labelledby={`journey-tab-${stage}`}
            >
              <div className="ph-journey-copy" key={stage}>
                <h3>{stages[stage].title}</h3>
                <p>{stages[stage].text}</p>
                <a
                  className="ph-text-link"
                  href="https://health.go.ke/moh-reaffirms-commitment-stronger-pharmaceutical-regulation-and-digital-health-transformation"
                  target="_blank"
                  rel="noreferrer"
                >
                  Read the Ministry of Health announcement
                  <ArrowUpRight size={17} />
                </a>
              </div>
              <div className="ph-journey-record" data-ui>
                <div>
                  <ScanLine size={25} />
                  <span>Illustrative medicine record</span>
                </div>
                <strong>Saline nasal spray</strong>
                <p>Batch SL-2408 · 24 units</p>
                <dl>
                  <div>
                    <dt>{stages[stage].detail}</dt>
                    <dd>{stages[stage].value}</dd>
                  </div>
                  <div>
                    <dt>Record status</dt>
                    <dd>{stages[stage].status}</dd>
                  </div>
                </dl>
                <small>Workflow concept · sample data</small>
              </div>
            </div>
            <p className="ph-integration-note">
              Dukani is an independent product. NTTS integration is planned; PPB
              approval, certification and live connectivity are not claimed.
            </p>
          </div>
        </section>
        <section className="ph-faq ph-container" id="questions">
          <h2 className="ph-reveal">A little more clarity.</h2>
          <div className="ph-faq-row ph-reveal">
            <h3>Who is this for?</h3>
            <p>
              Independent pharmacy owners and their teams in Kenya who want
              everyday POS operations and medicine traceability to work
              together.
            </p>
          </div>
          <div className="ph-faq-row ph-reveal">
            <h3>Is NTTS connected yet?</h3>
            <p>
              Not yet. We’re adapting the existing POS into a pharmacy
              workspace. NTTS connectivity, batch tracking and expiry tools are
              in development.
            </p>
          </div>
          <div className="ph-faq-row ph-reveal">
            <h3>What can I use today?</h3>
            <p>
              The existing workspace supports products, stock, staff access,
              sales and reports. The preview shows the direction of the pharmacy
              experience.
            </p>
          </div>
          <div className="ph-faq-row ph-reveal">
            <h3>Does an account replace PPB registration?</h3>
            <p>
              No. Your Dukani account is separate from your regulatory
              registration. Pharmacy licensing and regulatory responsibilities
              remain with your pharmacy.
            </p>
          </div>
        </section>
        <section className="ph-close">
          <div className="ph-container ph-reveal">
            <PharmacyMark />
            <h2>More time for care.</h2>
            <p>Give your pharmacy a clearer place to work.</p>
            <Link className="ph-button" to={destination}>
              {auth.isAuthenticated
                ? "Open your workspace"
                : "Create your workspace"}
              <ArrowUpRight size={19} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="ph-footer ph-container">
        <PharmacyBrand />
        <p>Built for the next chapter of pharmacy in Kenya.</p>
        <nav aria-label="Footer navigation">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/contact">Contact</Link>
        </nav>
      </footer>
    </div>
  );
}
function PharmacyPreview() {
  return (
    <div
      className="ph-preview"
      data-ui
      aria-label="Illustrative pharmacy workspace with sample data"
    >
      <header>
        <span>
          <PharmacyMark />
          Dukani
        </span>
        <span className="ph-preview-badge">Pharmacy preview</span>
      </header>
      <div className="ph-preview-content">
        <div className="ph-preview-heading">
          <div>
            <span>Your pharmacy, at a glance</span>
            <strong>A good day for care.</strong>
          </div>
          <span className="ph-preview-date">Sample day</span>
        </div>
        <div className="ph-preview-metrics">
          <div>
            <span>Sales today</span>
            <strong>KES 12,480</strong>
            <small>Sample transactions</small>
          </div>
          <div>
            <span>Stock to review</span>
            <strong>3 medicines</strong>
            <small>Batch tools planned</small>
          </div>
        </div>
        <div className="ph-preview-medicine">
          <div className="ph-medicine-icon">
            <Package size={26} />
          </div>
          <div>
            <strong>Saline nasal spray</strong>
            <span>Batch SL-2408 · Expires Sep 2027</span>
          </div>
          <span>24 units</span>
        </div>
        <div className="ph-preview-trace">
          <div>
            <ScanLine size={20} />
            <strong>A clear medicine journey</strong>
          </div>
          <div className="ph-mini-journey">
            <span>Received</span>
            <ArrowRight size={14} />
            <span>In stock</span>
            <ArrowRight size={14} />
            <span>Dispensed</span>
          </div>
          <footer>
            <span>
              <span className="ph-dot" />
              NTTS connection
            </span>
            <strong>In development</strong>
          </footer>
        </div>
      </div>
      <footer className="ph-preview-bottom">
        <span>
          <Check size={15} />
          Sales, stock & team in one place
        </span>
        <span>Workspace concept</span>
      </footer>
    </div>
  );
}
