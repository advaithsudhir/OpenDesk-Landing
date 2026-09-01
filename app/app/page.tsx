import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FontLinks from "../FontLinks";
import ClinicSetupForm from "./ClinicSetupForm";
import LogoutButton from "./LogoutButton";
import AppHeader from "./AppHeader";
import styles from "../auth.module.css";
import { paper, ink, stone, sage, sageDeep, line, fraunces } from "../theme";

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
            <AppHeader clinicName={clinic.name} active="dashboard" />

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
              <p style={{ fontSize: 15, lineHeight: 1.65, color: stone, maxWidth: "52ch", marginBottom: 28 }}>
                {clinic.name} is now linked to your account. This is the real dashboard —
                wired to your Supabase data rather than the sample demo.
              </p>
              <Link
                href="/app/stock"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 48,
                  padding: "0 24px",
                  background: sageDeep,
                  color: paper,
                  fontSize: 15,
                  fontWeight: 500,
                  textDecoration: "none",
                  borderRadius: 3,
                }}
              >
                Go to Stock →
              </Link>
            </main>
          </div>
        )}
      </div>
    </>
  );
}
