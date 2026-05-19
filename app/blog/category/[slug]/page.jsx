import SiteShell from '@/components/SiteShell';
import { isMissingDatabaseConfigError } from '@/lib/db';
import {
  getAllCategories,
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
      <small>Strategy, visibility, performance</small>
    </a>
  );
}

export async function generateStaticParams() {
  try {
    const categories = await getAllCategories();
    return categories.map((category) => ({ slug: category.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  let categories = [];

  try {
    categories = await getAllCategories();
  } catch (error) {
    if (!isMissingDatabaseConfigError(error)) {
      throw error;
    }
  }

  const category = categories.find((item) => item.slug === slug);
  const name = category?.name || 'Category';

  return {
    title: `${name} Articles | ${siteConfig.name}`,
    description: `Browse ${name} articles and insights from ${siteConfig.name}.`,
    alternates: {
      canonical: `/blog/category/${slug}`,
    },
  };
}

export default async function BlogCategoryPage({ params }) {
  const { slug } = await params;
  let databaseUnavailable = false;
  let posts = [];
  let categories = [];

  try {
    [posts, categories] = await Promise.all([
      getPublishedPosts({ category: slug }),
      getAllCategories(),
    ]);
  } catch (error) {
    if (!isMissingDatabaseConfigError(error)) {
      throw error;
    }

    databaseUnavailable = true;
  }

  const category = categories.find((item) => item.slug === slug);
  const heading = category?.name || 'Category';

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${heading} Articles`,
    url: absoluteUrl(`/blog/category/${slug}`),
  };

  return (
    <SiteShell currentPath="/blog" schema={schema}>
      <section className="section-gap blog-taxonomy-shell">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Category</span>
            <h1>{heading}</h1>
            <p>
              {databaseUnavailable
                ? 'Add your MySQL connection values to load category posts.'
                : `${posts.length} published article${posts.length === 1 ? '' : 's'} in this category.`}
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

          {databaseUnavailable ? (
            <div className="blog-empty-state">
              <h2>Blog setup is almost ready.</h2>
              <p>Add your MySQL connection values to load category posts.</p>
            </div>
          ) : !posts.length ? (
            <div className="blog-empty-state">
              <h2>No posts in this category yet.</h2>
              <p>Explore another category or return to the main blog.</p>
              <a className="btn" href="/blog">Back to Blog</a>
            </div>
          ) : null}
        </div>
      </section>
    </SiteShell>
  );
}
