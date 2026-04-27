import sanitizeHtml from 'sanitize-html';
import slugify from 'slugify';

import {
  normalizeImageUrl,
  normalizeFaqItems,
  normalizeHowToSteps,
  parseCustomSchemas,
} from './blog-content';
import { connectToDatabase } from './db';

function stripHtml(value = '') {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function slugifyValue(value) {
  return slugify(String(value || '').trim(), { lower: true, strict: true });
}

function normalizeTaxonomyValues(value) {
  const values = Array.isArray(value)
    ? value
    : String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

  return [...new Set(values)].map((item) => ({
    name: item,
    slug: slugifyValue(item),
  }));
}

function sanitizePostHtml(contentHtml) {
  return sanitizeHtml(contentHtml || '', {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'div',
      'img',
      'h1',
      'h2',
      'h3',
      'h4',
      'span',
      'figure',
      'figcaption',
      'iframe',
      'pre',
      'code',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'hr',
    ]),
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      table: ['class'],
      th: ['colspan', 'rowspan', 'scope'],
      td: ['colspan', 'rowspan'],
      iframe: [
        'src',
        'width',
        'height',
        'allow',
        'allowfullscreen',
        'frameborder',
        'title',
      ],
      '*': ['class', 'style'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel', 'data'],
  });
}

