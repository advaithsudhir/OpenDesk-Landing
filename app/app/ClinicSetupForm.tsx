"use client";

import { useActionState } from "react";
import { createClinic, type ClinicSetupState } from "./actions";
import styles from "../auth.module.css";

const initialState: ClinicSetupState = { error: null };

export default function ClinicSetupForm() {
  const [state, formAction, pending] = useActionState(createClinic, initialState);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <label className={styles.label}>
        Clinic name
        <input
          className={styles.field}
          type="text"
          name="clinicName"
          required
          autoFocus
          placeholder="e.g. Lumen Aesthetics"
        />
      </label>

      {state.error && (
        <div className={styles.error} role="alert">
          {state.error}
        </div>
      )}

      <button className={styles.btn} type="submit" disabled={pending}>
        {pending ? "Setting up…" : "Continue"}
      </button>
    </form>
  );
}
