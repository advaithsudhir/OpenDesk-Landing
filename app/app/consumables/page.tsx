import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FontLinks from "../../FontLinks";
import AppHeader from "../AppHeader";
import AddConsumableForm from "./AddConsumableForm";
import { removeConsumableStock } from "./actions";
import DeleteButton from "../DeleteButton";
import styles from "./consumables.module.css";
import authStyles from "../../auth.module.css";
import { paper, ink, stone, sageDeep, fraunces } from "../../theme";

export const metadata: Metadata = {
  title: "Consumables — Opendesk",
  robots: { index: false, follow: false },
};

type Product = {
  id: string;
  name: string;
  category: string;
  unit: string;
  default_supplier: string | null;
  reorder_level: number;
};

type Batch = {
  quantity: number;
  products: Product | null;
};

export default async function ConsumablesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: errorParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the profile, its clinic, its consumable-category products (for
  // the dropdown), and every batch of those products (to aggregate
  // on-hand quantity), in a single round-trip.
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `clinic_id, clinics (
        id, name,
        products ( id, name, category, unit, default_supplier, reorder_level ),
        stock_batches ( quantity, products ( id, name, category, unit, default_supplier, reorder_level ) )
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

  const consumableProducts = (clinic.products || []).filter((p) => p.category === "Consumable");

  const quantityByProduct = new Map<string, number>();
  for (const batch of clinic.stock_batches || []) {
    if (batch.products?.category !== "Consumable") continue;
    const id = batch.products.id;
    quantityByProduct.set(id, (quantityByProduct.get(id) || 0) + batch.quantity);
  }

  const rows = consumableProducts
    .map((p) => ({ product: p, quantity: quantityByProduct.get(p.id) || 0 }))
    .sort((a, b) => a.product.name.localeCompare(b.product.name));

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
        <AppHeader clinicName={clinic.name} active="consumables" />

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
            Consumables
          </h1>
          <p style={{ fontSize: 14, color: stone, marginBottom: 28 }}>
            Treatment-day items — needles, packs, wipes. Tracked separately from skincare
            retail stock.
          </p>

          {errorParam && (
            <div className={authStyles.error} role="alert" style={{ marginBottom: 16 }}>
              {errorParam}
            </div>
          )}

          <div className={styles.panel} style={{ padding: 24, marginBottom: 24 }}>
            {consumableProducts.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, color: stone }}>
                  No consumable products yet — add one first (category "Consumable"), then come
                  back to add stock.
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
              <AddConsumableForm products={consumableProducts} />
            )}
          </div>

          <div className={styles.panel}>
            {rows.length === 0 ? (
              <div className={styles.empty}>No consumables yet — add your first one above.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>On hand</th>
                    <th>Minimum level</th>
                    <th>Supplier</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ product, quantity }) => {
                    const low = quantity <= product.reorder_level;
                    return (
                      <tr key={product.id}>
                        <td data-label="Item" className={styles.prod}>
                          {product.name}
                        </td>
                        <td data-label="On hand">
                          {quantity} {product.unit}
                        </td>
                        <td data-label="Minimum level">
                          {product.reorder_level} {product.unit}
                        </td>
                        <td data-label="Supplier">{product.default_supplier || "—"}</td>
                        <td data-label="Status">
                          <span className={`${styles.pill} ${low ? styles.pillRed : styles.pillGreen}`}>
                            {low ? "Below minimum" : "Healthy"}
                          </span>
                        </td>
                        <td data-label="">
                          {quantity > 0 && (
                            <form action={removeConsumableStock}>
                              <input type="hidden" name="productId" value={product.id} />
                              <DeleteButton
                                className={styles.removeBtn}
                                confirmText={`Remove all ${quantity} ${product.unit} of on-hand stock for ${product.name}? This can't be undone.`}
                              >
                                Remove
                              </DeleteButton>
                            </form>
                          )}
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
