import { SvgImage, useDiceColors } from './utils';

interface DiceD20Props {
    primaryColor: string;
    secondaryColor?: string;
    value?: number | string;
    mode?: 'tile' | 'image' | 'tile_x' | 'tile_y';
    style?: React.CSSProperties;
    className?: string;
    onClick?: () => void;
}

export default function DiceD20({
    primaryColor,
    secondaryColor,
    value,
    mode = 'image',
    style,
    className,
    onClick,
}: DiceD20Props) {
    const [primaryColor_1, primaryColor_2, primaryColor_3, primaryColor_4] = useDiceColors(primaryColor, [0.25, 0.063, 0.171, 0.46]);
    const svgContent = `
  <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M 52,31.5 L 75,71 L 30,71 Z" fill="${primaryColor}"/>
    <path d="M 52,9.5 L 88,32 L 52,31.5 Z" fill="${primaryColor_1}"/>
    <path d="M 52,9.5 L 16,32 L 52,31.5 Z" fill="${primaryColor_1}"/>
    <path d="M 88,32 L 75,71 L 52,31.5 Z" fill="${primaryColor_2}"/>
    <path d="M 16,32 L 30,71 L 52,31.5 Z" fill="${primaryColor_2}"/>
    <path d="M 88,32 L 87,70 L 75,71 Z" fill="${primaryColor_3}"/>
    <path d="M 16,32 L 17,70 L 30,71 Z" fill="${primaryColor_3}"/>
    <path d="M 87,70 L 52,93.5 L 75,71 Z" fill="${primaryColor_4}"/>
    <path d="M 17,70 L 52,93.5 L 30,71 Z" fill="${primaryColor_4}"/>
    <path d="M 30,71 L 52,93.5 L 75,71 Z" fill="${primaryColor_3}"/>
  ${value ? `
      <text 
        x="52" 
        y="65"
        text-anchor="middle" 
        fill="${secondaryColor}"
        font-size="20" 
        font-weight="bold"
        font-family="Arial, sans-serif"
      >${value}</text>
    ` : ''}
  </svg>
  `.trim();

    return <SvgImage svgString={svgContent} mode={mode} style={style} className={className} onClick={onClick} alt="DiceD20" />;
}
