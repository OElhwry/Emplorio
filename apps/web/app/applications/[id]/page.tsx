interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <main style={{ maxWidth: 960, margin: '2rem auto', padding: '0 1.5rem' }}>
      <h1>Application {id}</h1>
      <p>JD snapshot, generated docs, status updates, notes.</p>
    </main>
  );
}
