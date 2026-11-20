import { useState } from 'react';
import { CalendarIcon, PlusIcon, SparkleIcon } from './icons';

type Props = {
  // 「予定を入れる」を押したとき（予定を入れるシートを開く）
  onPlan   : () => void;
  // 「献立を提案」を押したとき（献立の提案のシートを開く）
  onSuggest: () => void;
};

/**
 * 右下に浮かぶ「＋」。押すと「予定を入れる」「献立を提案」の2つが上に開く（スピードダイヤル）
 * iPhone：下のタブの上に浮かせる／タブレット・PC（md 以上）：画面の右下の角に置く
 */
const FloatingActions = ({ onPlan, onSuggest }: Props) => {
  const [open, setOpen] = useState(false);

  // 選んだら、先にメニューを閉じてから親に知らせる（シートの後ろで、メニューが開いたままにならないように）
  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  // 2つのボタンの「開いている／閉じている」の見た目。transition が、その間をなめらかにつなぐ
  const shown = open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0';

  return (
    <>
      {/* 後ろを暗くする幕。押したら閉じる（Tab で止まる必要はないので tabIndex={-1}） */}
      <button
        type="button"
        onClick={() => setOpen(false)}
        inert={!open}
        tabIndex={-1}
        aria-label="メニューを閉じる"
        className={`fixed inset-0 z-30 bg-stone-900/35 transition-opacity duration-200 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />

      {/* 開いたときに出る2つ。閉じている間も置いたまま、透明にして押せなくする（閉じるときにも動きを付けるため） */}
      {/* 位置：＋の高さ（3.5rem）と間（1rem）の分だけ、＋より上に置く */}
      <div
        inert={!open}
        className="fixed right-4 bottom-[calc(10.5rem+env(safe-area-inset-bottom))] z-30 flex flex-col items-end gap-3 md:right-8 md:bottom-26"
      >
        <button
          type="button"
          onClick={() => choose(onPlan)}
          // 上のボタンは少し遅れて出す（＋に近い方から順に出てくるように）
          className={`flex items-center gap-3 transition duration-200 ${shown} ${open ? 'delay-75' : ''}`}
        >
          <span className="rounded-full bg-white px-3.5 py-2 text-sm font-bold shadow-md shadow-stone-900/15">予定を入れる</span>
          <span className="flex size-12 items-center justify-center rounded-full bg-white text-brand shadow-md shadow-stone-900/15">
            <CalendarIcon />
          </span>
        </button>
        <button
          type="button"
          onClick={() => choose(onSuggest)}
          className={`flex items-center gap-3 transition duration-200 ${shown}`}
        >
          <span className="rounded-full bg-white px-3.5 py-2 text-sm font-bold shadow-md shadow-stone-900/15">献立を提案</span>
          {/* AI の方は、オレンジ→黄のグラデーションで目立たせる */}
          <span className="flex size-12 items-center justify-center rounded-full bg-linear-to-br from-brand to-amber-400 text-white shadow-md shadow-brand/35">
            <SparkleIcon />
          </span>
        </button>
      </div>

      {/* 本体の ＋。開いているときは 45度回して × に見せ、色も変える */}
      {/* iPhone の位置：下のタブ（下から約 4.75rem）の上に、少し間を空ける。#24 の浮かせるボタンと同じ考え方 */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label={open ? 'メニューを閉じる' : '予定を入れる・献立を提案'}
        className={`fixed right-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-30 flex size-14 items-center justify-center rounded-full text-white shadow-lg transition duration-200 md:right-8 md:bottom-8 ${
          open ? 'rotate-45 bg-stone-800 shadow-stone-900/30' : 'bg-brand shadow-brand/35'
        }`}
      >
        <PlusIcon />
      </button>
    </>
  );
};

export default FloatingActions;
