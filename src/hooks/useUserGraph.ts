'use client';

import useSWR from 'swr';
import type { UserGraphSummary } from '@/types/neo4j';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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
