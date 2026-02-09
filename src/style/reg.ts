export const position = /(([-+]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:e[-+]?\d+)?[pxremvwhina%]*)|(left|top|right|bottom|center)){1,2}/ig;
export const gradient = /\b(\w+)-?gradient\s*\((.+)\)/i;
export const img = /(?:\burl\((['"]?)(.*?)\1\))|(?:\b((data:)))/i;
export const blur = /(gauss|motion|radial|background)\s*\((.+)\)/i;
export const color = /(?:#[a-f\d]{3,8})|(?:rgba?\s*\(.*?\))|(?:transparent)/i;
export const number = /([-+]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:e[-+]?\d+)?)[pxremvwhina%]*/ig;
export const shadow = /([-+]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:px)?)\s+([-+]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:px)?)\s+((?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:px)?)\s+((?:#[a-f\d]{3,8})|(?:rgba?\s*\(.+?\))|(?:transparent))/i;
