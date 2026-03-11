import { SvgImage, useDiceColors } from './utils';

interface DiceD10Props {
    primaryColor: string;
    secondaryColor?: string;
    value?: number | string;
    mode?: 'tile' | 'image' | 'tile_x' | 'tile_y';
    style?: React.CSSProperties;
    className?: string;
    onClick?: () => void;
}

export default function DiceD10({
    primaryColor,
    secondaryColor,
    value,
    mode = 'image',
    style,
    className,
    onClick,
}: DiceD10Props) {
    const [primaryColor_1, primaryColor_2] = useDiceColors(primaryColor, [0.171, 0.46]);
    const svgContent = `
  <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M 52,12 L 77,60.5 L 52,73 L 27,60.5 Z" fill="${primaryColor}"/>
    <path d="M 52,12 L 91,42 L 91,60.5 L 77,60.5 Z" fill="${primaryColor_1}"/>
    <path d="M 52,12 L 13,42 L 13,60.5 L 27,60.5 Z" fill="${primaryColor_1}"/>
    <path d="M 13,60.5 L 52,88 L 91,60.5 L 77,60.5 L 52,73 L 27,60.5 Z" fill="${primaryColor_2}"/>
  ${value ? `
      <text 
        x="50" 
        y="62" 
        text-anchor="middle" 
        fill="${secondaryColor}" 
        font-size="20" 
        font-weight="bold"
        font-family="Arial, sans-serif"
      >${value}</text>
    ` : ''}
  </svg>
  `.trim();

    return <SvgImage svgString={svgContent} mode={mode} style={style} className={className} onClick={onClick} alt="DiceD10" />;
}
