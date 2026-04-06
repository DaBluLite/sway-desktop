export default function getTags(tags: string | string[] | undefined): string[] {
  if (!tags) return []

  if (Array.isArray(tags)) return tags

  return tags.split(',').map((tag) => tag.trim())
}
