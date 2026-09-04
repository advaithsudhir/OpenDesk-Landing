"use client";

import { useActionState } from "react";
import { updateOrderCycle, type UpdateOrderCycleState } from "./actions";
import authStyles from "../../auth.module.css";

const initialState: UpdateOrderCycleState = { error: null, success: false };

export default function OrderCycleForm({ currentDays }: { currentDays: number }) {
  const [state, formAction, pending] = useActionState(updateOrderCycle, initialState);

  return (
    <form action={formAction} style={{ display: "flex", alignItems: "end", gap: 16, flexWrap: "wrap" }}>
      <label className={authStyles.label} style={{ maxWidth: 160 }}>
        Order cycle (days)
        <input
          className={authStyles.field}
          type="number"
          name="orderCycleDays"
          min={1}
          defaultValue={currentDays}
        />
      </label>
      <button className={authStyles.btn} type="submit" disabled={pending} style={{ height: 46 }}>
        {pending ? "Saving…" : "Save"}
      </button>
      {state.success && <span style={{ fontSize: 12.5, color: "#4A6350" }}>Saved.</span>}
      {state.error && (
        <div className={authStyles.error} role="alert">
          {state.error}
        </div>
      )}
    </form>
  );
}
