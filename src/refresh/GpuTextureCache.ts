import CanvasCache from './CanvasCache';

export type GpuSubTexture = {
  bbox: Float32Array;
  w: number;
  h: number;
  t: GPUTexture;
  bindGroup: GPUBindGroup;
  tc?: { x1: number, y1: number, x3: number, y3: number };
};

let id = 0;

class GpuTextureCache {
  id: number;
  gpu: GPUCanvasContext;
  device: GPUDevice;
  // bindGroup: GPUBindGroup;
  available: boolean;
  bbox: Float32Array;
  list: GpuSubTexture[];
  image?: ImageBitmap;
  canvasCache?: CanvasCache;
  videoFrame?: VideoFrame;
  canvas?: HTMLCanvasElement;

  constructor(gpu: GPUCanvasContext, device: GPUDevice, layout: GPUBindGroupLayout, sampler: GPUSampler, bbox: Float32Array,
              source?: CanvasCache | ImageBitmap | VideoFrame | HTMLCanvasElement,
              tc?: { x1: number, y1: number, x3: number, y3: number }) {
    this.id = id++;
    this.gpu = gpu;
    this.device = device;
    this.bbox = bbox.slice(0);
    const maxX = bbox[2], maxY = bbox[3];
    this.list = [];
    // 从已有节点来的内容
    if (source) {
      this.available = true;
      if (source instanceof CanvasCache) {
        this.canvasCache = source;
        const { list, w, h } = source;
        const len = list.length;
        // 一般单个bbox就是总的bbox拆分开来1:1，但纯图片存在复用原始尺寸的因素要计算
        const w2 = bbox[2] - bbox[0];
        const h2 = bbox[3] - bbox[1];
        const r1 = w2 / w;
        const r2 = h2 / h;
        for (let i = 0; i < len; i++) {
          const item = list[i];
          const t = device.createTexture({
            size: [w2, h2],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
          });
          device.queue.copyExternalImageToTexture(
            { source: item.os.canvas },
            { texture: t },
            [w2, h2],
          );
          const bindGroup = device.createBindGroup({
            label: this.id.toString(),
            layout,
            entries: [
              {
                binding: 0,
                resource: t.createView(),
              },
              {
                binding: 1,
                resource: sampler,
              }
            ],
          });
          this.list.push({
            bbox: new Float32Array([
              item.x * r1, // 允许小数
              item.y * r2,
              Math.min(maxX, (item.x + item.w) * r1), // 精度问题保底
              Math.min(maxY, (item.y + item.h) * r2),
            ]),
            w: item.w,
            h: item.h,
            t,
            bindGroup,
            tc,
          });
        }
      }
    }
    // merge汇总产生的新空白内容外部自行控制，另外复用位图的自己控制
    else {
      this.available = false;
    }
  }
}

export default GpuTextureCache;
