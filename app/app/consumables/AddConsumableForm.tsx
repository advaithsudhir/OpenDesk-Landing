"use client";

import { useActionState, useEffect, useRef } from "react";
import { addConsumable, type AddConsumableState } from "./actions";
import authStyles from "../../auth.module.css";

const initialState: AddConsumableState = { error: null, success: false };

type ProductOption = { id: string; name: string; unit: string };

export default function AddConsumableForm({ products }: { products: ProductOption[] }) {
  const [state, formAction, pending] = useActionState(addConsumable, initialState);
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
        Product
        <select className={authStyles.field} name="productId" required defaultValue="">
          <option value="" disabled>
            Select a product
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className={authStyles.label}>
        Quantity
        <input className={authStyles.field} type="number" name="quantity" min={0} required defaultValue={0} />
      </label>
      <button className={authStyles.btn} type="submit" disabled={pending} style={{ height: 46 }}>
        {pending ? "Adding…" : "Add stock"}
      </button>

      {state.error && (
        <div className={authStyles.error} role="alert" style={{ gridColumn: "1 / -1" }}>
          {state.error}
        </div>
      )}
    </form>
  );
}
