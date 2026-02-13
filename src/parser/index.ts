import { Node } from '../node/node';
import { Container } from '../node/container';
import { Bitmap } from '../node/bitmap';
import { Text } from '../node/text';
import { Video } from '../node/video';
import { Audio } from '../node/audio';
import { Root } from '../node/root';
import { getLottie } from '../node';
import { Polyline } from '../node/geom/polyline';
import { Item, ItemRoot, ParserOptions } from './define';
import { AbstractNode, NodeType } from '../node/abstract-node';
import { Component } from '../node/component';

export * from './define';

export function parseJSON(json: Item | AbstractNode) {
  if (json instanceof AbstractNode) {
    return json;
  }
  const { tagName, props, animations } = json;
  if (!tagName) {
    throw new Error('Missing tagName');
  }
  let node: AbstractNode;
  if (tagName === 'container') {
    if(json.children && !Array.isArray(json.children)) {
      throw new Error('Children must be an array');
    }
    node = new Container(props, (json.children || []).map(item => {
      return parseJSON(item);
    }));
  }
  else if (tagName === 'component') {
    if(json.children && !Array.isArray(json.children)) {
      throw new Error('Children must be an array');
    }
    node = new Component(props, (json.children || []).map(item => {
      return parseJSON(item);
    }));
  }
  else if (tagName === 'img') {
    node = new Bitmap(props);
  }
  else if (tagName === 'text') {
    node = new Text(props);
  }
  else if (tagName === 'video') {
    node = new Video(props);
  }
  else if (tagName === 'audio') {
    node = new Audio(props);
  }
  else if (tagName === 'lottie') {
    const Lottie = getLottie();
    node = new Lottie(props);
  }
  else if (tagName === 'polyline') {
    node = new Polyline(props);
  }
  else {
    throw new Error('Unknown tagName');
  }
  if (animations) {
    if (!Array.isArray(animations)) {
      throw new Error('Animations must be an array');
    }
    if (node.type === NodeType.COMPONENT) {
      const shadow = (node as Component).shadow;
      if (shadow) {
        shadow.animationRecords = animations;
      }
    }
    else {
      (node as Node).animationRecords = animations;
    }
  }
  return node;
}

export function parseRoot(json: ItemRoot, options?: ParserOptions) {
  const root = new Root(json.props, (json.children || []).map(item => {
    return parseJSON(item);
  }));
  if (options?.void) {
    root.appendToVoid();
  }
  else if (options?.gpu && options.adapter && options.device) {
    root.appendToGpu(options.gpu, options.adapter, options.device, options.format || 'rgba8unorm');
  }
  else if (options?.gl) {
    root.appendToGl(options.gl);
  }
  else if (options?.dom) {
    if (options.dom.tagName.toUpperCase() === 'CANVAS') {
      root.appendTo(options.dom as HTMLCanvasElement);
    }
    else {
      const canvas = document.createElement('canvas');
      canvas.width = root.props.style?.width as number;
      canvas.height = root.props.style?.height as number;
      options.dom.appendChild(canvas);
      root.appendTo(canvas);
    }
  }
  return root;
}

export function parse(json: Item | ItemRoot, options?: ParserOptions) {
  if (json.tagName === 'root') {
    return parseRoot(json, options);
  }
  else {
    return parseJSON(json);
  }
}
