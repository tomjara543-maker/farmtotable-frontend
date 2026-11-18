import type { SVGProps } from "react";
import {
  AppleIcon,
  BasketIcon,
  CarrotIcon,
  CoffeeIcon,
  EggIcon,
  LeafIcon,
  SaladIcon,
  WheatIcon,
} from "@/components/landing/icons";

const categoryIcons: [string, typeof AppleIcon][] = [
  ["fruta", AppleIcon],
  ["hortaliza", CarrotIcon],
  ["verdura", SaladIcon],
  ["tubérculo", CarrotIcon],
  ["tuberculo", CarrotIcon],
  ["grano", WheatIcon],
  ["cereal", WheatIcon],
  ["lácteo", EggIcon],
  ["lacteo", EggIcon],
  ["huevo", EggIcon],
  ["hierba", LeafIcon],
  ["aromática", LeafIcon],
  ["café", CoffeeIcon],
  ["miel", LeafIcon],
];

export default function CategoryIcon({ category, size = 24, ...props }: { category?: string; size?: number } & SVGProps<SVGSVGElement>) {
  const c = (category ?? "").toLowerCase();
  const Icon = categoryIcons.find(([key]) => c.includes(key))?.[1] ?? BasketIcon;
  return <Icon size={size} {...props} />;
}
