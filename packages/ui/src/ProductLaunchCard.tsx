export type ProductLaunchStatus = "planned" | "available";

export type ProductLaunchCardProps = {
  appId: string;
  title: string;
  description: string;
  hostname: string;
  href: string;
  status: ProductLaunchStatus;
  statusLabel: string;
  actionLabel: string;
};

export function ProductLaunchCard({
  appId,
  title,
  description,
  hostname,
  href,
  status,
  statusLabel,
  actionLabel
}: ProductLaunchCardProps) {
  return (
    <article className="product-launch-card" data-app-id={appId}>
      <div className="product-launch-heading">
        <span className="product-app-id">{appId}</span>
        <span className={`product-status product-status-${status}`}>{statusLabel}</span>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="product-launch-footer">
        <span>{hostname}</span>
        {status === "available" ? (
          <a href={href}>{actionLabel}</a>
        ) : (
          <span aria-label={statusLabel}>{actionLabel}</span>
        )}
      </div>
    </article>
  );
}
