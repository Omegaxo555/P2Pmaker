'use client';

import useSWR from 'swr';
import type { GraphTopology } from '@/types/graphTopology';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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

