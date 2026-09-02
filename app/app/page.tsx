import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FontLinks from "../FontLinks";
import ClinicSetupForm from "./ClinicSetupForm";
import LogoutButton from "./LogoutButton";
import AppHeader from "./AppHeader";
import authStyles from "../auth.module.css";
import styles from "./dashboard.module.css";
import { paper, ink, stone, sage, fraunces } from "../theme";

export const metadata: Metadata = {
  title: "Dashboard — Opendesk",
  robots: { index: false, follow: false },
};

type Product = {
  id: string;
  name: string;
  unit: string;
  default_supplier: string | null;
  cost_per_unit: number | null;
  reorder_level: number;
};

type Batch = {
  id: string;
  product_id: string;
  batch_number: string | null;
  quantity: number;
  unit_cost: number | null;
  expiry_date: string | null;
  created_at: string;
};

type LogItem = {
  id: string;
  product_id: string;
  quantity_deducted: number;
  created_at: string;
};

type Log = {
  id: string;
  clinician_id: string;
  units_drawn: number | null;
  units_billed: number | null;
  created_at: string;
  staff: { name: string } | null;
};

const DAY_MS = 86_400_000;

function startOfQuarter(d: Date) {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
}

function addMonths(d: Date, months: number) {
  return new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / DAY_MS);
}

