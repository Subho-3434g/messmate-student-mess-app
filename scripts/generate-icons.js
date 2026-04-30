const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.join(__dirname, "..");
const assetsDir = path.join(root, "assets");

generateIcon(192, path.join(assetsDir, "icon-192.png"));
generateIcon(512, path.join(assetsDir, "icon-512.png"));

function generateIcon(size, outputPath) {
  const pixels = Buffer.alloc(size * size * 4);
  const bg = [15, 139, 111, 255];
  const bgDark = [10, 108, 86, 255];
  const white = [255, 255, 255, 255];
  const mint = [214, 244, 235, 255];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const shade = y > size * 0.62 ? bgDark : bg;
      pixels[index] = shade[0];
      pixels[index + 1] = shade[1];
      pixels[index + 2] = shade[2];
      pixels[index + 3] = shade[3];
    }
  }

  roundedFrame(pixels, size, 0.09, mint);
  drawM(pixels, size, 0.17, 0.28, 0.28, 0.44, white);
  drawM(pixels, size, 0.52, 0.28, 0.28, 0.44, white);
  rect(pixels, size, 0.19, 0.76, 0.62, 0.055, mint);
  rect(pixels, size, 0.29, 0.84, 0.42, 0.038, white);

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

function roundedFrame(pixels, size, inset, color) {
  const pad = Math.round(size * inset);
  const thickness = Math.max(5, Math.round(size * 0.03));
  rectPx(pixels, size, pad, pad, size - pad * 2, thickness, color);
  rectPx(pixels, size, pad, size - pad - thickness, size - pad * 2, thickness, color);
  rectPx(pixels, size, pad, pad, thickness, size - pad * 2, color);
  rectPx(pixels, size, size - pad - thickness, pad, thickness, size - pad * 2, color);
}

function drawM(pixels, size, x, y, w, h, color) {
  const bar = w * 0.16;
  rect(pixels, size, x, y, bar, h, color);
  rect(pixels, size, x + w - bar, y, bar, h, color);
  rect(pixels, size, x + w * 0.20, y, bar, h * 0.56, color);
  rect(pixels, size, x + w * 0.50, y, bar, h * 0.56, color);
  rect(pixels, size, x + w * 0.32, y + h * 0.33, w * 0.36, h * 0.14, color);
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
