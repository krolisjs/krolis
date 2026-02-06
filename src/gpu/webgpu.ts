import { bbox2Coords } from '../gl/webgl';

export type GpuDrawData = {
  opacity: number;
  matrix?: Float32Array;
  bbox: Float32Array;
  tc?: { x1: number, y1: number, x3: number, y3: number };
  t: GPUTexture;
  bindGroup: GPUBindGroup;
  dx?: number; // bbox计算前偏移，避免创建新bbox垃圾回收，一般是局部汇总时左上原点不是0,0使用
  dy?: number;
};

export function drawGpuTextureCache(
  passEncoder: GPURenderPassEncoder,
  device: GPUDevice,
  cx: number,
  cy: number,
  list: GpuDrawData[],
) {
  for (let i = 0; i < list.length; i++) {
    const {
      opacity,
      matrix,
      bbox,
      tc,
      bindGroup,
      dx = 0,
      dy = 0,
    } = list[i];
    const { t1, t2, t3, t4 } = bbox2Coords(bbox, cx, cy, dx, dy, matrix, true);
    const data = new Float32Array([
      t1.x, t1.y, t1.w || 1, tc ? tc.x1 : 0, tc ? tc.y1 : 0, opacity,
      t4.x, t4.y, t4.w || 1, tc ? tc.x1 : 0, tc ? tc.y3 : 1, opacity,
      t2.x, t2.y, t2.w || 1, tc ? tc.x3 : 1, tc ? tc.y1 : 0, opacity,
      t4.x, t4.y, t4.w || 1, tc ? tc.x1 : 0, tc ? tc.y3 : 1, opacity,
      t2.x, t2.y, t2.w || 1, tc ? tc.x3 : 1, tc ? tc.y1 : 0, opacity,
      t3.x, t3.y, t3.w || 1, tc ? tc.x3 : 1, tc ? tc.y3 : 1, opacity,
    ]);
    const buffer = device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(buffer, 0, data);
    passEncoder.setVertexBuffer(0, buffer);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.draw(6);
  }
}
