type Props = {
  // ✕ を押したとき（シートを閉じる関数を、呼ぶ側から受け取る）
  onClose: () => void;
};

/** 予定を入れるシート（日付を選んで、リクエストやレシピから、その日の予定を入れる） */
const AddPlanSheet = ({ onClose }: Props) => {
  return (
      <div className="fixed inset-0 z-40 bg-black/40">
       <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4 max-w-lg mx-auto">
        <div className="mb-3 flex items-center justify-between">
         <h2 className="text-lg font-bold">予定を入れる</h2>
          <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="flex size-9 items-center justify-center rounded-full text-stone-400"
          >
          ✕
          </button>
        </div>
      </div>
     </div>
  );
};

export default AddPlanSheet;
