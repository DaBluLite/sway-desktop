import { Link, Outlet, createRootRoute } from '@tanstack/react-router'

const RootComponent = () => (
  <div className="flex flex-col gap-2 top-2 bottom-2 right-2 w-90">
    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
      <Link
        to="/"
        className="p-4 border-2 border-white dark:border-zinc-950 rounded-md [&.active]:border-green-400 use-transition bg-white dark:bg-zinc-950"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="size-5"
        >
          <path
            fillRule="evenodd"
            d="M19.952 1.651a.75.75 0 0 1 .298.599V16.303a3 3 0 0 1-2.176 2.884l-1.32.377a2.553 2.553 0 1 1-1.403-4.909l2.311-.66a1.5 1.5 0 0 0 1.088-1.442V6.994l-9 2.572v9.737a3 3 0 0 1-2.176 2.884l-1.32.377a2.553 2.553 0 1 1-1.402-4.909l2.31-.66a1.5 1.5 0 0 0 1.088-1.442V5.25a.75.75 0 0 1 .544-.721l10.5-3a.75.75 0 0 1 .658.122Z"
            clipRule="evenodd"
          />
        </svg>
      </Link>
      <Link
        to="/library"
        className="p-4 border-2 border-white dark:border-zinc-950 rounded-md [&.active]:border-green-400 use-transition bg-white dark:bg-zinc-950"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="size-5"
        >
          <path d="M5.625 3.75a2.625 2.625 0 1 0 0 5.25h12.75a2.625 2.625 0 0 0 0-5.25H5.625ZM3.75 11.25a.75.75 0 0 0 0 1.5h16.5a.75.75 0 0 0 0-1.5H3.75ZM3 15.75a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75ZM3.75 18.75a.75.75 0 0 0 0 1.5h16.5a.75.75 0 0 0 0-1.5H3.75Z" />
        </svg>
      </Link>
    </div>
    <div
      className="rounded-lg bg-white dark:bg-zinc-950 w-full h-fit min-h-20 flex p-2 justify-start items-start"
      onClick={(e) => e.stopPropagation()}
    >
      <Outlet /> {/* routes render here */}
    </div>
  </div>
)

const rootRoute = createRootRoute({
  component: RootComponent
})

export { rootRoute }
