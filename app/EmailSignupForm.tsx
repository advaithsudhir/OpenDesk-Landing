"use client";

import { useState } from "react";

export default function EmailSignupForm() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <span style={{ fontSize: 13.5, color: "#9A9CA3" }}>
        Thanks — we&apos;ll be in touch.
      </span>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        justifyContent: "center",
      }}
    >
      <input
        type="text"
        name="name"
        placeholder="Name"
        required
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 8,
          padding: "10px 14px",
          fontSize: 14,
          color: "#EDEDEF",
          fontFamily: "inherit",
          width: 160,
        }}
      />
      <input
        type="email"
        name="email"
        placeholder="Email"
        required
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 8,
          padding: "10px 14px",
          fontSize: 14,
          color: "#EDEDEF",
          fontFamily: "inherit",
          width: 200,
        }}
      />
      <button
        type="submit"
        className="submit-btn"
        style={{
          background: "transparent",
          color: "#EDEDEF",
          fontSize: 14,
          fontWeight: 500,
          padding: "10px 18px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.14)",
          fontFamily: "inherit",
          cursor: "pointer",
        }}
      >
        Submit
      </button>
    </form>
  );
}
