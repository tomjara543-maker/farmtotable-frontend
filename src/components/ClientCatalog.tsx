"use client";

import { CatalogSkeleton, ProductGrid } from "@/components/ProductGrid";
import type { Product } from "@/lib/api";
import { useApi } from "@/lib/useApi";

export default function ClientCatalog() {
  const { data, error } = useApi<Product[]>("/products");
  if (error) return <p className="alert-error">{error}</p>;
  if (!data) return <CatalogSkeleton />;
  return <ProductGrid products={data} />;
}
