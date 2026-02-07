import AbstractNode, { NodeType } from './AbstractNode';
import Container from './Container';
import { RootProps } from '../format';
import inject from '../util/inject';
import { calWorldMatrixAndOpacity, renderWebgl, renderWebgpu, Struct } from '../refresh/struct';
import { StyleUnit, Visibility } from '../style/define';
import { getLevel, isReflow, RefreshLevel } from '../refresh/level';
import { checkReflow } from '../refresh/reflow';
import { CAN_PLAY, REFRESH, REFRESH_COMPLETE, WAITING } from '../refresh/refreshEvent';
import AbstractAnimation from '../animation/AbstractAnimation';
import AniController from '../animation/AniController';
import frame from '../animation/frame';
import { EncodeOptions } from '../codec/define';
import codec from '../codec';
import config from '../config';

import { initShaders } from '../gl/webgl';
import ca from '../gl/ca';
import CacheProgram from '../gl/CacheProgram';
import mainVert from '../gl/main.vert';
import mainFrag from '../gl/main.frag';
import prVert from '../gl/pr.vert';
import prFrag from '../gl/pr.frag';
import boxFrag from '../gl/box.frag';
import dualDownFrag from '../gl/dualDown.frag';
import dualUpFrag from '../gl/dualUp.frag';
import motionFrag from '../gl/motion.frag';
import radialFrag from '../gl/radial.frag';
import simpleVert from '../gl/simple.vert';
import cmFrag from '../gl/cm.frag';
import maskFrag from '../gl/mask.frag';
import maskGrayFrag from '../gl/maskGray.frag';
import bloomFrag from '../gl/bloom.frag';
import bloomBlurFrag from '../gl/bloomBlur.frag';
import dualDown13Frag from '../gl/dualDown13.frag';
import dualUp13Frag from '../gl/dualUp13.frag';
import lightDarkFrag from '../gl/lightDark.frag';
import dropShadowFrag from '../gl/dropShadow.frag';

import mainWgsl from '../gpu/main.wgsl';

class Root extends Container {
  canvas?: HTMLCanvasElement;
  ctx?: WebGLRenderingContext | WebGL2RenderingContext | GPUCanvasContext;
  device?: GPUDevice;
  isWebgl2 = false;
  isWebgpu = false;
  readonly refs: Record<string, AbstractNode> = {};
  structs: Struct[] = []; // 队列代替递归Tree的数据结构
  readonly task: Array<((sync: boolean) => void) | undefined> = []; // 异步绘制任务回调列表
  readonly aniTask: AbstractAnimation[] = []; // 动画任务，空占位
  rl = RefreshLevel.REFLOW; // 一帧内画布最大刷新等级记录
  readonly programs: Record<string, CacheProgram> = {};
  readonly shaderModules: Record<string, GPUShaderModule> = {};
  readonly renderPipelines: Record<string, GPURenderPipeline> = {};
  readonly samplers: Record<string, GPUSampler> = {};
  readonly bindGroupsLayout: Record<string, GPUBindGroupLayout> = {};
  readonly pipelineLayouts: Record<string, GPUPipelineLayout> = {};
  readonly frameCb: (delta: number) => void; // 帧动画回调
  aniController: AniController;
  audioContext?: AudioContext;
  contentLoadingCount = 0; // 各子节点控制（如视频）加载中++，完成后--，为0时说明渲染完整
  lastContentLoadingCount = 0;
  firstDraw = true;

  declare props: RootProps;

  constructor(props: RootProps, children: AbstractNode[] = []) {
    super(props, children);
    this.type = NodeType.ROOT;
    this.root = this;
    this.frameCb = (delta: number) => {
      // 优先执行所有动画的差值更新计算，如有更新会调用addUpdate触发task添加，实现本帧绘制
      const aniTaskClone = this.aniTask.slice(0);
      aniTaskClone.forEach(item => {
        item.onRunning(delta);
      });
      // 异步绘制任务回调清空，有任务时才触发本帧刷新
      const taskClone = this.task.splice(0);
      if (taskClone.length) {
        this.draw();
      }
      aniTaskClone.forEach(item => {
        item.afterRunning();
      });
      taskClone.forEach(item => {
        if (item) {
          item(false);
        }
      });
      // 没有下一帧的任务和动画，结束帧动画
      if (!this.task.length && !this.aniTask.length) {
        frame.offFrame(this.frameCb);
      }
    };
    // nodejs没有
    if (typeof AudioContext !== 'undefined') {
      this.audioContext = new AudioContext();
    }
    this.aniController = new AniController(this.audioContext);
  }

