import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { faceAreaLabel } from "@/lib/faceAreas";
import FontLinks from "../../FontLinks";
import AppHeader from "../AppHeader";
import authStyles from "../../auth.module.css";
import styles from "./treatment-log.module.css";
import { paper, ink, stone, sageDeep, fraunces } from "../../theme";

export const metadata: Metadata = {
  title: "Treatment log — Opendesk",
  robots: { index: false, follow: false },
};

type Product = { name: string; unit: string; cost_per_unit: number | null };
type Line = {
  id: string;
  area: string | null;
  quantity: number | null;
  procedures: { name: string } | null;
  products: { name: string; unit: string } | null;
};
type Item = {
  quantity_deducted: number;
  is_sample: boolean;
  products: Product | null;
  stock_batches: { batch_number: string | null; expiry_date: string | null } | null;
};
type Visit = {
  id: string;
  visit_date: string;
  created_at: string;
  staff: { name: string } | null;
  visit_lines: Line[];
  treatment_log_items: Item[];
};

const money = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Months are the clinic's calendar months, so "today" is taken in Australian time.
function currentMonth() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date()).slice(0, 7);
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string, style: "long" | "short" = "long") {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-AU", { month: style, year: "numeric", timeZone: "UTC" });
}

function dayLabel(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

const visitCost = (v: Visit) =>
  v.treatment_log_items
    .filter((i) => !i.is_sample)
    .reduce((s, i) => s + i.quantity_deducted * (i.products?.cost_per_unit ?? 0), 0);

export default async function TreatmentLogPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month: monthParam } = await searchParams;
  const thisMonth = currentMonth();
  const month = monthParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam) && monthParam <= thisMonth ? monthParam : thisMonth;
  const nextMonth = shiftMonth(month, 1);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: visitRows, error }] = await Promise.all([
    supabase.from("profiles").select("clinic_id, clinics ( name )").eq("id", user.id).single(),
    supabase
      .from("visits")
      .select(
        `id, visit_date, created_at,
         staff ( name ),
         visit_lines ( id, area, quantity, procedures ( name ), products ( name, unit ) ),
         treatment_log_items ( quantity_deducted, is_sample, products ( name, unit, cost_per_unit ), stock_batches ( batch_number, expiry_date ) )`
      )
      .gte("visit_date", `${month}-01`)
      .lt("visit_date", `${nextMonth}-01`)
      .order("visit_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const clinic = profile?.clinics as unknown as { name: string } | null;
  if (!clinic) {
    redirect("/app");
  }
  if (error) {
    console.error("treatment log query failed", error);
  }

  const visits = (visitRows as unknown as Visit[]) || [];
  const procedureCount = visits.reduce(
    (s, v) => s + new Set(v.visit_lines.map((l) => l.procedures?.name).filter(Boolean)).size,
    0
  );
  const monthCost = visits.reduce((s, v) => s + visitCost(v), 0);

  return (
    <>
      <FontLinks />
      <div style={{ minHeight: "100vh", background: paper, color: ink, fontFamily: "'Public Sans', system-ui, sans-serif" }}>
        <AppHeader clinicName={clinic.name} active="treatmentLog" />

        <main className={styles.main}>
          <h1 style={{ ...fraunces, fontSize: 26, fontWeight: 400, letterSpacing: "-0.01em", marginBottom: 6 }}>
            Treatment log
          </h1>
          <p style={{ fontSize: 14, color: stone, marginBottom: 24 }}>
            Every visit logged, with what was used and what it cost. No patient details are stored.
          </p>

          <nav className={styles.monthBar} aria-label="Month">
            <Link className={styles.monthLink} href={`/app/treatment-log?month=${shiftMonth(month, -1)}`}>
              ← {monthLabel(shiftMonth(month, -1), "short")}
            </Link>
            <div className={styles.monthName}>{monthLabel(month)}</div>
            <Link
              className={`${styles.monthLink} ${month >= thisMonth ? styles.monthLinkDisabled : ""}`}
              href={`/app/treatment-log?month=${nextMonth}`}
              aria-hidden={month >= thisMonth}
              tabIndex={month >= thisMonth ? -1 : undefined}
            >
              {monthLabel(nextMonth, "short")} →
            </Link>
          </nav>

          <div className={styles.stats}>
            <div className={`${styles.panel} ${styles.stat}`}>
              <div className={styles.statValue}>{visits.length}</div>
              <div className={styles.statLabel}>Visits</div>
            </div>
            <div className={`${styles.panel} ${styles.stat}`}>
              <div className={styles.statValue}>{procedureCount}</div>
              <div className={styles.statLabel}>Procedures performed</div>
            </div>
            <div className={`${styles.panel} ${styles.stat}`}>
              <div className={styles.statValue}>{money(monthCost)}</div>
              <div className={styles.statLabel}>Consumable cost</div>
            </div>
          </div>

          {visits.length === 0 ? (
            <div className={`${styles.panel} ${styles.empty}`}>
              <p style={{ marginBottom: 16 }}>No visits logged in {monthLabel(month)}.</p>
              <Link
                href="/app/log-treatment"
                className={authStyles.btn}
                style={{ textDecoration: "none", background: sageDeep, borderColor: sageDeep }}
              >
                Log a visit
              </Link>
            </div>
          ) : (
            <div className={styles.visits}>
              {visits.map((v) => {
                const used = v.treatment_log_items.filter((i) => !i.is_sample);
                const samples = v.treatment_log_items.filter((i) => i.is_sample);
                return (
                  <article key={v.id} id={`visit-${v.id}`} className={`${styles.panel} ${styles.visit}`} data-testid="visit">
                    <div className={styles.visitHead}>
                      <div>
                        <span className={styles.visitDate}>{dayLabel(v.visit_date)}</span>
                        <span className={styles.visitClinician}>{v.staff?.name || "Unknown clinician"}</span>
                      </div>
                      <div className={styles.visitCost} data-testid="visit-cost">
                        {money(visitCost(v))}
                      </div>
                    </div>

                    <ul className={styles.lines}>
                      {v.visit_lines.map((l) => (
                        <li key={l.id} className={styles.line}>
                          {l.procedures && <span className={styles.lineProc}>{l.procedures.name}</span>}
                          {l.area && <span className={styles.lineArea}>{faceAreaLabel(l.area)}</span>}
                          {l.products ? (
                            <span className={styles.lineProduct}>
                              {l.products.name} {l.quantity} {l.products.unit}
                            </span>
                          ) : (
                            <span className={styles.lineMuted}>recipe only</span>
                          )}
                        </li>
                      ))}
                    </ul>

                    {samples.length > 0 && (
                      <div className={styles.samples}>
                        Samples given:{" "}
                        {samples.map((s) => `${s.products?.name} ${s.quantity_deducted} ${s.products?.unit}`).join(", ")}
                      </div>
                    )}

                    {used.length > 0 && (
                      <details className={styles.details}>
                        <summary>Stock deducted ({used.length})</summary>
                        {used.map((i, idx) => (
                          <div key={idx} className={styles.deductRow}>
                            <div>
                              {i.products?.name}
                              <div className={styles.deductMeta}>
                                {i.stock_batches?.batch_number
                                  ? `batch ${i.stock_batches.batch_number}`
                                  : i.stock_batches?.expiry_date
                                    ? `expires ${new Date(i.stock_batches.expiry_date).toLocaleDateString("en-AU")}`
                                    : "no batch number"}
                              </div>
                            </div>
                            <div className={styles.deductQty}>
                              − {i.quantity_deducted} {i.products?.unit}
                            </div>
                            <div className={styles.deductCost}>
                              {money(i.quantity_deducted * (i.products?.cost_per_unit ?? 0))}
                            </div>
                          </div>
                        ))}
                      </details>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
