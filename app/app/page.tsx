import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FontLinks from "../FontLinks";
import ClinicSetupForm from "./ClinicSetupForm";
import LogoutButton from "./LogoutButton";
import styles from "../auth.module.css";
import { paper, ink, stone, sage, line, fraunces } from "../theme";

export const metadata: Metadata = {
  title: "Dashboard — Opendesk",
  robots: { index: false, follow: false },
};

export default async function AppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id, clinics ( id, name )")
    .eq("id", user.id)
    .single();

  const clinic = profile?.clinics as unknown as { id: string; name: string } | null;

  return (
    <>
      <FontLinks />
      <div
        className={styles.root}
        style={{
          minHeight: "100vh",
          background: paper,
          color: ink,
          fontFamily: "'Public Sans', system-ui, sans-serif",
        }}
      >
        {!clinic ? (
          <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <header style={{ display: "flex", justifyContent: "flex-end", padding: "20px 24px" }}>
              <LogoutButton />
            </header>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px 24px 96px",
              }}
            >
            <div style={{ width: "100%", maxWidth: 380 }}>
              <div style={{ textAlign: "center", marginBottom: 40 }}>
                <span style={{ fontSize: 17, color: ink, letterSpacing: "0.01em" }}>
                  open<span style={{ color: sage }}>•</span>desk
                </span>
              </div>
              <div
                style={{
                  background: "#fff",
                  border: `1px solid ${line}`,
                  borderRadius: 5,
                  padding: "36px 32px",
                  boxShadow: "0 1px 2px rgba(31,36,33,.04), 0 18px 40px -24px rgba(31,36,33,.18)",
                }}
              >
                <h1
                  style={{
                    ...fraunces,
                    fontSize: 24,
                    fontWeight: 400,
                    letterSpacing: "-0.01em",
                    marginBottom: 8,
                  }}
                >
                  Welcome to Opendesk
                </h1>
                <p style={{ fontSize: 14, lineHeight: 1.55, color: stone, marginBottom: 28 }}>
                  This is your first time logging in. What&apos;s your clinic called?
                </p>
                <ClinicSetupForm />
              </div>
            </div>
            </div>
          </div>
        ) : (
          <div>
            <header
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px 32px",
                borderBottom: `1px solid ${line}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
                <span style={{ fontSize: 17, color: ink, letterSpacing: "0.01em" }}>
                  open<span style={{ color: sage }}>•</span>desk
                </span>
                <span style={{ fontSize: 13, color: stone, borderLeft: `1px solid ${line}`, paddingLeft: 16 }}>
                  {clinic.name}
                </span>
              </div>
              <LogoutButton />
            </header>

            <main style={{ maxWidth: 720, margin: "0 auto", padding: "64px 32px" }}>
              <h1
                style={{
                  ...fraunces,
                  fontSize: 30,
                  fontWeight: 400,
                  letterSpacing: "-0.01em",
                  marginBottom: 12,
                }}
              >
                You&apos;re logged in.
              </h1>
              <p style={{ fontSize: 15, lineHeight: 1.65, color: stone, maxWidth: "52ch" }}>
                {clinic.name} is now linked to your account. This is the real dashboard —
                wired to your Supabase data rather than the sample demo — and it&apos;s
                ready for the actual inventory screens (stock, consumables, treatment
                margin) to be built out here next.
              </p>
            </main>
          </div>
        )}
      </div>
    </>
  );
}