  async appendTo(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    // props上最高优先级，没有声明则看config
    if ((config.webgpu && this.props.webgpu !== false || this.props.webgpu)
      && typeof navigator !== 'undefined' && navigator.gpu) {
      const adapter = await navigator.gpu?.requestAdapter();
      const device = await adapter?.requestDevice({
        requiredLimits: {
          // 申请使用该硬件支持的最大值
          maxTextureDimension2D: adapter.limits.maxTextureDimension2D,
          maxTextureArrayLayers: adapter.limits.maxTextureArrayLayers,
        },
      });
      if (device) {
        this.device = device;
        const format = navigator.gpu.getPreferredCanvasFormat();
        const gpu = canvas.getContext('webgpu');
        if (gpu) {
          this.isWebgpu = true;
          return this.appendToGpu(gpu, adapter!, device, format);
        }
      }
    }
    // gl的初始化和配置
    const attributes = Object.assign(ca, this.props.contextAttributes);
    let ctx: WebGLRenderingContext | WebGL2RenderingContext | undefined;
    // 同webgl优先级
    if (config.webgl2 && this.props.webgl2 !== false || this.props.webgl2) {
      ctx = canvas.getContext('webgl2', attributes) as WebGL2RenderingContext;
    }
    if (ctx) {
      this.isWebgl2 = true;
    }
    else {
      ctx = canvas.getContext('webgl', attributes) as WebGLRenderingContext;
      this.isWebgl2 = false;
    }
    if (!ctx) {
      throw new Error('Webgl unsupported!');
    }
    return this.appendToGl(ctx);
  }

  appendToGpu(gpu: GPUCanvasContext, adapter: GPUAdapter, device: GPUDevice, format: GPUTextureFormat) {
    // 不能重复
    if (this.ctx) {
      inject.error('Duplicate appendToGpu');
      return;
    }
    this.ctx = gpu;
    gpu.configure({
      device,
      format,
      alphaMode: 'premultiplied',
    });
    config.initGpu(adapter.limits.maxTextureDimension2D, adapter.limits.maxTextureArrayLayers);
    this.initRenderPipeline(device, format);
    this.afterAppend();
  }

  appendToGl(gl: WebGLRenderingContext | WebGL2RenderingContext) {
    // 不能重复
    if (this.ctx) {
      inject.error('Duplicate appendToGl');
      return;
    }
    this.ctx = gl;
    config.initGl(
      gl.getParameter(gl.MAX_TEXTURE_SIZE),
      gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
    );
    this.initProgram(gl);
    this.afterAppend();
  }

  private afterAppend() {
    // 渲染前布局和设置关系结构
    this.reLayout();
    this.didMount();
    this.structs = this.structure(0);
    this.asyncDraw();
  }

  appendToVoid() {
    this.reLayout();
    this.didMount();
    this.structs = this.structure(0);
    for (let i = 0, len = this.structs.length; i < len; i++) {
      const { node } = this.structs[i];
      node.calContent();
      calWorldMatrixAndOpacity(node, i, node.parent);
    }
  }

  reLayout() {
    this.checkRoot();
    this.layoutFlow(this, 0, 0, this._computedStyle.width, this._computedStyle.height, false);
  }

  private checkRoot() {
    const { width, height } = this.style;
    const canvas = this.canvas;
    if (width.u === StyleUnit.AUTO) {
      if (canvas) {
        width.u = StyleUnit.PX;
        this._computedStyle.width = width.v = Math.max(1, canvas.width);
      }
      else {
        this._computedStyle.width = 1;
      }
    }
    else {
      this._computedStyle.width = Math.max(1, this.style.width.v as number);
    }
    if (height.u === StyleUnit.AUTO) {
      if (canvas) {
        height.u = StyleUnit.PX;
        this._computedStyle.height = height.v = Math.max(1, canvas.height);
      }
      else {
        this._computedStyle.height = 1;
      }
    }
    else {
      this._computedStyle.height = Math.max(1, this.style.height.v as number);
    }
    if (this.isWebgpu) {}
    else {
      (this.ctx as WebGLRenderingContext)?.viewport(0, 0, this._computedStyle.width, this._computedStyle.height);
    }
  }

