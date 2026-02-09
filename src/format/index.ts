import {
  ComputedStyle,
  CurveMode,
  Display,
  FillRule,
  FontStyle,
  Mask,
  MixBlendMode,
  ObjectFit,
  Overflow,
  Position,
  StrokeLineCap,
  StrokeLineJoin,
  TextAlign,
  TextVerticalAlign,
  Visibility,
} from '../style/define';
import { VideoAudioMeta } from '../codec/define';
import { JCssAnimations } from '../parser/define';
import config from '../config';

export type Props = {
  uuid?: string;
  name?: string;
  isLocked?: boolean;
  style?: Partial<JStyle>;
  animations?: JCssAnimations[];
}

export type RootProps = Props & {
  webgl2?: boolean;
  webgpu?: boolean;
  contextAttributes?: any,
  style: Partial<JStyle> & {
    width: number;
    height: number;
  };
}

export type ComponentProps = Props & {
  isShadowDom?: boolean;
}

export type JPoint = {
  x: number;
  y: number;
  cornerRadius?: number;
  curveMode?: 'none' | 'straight' | 'mirrored' | 'asymmetric' | 'disconnected';
  fx?: number; // from控制点
  fy?: number;
  tx?: number; // to控制点
  ty?: number;
  hasCurveFrom?: boolean;
  hasCurveTo?: boolean;
};

export type Point = Omit<JPoint, 'curveMode'> & {
  curveMode: CurveMode;
  cornerRadius: number;
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  absX: number; // 算上宽高的绝对像素值
  absY: number;
  absFx: number;
  absFy: number;
  absTx: number;
  absTy: number;
  dspX: number; // 绝对值和相对于AP的matrix的值，展示在面板上
  dspY: number;
  dspFx: number;
  dspFy: number;
  dspTx: number;
  dspTy: number;
};

export type PolylineProps = Props & {
  isClosed: boolean;
  points: JPoint[];
}

export type BitmapProps = Props & {
  src: string;
  frameIndex?: number;
  onLoad?: () => void;
}

export type VideoProps = Props & {
  src: string;
  currentTime?: number;
  onMeta?: (o: VideoAudioMeta) => void;
  // onLoad?: (o: VideoAudioData) => void;
  onCanplay?: () => void;
  onError?: (e: string) => void;
  onWaiting?: () => void;
  volumn?: number;
  options?: RequestInit;
}

export type AudioProps = Props & {
  src: string;
  currentTime?: number;
  onMeta?: (o: VideoAudioMeta) => void;
  // onLoad?: (o: LoadAudioRes) => void;
  onCanplay?: () => void;
  onError?: (e: string) => void;
  onWaiting?: () => void;
  volumn?: number;
  options?: RequestInit;
};

export type LottieMeta = {
  duration: number;
};

export type LottieProps = Props & {
  src?: string;
  json?: JSON;
  currentTime?: number;
  onMeta?: (o: LottieMeta) => void;
  onLoad?: () => void;
  options?: RequestInit;
};

export type TextProps = Props & {
  content: string;
  rich?: JRich[];
  textBehaviour?: 'auto' | 'autoH' | 'fixed'; // sketch中特有，考虑字体的不确定性，记录原始文本框的大小位置对齐以便初始化
}

export type RichIndex = {
  location: number;
  length: number;
};

export type JRich = Partial<Pick<JStyle,
  'fontFamily'
  | 'fontSize'
  | 'fontWeight'
  | 'lineHeight'
  | 'letterSpacing'
  | 'paragraphSpacing'
  | 'fontStyle'
  | 'textAlign'
  | 'textDecoration'
  | 'color'
  | 'textShadow'
  | 'stroke'
  | 'strokeWidth'
  | 'strokeEnable'
  | 'opacity'
  | 'visibility'
>> & RichIndex;

type Origin = number | 'left' | 'right' | 'top' | 'bottom' | 'center' | string;

export type JStyle = {
  position: 'static' | 'relative' | 'absolute';
  display: 'none' | 'block' | 'inline' | 'inlineBlock' | 'flex';
  top: number | string;
  right: number | string;
  bottom: number | string;
  left: number | string;
  width: number | string;
  height: number | string;
  lineHeight: number | 'normal';
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string;
  fontStyle: 'normal' | 'italic' | 'oblique';
  letterSpacing: number;
  paragraphSpacing: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  textVerticalAlign: 'top' | 'middle' | 'bottom';
  textDecoration: Array<'none' | 'underline' | 'line-through' | 'lineThrough'>;
  textShadow: string;
  color: string | number[];
  visibility: 'visible' | 'hidden';
  opacity: number;
  backgroundColor: string | number[];
  fill: Array<string | number[]>;
  fillOpacity: number[];
  fillEnable: boolean[];
  fillMode: string[];
  fillRule: 'nonzero' | 'evenodd';
  stroke: Array<string | number[]>;
  strokeEnable: boolean[];
  strokeWidth: number[];
  strokePosition: Array<'center' | 'inside' | 'outside'>;
  strokeMode: string[];
  strokeDasharray: number[];
  strokeLinecap: 'butt' | 'round' | 'square';
  strokeLinejoin: 'miter' | 'round' | 'bevel';
  strokeMiterlimit: number;
  translateX: string | number;
  translateY: string | number;
  translateZ: string | number;
  skewX: number;
  skewY: number;
  scaleX: number;
  scaleY: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  transformOrigin: ([Origin, Origin]) | string;
  perspective: number;
  perspectiveOrigin: ([Origin, Origin]) | string;
  perspectiveSelf: number;
  mixBlendMode:
    | 'normal'
    | 'multiply'
    | 'screen'
    | 'overlay'
    | 'darken'
    | 'lighten'
    | 'color-dodge'
    | 'colorDodge'
    | 'color-burn'
    | 'colorBurn'
    | 'hard-light'
    | 'hardLight'
    | 'soft-light'
    | 'softLight'
    | 'difference'
    | 'exclusion'
    | 'hue'
    | 'saturation'
    | 'color'
    | 'luminosity';
  pointerEvents: boolean;
  maskMode: 'none' | 'alpha' | 'gray' | 'alpha-with' | 'gray-with';
  breakMask: boolean;
  objectFit: 'fill' | 'contain' | 'cover';
  borderTopLeftRadius: number,
  borderTopRightRadius: number,
  borderBottomLeftRadius: number,
  borderBottomRightRadius: number,
  overflow: 'visible' | 'hidden';
  filter: string[];
};

