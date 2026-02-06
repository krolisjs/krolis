let max = 2048;
let manual = false;
let hasInit = false;

let maxGpu = 2048;
let manualGpu = false;
let hasInitGpu = false;

export default {
  debug: false,
  offscreenCanvas: false,
  get maxTextureSize() { // 系统纹理块尺寸限制记录，手动优先级>自动，默认2048自动不能超过
    return max;
  },
  set maxTextureSize(v: number) {
    if (hasInit) {
      max = Math.min(v, this.MAX_TEXTURE_SIZE);
    }
    else {
      max = v;
    }
    manual = true;
  },
  MAX_TEXTURE_SIZE: 8192,
  MAX_TEXTURE_IMAGE_UNITS: 8,
  MAX_VARYING_VECTORS: 15,
  // 初始化root的时候才会调用
  initGl(maxSize: number, maxUnits: number, maxVectors: number) {
    if (!manual) {
      max = Math.min(max, maxSize);
    }
    // 手动事先设置了超限的尺寸需缩小
    else if (maxSize < max) {
      max = maxSize;
    }
    hasInit = true;
    this.MAX_TEXTURE_SIZE = maxSize;
    this.MAX_TEXTURE_IMAGE_UNITS = maxUnits;
    this.MAX_VARYING_VECTORS = maxVectors;
  },
  MAX_TEXTURE_DIMENSION_2D: 8192,
  MAX_TEXTURE_ARRAY_LAYERS: 1024,
  get maxTextureDimension2D() {
    return maxGpu;
  },
  set maxTextureDimension2D(v: number) {
    if (hasInitGpu) {
      maxGpu = Math.min(v, this.MAX_TEXTURE_DIMENSION_2D);
    }
    else {
      maxGpu = v;
    }
    manualGpu = true;
  },
  initGpu(mtd2d: number, mtal: number) {
    if (!manualGpu) {
      maxGpu = Math.min(maxGpu, mtd2d);
    }
    // 手动事先设置了超限的尺寸需缩小
    else if (mtd2d < maxGpu) {
      maxGpu = mtd2d;
    }
    hasInitGpu = true;
    this.MAX_TEXTURE_DIMENSION_2D = mtd2d;
    this.MAX_TEXTURE_ARRAY_LAYERS = mtal;
  },
  defaultFontFamily: 'Arial',
  defaultFontSize: 16,
  historyTime: 1000, // 添加历史记录时命令之间是否合并的时间差阈值
  decoderWorker: '',
  decoderWorkerStr: '',
  encoderWorker: '',
  encoderWorkerStr: '',
  decodeNextDuration: 0, // 距离多久ms内开始预解码下一关键帧区域
  releasePrevDuration: 0, // 同上，释放上一关键帧区域
  gopMinDuration: 0, // 低于多少ms的gop合并成一个大的逻辑gop一口气处理加载解码，防止碎片化影响性能
  preloadAll: false, // 是否全部加载模式而不是默认分段
  mute: false, // 全局静音，不解码合成音频部分
  indexedDB: false,
  encoderFrameQue: 0, // 渲染传给合成时帧队列缓存多少，0为一帧一帧渲染等待合成，负数为无穷大，建议4低内存高并发
  webgl2: true, // 是否尝试使用webgl2
  webgpu: false, // 是否尝试使用webgpu
};
