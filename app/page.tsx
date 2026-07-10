import Link from "next/link";

export default function IndexPage() {
  return (
    <main className="shell hero">
      <p className="eyebrow">iweioo.com</p>
      <h1>iweioo</h1>
      <p className="lead">请选择语言 / Choose a language.</p>
      <div className="actions">
        <Link className="button" href="/zh/">
          中文
        </Link>
        <Link className="button secondary" href="/en/">
          English
        </Link>
      </div>
    </main>
  );
}
