export async function runMutation<Data>(query: string, variables: Record<string, unknown>): Promise<Data> {
  const res = await fetch('http://localhost:3000/graphql', {
    method: 'POST',
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json() as { data: Data; errors?: unknown[] };
  if ((data.errors?.length ?? 0) > 0) throw new Error('Failed fetch');
  return data.data;
}
