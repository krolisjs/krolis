import { DecoderConstructor } from './abstract-decoder';
import { EncoderConstructor } from './abstract-encoder';
import { MbDecoder } from './mb-decoder';
import { MbEncoder } from './mb-encoder';

export * as abstractDecoder from './abstract-decoder';
export * as abstractEncoder from './abstract-encoder';
export * as mbDecoder from './mb-decoder';
export * as mbEncoder from './mb-encoder';
export * as decoderEvent from './decoder-event';
export * as encoderEvent from './encoder-event';
export * as define from './define';

let defaultDecoder: DecoderConstructor = MbDecoder;

let defaultEncoder: EncoderConstructor = MbEncoder;

export function getDecoder() {
  return defaultDecoder;
}

export function getEncoder() {
  return defaultEncoder;
}

export function setDecoder(v: DecoderConstructor) {
  defaultDecoder = v;
}

export function setEncoder(v: EncoderConstructor) {
  defaultEncoder = v;
}
