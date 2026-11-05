'use client';

import useSWR from 'swr';
import type { OrderBookSummary } from '@/lib/binance/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useOrderBook(payTypes: string[] = []) {
  const query = payTypes.length > 0 ? `?payTypes=${payTypes.join(',')}` : '';
  const { data, error, isLoading, mutate } = useSWR<OrderBookSummary>(
    `/api/binance/orderbook${query}`,
    fetcher,
    {
      refreshInterval: 15000, // actualizar cada 15 seg
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

