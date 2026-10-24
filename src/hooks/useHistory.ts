import { useQuery } from '@tanstack/react-query';
import { fetchHistory } from '../api/history';

export const historyKeys = {
  all: ['history'] as const,
};

/** 作ったご飯の履歴（新しい順） */
export const useHistory = () => useQuery({ queryKey: historyKeys.all, queryFn: fetchHistory });
