import { Node } from '../node/node';
import { Root } from '../node/root';
import { genMerge, shouldIgnore } from './merge';
import { checkInScreen } from './check';
import { assignMatrix, multiply } from '../math/matrix';
import { Container } from '../node/container';
import { DrawData, drawTextureCache, drawPr } from '../gl/webgl';
import { CacheProgram } from '../gl/cache-program';
import { drawGpuTextureCache, GpuDrawData } from '../gpu/webgpu';

export type Struct = {
  node: Node;
  num: number;
  total: number;
  lv: number;
  next: number; // mask使用影响后续的节点数
};

export function renderWebgl(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  root: Root,
) {
  const { structs, width: W, height: H, isWebgl2 } = root;
  genMerge(gl, root, 0, 0, W, H);
  const cx = W * 0.5;
  const cy = H * 0.5;
  const programs = root.programs;
  const { main, pr } = programs;
  CacheProgram.useProgram(gl, main);
  gl.viewport(0, 0, W, H);
  const drawCallList: DrawData[] = [];
  // 循环代替递归
  for (let i = 0, len = structs.length; i < len; i++) {
    const { node, total, next } = structs[i];
    // 不可见和透明的跳过
    const computedStyle = node.computedStyle;
    if (shouldIgnore(computedStyle)) {
      for (let j = i; j < i + total; j++) {
        const node = structs[j].node;
        calWorldMatrixAndOpacity(node, j, node.parent || node.host?.parent);
      }
      i += total + next;
      continue;
    }
    calWorldMatrixAndOpacity(node, i, node.parent || node.host?.parent);
    // 计算后的世界坐标结果
    const opacity = node._opacity;
    const matrix = node._matrixWorld;
    let target = node.textureTarget;
    let isInScreen = false;
    // 有merge的直接判断是否在可视范围内，合成结果在merge中做了，可能超出范围不合成
    if (node.hasContent) {
      if (target?.available) {
        isInScreen = checkInScreen(target.bbox, matrix, W, H);
      }
      // 无merge的是单个节点，判断是否有内容以及是否在可视范围内，首次渲染或更新后会无target
      else {
        isInScreen = checkInScreen(
          node._filterBbox, // 检测用原始的渲染用取整的
          matrix,
          W,
          H,
        );
        if (isInScreen && node.hasContent) {
          node.genTexture(gl);
          target = node.textureTarget!;
        }
      }
    }
    // console.log(i, node.name, node.hasContent, target?.available, isInScreen, node.bbox.join(','))
    // 屏幕内有内容渲染
    if (isInScreen && target!.available) {
      const list = target!.list;
      for (let i = 0, len = list.length; i < len; i++) {
        const { bbox, t, tc } = list[i];
        if (t) {
          if (isWebgl2) {
            drawCallList.push({
              opacity,
              matrix,
              bbox,
              t,
              tc,
            });
          }
          else {
            drawTextureCache(gl, cx, cy, main, {
              opacity,
              matrix,
              bbox,
              t,
              tc,
            }, true);
          }
        }
      }
      // 有局部子树缓存可以跳过其所有子孙节点
      if (target !== node.textureCache) {
        i += total + next;
      }
    }
  }
  // 减少drawCall
  if (isWebgl2) {
    CacheProgram.useProgram(gl, pr);
    drawPr(gl as WebGL2RenderingContext, cx, cy, pr, drawCallList, true);
    CacheProgram.useProgram(gl, main);
  }
}

