import { Options } from '../animation/abstract-animation';
import { JKeyFrame } from '../animation/css-animation';
import { JKeyFrameRich } from '../animation/rich-animation';
import {
  AudioProps,
  BitmapProps, ComponentProps,
  LottieProps,
  PolylineProps,
  Props,
  RootProps,
  TextProps,
  VideoProps
} from '../format';
import { AbstractNode } from '../node/abstract-node';

export type JCssAnimations = {
  keyframes: JKeyFrame[];
  options: Options;
};

export type JTimeAnimations = {
  start: number;
  options: Options;
};

export type JRichAnimations = {
  keyframes: JKeyFrameRich[];
  options: Options;
};

export type Item = {
  tagName: 'container';
  props: Props;
  children?: (Item | AbstractNode)[];
  animations?: JCssAnimations[];
} | {
  tagName: 'img';
  props: BitmapProps;
  animations?: JCssAnimations[];
} | {
  tagName: 'text';
  props: TextProps;
  animations?: (JCssAnimations | JRichAnimations)[];
} | {
  tagName: 'video';
  props: VideoProps;
  animations?: (JCssAnimations | JTimeAnimations)[];
} | {
  tagName: 'audio';
  props: AudioProps;
  animations?: (JCssAnimations | JTimeAnimations)[];
} | {
  tagName: 'lottie';
  props: LottieProps;
  animations?: JCssAnimations[];
} | {
  tagName: 'polyline';
  props: PolylineProps;
  animations?: JCssAnimations[];
} | {
  tagName: 'component';
  props: ComponentProps;
  children?: (Item | AbstractNode)[];
  animations?: JCssAnimations[];
};

export type ItemRoot = {
  tagName: 'root',
  props: RootProps,
  children?: (Item | AbstractNode)[],
};

export type ParserOptions = {
  dom?: HTMLElement;
  gl?: WebGLRenderingContext | WebGL2RenderingContext;
  void?: boolean;
};
