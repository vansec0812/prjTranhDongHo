export function mediaUrl(media: { id: string; key: string; isDemo: boolean }) {
  if (
    !media.key.includes("..") &&
    (media.key.startsWith("/images/") || media.key.startsWith("/demo/"))
  )
    return media.key;
  return `/api/media/${media.id}`;
}
