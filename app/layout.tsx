import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-geist",
  display: "swap",
});

const siteUrl = "https://getopendesk.com";
const description =
  "Opendesk is an AI enquiry assistant for Australian cosmetic clinics. It answers patient enquiries, checks real availability and books consultations after hours — so no enquiry goes cold overnight.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Opendesk — AI Enquiry Assistant for Australian Cosmetic Clinics",
  description,
  openGraph: {
    title: "Opendesk — AI Enquiry Assistant for Australian Cosmetic Clinics",
    description,
    url: siteUrl,
    siteName: "Opendesk",
    locale: "en_AU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Opendesk — AI Enquiry Assistant for Australian Cosmetic Clinics",
    description,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-AU" className={geist.variable}>
      <body>{children}</body>
    </html>
  );
}
