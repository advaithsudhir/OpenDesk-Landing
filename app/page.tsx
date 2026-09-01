import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "Opendesk — Inventory Intelligence for Cosmetic Clinics",
  description:
    "Opendesk tracks the needles, cannulas and consumables used in every treatment, by batch and expiry — and shows when more product left the shelf than made it onto the invoice.",
  openGraph: {
    title: "Opendesk — Inventory Intelligence for Cosmetic Clinics",
    description:
      "Opendesk tracks the needles, cannulas and consumables used in every treatment, by batch and expiry — and shows when more product left the shelf than made it onto the invoice.",
  },
  twitter: {
    title: "Opendesk — Inventory Intelligence for Cosmetic Clinics",
    description:
      "Opendesk tracks the needles, cannulas and consumables used in every treatment, by batch and expiry — and shows when more product left the shelf than made it onto the invoice.",
  },
};

const CONTACT_HREF = "mailto:advaith@getopendesk.com";

const fraunces = { fontFamily: "'Fraunces', Georgia, serif", fontOpticalSizing: "auto" as const };
const stone = "#6B7268";
const line = "#E4E1D8";
const sage = "#7C9885";
const sageDeep = "#4A6350";
const ink = "#1F2421";
const paper = "#F7F5F0";
const blush = "#E8C4C0";

function Screenshot({
  base,
  alt,
  width,
  height,
  widthSm,
  heightSm,
  caption,
  shadow,
  priority,
}: {
  base: string;
  alt: string;
  width: number;
  height: number;
  widthSm: number;
  heightSm: number;
  caption: string;
  shadow: string;
  priority?: boolean;
}) {
  return (
    <figure style={{ margin: 0 }}>
      <div
        style={{
          border: `1px solid ${line}`,
          borderRadius: 5,
          overflow: "hidden",
          background: paper,
          boxShadow: shadow,
        }}
      >
        <Image
          className={styles.shotLg}
          src={`/images/${base}.png`}
          alt={alt}
          width={width}
          height={height}
          sizes="(min-width: 860px) 976px, 100vw"
          priority={priority}
        />
        <Image
          className={styles.shotSm}
          src={`/images/${base}-sm.png`}
          alt={alt}
          width={widthSm}
          height={heightSm}
          sizes="100vw"
        />
      </div>
      <figcaption
        style={{ marginTop: 14, fontSize: 13, lineHeight: 1.55, color: stone, fontWeight: 300 }}
      >
        {caption}
      </figcaption>
    </figure>
  );
}

