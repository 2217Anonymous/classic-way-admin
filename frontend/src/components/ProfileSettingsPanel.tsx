"use client";

import { FormEvent, useEffect, useState } from "react";

import { toastError, toastSuccess } from "@/lib/toast";
import { isDemoMockForced } from "@/mock";
import { setCurrentUser } from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { updateUser } from "@/store/usersSlice";

export function ProfileSettingsPanel() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);
  const [fullName, setFullName] = useState(currentUser?.full_name ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFullName(currentUser?.full_name ?? "");
  }, [currentUser?.full_name]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!currentUser) return;
    if (password && password.length < 8) {
      toastError(dispatch, "Password too short", "Use at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toastError(dispatch, "Passwords do not match", "Re-enter the new password.");
      return;
    }

    setBusy(true);

    if (isDemoMockForced()) {
      const updated = {
        ...currentUser,
        full_name: fullName.trim(),
        updated_at: new Date().toISOString(),
      };
      dispatch(setCurrentUser(updated));
      setPassword("");
      setConfirmPassword("");
      setBusy(false);
      toastSuccess(dispatch, "Profile updated", "Your profile settings were saved.");
      return;
    }

    const changes: {
      full_name: string;
      password?: string;
    } = { full_name: fullName.trim() };
    if (password) changes.password = password;

    const result = await dispatch(
      updateUser({ id: currentUser.id, changes }),
    );
    setBusy(false);

    if (updateUser.fulfilled.match(result)) {
      dispatch(setCurrentUser(result.payload));
      setPassword("");
      setConfirmPassword("");
      toastSuccess(dispatch, "Profile updated", "Your profile settings were saved.");
    } else {
      toastError(
        dispatch,
        "Could not update profile",
        result.error?.message ?? "Please try again.",
      );
    }
  }

  return (
    <section className="vz-card max-w-2xl">
      <div className="vz-card-header">
        <h2 className="vz-card-title">Profile settings</h2>
      </div>
      <form onSubmit={submit} className="vz-card-body space-y-4">
        <label className="block">
          <span className="vz-label">Email</span>
          <input
            className="form-input disabled:bg-slate-100/70"
            value={currentUser?.email ?? ""}
            disabled
          />
        </label>
        <label className="block">
          <span className="vz-label">Full name</span>
          <input
            className="form-input"
            required
            minLength={2}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="vz-label">New password</span>
          <input
            className="form-input"
            type="password"
            minLength={8}
            placeholder="Leave blank to keep current"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
          />
        </label>
        <label className="block">
          <span className="vz-label">Confirm password</span>
          <input
            className="form-input"
            type="password"
            minLength={8}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
          />
        </label>
        <div className="flex justify-end border-t border-[var(--card-border)] pt-4">
          <button type="submit" disabled={busy} className="primary-button">
            {busy ? "Saving..." : "Save profile"}
          </button>
        </div>
      </form>
    </section>
  );
}
