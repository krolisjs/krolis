import { RefreshLevel } from './level';
import AbstractNode from '../node/AbstractNode';
import Component from '../node/Component';
import { Position } from '../style/define';

export function checkReflow(node: AbstractNode, lv: RefreshLevel) {
  if (lv & RefreshLevel.REMOVE_DOM) {
    node.didUnmount();
  }
  else {
    // 没实现render()的
    if (node.isComponent && !(node as Component).shadow) {
      return;
    }
    const root = node.root!;
    let target: AbstractNode | undefined = node;
    while (target && target !== root) {
      if ([Position.ABSOLUTE, Position.RELATIVE].includes(target.computedStyle.position)) {
        break;
      }
      target = target.parent || target.host?.parent;
    }
    if (!target) {
      return;
    }
    let parent = target.parent || target.host?.parent;
    while (parent && parent !== root) {
      if ([Position.ABSOLUTE, Position.RELATIVE].includes(parent._computedStyle.position)) {
        break;
      }
      parent = parent.parent || parent.host?.parent;
    }
    if (!parent) {
      return;
    }
    if (target.style.position.v === Position.ABSOLUTE) {
      target.layoutAbs(parent, parent.x, parent.y, parent.computedStyle.width, parent.computedStyle.height);
    }
    else {
      target.layoutFlow(parent, parent.x, parent.y, parent.computedStyle.width, parent.computedStyle.height, false);
    }
    if (lv & RefreshLevel.ADD_DOM) {
      node.didMount();
    }
  }
}

export default {
  checkReflow,
};
