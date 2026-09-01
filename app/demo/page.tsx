import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Demo — Opendesk Inventory Intelligence",
  description:
    "Try Opendesk with a clinic's worth of sample data — dashboard, stock, consumables, supplies per procedure, treatment margin and the log-a-treatment flow.",
};

export default function DemoPage() {
  return (
    <iframe
      src="/stockroom-prototype.html"
      title="Opendesk — Inventory Intelligence for Cosmetic Clinics"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        border: "none",
        display: "block",
      }}
    />
  );
}
