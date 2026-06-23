
import Link from 'next/link';

export default function AboutPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">About Us</h1>
      <p className="mt-4 text-lg">This is the about page.</p>
      {/* <Link href="/" className="mt-6 text-blue-500 hover:underline">
        Go back Home
      </Link> */}
    </main>
  );
}