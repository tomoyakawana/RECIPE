/**
 * 写真を縮小して JPEG の base64 にする（AI に送る前に、データを小さくするため）
 * iPhone の写真は 4000px 以上あることが多いが、文字を読むだけなら長い辺 1600px で十分
 *
 * 返り値：'data:image/jpeg;base64,' を除いた base64 の文字列
 */
export const resizeImageToBase64 = (file: File, maxSize = 1600, quality = 0.8): Promise<string> =>
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

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('画像を読み込めませんでした'));
    };

    img.src = url;
  });
