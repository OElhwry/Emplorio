import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ maxWidth: 720, margin: '4rem auto', padding: '0 1.5rem' }}>
      <h1>Emplorio</h1>
      <p>Apply once. Send everywhere.</p>
      <p>
        <Link href="/login">Sign in →</Link>
      </p>
    </main>
  );
}
