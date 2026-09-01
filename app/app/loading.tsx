import { paper, stone } from "../theme";

export default function Loading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: paper,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: stone,
        fontFamily: "'Public Sans', system-ui, sans-serif",
        fontSize: 14,
      }}
    >
      Loading…
    </div>
  );
}
