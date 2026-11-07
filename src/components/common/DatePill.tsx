import { fmtYmd } from '../../utils/date';

type Props = {
  value?   : string;
  // iOS の「消去」で空になったときは undefined（日付未定に戻す）
  onChange : (v: string | undefined) => void;
  // 選べる一番前の日（YYYY-MM-DD）。なければ制限しない
  min?     : string;
  // 押せなくする（まだ予定に入れていない行など）
  disabled?: boolean;
};

/* ---- 予定日を選ぶボタン（中身はブラウザ標準の日付入力） ---- */
// 透明な <input type="date"> をボタンに重ねて、タップで iOS 標準のカレンダーを開く
const DatePill = ({ value, onChange, min, disabled = false }: Props) => (
  <label
    className={`relative inline-flex min-h-9 items-center whitespace-nowrap rounded-full px-3 text-xs font-bold ${
      disabled ? 'bg-stone-100 text-stone-400' : value ? 'bg-stone-100 text-stone-700' : 'bg-brand/10 text-brand'
    }`}
  >
    📅 {value ? fmtYmd(value) : disabled ? '未定' : '日付を決める'}
    <input
      type="date"
      value={value ?? ''}
      // iOS の「消去」で空文字になる → 日付未定に戻す
      onChange={e => onChange(e.target.value || undefined)}
      // PC の Chrome は入力欄をクリックしただけではカレンダーが開かないので、明示的に開く
      onClick={e => {
        try { e.currentTarget.showPicker(); } catch { /* 未対応のブラウザは標準の動きに任せる */ }
      }}
      min={min}
      disabled={disabled}
      aria-label="作る予定日"
      className="absolute inset-0 opacity-0"
    />
  </label>
);

export default DatePill;
