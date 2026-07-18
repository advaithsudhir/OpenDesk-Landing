"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Cormorant_Garamond, Inter } from "next/font/google";
import styles from "./demo.module.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const demoInter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter-demo",
});

const PHRASES = [
  "Questions? Ask anonymously",
  "Do you do lip filler?",
  "What do consults involve?",
  "Open Saturdays?",
  "Is there parking nearby?",
  "How much is a consult?",
];

type Chip = { l: string; n: number };

export default function DemoClient() {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const bubbleTextRef = useRef<HTMLSpanElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const leadFormRef = useRef<HTMLDivElement | null>(null);

  const stepRef = useRef(0);
  const nameRef = useRef("");
  const slotRef = useRef("");

  useEffect(() => {
    let phraseIndex = 0;
    const interval = setInterval(() => {
      const el = bubbleTextRef.current;
      if (!el || chatRef.current?.style.display === "flex") return;
      el.classList.add(styles.rotatorOut);
      setTimeout(() => {
        phraseIndex = (phraseIndex + 1) % PHRASES.length;
        el.textContent = PHRASES[phraseIndex];
        el.classList.remove(styles.rotatorOut);
        el.classList.add(styles.rotatorIn);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => el.classList.remove(styles.rotatorIn))
        );
      }, 350);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  function addMsg(text: string, cls: "bot" | "user" | "note") {
    const body = bodyRef.current;
    if (!body) return;
    const d = document.createElement("div");
    const clsName =
      cls === "bot" ? styles.odMsgBot : cls === "user" ? styles.odMsgUser : styles.odMsgNote;
    d.className = `${styles.odMsg} ${clsName}`;
    // User-typed text is never trusted as HTML; scripted bot copy may contain
    // a hardcoded <b> tag for emphasis, so only that path uses innerHTML.
    if (cls === "user") {
      d.textContent = text;
    } else {
      d.innerHTML = text;
    }
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
  }

  function showTyping(cb: () => void, ms = 850) {
    const body = bodyRef.current;
    if (!body) return;
    const t = document.createElement("div");
    t.className = styles.odTyping;
    t.innerHTML = "<span></span><span></span><span></span>";
    body.appendChild(t);
    body.scrollTop = body.scrollHeight;
    setTimeout(() => {
      t.remove();
      cb();
    }, ms);
  }

  function setChips(list: Chip[]) {
    const chips = chipsRef.current;
    if (!chips) return;
    chips.innerHTML = "";
    list.forEach((c) => {
      const b = document.createElement("div");
      b.className = styles.odChip;
      b.innerText = c.l;
      b.onclick = () => {
        addMsg(c.l, "user");
        chips.innerHTML = "";
        stepRef.current = c.n;
        runFlow(c.n);
      };
      chips.appendChild(b);
    });
  }

  function submitLead() {
    const n = (document.getElementById("odN") as HTMLInputElement | null)?.value.trim() || "there";
    const e = (document.getElementById("odE") as HTMLInputElement | null)?.value.trim() || "";
    nameRef.current = n;
    leadFormRef.current?.remove();
    addMsg(`${n} · ${e || "(email)"}`, "user");
    stepRef.current = 8;
    runFlow(8);
  }

  function runFlow(step: number) {
    const body = bodyRef.current;
    if (!body) return;

    if (step === 0) {
      showTyping(() => {
        addMsg(
          "Hi! I'm Ivy, Lumen Aesthetics' virtual assistant. Ask me anything about treatments, pricing or booking — no need to share your name, and no pressure to book.",
          "bot"
        );
        setChips([
          { l: "Do you do lip filler?", n: 1 },
          { l: "What are your hours?", n: 2 },
          { l: "How much do treatments cost?", n: 3 },
        ]);
      });
    } else if (step === 1) {
      showTyping(() => {
        addMsg(
          "Yes — dermal lip filler with our nurse injectors. Your first visit is always a consultation: we go through your goals, medical history and options together. No obligation to book anything on the day.",
          "bot"
        );
        setChips([
          { l: "What times are free this week?", n: 4 },
          { l: "Is it painful?", n: 5 },
        ]);
      });
    } else if (step === 2) {
      showTyping(() => {
        addMsg(
          "We're open Mon–Fri 9am–6pm and Saturday 9am–2pm — though I'm here anytime, including right now.",
          "bot"
        );
        setChips([{ l: "Can I book a time now?", n: 4 }]);
      });
    } else if (step === 3) {
      showTyping(() => {
        addMsg(
          "Pricing depends on the treatment and what you'd like to achieve, so it's quoted properly at your consult — that way it's accurate for you, not a generic number. Want me to check consult times?",
          "bot"
        );
        setChips([{ l: "Yes, show me times", n: 4 }]);
      });
    } else if (step === 5) {
      showTyping(() => {
        addMsg(
          "Most people describe it as a quick pinch — numbing cream is used for comfort, and your practitioner walks you through everything at the consult.",
          "bot"
        );
        setChips([{ l: "Okay — available times?", n: 4 }]);
      });
    } else if (step === 4) {
      showTyping(() => {
        addMsg("Here's what's open this week:", "bot");
        const wrap = document.createElement("div");
        wrap.className = styles.odSlots;
        ["Tue, 2:00pm", "Thu, 6:15pm", "Sat, 10:30am"].forEach((s) => {
          const b = document.createElement("div");
          b.className = styles.odSlot;
          b.innerText = s;
          b.onclick = () => {
            addMsg(s, "user");
            slotRef.current = s;
            stepRef.current = 6;
            runFlow(6);
          };
          wrap.appendChild(b);
        });
        body.appendChild(wrap);
        body.scrollTop = body.scrollHeight;
      });
    } else if (step === 6) {
      showTyping(() => {
        addMsg(
          `Lovely. To hold <b>${slotRef.current}</b> for you I just need a first name and email for the confirmation — that's all, and no phone calls unless you ask for one.`,
          "bot"
        );
        const f = document.createElement("div");
        f.className = styles.odLead;
        const nameInput = document.createElement("input");
        nameInput.id = "odN";
        nameInput.placeholder = "First name";
        const emailInput = document.createElement("input");
        emailInput.id = "odE";
        emailInput.type = "email";
        emailInput.placeholder = "Email address";
        const btn = document.createElement("button");
        btn.textContent = "Confirm my spot";
        btn.onclick = submitLead;
        f.append(nameInput, emailInput, btn);
        body.appendChild(f);
        body.scrollTop = body.scrollHeight;
        leadFormRef.current = f;
      });
    } else if (step === 8) {
      showTyping(() => {
        addMsg(
          `You're booked for <b>${slotRef.current}</b>, ${nameRef.current}. A confirmation is on its way, and we'll remind you beforehand. Anything else you'd like to know?`,
          "bot"
        );
        addMsg(
          "Demo ends here — in the live product the clinic is notified instantly, and every reply passes an AHPRA-safe filter first.",
          "note"
        );
      });
    }
  }

  function openChat() {
    if (chatRef.current) chatRef.current.style.display = "flex";
    bubbleRef.current?.classList.add(styles.hidden);
    if (stepRef.current === 0) runFlow(0);
  }

  function closeChat() {
    if (chatRef.current) chatRef.current.style.display = "none";
    bubbleRef.current?.classList.remove(styles.hidden);
  }

  return (
    <div className={`${styles.page} ${demoInter.variable} ${cormorant.variable}`}>
      {/* nav — matches the homepage header exactly */}
      <header
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 1080,
          margin: "0 auto",
          padding: "28px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 2,
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "#EDEDEF",
          }}
        >
          <span>open</span>
          <span style={{ color: "#6E9FFF", fontSize: 22, lineHeight: 1 }}>•</span>
          <span>desk</span>
        </Link>
        <Link
          href="/"
          className="nav-cta"
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "#EDEDEF",
            borderRadius: 8,
            padding: "8px 16px",
          }}
        >
          ← Back to Opendesk
        </Link>
      </header>

      {/* intro — same rhythm as the homepage hero */}
      <section
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 1080,
          margin: "0 auto",
          padding: "40px 32px 56px",
        }}
      >
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
            marginBottom: 24,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#6E9FFF",
              display: "inline-block",
            }}
          />
          <span>Live demo</span>
        </div>
        <h1
          style={{
            fontSize: 40,
            lineHeight: 1.1,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            margin: "0 0 16px",
            textWrap: "balance",
          }}
        >
          See Opendesk in action.
        </h1>
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.6,
            color: "#9A9CA3",
            margin: 0,
            maxWidth: 560,
          }}
        >
          Lumen Aesthetics is a fictional clinic, built to show exactly what a real patient sees. Click
          the chat bubble in the corner below to try the exact experience.
        </p>
      </section>

      {/* frame — same card language as the rest of the site */}
      <section
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 1080,
          margin: "0 auto",
          padding: "56px 32px 120px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className={styles.frame}>
          <div className={styles.frameScroll}>
          <div className={styles.lumenSite}>
            <nav className={styles.clinicNav}>
              <div className={styles.clinicBrand}>Lumen</div>
              <div className={styles.clinicLinks}>
                <span>Treatments</span>
                <span>Skin</span>
                <span>About</span>
                <span>Contact</span>
              </div>
              <button className={styles.clinicBookBtn}>Book</button>
            </nav>

            <section className={styles.clinicHero}>
              <div>
                <h1 className={styles.clinicHeroTitle}>
                  Considered care for <em className={styles.clinicHeroEm}>your natural</em> features.
                </h1>
                <p className={styles.clinicHeroText}>
                  Lumen Aesthetics is a nurse-led clinic offering injectables, advanced skin treatments
                  and laser — with every plan built around a proper consultation, never a trend.
                </p>
                <div className={styles.clinicHeroCta}>
                  <button className={styles.clinicHeroPrimary}>Book a consultation</button>
                  <button className={styles.clinicHeroGhost}>Our treatments</button>
                </div>
              </div>
              <div className={styles.clinicHeroVisual} />
            </section>

            <section className={styles.clinicTreatments}>
              <div className={styles.clinicEyebrow}>What we do</div>
              <h2 className={styles.clinicTreatmentsTitle}>Treatments</h2>
              <div className={styles.treatGrid}>
                <div className={styles.treatCard}>
                  <h3 className={styles.treatCardTitle}>Injectables</h3>
                  <p className={styles.treatCardText}>
                    Anti-wrinkle treatments and dermal filler, planned conservatively at consultation
                    with our nurse injectors.
                  </p>
                </div>
                <div className={styles.treatCard}>
                  <h3 className={styles.treatCardTitle}>Skin</h3>
                  <p className={styles.treatCardText}>
                    Medical-grade peels, skin needling and tailored programs for texture, tone and
                    congestion.
                  </p>
                </div>
                <div className={styles.treatCard}>
                  <h3 className={styles.treatCardTitle}>Laser</h3>
                  <p className={styles.treatCardText}>
                    Laser rejuvenation and hair removal with technology suited to a wide range of skin
                    types.
                  </p>
                </div>
              </div>
            </section>

            <footer className={styles.clinicFooter}>
              <div className={styles.clinicFooterBrand}>LUMEN AESTHETICS</div>
              <div>Mon–Fri 9–6 · Sat 9–2 · Paddington</div>
            </footer>
          </div>
        </div>

        <div ref={bubbleRef} className={styles.odBubble} onClick={openChat}>
          <div className={styles.pulse} />
          <div className={styles.rotator}>
            <span ref={bubbleTextRef}>Questions? Ask anonymously</span>
          </div>
        </div>

        <div ref={chatRef} className={styles.odChat}>
          <div className={styles.odHeader}>
            <div className={styles.odAvatar}>I</div>
            <div>
              <h3 className={styles.odHeaderTitle}>Ivy · Lumen Aesthetics</h3>
              <p className={styles.odHeaderStatus}>
                <span className={styles.odDot} /> Assistant — replies instantly
              </p>
            </div>
            <div className={styles.odClose} onClick={closeChat}>
              ×
            </div>
          </div>
          <div ref={bodyRef} className={styles.odBody} />
          <div ref={chipsRef} className={styles.odChips} />
          <div className={styles.odNotice}>
            Demo only — tap an option above. In the real product, patients can type their own
            questions too.
          </div>
          <div className={styles.odFoot}>
            Ivy is a virtual assistant, not a clinician. Nothing here is medical advice.
          </div>
        </div>
        </div>
      </section>

      {/* footer — matches the homepage footer */}
      <footer
        style={{
          position: "relative",
          zIndex: 2,
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
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
            <span style={{ color: "#6E9FFF", fontSize: 16, lineHeight: 1 }}>•</span>
            <span>desk</span>
          </div>
          <div style={{ fontSize: 13, color: "#6C6E75" }}>
            © 2026 Opendesk. Made in Australia.
          </div>
        </div>
      </footer>
    </div>
  );
}
