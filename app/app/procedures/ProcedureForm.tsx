"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createProcedure, updateProcedure, type CreateProcedureState } from "./actions";
import authStyles from "../../auth.module.css";
import styles from "./procedures.module.css";

const initialState: CreateProcedureState = { error: null, success: false };

type ProductOption = { id: string; name: string; unit: string };
type Line = { productId: string; quantity: string; isDosed: boolean };

const emptyLine = (): Line => ({ productId: "", quantity: "", isDosed: false });

export type ProcedureFormInitial = {
  id: string;
  name: string;
  price: number | null;
  lines: Line[];
};

export default function ProcedureForm({
  products,
  mode = "create",
  initial,
  onDone,
  onCancel,
}: {
  products: ProductOption[];
  mode?: "create" | "edit";
  initial?: ProcedureFormInitial;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const action = mode === "edit" ? updateProcedure : createProcedure;
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [lines, setLines] = useState<Line[]>(initial?.lines.length ? initial.lines : [emptyLine()]);

  useEffect(() => {
    if (state.success) {
      if (mode === "create") {
        formRef.current?.reset();
        setLines([emptyLine()]);
      }
      onDone?.();
    }
    // Only re-run when the action's result identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      {mode === "edit" && initial && <input type="hidden" name="procedureId" value={initial.id} />}

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
          <input
            className={authStyles.field}
            type="text"
            name="name"
            defaultValue={initial?.name}
            required
          />
        </label>
        <label className={authStyles.label}>
          Price charged ($) — optional
          <input
            className={authStyles.field}
            type="number"
            name="price"
            min={0}
            step="0.01"
            defaultValue={initial?.price ?? ""}
            placeholder="Add later"
          />
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
          {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Save procedure"}
        </button>
        {mode === "edit" && (
          <button type="button" onClick={onCancel} className={styles.removeBtn}>
            Cancel
          </button>
        )}
        {state.error && (
          <div className={authStyles.error} role="alert">
            {state.error}
          </div>
        )}
      </div>
    </form>
  );
}
