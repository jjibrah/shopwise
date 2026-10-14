import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../features/auth/AuthContext";
import { apiMessage } from "../../utils/format";
import { PasswordField } from "./PasswordField";
export function SignupPage() {
  const auth = useAuth(),
    navigate = useNavigate();
  const [feedback, setFeedback] = useState(null),
    [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setFeedback(null);
    const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("confirm"))
      return setFeedback({ error: true, text: "Passwords do not match." });
    setLoading(true);
    try {
      const result = await auth.signup({
        fullName: data.get("fullName"),
        email: data.get("email"),
        password: data.get("password"),
      });
      if (result?.role) navigate("/app");
      else
        setFeedback({
          text: "Account created. Confirm your email, then sign in.",
        });
    } catch (e) {
      setFeedback({ error: true, text: apiMessage(e) });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="ph-auth-form">
      <h1>Start a better day.</h1>
      <p className="ph-auth-intro">
        Create your pharmacy owner account.
        <br />
        Set up your workspace after signing in.
      </p>
      {feedback && (
        <div
          role={feedback.error ? "alert" : "status"}
          className={`ph-form-message ${feedback.error ? "ph-form-error" : "ph-form-success"}`}
        >
          {feedback.text}
        </div>
      )}
      <form onSubmit={submit} aria-busy={loading}>
        <label>
          <span className="ph-field-label">Full name</span>
          <input
            className="ph-input"
            name="fullName"
            required
            minLength="2"
            autoComplete="name"
            placeholder="Your full name"
          />
        </label>
        <label>
          <span className="ph-field-label">Email address</span>
          <input
            className="ph-input"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@yourpharmacy.co.ke"
          />
        </label>
        <div className="ph-auth-passwords">
          <PasswordField
            autoComplete="new-password"
            minLength="8"
            describedBy="password-guidance"
          />
          <PasswordField
            name="confirm"
            label="Confirm"
            autoComplete="new-password"
            minLength="8"
          />
        </div>
        <p className="ph-form-help" id="password-guidance">
          Use at least 8 characters for your password.
        </p>
        <label className="ph-auth-consent">
          <input type="checkbox" required />
          <span>
            I agree to the <Link to="/terms">terms</Link> and have read the{" "}
            <Link to="/privacy">privacy information</Link>.
          </span>
        </label>
        <Button size="lg" className="ph-auth-submit" loading={loading}>
          {loading ? "Creating account…" : "Create account"}
          {!loading && <ArrowRight size={18} />}
        </Button>
      </form>
      <p className="ph-auth-switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
      <p className="ph-auth-footnote">
        Your Dukani account is separate from PPB registration.
      </p>
    </div>
  );
}
