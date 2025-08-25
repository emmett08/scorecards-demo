export function normalizeEntityRef(ref: string): string {
  const s = (ref ?? '').trim().toLowerCase();
  if (!s) return s;

  if (s.includes(':')) {
    // kind:namespace/name
    const [kind, rest] = s.split(':', 2);
    const [ns, name] = rest.split('/', 2);
    return `${kind}:${ns}/${name}`;
  }

  // namespace/kind/name
  const parts = s.split('/');
  if (parts.length === 3) {
    const [ns, kind, name] = parts;
    return `${kind}:${ns}/${name}`;
  }

  return s;
}

export const TARGET = 'component:default/example-website';

export function isExampleWebsite(ref: string): boolean {
  return normalizeEntityRef(ref) === TARGET;
}
