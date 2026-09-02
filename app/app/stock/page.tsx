import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FontLinks from "../../FontLinks";
import AppHeader from "../AppHeader";
import AddStockForm from "./AddStockForm";
import stockStyles from "./stock.module.css";
import authStyles from "../../auth.module.css";
import { paper, ink, stone, sageDeep, line, fraunces } from "../../theme";

export const metadata: Metadata = {
  title: "Stock — Opendesk",
  robots: { index: false, follow: false },
};

type Product = {
  id: string;
  name: string;
  category: string;
  unit: string;
  cost_per_unit: number | null;
  default_supplier: string | null;
  reorder_level: number;
};

type Batch = {
  id: string;
  batch_number: string | null;
  expiry_date: string | null;
  quantity: number;
  unit_cost: number | null;
  created_at: string;
  products: Product | null;
};

function getStatus(batch: Batch) {
  const product = batch.products;
  const reorderLevel = product?.reorder_level ?? 0;

  if (batch.expiry_date) {
    const days = Math.floor(
      (new Date(batch.expiry_date).getTime() - Date.now()) / 86_400_000
    );
    if (days < 30) {
      return { label: "Expiring soon", cls: stockStyles.pillRed, days };
    }
  }
  if (batch.quantity < reorderLevel) {
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

  // Fetch the profile, its clinic, its full product catalog (for the
  // "receive stock" dropdown), and every batch (with its product joined,
  // for the table) in a single round-trip via PostgREST embedding.
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `clinic_id, clinics (
        id, name,
        products ( id, name, category, unit, cost_per_unit, default_supplier, reorder_level ),
        stock_batches (
          id, batch_number, expiry_date, quantity, unit_cost, created_at,
          products ( id, name, category, unit, cost_per_unit, default_supplier, reorder_level )
        )
      )`
    )
    .eq("id", user.id)
    .single();

  const clinic = profile?.clinics as unknown as
    | { id: string; name: string; products: Product[]; stock_batches: Batch[] }
    | null;

  if (!clinic) {
    redirect("/app");
  }

  const stockProducts = (clinic.products || []).filter((p) => p.category !== "Consumable");
  const stockProductIds = new Set(stockProducts.map((p) => p.id));

  const batches = [...(clinic.stock_batches || [])]
    .filter((b) => b.products && stockProductIds.has(b.products.id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
            Every batch tracked against a real product, by expiry, cost and supplier.
          </p>

          <div className={stockStyles.panel} style={{ padding: 24, marginBottom: 24 }}>
            {stockProducts.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, color: stone }}>
                  No products yet — add one first, then come back to receive stock against it.
                </span>
                <Link
                  href="/app/products"
                  className={authStyles.btn}
                  style={{ textDecoration: "none", background: sageDeep, borderColor: sageDeep }}
                >
                  Add a product
                </Link>
              </div>
            ) : (
              <AddStockForm products={stockProducts} />
            )}
          </div>

          <div className={stockStyles.panel}>
            {batches.length === 0 ? (
              <div className={stockStyles.empty}>
                No stock received yet — receive your first batch above.
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
                  {batches.map((batch) => {
                    const product = batch.products!;
                    const status = getStatus(batch);
                    const pct = Math.min(
                      100,
                      Math.round((batch.quantity / Math.max(product.reorder_level, 1)) * 50)
                    );
                    const barColor = batch.quantity < product.reorder_level ? "#B5563E" : "#4A6350";
                    const unitCost = batch.unit_cost ?? product.cost_per_unit;
                    return (
                      <tr key={batch.id}>
                        <td data-label="Product">
                          <div className={stockStyles.prod}>{product.name}</div>
                          {product.default_supplier && (
                            <div className={stockStyles.meta}>{product.default_supplier}</div>
                          )}
                        </td>
                        <td data-label="Batch">{batch.batch_number || "—"}</td>
                        <td data-label="Expiry">
                          {batch.expiry_date
                            ? new Date(batch.expiry_date).toLocaleDateString("en-AU", {
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
                          {batch.quantity} {product.unit}
                          <div className={stockStyles.bar}>
                            <div
                              className={stockStyles.barFill}
                              style={{ width: `${pct}%`, background: barColor }}
                            />
                          </div>
                        </td>
                        <td data-label="Reorder level">
                          {product.reorder_level} {product.unit}
                        </td>
                        <td data-label="Unit cost">
                          {unitCost != null ? `$${unitCost.toFixed(2)}` : "—"}
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
