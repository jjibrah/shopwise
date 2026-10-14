import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../features/auth/AuthContext";
import { apiMessage } from "../../utils/format";
import { PasswordField } from "./PasswordField";
export function LoginPage() {
  const auth = useAuth(),
    navigate = useNavigate(),
    location = useLocation();
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const data = new FormData(event.currentTarget);
    try {
      const identity = await auth.login(
        data.get("email"),
        data.get("password"),
      );
      navigate(
        location.state?.from?.pathname ||
          (identity.role === "owner" ? "/app" : "/pos"),
        { replace: true },
      );
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="ph-auth-form">
      <h1>Welcome back.</h1>
      <p className="ph-auth-intro">
        Sign in to your pharmacy workspace.
        <br />
        Your counter, stock and team are waiting.
      </p>
      {error && (
        <div role="alert" className="ph-form-message ph-form-error">
          {error}
        </div>
      )}
      <form onSubmit={submit} aria-busy={loading}>
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
        <PasswordField />
        <p className="ph-form-help">
          Need help with a staff password? Ask your pharmacy owner to send a
          recovery email.
        </p>
        <Button size="lg" className="ph-auth-submit" loading={loading}>
          {loading ? "Signing in…" : "Sign in"}
          {!loading && <ArrowRight size={18} />}
        </Button>
      </form>
      <p className="ph-auth-switch">
        Starting with Dukani? <Link to="/signup">Create an account</Link>
      </p>
    </div>
  );
}
