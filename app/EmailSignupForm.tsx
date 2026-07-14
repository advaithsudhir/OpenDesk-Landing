"use client";

import { useState } from "react";

const FORMSPREE_ENDPOINT = process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT;

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: 14,
  color: "#EDEDEF",
  fontFamily: "inherit",
  width: 200,
};

type Status = "idle" | "submitting" | "success" | "error";

export default function EmailSignupForm() {
  const [status, setStatus] = useState<Status>("idle");

  if (status === "success") {
    return (
      <span style={{ fontSize: 13.5, color: "#9A9CA3" }}>
        Thanks — we&apos;ll be in touch.
      </span>
    );
  }

  if (!FORMSPREE_ENDPOINT) {
    return (
      <span style={{ fontSize: 13.5, color: "#9A9CA3" }}>
        This form isn&apos;t connected yet — email{" "}
        <a
          href="mailto:advaith@getopendesk.com?subject=Interested%20in%20an%20Opendesk%20pilot"
          className="email-link"
          style={{ color: "#6E9FFF" }}
        >
          advaith@getopendesk.com
        </a>{" "}
        instead.
      </span>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    const form = e.currentTarget;
    try {
      const res = await fetch(FORMSPREE_ENDPOINT as string, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: "center",
        width: "100%",
        maxWidth: 460,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <input type="text" name="name" placeholder="Name" required style={inputStyle} />
        <input
          type="text"
          name="clinic"
          placeholder="Clinic name"
          required
          style={inputStyle}
        />
        <input type="email" name="email" placeholder="Email" required style={inputStyle} />
      </div>
      <textarea
        name="message"
        placeholder="A short message (optional)"
        rows={3}
        style={{ ...inputStyle, width: "100%", resize: "vertical", fontFamily: "inherit" }}
      />
      <button
        type="submit"
        className="submit-btn"
        disabled={status === "submitting"}
        style={{
          background: "transparent",
          color: "#EDEDEF",
          fontSize: 14,
          fontWeight: 500,
          padding: "10px 18px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.14)",
          fontFamily: "inherit",
          cursor: status === "submitting" ? "default" : "pointer",
          opacity: status === "submitting" ? 0.6 : 1,
        }}
      >
        {status === "submitting" ? "Sending…" : "Submit"}
      </button>
      {status === "error" && (
        <span style={{ fontSize: 13, color: "#e08585" }}>
          Something went wrong — email{" "}
          <a
            href="mailto:advaith@getopendesk.com?subject=Interested%20in%20an%20Opendesk%20pilot"
            style={{ color: "#6E9FFF" }}
          >
            advaith@getopendesk.com
          </a>{" "}
          instead.
        </span>
      )}
    </form>
  );
}
