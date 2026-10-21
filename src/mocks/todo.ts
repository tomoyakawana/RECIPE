import type { TodoItem } from '../types/todo';
import { addDays, todayYmd } from '../utils/date';

// いつ開いても「これからの予定」に見えるよう、今日からの相対日付で作る
const today = todayYmd();

/** 「今週作る」リストのダミーデータ */
export const MOCK_TODO: TodoItem[] = [
  { id: 't1', recipeId: 'r3', addedOn: addDays(today, -2), plannedOn: addDays(today, 1) },
  { id: 't2', recipeId: 'r6', addedOn: addDays(today, -1), plannedOn: addDays(today, 3) },
  { id: 't3', recipeId: 'r4', addedOn: today },
];
