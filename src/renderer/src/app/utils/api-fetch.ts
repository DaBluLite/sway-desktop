export async function apiFetch(url: string, options: RequestInit) {
  const isSameOrigin =
    url.startsWith('/') || new URL(url, window.location.origin).origin === window.location.origin

  const res = await fetch(url, options)

  if (isSameOrigin) {
    const serverBuildId = res.headers.get('x-build-id')
    if (serverBuildId && serverBuildId !== process.env.NEXT_PUBLIC_BUILD_ID) {
      window.dispatchEvent(new Event('version-mismatch'))
    }
  }

  return res
}
