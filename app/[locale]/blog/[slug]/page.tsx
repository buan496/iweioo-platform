import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { dictionary, isLocale, locales } from "@/lib/i18n";
import { getPost, getPosts } from "@/lib/posts";
import type { Locale } from "@/lib/types";

type PageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    getPosts(locale).map((post) => ({
      locale,
      slug: post.slug
    }))
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "zh";
  const post = getPost(locale, slug);

  if (!post) {
    return {};
  }

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `/${locale}/blog/${post.slug}/`
    }
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { locale: localeParam, slug } = await params;
  if (!isLocale(localeParam)) {
    notFound();
  }

  const locale: Locale = localeParam;
  const copy = dictionary[locale];
  const post = getPost(locale, slug);

  if (!post) {
    notFound();
  }

  return (
    <main className="inner-page">
      <section className="shell inner-hero">
        <p className="eyebrow">
          <time dateTime={post.date}>{post.date}</time>
        </p>
        <h1>{post.title}</h1>
        <p className="lead">{post.description}</p>
        <div className="tag-list">
          {post.tags.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      </section>
      <article className="shell prose band">
        <MDXRemote source={post.body} />
      </article>
      <div className="shell">
        <Link className="text-link" href={`/${locale}/blog/`}>{copy.common.backToBlog}</Link>
      </div>
    </main>
  );
}
