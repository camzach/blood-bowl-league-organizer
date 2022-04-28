import React from 'react';

export function useFetch<T>(endpoint: string): [boolean, boolean, T | null] {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  React.useEffect(() => {
    setLoading(true);
    setError(false);
    setData(null);
    const controller = new AbortController();
    fetch(endpoint, { mode: 'cors', signal: controller.signal, cache: 'force-cache' })
      .then(res => res.json() as unknown as T)
      .then(result => {
        setData(result as unknown as T);
      })
      .catch((e: Error) => {
        if (e instanceof DOMException) {
          setLoading(true);
          return;
        }
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
    return () => {
      controller.abort();
    };
  }, [endpoint]);

  return [loading, error, data];
}
