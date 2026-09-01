import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FontLinks from "../../FontLinks";
import AppHeader from "../AppHeader";
import AddConsumableForm from "./AddConsumableForm";
import styles from "./consumables.module.css";
import { paper, ink, stone, fraunces } from "../../theme";

export const metadata: Metadata = {
  title: "Consumables — Opendesk",
  robots: { index: false, follow: false },
};

type Consumable = {
  id: string;
  product_name: string;
  supplier: string | null;
  quantity: number;
  unit: string;
  min_level: number;
  created_at: string;
};

export default async function ConsumablesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the profile, its clinic, and that clinic's consumables in a single
  // round-trip via PostgREST's foreign-key embedding.
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `clinic_id, clinics (
        id, name,
        consumables ( id, product_name, supplier, quantity, unit, min_level, created_at )
      )`
    )
    .eq("id", user.id)
    .single();

  const clinic = profile?.clinics as unknown as
    | { id: string; name: string; consumables: Consumable[] }
    | null;

  if (!clinic) {
    redirect("/app");
  }

  const items = [...(clinic.consumables || [])].sort(
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

          <div className={styles.panel} style={{ padding: 24, marginBottom: 24 }}>
            <AddConsumableForm />
          </div>

          <div className={styles.panel}>
            {items.length === 0 ? (
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
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const low = item.quantity <= item.min_level;
                    return (
                      <tr key={item.id}>
                        <td data-label="Item" className={styles.prod}>
                          {item.product_name}
                        </td>
                        <td data-label="On hand">
                          {item.quantity} {item.unit}
                        </td>
                        <td data-label="Minimum level">
                          {item.min_level} {item.unit}
                        </td>
                        <td data-label="Supplier">{item.supplier || "—"}</td>
                        <td data-label="Status">
                          <span className={`${styles.pill} ${low ? styles.pillRed : styles.pillGreen}`}>
                            {low ? "Below minimum" : "Healthy"}
                          </span>
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
