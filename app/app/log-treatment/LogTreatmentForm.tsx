"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { logVisit, type LogVisitState } from "./actions";
import FaceDiagram from "./FaceDiagram";
import { FACE_AREAS } from "@/lib/faceAreas";
import authStyles from "../../auth.module.css";
import styles from "./log.module.css";

const initialState: LogVisitState = { error: null, success: false, deductions: [], variances: [], totalCost: null };

type Staff = { id: string; name: string };
type Supply = { quantity: number; is_dosed: boolean; products: { id: string; cost_per_unit: number | null } | null };
export type FormProcedure = { id: string; name: string; procedure_supplies: Supply[] };
export type FormProduct = {
  id: string;
  name: string;
  brand: string | null;
  unit: string;
  category: string;
  cost_per_unit: number | null;
};

type Line = { key: number; procedureId: string; area: string; productId: string; quantity: string };
type SampleLine = { productId: string; quantity: string };

const emptySampleLine = (): SampleLine => ({ productId: "", quantity: "" });
const money = (n: number) => `$${n.toFixed(2)}`;

function localToday() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dosedProductId(proc: FormProcedure | undefined) {
  return proc?.procedure_supplies.find((s) => s.is_dosed)?.products?.id || "";
}

export default function LogTreatmentForm({
  staff,
  procedures,
  products,
}: {
  staff: Staff[];
  procedures: FormProcedure[];
  products: FormProduct[];
}) {
  const [state, formAction, pending] = useActionState(logVisit, initialState);
  const [clinicianId, setClinicianId] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [today, setToday] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [billedEdits, setBilledEdits] = useState<Record<string, string>>({});
  const [samplesGiven, setSamplesGiven] = useState(false);
  const [sampleLines, setSampleLines] = useState<SampleLine[]>([emptySampleLine()]);
  const nextKey = useRef(1);

  // The clinic's local date, set after mount so server and client render agree.
  useEffect(() => {
    const t = localToday();
    setToday(t);
    setVisitDate((d) => d || t);
  }, []);

  useEffect(() => {
    if (state.success) {
      setClinicianId("");
      setLines([]);
      setBilledEdits({});
      setSamplesGiven(false);
      setSampleLines([emptySampleLine()]);
    }
  }, [state]);

  const procById = new Map(procedures.map((p) => [p.id, p]));
  const productById = new Map(products.map((p) => [p.id, p]));
  const lineProducts = products.filter((p) => p.category !== "Sample");
  const sampleProducts = products.filter((p) => p.category === "Sample");
  const categories = [...new Set(lineProducts.map((p) => p.category))];

  // ---------- Lines ----------

  const addLine = (area = "") => {
    // A new line copies the previous line's procedure and product: the usual
    // case is the same treatment carried on into another area.
    setLines((prev) => {
      const last = prev[prev.length - 1];
      return [
        ...prev,
        {
          key: nextKey.current++,
          procedureId: last?.procedureId || "",
          productId: last?.productId || "",
          area,
          quantity: "",
        },
      ];
    });
  };

  const updateLine = (key: number, patch: Partial<Line>) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line;
        const next = { ...line, ...patch };
        if (patch.procedureId !== undefined && patch.procedureId !== line.procedureId) {
          const oldDosed = dosedProductId(procById.get(line.procedureId));
          if (!line.productId || line.productId === oldDosed) {
            next.productId = dosedProductId(procById.get(patch.procedureId));
          }
        }
        if (!next.productId) next.quantity = "";
        return next;
      })
    );
  };

  const removeLine = (key: number) => setLines((prev) => prev.filter((l) => l.key !== key));

  const filledLines = lines.filter((l) => l.procedureId || l.productId || l.quantity.trim());
  const activeAreaSlugs = [...new Set(lines.map((l) => l.area).filter(Boolean))];
  const qty = (l: Line) => {
    const n = Number(l.quantity);
    return l.productId && l.quantity.trim() && Number.isFinite(n) && n > 0 ? n : 0;
  };

  // ---------- Per-procedure summary (mirrors log_visit's rules) ----------

  const procedureIdsInVisit = [...new Set(filledLines.map((l) => l.procedureId).filter(Boolean))];
  const summaries = procedureIdsInVisit
    .map((id) => {
      const proc = procById.get(id);
      if (!proc) return null;
      const procLines = filledLines.filter((l) => l.procedureId === id);
      const productLines = procLines.filter((l) => l.productId);
      const hasProductLines = productLines.length > 0;
      const dosedSupply = proc.procedure_supplies.find((s) => s.is_dosed);
      const dosedId = dosedSupply?.products?.id || "";

      let drawn: number | null = null;
      if (dosedId) {
        if (hasProductLines) {
          const matching = productLines.filter((l) => l.productId === dosedId);
          drawn = matching.length ? matching.reduce((s, l) => s + qty(l), 0) : null;
        } else {
          drawn = dosedSupply!.quantity;
        }
      }

      const recipeCost = proc.procedure_supplies
        .filter((s) => !(s.is_dosed && hasProductLines))
        .reduce((s, sup) => s + sup.quantity * (sup.products?.cost_per_unit ?? 0), 0);

      const areas = new Set(procLines.map((l) => l.area).filter(Boolean)).size;
      return { proc, drawn, recipeCost, areas, lineCount: procLines.length, dosedUnit: productById.get(dosedId)?.unit };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const billedFor = (procId: string, drawn: number | null) =>
    billedEdits[procId] ?? (drawn != null ? String(drawn) : "");

  const visitTotal =
    summaries.reduce((s, x) => s + x.recipeCost, 0) +
    filledLines.reduce((s, l) => s + qty(l) * (productById.get(l.productId)?.cost_per_unit ?? 0), 0);

  // ---------- Serialised payloads ----------

  const linesJson = JSON.stringify(
    lines.map((l) => ({ procedureId: l.procedureId, productId: l.productId, area: l.area, quantity: l.quantity }))
  );
  const billedJson = JSON.stringify(
    summaries
      .filter((s) => s.drawn != null)
      .map((s) => ({ procedureId: s.proc.id, unitsBilled: billedFor(s.proc.id, s.drawn) }))
  );
  const samplesJson = JSON.stringify(
    sampleLines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity) }))
  );

  const treatmentDeductions = state.deductions.filter((d) => !d.isSample);
  const sampleDeductions = state.deductions.filter((d) => d.isSample);
  const canSubmit = clinicianId && visitDate && filledLines.length > 0 && !pending;

  return (
    <form action={formAction}>
      <input type="hidden" name="clinicianId" value={clinicianId} />
      <input type="hidden" name="linesJson" value={linesJson} />
      <input type="hidden" name="billedJson" value={billedJson} />
      <input type="hidden" name="samplesJson" value={samplesJson} />

      <div className={styles.visitTop}>
        <label className={authStyles.label}>
          Clinician
          <select className={authStyles.field} value={clinicianId} onChange={(e) => setClinicianId(e.target.value)}>
            <option value="">Select clinician</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className={authStyles.label}>
          Visit date
          <input
            className={authStyles.field}
            type="date"
            name="visitDate"
            value={visitDate}
            max={today || undefined}
            onChange={(e) => setVisitDate(e.target.value)}
          />
        </label>
      </div>

      <div className={styles.visitLayout}>
        <FaceDiagram activeSlugs={activeAreaSlugs} onSelect={(slug) => addLine(slug)} />

        <div>
          <div className={styles.sectionLabel}>Lines</div>
          <div className={styles.lines}>
            {lines.length === 0 ? (
              <div className={styles.emptyLines}>
                Tap an area on the face to add a line for it, or add a line without an area.
              </div>
            ) : (
              <>
                <div className={styles.lineHeader} aria-hidden="true">
                  <span>Procedure</span>
                  <span>Area</span>
                  <span>Product</span>
                  <span>Amount</span>
                  <span />
                </div>
                {lines.map((line, i) => {
                  const unit = productById.get(line.productId)?.unit;
                  return (
                    <div key={line.key} className={styles.lineRow}>
                      <div>
                        <span className={styles.fieldLabel}>Procedure</span>
                        <select
                          className={authStyles.field}
                          aria-label={`Line ${i + 1} procedure`}
                          value={line.procedureId}
                          onChange={(e) => updateLine(line.key, { procedureId: e.target.value })}
                        >
                          <option value="">No procedure</option>
                          {procedures.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <span className={styles.fieldLabel}>Area</span>
                        <select
                          className={authStyles.field}
                          aria-label={`Line ${i + 1} area`}
                          value={line.area}
                          onChange={(e) => updateLine(line.key, { area: e.target.value })}
                        >
                          <option value="">No area</option>
                          {FACE_AREAS.map((a) => (
                            <option key={a.slug} value={a.slug}>
                              {a.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <span className={styles.fieldLabel}>Product</span>
                        <select
                          className={authStyles.field}
                          aria-label={`Line ${i + 1} product`}
                          value={line.productId}
                          onChange={(e) => updateLine(line.key, { productId: e.target.value })}
                        >
                          <option value="">{line.procedureId ? "Recipe only" : "Select a product"}</option>
                          {categories.map((cat) => (
                            <optgroup key={cat} label={cat}>
                              {lineProducts
                                .filter((p) => p.category === cat)
                                .map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.brand ? `${p.name} (${p.brand})` : p.name}
                                  </option>
                                ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      <div>
                        <span className={styles.fieldLabel}>Amount</span>
                        <div className={styles.amountWrap}>
                          <input
                            className={authStyles.field}
                            aria-label={`Line ${i + 1} amount`}
                            type="number"
                            min={0}
                            step="0.01"
                            inputMode="decimal"
                            value={line.quantity}
                            disabled={!line.productId}
                            onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                            style={{ paddingRight: unit ? 44 : undefined, width: "100%" }}
                          />
                          {unit && <span className={styles.unitHint}>{unit}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={styles.removeLineBtn}
                        onClick={() => removeLine(line.key)}
                        aria-label={`Remove line ${i + 1}`}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </>
            )}
            <button type="button" className={styles.addLineBtn} onClick={() => addLine()}>
              + Add line
            </button>
          </div>

          {summaries.length > 0 && (
            <div className={styles.doseBox}>
              <h4>Procedures in this visit</h4>
              {summaries.map((s) => (
                <div key={s.proc.id} className={styles.summaryRow}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{s.proc.name}</div>
                    <div className={styles.summaryMeta}>
                      {s.drawn != null ? `${s.drawn} ${s.dosedUnit || "units"} drawn` : "Recipe consumables"}
                      {s.areas > 0 && ` across ${s.areas} area${s.areas === 1 ? "" : "s"}`}
                    </div>
                  </div>
                  {s.drawn != null && (
                    <label className={styles.billedInput}>
                      Billed ({s.dosedUnit || "units"})
                      <input
                        className={authStyles.field}
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        value={billedFor(s.proc.id, s.drawn)}
                        onChange={(e) => setBilledEdits((prev) => ({ ...prev, [s.proc.id]: e.target.value }))}
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
          )}

          {sampleProducts.length > 0 && (
            <div className={styles.doseBox}>
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
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  {sampleLines.map((line, index) => (
                    <div key={index} className={styles.sampleLineRow}>
                      <select
                        className={authStyles.field}
                        aria-label={`Sample ${index + 1} product`}
                        value={line.productId}
                        onChange={(e) =>
                          setSampleLines((prev) =>
                            prev.map((l, i) => (i === index ? { ...l, productId: e.target.value } : l))
                          )
                        }
                      >
                        <option value="" disabled>
                          Select a sample
                        </option>
                        {sampleProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <input
                        className={authStyles.field}
                        aria-label={`Sample ${index + 1} quantity`}
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.quantity}
                        onChange={(e) =>
                          setSampleLines((prev) =>
                            prev.map((l, i) => (i === index ? { ...l, quantity: e.target.value } : l))
                          )
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setSampleLines((prev) => prev.filter((_, i) => i !== index))}
                        className={styles.removeLineBtn}
                        disabled={sampleLines.length === 1}
                        aria-label="Remove sample line"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSampleLines((prev) => [...prev, emptySampleLine()])}
                    className={styles.addLineBtn}
                  >
                    + Add sample line
                  </button>
                </div>
              )}
            </div>
          )}

          <div className={styles.totalBar}>
            <div>
              <div className={styles.hint}>Visit total cost</div>
              <div className={styles.totalAmount} data-testid="visit-total">
                {money(visitTotal)}
              </div>
            </div>
            <button className={authStyles.btn} type="submit" disabled={!canSubmit}>
              {pending ? "Deducting…" : "Confirm visit and deduct stock"}
            </button>
          </div>
        </div>
      </div>

      {state.error && (
        <div className={authStyles.error} role="alert" style={{ marginTop: 16 }}>
          {state.error}
        </div>
      )}

      {state.success && (
        <div className={`${styles.panel} ${styles.deductBox}`}>
          <h3>Visit logged — deducted automatically</h3>

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

          {state.totalCost != null && (
            <div style={{ marginTop: 12, fontWeight: 700 }} data-testid="visit-total-confirmed">
              Visit total cost: {money(state.totalCost)}
            </div>
          )}

          {state.variances.map((v) => (
            <span
              key={v.procedureName}
              className={`${styles.pill} ${v.status === "matched" ? styles.pillGreen : styles.pillAmber}`}
            >
              {v.procedureName}:{" "}
              {v.status === "matched"
                ? `${v.drawn} drawn, ${v.billed} billed — matched`
                : v.status === "drawn_over"
                  ? `${v.drawn - v.billed} drawn but not billed`
                  : `${v.billed - v.drawn} more billed than drawn — check entry`}
            </span>
          ))}

          <div className={styles.done}>
            ✓ Stock updated and written to the audit trail. Oldest batches used first — no patient data
            recorded.{" "}
            <Link href={`/app/treatment-log?month=${visitDate.slice(0, 7)}`} style={{ color: "inherit", fontWeight: 600 }}>
              View in treatment log →
            </Link>
          </div>
        </div>
      )}
    </form>
  );
}
