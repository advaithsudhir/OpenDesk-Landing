"use client";

import { useState } from "react";
import { removeProcedure } from "./actions";
import ProcedureForm from "./ProcedureForm";
import DeleteButton from "../DeleteButton";
import styles from "./procedures.module.css";
import { stone } from "../../theme";

type Product = { id: string; name: string; unit: string; cost_per_unit: number | null };

type Supply = {
  id: string;
  quantity: number;
  is_dosed: boolean;
  products: Product | null;
};

type Procedure = {
  id: string;
  name: string;
  price: number | null;
  procedure_supplies: Supply[];
};

export default function ProcedureCard({
  procedure,
  products,
}: {
  procedure: Procedure;
  products: Product[];
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className={styles.rcard}>
        <ProcedureForm
          products={products}
          mode="edit"
          initial={{
            id: procedure.id,
            name: procedure.name,
            price: procedure.price,
            lines: procedure.procedure_supplies.map((s) => ({
              productId: s.products?.id || "",
              quantity: String(s.quantity),
              isDosed: s.is_dosed,
            })),
          }}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  const cost = procedure.procedure_supplies.reduce(
    (sum, s) => sum + s.quantity * (s.products?.cost_per_unit ?? 0),
    0
  );

  return (
    <div className={styles.rcard}>
      <div className={styles.cardHeader}>
        <h3>{procedure.name}</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setEditing(true)} className={styles.editBtn}>
            Edit
          </button>
          <form action={removeProcedure}>
            <input type="hidden" name="procedureId" value={procedure.id} />
            <DeleteButton className={styles.removeBtn} confirmText={`Remove ${procedure.name}?`}>
              Remove
            </DeleteButton>
          </form>
        </div>
      </div>
      {procedure.procedure_supplies.length === 0 ? (
        <div style={{ fontSize: 13, color: stone, fontStyle: "italic", marginBottom: 12 }}>
          No supplies added yet.
        </div>
      ) : (
        <ul>
          {procedure.procedure_supplies.map((s) => (
            <li key={s.id}>
              {s.quantity} {s.is_dosed ? s.products?.unit : ""} × {s.products?.name}
            </li>
          ))}
        </ul>
      )}
      <div className={styles.cost}>
        {procedure.procedure_supplies.length === 0 ? "—" : `$${cost.toFixed(2)} in consumables`}
      </div>
    </div>
  );
}
