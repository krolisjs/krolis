import { Lottie, LottieConstructor } from './lottie';

export * as abstractNode from './abstract-node';
export * as audio from './audio';
export * as bitmap from './bitmap';
export * as component from './component';
export * as container from './container';
export * as geom from './geom';
export * as lineBox from './line-box';
export * as lottie from './lottie';
export * as node from './node';
export * as root from './root';
export * as text from './text';
export * as textBox from './text-box';
export * as textEvent from './text-event';
export * as video from './video';

let defaultLottie: LottieConstructor = Lottie;

export function getLottie() {
  return defaultLottie;
}

export function setLottie(v: LottieConstructor) {
  defaultLottie = v;
}
