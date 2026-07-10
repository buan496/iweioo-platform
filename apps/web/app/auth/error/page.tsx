import Link from "next/link";

type AuthErrorPageProps = {
  searchParams: Promise<{ reference?: string }>;
};

export const dynamic = "force-dynamic";

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const { reference } = await searchParams;

  return (
    <main className="auth-error-page">
      <section className="auth-error-card">
        <p className="eyebrow">Authentication / 认证</p>
        <h1>登录没有完成</h1>
        <p>请返回门户后重试。若问题持续发生，请在反馈中附上下面的参考编号。</p>
        <p className="auth-error-en">
          Sign-in did not complete. Return to the portal and try again. Include the reference below
          if the problem continues.
        </p>
        {reference ? <code>{reference}</code> : null}
        <Link className="button" href="/zh/">
          返回 iweioo
        </Link>
      </section>
    </main>
  );
}
