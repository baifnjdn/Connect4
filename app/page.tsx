import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold tracking-tight">
        Welcome to Connect 4
      </h1>

      <p className="max-w-md text-center text-lg text-gray-600 dark:text-gray-400">
        Get four in a row to win!
      </p>

      <div className="flex flex-row items-center justify-center gap-8 p-8">
        <Link
          href="/connect4"
          className="rounded-lg bg-blue-600 px-8 py-3 text-lg font-semibold text-white shadow transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          PvP
        </Link>

        <Link
          href=""
          className="rounded-lg bg-blue-600 px-8 py-3 text-lg font-semibold text-white shadow transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          vs AI
        </Link>

      </div>
    </main>
  );
}
