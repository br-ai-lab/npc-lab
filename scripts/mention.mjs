const FENCE_RE = /^\s*(```|~~~)/;
const LIST_RE = /^\s*(?:[-*+]|\d+\.)\s+/;
const INDENTED_CODE_RE = /^(?: {4}|\t)/;
const MENTION_RE = /@([a-z0-9][a-z0-9-]*)/gi;

export function extractMentions(body) {
  const lines = String(body ?? "").replace(/\r\n?/g, "\n").split("\n");
  const found = [];
  let inFence = false;
  let fenceMarker = "";

  for (const line of lines) {
    const trimmed = line.trimStart();
    const fence = trimmed.match(FENCE_RE);

    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[1];
      } else if (fence[1] === fenceMarker) {
        inFence = false;
        fenceMarker = "";
      }
      continue;
    }

    if (inFence) continue;
    if (trimmed.startsWith(">")) continue;
    if (trimmed.startsWith("|")) continue;
    if (LIST_RE.test(line)) continue;
    if (INDENTED_CODE_RE.test(line)) continue;

    const withoutInlineCode = line.replace(/`[^`]*`/g, "");
    for (const match of withoutInlineCode.matchAll(MENTION_RE)) {
      const slug = match[1].toLowerCase();
      if (!found.includes(slug)) found.push(slug);
    }
  }

  return found;
}

export function isMentioned(body, slug) {
  return extractMentions(body).includes(String(slug).toLowerCase());
}
