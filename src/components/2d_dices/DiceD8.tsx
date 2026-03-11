import { SvgImage, useDiceColors } from './utils';

interface DiceD8Props {
    primaryColor: string;
    secondaryColor?: string;
    value?: number | string;
    mode?: 'tile' | 'image' | 'tile_x' | 'tile_y';
    style?: React.CSSProperties;
    className?: string;
    onClick?: () => void;
}

export default function DiceD8({
    primaryColor,
    secondaryColor,
    value,
    mode = 'image',
    style,
    className,
    onClick,
}: DiceD8Props) {
    const [primaryColor_1, primaryColor_2] = useDiceColors(primaryColor, [0.171, 0.46]);
    const svgContent = `
  <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M 52,12 L 86,71 L 18,71 Z" fill="${primaryColor}"/>
    <path d="M 52,12 L 84,33 L 86,71 Z" fill="${primaryColor_1}"/>
    <path d="M 52,12 L 20,33 L 18,71 Z" fill="${primaryColor_1}"/>
    <path d="M 18,71 L 52,88.5 L 86,71 Z" fill="${primaryColor_2}"/>
  ${value ? `
      <text 
        x="50" 
        y="60" 
        text-anchor="middle" 
        fill="${secondaryColor}" 
        font-size="24" 
        font-weight="bold"
        font-family="Arial, sans-serif"
      >${value}</text>
    ` : ''}
  </svg>
  `.trim();

    return <SvgImage svgString={svgContent} mode={mode} style={style} className={className} onClick={onClick} alt="DiceD8" />;
}