export default async function AppPage() {
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
        products ( id, name, unit, default_supplier, cost_per_unit, reorder_level ),
        stock_batches ( id, product_id, batch_number, quantity, unit_cost, expiry_date, created_at ),
        treatment_log_items ( id, product_id, quantity_deducted, created_at ),
        treatment_logs ( id, clinician_id, units_drawn, units_billed, created_at, staff ( name ) )
      )`
    )
    .eq("id", user.id)
    .single();

  const clinic = profile?.clinics as unknown as
    | {
        id: string;
        name: string;
        products: Product[];
        stock_batches: Batch[];
        treatment_log_items: LogItem[];
        treatment_logs: Log[];
      }
    | null;

  if (!clinic) {
    return (
      <>
        <FontLinks />
        <div
          className={authStyles.root}
          style={{
            minHeight: "100vh",
            background: paper,
            color: ink,
            fontFamily: "'Public Sans', system-ui, sans-serif",
          }}
        >
          <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <header style={{ display: "flex", justifyContent: "flex-end", padding: "20px 24px" }}>
              <LogoutButton />
            </header>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px 24px 96px",
              }}
            >
              <div style={{ width: "100%", maxWidth: 380 }}>
                <div style={{ textAlign: "center", marginBottom: 40 }}>
                  <span style={{ fontSize: 17, color: ink, letterSpacing: "0.01em" }}>
                    open<span style={{ color: sage }}>•</span>desk
                  </span>
                </div>
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #E4E1D8",
                    borderRadius: 5,
                    padding: "36px 32px",
                    boxShadow: "0 1px 2px rgba(31,36,33,.04), 0 18px 40px -24px rgba(31,36,33,.18)",
                  }}
                >
                  <h1
                    style={{
                      ...fraunces,
                      fontSize: 24,
                      fontWeight: 400,
                      letterSpacing: "-0.01em",
                      marginBottom: 8,
                    }}
                  >
                    Welcome to Opendesk
                  </h1>
                  <p style={{ fontSize: 14, lineHeight: 1.55, color: stone, marginBottom: 28 }}>
                    This is your first time logging in. What&apos;s your clinic called?
                  </p>
                  <ClinicSetupForm />
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const products = clinic.products || [];
  const batches = clinic.stock_batches || [];
  const logItems = clinic.treatment_log_items || [];
  const logs = clinic.treatment_logs || [];

  const productsById = new Map(products.map((p) => [p.id, p]));
  const effectiveCost = (b: Batch) => b.unit_cost ?? productsById.get(b.product_id)?.cost_per_unit ?? 0;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // --- KPI 1: expiring within 30 days ---
  const expiringBatches = batches
    .filter((b) => b.expiry_date && b.quantity > 0)
    .map((b) => ({ batch: b, days: daysBetween(new Date(b.expiry_date as string), today) }))
    .filter((x) => x.days >= 0 && x.days <= 30)
    .sort((a, b) => a.days - b.days);
  const expiringValue = expiringBatches.reduce((sum, x) => sum + x.batch.quantity * effectiveCost(x.batch), 0);

  // --- KPI 2: below reorder point ---
  const onHandByProduct = new Map<string, number>();
  for (const b of batches) {
    onHandByProduct.set(b.product_id, (onHandByProduct.get(b.product_id) || 0) + b.quantity);
  }
  const belowReorder = products.filter((p) => (onHandByProduct.get(p.id) || 0) < p.reorder_level);

  // --- KPI 3: current stock on hand ---
  const stockValue = batches.reduce((sum, b) => sum + b.quantity * effectiveCost(b), 0);

  // --- KPI 4: wastage rate this quarter vs last quarter ---
  const wastageRate = (qStart: Date, qEnd: Date) => {
    const wasted = batches
      .filter((b) => b.expiry_date)
      .filter((b) => {
        const exp = new Date(b.expiry_date as string);
        return exp >= qStart && exp < qEnd && exp < today && b.quantity > 0;
      })
      .reduce((sum, b) => sum + b.quantity * effectiveCost(b), 0);
    const consumed = logItems
      .filter((li) => {
        const d = new Date(li.created_at);
        return d >= qStart && d < qEnd;
      })
      .reduce((sum, li) => sum + li.quantity_deducted * (productsById.get(li.product_id)?.cost_per_unit ?? 0), 0);
    return wasted + consumed > 0 ? (wasted / (wasted + consumed)) * 100 : 0;
  };
  const thisQStart = startOfQuarter(now);
  const thisQEnd = addMonths(thisQStart, 3);
  const lastQStart = addMonths(thisQStart, -3);
  const thisQWastage = wastageRate(thisQStart, thisQEnd);
  const lastQWastage = wastageRate(lastQStart, thisQStart);

  // --- Dead stock: on-hand products with no movement in 90+ days ---
  const deadStock = products
    .map((p) => {
      const productBatches = batches.filter((b) => b.product_id === p.id);
      const onHand = productBatches.reduce((sum, b) => sum + b.quantity, 0);
      if (onHand <= 0) return null;
      const productLogItems = logItems.filter((li) => li.product_id === p.id);
      const lastUsed = productLogItems.length
        ? new Date(Math.max(...productLogItems.map((li) => new Date(li.created_at).getTime())))
        : null;
      const earliestBatch = productBatches.length
        ? new Date(Math.min(...productBatches.map((b) => new Date(b.created_at).getTime())))
        : today;
      const reference = lastUsed ?? earliestBatch;
      const daysSince = daysBetween(today, reference);
      if (daysSince <= 90) return null;
      const tiedUpCost = productBatches.reduce((sum, b) => sum + b.quantity * effectiveCost(b), 0);
      return {
        product: p,
        lastUsedLabel: lastUsed ? `${daysSince} days ago` : "Never drawn",
        onHand,
        tiedUpCost,
        orderedLabel: earliestBatch.toLocaleDateString("en-AU", { month: "short", year: "numeric" }),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.tiedUpCost - a.tiedUpCost);
  const deadStockTotal = deadStock.reduce((sum, d) => sum + d.tiedUpCost, 0);

  // --- Supplier price changes ---
  const priceChanges = products
    .map((p) => {
      const costed = batches
        .filter((b) => b.product_id === p.id && b.unit_cost != null)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      if (costed.length < 2) return null;
      const now2 = costed[0].unit_cost as number;
      const was = costed[1].unit_cost as number;
      if (!was) return null;
      const changePct = ((now2 - was) / was) * 100;
      return { product: p, was, now: now2, changePct };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));

  // --- Units drawn vs billed by clinician, this month ---
  const monthStart = startOfMonth(now);
  const clinicianTotals = new Map<string, { name: string; drawn: number; billed: number }>();
  for (const log of logs) {
    if (log.units_drawn == null || log.units_billed == null) continue;
    if (new Date(log.created_at) < monthStart) continue;
    const key = log.clinician_id;
    const existing = clinicianTotals.get(key) || { name: log.staff?.name || "Unknown", drawn: 0, billed: 0 };
    existing.drawn += log.units_drawn;
    existing.billed += log.units_billed;
    clinicianTotals.set(key, existing);
  }
  const clinicianVariance = [...clinicianTotals.values()]
    .map((c) => ({
      ...c,
      variance: c.drawn - c.billed,
      pct: c.drawn > 0 ? ((c.drawn - c.billed) / c.drawn) * 100 : 0,
    }))
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));

  const fmt = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

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
        <AppHeader clinicName={clinic.name} active="dashboard" />

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
            Good morning
          </h1>
          <p style={{ fontSize: 14, color: stone, marginBottom: 28 }}>
            Here&apos;s what needs your attention in the stockroom today.
          </p>

          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{fmt(expiringValue)}</div>
              <div className={styles.kpiLabel}>Stock expiring within 30 days</div>
              <div className={`${styles.kpiTrend} ${styles.trendDanger}`}>
                {expiringBatches.length} item{expiringBatches.length === 1 ? "" : "s"} — use first
              </div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{belowReorder.length}</div>
              <div className={styles.kpiLabel}>Items below reorder point</div>
              <div className={`${styles.kpiTrend} ${styles.trendWarn}`}>
                <Link href="/app/stock" style={{ color: "inherit" }}>
                  See Stock →
                </Link>
              </div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{fmt(stockValue)}</div>
              <div className={styles.kpiLabel}>Current stock on hand</div>
              <div className={`${styles.kpiTrend} ${styles.trendNeutral}`}>Across {batches.length} line items</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{thisQWastage.toFixed(1)}%</div>
              <div className={styles.kpiLabel}>Wastage rate this quarter</div>
              <div className={`${styles.kpiTrend} ${thisQWastage <= lastQWastage ? styles.trendGood : styles.trendDanger}`}>
                {thisQWastage <= lastQWastage ? "▼" : "▲"} from {lastQWastage.toFixed(1)}% last quarter
              </div>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Expiry risk — use these first</h2>
              <span className={styles.panelNote}>Sorted by days remaining</span>
            </div>
            {expiringBatches.length === 0 ? (
              <div className={styles.empty}>Nothing expiring in the next 30 days.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Batch</th>
                    <th>Expires</th>
                    <th>On hand</th>
                    <th>Value at risk</th>
                  </tr>
                </thead>
                <tbody>
                  {expiringBatches.map(({ batch, days }) => {
                    const product = productsById.get(batch.product_id);
                    return (
                      <tr key={batch.id}>
                        <td data-label="Product">
                          <div className={styles.prod}>{product?.name}</div>
                          {product?.default_supplier && (
                            <div className={styles.meta}>Supplier: {product.default_supplier}</div>
                          )}
                        </td>
                        <td data-label="Batch">{batch.batch_number || "—"}</td>
                        <td data-label="Expires">
                          <span className={`${styles.pill} ${days <= 15 ? styles.pillRed : styles.pillAmber}`}>
                            {days} days
                          </span>
                        </td>
                        <td data-label="On hand">
                          {batch.quantity} {product?.unit}
                        </td>
                        <td data-label="Value at risk">{fmt(batch.quantity * effectiveCost(batch))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Dead stock — no movement in 90 days</h2>
              <span className={styles.panelNote}>{fmt(deadStockTotal)} tied up</span>
            </div>
            {deadStock.length === 0 ? (
              <div className={styles.empty}>No dead stock — everything on hand has moved recently.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Last used</th>
                    <th>On hand</th>
                    <th>Tied-up cost</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {deadStock.map((d) => (
                    <tr key={d.product.id}>
                      <td data-label="Product">
                        <div className={styles.prod}>{d.product.name}</div>
                        <div className={styles.meta}>Ordered {d.orderedLabel}</div>
                      </td>
                      <td data-label="Last used">{d.lastUsedLabel}</td>
                      <td data-label="On hand">
                        {d.onHand} {d.product.unit}
                      </td>
                      <td data-label="Tied-up cost">{fmt(d.tiedUpCost)}</td>
                      <td data-label="">
                        <span className={`${styles.pill} ${styles.pillGrey}`}>Review</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Supplier price changes</h2>
              <span className={styles.panelNote}>Detected from your last orders</span>
            </div>
            {priceChanges.length === 0 ? (
              <div className={styles.empty}>Not enough batch history yet to detect price changes.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Supplier</th>
                    <th>Was</th>
                    <th>Now</th>
                    <th>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {priceChanges.map((pc) => (
                    <tr key={pc.product.id}>
                      <td data-label="Product" className={styles.prod}>
                        {pc.product.name}
                      </td>
                      <td data-label="Supplier">{pc.product.default_supplier || "—"}</td>
                      <td data-label="Was">${pc.was.toFixed(2)}</td>
                      <td data-label="Now">${pc.now.toFixed(2)}</td>
                      <td data-label="Change">
                        {pc.changePct === 0 ? (
                          <span className={`${styles.pill} ${styles.pillGrey}`}>no change</span>
                        ) : (
                          <span className={`${styles.pill} ${pc.changePct > 0 ? styles.pillRed : styles.pillGreen}`}>
                            {pc.changePct > 0 ? "+" : ""}
                            {pc.changePct.toFixed(1)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Units drawn vs billed — by clinician</h2>
              <span className={styles.panelNote}>This month</span>
            </div>
            {clinicianVariance.length === 0 ? (
              <div className={styles.empty}>No dosed treatments logged yet this month.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Clinician</th>
                    <th>Units drawn</th>
                    <th>Units billed</th>
                    <th>Variance</th>
                    <th>Variance %</th>
                  </tr>
                </thead>
                <tbody>
                  {clinicianVariance.map((c) => (
                    <tr key={c.name}>
                      <td data-label="Clinician" className={styles.prod}>
                        {c.name}
                      </td>
                      <td data-label="Units drawn">{c.drawn}</td>
                      <td data-label="Units billed">{c.billed}</td>
                      <td data-label="Variance">{c.variance}</td>
                      <td data-label="Variance %">
                        <span className={`${styles.pill} ${Math.abs(c.pct) >= 4 ? styles.pillAmber : styles.pillGrey}`}>
                          {c.pct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className={styles.panelFooter}>
              Gaps between drawn and billed are common with partial vials and top-ups. This is here
              to spot patterns worth a quick chat — not to score individual performance.
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
