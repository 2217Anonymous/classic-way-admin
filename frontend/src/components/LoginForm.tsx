"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { toastError, toastSuccess } from "@/lib/toast";
import { login } from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function LoginForm() {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("ChangeMe123!");
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      toastSuccess(dispatch, "Signed in", "Welcome back.");
    } else {
      toastError(
        dispatch,
        "Sign in failed",
        result.error?.message ?? "Invalid email or password.",
      );
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-form-pane">
        <form onSubmit={submit} className="auth-form">
          <span className="auth-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.jpeg" alt="Classic Way" />
          </span>

          <h1 className="auth-title">Welcome back!</h1>
          <p className="auth-subtitle">
            Please enter your credentials to sign in!
          </p>

          <label className="auth-label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="auth-input"
            placeholder="admin@example.com"
            autoComplete="email"
            required
          />

          <label className="auth-label auth-label-spaced" htmlFor="login-password">
            Password
          </label>
          <div className="auth-password-wrap">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="auth-input auth-input-password"
              placeholder="••••••••••••"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="auth-eye"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button type="button" className="auth-forgot">
            Forgot password
          </button>

          {error ? (
            <p className="auth-error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={loading} className="auth-submit">
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="auth-divider">
            <span>or continue with</span>
          </div>

          <div className="auth-social-row">
            <button type="button" className="auth-social" disabled>
              <GoogleIcon />
              Google
            </button>
            <button type="button" className="auth-social" disabled>
              <GithubIcon />
              Github
            </button>
          </div>

          <p className="auth-footer">
            Don&apos;t have an account yet?{" "}
            <button type="button" className="auth-footer-link" disabled>
              Sign up
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l.1.1 6.2 5.2C39.2 37.3 44 32 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.73.5.5 5.74.5 12.02c0 5.1 3.29 9.42 7.86 10.95.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.55-3.88-1.55-.53-1.34-1.3-1.7-1.3-1.7-1.06-.73.08-.72.08-.72 1.17.08 1.79 1.21 1.79 1.21 1.04 1.78 2.73 1.27 3.4.97.1-.76.41-1.27.74-1.56-2.55-.29-5.23-1.29-5.23-5.73 0-1.27.45-2.3 1.19-3.11-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.19a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.5 3.17-1.19 3.17-1.19.63 1.59.23 2.77.11 3.06.74.81 1.18 1.84 1.18 3.11 0 4.45-2.69 5.43-5.25 5.72.42.36.79 1.08.79 2.18 0 1.57-.01 2.84-.01 3.23 0 .31.21.68.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.74 18.27.5 12 .5z" />
    </svg>
  );
}
