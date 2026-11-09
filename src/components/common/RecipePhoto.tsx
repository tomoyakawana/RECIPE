import { useState } from 'react';
import ImagePlaceholder from './ImagePlaceholder';
import { toSizedPath, type ImageSize } from '../../api/recipeImages';
import { useImageUrls } from '../../hooks/useRecipes';

type Props = {
  // 写真のパス（詳細用）。写真がなければ undefined
  imagePath?: string;
  // 写真がないときの絵文字と色を、タグから決める
  tags?     : string[];
  size      : ImageSize;
  className?: string;
  // 絵文字の大きさ（写真がないときだけ使う）
  emojiSize?: string;
};

/** レシピの写真。写真がない・URL がまだ取れていない・読み込めないときは、仮の枠（絵文字）を出す */
const RecipePhoto = ({ imagePath, tags, size, className = '', emojiSize }: Props) => {
  const { data: urls } = useImageUrls(size);
  // 読み込みに失敗した URL（期限切れなど）。取り直して URL が変われば、もう一度写真を出してみる
  const [failedUrl, setFailedUrl] = useState<string>();
  const url = imagePath ? urls?.get(toSizedPath(imagePath, size)) : undefined;

  if (!url || url === failedUrl) return <ImagePlaceholder tags={tags} className={className} emojiSize={emojiSize} />;
  return <img src={url} alt="" loading="lazy" onError={() => setFailedUrl(url)} className={`block object-cover ${className}`} />;
};

export default RecipePhoto;
