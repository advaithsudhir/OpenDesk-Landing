import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Opendesk — Inventory Intelligence for Cosmetic Clinics",
  description:
    "Opendesk tracks clinic stock by batch and expiry, flags what's expiring or below reorder level, and deducts consumables automatically when a treatment is logged.",
  openGraph: {
    title: "Opendesk — Inventory Intelligence for Cosmetic Clinics",
    description:
      "Opendesk tracks clinic stock by batch and expiry, flags what's expiring or below reorder level, and deducts consumables automatically when a treatment is logged.",
  },
  twitter: {
    title: "Opendesk — Inventory Intelligence for Cosmetic Clinics",
    description:
      "Opendesk tracks clinic stock by batch and expiry, flags what's expiring or below reorder level, and deducts consumables automatically when a treatment is logged.",
  },
};

export default function Home() {
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
