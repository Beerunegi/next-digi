import slugify from 'slugify';

function stripHtml(value = '') {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeHtml(value = '') {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function normalizeImageUrl(value = '') {
  const source = String(value || '').trim();

  if (!source) {
    return '';
  }

  if (source.startsWith('//')) {
    return `https:${source}`;
  }

  if (source.startsWith('/')) {
    return source;
  }

  try {
    const url = new URL(source);

    if (
      url.protocol === 'http:' &&
      !['localhost', '127.0.0.1', '::1'].includes(url.hostname)
    ) {
      url.protocol = 'https:';
    }

    return url.toString();
  } catch {
    return source;
  }
}

export function extractFirstImageUrl(contentHtml = '') {
  const match = String(contentHtml || '').match(/<img\b[^>]*\bsrc=(['"])(.*?)\1/i);

  if (!match?.[2]) {
    return '';
  }

  return normalizeImageUrl(match[2]);
}

function slugifyHeading(value, usedIds) {
  const base = slugify(decodeHtml(stripHtml(value)), {
    lower: true,
    strict: true,
  }) || 'section';

  let candidate = base;
  let counter = 2;

  while (usedIds.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  usedIds.add(candidate);
  return candidate;
}

export function normalizeFaqItems(value) {
  const items = Array.isArray(value) ? value : [];

  return items
    .map((item) => ({
      question: String(item?.question || '').trim(),
      answer: String(item?.answer || '').trim(),
    }))
    .filter((item) => item.question && item.answer);
}

export function normalizeHowToSteps(value) {
  const items = Array.isArray(value) ? value : [];

  return items
    .map((item) => ({
      name: String(item?.name || '').trim(),
      text: String(item?.text || '').trim(),
    }))
    .filter((item) => item.name && item.text);
}

export function parseCustomSchemas(value) {
  if (!value) {
    return [];
  }

  const parsed = typeof value === 'string' ? JSON.parse(value) : value;

  if (Array.isArray(parsed)) {
    return parsed.filter((item) => item && typeof item === 'object');
  }

  if (parsed && typeof parsed === 'object') {
    return [parsed];
  }

  throw new Error('Custom schema JSON-LD must be an object or an array of objects.');
}

export function preparePostContent(contentHtml = '') {
  const headings = [];
  const usedIds = new Set();
  const htmlWithSafeImages = String(contentHtml || '').replace(
    /<img\b([^>]*?)\bsrc=(['"])(.*?)\2([^>]*)>/gi,
    (match, beforeSrc = '', quote = '"', src = '', afterSrc = '') => {
      const normalizedSrc = normalizeImageUrl(src);
      const hasLoading = /\bloading=/i.test(match);
      const hasDecoding = /\bdecoding=/i.test(match);
      const loadingAttr = hasLoading ? '' : ' loading="lazy"';
      const decodingAttr = hasDecoding ? '' : ' decoding="async"';

      return `<img${beforeSrc}src=${quote}${normalizedSrc}${quote}${afterSrc}${loadingAttr}${decodingAttr}>`;
    },
  );

  const html = htmlWithSafeImages.replace(
    /<h([2-4])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (match, level, attrs = '', innerHtml = '') => {
      const text = decodeHtml(stripHtml(innerHtml));

      if (!text) {
        return match;
      }

      const idMatch = attrs.match(/\sid=(['"])(.*?)\1/i);
      const id = idMatch?.[2] || slugifyHeading(text, usedIds);

      if (!idMatch) {
        usedIds.add(id);
      }

      headings.push({
        id,
        text,
        level: Number(level),
      });

      if (idMatch) {
        return match;
      }

      return `<h${level}${attrs} id="${id}">${innerHtml}</h${level}>`;
    },
  );

  return { html, headings };
}
