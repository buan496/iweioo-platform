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
        <p className="account-eyebrow">Authentication / 认证</p>
        <h1>账户登录没有完成</h1>
        <p>请返回账户中心后重试。若问题持续发生，请在反馈中附上参考编号。</p>
        <p className="auth-error-en">
          Account sign-in did not complete. Return and try again. Include the reference if the
          problem continues.
        </p>
        {reference ? <code>{reference}</code> : null}
        <Link className="account-button" href="/zh/">
          返回账户中心
        </Link>
      </section>
    </main>
  );
}
