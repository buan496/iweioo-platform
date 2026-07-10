type HomeBridgeProps = {
  title: string;
  body: string;
};

export function HomeBridge({ title, body }: HomeBridgeProps) {
  return (
    <section className="home-bridge" aria-label={title}>
      <div className="shell home-bridge-inner">
        <span className="bridge-line" aria-hidden="true" />
        <div>
          <p className="section-kicker">Notes after shipping</p>
          <h2>{title}</h2>
          <p>{body}</p>
        </div>
      </div>
    </section>
  );
}