  /**
   * 添加更新，分析repaint/reflow和上下影响，异步刷新
   * sync是updateStyle()时没有变化，cb会返回true标明同步执行
   */
  addUpdate(
    node: AbstractNode, // 发生变更的节点
    keys: string[], // 发生变更的样式key
    focus: RefreshLevel = RefreshLevel.NONE, // 初始值默认空，可能图片src变了默认传重绘
    cb?: (sync: boolean) => void,
  ) {
    if (!this.isMounted) {
      return RefreshLevel.NONE;
    }
    let lv = focus;
    if (keys && keys.length) {
      for (let i = 0, len = keys.length; i < len; i++) {
        const k = keys[i];
        lv |= getLevel(k);
      }
    }
    const res = this.calUpdate(node, lv);
    if (res) {
      this.asyncDraw(cb);
    }
    else {
      cb && cb(true);
    }
    return lv;
  }

  calUpdate(
    node: AbstractNode,
    lv: RefreshLevel,
  ) {
    if (lv === RefreshLevel.NONE || !this.isMounted) {
      return false;
    }
    // reflow/repaint/<repaint分级
    const isRf = isReflow(lv);
    if (isRf) {
      // 除了特殊如窗口缩放变更canvas画布会影响根节点，其它都只会是变更节点自己
      if (node === this) {
        this.reLayout();
      }
      else {
        checkReflow(node, lv);
      }
    }
    else {
      const isRp = lv >= RefreshLevel.REPAINT;
      if (isRp) {
        node.calRepaintStyle(lv);
      }
      else {
        const { style, computedStyle } = node;
        if (lv & RefreshLevel.TRANSFORM_ALL) {
          node.calMatrix(lv);
        }
        if (lv & (RefreshLevel.PERSPECTIVE | RefreshLevel.TRANSLATE | RefreshLevel.TRANSFORM_ALL)) {
          node.calPerspective();
        }
        if (lv & (RefreshLevel.PERSPECTIVE_SELF | RefreshLevel.TRANSLATE | RefreshLevel.TRANSFORM_ORIGIN | RefreshLevel.TRANSFORM_ALL)) {
          node.calPerspectiveSelf();
        }
        if (lv & RefreshLevel.OPACITY) {
          node.calOpacity();
        }
        if (lv & RefreshLevel.FILTER) {
          node.calFilter(lv);
        }
        if (lv & RefreshLevel.MixBlendMode) {
          computedStyle.mixBlendMode = style.mixBlendMode.v;
        }
        let cleared = false;
        if (lv & RefreshLevel.Mask) {
          node.clearMask();
          cleared = true;
          node.calMask();
        }
        if (lv & RefreshLevel.BREAK_MASK) {
          const oldMask = node.mask;
          node.calMask();
          const newMask = node.mask;
          // breakMask向前查找重置mask，必须是有效的，即设置为true时之前要有mask引用
          if (computedStyle.breakMask && oldMask) {
            oldMask.clearMask();
          }
          // 取消的话如果前面有mask才会有效即有newMask节点
          else if (!computedStyle.breakMask && newMask) {
            //
          }
          // 无效的视为无刷新
          else {
            lv = lv & (RefreshLevel.FULL ^ RefreshLevel.BREAK_MASK);
          }
          if (!computedStyle.breakMask || oldMask) {
            let prev = node.prev;
            while (prev) {
              if (prev.computedStyle.maskMode) {
                prev.clearMask();
                break;
              }
              if (prev.computedStyle.breakMask) {
                break;
              }
              prev = prev.prev;
            }
          }
        }
        // mask的任何其它变更都要清空重绘，必须CACHE以上，CACHE是跨帧渲染用级别
        if (computedStyle.maskMode && !cleared && lv) {
          node.clearMask();
        }
      }
    }
    // 除root的reflow外，任何reflow/repaint都要向上清除
    node.clearTexCacheUpward();
    node.refreshLevel |= lv;
    this.rl |= lv;
    let mask = node.mask;
    // 检查mask影响，这里是作为被遮罩对象存在的关系检查，不会有连续，mask不能同时被mask
    if (mask && !(lv & RefreshLevel.Mask) && !(lv & RefreshLevel.BREAK_MASK)) {
      mask.clearMask();
    }
    let parent = node.parent;
    while (parent) {
      if (parent.computedStyle.visibility === Visibility.HIDDEN) {
        return false;
      }
      parent = parent.parent;
    }
    return lv > RefreshLevel.NONE;
  }

