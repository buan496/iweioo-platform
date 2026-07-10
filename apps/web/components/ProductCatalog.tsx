import { ProductLaunchCard } from "@iweioo/ui";
import { productApplications } from "@/data/products";
import type { Locale } from "@/lib/types";

type ProductCatalogProps = {
  locale: Locale;
  labels: {
    eyebrow: string;
    title: string;
    intro: string;
    planned: string;
    available: string;
    plannedAction: string;
    openAction: string;
  };
};

export function ProductCatalog({ locale, labels }: ProductCatalogProps) {
  return (
    <section className="shell product-catalog" id="products" aria-labelledby="products-title">
      <div className="section-head product-catalog-head">
        <div>
          <p className="section-kicker">{labels.eyebrow}</p>
          <h2 id="products-title">{labels.title}</h2>
          <p>{labels.intro}</p>
        </div>
      </div>
      <div className="product-launch-grid">
        {productApplications.map((product) => (
          <ProductLaunchCard
            key={product.appId}
            appId={product.appId}
            title={product.title[locale]}
            description={product.description[locale]}
            hostname={product.hostname}
            href={product.href}
            status={product.status}
            statusLabel={product.status === "available" ? labels.available : labels.planned}
            actionLabel={product.status === "available" ? labels.openAction : labels.plannedAction}
          />
        ))}
      </div>
    </section>
  );
}
