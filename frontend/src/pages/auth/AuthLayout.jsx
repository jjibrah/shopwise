import { Link, Outlet, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, ScanLine } from "lucide-react";
import { PharmacyBrand } from "../../components/branding/PharmacyBrand";
import "../../styles/landing.css";
import "../../styles/auth.css";

export function AuthLayout() {
  const signup = useLocation().pathname === "/signup";
  return (
    <main className="ph-auth">
      <section className="ph-auth-story">
        <PharmacyBrand />
        <div className="ph-auth-story-content">
          <h2>
            Behind every
            <br />
            better day.
          </h2>
          <p>
            A clearer workspace for your pharmacy. More room to focus on the
            people who count on you.
          </p>
          <div className="ph-auth-record" data-ui>
            <div>
              <ScanLine size={22} />
              <span>Designed for the medicine journey</span>
            </div>
            <strong>From shelf to patient.</strong>
            <div className="ph-auth-journey">
              <span>Receive</span>
              <ArrowRight size={15} />
              <span>Dispense</span>
              <ArrowRight size={15} />
              <span>Record</span>
            </div>
            <p>NTTS integration in development</p>
          </div>
          <div className="ph-auth-benefits">
            <span>
              <Check size={16} />
              Sales & stock, together
            </span>
            <span>
              <Check size={16} />
              Access for your team
            </span>
            <span>
              <Check size={16} />A pharmacy-first roadmap
            </span>
          </div>
        </div>
        <p className="ph-auth-story-footer">
          Built for independent pharmacies in Kenya.
        </p>
      </section>
      <section className="ph-auth-main">
        <header>
          <Link to="/" className="ph-auth-back">
            <ArrowLeft size={16} />
            Back to home
          </Link>
          <p>
            {signup ? "Already with us?" : "New to Dukani?"}{" "}
            <Link to={signup ? "/login" : "/signup"}>
              {signup ? "Sign in" : "Create account"}
              <ArrowUpIcon />
            </Link>
          </p>
        </header>
        <div className="ph-auth-mobile-brand">
          <PharmacyBrand />
        </div>
        <div className="ph-auth-form-wrap">
          <Outlet />
        </div>
        <footer>
          <span>Dukani Pharmacy POS</span>
          <div>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
        </footer>
      </section>
    </main>
  );
}
function ArrowUpIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path d="M4 12 12 4M4 4h8v8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
