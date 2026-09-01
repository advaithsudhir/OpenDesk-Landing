"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import styles from "../auth.module.css";

const initialState: LoginState = { error: null };

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <label className={styles.label}>
        Email
        <input
          className={styles.field}
          type="email"
          name="email"
          required
          autoComplete="email"
          autoFocus
        />
      </label>
      <label className={styles.label}>
        Password
        <input
          className={styles.field}
          type="password"
          name="password"
          required
          autoComplete="current-password"
        />
      </label>

      {state.error && (
        <div className={styles.error} role="alert">
          {state.error}
        </div>
      )}

      <button className={styles.btn} type="submit" disabled={pending}>
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
