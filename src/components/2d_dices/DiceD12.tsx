import { SvgImage, useDiceColors } from './utils';

interface DiceD12Props {
    primaryColor: string;
    secondaryColor?: string;
    value?: number | string;
    mode?: 'tile' | 'image' | 'tile_x' | 'tile_y';
    style?: React.CSSProperties;
    className?: string;
    onClick?: () => void;
}

export default function DiceD12({
    primaryColor,
    secondaryColor,
    value,
    mode = 'image',
    style,
    className,
    onClick,
}: DiceD12Props) {
    const [primaryColor_1, primaryColor_2, primaryColor_3] = useDiceColors(primaryColor, [0.171, 0.063, 0.46]);
    const svgContent = `
  <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M 52,25.5 L 74.5,41.75 L 66,68.5 L 37,68.5 L 29,41.75 Z" fill="${primaryColor}"/>
    <path d="M 52,12 L 73.5,19.5 L 87.5,37 L 74.5,41.75 L 52,25.5 Z" fill="${primaryColor_1}"/>
    <path d="M 52,12 L 30,19.5 L 16,37 L 29,41.75 L 52,25.5 Z" fill="${primaryColor_1}"/>
    <path d="M 87.5,37 L 87.5,61 L 75,79.5 L 66,68.5 L 74.5,41.75 Z" fill="${primaryColor_2}"/>
    <path d="M 16,37 L 16,61 L 29,79.5 L 37,68.5 L 29,41.75 Z" fill="${primaryColor_2}"/>
    <path d="M 29,79.5 L 52,86.5 L 75,79.5 L 66,68.5 L 37,68.5 Z" fill="${primaryColor_3}"/>
  ${value ? `
      <text 
        x="50" 
        y="58" 
        text-anchor="middle" 
        fill="${secondaryColor}" 
        font-size="20" 
        font-weight="bold"
        font-family="Arial, sans-serif"
      >${value}</text>
    ` : ''}
  </svg>
  `.trim();

    return <SvgImage svgString={svgContent} mode={mode} style={style} className={className} onClick={onClick} alt="DiceD12" />;
}
