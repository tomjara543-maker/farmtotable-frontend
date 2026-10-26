import type { Metadata } from "next";
import { Suspense } from "react";
import ClientCatalog from "@/components/ClientCatalog";
import PageHeader from "@/components/PageHeader";
import { CatalogSkeleton, ProductGrid } from "@/components/ProductGrid";
import { api, DEMO_MODE, Product } from "@/lib/api";

export const metadata: Metadata = {
  title: "Catálogo de temporada | FarmToTable",
  description: "Productos agrícolas de temporada, directos del productor.",
};

export default function CatalogPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Catálogo" subtitle="Productos frescos, directos de la granja. Precios por kg según la oferta del día." />
      {DEMO_MODE ? (
        <ClientCatalog />
      ) : (
        <Suspense fallback={<CatalogSkeleton />}>
          <ProductList />
        </Suspense>
      )}
    </div>
  );
}

async function ProductList() {
  let products: Product[] = [];
  try {
    products = await api<Product[]>("/products");
  } catch {
    return <p className="alert-error">No se pudo conectar con el API Gateway. ¿Está levantado el backend?</p>;
  }
  return <ProductGrid products={products} />;
}
