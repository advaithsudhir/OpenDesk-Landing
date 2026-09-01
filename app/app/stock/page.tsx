import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FontLinks from "../../FontLinks";
import AppHeader from "../AppHeader";
import AddStockForm from "./AddStockForm";
import stockStyles from "./stock.module.css";
import { paper, ink, stone, line, fraunces } from "../../theme";

export const metadata: Metadata = {
  title: "Stock — Opendesk",
  robots: { index: false, follow: false },
};

type StockItem = {
  id: string;
  product_name: string;
  supplier: string | null;
  batch: string | null;
  expiry_date: string | null;
  quantity: number;
  unit: string;
  reorder_level: number;
  unit_cost: number | null;
};

function getStatus(item: StockItem) {
  if (item.expiry_date) {
    const days = Math.floor(
      (new Date(item.expiry_date).getTime() - Date.now()) / 86_400_000
    );
    if (days < 30) {
      return { label: "Expiring soon", cls: stockStyles.pillRed, days };
    }
  }
  if (item.quantity < item.reorder_level) {
    return { label: "Below reorder", cls: stockStyles.pillAmber, days: null };
  }
  return { label: "Healthy", cls: stockStyles.pillGreen, days: null };
}

export default async function StockPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the profile, its clinic, and that clinic's stock in a single
  // round-trip via PostgREST's foreign-key embedding, instead of two
  // sequential queries.
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `clinic_id, clinics (
        id, name,
        stock_items ( id, product_name, supplier, batch, expiry_date, quantity, unit, reorder_level, unit_cost, created_at )
      )`
    )
    .eq("id", user.id)
    .single();

  const clinic = profile?.clinics as unknown as
    | { id: string; name: string; stock_items: (StockItem & { created_at: string })[] }
    | null;

  if (!clinic) {
    redirect("/app");
  }

  const stockItems = [...(clinic.stock_items || [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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
        <AppHeader clinicName={clinic.name} active="stock" />

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
            Stock on hand
          </h1>
          <p style={{ fontSize: 14, color: stone, marginBottom: 28 }}>
            Every item tracked by batch, expiry, cost and supplier.
          </p>

          <div className={stockStyles.panel} style={{ padding: 24, marginBottom: 24 }}>
            <AddStockForm />
          </div>

          <div className={stockStyles.panel}>
            {stockItems.length === 0 ? (
              <div className={stockStyles.empty}>
                No stock items yet — add your first one above.
              </div>
            ) : (
              <table className={stockStyles.table}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Batch</th>
                    <th>Expiry</th>
                    <th>On hand</th>
                    <th>Reorder level</th>
                    <th>Unit cost</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stockItems.map((item) => {
                    const status = getStatus(item);
                    const pct = Math.min(
                      100,
                      Math.round((item.quantity / Math.max(item.reorder_level, 1)) * 50)
                    );
                    const barColor = item.quantity < item.reorder_level ? "#B5563E" : "#4A6350";
                    return (
                      <tr key={item.id}>
                        <td data-label="Product">
                          <div className={stockStyles.prod}>{item.product_name}</div>
                          {item.supplier && <div className={stockStyles.meta}>{item.supplier}</div>}
                        </td>
                        <td data-label="Batch">{item.batch || "—"}</td>
                        <td data-label="Expiry">
                          {item.expiry_date
                            ? new Date(item.expiry_date).toLocaleDateString("en-AU", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                          {status.days !== null && status.days < 30 && (
                            <span className={`${stockStyles.pill} ${stockStyles.pillRed}`} style={{ marginLeft: 6 }}>
                              {status.days}d
                            </span>
                          )}
                        </td>
                        <td data-label="On hand">
                          {item.quantity} {item.unit}
                          <div className={stockStyles.bar}>
                            <div
                              className={stockStyles.barFill}
                              style={{ width: `${pct}%`, background: barColor }}
                            />
                          </div>
                        </td>
                        <td data-label="Reorder level">
                          {item.reorder_level} {item.unit}
                        </td>
                        <td data-label="Unit cost">
                          {item.unit_cost != null ? `$${item.unit_cost.toFixed(2)}` : "—"}
                        </td>
                        <td data-label="Status">
                          <span className={`${stockStyles.pill} ${status.cls}`}>{status.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
