"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createProcedure, type CreateProcedureState } from "./actions";
import authStyles from "../../auth.module.css";
import styles from "./procedures.module.css";

const initialState: CreateProcedureState = { error: null, success: false };

type ProductOption = { id: string; name: string; unit: string };
type Line = { productId: string; quantity: string; isDosed: boolean };

const emptyLine = (): Line => ({ productId: "", quantity: "", isDosed: false });

export default function NewProcedureForm({ products }: { products: ProductOption[] }) {
  const [state, formAction, pending] = useActionState(createProcedure, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setLines([emptyLine()]);
    }
  }, [state]);

  const updateLine = (index: number, patch: Partial<Line>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const toggleDosed = (index: number) => {
    setLines((prev) =>
      prev.map((line, i) => ({ ...line, isDosed: i === index ? !line.isDosed : false }))
    );
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const linesJson = JSON.stringify(
    lines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity), isDosed: l.isDosed }))
  );

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="linesJson" value={linesJson} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          alignItems: "end",
          marginBottom: 20,
        }}
      >
        <label className={authStyles.label}>
          Procedure name
          <input className={authStyles.field} type="text" name="name" required />
        </label>
        <label className={authStyles.label}>
          Price charged ($)
          <input className={authStyles.field} type="number" name="price" min={0} step="0.01" required />
        </label>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
        {lines.map((line, index) => (
          <div key={index} className={styles.lineRow}>
            <label className={authStyles.label}>
              {index === 0 ? "Product" : ""}
              <select
                className={authStyles.field}
                value={line.productId}
                onChange={(e) => updateLine(index, { productId: e.target.value })}
                required
              >
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
              {index === 0 ? "Quantity" : ""}
              <input
                className={authStyles.field}
                type="number"
                min={0}
                step="0.01"
                value={line.quantity}
                onChange={(e) => updateLine(index, { quantity: e.target.value })}
                required
              />
            </label>
            <button
              type="button"
              onClick={() => toggleDosed(index)}
              className={`${styles.dosedBtn} ${line.isDosed ? styles.dosedBtnActive : ""}`}
            >
              {line.isDosed ? "Dosed ✓" : "Mark dosed"}
            </button>
            <button
              type="button"
              onClick={() => removeLine(index)}
              className={styles.removeLineBtn}
              disabled={lines.length === 1}
              aria-label="Remove line"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={() => setLines((prev) => [...prev, emptyLine()])} className={styles.addLineBtn}>
        + Add supply line
      </button>

      <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 16 }}>
        <button className={authStyles.btn} type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save procedure"}
        </button>
        {state.error && (
          <div className={authStyles.error} role="alert">
            {state.error}
          </div>
        )}
      </div>
    </form>
  );
}
