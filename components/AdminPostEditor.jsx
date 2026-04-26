'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';

const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <div className="admin-editor-loading">Loading editor...</div>,
});

function slugifyValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function plainTextFromHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildExcerptFromContent(value) {
  return plainTextFromHtml(value).slice(0, 180);
}

function prettyPrintSchemas(value) {
  if (!Array.isArray(value) || !value.length) {
    return '';
  }

  return JSON.stringify(value, null, 2);
}

function createEmptyFaqItem() {
  return { question: '', answer: '' };
}

function createEmptyHowToStep() {
  return { name: '', text: '' };
}

export default function AdminPostEditor({ post }) {
  const [title, setTitle] = useState(post?.title || '');
  const [slug, setSlug] = useState(post?.slug || '');
  const [slugTouched, setSlugTouched] = useState(Boolean(post?.slug));
  const [excerpt, setExcerpt] = useState(post?.excerpt || '');
  const [authorName, setAuthorName] = useState(post?.authorName || 'Digi Web Tech Team');
  const [categories, setCategories] = useState(
    (post?.categories || []).map((item) => item.name).join(', '),
  );
  const [tags, setTags] = useState((post?.tags || []).map((item) => item.name).join(', '));
  const [coverImage, setCoverImage] = useState(post?.coverImage || '');
  const [coverImageAlt, setCoverImageAlt] = useState(post?.coverImageAlt || '');
  const [metaTitle, setMetaTitle] = useState(post?.metaTitle || '');
  const [metaDescription, setMetaDescription] = useState(post?.metaDescription || '');
  const [status, setStatus] = useState(post?.status || 'draft');
  const [contentHtml, setContentHtml] = useState(post?.contentHtml || '');
  const [showTableOfContents, setShowTableOfContents] = useState(
    post?.showTableOfContents ?? true,
  );
  const [faqItems, setFaqItems] = useState(
    post?.faqItems?.length ? post.faqItems : [createEmptyFaqItem()],
  );
  const [howToSteps, setHowToSteps] = useState(
    post?.howToSteps?.length ? post.howToSteps : [createEmptyHowToStep()],
  );
  const [customSchemas, setCustomSchemas] = useState(prettyPrintSchemas(post?.customSchemas));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const contentText = plainTextFromHtml(contentHtml);
  const previewPath = `/blog/${slug || 'your-post-slug'}`;
  const excerptLength = excerpt.trim().length;
  const metaTitleLength = metaTitle.trim().length;
  const metaDescriptionLength = metaDescription.trim().length;
  const contentWordCount = contentText ? contentText.split(/\s+/).filter(Boolean).length : 0;
  const populatedFaqCount = faqItems.filter((item) => item.question && item.answer).length;
  const populatedHowToCount = howToSteps.filter((item) => item.name && item.text).length;

  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, 4, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ align: [] }],
        ['link', 'clean'],
      ],
    }),
    [],
  );

  function insertHtmlSnippet(html) {
    setContentHtml((current) => `${current || ''}${current ? '<p><br></p>' : ''}${html}`);
  }

  function handleTitleChange(event) {
    const nextTitle = event.target.value;
    setTitle(nextTitle);

    if (!slugTouched) {
      setSlug(slugifyValue(nextTitle));
    }
  }

  function updateFaqItem(index, key, value) {
    setFaqItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );
  }

  function updateHowToStep(index, key, value) {
    setHowToSteps((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError('');
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      setUploading(false);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.message || 'Image upload failed.');
        return;
      }

      const data = await response.json();
      setCoverImage(data.url);
      setCoverImageAlt(coverImageAlt || file.name.replace(/\.[^.]+$/, ''));
    } catch {
      setUploading(false);
      setError('Image upload failed. Please try again.');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please add a post title.');
      return;
    }

    if (!slug.trim()) {
      setError('Please add a URL slug.');
      return;
    }

    if (!contentText) {
      setError('Please add some content before saving the post.');
      return;
    }

    setSaving(true);

    const payload = {
      title,
      slug,
      excerpt,
      authorName,
      categories,
      tags,
      coverImage,
      coverImageAlt,
      metaTitle,
      metaDescription,
      status,
      contentHtml,
      showTableOfContents,
      faqItems,
      howToSteps,
      customSchemas,
    };

    try {
      const response = await fetch(post ? `/api/admin/posts/${post.id}` : '/api/admin/posts', {
        method: post ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      setSaving(false);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.message || 'Post save failed.');
        return;
      }

      window.location.href = '/admin';
    } catch {
      setSaving(false);
      setError('Post save failed. Please check your connection and try again.');
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm('Delete this post permanently?');

    if (!confirmed || !post) {
      return;
    }

    const response = await fetch(`/api/admin/posts/${post.id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.message || 'Delete failed.');
      return;
    }

    window.location.href = '/admin';
  }

  return (
    <form className="admin-editor-shell" onSubmit={handleSubmit}>
      <div className="admin-editor-header">
        <div>
          <span className="eyebrow">Content Editor</span>
          <h1>{post ? 'Edit Post' : 'Create Post'}</h1>
          <p className="admin-helper-text">
            Write the article, add SEO structure, then publish when the page looks complete.
          </p>
        </div>
        <div className="admin-editor-actions">
          {post ? (
            <button type="button" className="btn btn-secondary" onClick={handleDelete}>
              Delete
            </button>
          ) : null}
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Saving...' : status === 'published' ? 'Save & Publish' : 'Save Draft'}
          </button>
        </div>
      </div>

      {error ? <p className="admin-form-error">{error}</p> : null}

      <div className="admin-editor-grid">
        <div className="admin-editor-main">
          <label>
            Title
            <input type="text" value={title} onChange={handleTitleChange} required />
          </label>
          <p className="admin-helper-text">
            Use a clear headline people would want to click in search results.
          </p>

          <label>
            Slug
            <input
              type="text"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(slugifyValue(event.target.value));
              }}
              required
            />
          </label>
          <div className="admin-field-meta">
            <span className="admin-helper-text">Post URL preview</span>
            <code>{previewPath}</code>
          </div>

          <label>
            Excerpt
            <textarea
              rows="4"
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
            />
          </label>
          <div className="admin-field-meta">
            <span className="admin-helper-text">
              Short summary shown in blog cards and search snippets.
            </span>
            <button
              type="button"
              className="admin-text-button"
              onClick={() => setExcerpt(buildExcerptFromContent(contentHtml))}
            >
              Auto-fill from content
            </button>
            <span>{excerptLength} chars</span>
          </div>

          <div className="admin-block-library">
            <div className="admin-editor-richtext-head">
              <span>SEO Content Blocks</span>
              <span className="admin-helper-text">
                Insert ready-made sections into the article body.
              </span>
            </div>
            <div className="admin-block-library-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  insertHtmlSnippet(
                    '<h2>Key Takeaways</h2><ul><li>First takeaway</li><li>Second takeaway</li><li>Third takeaway</li></ul>',
                  )
                }
              >
                Key Takeaways
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  insertHtmlSnippet(
                    '<div class="blog-cta-box"><strong>Need expert help?</strong><p>Add a short call to action here with one clear next step.</p><p><a href="/contact">Talk to our team</a></p></div>',
                  )
                }
              >
                CTA Box
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  insertHtmlSnippet(
                    '<h2>Comparison Table</h2><table><thead><tr><th>Feature</th><th>Option A</th><th>Option B</th></tr></thead><tbody><tr><td>Example point</td><td>Yes</td><td>No</td></tr><tr><td>Second point</td><td>Included</td><td>Optional</td></tr></tbody></table>',
                  )
                }
              >
                Comparison Table
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  insertHtmlSnippet(
                    '<h2>Pros and Cons</h2><div class="blog-pros-cons"><div><h3>Pros</h3><ul><li>First benefit</li><li>Second benefit</li></ul></div><div><h3>Cons</h3><ul><li>First limitation</li><li>Second limitation</li></ul></div></div>',
                  )
                }
              >
                Pros & Cons
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  insertHtmlSnippet(
                    '<h2>Frequently Asked Questions</h2><h3>Question one?</h3><p>Add the answer here.</p><h3>Question two?</h3><p>Add the answer here.</p>',
                  )
                }
              >
                FAQ Section
              </button>
            </div>
          </div>

          <div className="admin-editor-richtext">
            <div className="admin-editor-richtext-head">
              <span>Content</span>
              <span className="admin-helper-text">{contentWordCount} words</span>
            </div>
            <ReactQuill
              theme="snow"
              value={contentHtml}
              onChange={setContentHtml}
              modules={modules}
              placeholder="Write your blog post here..."
            />
          </div>
          <p className="admin-helper-text">
            Use headings, lists, tables, and short paragraphs to help both readers and search
            engines understand the page.
          </p>
        </div>

        <aside className="admin-editor-sidebar">
          <label className="admin-toggle-field">
            <span>Table of Contents</span>
            <input
              type="checkbox"
              checked={showTableOfContents}
              onChange={(event) => setShowTableOfContents(event.target.checked)}
            />
          </label>
          <p className="admin-helper-text">
            When enabled, the blog page will automatically build a TOC from your H2 to H4 headings.
          </p>

          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>
          <p className="admin-helper-text">
            Save as draft while working, then switch to published when ready to go live.
          </p>

          <label>
            Author Name
            <input
              type="text"
              value={authorName}
              onChange={(event) => setAuthorName(event.target.value)}
            />
          </label>

          <label>
            Categories
            <input
              type="text"
              value={categories}
              onChange={(event) => setCategories(event.target.value)}
              placeholder="SEO, Web Development"
            />
          </label>
          <p className="admin-helper-text">Separate categories with commas.</p>

          <label>
            Tags
            <input
              type="text"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="seo, nextjs, performance"
            />
          </label>
          <p className="admin-helper-text">Use short keyword-style tags separated with commas.</p>

          <label>
            Cover Image URL
            <input
              type="url"
              value={coverImage}
              onChange={(event) => setCoverImage(event.target.value)}
            />
          </label>

          <label className="admin-upload-field">
            Upload Cover Image
            <input type="file" accept="image/*" onChange={handleImageUpload} />
            <span>{uploading ? 'Uploading image...' : 'Choose an image file'}</span>
          </label>
          {coverImage ? (
            <div className="admin-image-preview">
              <img src={coverImage} alt={coverImageAlt || 'Cover preview'} />
            </div>
          ) : null}

          <label>
            Cover Image Alt
            <input
              type="text"
              value={coverImageAlt}
              onChange={(event) => setCoverImageAlt(event.target.value)}
            />
          </label>

          <label>
            Meta Title
            <input
              type="text"
              value={metaTitle}
              onChange={(event) => setMetaTitle(event.target.value)}
            />
          </label>
          <div className="admin-field-meta">
            <span className="admin-helper-text">Recommended: 50 to 60 characters.</span>
            <span>{metaTitleLength} chars</span>
          </div>

          <label>
            Meta Description
            <textarea
              rows="4"
              value={metaDescription}
              onChange={(event) => setMetaDescription(event.target.value)}
            />
          </label>
          <div className="admin-field-meta">
            <span className="admin-helper-text">Recommended: 140 to 160 characters.</span>
            <span>{metaDescriptionLength} chars</span>
          </div>

          <div className="admin-schema-builder">
            <div className="admin-editor-richtext-head">
              <span>FAQ Schema</span>
              <span className="admin-helper-text">{populatedFaqCount} ready items</span>
            </div>
            {faqItems.map((item, index) => (
              <div key={`faq-${index}`} className="admin-schema-card">
                <label>
                  Question
                  <input
                    type="text"
                    value={item.question}
                    onChange={(event) => updateFaqItem(index, 'question', event.target.value)}
                    placeholder="What is SEO friendly content?"
                  />
                </label>
                <label>
                  Answer
                  <textarea
                    rows="3"
                    value={item.answer}
                    onChange={(event) => updateFaqItem(index, 'answer', event.target.value)}
                    placeholder="Write a direct answer here."
                  />
                </label>
                {faqItems.length > 1 ? (
                  <button
                    type="button"
                    className="admin-text-button"
                    onClick={() =>
                      setFaqItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
                    }
                  >
                    Remove FAQ item
                  </button>
                ) : null}
              </div>
            ))}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setFaqItems((current) => [...current, createEmptyFaqItem()])}
            >
              Add FAQ Item
            </button>
          </div>

          <div className="admin-schema-builder">
            <div className="admin-editor-richtext-head">
              <span>HowTo Schema</span>
              <span className="admin-helper-text">{populatedHowToCount} ready steps</span>
            </div>
            {howToSteps.map((item, index) => (
              <div key={`howto-${index}`} className="admin-schema-card">
                <label>
                  Step Title
                  <input
                    type="text"
                    value={item.name}
                    onChange={(event) => updateHowToStep(index, 'name', event.target.value)}
                    placeholder="Step 1: Audit the current page"
                  />
                </label>
                <label>
                  Step Details
                  <textarea
                    rows="3"
                    value={item.text}
                    onChange={(event) => updateHowToStep(index, 'text', event.target.value)}
                    placeholder="Explain what happens in this step."
                  />
                </label>
                {howToSteps.length > 1 ? (
                  <button
                    type="button"
                    className="admin-text-button"
                    onClick={() =>
                      setHowToSteps((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    Remove Step
                  </button>
                ) : null}
              </div>
            ))}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setHowToSteps((current) => [...current, createEmptyHowToStep()])}
            >
              Add HowTo Step
            </button>
          </div>

          <label>
            Custom Schema JSON-LD
            <textarea
              rows="10"
              value={customSchemas}
              onChange={(event) => setCustomSchemas(event.target.value)}
              placeholder={'[\n  {\n    "@context": "https://schema.org",\n    "@type": "Review"\n  }\n]'}
            />
          </label>
          <p className="admin-helper-text">
            Paste one schema object or an array of schema objects for advanced JSON-LD.
          </p>
        </aside>
      </div>
    </form>
  );
}
