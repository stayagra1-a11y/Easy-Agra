import { createRequire } from 'module';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { deflateSync } from 'zlib';

// Generate a valid PNG buffer (solid color + simple design)
function createPNG(width, height, bgR, bgG, bgB, acR = 212, acG = 161, acB = 78) {
  // Build CRC32 table
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[i] = c;
  }
  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
    return (crc ^ -1) >>> 0;
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crcBuf]);
  }

  // Pixel data: 1 filter byte per row + RGBA pixels
  const raw = Buffer.alloc(height * (width * 4 + 1));
  const cx = width / 2, cy = height / 2;
  const r1 = width * 0.38, r2 = width * 0.28;

  for (let y = 0; y < height; y++) {
    const rowOff = y * (width * 4 + 1);
    raw[rowOff] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const px = rowOff + 1 + x * 4;
      const dx = x - cx, dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= r1) {
        // Outer circle accent
        if (d >= r1 - width * 0.04) { raw[px] = acR; raw[px+1] = acG; raw[px+2] = acB; }
        // Inner circle
        else if (d <= r2) { raw[px] = acR; raw[px+1] = acG; raw[px+2] = acB; }
        // Main background circle
        else { raw[px] = bgR; raw[px+1] = bgG; raw[px+2] = bgB; }
        raw[px + 3] = 255;
      } else {
        // Outside circle - transparent or bg depending on need
        raw[px] = bgR; raw[px+1] = bgG; raw[px+2] = bgB; raw[px+3] = 255;
      }
    }
  }

  // For the letter "EA" - simple pixel art at center
  // Draw a minimal "E" shape on left half
  const lx = Math.floor(cx - width * 0.18), ty = Math.floor(cy - height * 0.16);
  const lw = Math.floor(width * 0.14), lh = Math.floor(height * 0.32);
  for (let py = 0; py < lh; py++) {
    for (let px2 = 0; px2 < lw; px2++) {
      const isEdge = px2 === 0 || py === 0 || py === lh - 1 || (py === Math.floor(lh/2) && px2 < lw * 0.7);
      if (isEdge) {
        const row = (ty + py) * (width * 4 + 1) + 1 + (lx + px2) * 4;
        if (row >= 0 && row < raw.length - 3) {
          raw[row] = 255; raw[row+1] = 255; raw[row+2] = 255; raw[row+3] = 255;
        }
      }
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // RGBA
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync('artifacts/easy-agra/public/icons', { recursive: true });

// Primary: #1a1a2e (26, 26, 46), Accent: #d4a14e (amber-gold)
const bg = [26, 26, 46];
const ac = [212, 161, 78];

writeFileSync('artifacts/easy-agra/public/icons/icon-72.png',  createPNG(72,  72,  ...bg, ...ac));
writeFileSync('artifacts/easy-agra/public/icons/icon-96.png',  createPNG(96,  96,  ...bg, ...ac));
writeFileSync('artifacts/easy-agra/public/icons/icon-128.png', createPNG(128, 128, ...bg, ...ac));
writeFileSync('artifacts/easy-agra/public/icons/icon-144.png', createPNG(144, 144, ...bg, ...ac));
writeFileSync('artifacts/easy-agra/public/icons/icon-152.png', createPNG(152, 152, ...bg, ...ac));
writeFileSync('artifacts/easy-agra/public/icons/icon-192.png', createPNG(192, 192, ...bg, ...ac));
writeFileSync('artifacts/easy-agra/public/icons/icon-384.png', createPNG(384, 384, ...bg, ...ac));
writeFileSync('artifacts/easy-agra/public/icons/icon-512.png', createPNG(512, 512, ...bg, ...ac));
writeFileSync('artifacts/easy-agra/public/icons/badge-72.png', createPNG(72,  72,  ...ac, ...bg));
writeFileSync('artifacts/easy-agra/public/icons/apple-touch-icon.png', createPNG(180, 180, ...bg, ...ac));

console.log('PWA icons generated in artifacts/easy-agra/public/icons/');
