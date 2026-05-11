import { Waypoints } from "lucide-react";

export function UniroMark({ size = 24, className, title, strokeWidth = 2 }) {
  return (
    <Waypoints
      size={size}
      strokeWidth={strokeWidth}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
    />
  );
}

export function UniroWordmark({ size = 24, className, title = "Uniro" }) {
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: "0.5em" }}>
      <UniroMark size={size} title={title} />
      <span style={{ fontWeight: 600, letterSpacing: "-0.01em", fontSize: `calc(${size}px * 0.72)` }}>
        Uniro
      </span>
    </span>
  );
}

export default UniroMark;
