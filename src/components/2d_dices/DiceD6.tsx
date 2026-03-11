import { SvgImage } from './utils';

interface DiceD6Props {
    primaryColor: string;
    secondaryColor?: string;
    value?: number | string;
    mode?: 'tile' | 'image' | 'tile_x' | 'tile_y';
    style?: React.CSSProperties;
    className?: string;
    onClick?: () => void;
}

export default function DiceD6({
    primaryColor,
    secondaryColor,
    value,
    mode = 'image',
    style,
    className,
    onClick,
}: DiceD6Props) {
    const svgContent = `
  <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="22" y="21" width="57" height="57" fill="${primaryColor}"/>
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

    return <SvgImage svgString={svgContent} mode={mode} style={style} className={className} onClick={onClick} alt="DiceD6" />;
}
