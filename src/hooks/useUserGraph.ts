'use client';

import useSWR from 'swr';
import type { UserGraphSummary } from '@/types/neo4j';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error HTTP ${res.status}`);
  return data;
};

export function useUserGraph(userId?: string) {
  const query = userId ? `?userId=${userId}` : '';
  const { data, error, isLoading, mutate } = useSWR<UserGraphSummary>(
    `/api/neo4j/user${query}`,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    graph: data,
    isLoading,
    isError: error,
    refresh: mutate,
  };
}
