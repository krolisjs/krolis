export * as bbox from './bbox';
export * as bezier from './bezier';
export * as blur from './blur';
export * as equation from './equation';
export * as geom from './geom';
export * as gradient from './gradient';
export * as isec from './isec';
export * as matrix from './matrix';
export * as vector from './vector';

export function toPrecision(num: number, p: number = 2) {
  const t = Math.pow(10, p);
  return Math.round(num * t) / t;
}
