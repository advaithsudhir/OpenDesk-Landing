import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FontLinks from "../../FontLinks";
import AppHeader from "../AppHeader";
import LogTreatmentForm, { type FormProcedure, type FormProduct } from "./LogTreatmentForm";
import styles from "./log.module.css";
import authStyles from "../../auth.module.css";
import { paper, ink, stone, sageDeep, fraunces } from "../../theme";

export const metadata: Metadata = {
  title: "Log a visit — Opendesk",
  robots: { index: false, follow: false },
};

type Staff = { id: string; name: string };

const CATEGORY_ORDER = ["Injectable", "Consumable", "Skincare", "Device", "Other", "Sample"];

export default async function LogTreatmentPage() {
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
        staff ( id, name ),
        procedures (
          id, name,
          procedure_supplies ( quantity, is_dosed, products ( id, cost_per_unit ) )
        ),
        products ( id, name, brand, unit, category, cost_per_unit )
      )`
    )
    .eq("id", user.id)
    .single();

  const clinic = profile?.clinics as unknown as
    | { id: string; name: string; staff: Staff[]; procedures: FormProcedure[]; products: FormProduct[] }
    | null;

  if (!clinic) {
    redirect("/app");
  }

  const staff = [...(clinic.staff || [])].sort((a, b) => a.name.localeCompare(b.name));
  const procedures = [...(clinic.procedures || [])].sort((a, b) => a.name.localeCompare(b.name));
  const products = [...(clinic.products || [])].sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || a.name.localeCompare(b.name)
  );

  const missingStaff = staff.length === 0;
  const missingStock = procedures.length === 0 && products.every((p) => p.category === "Sample");

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
        <AppHeader clinicName={clinic.name} active="logTreatment" />

        <main className={styles.main}>
          <h1
            style={{
              ...fraunces,
              fontSize: 26,
              fontWeight: 400,
              letterSpacing: "-0.01em",
              marginBottom: 6,
            }}
          >
            Log a visit
          </h1>
          <p style={{ fontSize: 14, color: stone, marginBottom: 28 }}>
            Pick the clinician and date, then add a line for each procedure or product. Stock updates
            itself.
          </p>

          <div className={styles.panel} style={{ padding: 24 }}>
            {missingStaff || missingStock ? (
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, color: stone }}>
                  {missingStaff
                    ? "No staff yet — add one first, then come back to log a visit."
                    : "No procedures or products yet — add one first, then come back to log a visit."}
                </span>
                <Link
                  href={missingStaff ? "/app/staff" : "/app/procedures"}
                  className={authStyles.btn}
                  style={{ textDecoration: "none", background: sageDeep, borderColor: sageDeep }}
                >
                  {missingStaff ? "Add staff" : "Add a procedure"}
                </Link>
              </div>
            ) : (
              <LogTreatmentForm staff={staff} procedures={procedures} products={products} />
            )}
          </div>
        </main>
      </div>
    </>
  );
}