export type ResizeStyle = Partial<Pick<JStyle, 'left' | 'right' | 'top' | 'bottom' | 'width' | 'height' | 'scaleX' | 'scaleY'>>;

export type RotateZStyle = Pick<JStyle, 'rotateZ'>;

export type ModifyJRichStyle = Partial<Omit<JRich, 'location' | 'length'>>;

export function getDefaultJStyle(v?: Partial<JStyle>): JStyle {
  const dft = {
    position: 'static',
    display: 'block',
    left: 'auto',
    top: 'auto',
    right: 'auto',
    bottom: 'auto',
    width: 'auto',
    height: 'auto',
    lineHeight: 'normal',
    fontFamily: config.defaultFontFamily,
    fontSize: config.defaultFontSize,
    fontWeight: 400,
    fontStyle: 'normal',
    letterSpacing: 0,
    paragraphSpacing: 0,
    textAlign: 'left',
    textVerticalAlign: 'top',
    textDecoration: [],
    textShadow: '0px 0px 0px transparent',
    color: [0, 0, 0, 1],
    visibility: 'visible',
    opacity: 1,
    backgroundColor: 'transparent',
    fill: [],
    fillOpacity: [],
    fillEnable: [],
    fillMode: [],
    fillRule: 'nonzero',
    stroke: [],
    strokeEnable: [],
    strokeWidth: [],
    strokePosition: [],
    strokeMode: [],
    strokeDasharray: [],
    strokeLinecap: 'butt',
    strokeLinejoin: 'miter',
    strokeMiterlimit: 4,
    translateX: 0,
    translateY: 0,
    translateZ: 0,
    skewX: 0,
    skewY: 0,
    scaleX: 1,
    scaleY: 1,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    transformOrigin: ['center', 'center'],
    perspective: 0,
    perspectiveOrigin: ['center', 'center'],
    perspectiveSelf: 0,
    mixBlendMode: 'normal',
    pointerEvents: true,
    maskMode: 'none',
    breakMask: false,
    objectFit: 'fill',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'visible',
    filter: [],
  };
  return Object.assign(dft, v);
}

export function getDefaultComputedStyle(v?: Partial<ComputedStyle>): ComputedStyle {
  const dft = {
    position: Position.STATIC,
    display: Display.BLOCK,
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    lineHeight: 0,
    fontFamily: 'Arial',
    fontSize: 16,
    fontWeight: 400,
    fontStyle: FontStyle.NORMAL,
    letterSpacing: 0,
    paragraphSpacing: 0,
    textAlign: TextAlign.LEFT,
    textVerticalAlign: TextVerticalAlign.TOP,
    textDecoration: [],
    textShadow: {
      x: 0,
      y: 0,
      blur: 0,
      color: [0, 0, 0, 0],
    },
    color: [0, 0, 0, 1],
    visibility: Visibility.VISIBLE,
    opacity: 1,
    backgroundColor: [0, 0, 0, 0],
    fill: [],
    fillOpacity: [],
    fillEnable: [],
    fillMode: [],
    fillRule: FillRule.NON_ZERO,
    stroke: [],
    strokeEnable: [],
    strokeWidth: [],
    strokePosition: [],
    strokeMode: [],
    strokeDasharray: [],
    strokeLinecap: StrokeLineCap.BUTT,
    strokeLinejoin: StrokeLineJoin.MITER,
    strokeMiterlimit: 4,
    translateX: 0,
    translateY: 0,
    translateZ: 0,
    skewX: 0,
    skewY: 0,
    scaleX: 1,
    scaleY: 1,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    transformOrigin: [0, 0],
    perspective: 0,
    perspectiveOrigin: [0, 0],
    perspectiveSelf: 0,
    mixBlendMode: MixBlendMode.NORMAL,
    pointerEvents: true,
    maskMode: Mask.NONE,
    breakMask: false,
    objectFit: ObjectFit.FILL,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: Overflow.VISIBLE,
    filter: [],
  };
  return Object.assign(dft, v);
}