function estimateReadingTime(contentText) {
  const words = contentText.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function buildSearchText(payload) {
  return [
    payload.title,
    payload.excerpt,
    stripHtml(payload.contentHtml),
    payload.categories.map((item) => item.name).join(' '),
    payload.tags.map((item) => item.name).join(' '),
  ]
    .join(' ')
    .toLowerCase();
}

function parseJsonArray(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function serializePost(row) {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt || '',
    contentHtml: row.content_html,
    status: row.status,
    coverImage: normalizeImageUrl(row.cover_image || ''),
    coverImageAlt: row.cover_image_alt || '',
    categories: parseJsonArray(row.categories_json),
    tags: parseJsonArray(row.tags_json),
    metaTitle: row.meta_title || '',
    metaDescription: row.meta_description || '',
    faqItems: parseJsonArray(row.faq_json),
    howToSteps: parseJsonArray(row.howto_json),
    customSchemas: parseJsonArray(row.custom_schema_json),
    showTableOfContents: row.show_table_of_contents !== 0,
    authorName: row.author_name || 'Digi Web Tech Team',
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    readingTimeMinutes: row.reading_time_minutes || 1,
  };
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

export function toSlug(value) {
  return slugifyValue(value);
}

export async function getPublishedPosts({ query = '', category, tag } = {}) {
  const db = await connectToDatabase();
  const conditions = [`status = 'published'`];
  const params = [];

  if (query) {
    const like = `%${escapeLike(query.trim())}%`;
    conditions.push(
      `(title LIKE ? OR excerpt LIKE ? OR content_html LIKE ? OR categories_json LIKE ? OR tags_json LIKE ?)`,
    );
    params.push(like, like, like, like, like);
  }

  if (category) {
    conditions.push(`categories_json LIKE ?`);
    params.push(`%"slug":"${escapeLike(category)}"%`);
  }

  if (tag) {
    conditions.push(`tags_json LIKE ?`);
    params.push(`%"slug":"${escapeLike(tag)}"%`);
  }

  const [rows] = await db.query(
    `
      SELECT *
      FROM blog_posts
      WHERE ${conditions.join(' AND ')}
      ORDER BY published_at DESC, created_at DESC
    `,
    params,
  );

  return rows.map(serializePost);
}

export async function getPublishedPostBySlug(slug) {
  const db = await connectToDatabase();
  const [rows] = await db.query(
    `
      SELECT *
      FROM blog_posts
      WHERE slug = ? AND status = 'published'
      LIMIT 1
    `,
    [slug],
  );

  return serializePost(rows[0]);
}

export async function getPostById(id) {
  const db = await connectToDatabase();
  const [rows] = await db.query(
    `
      SELECT *
      FROM blog_posts
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  );

  return serializePost(rows[0]);
}

export async function getAdminPosts() {
  const db = await connectToDatabase();
  const [rows] = await db.query(
    `
      SELECT *
      FROM blog_posts
      ORDER BY updated_at DESC
    `,
  );

  return rows.map(serializePost);
}

export async function getPublishedSlugs() {
  const db = await connectToDatabase();
  const [rows] = await db.query(
    `
      SELECT slug
      FROM blog_posts
      WHERE status = 'published'
    `,
  );

  return rows.map((row) => row.slug);
}

export async function getAllCategories() {
  const db = await connectToDatabase();
  const [rows] = await db.query(
    `
      SELECT categories_json
      FROM blog_posts
      WHERE status = 'published' AND categories_json IS NOT NULL AND categories_json != ''
    `,
  );

  const counts = new Map();

  for (const row of rows) {
    for (const item of parseJsonArray(row.categories_json)) {
      if (!item?.slug || !item?.name) {
        continue;
      }

      const existing = counts.get(item.slug) || { slug: item.slug, name: item.name, count: 0 };
      existing.count += 1;
      counts.set(item.slug, existing);
    }
  }

  return [...counts.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAllTags() {
  const db = await connectToDatabase();
  const [rows] = await db.query(
    `
      SELECT tags_json
      FROM blog_posts
      WHERE status = 'published' AND tags_json IS NOT NULL AND tags_json != ''
    `,
  );

  const counts = new Map();

  for (const row of rows) {
    for (const item of parseJsonArray(row.tags_json)) {
      if (!item?.slug || !item?.name) {
        continue;
      }

      const existing = counts.get(item.slug) || { slug: item.slug, name: item.name, count: 0 };
      existing.count += 1;
      counts.set(item.slug, existing);
    }
  }

  return [...counts.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function savePost(input, existingId) {
  const db = await connectToDatabase();
  const existingPost = existingId ? await getPostById(existingId) : null;

  const cleanTitle = String(input.title || '').trim();
  const cleanSlug = slugifyValue(input.slug || cleanTitle);
  const cleanContentHtml = sanitizePostHtml(input.contentHtml);
  const contentText = stripHtml(cleanContentHtml);
  const cleanExcerpt = String(input.excerpt || '').trim() || contentText.slice(0, 180);
  const categories = normalizeTaxonomyValues(input.categories);
  const tags = normalizeTaxonomyValues(input.tags);
  const faqItems = normalizeFaqItems(input.faqItems);
  const howToSteps = normalizeHowToSteps(input.howToSteps);
  const customSchemas = parseCustomSchemas(input.customSchemas);
  const status = input.status === 'published' ? 'published' : 'draft';

  const payload = {
    title: cleanTitle,
    slug: cleanSlug,
    excerpt: cleanExcerpt,
    contentHtml: cleanContentHtml,
    status,
    coverImage: normalizeImageUrl(String(input.coverImage || '').trim()),
    coverImageAlt: String(input.coverImageAlt || '').trim(),
    categories,
    tags,
    metaTitle: String(input.metaTitle || '').trim(),
    metaDescription: String(input.metaDescription || '').trim(),
    faqItems,
    howToSteps,
    customSchemas,
    showTableOfContents: input.showTableOfContents !== false,
    authorName: String(input.authorName || '').trim() || 'Digi Web Tech Team',
    readingTimeMinutes: estimateReadingTime(contentText),
  };

  payload.searchText = buildSearchText(payload);
  payload.publishedAt =
    status === 'published'
      ? input.publishedAt
        ? new Date(input.publishedAt)
        : existingPost?.publishedAt
          ? new Date(existingPost.publishedAt)
          : new Date()
      : null;

  if (!payload.title || !payload.slug || !payload.contentHtml) {
    throw new Error('Title, slug, and content are required.');
  }

  const duplicateParams = [payload.slug];
  let duplicateSql = `
    SELECT id
    FROM blog_posts
    WHERE slug = ?
  `;

  if (existingId) {
    duplicateSql += ' AND id != ?';
    duplicateParams.push(existingId);
  }

  duplicateSql += ' LIMIT 1';

  const [duplicateRows] = await db.query(duplicateSql, duplicateParams);

  if (duplicateRows.length) {
    throw new Error('A post with this slug already exists.');
  }

  const categoriesJson = JSON.stringify(payload.categories);
  const tagsJson = JSON.stringify(payload.tags);
  const faqJson = JSON.stringify(payload.faqItems);
  const howToJson = JSON.stringify(payload.howToSteps);
  const customSchemaJson = JSON.stringify(payload.customSchemas);
  const publishedAt = payload.publishedAt
    ? new Date(payload.publishedAt).toISOString().slice(0, 19).replace('T', ' ')
    : null;

  if (existingId) {
    await db.query(
      `
        UPDATE blog_posts
        SET
          title = ?,
          slug = ?,
          excerpt = ?,
          content_html = ?,
          status = ?,
          cover_image = ?,
          cover_image_alt = ?,
          categories_json = ?,
          tags_json = ?,
          meta_title = ?,
          meta_description = ?,
          faq_json = ?,
          howto_json = ?,
          custom_schema_json = ?,
          show_table_of_contents = ?,
          search_text = ?,
          author_name = ?,
          published_at = ?,
          reading_time_minutes = ?
        WHERE id = ?
      `,
      [
        payload.title,
        payload.slug,
        payload.excerpt,
        payload.contentHtml,
        payload.status,
        payload.coverImage,
        payload.coverImageAlt,
        categoriesJson,
        tagsJson,
        payload.metaTitle,
        payload.metaDescription,
        faqJson,
        howToJson,
        customSchemaJson,
        payload.showTableOfContents ? 1 : 0,
        payload.searchText,
        payload.authorName,
        publishedAt,
        payload.readingTimeMinutes,
        existingId,
      ],
    );

    return getPostById(existingId);
  }

  const [result] = await db.query(
    `
      INSERT INTO blog_posts (
        title,
        slug,
        excerpt,
        content_html,
        status,
        cover_image,
        cover_image_alt,
        categories_json,
        tags_json,
        meta_title,
        meta_description,
        faq_json,
        howto_json,
        custom_schema_json,
        show_table_of_contents,
        search_text,
        author_name,
        published_at,
        reading_time_minutes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.title,
      payload.slug,
      payload.excerpt,
      payload.contentHtml,
      payload.status,
      payload.coverImage,
      payload.coverImageAlt,
      categoriesJson,
      tagsJson,
      payload.metaTitle,
      payload.metaDescription,
      faqJson,
      howToJson,
      customSchemaJson,
      payload.showTableOfContents ? 1 : 0,
      payload.searchText,
      payload.authorName,
      publishedAt,
      payload.readingTimeMinutes,
    ],
  );

  return getPostById(result.insertId);
}

export async function deletePost(id) {
  const existingPost = await getPostById(id);

  if (!existingPost) {
    return null;
  }

  const db = await connectToDatabase();
  await db.query(
    `
      DELETE FROM blog_posts
      WHERE id = ?
    `,
    [id],
  );

  return existingPost;
}
