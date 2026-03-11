import { SvgImage } from './utils';

interface DiceDFProps {
    primaryColor: string;
    secondaryColor?: string;
    value?: number | string;
    mode?: 'tile' | 'image' | 'tile_x' | 'tile_y';
    style?: React.CSSProperties;
    className?: string;
    onClick?: () => void;
}

export default function DiceDF({
    primaryColor,
    secondaryColor,
    value,
    mode = 'image',
    style,
    className,
    onClick,
}: DiceDFProps) {
    let value_str: string;
    let is_symbol = false;
    switch (value) {
        case 1:
            value_str = '+';
            is_symbol = true;
            break;
        case -1:
            value_str = '-';
            is_symbol = true;
            break;
        case 0:
            value_str = '';
            break;
        default:
            value_str = (value || '').toString();
            break;
    }
    const svgContent = `
  <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="22" y="21" width="57" height="57" fill="${primaryColor}"/>
  ${value_str ? `
      <text 
        x="50" 
        y="${value_str === '+' ? '62' : '60'}"
        text-anchor="middle" 
        fill="${secondaryColor}" 
        font-size="${is_symbol ? '36' : '24'}"
        font-weight="bold"
        font-family="Arial, sans-serif"
      >${value_str}</text>
    ` : ''}
  </svg>
  `.trim();

    return <SvgImage svgString={svgContent} mode={mode} style={style} className={className} onClick={onClick} alt="DiceDF" />;
}
