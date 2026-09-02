import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FontLinks from "../../FontLinks";
import AppHeader from "../AppHeader";
import LogTreatmentForm from "./LogTreatmentForm";
import styles from "./log.module.css";
import authStyles from "../../auth.module.css";
import { paper, ink, stone, sageDeep, fraunces } from "../../theme";

export const metadata: Metadata = {
  title: "Log a treatment — Opendesk",
  robots: { index: false, follow: false },
};

type Staff = { id: string; name: string };
type Supply = {
  id: string;
  quantity: number;
  is_dosed: boolean;
  products: { id: string; name: string; unit: string } | null;
};
type Procedure = { id: string; name: string; procedure_supplies: Supply[] };

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
          procedure_supplies ( id, quantity, is_dosed, products ( id, name, unit ) )
        )
      )`
    )
    .eq("id", user.id)
    .single();

  const clinic = profile?.clinics as unknown as
    | { id: string; name: string; staff: Staff[]; procedures: Procedure[] }
    | null;

  if (!clinic) {
    redirect("/app");
  }

  const staff = [...(clinic.staff || [])].sort((a, b) => a.name.localeCompare(b.name));
  const procedures = [...(clinic.procedures || [])].sort((a, b) => a.name.localeCompare(b.name));

  const missingStaff = staff.length === 0;
  const missingProcedures = procedures.length === 0;

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
            Log a treatment
          </h1>
          <p style={{ fontSize: 14, color: stone, marginBottom: 28 }}>
            Pick what was performed. Stock updates itself.
          </p>

          <div className={styles.panel} style={{ padding: 24 }}>
            {missingStaff || missingProcedures ? (
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, color: stone }}>
                  {missingStaff && missingProcedures
                    ? "Add a staff member and a procedure first, then come back to log a treatment."
                    : missingStaff
                      ? "No staff yet — add one first, then come back to log a treatment."
                      : "No procedures yet — add one first, then come back to log a treatment."}
                </span>
                {missingStaff && (
                  <Link
                    href="/app/staff"
                    className={authStyles.btn}
                    style={{ textDecoration: "none", background: sageDeep, borderColor: sageDeep }}
                  >
                    Add staff
                  </Link>
                )}
                {missingProcedures && (
                  <Link
                    href="/app/procedures"
                    className={authStyles.btn}
                    style={{ textDecoration: "none", background: sageDeep, borderColor: sageDeep }}
                  >
                    Add a procedure
                  </Link>
                )}
              </div>
            ) : (
              <LogTreatmentForm staff={staff} procedures={procedures} />
            )}
          </div>
        </main>
      </div>
    </>
  );
}
