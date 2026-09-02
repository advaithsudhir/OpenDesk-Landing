import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FontLinks from "../../FontLinks";
import AppHeader from "../AppHeader";
import AddProductForm from "./AddProductForm";
import { removeProduct } from "./actions";
import DeleteButton from "../DeleteButton";
import styles from "./products.module.css";
import authStyles from "../../auth.module.css";
import { paper, ink, stone, fraunces } from "../../theme";

export const metadata: Metadata = {
  title: "Products — Opendesk",
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
  is_s4: boolean;
  created_at: string;
};

export default async function ProductsPage({
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

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `clinic_id, clinics (
        id, name,
        products ( id, name, category, unit, cost_per_unit, default_supplier, reorder_level, is_s4, created_at )
      )`
    )
    .eq("id", user.id)
    .single();

  const clinic = profile?.clinics as unknown as { id: string; name: string; products: Product[] } | null;

  if (!clinic) {
    redirect("/app");
  }

  const products = [...(clinic.products || [])].sort(
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
        <AppHeader clinicName={clinic.name} active="products" />

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
            Products
          </h1>
          <p style={{ fontSize: 14, color: stone, marginBottom: 28 }}>
            The catalog every treatment, batch and consumable references. Define a product once
            here, then receive stock or use it in a procedure.
          </p>

          {errorParam && (
            <div className={authStyles.error} role="alert" style={{ marginBottom: 16 }}>
              {errorParam}
            </div>
          )}

          <div className={styles.panel} style={{ padding: 24, marginBottom: 24 }}>
            <AddProductForm />
          </div>

          <div className={styles.panel}>
            {products.length === 0 ? (
              <div className={styles.empty}>No products yet — add your first one above.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Unit</th>
                    <th>Cost per unit</th>
                    <th>Default supplier</th>
                    <th>Reorder level</th>
                    <th>S4</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td data-label="Product" className={styles.prod}>
                        {p.name}
                      </td>
                      <td data-label="Category">{p.category}</td>
                      <td data-label="Unit">{p.unit}</td>
                      <td data-label="Cost per unit">
                        {p.cost_per_unit != null ? `$${p.cost_per_unit.toFixed(2)}` : "—"}
                      </td>
                      <td data-label="Default supplier">{p.default_supplier || "—"}</td>
                      <td data-label="Reorder level">
                        {p.reorder_level} {p.unit}
                      </td>
                      <td data-label="S4">
                        {p.is_s4 ? (
                          <span className={`${styles.pill} ${styles.pillAmber}`}>S4</span>
                        ) : (
                          <span className={`${styles.pill} ${styles.pillGrey}`}>—</span>
                        )}
                      </td>
                      <td data-label="">
                        <form action={removeProduct}>
                          <input type="hidden" name="productId" value={p.id} />
                          <DeleteButton className={styles.removeBtn} confirmText={`Remove ${p.name}?`}>
                            Remove
                          </DeleteButton>
                        </form>
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
