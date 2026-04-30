const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.join(__dirname, "..");
const assetsDir = path.join(root, "assets");

generateIcon(192, path.join(assetsDir, "icon-192.png"));
generateIcon(512, path.join(assetsDir, "icon-512.png"));

function generateIcon(size, outputPath) {
  const pixels = Buffer.alloc(size * size * 4);
  const bgTop = [37, 126, 248, 255];
  const bgBottom = [15, 139, 111, 255];
  const plate = [255, 255, 255, 255];
  const dome = [255, 154, 41, 255];
  const highlight = [255, 220, 132, 255];
  const spoon = [255, 255, 255, 255];
  const shadow = [0, 0, 0, 64];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const t = y / (size - 1);
      const index = (y * size + x) * 4;
      pixels[index] = Math.round(bgTop[0] * (1 - t) + bgBottom[0] * t);
      pixels[index + 1] = Math.round(bgTop[1] * (1 - t) + bgBottom[1] * t);
      pixels[index + 2] = Math.round(bgTop[2] * (1 - t) + bgBottom[2] * t);
      pixels[index + 3] = 255;
    }
  }

  fillEllipse(pixels, size, 0.5, 0.65, 0.42, 0.16, plate);
  fillEllipse(pixels, size, 0.5, 0.58, 0.32, 0.24, dome);
  fillEllipse(pixels, size, 0.55, 0.52, 0.08, 0.08, highlight);
  drawRoundedRect(pixels, size, 0.35, 0.45, 0.30, 0.08, 0.04, spoon);
  drawRoundedRect(pixels, size, 0.45, 0.37, 0.05, 0.20, 0.025, spoon);
  fillCircle(pixels, size, 0.48, 0.32, 0.04, spoon);
  fillEllipse(pixels, size, 0.5, 0.18, 0.22, 0.10, plate);
  fillEllipse(pixels, size, 0.5, 0.18, 0.10, 0.04, highlight);
  addShadow(pixels, size, 0.5, 0.62, 0.30, 0.06, shadow);
  drawRoundedFrame(pixels, size, 0.06, [255, 255, 255, 32]);

  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    pixels.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }

  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr(size, size)),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);

  fs.writeFileSync(outputPath, png);
}

function drawRoundedFrame(pixels, size, inset, color) {
  const pad = Math.round(size * inset);
  const thickness = Math.max(4, Math.round(size * 0.02));
  rectPx(pixels, size, pad, pad, size - pad * 2, thickness, color);
  rectPx(pixels, size, pad, size - pad - thickness, size - pad * 2, thickness, color);
  rectPx(pixels, size, pad, pad, thickness, size - pad * 2, color);
  rectPx(pixels, size, size - pad - thickness, pad, thickness, size - pad * 2, color);
}

function drawRoundedRect(pixels, size, x, y, w, h, radius, color) {
  const xPx = Math.round(x * size);
  const yPx = Math.round(y * size);
  const wPx = Math.round(w * size);
  const hPx = Math.round(h * size);
  const rPx = Math.round(radius * size);
  fillEllipse(pixels, size, (xPx + rPx) / size, (yPx + rPx) / size, radius, radius, color);
  fillEllipse(pixels, size, (xPx + wPx - rPx) / size, (yPx + rPx) / size, radius, radius, color);
  fillEllipse(pixels, size, (xPx + rPx) / size, (yPx + hPx - rPx) / size, radius, radius, color);
  fillEllipse(pixels, size, (xPx + wPx - rPx) / size, (yPx + hPx - rPx) / size, radius, radius, color);
  rect(pixels, size, x + radius, y, w - radius * 2, h, color);
  rect(pixels, size, x, y + radius, w, h - radius * 2, color);
}

function addShadow(pixels, size, cx, cy, rx, ry, color) {
  const alpha = color[3];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x / size - cx) / rx;
      const dy = (y / size - cy) / ry;
      if (dx * dx + dy * dy <= 1) {
        const index = (y * size + x) * 4;
        pixels[index] = Math.round((pixels[index] * (255 - alpha) + color[0] * alpha) / 255);
        pixels[index + 1] = Math.round((pixels[index + 1] * (255 - alpha) + color[1] * alpha) / 255);
        pixels[index + 2] = Math.round((pixels[index + 2] * (255 - alpha) + color[2] * alpha) / 255);
      }
    }
  }
}

function fillCircle(pixels, size, cx, cy, r, color) {
  fillEllipse(pixels, size, cx, cy, r, r, color);
}

function fillEllipse(pixels, size, cx, cy, rx, ry, color) {
  const minX = Math.max(0, Math.floor((cx - rx) * size));
  const maxX = Math.min(size, Math.ceil((cx + rx) * size));
  const minY = Math.max(0, Math.floor((cy - ry) * size));
  const maxY = Math.min(size, Math.ceil((cy + ry) * size));
  for (let y = minY; y < maxY; y += 1) {
    for (let x = minX; x < maxX; x += 1) {
      const dx = (x / size - cx) / rx;
      const dy = (y / size - cy) / ry;
      if (dx * dx + dy * dy <= 1) {
        const index = (y * size + x) * 4;
        pixels[index] = color[0];
        pixels[index + 1] = color[1];
        pixels[index + 2] = color[2];
        pixels[index + 3] = color[3];
      }
    }
  }
}

function rect(pixels, size, x, y, w, h, color) {
  rectPx(
    pixels,
    size,
    Math.round(x * size),
    Math.round(y * size),
    Math.round(w * size),
    Math.round(h * size),
    color,
  );
}

function rectPx(pixels, size, x, y, w, h, color) {
  for (let row = Math.max(0, y); row < Math.min(size, y + h); row += 1) {
    for (let col = Math.max(0, x); col < Math.min(size, x + w); col += 1) {
      const index = (row * size + col) * 4;
      pixels[index] = color[0];
      pixels[index + 1] = color[1];
      pixels[index + 2] = color[2];
      pixels[index + 3] = color[3];
    }
  }
}

function ihdr(width, height) {
  const buffer = Buffer.alloc(13);
  buffer.writeUInt32BE(width, 0);
  buffer.writeUInt32BE(height, 4);
  buffer[8] = 8;
  buffer[9] = 6;
  buffer[10] = 0;
  buffer[11] = 0;
  buffer[12] = 0;
  return buffer;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
