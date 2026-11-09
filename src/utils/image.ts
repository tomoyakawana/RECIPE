/**
 * 写真を読み込んで、長い辺が maxSize になるように縮めた canvas を返す（AI 用・保存用で共通）
 * iPhone の写真は 4000px 以上あることが多いので、そのまま使わずに縮める
 */
const loadResizedCanvas = (file: File, maxSize: number): Promise<HTMLCanvasElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      // 長い辺が maxSize になるように縮める（もともと小さければそのまま）
      const scale  = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('画像を処理できませんでした'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('画像を読み込めませんでした'));
    };

    img.src = url;
  });

/**
 * 写真を縮小して JPEG の base64 にする（AI に送る前に、データを小さくするため）
 * 文字を読むだけなら長い辺 1600px で十分
 *
 * 返り値：'data:image/jpeg;base64,' を除いた base64 の文字列
 */
export const resizeImageToBase64 = async (file: File, maxSize = 1600, quality = 0.8): Promise<string> => {
  const canvas  = await loadResizedCanvas(file, maxSize);
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
};

/**
 * 写真を縮小して JPEG のファイル（Blob）にする（レシピの写真として Storage に上げるため）
 * 詳細用は長い辺 1200px、一覧用は 400px で呼ぶ
 */
export const resizeImageToBlob = async (file: File, maxSize: number, quality = 0.8): Promise<Blob> => {
  const canvas = await loadResizedCanvas(file, maxSize);
  // toBlob は結果を Promise で返さず、終わったら関数を呼ぶ形なので、Promise に包む
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('画像を処理できませんでした'))),
      'image/jpeg',
      quality,
    );
  });
};
