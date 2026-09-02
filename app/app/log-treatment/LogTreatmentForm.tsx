"use client";

import { useActionState, useEffect, useState } from "react";
import { logTreatment, type LogTreatmentState } from "./actions";
import authStyles from "../../auth.module.css";
import styles from "./log.module.css";

const initialState: LogTreatmentState = { error: null, success: false, deductions: [], variance: null };

type Staff = { id: string; name: string };
type Supply = { id: string; quantity: number; is_dosed: boolean; products: { id: string; name: string; unit: string } | null };
type Procedure = { id: string; name: string; procedure_supplies: Supply[] };

export default function LogTreatmentForm({
  staff,
  procedures,
}: {
  staff: Staff[];
  procedures: Procedure[];
}) {
  const [state, formAction, pending] = useActionState(logTreatment, initialState);
  const [procedureId, setProcedureId] = useState("");
  const [clinicianId, setClinicianId] = useState("");
  const [unitsDrawn, setUnitsDrawn] = useState("");
  const [unitsBilled, setUnitsBilled] = useState("");

  const selectedProcedure = procedures.find((p) => p.id === procedureId) || null;
  const dosedLine = selectedProcedure?.procedure_supplies.find((s) => s.is_dosed) || null;

  useEffect(() => {
    if (dosedLine) {
      setUnitsDrawn(String(dosedLine.quantity));
      setUnitsBilled(String(dosedLine.quantity));
    } else {
      setUnitsDrawn("");
      setUnitsBilled("");
    }
  }, [procedureId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state.success) {
      setProcedureId("");
      setClinicianId("");
      setUnitsDrawn("");
      setUnitsBilled("");
    }
  }, [state]);

  const clinicianName = staff.find((s) => s.id === clinicianId)?.name;

  let hint = "Select a clinician and treatment above";
  if (selectedProcedure && clinicianName) {
    hint = `${selectedProcedure.name} · ${clinicianName}`;
  } else if (selectedProcedure) {
    hint = `${selectedProcedure.name} selected — choose a clinician`;
  } else if (clinicianName) {
    hint = `${clinicianName} selected — choose a treatment`;
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="procedureId" value={procedureId} />
      <input type="hidden" name="clinicianId" value={clinicianId} />

      <label className={authStyles.label} style={{ maxWidth: 280, marginBottom: 24 }}>
        Clinician
        <select
          className={authStyles.field}
          value={clinicianId}
          onChange={(e) => setClinicianId(e.target.value)}
        >
          <option value="">Select clinician</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <div className={authStyles.label} style={{ marginBottom: 12 }}>
        Which treatment?
      </div>
      <div className={styles.rgrid}>
        {procedures.map((proc) => (
          <button
            key={proc.id}
            type="button"
            onClick={() => setProcedureId(proc.id)}
            className={`${styles.rcard} ${procedureId === proc.id ? styles.selected : ""}`}
          >
            <h3>{proc.name}</h3>
            <div className={styles.count}>{proc.procedure_supplies.length} consumables</div>
          </button>
        ))}
      </div>

      {dosedLine && (
        <div className={styles.doseBox}>
          <h4>Dosing — {dosedLine.products?.name}</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            <label className={authStyles.label}>
              Units drawn from vial
              <input
                className={authStyles.field}
                type="number"
                name="unitsDrawn"
                min={0}
                value={unitsDrawn}
                onChange={(e) => setUnitsDrawn(e.target.value)}
              />
            </label>
            <label className={authStyles.label}>
              Units billed to patient
              <input
                className={authStyles.field}
                type="number"
                name="unitsBilled"
                min={0}
                value={unitsBilled}
                onChange={(e) => setUnitsBilled(e.target.value)}
              />
            </label>
          </div>
        </div>
      )}

      <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 16 }}>
        <button
          className={authStyles.btn}
          type="submit"
          disabled={!procedureId || !clinicianId || pending}
        >
          {pending ? "Deducting…" : "Confirm and deduct stock"}
        </button>
        <span className={styles.hint}>{hint}</span>
      </div>

      {state.error && (
        <div className={authStyles.error} role="alert" style={{ marginTop: 16 }}>
          {state.error}
        </div>
      )}

      {state.success && (
        <div className={`${styles.panel} ${styles.deductBox}`}>
          <h3>Deducted automatically</h3>
          {state.deductions.map((d, i) => (
            <div key={i} className={styles.deductRow}>
              <div>
                <div>{d.productName}</div>
                {d.batchLabel && <div className={styles.deductMeta}>{d.batchLabel}</div>}
              </div>
              <div className={styles.deductQty}>
                − {d.quantity} {d.unit}
              </div>
            </div>
          ))}

          {state.variance && (
            <span className={`${styles.pill} ${state.variance.status === "matched" ? styles.pillGreen : styles.pillAmber}`}>
              {state.variance.status === "matched"
                ? `${state.variance.drawn} units drawn, ${state.variance.billed} billed — matched, no variance`
                : state.variance.status === "drawn_over"
                  ? `${state.variance.drawn - state.variance.billed} unit(s) drawn but not billed`
                  : `${state.variance.billed - state.variance.drawn} more unit(s) billed than drawn — check entry`}
            </span>
          )}

          <div className={styles.done}>
            ✓ Stock updated and written to the audit trail. Oldest batches used first — no patient
            data recorded.
          </div>
        </div>
      )}
    </form>
  );
}
