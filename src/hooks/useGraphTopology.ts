'use client';

import useSWR from 'swr';
import type { GraphTopology } from '@/types/graphTopology';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error HTTP ${res.status}`);
  return data;
};

export function useGraphTopology(userId?: string) {
  const query = userId ? `?userId=${userId}` : '';
  const { data, error, isLoading, mutate } = useSWR<GraphTopology>(
    `/api/neo4j/topology${query}`,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    topology: data,
    isLoading,
    isError: error,
    refresh: mutate,
  };
}
