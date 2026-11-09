import { pickRecipeStyle } from '../../utils/recipeStyle';

type Props = {
  tags?     : string[];
  className?: string;
  // 絵文字の大きさ（カードの大きさに合わせて変える）
  emojiSize?: string;
};

/** 写真がないときの枠（タグに合わせた絵文字とグラデーションを出す）。写真の表示は RecipePhoto から使う */
const ImagePlaceholder = ({ tags = [], className = '', emojiSize = 'text-4xl' }: Props) => {
  const style = pickRecipeStyle(tags);
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br ${style.bg} ${className}`}>
      <span className={emojiSize}>{style.emoji}</span>
    </div>
  );
};

export default ImagePlaceholder;
