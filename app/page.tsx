import Image from "next/image";
import ScrollReveal from "./ScrollReveal";
import EmailSignupForm from "./EmailSignupForm";

const ACCENT = "#6E9FFF";
const GRAIN_URL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxNjAnIGhlaWdodD0nMTYwJz48ZmlsdGVyIGlkPSduJz48ZmVUdXJidWxlbmNlIHR5cGU9J2ZyYWN0YWxOb2lzZScgYmFzZUZyZXF1ZW5jeT0nMC45JyBudW1PY3RhdmVzPScyJy8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9JzE2MCcgaGVpZ2h0PScxNjAnIGZpbHRlcj0ndXJsKCUyM24pJy8+PC9zdmc+";

const container: React.CSSProperties = {
  position: "relative",
  zIndex: 2,
  maxWidth: 1080,
  margin: "0 auto",
};

function ChatBubble({
  align,
  tone,
  label,
  time,
  children,
}: {
  align: "flex-end" | "flex-start";
  tone: "neutral" | "accent";
  label?: string;
  time?: string;
  children: React.ReactNode;
}) {
  const isAccent = tone === "accent";
  return (
    <div
      style={{
        background: isAccent ? "rgba(110,159,255,0.06)" : "rgba(255,255,255,0.03)",
        border: isAccent
          ? "1px solid rgba(110,159,255,0.18)"
          : "1px solid rgba(255,255,255,0.09)",
        borderRadius: 14,
        padding: "16px 18px",
        alignSelf: align,
        maxWidth: "82%",
      }}
    >
      {label && (
        <div
          style={{
            fontSize: 12,
            color: isAccent ? ACCENT : "#6C6E75",
            marginBottom: 6,
            display: time ? "flex" : undefined,
            justifyContent: time ? "space-between" : undefined,
            gap: time ? 24 : undefined,
          }}
        >
          <span>{label}</span>
          {time && <span>{time}</span>}
        </div>
      )}
      <div style={{ fontSize: 14.5, lineHeight: 1.55, color: "#C9CBD1" }}>
        {children}
      </div>
    </div>
  );
}

function FeatureIcon({ path }: { path: React.ReactNode }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      stroke={ACCENT}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ marginBottom: 20, display: "block" }}
    >
      {path}
    </svg>
  );
}

