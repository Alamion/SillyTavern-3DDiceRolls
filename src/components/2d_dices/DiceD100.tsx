import { SvgImage, useDiceColors } from './utils';

interface DiceD100Props {
    primaryColor: string;
    secondaryColor?: string;
    value?: number | string;
    mode?: 'tile' | 'image' | 'tile_x' | 'tile_y';
    style?: React.CSSProperties;
    className?: string;
    onClick?: () => void;
}

export default function DiceD100({
    primaryColor,
    secondaryColor,
    value,
    mode = 'image',
    style,
    className,
    onClick,
}: DiceD100Props) {
    const [primaryColor_1, primaryColor_2] = useDiceColors(primaryColor, [0.171, 0.46]);
    let value_1 = value;
    let str_value_1 = (value || '').toString();
    let value_2 = value;
    let str_value_2 = (value || '').toString();
    if (typeof value === 'number' && value <= 100) {
        value_1 = Math.floor(value / 10) * 10;
        str_value_1 = (value_1 === 0) || (value_1 === 100) ? '00' : value_1.toString();
        value_2 = value % 10;
        str_value_2 = value_2.toString();
    }
    const svgContent = `
  <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g transform="scale(0.6667) translate(0, 0)">
        <path d="M 52,12 L 77,60.5 L 52,73 L 27,60.5 Z" fill="${primaryColor}"/>
        <path d="M 52,12 L 91,42 L 91,60.5 L 77,60.5 Z" fill="${primaryColor_1}"/>
        <path d="M 52,12 L 13,42 L 13,60.5 L 27,60.5 Z" fill="${primaryColor_1}"/>
        <path d="M 13,60.5 L 52,88 L 91,60.5 L 77,60.5 L 52,73 L 27,60.5 Z" fill="${primaryColor_2}"/>
    </g>

    <g transform="scale(0.6667) translate(50, 50)">
        <path d="M 52,12 L 77,60.5 L 52,73 L 27,60.5 Z" fill="${primaryColor}"/>
        <path d="M 52,12 L 91,42 L 91,60.5 L 77,60.5 Z" fill="${primaryColor_1}"/>
        <path d="M 52,12 L 13,42 L 13,60.5 L 27,60.5 Z" fill="${primaryColor_1}"/>
        <path d="M 13,60.5 L 52,88 L 91,60.5 L 77,60.5 L 52,73 L 27,60.5 Z" fill="${primaryColor_2}"/>
    </g>
  ${str_value_1 ? `
      <text 
        x="35" 
        y="42" 
        text-anchor="middle" 
        fill="${secondaryColor}" 
        font-size="18" 
        font-weight="bold"
        font-family="Arial, sans-serif"
      >${str_value_1}</text>
    ` : ''}
  ${str_value_2 ? `
      <text 
        x="68" 
        y="75" 
        text-anchor="middle" 
        fill="${secondaryColor}" 
        font-size="18" 
        font-weight="bold"
        font-family="Arial, sans-serif"
      >${str_value_2}</text>
    ` : ''}
  </svg>
  `.trim();

    return <SvgImage svgString={svgContent} mode={mode} style={style} className={className} onClick={onClick} alt="DiceD100" />;
}
