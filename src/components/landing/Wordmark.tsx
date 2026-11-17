import Link from "next/link";

/** Logo tipográfico: "farm" y "table" en peso alto, "to" en cursiva salvia. */
export default function Wordmark({ inverted = false, className = "" }: { inverted?: boolean; className?: string }) {
  return (
    <Link
      href="/"
      aria-label="FarmToTable, ir al inicio"
      className={`font-display text-2xl leading-none font-semibold tracking-tight ${
        inverted ? "text-mint" : "text-fg"
      } ${className}`}
    >
      farm<span className={`font-normal italic ${inverted ? "text-sage" : "text-brand"}`}>to</span>table
    </Link>
  );
}
