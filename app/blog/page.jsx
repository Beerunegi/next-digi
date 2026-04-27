import SiteShell from '@/components/SiteShell';
import { isMissingDatabaseConfigError } from '@/lib/db';
import {
  getAllCategories,
  getAllTags,
  getPublishedPosts,
} from '@/lib/blog';
import { absoluteUrl, siteConfig } from '@/lib/site-config';

export const revalidate = 300;

export const metadata = {
  title: `Digital Marketing Blog | ${siteConfig.name}`,
  description:
    'Explore SEO, AIO, GEO, paid ads, web strategy, and growth insights from Digi Web Tech.',
  alternates: {
    canonical: '/blog',
  },
};

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
      <small>SEO, AIO, GEO, web growth</small>
    </a>
  );
}

export default async function BlogIndexPage({ searchParams }) {
  const params = await searchParams;
  const query = String(params?.q || '').trim();
  let databaseUnavailable = false;
  let posts = [];
  let categories = [];
  let tags = [];

  try {
    [posts, categories, tags] = await Promise.all([
      getPublishedPosts({ query }),
      getAllCategories(),
      getAllTags(),
    ]);
  } catch (error) {
    if (!isMissingDatabaseConfigError(error)) {
      throw error;
    }

    databaseUnavailable = true;
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `${siteConfig.name} Blog`,
    description: metadata.description,
    url: absoluteUrl('/blog'),
  };

  return (
    <SiteShell currentPath="/blog" schema={schema}>
      <section className="section-gap blog-hero">
        <div className="container blog-hero-grid">
          <div>
            <span className="eyebrow">Insights & Strategy</span>
            <h1>SEO, AIO, GEO, and web growth content built for discovery.</h1>
            <p>
              Browse practical articles from our team on search visibility, website
              performance, paid growth, and modern digital execution.
            </p>
          </div>
          <form className="blog-search-card" action="/blog" method="get">
            <label htmlFor="blog-search" className="blog-search-label">
              Search the blog
            </label>
            <input
              id="blog-search"
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search SEO, AIO, website, CRO..."
            />
            <button type="submit" className="btn">
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="section-gap blog-section">
        <div className="container blog-layout">
          <aside className="blog-sidebar">
            <div className="blog-filter-card">
              <h3>Categories</h3>
              <div className="blog-taxonomy-list">
                {categories.map((category) => (
                  <a key={category.slug} href={`/blog/category/${category.slug}`}>
                    {category.name}
                    <span>{category.count}</span>
                  </a>
                ))}
              </div>
            </div>
            <div className="blog-filter-card">
              <h3>Tags</h3>
              <div className="blog-tag-cloud">
                {tags.map((tag) => (
                  <a key={tag.slug} href={`/blog/tag/${tag.slug}`}>
                    #{tag.name}
                  </a>
                ))}
              </div>
            </div>
          </aside>

          <div>
            {query ? (
              <div className="blog-results-meta">
                <p>
                  Showing {posts.length} result{posts.length === 1 ? '' : 's'} for{' '}
                  <strong>{query}</strong>.
                </p>
              </div>
            ) : null}

            <div className="blog-post-grid">
              {posts.map((post) => (
                <article key={post.id} className="blog-card">
                  <BlogCardMedia post={post} />
                  <div className="blog-card-body">
                    <div className="blog-card-meta">
                      <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                      <span>{post.readingTimeMinutes} min read</span>
                    </div>
                    <h2>
                      <a href={`/blog/${post.slug}`}>{post.title}</a>
                    </h2>
                    <p>{post.excerpt}</p>
                    <div className="blog-card-taxonomy">
                      {post.categories.map((category) => (
                        <a key={category.slug} href={`/blog/category/${category.slug}`}>
                          {category.name}
                        </a>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {databaseUnavailable ? (
              <div className="blog-empty-state">
                <h2>Blog setup is almost ready.</h2>
                <p>
                  Add your MySQL connection values to the environment, and published
                  posts will appear here automatically.
                </p>
              </div>
            ) : !posts.length ? (
              <div className="blog-empty-state">
                <h2>No posts found.</h2>
                <p>Try another keyword, or explore one of the categories on the left.</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