export default function Home() {
  return (
    <div
      style={{
        background: "#0B0C0E",
        color: "#EDEDEF",
        minHeight: "100vh",
        overflowX: "hidden",
        position: "relative",
      }}
    >
      <ScrollReveal />

      {/* grain */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.035,
          zIndex: 1,
          backgroundImage: `url('${GRAIN_URL}')`,
        }}
      />

      {/* nav */}
      <header
        style={{
          ...container,
          padding: "28px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 2,
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          <span>open</span>
          <span style={{ color: ACCENT, fontSize: 22, lineHeight: 1 }}>•</span>
          <span>desk</span>
        </div>
        <a
          href="#cta"
          className="nav-cta"
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "#EDEDEF",
            borderRadius: 8,
            padding: "8px 16px",
          }}
        >
          Book a pilot call
        </a>
      </header>

      {/* hero */}
      <section
        className="hero-grid"
        style={{
          ...container,
          padding: "96px 32px 120px",
          display: "grid",
          gridTemplateColumns: "1.25fr 0.75fr",
          gap: 64,
          alignItems: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -180,
            left: -160,
            width: 640,
            height: 520,
            borderRadius: "50%",
            background:
              "radial-gradient(closest-side, rgba(110,159,255,0.10), transparent 70%)",
            filter: "blur(60px)",
            pointerEvents: "none",
            animation: "od-drift 18s ease-in-out infinite",
          }}
        />

        <div style={{ position: "relative" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 500,
              color: "#9A9CA3",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 999,
              padding: "6px 14px",
              marginBottom: 32,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: ACCENT,
                display: "inline-block",
              }}
            />
            <span>Answering enquiries 24/7</span>
          </div>
          <h1
            style={{
              fontSize: 64,
              lineHeight: 1.05,
              fontWeight: 600,
              letterSpacing: "-0.035em",
              margin: "0 0 24px",
              textWrap: "balance",
            }}
          >
            The after-hours front desk for Australian cosmetic clinics.
          </h1>
          <p
            style={{
              fontSize: 19,
              lineHeight: 1.6,
              color: "#9A9CA3",
              margin: "0 0 40px",
              maxWidth: 480,
              textWrap: "pretty",
            }}
          >
            Opendesk answers patient enquiries, checks real availability and
            books consultations — while your team is off the clock.
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <a
              href="#cta"
              className="btn-primary"
              style={{
                display: "inline-block",
                background: ACCENT,
                color: "#0B0C0E",
                fontSize: 15,
                fontWeight: 600,
                padding: "14px 28px",
                borderRadius: 10,
                letterSpacing: "-0.01em",
              }}
            >
              Book a pilot call
            </a>
            <a
              href="#email-signup"
              className="link-underline"
              style={{
                fontSize: 14.5,
                fontWeight: 500,
                color: "#C9CBD1",
                paddingBottom: 1,
              }}
            >
              Leave your email instead
            </a>
          </div>
        </div>

        {/* abstract conversation visual */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <ChatBubble align="flex-end" tone="neutral" label="Enquiry" time="11:42 PM">
            Do you have anything for anti-wrinkle consults next week? Roughly
            what should I expect to pay?
          </ChatBubble>
          <ChatBubble align="flex-start" tone="accent" label="open•desk" time="11:42 PM">
            Yes — Dr Lee has consult times Tuesday and Thursday. I can hold
            one now, and I&apos;ve sent through our consultation guide.
          </ChatBubble>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              alignSelf: "flex-start",
              paddingLeft: 6,
              fontSize: 12.5,
              color: "#6C6E75",
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: ACCENT,
                display: "inline-block",
              }}
            />
            <span>Booked · confirmation sent</span>
          </div>
        </div>
      </section>

      {/* problem statement */}
      <section
        data-reveal=""
        style={{
          ...container,
          padding: "100px 32px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <p
          style={{
            fontSize: 34,
            lineHeight: 1.35,
            fontWeight: 500,
            letterSpacing: "-0.025em",
            margin: "0 auto",
            maxWidth: 780,
            textAlign: "center",
            textWrap: "balance",
            color: "#EDEDEF",
          }}
        >
          Most enquiries arrive after 6pm. Most clinics reply the next
          morning.{" "}
          <span style={{ color: "#6C6E75" }}>
            By then, the patient has booked somewhere else.
          </span>
        </p>
      </section>

      {/* features */}
      <section
        data-reveal=""
        style={{ ...container, padding: "20px 32px 100px" }}
      >
        <div
          className="features-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
          }}
        >
          <div
            className="feature-card"
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              padding: "32px 28px",
              background: "rgba(255,255,255,0.015)",
            }}
          >
            <FeatureIcon
              path={
                <>
                  <path d="M19 11a8 8 0 1 1-3.6-6.7" />
                  <circle cx="11" cy="11" r="2.5" />
                </>
              }
            />
            <h3
              style={{
                fontSize: 17,
                fontWeight: 600,
                letterSpacing: "-0.015em",
                margin: "0 0 10px",
              }}
            >
              Ask anything, anonymously
            </h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#9A9CA3", margin: 0 }}>
              Patients get straight answers on treatments and pricing without
              leaving a name first.
            </p>
          </div>

          <div
            className="feature-card"
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              padding: "32px 28px",
              background: "rgba(255,255,255,0.015)",
            }}
          >
            <FeatureIcon
              path={
                <>
                  <rect x="3" y="4" width="16" height="15" rx="2.5" />
                  <path d="M3 9h16" />
                  <path d="M8 2v4M14 2v4" />
                </>
              }
            />
            <h3
              style={{
                fontSize: 17,
                fontWeight: 600,
                letterSpacing: "-0.015em",
                margin: "0 0 10px",
              }}
            >
              See real availability
            </h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#9A9CA3", margin: 0 }}>
              Live calendar access — actual open times from your practice
              software, not a callback promise.
            </p>
          </div>

          <div
            className="feature-card"
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              padding: "32px 28px",
              background: "rgba(255,255,255,0.015)",
            }}
          >
            <FeatureIcon path={<path d="M12 2 4 13h6l-1 7 8-11h-6l1-7z" />} />
            <h3
              style={{
                fontSize: 17,
                fontWeight: 600,
                letterSpacing: "-0.015em",
                margin: "0 0 10px",
              }}
            >
              Book instantly
            </h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#9A9CA3", margin: 0 }}>
              Consultations confirmed in the conversation — deposit taken,
              reminder sent, done.
            </p>
          </div>
        </div>
      </section>

      {/* live example */}
      <section
        data-reveal=""
        style={{
          ...container,
          padding: "40px 32px 100px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2
            style={{
              fontSize: 34,
              fontWeight: 600,
              letterSpacing: "-0.025em",
              margin: "0 0 12px",
            }}
          >
            See it in action
          </h2>
          <p style={{ fontSize: 16, color: "#9A9CA3", margin: 0 }}>
            A real enquiry, answered the moment it arrives.
          </p>
        </div>
        <div
          style={{
            maxWidth: 620,
            margin: "0 auto",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 18,
            padding: "28px 28px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              paddingBottom: 16,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: ACCENT,
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: 13, color: "#9A9CA3" }}>
              Live on Radiance Cosmetic Clinic&apos;s site · 11:41 PM AEST
            </span>
          </div>

          <ChatBubble align="flex-end" tone="neutral">
            Hi, do you do lip filler? How much is it roughly and is there
            anyone free this week?
          </ChatBubble>
          <ChatBubble align="flex-start" tone="accent" label="open•desk">
            Yes, lip filler starts from $450 for 1ml with Dr Nguyen. She has
            openings Wednesday 2pm and Friday 10am this week — want me to
            hold one?
          </ChatBubble>
          <ChatBubble align="flex-end" tone="neutral">
            Friday 10am works
          </ChatBubble>
          <ChatBubble align="flex-start" tone="accent" label="open•desk">
            Booked — Friday 10am with Dr Nguyen. A confirmation and consent
            form are on their way to your inbox now.
          </ChatBubble>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              paddingTop: 4,
              fontSize: 12.5,
              color: "#6C6E75",
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: ACCENT,
                display: "inline-block",
              }}
            />
            <span>Resolved in 41 seconds · no staff involved</span>
          </div>
        </div>
      </section>

      {/* compliance */}
      <section
        data-reveal=""
        style={{
          ...container,
          padding: "80px 32px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <p
          style={{
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: "-0.015em",
            textAlign: "center",
            margin: 0,
            color: "#C9CBD1",
          }}
        >
          Built with AHPRA advertising rules in mind from day one.
        </p>
      </section>

      {/* founder */}
      <section
        data-reveal=""
        style={{
          ...container,
          padding: "80px 32px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 40,
            maxWidth: 640,
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 18,
            padding: "36px 40px",
            background: "rgba(255,255,255,0.015)",
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              flexShrink: 0,
              borderRadius: "50%",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <Image
              src="/founder-photo.jpg"
              alt="Advaith Sudhir, founder of Opendesk"
              fill
              sizes="120px"
              style={{ objectFit: "cover" }}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                marginBottom: 4,
              }}
            >
              Advaith Sudhir
            </div>
            <div style={{ fontSize: 13, color: "#6C6E75", marginBottom: 12 }}>
              Founder, Opendesk
            </div>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#9A9CA3", margin: "0 0 14px" }}>
              Building Opendesk after working alongside Australian clinics —
              answering the enquiries they can&apos;t. Based in Sydney,
              talking to clinic owners every week.
            </p>
            <a
              href="mailto:advaith@getopendesk.com"
              className="email-link"
              style={{
                fontSize: 13.5,
                fontWeight: 500,
                color: ACCENT,
                paddingBottom: 1,
              }}
            >
              advaith@getopendesk.com
            </a>
          </div>
        </div>
      </section>

      {/* final CTA */}
      <section
        id="cta"
        data-reveal=""
        style={{
          ...container,
          padding: "40px 32px 120px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: -120,
            left: "50%",
            marginLeft: -320,
            width: 640,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(closest-side, rgba(110,159,255,0.08), transparent 70%)",
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />
        <h2
          style={{
            position: "relative",
            fontSize: 44,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            margin: "0 0 20px",
            textWrap: "balance",
          }}
        >
          Your next patient is asking right now.
        </h2>
        <p style={{ position: "relative", fontSize: 16, color: "#9A9CA3", margin: "0 0 40px" }}>
          Five founding-clinic pilot spots remain for this quarter.
        </p>
        <a
          href="#email-signup"
          className="btn-primary"
          style={{
            position: "relative",
            display: "inline-block",
            background: ACCENT,
            color: "#0B0C0E",
            fontSize: 15,
            fontWeight: 600,
            padding: "14px 28px",
            borderRadius: 10,
            letterSpacing: "-0.01em",
          }}
        >
          Book a pilot call
        </a>

        <div
          id="email-signup"
          style={{
            position: "relative",
            marginTop: 28,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 13.5, color: "#6C6E75" }}>
            Not ready to talk? Leave your name and email and we&apos;ll reach
            out.
          </span>
          <EmailSignupForm />
        </div>
      </section>

      {/* footer */}
      <footer style={{ position: "relative", zIndex: 2, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            padding: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 2,
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "#9A9CA3",
            }}
          >
            <span>open</span>
            <span style={{ color: ACCENT, fontSize: 16, lineHeight: 1 }}>•</span>
            <span>desk</span>
          </div>
          <div style={{ display: "flex", gap: 28, fontSize: 13.5 }}>
            <a href="#" className="footer-link">
              Privacy
            </a>
            <a href="#" className="footer-link">
              Contact
            </a>
          </div>
          <div style={{ fontSize: 13, color: "#6C6E75" }}>
            © 2026 Opendesk. Made in Australia.
          </div>
        </div>
      </footer>
    </div>
  );
}
