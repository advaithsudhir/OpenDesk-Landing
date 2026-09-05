import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FontLinks from "../../FontLinks";
import AppHeader from "../AppHeader";
import OrderCycleForm from "./OrderCycleForm";
import styles from "./reorder.module.css";
import { paper, ink, stone, fraunces } from "../../theme";
import { computeReorderForecast } from "@/lib/insights";

export const metadata: Metadata = {
  title: "Reorder forecast — Opendesk",
  robots: { index: false, follow: false },
};

type Product = { id: string; name: string; unit: string; reorder_level: number };
type Batch = { product_id: string; quantity: number };
type LogItem = { product_id: string; quantity_deducted: number; created_at: string };

export default async function ReorderPage() {
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
        id, name, order_cycle_days,
        products ( id, name, unit, reorder_level ),
        stock_batches ( product_id, quantity ),
        treatment_log_items ( product_id, quantity_deducted, created_at )
      )`
    )
    .eq("id", user.id)
    .single();

  const clinic = profile?.clinics as unknown as
    | {
        id: string;
        name: string;
        order_cycle_days: number;
        products: Product[];
        stock_batches: Batch[];
        treatment_log_items: LogItem[];
      }
    | null;

  if (!clinic) {
    redirect("/app");
  }

  const products = clinic.products || [];
  const batches = clinic.stock_batches || [];
  const logItems = clinic.treatment_log_items || [];
  const orderCycleDays = clinic.order_cycle_days;

  const today = new Date();

  const { reorderList, notEnoughHistory } = computeReorderForecast(
    products,
    batches,
    logItems,
    orderCycleDays,
    today
  );

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
        <AppHeader clinicName={clinic.name} active="reorder" />

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
            Reorder forecast
          </h1>
          <p style={{ fontSize: 14, color: stone, marginBottom: 28 }}>
            You&apos;ll likely need to order these before your next cycle, based on real usage —
            not just a fixed reorder level.
          </p>

          <div className={styles.panel} style={{ padding: 24, marginBottom: 24 }}>
            <OrderCycleForm currentDays={orderCycleDays} />
          </div>

          <div className={styles.panel}>
            {reorderList.length === 0 ? (
              <div className={styles.empty}>Nothing needs ordering before your next cycle.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>On hand</th>
                    <th>Avg. monthly usage</th>
                    <th>Runs out in</th>
                    <th>Suggested order qty</th>
                  </tr>
                </thead>
                <tbody>
                  {reorderList.map((r) => (
                    <tr key={r.product.id}>
                      <td data-label="Product" className={styles.prod}>
                        {r.product.name}
                      </td>
                      <td data-label="On hand">
                        {r.onHand} {r.product.unit}
                      </td>
                      <td data-label="Avg. monthly usage">
                        {r.avgMonthlyUsage.toFixed(1)} {r.product.unit}
                      </td>
                      <td data-label="Runs out in">
                        <span className={`${styles.pill} ${r.daysUntilStockout <= 14 ? styles.pillRed : styles.pillAmber}`}>
                          {Math.max(0, Math.round(r.daysUntilStockout))} days
                        </span>
                      </td>
                      <td data-label="Suggested order qty">
                        {Math.ceil(r.suggestedOrderQty)} {r.product.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {notEnoughHistory.length > 0 && (
            <p className={styles.note}>
              {notEnoughHistory.length} product{notEnoughHistory.length === 1 ? "" : "s"} don&apos;t
              have enough usage history yet (need 30+ days of logged treatments): {notEnoughHistory.join(", ")}.
            </p>
          )}
        </main>
      </div>
    </>
  );
}
