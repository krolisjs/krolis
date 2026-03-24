import { Event } from '../util/event';
import { CacheGOP } from './define';

export type DecoderConstructor = new (url: string) => AbstractDecoder;

let id = 0;

export abstract class AbstractDecoder extends Event {
  id: number;
  url: string;
  currentTime: number; // 当前解析的时间
  gopIndex: number; // 当前区域索引
  error: boolean;

  protected constructor(url: string) {
    super();
    this.url = url;
    this.currentTime = -Infinity;
    this.gopIndex = -1;
    this.error = false;
    this.id = id++;
  }

  abstract start(time: number): void;

  abstract getFrameByTime(time: number): VideoFrame | undefined;

  abstract release(): void;

  abstract releaseGOPList(): void;

  abstract get currentGOP(): CacheGOP;

  abstract get gopList(): CacheGOP[];
}
