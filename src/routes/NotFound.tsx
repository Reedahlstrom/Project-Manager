import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="py-16 text-center">
      <p className="text-sm font-medium text-text-3">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text">
        That page doesn&rsquo;t exist
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-pretty text-sm text-text-2">
        The link may be stale, or the thing you were looking for was renamed.
      </p>
      <Link
        to="/today"
        className="mt-6 inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-contrast transition-colors duration-150 hover:bg-accent-hover"
      >
        Back to Today
      </Link>
    </div>
  )
}
