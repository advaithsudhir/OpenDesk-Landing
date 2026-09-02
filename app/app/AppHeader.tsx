import Link from "next/link";
import LogoutButton from "./LogoutButton";
import { ink, sage, sageDeep, stone, line } from "../theme";

const navItems = [
  { href: "/app", label: "Dashboard", key: "dashboard" },
  { href: "/app/products", label: "Products", key: "products" },
  { href: "/app/stock", label: "Stock", key: "stock" },
  { href: "/app/consumables", label: "Consumables", key: "consumables" },
  { href: "/app/procedures", label: "Procedures", key: "procedures" },
  { href: "/app/log-treatment", label: "Log treatment", key: "logTreatment" },
  { href: "/app/staff", label: "Staff", key: "staff" },
] as const;

export default function AppHeader({
  clinicName,
  active,
}: {
  clinicName: string;
  active: (typeof navItems)[number]["key"];
}) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 32px",
        borderBottom: `1px solid ${line}`,
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <Link href="/app" style={{ fontSize: 17, color: ink, letterSpacing: "0.01em", textDecoration: "none" }}>
            open<span style={{ color: sage }}>•</span>desk
          </Link>
          <span
            style={{
              fontSize: 13,
              color: stone,
              borderLeft: `1px solid ${line}`,
              paddingLeft: 16,
            }}
          >
            {clinicName}
          </span>
        </div>
        <nav style={{ display: "flex", gap: 4 }}>
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                padding: "8px 12px",
                borderRadius: 6,
                textDecoration: "none",
                color: active === item.key ? sageDeep : stone,
                background: active === item.key ? "rgba(124,152,133,.14)" : "transparent",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <LogoutButton />
    </header>
  );
}
