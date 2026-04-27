import SiteShell from '@/components/SiteShell';
import { isMissingDatabaseConfigError } from '@/lib/db';
import {
  getAllTags,
  getPublishedPosts,
} from '@/lib/blog';
import { absoluteUrl, siteConfig } from '@/lib/site-config';

export const revalidate = 300;

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function BlogCardMedia({ post }) {
  if (post.coverImage) {
    return (
      <a href={`/blog/${post.slug}`} className="blog-card-media">
        <img
          src={post.coverImage}
          alt={post.coverImageAlt || post.title}
          loading="lazy"
          decoding="async"
        />
      </a>
    );
  }

  return (
    <a href={`/blog/${post.slug}`} className="blog-card-media blog-card-media-placeholder">
      <span className="eyebrow">Featured Article</span>
      <strong>{post.title}</strong>
      <small>Search, content, conversion</small>
    </a>
  );
}

export async function generateStaticParams() {
  try {
    const tags = await getAllTags();
    return tags.map((tag) => ({ slug: tag.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  let tags = [];

  try {
    tags = await getAllTags();
  } catch (error) {
    if (!isMissingDatabaseConfigError(error)) {
      throw error;
    }
  }

  const tag = tags.find((item) => item.slug === slug);
  const name = tag?.name || 'Tag';

  return {
    title: `${name} Posts | ${siteConfig.name}`,
    description: `Browse blog posts tagged ${name} from ${siteConfig.name}.`,
    alternates: {
      canonical: `/blog/tag/${slug}`,
    },
  };
}

export default async function BlogTagPage({ params }) {
  const { slug } = await params;
  let databaseUnavailable = false;
  let posts = [];
  let tags = [];

  try {
    [posts, tags] = await Promise.all([
      getPublishedPosts({ tag: slug }),
      getAllTags(),
    ]);
  } catch (error) {
    if (!isMissingDatabaseConfigError(error)) {
      throw error;
    }

    databaseUnavailable = true;
  }

  const tag = tags.find((item) => item.slug === slug);
  const heading = tag?.name || 'Tag';

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${heading} Posts`,
    url: absoluteUrl(`/blog/tag/${slug}`),
  };

  return (
    <SiteShell currentPath="/blog" schema={schema}>
      <section className="section-gap blog-taxonomy-shell">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Tag</span>
            <h1>#{heading}</h1>
            <p>
              {databaseUnavailable
                ? 'Add your MySQL connection values to load tagged posts.'
                : `${posts.length} published article${posts.length === 1 ? '' : 's'} with this tag.`}
            </p>
          </div>

          <div className="blog-post-grid">
            {posts.map((post) => (
              <article key={post.id} className="blog-card">
                <BlogCardMedia post={post} />
                <div className="blog-card-body">
                  <div className="blog-card-meta">
                    <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                    <span>{post.readingTimeMinutes} min read</span>
                  </div>
                  <h2><a href={`/blog/${post.slug}`}>{post.title}</a></h2>
                  <p>{post.excerpt}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
