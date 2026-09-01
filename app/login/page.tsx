import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FontLinks from "../FontLinks";
import LoginForm from "./LoginForm";
import styles from "../auth.module.css";
import { paper, ink, stone, sage, line, fraunces } from "../theme";

export const metadata: Metadata = {
  title: "Log in — Opendesk",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

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
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <Link
              href="/"
              className={styles.link}
              style={{ fontSize: 17, color: ink, letterSpacing: "0.01em" }}
            >
              open<span style={{ color: sage }}>•</span>desk
            </Link>
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
              Log in
            </h1>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: stone, marginBottom: 28 }}>
              Sign in to your clinic&apos;s Opendesk dashboard.
            </p>

            <LoginForm />
          </div>

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <Link className={styles.link} href="/" style={{ fontSize: 13.5 }}>
              ← Back to homepage
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
