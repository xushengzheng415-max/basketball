'use strict';

const assert = require('assert');
const { centerVisiblePixels, getContainDrawRect, getCoverDrawRect, getSquareCrop, getVisibleBounds, removeConnectedBackground } = require('../native-dist/utils/team-logo-editor');

const crop = getSquareCrop(1600, 800, 1, 0, 0);
assert.deepStrictEqual(crop, { x: 400, y: 0, width: 800, height: 800 });
const zoomed = getSquareCrop(800, 1600, 2, 100, -100);
assert.deepStrictEqual(zoomed, { x: 400, y: 0, width: 400, height: 400 });
assert.deepStrictEqual(getContainDrawRect(1600, 800, 512, 1, 0, 0), { x: 0, y: 128, width: 512, height: 256 });
assert.deepStrictEqual(getContainDrawRect(400, 400, 256, 1, 0, 0), { x: 0, y: 0, width: 256, height: 256 }, '400×400完整原图应按实际256px预览画布完整显示');
assert.deepStrictEqual(getCoverDrawRect(640, 940, 512, 1, 0, 0), { x: -20.480000000000018, y: -150.08000000000004, width: 552.96, height: 812.1600000000001 });
assert.deepStrictEqual(getCoverDrawRect(640, 940, 512, 1, 0, 100), { x: -20.480000000000018, y: 0, width: 552.96, height: 812.1600000000001 });

const width = 5;
const height = 5;
const data = new Uint8ClampedArray(width * height * 4);
for (let index = 0; index < width * height; index += 1) {
  const offset = index * 4;
  data[offset] = 255; data[offset + 1] = 255; data[offset + 2] = 255; data[offset + 3] = 255;
}
for (const pixel of [6, 7, 8, 11, 13, 16, 17, 18]) {
  const offset = pixel * 4;
  data[offset] = 220; data[offset + 1] = 50; data[offset + 2] = 30;
}
removeConnectedBackground({ width, height, data }, 38);
assert.strictEqual(data[3], 0, '外围背景应透明');
assert.strictEqual(data[(2 * width + 2) * 4 + 3], 255, '队徽内部白色应保留');
assert.strictEqual(data[(1 * width + 1) * 4 + 3], 255, '主体边缘应保留');

const gradientWidth = 20;
const gradientHeight = 20;
const gradientData = new Uint8ClampedArray(gradientWidth * gradientHeight * 4);
for (let y = 0; y < gradientHeight; y += 1) {
  for (let x = 0; x < gradientWidth; x += 1) {
    const offset = (y * gradientWidth + x) * 4;
    gradientData[offset] = 70 + x * 5;
    gradientData[offset + 1] = 20 + y * 3;
    gradientData[offset + 2] = 150 - x * 3;
    gradientData[offset + 3] = 255;
  }
}
for (let y = 6; y <= 13; y += 1) {
  for (let x = 6; x <= 13; x += 1) {
    const offset = (y * gradientWidth + x) * 4;
    const border = x === 6 || x === 13 || y === 6 || y === 13;
    gradientData[offset] = border ? 255 : 210;
    gradientData[offset + 1] = border ? 255 : 25;
    gradientData[offset + 2] = border ? 255 : 20;
  }
}
removeConnectedBackground({ width: gradientWidth, height: gradientHeight, data: gradientData }, 38);
assert.strictEqual(gradientData[3], 0, '渐变背景边缘应被移除');
assert.strictEqual(gradientData[(10 * gradientWidth + 3) * 4 + 3], 0, '缓慢变化的渐变背景应连通移除');
assert.strictEqual(gradientData[(10 * gradientWidth + 10) * 4 + 3], 255, '白边包围的主体应保留');

const subjectData = new Uint8ClampedArray(8 * 8 * 4);
for (let y = 5; y < 7; y += 1) {
  for (let x = 5; x < 7; x += 1) {
    const offset = (y * 8 + x) * 4;
    subjectData[offset] = 200; subjectData[offset + 1] = 60; subjectData[offset + 2] = 20; subjectData[offset + 3] = 255;
  }
}
const subject = { width: 8, height: 8, data: subjectData };
assert.deepStrictEqual(getVisibleBounds(subject), { left: 5, top: 5, width: 2, height: 2 });
centerVisiblePixels(subject, 1, 0, 0, 0.5);
assert.deepStrictEqual(getVisibleBounds(subject), { left: 2, top: 2, width: 4, height: 4 }, '去底后的主体应自动居中并放大');

const noSizeSubject = { data: subject.data };
noSizeSubject.width = 8;
noSizeSubject.height = 8;
assert.deepStrictEqual(getVisibleBounds(noSizeSubject), { left: 2, top: 2, width: 4, height: 4 }, '画布尺寸回读后可继续识别透明主体边界');

console.log('team logo editor tests passed');
