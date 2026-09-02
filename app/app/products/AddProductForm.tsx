"use client";

import { useActionState, useEffect, useRef } from "react";
import { addProduct, type AddProductState } from "./actions";
import authStyles from "../../auth.module.css";

const initialState: AddProductState = { error: null, success: false };

export default function AddProductForm() {
  const [state, formAction, pending] = useActionState(addProduct, initialState);
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
        <input className={authStyles.field} type="text" name="name" required />
      </label>
      <label className={authStyles.label}>
        Category
        <select className={authStyles.field} name="category" required defaultValue="">
          <option value="" disabled>
            Select
          </option>
          <option>Injectable</option>
          <option>Skincare</option>
          <option>Consumable</option>
          <option>Device</option>
          <option>Other</option>
        </select>
      </label>
      <label className={authStyles.label}>
        Unit
        <input className={authStyles.field} type="text" name="unit" placeholder="e.g. vials" defaultValue="units" />
      </label>
      <label className={authStyles.label}>
        Cost per unit ($)
        <input className={authStyles.field} type="number" name="costPerUnit" min={0} step="0.01" />
      </label>
      <label className={authStyles.label}>
        Default supplier
        <input className={authStyles.field} type="text" name="defaultSupplier" />
      </label>
      <label className={authStyles.label}>
        Reorder level
        <input className={authStyles.field} type="number" name="reorderLevel" min={0} defaultValue={0} />
      </label>
      <label
        className={authStyles.label}
        style={{ flexDirection: "row", alignItems: "center", gap: 8, textTransform: "none" }}
      >
        <input type="checkbox" name="isS4" style={{ width: 16, height: 16 }} />
        Schedule 4 (S4)
      </label>
      <button className={authStyles.btn} type="submit" disabled={pending} style={{ height: 46 }}>
        {pending ? "Adding…" : "Add product"}
      </button>

      {state.error && (
        <div className={authStyles.error} role="alert" style={{ gridColumn: "1 / -1" }}>
          {state.error}
        </div>
      )}
    </form>
  );
}
