import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FontLinks from "../../FontLinks";
import AppHeader from "../AppHeader";
import styles from "./margin.module.css";
import { paper, ink, stone, fraunces } from "../../theme";

export const metadata: Metadata = {
  title: "Treatment margin — Opendesk",
  robots: { index: false, follow: false },
};

type Product = { cost_per_unit: number | null };
type Supply = { quantity: number; products: Product | null };
type Procedure = { id: string; name: string; price: number | null; procedure_supplies: Supply[] };
type Log = { id: string; procedure_id: string; created_at: string };

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default async function MarginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `clinic_id, clinics (
        id, name,
        procedures (
          id, name, price,
          procedure_supplies ( quantity, products ( cost_per_unit ) )
        ),
        treatment_logs ( id, procedure_id, created_at )
      )`
    )
    .eq("id", user.id)
    .single();

  const clinic = profile?.clinics as unknown as
    | { id: string; name: string; procedures: Procedure[]; treatment_logs: Log[] }
    | null;

  if (!clinic) {
    redirect("/app");
  }

  const monthStart = startOfMonth(new Date());
  const logsThisMonth = (clinic.treatment_logs || []).filter((l) => new Date(l.created_at) >= monthStart);

  const rows = (clinic.procedures || [])
    .map((proc) => {
      const count = logsThisMonth.filter((l) => l.procedure_id === proc.id).length;
      if (count === 0) return null;
      const cost = proc.procedure_supplies.reduce(
        (sum, s) => sum + s.quantity * (s.products?.cost_per_unit ?? 0),
        0
      );
      const price = proc.price ?? 0;
      const margin = price - cost;
      const marginPct = price > 0 ? (margin / price) * 100 : null;
      const total = margin * count;
      return { name: proc.name, count, cost, price, margin, marginPct, total };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.total - a.total);

  const totalCount = rows.reduce((sum, r) => sum + r.count, 0);
  const totalContribution = rows.reduce((sum, r) => sum + r.total, 0);
  const maxTotal = Math.max(1, ...rows.map((r) => r.total));

  return (
    <>
      <FontLinks />
      <div
        style={{
          minHeight: "100vh",
          background: paper,
          color: ink,
          fontFamily: "'Public Sans', system-ui, sans-serif",
        }}
      >
        <AppHeader clinicName={clinic.name} active="margin" />

        <main style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 32px 80px" }}>
          <h1
            style={{
              ...fraunces,
              fontSize: 26,
              fontWeight: 400,
              letterSpacing: "-0.01em",
              marginBottom: 6,
            }}
          >
            Treatment margin
          </h1>
          <p style={{ fontSize: 14, color: stone, marginBottom: 28 }}>
            {totalCount} treatment{totalCount === 1 ? "" : "s"} logged this month · $
            {totalContribution.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}{" "}
            total margin contribution
          </p>

          <div className={styles.panel}>
            {rows.length === 0 ? (
              <div className={styles.empty}>No treatments logged yet this month.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Treatment</th>
                    <th>Performed</th>
                    <th>Consumable cost</th>
                    <th>Price charged</th>
                    <th>Margin</th>
                    <th>Margin %</th>
                    <th>Total contribution</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.name}
                      className={styles.ledgerRow}
                      style={{ ["--pct" as string]: `${Math.round((r.total / maxTotal) * 100)}%` }}
                    >
                      <td data-label="Treatment" className={styles.prod}>
                        {r.name}
                      </td>
                      <td data-label="Performed">{r.count}</td>
                      <td data-label="Consumable cost">${r.cost.toFixed(2)}</td>
                      <td data-label="Price charged">${r.price.toFixed(2)}</td>
                      <td data-label="Margin">${r.margin.toFixed(2)}</td>
                      <td data-label="Margin %">{r.marginPct != null ? `${r.marginPct.toFixed(1)}%` : "—"}</td>
                      <td data-label="Total contribution" className={styles.total}>
                        $
                        {r.total.toLocaleString("en-AU", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