  asyncDraw(cb?: (sync: boolean) => void) {
    const { task, aniTask } = this;
    if (!task.length && !aniTask.length) {
      frame.onFrame(this.frameCb);
    }
    task.push(cb);
  }

  cancelAsyncDraw(cb: (sync: boolean) => void) {
    const { task, aniTask } = this;
    const i = task.indexOf(cb);
    if (i > -1) {
      task.splice(i, 1);
      if (!task.length && !aniTask.length) {
        frame.offFrame(this.frameCb);
      }
    }
  }

  // 总控动画，所有节点的动画引用都会存下来
  addAnimation(animation: AbstractAnimation) {
    const { task, aniTask } = this;
    if (!task.length && !aniTask.length) {
      // 如果之前asyncDraw本帧渲染回调frameCb，可能会添加动画，而之前的frameCb没有删除会重复
      frame.offFrame(this.frameCb);
      frame.onFrame(this.frameCb);
    }
    if (aniTask.indexOf(animation) === -1) {
      aniTask.push(animation);
    }
  }

  removeAnimation(animation: AbstractAnimation) {
    const { task, aniTask } = this;
    const i = aniTask.indexOf(animation);
    if (i > -1) {
      aniTask.splice(i, 1);
      if (!task.length && !aniTask.length) {
        frame.offFrame(this.frameCb);
      }
    }
  }

  draw() {
    if (!this.isMounted) {
      return;
    }
    const rl = this.rl;
    if (rl > RefreshLevel.NONE) {
      this.clear();
      this.rl = RefreshLevel.NONE;
      if (this.ctx) {
        if (this.isWebgpu) {
          renderWebgpu(this.ctx as GPUCanvasContext, this);
        }
        else {
          renderWebgl(this.ctx as WebGLRenderingContext | WebGL2RenderingContext, this);
        }
        this.emit(REFRESH);
        if (this.contentLoadingCount) {
          if (!this.lastContentLoadingCount) {
            this.emit(WAITING);
          }
        }
        else {
          // 等待到加载完成，或者第一次渲染且没有任何加载资源
          if (this.lastContentLoadingCount || this.firstDraw) {
            this.emit(CAN_PLAY);
          }
          this.emit(REFRESH_COMPLETE);
        }
        this.lastContentLoadingCount = this.contentLoadingCount;
        this.firstDraw = false;
      }
    }
  }

  clear() {
    const ctx = this.ctx;
    if (ctx) {
      if (this.isWebgpu) {}
      else {
        (ctx as WebGLRenderingContext).clearColor(0, 0, 0, 0);
        (ctx as WebGLRenderingContext).clear((ctx as WebGLRenderingContext).COLOR_BUFFER_BIT);
      }
    }
  }

