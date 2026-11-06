'use client';

import useSWR from 'swr';
import type { OrderBookSummary } from '@/lib/binance/types';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error HTTP ${res.status}`);
  return data;
};

export function useOrderBook(payTypes: string[] = []) {
  const query = payTypes.length > 0 ? `?payTypes=${payTypes.join(',')}` : '';
  const { data, error, isLoading, mutate } = useSWR<OrderBookSummary>(
    `/api/binance/orderbook${query}`,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
    }
  );

  return {
    orderbook: data,
    isLoading,
    isError: error,
    refresh: mutate,
  };
}
