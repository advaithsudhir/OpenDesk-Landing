"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addStockBatch, type AddStockState } from "./actions";
import authStyles from "../../auth.module.css";

const initialState: AddStockState = { error: null, success: false };

type ProductOption = {
  id: string;
  name: string;
  brand: string | null;
  unit: string;
  pack_name: string;
  pack_size: number;
};

export default function AddStockForm({ products }: { products: ProductOption[] }) {
  const [state, formAction, pending] = useActionState(addStockBatch, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [productId, setProductId] = useState("");

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setProductId("");
    }
  }, [state]);

  const selectedProduct = products.find((p) => p.id === productId) || null;
  const packLabel = selectedProduct
    ? selectedProduct.pack_name.charAt(0).toUpperCase() + selectedProduct.pack_name.slice(1)
    : "Pack";

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
        <select
          className={authStyles.field}
          name="productId"
          required
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        >
          <option value="" disabled>
            Select a product
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.brand ? `${p.name} (${p.brand})` : p.name}
            </option>
          ))}
        </select>
      </label>
      <label className={authStyles.label}>
        Batch number
        <input className={authStyles.field} type="text" name="batchNumber" />
      </label>
      <label className={authStyles.label}>
        Expiry date
        <input className={authStyles.field} type="date" name="expiryDate" />
      </label>
      <label className={authStyles.label}>
        {packLabel}s received
        <input className={authStyles.field} type="number" name="packsReceived" min={0} step="0.01" required defaultValue={0} />
      </label>
      <label className={authStyles.label}>
        {packLabel} cost override ($)
        <input className={authStyles.field} type="number" name="packCost" min={0} step="0.01" />
      </label>
      <button className={authStyles.btn} type="submit" disabled={pending} style={{ height: 46 }}>
        {pending ? "Receiving…" : "Receive stock"}
      </button>

      {selectedProduct && selectedProduct.pack_size > 1 && (
        <div style={{ gridColumn: "1 / -1", fontSize: 12.5, color: "#6b7268" }}>
          1 {selectedProduct.pack_name} = {selectedProduct.pack_size} {selectedProduct.unit}
        </div>
      )}

      {state.error && (
        <div className={authStyles.error} role="alert" style={{ gridColumn: "1 / -1" }}>
          {state.error}
        </div>
      )}
    </form>
  );
}
