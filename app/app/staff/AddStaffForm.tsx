"use client";

import { useActionState, useEffect, useRef } from "react";
import { addStaff, type AddStaffState } from "./actions";
import authStyles from "../../auth.module.css";

const initialState: AddStaffState = { error: null, success: false };

export default function AddStaffForm() {
  const [state, formAction, pending] = useActionState(addStaff, initialState);
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
      <label className={authStyles.label} style={{ flex: "1 1 240px" }}>
        Name
        <input className={authStyles.field} type="text" name="name" placeholder="e.g. Nurse Amy" required />
      </label>
      <button className={authStyles.btn} type="submit" disabled={pending} style={{ height: 46 }}>
        {pending ? "Adding…" : "Add staff"}
      </button>

      {state.error && (
        <div className={authStyles.error} role="alert" style={{ flexBasis: "100%" }}>
          {state.error}
        </div>
      )}
    </form>
  );
}
