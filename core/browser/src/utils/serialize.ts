/**
 * Maximum depth for object serialization
 */
const MAX_DEPTH = 10;

/**
 * Maximum string length
 */
const MAX_STRING_LENGTH = 1000;

/**
 * Maximum array length
 */
const MAX_ARRAY_LENGTH = 100;

/**
 * Safely serialize a value for JSON, handling circular references and depth limits
 */
export function safeSerialize(value: unknown, depth = 0): unknown {
  // Handle primitives
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'boolean' || typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return truncateString(value, MAX_STRING_LENGTH);
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'symbol') {
    return value.toString();
  }

  if (typeof value === 'function') {
    return `[Function: ${value.name || 'anonymous'}]`;
  }

  // Depth limit reached
  if (depth >= MAX_DEPTH) {
    return '[Max depth reached]';
  }

  // Handle Error objects
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  // Handle Date objects
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Handle RegExp
  if (value instanceof RegExp) {
    return value.toString();
  }

  // Handle Arrays
  if (Array.isArray(value)) {
    const truncated = value.slice(0, MAX_ARRAY_LENGTH);
    const serialized = truncated.map((item) => safeSerialize(item, depth + 1));
    if (value.length > MAX_ARRAY_LENGTH) {
      serialized.push(`[... ${value.length - MAX_ARRAY_LENGTH} more items]`);
    }
    return serialized;
  }

  // Handle DOM elements
  if (typeof Element !== 'undefined' && value instanceof Element) {
    return describeElement(value);
  }

  // Handle other objects
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    const keys = Object.keys(value as Record<string, unknown>);
    const truncatedKeys = keys.slice(0, MAX_ARRAY_LENGTH);

    for (const key of truncatedKeys) {
      try {
        result[key] = safeSerialize((value as Record<string, unknown>)[key], depth + 1);
      } catch {
        result[key] = '[Unserializable]';
      }
    }

    if (keys.length > MAX_ARRAY_LENGTH) {
      result['...'] = `${keys.length - MAX_ARRAY_LENGTH} more keys`;
    }

    return result;
  }

  return '[Unknown type]';
}

/**
 * Truncate a string to max length
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength) + '...';
}

/**
 * Describe a DOM element as a string
 */
export function describeElement(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const classes = element.className
    ? `.${element.className.split(' ').filter(Boolean).join('.')}`
    : '';

  let text = '';
  if (element.textContent) {
    text = truncateString(element.textContent.trim(), 50);
    if (text) {
      text = ` "${text}"`;
    }
  }

  return `<${tag}${id}${classes}${text}>`;
}

/**
 * Get element selector (best effort)
 */
export function getElementSelector(element: Element): string {
  const parts: string[] = [];

  let current: Element | null = element;
  let depth = 0;
  const maxDepth = 5;

  while (current && depth < maxDepth) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector += `#${current.id}`;
      parts.unshift(selector);
      break; // ID is unique, no need to go further
    }

    if (current.className) {
      const classes = current.className.split(' ').filter(Boolean).slice(0, 2);
      if (classes.length > 0) {
        selector += `.${classes.join('.')}`;
      }
    }

    parts.unshift(selector);
    current = current.parentElement;
    depth++;
  }

  return parts.join(' > ');
}
