import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, LockKeyhole, Mail } from "lucide-react";
import { supabase } from "../lib/supabase";
import "./AdminLogin.css";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setIsLoading(true);

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (loginError || !data.user) {
      setError("Invalid email or password.");
      setIsLoading(false);
      return;
    }

    const { data: isAdmin, error: adminError } =
  await supabase.rpc("is_admin");

if (adminError || !isAdmin) {
      await supabase.auth.signOut();
      setError("This account is not authorized as a CINETARA admin.");
      setIsLoading(false);
      return;
    }

    navigate("/admin");
  };

  return (
    <main className="admin-login-page">
      <div className="admin-login-glow admin-login-glow-one" />
      <div className="admin-login-glow admin-login-glow-two" />

      <div className="admin-login-card">
        <a className="admin-back-link" href="/">
          <ArrowLeft size={15} />
          Back to CINETARA
        </a>

        <div className="admin-login-logo">
          <img src="/cinetara-logo.png" alt="CINETARA" />
        </div>

        <div className="admin-login-heading">
          <span>PRIVATE ACCESS</span>
          <h1>Admin Login</h1>
          <p>
            Sign in to manage CINETARA enquiries, bookings and services.
          </p>
        </div>

        <form className="admin-login-form" onSubmit={handleLogin}>
          <label>
            Email address
            <div className="admin-input-wrap">
              <Mail size={17} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="cinetaraadmin@gmail.com"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label>
            Password
            <div className="admin-input-wrap">
              <LockKeyhole size={17} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>
          </label>

          {error && <div className="admin-login-error">{error}</div>}

          <button
            className="admin-login-button"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "SIGNING IN..." : "SIGN IN"}
          </button>
        </form>

        <div className="admin-login-security">
          <span />
          SECURE CINETARA ADMIN ACCESS
        </div>
      </div>
    </main>
  );
}