export default function Home() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Public+Sans:ital,wght@0,300..600;1,300..500&display=swap"
        rel="stylesheet"
      />
      <div
        className={styles.root}
        style={{
          minHeight: "100vh",
          background: paper,
          color: ink,
          fontFamily: "'Public Sans', system-ui, sans-serif",
        }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          {/* header */}
          <header
            className={styles.pad}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "22px 24px",
              gap: 16,
            }}
          >
            <div style={{ fontSize: 17, letterSpacing: "0.01em", color: ink }}>
              open<span style={{ color: sage }}>•</span>desk
            </div>
            <a
              className={styles.lnk}
              href={CONTACT_HREF}
              style={{ fontSize: 14, color: stone, textDecoration: "none" }}
            >
              Get in touch
            </a>
          </header>

          {/* hero */}
          <section className={styles.pad} style={{ padding: "56px 24px 72px" }}>
            <div
              style={{
                fontSize: 12,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: sage,
                marginBottom: 28,
              }}
            >
              Inventory intelligence for clinics
            </div>
            <h1
              className={styles.h1}
              style={{
                ...fraunces,
                fontSize: 40,
                lineHeight: 1.08,
                fontWeight: 400,
                letterSpacing: "-0.015em",
                maxWidth: "21ch",
              }}
            >
              The inventory tool built for the treatment room,{" "}
              <span
                style={{
                  fontFamily: "'Public Sans', system-ui, sans-serif",
                  fontWeight: 300,
                  letterSpacing: "-0.005em",
                  color: sageDeep,
                }}
              >
                not the front desk
              </span>
            </h1>
            <p
              className={styles.sub}
              style={{
                marginTop: 28,
                maxWidth: "58ch",
                fontSize: 17,
                lineHeight: 1.62,
                color: stone,
                fontWeight: 300,
              }}
            >
              Your booking software counts the skincare you sell at the counter. It never counts
              the needles, cannulas and consumables you open in every treatment — so nothing tells
              you when more product left the shelf than made it onto the invoice.
            </p>
            <div
              className={styles.row}
              style={{
                marginTop: 40,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 20,
              }}
            >
              <Link
                className={styles.cta}
                href="/demo"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 52,
                  padding: "0 30px",
                  background: sage,
                  border: `1px solid ${sage}`,
                  color: paper,
                  fontSize: 16,
                  fontWeight: 500,
                  textDecoration: "none",
                  borderRadius: 3,
                }}
              >
                Try the live demo
              </Link>
              <a
                className={styles.lnk}
                href={CONTACT_HREF}
                style={{
                  fontSize: 15,
                  color: stone,
                  textDecoration: "none",
                  borderBottom: `1px solid ${line}`,
                  paddingBottom: 3,
                  minHeight: 44,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                Have your own clinic? Get in touch
              </a>
            </div>
          </section>

          {/* dashboard screenshot */}
          <section className={styles.pad} style={{ padding: "0 24px 24px" }}>
            <Screenshot
              base="dashboard"
              alt="Opendesk dashboard showing expiring stock, items below reorder point, stock on hand and wastage rate"
              width={1853}
              height={770}
              widthSm={900}
              heightSm={382}
              caption="The morning view — what needs attention in the stockroom today."
              shadow="0 1px 2px rgba(31,36,33,.04), 0 18px 40px -24px rgba(31,36,33,.18)"
              priority
            />
          </section>

          {/* problem statement */}
          <section
            className={styles.pad}
            style={{ padding: "72px 24px 88px", borderTop: `1px solid ${line}` }}
          >
            <p
              className={styles.prob}
              style={{
                ...fraunces,
                fontSize: 23,
                lineHeight: 1.45,
                fontWeight: 300,
                letterSpacing: "-0.005em",
                maxWidth: "44ch",
                color: ink,
              }}
            >
              Most clinic software was built for booking appointments, not running a treatment
              room. Skincare products get tracked because they&apos;re sold at the counter.
              Everything used during a procedure, the syringes, the gauze, the anaesthetic,
              usually isn&apos;t tracked anywhere except a shelf and someone&apos;s memory.
            </p>
          </section>

          {/* feature 01 */}
          <section
            className={styles.pad}
            style={{ padding: "0 24px 40px", borderTop: `1px solid ${line}` }}
          >
            <div style={{ paddingTop: 64 }}>
              <div style={{ fontSize: 12, letterSpacing: "0.12em", color: sage, marginBottom: 20 }}>
                01
              </div>
              <h3
                className={styles.h3}
                style={{
                  ...fraunces,
                  fontSize: 27,
                  lineHeight: 1.16,
                  fontWeight: 400,
                  letterSpacing: "-0.012em",
                  maxWidth: "22ch",
                }}
              >
                Know what you&apos;re actually using
              </h3>
              <p
                style={{
                  marginTop: 16,
                  fontSize: 16,
                  lineHeight: 1.68,
                  color: stone,
                  fontWeight: 300,
                  maxWidth: "52ch",
                }}
              >
                Log units drawn against units billed per treatment, and see instantly if more
                product left the shelf than made it onto the invoice.
              </p>
              <div style={{ marginTop: 36 }}>
                <Screenshot
                  base="log-treatment"
                  alt="Log a treatment screen: pick the clinician and the treatment performed, and stock deducts itself"
                  width={1853}
                  height={604}
                  widthSm={900}
                  heightSm={448}
                  caption="Pick what was performed — stock updates itself."
                  shadow="0 1px 2px rgba(31,36,33,.04), 0 14px 32px -22px rgba(31,36,33,.16)"
                />
              </div>
            </div>
          </section>

          {/* feature 02 */}
          <section className={styles.pad} style={{ padding: "0 24px 40px" }}>
            <div style={{ paddingTop: 64, borderTop: `1px solid ${line}` }}>
              <div style={{ fontSize: 12, letterSpacing: "0.12em", color: sage, marginBottom: 20 }}>
                02
              </div>
              <h3
                className={styles.h3}
                style={{
                  ...fraunces,
                  fontSize: 27,
                  lineHeight: 1.16,
                  fontWeight: 400,
                  letterSpacing: "-0.012em",
                  maxWidth: "22ch",
                }}
              >
                See which treatments actually make you money
              </h3>
              <p
                style={{
                  marginTop: 16,
                  fontSize: 16,
                  lineHeight: 1.68,
                  color: stone,
                  fontWeight: 300,
                  maxWidth: "52ch",
                }}
              >
                A margin dashboard by procedure: how often it&apos;s performed, what it costs in
                consumables, what it earns, ranked by what actually contributes to the business.
              </p>
              <div style={{ marginTop: 36 }}>
                <Screenshot
                  base="margin"
                  alt="Treatment margin table ranking procedures by consumable cost, price charged, margin and total contribution"
                  width={1853}
                  height={449}
                  widthSm={900}
                  heightSm={274}
                  caption="Margin by procedure, ranked by what it contributes."
                  shadow="0 1px 2px rgba(31,36,33,.04), 0 14px 32px -22px rgba(31,36,33,.16)"
                />
              </div>
            </div>
          </section>

          {/* feature 03 */}
          <section className={styles.pad} style={{ padding: "0 24px 88px" }}>
            <div style={{ paddingTop: 64, borderTop: `1px solid ${line}` }}>
              <div style={{ fontSize: 12, letterSpacing: "0.12em", color: sage, marginBottom: 20 }}>
                03
              </div>
              <h3
                className={styles.h3}
                style={{
                  ...fraunces,
                  fontSize: 27,
                  lineHeight: 1.16,
                  fontWeight: 400,
                  letterSpacing: "-0.012em",
                  maxWidth: "22ch",
                }}
              >
                The stock list your booking software skips
              </h3>
              <p
                style={{
                  marginTop: 16,
                  fontSize: 16,
                  lineHeight: 1.68,
                  color: stone,
                  fontWeight: 300,
                  maxWidth: "52ch",
                }}
              >
                A dedicated list for consumables, separate from retail, with reorder points and
                suppliers, so restocking isn&apos;t a guessing game.
              </p>
              <div style={{ marginTop: 36 }}>
                <Screenshot
                  base="consumables"
                  alt="Consumables list with on-hand counts, minimum levels and suppliers"
                  width={1855}
                  height={620}
                  widthSm={900}
                  heightSm={356}
                  caption="Treatment-day items, kept separate from retail."
                  shadow="0 1px 2px rgba(31,36,33,.04), 0 14px 32px -22px rgba(31,36,33,.16)"
                />
              </div>
            </div>
          </section>

          {/* trust + roi */}
          <section className={styles.pad} style={{ padding: "24px 24px 104px" }}>
            <div style={{ borderTop: `1px solid ${line}`, paddingTop: 40 }}>
              <div
                className={styles.trustgrid}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 32,
                  alignItems: "start",
                }}
              >
                <div>
                  <div style={{ width: 28, height: 1, background: blush, marginBottom: 22 }} />
                  <p
                    className={styles.trust}
                    style={{
                      ...fraunces,
                      fontSize: 19,
                      lineHeight: 1.5,
                      fontWeight: 300,
                      fontStyle: "italic",
                      color: ink,
                    }}
                  >
                    Designed inside a working clinic, next to the treatment room it was built for
                    — not guessed at from a distance.
                  </p>
                </div>
                <div style={{ display: "grid", gap: 22 }}>
                  <p
                    style={{
                      fontSize: 15,
                      lineHeight: 1.68,
                      color: stone,
                      fontWeight: 300,
                      maxWidth: "46ch",
                    }}
                  >
                    A practising clinic owner shaped every screen, and each one answers a question
                    she had already been asked in the room: what expires first, what we opened
                    today, what this treatment actually earns.
                  </p>
                  <div style={{ display: "grid", gap: 14, fontSize: 14, lineHeight: 1.5, color: stone }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                      <span style={{ color: sage }}>—</span>
                      <span>Consumables tracked by batch and expiry, not by memory</span>
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                      <span style={{ color: sage }}>—</span>
                      <span>No patient data stored, only what left the shelf</span>
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                      <span style={{ color: sage }}>—</span>
                      <span>Set up in an afternoon, run alongside your booking system</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 56, borderTop: `1px solid ${line}`, paddingTop: 40 }}>
                <h3 style={{ ...fraunces, fontSize: 21, lineHeight: 1.2, fontWeight: 400, letterSpacing: "-0.01em" }}>
                  Where the money comes back
                </h3>
                <p
                  style={{
                    marginTop: 12,
                    fontSize: 15,
                    lineHeight: 1.68,
                    color: stone,
                    fontWeight: 300,
                    maxWidth: "56ch",
                  }}
                >
                  Three places, all of them measurable from your own stock movements — no new
                  admin, no extra staff time.
                </p>
                <div
                  className={styles.roi}
                  style={{ marginTop: 32, display: "grid", gridTemplateColumns: "1fr", gap: 28 }}
                >
                  <div>
                    <div style={{ ...fraunces, fontSize: 30, letterSpacing: "-0.02em", color: sageDeep }}>
                      2.1%
                    </div>
                    <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: stone, fontWeight: 300 }}>
                      Wastage, down from 6.4% a quarter earlier. Expiring batches get used first
                      because the shelf is visible.
                    </div>
                  </div>
                  <div>
                    <div style={{ ...fraunces, fontSize: 30, letterSpacing: "-0.02em", color: sageDeep }}>
                      $1,840
                    </div>
                    <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: stone, fontWeight: 300 }}>
                      Stock inside 30 days of expiry, flagged before it is written off rather than
                      after.
                    </div>
                  </div>
                  <div>
                    <div style={{ ...fraunces, fontSize: 30, letterSpacing: "-0.02em", color: sageDeep }}>
                      Per procedure
                    </div>
                    <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: stone, fontWeight: 300 }}>
                      Consumable cost against price charged, so underpriced treatments are
                      repriced or retired instead of quietly subsidised.
                    </div>
                  </div>
                </div>
                <p style={{ marginTop: 28, fontSize: 12, lineHeight: 1.6, color: stone }}>
                  Figures from the demo clinic, shown to illustrate the calculation — your own
                  numbers replace them on day one.
                </p>
              </div>
            </div>
          </section>

          {/* final CTA */}
          <section
            className={styles.pad}
            style={{ padding: "80px 24px 96px", borderTop: `1px solid ${line}` }}
          >
            <p style={{ fontSize: 15, lineHeight: 1.6, color: stone, fontWeight: 300, maxWidth: "40ch" }}>
              See it with a clinic&apos;s worth of sample data in it. No sign-up, nothing to
              install.
            </p>
            <h2
              className={styles.h2}
              style={{
                ...fraunces,
                marginTop: 18,
                fontSize: 30,
                lineHeight: 1.12,
                fontWeight: 400,
                letterSpacing: "-0.015em",
                maxWidth: "24ch",
              }}
            >
              Start with the demo, then talk to us about your clinic.
            </h2>
            <div
              className={styles.row}
              style={{
                marginTop: 34,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 20,
              }}
            >
              <Link
                className={styles.cta}
                href="/demo"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 52,
                  padding: "0 30px",
                  background: sage,
                  border: `1px solid ${sage}`,
                  color: paper,
                  fontSize: 16,
                  fontWeight: 500,
                  textDecoration: "none",
                  borderRadius: 3,
                }}
              >
                Try the live demo
              </Link>
              <a
                className={styles.lnk}
                href={CONTACT_HREF}
                style={{
                  fontSize: 15,
                  color: stone,
                  textDecoration: "none",
                  borderBottom: `1px solid ${line}`,
                  paddingBottom: 3,
                  minHeight: 44,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                Have your own clinic? Get in touch
              </a>
            </div>
          </section>

          {/* footer */}
          <footer
            className={styles.pad}
            style={{
              padding: "32px 24px 48px",
              borderTop: `1px solid ${line}`,
              display: "flex",
              flexWrap: "wrap",
              gap: "16px 32px",
              alignItems: "baseline",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontSize: 16, color: ink }}>
              open<span style={{ color: sage }}>•</span>desk
            </div>
            <div style={{ display: "flex", gap: 28, alignItems: "baseline", fontSize: 13, color: stone }}>
              <a className={styles.lnk} href="#" style={{ color: stone, textDecoration: "none" }}>
                Privacy
              </a>
              <span style={{ whiteSpace: "nowrap" }}>© 2026 Opendesk</span>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
