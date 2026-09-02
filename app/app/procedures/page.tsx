import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FontLinks from "../../FontLinks";
import AppHeader from "../AppHeader";
import NewProcedureForm from "./NewProcedureForm";
import styles from "./procedures.module.css";
import authStyles from "../../auth.module.css";
import { paper, ink, stone, sageDeep, fraunces } from "../../theme";

export const metadata: Metadata = {
  title: "Procedures — Opendesk",
  robots: { index: false, follow: false },
};

type Product = { id: string; name: string; unit: string; cost_per_unit: number | null };

type Supply = {
  id: string;
  quantity: number;
  is_dosed: boolean;
  products: Product | null;
};

type Procedure = {
  id: string;
  name: string;
  price: number | null;
  created_at: string;
  procedure_supplies: Supply[];
};

export default async function ProceduresPage() {
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
        products ( id, name, unit, cost_per_unit ),
        procedures (
          id, name, price, created_at,
          procedure_supplies ( id, quantity, is_dosed, products ( id, name, unit, cost_per_unit ) )
        )
      )`
    )
    .eq("id", user.id)
    .single();

  const clinic = profile?.clinics as unknown as
    | { id: string; name: string; products: Product[]; procedures: Procedure[] }
    | null;

  if (!clinic) {
    redirect("/app");
  }

  const products = clinic.products || [];
  const procedures = [...(clinic.procedures || [])].sort(
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
        <AppHeader clinicName={clinic.name} active="procedures" />

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
            Supplies per procedure
          </h1>
          <p style={{ fontSize: 14, color: stone, marginBottom: 28 }}>
            What each treatment consumes. No patient data — just products and quantities.
          </p>

          <div className={styles.panel} style={{ padding: 24, marginBottom: 24 }}>
            {products.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, color: stone }}>
                  No products yet — add one first, then come back to define a procedure.
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
              <NewProcedureForm products={products} />
            )}
          </div>

          {procedures.length === 0 ? (
            <div className={styles.panel}>
              <div className={styles.empty}>No procedures yet — add your first one above.</div>
            </div>
          ) : (
            <div className={styles.rgrid}>
              {procedures.map((proc) => {
                const cost = proc.procedure_supplies.reduce(
                  (sum, s) => sum + s.quantity * (s.products?.cost_per_unit ?? 0),
                  0
                );
                return (
                  <div key={proc.id} className={styles.rcard}>
                    <h3>{proc.name}</h3>
                    <ul>
                      {proc.procedure_supplies.map((s) => (
                        <li key={s.id}>
                          {s.quantity} {s.is_dosed ? s.products?.unit : ""} × {s.products?.name}
                        </li>
                      ))}
                    </ul>
                    <div className={styles.cost}>${cost.toFixed(2)} in consumables</div>
                  </div>
                );
              })}
            </div>
          )}

          <div className={styles.explain}>
            <h2>Why supplies per procedure matter</h2>
            <p>
              Instead of counting stock manually, the clinician picks the treatment they just
              performed. Opendesk deducts every consumable automatically, from the batch closest
              to expiry first, and writes the movement to an audit trail. No patient details are
              stored — only what left the shelf, when, and from which batch.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
