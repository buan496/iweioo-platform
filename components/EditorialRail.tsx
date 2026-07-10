import { EditorialPostCard } from "@/components/EditorialPostCard";
import type { Locale, Post } from "@/lib/types";

type EditorialRailProps = {
  locale: Locale;
  posts: Post[];
};

export function EditorialRail({ locale, posts }: EditorialRailProps) {
  if (posts.length === 0) {
    return null;
  }

  const railPosts = posts.length > 1 ? posts : [posts[0], posts[0], posts[0]];

  return (
    <div className="editorial-rail auto-rail" data-cursor="interactive">
      <div className="editorial-rail-track auto-rail-track">
        {[0, 1].map((groupIndex) => (
          <div
            className="auto-rail-group editorial-rail-group"
            key={groupIndex}
            aria-hidden={groupIndex > 0 ? "true" : undefined}
          >
            {railPosts.map((post, index) => (
              <EditorialPostCard
                locale={locale}
                post={post}
                key={`${groupIndex}-${post.slug}-${index}`}
                duplicate={groupIndex > 0 || (posts.length === 1 && index > 0)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
