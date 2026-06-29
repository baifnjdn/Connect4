import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Welcome</h1>

      <p className="max-w-md text-center text-lg text-gray-600 dark:text-gray-400">
        Challenge a friend to a game of Connect 4 — drop your discs and be the
        first to get four in a row!
      </p>

      <Link
        href="/connect4"
        className="rounded-lg bg-blue-600 px-8 py-3 text-lg font-semibold text-white shadow transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        Play Connect 4
      </Link>
    </main>
  );
}