export function renderWebgpu(ctx: GPUCanvasContext, root: Root) {
  const { structs, width: W, height: H, device, bindGroupsLayout, renderPipelines, samplers } = root;
  const commandEncoder = device!.createCommandEncoder();
  const textureView = ctx.getCurrentTexture().createView();
  const passEncoder = commandEncoder.beginRenderPass({
    colorAttachments: [{
      view: textureView,
      clearValue: { r: 0, g: 0, b: 0, a: 0 },
      loadOp: 'clear',
      storeOp: 'store'
    }]
  });
  passEncoder.setPipeline(renderPipelines.main);
  genMerge(ctx, root, 0, 0, W, H);
  const cx = W * 0.5;
  const cy = H * 0.5;
  const drawCallList: GpuDrawData[] = [];
  // 循环代替递归
  for (let i = 0, len = structs.length; i < len; i++) {
    const { node, total, next } = structs[i];
    // 不可见和透明的跳过
    const computedStyle = node.computedStyle;
    if (shouldIgnore(computedStyle)) {
      for (let j = i; j < i + total; j++) {
        const node = structs[j].node;
        calWorldMatrixAndOpacity(node, j, node.parent || node.host?.parent);
      }
      i += total + next;
      continue;
    }
    calWorldMatrixAndOpacity(node, i, node.parent || node.host?.parent);
    // 计算后的世界坐标结果
    const opacity = node._opacity;
    const matrix = node._matrixWorld;
    let target = node.gpuTextureTarget;
    let isInScreen = false;
    // 有merge的直接判断是否在可视范围内，合成结果在merge中做了，可能超出范围不合成
    if (node.hasContent) {
      if (target?.available) {
        isInScreen = checkInScreen(target.bbox, matrix, W, H);
      }
      // 无merge的是单个节点，判断是否有内容以及是否在可视范围内，首次渲染或更新后会无target
      else {
        isInScreen = checkInScreen(
          node._filterBbox, // 检测用原始的渲染用取整的
          matrix,
          W,
          H,
        );
        if (isInScreen && node.hasContent) {
          node.genGpuTexture(ctx, device!, bindGroupsLayout.main, samplers.main);
          target = node.gpuTextureTarget!;
        }
      }
    }
    // console.log(i, node.name, node.hasContent, target?.available, isInScreen, node.bbox.join(','))
    // 屏幕内有内容渲染
    if (isInScreen && target!.available) {
      const list = target!.list;
      for (let i = 0, len = list.length; i < len; i++) {
        const { bbox, t, bindGroup, tc } = list[i];
        drawCallList.push({
          opacity,
          matrix,
          bbox,
          t,
          bindGroup,
          tc,
        });
      }
      // 有局部子树缓存可以跳过其所有子孙节点
      if (target !== node.gpuTextureCache) {
        i += total + next;
      }
    }
  }
  drawGpuTextureCache(passEncoder, device!, cx, cy, drawCallList);
  passEncoder.end();
  device!.queue.submit([commandEncoder.finish()]);
}

export function calWorldMatrixAndOpacity(node: Node, i: number, parent?: Container) {
  // 世界opacity和matrix不一定需要重算，有可能之前调用算过了有缓存
  let hasCacheOp = false;
  let hasCacheMw = false;
  // 第一个是Root层级0
  if (!i) {
    hasCacheOp = node.hasCacheOp;
    hasCacheMw = node.hasCacheMw;
  }
  else {
    hasCacheOp = node.hasCacheOp && node.parentOpId === parent!.localOpId;
    hasCacheMw = node.hasCacheMw && node.parentMwId === parent!.localMwId;
  }
  // opacity和matrix的世界计算，父子相乘
  if (!hasCacheOp) {
    node._opacity = parent
      ? parent._opacity * node.computedStyle.opacity
      : node.computedStyle.opacity;
    if (parent) {
      node.parentOpId = parent.localOpId;
    }
    node.hasCacheOp = true;
  }
  if (!hasCacheMw) {
    const ppm = parent?.perspectiveMatrix;
    const pm = node.perspectiveMatrixSelf;
    let m = node.matrix;
    if (pm) {
      m = multiply(pm, m);
    }
    if (ppm) {
      m = multiply(ppm, m);
    }
    assignMatrix(
      node._matrixWorld,
      parent ? multiply(parent._matrixWorld, m) : m,
    );
    if (parent) {
      node.parentMwId = parent.localMwId;
    }
    if (node.hasCacheMw) {
      node.localMwId++;
    }
    node.hasCacheMw = true;
  }
}
