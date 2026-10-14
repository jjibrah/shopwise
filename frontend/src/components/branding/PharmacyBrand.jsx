import { Link } from "react-router-dom";
export function PharmacyMark({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="10" fill="currentColor" />
      <path d="M17 10h6v7h7v6h-7v7h-6v-7h-7v-6h7z" fill="#f4f8fc" />
      <path d="m29 9 3 3-3 3-3-3z" fill="#9dccfa" />
    </svg>
  );
}
export function PharmacyBrand() {
  return (
    <Link
      to="/"
      className="pharmacy-brand"
      aria-label="Dukani Pharmacy POS home"
    >
      <PharmacyMark />
      <span>
        <strong>Dukani</strong>
        <small>Pharmacy POS</small>
      </span>
    </Link>
  );
}
