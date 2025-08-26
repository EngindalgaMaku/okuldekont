export default function Head() {
  return (
    <>
      {/* Prevent search engines from indexing any /admin pages */}
      <meta name="robots" content="noindex,nofollow,noarchive" />
    </>
  )
}
