import type { Metadata } from "next";
import DemoClient from "./DemoClient";

export const metadata: Metadata = {
  title: "Live Demo — Opendesk",
  description:
    "Try the exact patient chat experience Opendesk gives real cosmetic clinic patients, shown on a fictional demo clinic.",
  robots: { index: false, follow: false },
};

export default function DemoPage() {
  return <DemoClient />;
}
