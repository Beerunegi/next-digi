import { notFound } from 'next/navigation';

import SiteShell from '@/components/SiteShell';
import { preparePostContent } from '@/lib/blog-content';
import { isMissingDatabaseConfigError } from '@/lib/db';
import { getPublishedPostBySlug, getPublishedSlugs } from '@/lib/blog';
import { absoluteUrl, siteConfig } from '@/lib/site-config';

export const revalidate = 300;

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function readingLabel(post) {
  return `${post.readingTimeMinutes} min read`;
}

export async function generateStaticParams() {
  try {
    const slugs = await getPublishedSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  let post;

  try {
    post = await getPublishedPostBySlug(slug);
  } catch (error) {
    if (isMissingDatabaseConfigError(error)) {
      return {};
    }

    throw error;
  }

  if (!post) {
    return {};
  }

  const canonical = `/blog/${post.slug}`;

  return {
    title: post.metaTitle || `${post.title} | ${siteConfig.name}`,
    description: post.metaDescription || post.excerpt,
    alternates: {
      canonical,
    },
    openGraph: {
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.excerpt,
      url: absoluteUrl(canonical),
      type: 'article',
      publishedTime: post.publishedAt,
      images: post.coverImage ? [{ url: post.coverImage, alt: post.coverImageAlt || post.title }] : [],
    },
  };
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  let post;

  try {
    post = await getPublishedPostBySlug(slug);
  } catch (error) {
    if (isMissingDatabaseConfigError(error)) {
      notFound();
    }

    throw error;
  }

  if (!post) {
    notFound();
  }

  const { html: contentHtml, headings } = preparePostContent(post.contentHtml);
  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.metaDescription || post.excerpt,
      image: post.coverImage ? [post.coverImage] : undefined,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt || post.publishedAt,
      author: {
        '@type': 'Person',
        name: post.authorName,
      },
      publisher: {
        '@type': 'Organization',
        name: siteConfig.name,
        logo: {
          '@type': 'ImageObject',
          url: absoluteUrl('/images/favicon.svg'),
        },
      },
      mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: absoluteUrl('/blog') },
        { '@type': 'ListItem', position: 3, name: post.title, item: absoluteUrl(`/blog/${post.slug}`) },
      ],
    },
  ];

  if (post.faqItems.length) {
    schema.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: post.faqItems.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    });
  }

  if (post.howToSteps.length) {
    schema.push({
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: post.title,
      description: post.metaDescription || post.excerpt,
      step: post.howToSteps.map((item, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: item.name,
        text: item.text,
      })),
    });
  }

  schema.push(...post.customSchemas);
  const showTableOfContents = post.showTableOfContents && headings.length >= 3;

  return (
    <SiteShell currentPath="/blog" schema={schema}>
      <article className="section-gap blog-post-shell">
        <div className="container blog-post-layout">
          <header className="blog-post-hero">
            <div className="blog-post-hero-copy">
              <div className="blog-breadcrumbs">
                <a href="/blog">Blog</a>
                <span>/</span>
                <span>{post.title}</span>
              </div>

              <div className="blog-card-taxonomy blog-post-taxonomy">
                {post.categories.map((category) => (
                  <a key={category.slug} href={`/blog/category/${category.slug}`}>
                    {category.name}
                  </a>
                ))}
                {post.tags.map((tag) => (
                  <a key={tag.slug} href={`/blog/tag/${tag.slug}`}>
                    #{tag.name}
                  </a>
                ))}
              </div>

              <div className="blog-post-header">
                <span className="eyebrow">Growth Journal</span>
                <h1>{post.title}</h1>
                <p>{post.excerpt}</p>
              </div>

              <div className="blog-post-meta-strip">
                <div className="blog-post-meta-card">
                  <span className="blog-post-meta-label">Published</span>
                  <strong>{formatDate(post.publishedAt || post.createdAt)}</strong>
                </div>
                <div className="blog-post-meta-card">
                  <span className="blog-post-meta-label">Reading time</span>
                  <strong>{readingLabel(post)}</strong>
                </div>
                <div className="blog-post-meta-card">
                  <span className="blog-post-meta-label">Written by</span>
                  <strong>{post.authorName}</strong>
                </div>
              </div>
            </div>

            <div className="blog-post-cover">
              {post.coverImage ? (
                <img
                  src={post.coverImage}
                  alt={post.coverImageAlt || post.title}
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <div className="blog-post-cover-placeholder">
                  <span className="eyebrow">Featured Story</span>
                  <strong>{post.title}</strong>
                  <p>
                    Practical SEO, AIO, and growth ideas from the Digi Web Tech team.
                  </p>
                </div>
              )}
            </div>
          </header>

          <div className={`blog-post-body${showTableOfContents ? ' blog-post-body-has-toc' : ''}`}>
            {showTableOfContents ? (
              <aside className="blog-post-toc">
                <div className="blog-post-toc-card">
                  <span className="eyebrow">On This Page</span>
                  <h2>Table of Contents</h2>
                  <nav>
                    {headings.map((heading) => (
                      <a
                        key={heading.id}
                        href={`#${heading.id}`}
                        className={`toc-level-${heading.level}`}
                      >
                        {heading.text}
                      </a>
                    ))}
                  </nav>
                </div>
              </aside>
            ) : null}

            <div className="blog-post-main">
              <div className="blog-article-reading-bar">
                <span className="eyebrow">Article Overview</span>
                <p>
                  This article is structured for fast scanning, deeper reading, and search-first
                  learning across desktop and mobile.
                </p>
              </div>

              <div
                className="blog-article-content"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            </div>
          </div>

          {post.faqItems.length ? (
            <section className="blog-schema-section">
              <div className="section-head">
                <span className="eyebrow">FAQ</span>
                <h2>Frequently asked questions</h2>
              </div>
              <div className="blog-faq-list">
                {post.faqItems.map((item, index) => (
                  <article key={`${item.question}-${index}`} className="blog-faq-card">
                    <h3>{item.question}</h3>
                    <p>{item.answer}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {post.howToSteps.length ? (
            <section className="blog-schema-section">
              <div className="section-head">
                <span className="eyebrow">How To</span>
                <h2>Step-by-step breakdown</h2>
              </div>
              <div className="blog-howto-list">
                {post.howToSteps.map((item, index) => (
                  <article key={`${item.name}-${index}`} className="blog-howto-card">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <h3>{item.name}</h3>
                      <p>{item.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </article>
    </SiteShell>
  );
}
