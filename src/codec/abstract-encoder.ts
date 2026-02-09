import { Event } from '../util/event';
import { Root } from '../node/root';
import { EncodeOptions } from './define';

export type EncoderConstructor = new () => AbstractEncoder;

export abstract class AbstractEncoder extends Event {

  abstract start(root: Root, encodeOptions?: EncodeOptions): Promise<ArrayBuffer | undefined>;
}
