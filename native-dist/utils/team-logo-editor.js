function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function getSquareCrop(width, height, zoom, offsetX, offsetY) {
  const sourceWidth = Math.max(1, Number(width) || 1);
  const sourceHeight = Math.max(1, Number(height) || 1);
  const scale = clamp(Number(zoom) || 1, 0.3, 3);
  const side = Math.min(sourceWidth, sourceHeight) / scale;
  const maxX = Math.max(0, sourceWidth - side);
  const maxY = Math.max(0, sourceHeight - side);
  return {
    x: maxX * clamp((Number(offsetX) + 100) / 200, 0, 1),
    y: maxY * clamp((Number(offsetY) + 100) / 200, 0, 1),
    width: side,
    height: side
  };
}

function getContainDrawRect(width, height, targetSize, zoom, offsetX, offsetY) {
  const sourceWidth = Math.max(1, Number(width) || 1);
  const sourceHeight = Math.max(1, Number(height) || 1);
  const outputSize = Math.max(1, Number(targetSize) || 512);
  const scale = Math.min(outputSize / sourceWidth, outputSize / sourceHeight) * clamp(Number(zoom) || 1, 0.3, 3);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const centeredX = (outputSize - drawWidth) / 2;
  const centeredY = (outputSize - drawHeight) / 2;
  return {
    x: centeredX + (clamp(Number(offsetX) || 0, -100, 100) / 100) * Math.abs(centeredX),
    y: centeredY + (clamp(Number(offsetY) || 0, -100, 100) / 100) * Math.abs(centeredY),
    width: drawWidth,
    height: drawHeight
  };
}

function getCoverDrawRect(width, height, targetSize, zoom, offsetX, offsetY) {
  const sourceWidth = Math.max(1, Number(width) || 1);
  const sourceHeight = Math.max(1, Number(height) || 1);
  const outputSize = Math.max(1, Number(targetSize) || 512);
  const scale = Math.max(outputSize / sourceWidth, outputSize / sourceHeight) * 1.08 * clamp(Number(zoom) || 1, 0.3, 3);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const centeredX = (outputSize - drawWidth) / 2;
  const centeredY = (outputSize - drawHeight) / 2;
  return {
    x: centeredX + (clamp(Number(offsetX) || 0, -100, 100) / 100) * Math.abs(centeredX),
    y: centeredY + (clamp(Number(offsetY) || 0, -100, 100) / 100) * Math.abs(centeredY),
    width: drawWidth,
    height: drawHeight
  };
}

function getVisibleBounds(imageData) {
  if (!imageData || !imageData.data) return null;
  const { width, height, data } = imageData;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= 8) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) return null;
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

function centerVisiblePixels(imageData, zoom, offsetX, offsetY, fillRatio) {
  const bounds = getVisibleBounds(imageData);
  if (!bounds) return imageData;
  const { width, height, data } = imageData;
  const ratio = clamp(Number(fillRatio) || 0.82, 0.1, 1);
  const scale = Math.min((width * ratio) / bounds.width, (height * ratio) / bounds.height) * clamp(Number(zoom) || 1, 0.3, 3);
  const targetWidth = bounds.width * scale;
  const targetHeight = bounds.height * scale;
  const centeredX = (width - targetWidth) / 2;
  const centeredY = (height - targetHeight) / 2;
  const targetX = centeredX + (clamp(Number(offsetX) || 0, -100, 100) / 100) * Math.abs(centeredX);
  const targetY = centeredY + (clamp(Number(offsetY) || 0, -100, 100) / 100) * Math.abs(centeredY);
  const output = new Uint8ClampedArray(data.length);
  const startX = Math.max(0, Math.floor(targetX));
  const startY = Math.max(0, Math.floor(targetY));
  const endX = Math.min(width, Math.ceil(targetX + targetWidth));
  const endY = Math.min(height, Math.ceil(targetY + targetHeight));
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const sourceX = Math.floor(bounds.left + (x - targetX) / scale);
      const sourceY = Math.floor(bounds.top + (y - targetY) / scale);
      if (sourceX < bounds.left || sourceX >= bounds.left + bounds.width || sourceY < bounds.top || sourceY >= bounds.top + bounds.height) continue;
      const sourceIndex = (sourceY * width + sourceX) * 4;
      const targetIndex = (y * width + x) * 4;
      output[targetIndex] = data[sourceIndex];
      output[targetIndex + 1] = data[sourceIndex + 1];
      output[targetIndex + 2] = data[sourceIndex + 2];
      output[targetIndex + 3] = data[sourceIndex + 3];
    }
  }
  data.set(output);
  return imageData;
}

function removeConnectedBackground(imageData, tolerance) {
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) return imageData;
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const threshold = clamp(Number(tolerance) || 38, 12, 90);
  const pixelCount = width * height;
  const connected = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let head = 0;
  let tail = 0;
  const distanceBetween = (leftPixel, rightPixel) => {
    const left = leftPixel * 4;
    const right = rightPixel * 4;
    return Math.sqrt(
      ((data[left] - data[right]) ** 2) +
      ((data[left + 1] - data[right + 1]) ** 2) +
      ((data[left + 2] - data[right + 2]) ** 2)
    );
  };
  const enqueueSeed = (pixel) => {
    if (connected[pixel]) return;
    connected[pixel] = 1;
    queue[tail++] = pixel;
  };
  const enqueueNeighbor = (fromPixel, pixel) => {
    if (connected[pixel]) return;
    const alpha = data[pixel * 4 + 3];
    if (alpha >= 32 && distanceBetween(fromPixel, pixel) > threshold) return;
    connected[pixel] = 1;
    queue[tail++] = pixel;
  };
  for (let x = 0; x < width; x += 1) {
    enqueueSeed(x);
    enqueueSeed((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueueSeed(y * width);
    enqueueSeed(y * width + width - 1);
  }
  while (head < tail) {
    const pixel = queue[head++];
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x > 0) enqueueNeighbor(pixel, pixel - 1);
    if (x < width - 1) enqueueNeighbor(pixel, pixel + 1);
    if (y > 0) enqueueNeighbor(pixel, pixel - width);
    if (y < height - 1) enqueueNeighbor(pixel, pixel + width);
  }
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (!connected[pixel]) continue;
    data[pixel * 4 + 3] = 0;
  }
  return imageData;
}

module.exports = { centerVisiblePixels, getContainDrawRect, getCoverDrawRect, getSquareCrop, getVisibleBounds, removeConnectedBackground };
