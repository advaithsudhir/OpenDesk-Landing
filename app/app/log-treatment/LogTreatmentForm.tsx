"use client";

import { useActionState, useEffect, useState } from "react";
import { logTreatment, type LogTreatmentState } from "./actions";
import authStyles from "../../auth.module.css";
import styles from "./log.module.css";

const initialState: LogTreatmentState = { error: null, success: false, deductions: [], variance: null };

type Staff = { id: string; name: string };
type Supply = {
  id: string;
  quantity: number;
  is_dosed: boolean;
  products: { id: string; name: string; unit: string; pack_name: string } | null;
};
type Procedure = { id: string; name: string; procedure_supplies: Supply[] };
type SampleProduct = { id: string; name: string; unit: string };
type SampleLine = { productId: string; quantity: string };

const emptySampleLine = (): SampleLine => ({ productId: "", quantity: "" });

export default function LogTreatmentForm({
  staff,
  procedures,
  sampleProducts,
}: {
  staff: Staff[];
  procedures: Procedure[];
  sampleProducts: SampleProduct[];
}) {
  const [state, formAction, pending] = useActionState(logTreatment, initialState);
  const [procedureId, setProcedureId] = useState("");
  const [clinicianId, setClinicianId] = useState("");
  const [unitsDrawn, setUnitsDrawn] = useState("");
  const [unitsBilled, setUnitsBilled] = useState("");
  const [samplesGiven, setSamplesGiven] = useState(false);
  const [sampleLines, setSampleLines] = useState<SampleLine[]>([emptySampleLine()]);

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
      setSamplesGiven(false);
      setSampleLines([emptySampleLine()]);
    }
  }, [state]);

  const updateSampleLine = (index: number, patch: Partial<SampleLine>) => {
    setSampleLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const removeSampleLine = (index: number) => {
    setSampleLines((prev) => prev.filter((_, i) => i !== index));
  };

  const samplesJson = JSON.stringify(
    sampleLines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity) }))
  );

  const treatmentDeductions = state.deductions.filter((d) => !d.isSample);
  const sampleDeductions = state.deductions.filter((d) => d.isSample);

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
      <input type="hidden" name="samplesJson" value={samplesJson} />

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
              Units drawn from{" "}
              {dosedLine.products?.pack_name && dosedLine.products.pack_name.toLowerCase() !== "unit"
                ? dosedLine.products.pack_name.toLowerCase()
                : "vial"}
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

      {sampleProducts.length > 0 && (
        <div className={styles.doseBox} style={{ marginTop: dosedLine ? 16 : 24 }}>
          <label
            className={authStyles.label}
            style={{ flexDirection: "row", alignItems: "center", gap: 8, textTransform: "none" }}
          >
            <input
              type="checkbox"
              name="samplesGiven"
              checked={samplesGiven}
              onChange={(e) => setSamplesGiven(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            Samples given
          </label>

          {samplesGiven && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {sampleLines.map((line, index) => (
                  <div key={index} className={styles.sampleLineRow}>
                    <label className={authStyles.label}>
                      {index === 0 ? "Sample product" : ""}
                      <select
                        className={authStyles.field}
                        value={line.productId}
                        onChange={(e) => updateSampleLine(index, { productId: e.target.value })}
                      >
                        <option value="" disabled>
                          Select a product
                        </option>
                        {sampleProducts.map((p) => (
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
                        onChange={(e) => updateSampleLine(index, { quantity: e.target.value })}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeSampleLine(index)}
                      className={styles.removeLineBtn}
                      disabled={sampleLines.length === 1}
                      aria-label="Remove sample line"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSampleLines((prev) => [...prev, emptySampleLine()])}
                className={styles.addLineBtn}
                style={{ marginTop: 12 }}
              >
                + Add sample line
              </button>
            </div>
          )}
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

          {treatmentDeductions.length > 0 && (
            <>
              {sampleDeductions.length > 0 && <div className={styles.subLabel}>Treatment supplies</div>}
              {treatmentDeductions.map((d, i) => (
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
            </>
          )}

          {sampleDeductions.length > 0 && (
            <>
              <div className={styles.subLabel}>Samples given</div>
              {sampleDeductions.map((d, i) => (
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
            </>
          )}

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