  private initProgram(gl: WebGLRenderingContext | WebGL2RenderingContext) {
    const isWebgl2 = this.isWebgl2;
    const programs = this.programs;
    programs.main = new CacheProgram(gl, initShaders(gl, mainVert, mainFrag), {
      uniform: ['u_clip', 'u_texture', 'u_opacity'],
      attrib: ['a_position', 'a_texCoords'],
    });
    if (isWebgl2) {
      programs.pr = new CacheProgram(gl, initShaders(gl, prVert, prFrag), {
        uniform: [
          'u_texture[0]',
          'u_texture[1]',
          'u_texture[2]',
          'u_texture[3]',
          'u_texture[4]',
          'u_texture[5]',
          'u_texture[6]',
          'u_texture[7]',
          'u_texture[8]',
          'u_texture[9]',
          'u_texture[10]',
          'u_texture[11]',
          'u_texture[12]',
          'u_texture[13]',
          'u_texture[14]',
          'u_texture[15]',
        ],
        attrib: ['a_position', 'a_texCoords', 'a_opacity', 'a_clip', 'a_textureIndex'],
      });
    }
    programs.box = new CacheProgram(gl, initShaders(gl, simpleVert, boxFrag), {
      uniform: ['u_texture', 'u_pw', 'u_ph', 'u_r', 'u_direction'],
      attrib: ['a_position', 'a_texCoords'],
    });
    programs.dualDown = new CacheProgram(gl, initShaders(gl, simpleVert, dualDownFrag), {
      uniform: ['u_xy', 'u_texture'],
      attrib: ['a_position', 'a_texCoords'],
    });
    programs.dualUp = new CacheProgram(gl, initShaders(gl, simpleVert, dualUpFrag), {
      uniform: ['u_x', 'u_y', 'u_texture'],
      attrib: ['a_position', 'a_texCoords'],
    });
    programs.motion = new CacheProgram(gl, initShaders(gl, simpleVert, motionFrag), {
      uniform: ['u_kernel', 'u_velocity', 'u_texture', 'u_limit'],
      attrib: ['a_position', 'a_texCoords'],
    });
    programs.radial = new CacheProgram(gl, initShaders(gl, simpleVert, radialFrag), {
      uniform: ['u_kernel', 'u_center', 'u_ratio', 'u_texture'],
      attrib: ['a_position', 'a_texCoords'],
    });
    programs.cm = new CacheProgram(gl, initShaders(gl, simpleVert, cmFrag), {
      uniform: ['u_m', 'u_m[0]', 'u_texture'],
      attrib: ['a_position', 'a_texCoords'],
    });
    programs.mask = new CacheProgram(gl, initShaders(gl, simpleVert, maskFrag), {
      uniform: ['u_texture1', 'u_texture2'],
      attrib: ['a_position', 'a_texCoords'],
    });
    programs.maskGray = new CacheProgram(gl, initShaders(gl, simpleVert, maskGrayFrag), {
      uniform: ['u_texture1', 'u_texture2', 'u_d'],
      attrib: ['a_position', 'a_texCoords'],
    });
    programs.bloom = new CacheProgram(gl, initShaders(gl, simpleVert, bloomFrag), {
      uniform: ['u_texture1', 'u_texture2', 'u_threshold'],
      attrib: ['a_position', 'a_texCoords'],
    });
    programs.bloomBlur = new CacheProgram(gl, initShaders(gl, simpleVert, bloomBlurFrag), {
      uniform: ['u_texture', 'u_threshold'],
      attrib: ['a_position', 'a_texCoords'],
    });
    programs.dualDown13 = new CacheProgram(gl, initShaders(gl, simpleVert, dualDown13Frag), {
      uniform: ['u_xy', 'u_texture'],
      attrib: ['a_position', 'a_texCoords'],
    });
    programs.dualUp13 = new CacheProgram(gl, initShaders(gl, simpleVert, dualUp13Frag), {
      uniform: ['u_xy', 'u_texture1', 'u_texture2'],
      attrib: ['a_position', 'a_texCoords'],
    });
    programs.lightDark = new CacheProgram(gl, initShaders(gl, simpleVert, lightDarkFrag), {
      uniform: ['u_texture', 'u_velocity', 'u_radius'],
      attrib: ['a_position', 'a_texCoords'],
    });
    programs.dropShadow = new CacheProgram(gl, initShaders(gl, simpleVert, dropShadowFrag), {
      uniform: ['u_texture', 'u_color'],
      attrib: ['a_position', 'a_texCoords'],
    });
    CacheProgram.useProgram(gl, programs.main);
  }

  private initRenderPipeline(device: GPUDevice, format: GPUTextureFormat) {
    const { bindGroupsLayout, pipelineLayouts, samplers, shaderModules, renderPipelines } = this;
    bindGroupsLayout.main = device.createBindGroupLayout({
      label: 'main',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {
            sampleType: 'float',
            viewDimension: '2d',
          },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {
            type: 'filtering',
          },
        },
      ],
    });
    pipelineLayouts.main = device.createPipelineLayout({
      bindGroupLayouts: [
        bindGroupsLayout.main,
      ],
    });
    samplers.main = device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
    });
    shaderModules.main = device.createShaderModule({
      code: mainWgsl,
    });
    renderPipelines.main = device.createRenderPipeline({
      label: 'main',
      layout: pipelineLayouts.main,
      vertex: {
        module: shaderModules.main,
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 24,
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x3' },
            { shaderLocation: 1, offset: 12, format: 'float32x2' },
            { shaderLocation: 2, offset: 20, format: 'float32' },
          ],
        }],
      },
      fragment: {
        module: shaderModules.main,
        entryPoint: 'fs_main',
        targets: [{ format }],
      },
      primitive: { topology: 'triangle-list' },
    });
  }

  async encode(encodeOptions?: EncodeOptions) {
    const EC = codec.getEncoder();
    return new EC().start(this, encodeOptions);
  }
}

export default Root;
