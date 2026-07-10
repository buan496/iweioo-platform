import Link from "next/link";
import type { Locale, Post } from "@/lib/types";

type EditorialPostCardProps = {
  locale: Locale;
  post: Post;
  duplicate?: boolean;
};

export function EditorialPostCard({ locale, post, duplicate = false }: EditorialPostCardProps) {
  return (
    <article
      className="editorial-card"
      data-cursor="interactive"
      aria-hidden={duplicate ? "true" : undefined}
    >
      <div className="editorial-meta">
        <time dateTime={post.date}>{post.date}</time>
        <span>{post.tags[0] ?? "Journal"}</span>
      </div>
      <Link href={`/${locale}/blog/${post.slug}/`} tabIndex={duplicate ? -1 : undefined}>
        <h3>{post.title}</h3>
        <p>{post.description}</p>
      </Link>
      <div className="tag-list">
        {post.tags.map((tag) => (
          <span className="tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}
