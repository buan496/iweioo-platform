import Link from "next/link";
import type { Metadata } from "next";
import { dictionary, isLocale } from "@/lib/i18n";
import { getPosts } from "@/lib/posts";
import type { Locale } from "@/lib/types";

type PageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "zh";
  return {
    title: dictionary[locale].blog.title,
    description: dictionary[locale].blog.lead,
    alternates: {
      canonical: `/${locale}/blog/`
    }
  };
}

export default async function BlogPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "zh";
  const copy = dictionary[locale];
  const posts = getPosts(locale);

  return (
    <main className="inner-page">
      <section className="shell inner-hero">
        <p className="eyebrow">MDX</p>
        <h1>{copy.blog.title}</h1>
        <p className="lead">{copy.blog.lead}</p>
      </section>

      <section className="shell band">
        {posts.length > 0 ? (
          <div className="grid inner-card-grid">
            {posts.map((post) => (
              <article className="card" key={post.slug}>
                <div>
                  <h3>
                    <Link href={`/${locale}/blog/${post.slug}/`}>{post.title}</Link>
                  </h3>
                  <p>{post.description}</p>
                </div>
                <div className="tag-list">
                  {post.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="card-footer">
                  <time dateTime={post.date}>{post.date}</time>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty">{copy.blog.empty}</div>
        )}
      </section>
    </main>
  );
}
