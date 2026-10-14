import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
export function PasswordField({
  name = "password",
  label = "Password",
  autoComplete = "current-password",
  minLength,
  describedBy,
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className="ph-field-label" htmlFor={`auth-${name}`}>
        {label}
      </label>
      <div className="ph-password">
        <input
          id={`auth-${name}`}
          className="ph-input"
          name={name}
          type={visible ? "text" : "password"}
          required
          autoComplete={autoComplete}
          minLength={minLength}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}
