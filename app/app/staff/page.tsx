import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FontLinks from "../../FontLinks";
import AppHeader from "../AppHeader";
import AddStaffForm from "./AddStaffForm";
import { removeStaff } from "./actions";
import styles from "./staff.module.css";
import authStyles from "../../auth.module.css";
import { paper, ink, stone, fraunces } from "../../theme";

export const metadata: Metadata = {
  title: "Staff — Opendesk",
  robots: { index: false, follow: false },
};

type Staff = {
  id: string;
  name: string;
  created_at: string;
};

export default async function StaffPage({
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
    .select(`clinic_id, clinics ( id, name, staff ( id, name, created_at ) )`)
    .eq("id", user.id)
    .single();

  const clinic = profile?.clinics as unknown as { id: string; name: string; staff: Staff[] } | null;

  if (!clinic) {
    redirect("/app");
  }

  const staff = [...(clinic.staff || [])].sort((a, b) => a.name.localeCompare(b.name));

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
        <AppHeader clinicName={clinic.name} active="staff" />

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
            Staff
          </h1>
          <p style={{ fontSize: 14, color: stone, marginBottom: 28 }}>
            The clinicians who can be picked when logging a treatment. Names only — no login
            required.
          </p>

          {errorParam && (
            <div className={authStyles.error} role="alert" style={{ marginBottom: 16 }}>
              {errorParam}
            </div>
          )}

          <div className={styles.panel} style={{ padding: 24, marginBottom: 24 }}>
            <AddStaffForm />
          </div>

          <div className={styles.panel}>
            {staff.length === 0 ? (
              <div className={styles.empty}>No staff yet — add your first one above.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Added</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.id}>
                      <td data-label="Name" className={styles.prod}>
                        {s.name}
                      </td>
                      <td data-label="Added">
                        {new Date(s.created_at).toLocaleDateString("en-AU", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td data-label="">
                        <form action={removeStaff}>
                          <input type="hidden" name="staffId" value={s.id} />
                          <button type="submit" className={styles.removeBtn}>
                            Remove
                          </button>
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
