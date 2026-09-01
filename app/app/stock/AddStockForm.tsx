"use client";

import { useActionState, useEffect, useRef } from "react";
import { addStockItem, type AddStockState } from "./actions";
import authStyles from "../../auth.module.css";

const initialState: AddStockState = { error: null, success: false };

export default function AddStockForm() {
  const [state, formAction, pending] = useActionState(addStockItem, initialState);
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
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 16,
        alignItems: "end",
      }}
    >
      <label className={authStyles.label}>
        Product name
        <input className={authStyles.field} type="text" name="productName" required />
      </label>
      <label className={authStyles.label}>
        Supplier
        <input className={authStyles.field} type="text" name="supplier" />
      </label>
      <label className={authStyles.label}>
        Batch
        <input className={authStyles.field} type="text" name="batch" />
      </label>
      <label className={authStyles.label}>
        Expiry date
        <input className={authStyles.field} type="date" name="expiryDate" />
      </label>
      <label className={authStyles.label}>
        Quantity
        <input className={authStyles.field} type="number" name="quantity" min={0} required defaultValue={0} />
      </label>
      <label className={authStyles.label}>
        Unit
        <input className={authStyles.field} type="text" name="unit" placeholder="e.g. vials" defaultValue="units" />
      </label>
      <label className={authStyles.label}>
        Reorder level
        <input className={authStyles.field} type="number" name="reorderLevel" min={0} defaultValue={0} />
      </label>
      <label className={authStyles.label}>
        Unit cost ($)
        <input className={authStyles.field} type="number" name="unitCost" min={0} step="0.01" />
      </label>
      <button className={authStyles.btn} type="submit" disabled={pending} style={{ height: 46 }}>
        {pending ? "Adding…" : "Add item"}
      </button>

      {state.error && (
        <div className={authStyles.error} role="alert" style={{ gridColumn: "1 / -1" }}>
          {state.error}
        </div>
      )}
    </form>
  );
}
