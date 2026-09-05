"use client";

import { useActionState, useEffect, useRef } from "react";
import { addRecipient, type AddRecipientState } from "./actions";
import authStyles from "../../auth.module.css";

const initialState: AddRecipientState = { error: null, success: false };

export default function AddRecipientForm() {
  const [state, formAction, pending] = useActionState(addRecipient, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      style={{ display: "flex", gap: 16, alignItems: "end", flexWrap: "wrap" }}
    >
      <label className={authStyles.label} style={{ flex: "1 1 280px" }}>
        Email address
        <input
          className={authStyles.field}
          type="email"
          name="email"
          placeholder="e.g. frontdesk@lumenaesthetics.com.au"
          required
        />
      </label>
      <button className={authStyles.btn} type="submit" disabled={pending} style={{ height: 46 }}>
        {pending ? "Adding…" : "Add recipient"}
      </button>

      {state.error && (
        <div className={authStyles.error} role="alert" style={{ flexBasis: "100%" }}>
          {state.error}
        </div>
      )}
    </form>
  );
}
