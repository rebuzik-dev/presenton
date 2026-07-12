export type SlideMediaType = "image" | "icon";

export interface SlideMediaDataPath {
  path: string;
  type: SlideMediaType;
  data: Record<string, unknown>;
}

function normalizeMediaUrl(value: string): string {
  try {
    return decodeURIComponent(value).replace(/\\/g, "/").split("?")[0];
  } catch {
    return value.replace(/\\/g, "/").split("?")[0];
  }
}

export function isMatchingMediaUrl(first: string, second: string): boolean {
  if (!first || !second) return false;

  const normalizedFirst = normalizeMediaUrl(first);
  const normalizedSecond = normalizeMediaUrl(second);
  if (normalizedFirst === normalizedSecond) return true;

  const pathFirst = normalizedFirst
    .replace(/^https?:\/\/[^/]+/, "")
    .replace(/^\/+/, "");
  const pathSecond = normalizedSecond
    .replace(/^https?:\/\/[^/]+/, "")
    .replace(/^\/+/, "");
  if (pathFirst === pathSecond) return true;

  if (
    (first.includes("placeholder") && second.includes("placeholder")) ||
    (first.includes("/static/images/") && second.includes("/static/images/"))
  ) {
    return normalizedFirst.split("/").pop() === normalizedSecond.split("/").pop();
  }

  const firstFilename = normalizedFirst.split("/").pop() || "";
  const secondFilename = normalizedSecond.split("/").pop() || "";
  return (
    firstFilename.length > 5 &&
    firstFilename === secondFilename
  );
}

export function findAllSlideMediaPaths(
  targetUrl: string,
  data: unknown,
  path = "",
): SlideMediaDataPath[] {
  if (!data || typeof data !== "object") return [];

  const record = data as Record<string, unknown>;
  const matches: SlideMediaDataPath[] = [];
  const imageUrl = record.__image_url__;
  const iconUrl = record.__icon_url__;

  if (typeof imageUrl === "string" && isMatchingMediaUrl(targetUrl, imageUrl)) {
    matches.push({ path, type: "image", data: record });
  }
  if (typeof iconUrl === "string" && isMatchingMediaUrl(targetUrl, iconUrl)) {
    matches.push({ path, type: "icon", data: record });
  }

  for (const [key, value] of Object.entries(record)) {
    const nextPath = path ? `${path}.${key}` : key;
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        matches.push(
          ...findAllSlideMediaPaths(targetUrl, item, `${nextPath}[${index}]`),
        );
      });
    } else if (value && typeof value === "object") {
      matches.push(...findAllSlideMediaPaths(targetUrl, value, nextPath));
    }
  }

  return matches;
}

function sourceForElement(element: Element): string | null {
  if (element instanceof HTMLImageElement) return element.src || null;
  if (element instanceof SVGElement) {
    return element.closest<HTMLElement>("[data-path]")?.dataset.path || null;
  }
  return null;
}

export function findBestSlideMediaPath(
  targetUrl: string,
  element: HTMLImageElement | SVGElement,
  data: unknown,
  container: ParentNode | null,
): SlideMediaDataPath | null {
  const matches = findAllSlideMediaPaths(targetUrl, data);
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  const mediaElements = Array.from(container?.querySelectorAll("img, svg") || []);
  const sameUrlElements = mediaElements.filter((candidate) => {
    const candidateUrl = sourceForElement(candidate);
    return Boolean(candidateUrl && isMatchingMediaUrl(candidateUrl, targetUrl));
  });
  const sameUrlIndex = sameUrlElements.indexOf(element);
  if (sameUrlIndex >= 0 && sameUrlIndex < matches.length) {
    return matches[sameUrlIndex];
  }

  const elementIndex = mediaElements.indexOf(element);
  if (elementIndex >= 0 && elementIndex < matches.length) {
    return matches[elementIndex];
  }
  return matches[0];
}
