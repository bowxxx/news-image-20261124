// news-image-20261124 — a newspaper poster summing up Tuesday 24 November 2026.
// Draws the whole poster programmatically (no image assets, no network, no
// randomness, no timestamps) and writes it as a 1024x1024 PNG to
// $MAKEFUN_OUTPUT_DIR/entry.png (default /output/entry.png).
// Stories verified 24 Nov 2026 against Reuters / AP / BBC / Chess.com / FIDE.

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------- palette
const W = 1024;
const H = 1024;
const PAPER: RGB = [247, 242, 228];
const PANEL: RGB = [255, 253, 246];
const INK: RGB = [22, 22, 20];
const RED: RGB = [164, 31, 36];
const NAVY: RGB = [29, 58, 95];
const NAVY_DARK: RGB = [18, 38, 64];
const SEA: RGB = [36, 84, 128];
const SEA_DARK: RGB = [24, 62, 98];
const SKY: RGB = [214, 226, 232];
const GREY: RGB = [96, 96, 92];
const SHIP: RGB = [58, 62, 66];
const SHIP_DARK: RGB = [38, 40, 43];
const ORANGE: RGB = [224, 110, 30];
const YELLOW: RGB = [244, 196, 66];
const SMOKE: RGB = [150, 148, 140];
const WHITE: RGB = [255, 255, 255];
const RULE: RGB = [180, 172, 150];

type RGB = [number, number, number];

// ---------------------------------------------------------------- pixels
const px = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  px[i * 3] = PAPER[0];
  px[i * 3 + 1] = PAPER[1];
  px[i * 3 + 2] = PAPER[2];
}

function set(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 3;
  px[o] = c[0];
  px[o + 1] = c[1];
  px[o + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) set(xx, yy, c);
  }
}

function hline(x: number, y: number, w: number, c: RGB, t = 1): void {
  fillRect(x, y, w, t, c);
}

function vline(x: number, y: number, h: number, c: RGB, t = 1): void {
  fillRect(x, y, t, h, c);
}

// Bresenham line.
function line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    set(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function disc(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) set(cx + x, cy + y, c);
    }
  }
}

// Filled polygon (scanline, even-odd).
function poly(pts: Array<[number, number]>, c: RGB): void {
  let minY = H;
  let maxY = 0;
  for (const [, y] of pts) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
        xs.push(Math.round(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0)));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = xs[k]; x <= xs[k + 1]; x++) set(x, y, c);
    }
  }
}

function starburst(cx: number, cy: number, rOuter: number, rInner: number, spikes: number, c: RGB): void {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (i * Math.PI) / spikes - Math.PI / 2;
    pts.push([Math.round(cx + r * Math.cos(a)), Math.round(cy + r * Math.sin(a))]);
  }
  poly(pts, c);
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph: 7 rows of 5 bits, '1' = ink.
const GLYPHS: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "+": ["00000", "00100", "00100", "01110", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "*": ["00000", "10101", "01110", "10101", "00000", "00000", "00000"],
};

function textWidth(s: string, sc: number): number {
  return s.length * 6 * sc - sc;
}

function drawChar(ch: string, x: number, y: number, sc: number, c: RGB): void {
  const g = GLYPHS[ch];
  if (!g) return;
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (g[r][col] === "1") fillRect(x + col * sc, y + r * sc, sc, sc, c);
    }
  }
}

function drawText(s: string, x: number, y: number, sc: number, c: RGB): void {
  let cx = x;
  for (const ch of s) {
    drawChar(ch, cx, y, sc, c);
    cx += 6 * sc;
  }
}

function drawTextCentred(s: string, cx: number, y: number, sc: number, c: RGB): void {
  drawText(s, cx - Math.floor(textWidth(s, sc) / 2), y, sc, c);
}

// Greedy word wrap; returns lines that fit maxW pixels at scale sc.
function wrap(s: string, maxW: number, sc: number): string[] {
  const per = Math.max(1, Math.floor((maxW + sc) / (6 * sc)));
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? cur + " " + w : w;
    if (next.length <= per) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawPara(s: string, x: number, y: number, maxW: number, sc: number, c: RGB, leading: number): number {
  const lines = wrap(s, maxW, sc);
  lines.forEach((ln, i) => drawText(ln, x, y + i * leading, sc, c));
  return y + lines.length * leading;
}

// ---------------------------------------------------------------- PNG encode
const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- the poster
function drawMasthead(): void {
  // Outer double frame.
  fillRect(16, 16, 992, 992, INK);
  fillRect(20, 20, 984, 984, PAPER);
  hline(36, 44, 952, RED, 4);
  drawTextCentred("THE WORLD IN ONE DAY", 512, 62, 6, INK);
  drawTextCentred("TUESDAY 24 NOVEMBER 2026", 512, 116, 3, RED);
  hline(36, 146, 952, INK, 2);
  drawTextCentred("THE DAY'S NEWS IN ONE PAGE, FROM AROUND THE WORLD", 512, 158, 2, GREY);
  hline(36, 182, 952, INK, 2);
}

function drawHeroArt(x: number, y: number, w: number, h: number): void {
  // Sky and sea.
  fillRect(x, y, w, Math.floor(h * 0.42), SKY);
  fillRect(x, y + Math.floor(h * 0.42), w, h - Math.floor(h * 0.42), SEA);
  fillRect(x, y + Math.floor(h * 0.42), w, 3, SEA_DARK);
  // Sun.
  disc(x + 42, y + 34, 20, YELLOW);
  disc(x + 42, y + 34, 14, [250, 214, 110]);
  // Distant smoke puffs.
  disc(x + 210, y + 62, 16, SMOKE);
  disc(x + 232, y + 48, 20, SMOKE);
  disc(x + 256, y + 62, 14, SMOKE);
  // Explosion burst above the ship.
  starburst(x + 190, y + 108, 46, 20, 9, ORANGE);
  starburst(x + 190, y + 108, 30, 13, 9, YELLOW);
  disc(x + 190, y + 108, 10, WHITE);
  // Naval drones in the sky.
  const drones: Array<[number, number]> = [
    [x + 60, y + 66],
    [x + 108, y + 44],
    [x + 292, y + 58],
  ];
  for (const [dx, dy] of drones) {
    fillRect(dx - 10, dy - 2, 20, 4, SHIP_DARK);
    fillRect(dx - 2, dy - 8, 4, 16, SHIP_DARK);
    disc(dx - 10, dy - 8, 3, SHIP_DARK);
    disc(dx + 10, dy - 8, 3, SHIP_DARK);
  }
  // The corvette, listing to port.
  const hull: Array<[number, number]> = [
    [x + 60, y + 168],
    [x + 300, y + 158],
    [x + 318, y + 178],
    [x + 296, y + 200],
    [x + 88, y + 208],
    [x + 62, y + 190],
  ];
  poly(hull, SHIP);
  fillRect(x + 120, y + 138, 90, 26, SHIP_DARK); // superstructure
  fillRect(x + 150, y + 118, 10, 22, SHIP_DARK); // mast
  fillRect(x + 208, y + 128, 26, 34, SHIP); // funnel
  fillRect(x + 232, y + 142, 40, 6, GREY); // gun
  // White wake lines on the sea.
  for (let i = 0; i < 5; i++) {
    hline(x + 24 + i * 52, y + 216 + (i % 2) * 10, 34, WHITE, 2);
  }
  hline(x, y + h - 2, w, INK, 2);
  vline(x, y, h, INK, 2);
  vline(x + w - 2, y, h, INK, 2);
  hline(x, y, w, INK, 2);
}

function drawHero(): void {
  drawText("WAR IN UKRAINE: THE MEDITERRANEAN", 56, 200, 2, RED);
  drawText("UKRAINE'S DRONE WAR", 56, 226, 4, INK);
  drawText("REACHES LIBYA", 56, 264, 4, INK);
  drawText("KYIV CLAIMS THE CORVETTE MERKURY SANK", 56, 306, 2, RED);
  drawPara(
    "SEVEN UKRAINIAN NAVAL DRONES STRUCK THE RUSSIAN CORVETTE MERKURY AT BENGHAZI, KYIV SAYS. THE CARGO SHIP MV ANGARA WAS ALSO HIT AND A KA-27 HELICOPTER DESTROYED. LIBYAN OFFICIALS SAY THE SHIP WAS BADLY DAMAGED. SATELLITE IMAGES SHOW IT CAPSIZED.",
    56,
    336,
    544,
    2,
    INK,
    20,
  );
  drawText("2,400 KM FROM THE FRONT LINE", 56, 470, 2, RED);
  drawHeroArt(628, 196, 340, 252);
  hline(36, 500, 952, INK, 2);
}

interface Card {
  kicker: string;
  head1: string;
  head2: string;
  body: string;
}

function drawCard(x: number, y: number, w: number, h: number, c: Card): void {
  fillRect(x, y, w, h, PANEL);
  hline(x, y, w, RED, 4);
  vline(x, y, h, INK, 2);
  vline(x + w - 2, y, h, INK, 2);
  hline(x, y + h - 2, w, INK, 2);
  hline(x, y, w, INK, 2);
  drawText(c.kicker, x + 18, y + 16, 2, RED);
  drawText(c.head1, x + 18, y + 40, 3, INK);
  drawText(c.head2, x + 18, y + 66, 3, INK);
  drawPara(c.body, x + 18, y + 98, w - 36, 2, INK, 18);
}

function drawGrid(): void {
  const cards: Card[] = [
    {
      kicker: "INDONESIA",
      head1: "FACTORY FIRE: 24 DEAD",
      head2: "30 STILL MISSING",
      body: "RESCUERS SEARCH THE RUINS OF A CANDY FACTORY IN SERANG, BANTEN, AFTER SATURDAY'S BLAZE. THE CAUSE IS STILL UNDER INVESTIGATION.",
    },
    {
      kicker: "CLIMATE",
      head1: "COP31 ENDS",
      head2: "WITH NO DEAL",
      body: "TALKS IN ANTALYA CLOSE WITHOUT A MAIN AGREEMENT, LEAVING CLIMATE FINANCE AND FOSSIL FUELS UNRESOLVED.",
    },
    {
      kicker: "THE GULF",
      head1: "IRAN VOWS TO COUNTER",
      head2: "US BLOCKADE",
      body: "TEHRAN SAYS IT WILL USE EVERY MEANS AGAINST A NAVAL BLOCKADE OF THE STRAIT OF HORMUZ AFTER TRUMP'S THREAT.",
    },
    {
      kicker: "TECHNOLOGY",
      head1: "US TO BLACKLIST CHIP",
      head2: "FIRM IN NVIDIA ROW",
      body: "WASHINGTON MOVES AGAINST SINGAPORE FIRM MEGASPEED AS A PROBE INTO NVIDIA-LINKED CHIP SALES WIDENS.",
    },
  ];
  drawCard(36, 518, 464, 176, cards[0]);
  drawCard(524, 518, 464, 176, cards[1]);
  drawCard(36, 710, 464, 176, cards[2]);
  drawCard(524, 710, 464, 176, cards[3]);
}

function drawSportAndFooter(): void {
  hline(36, 902, 952, INK, 2);
  drawText("SPORT: GUKESH V SINDAROV - GAME 1 OF THE CHESS WORLD TITLE TODAY IN GENEVA", 36, 916, 2, NAVY);
  drawText("ALSO: ALCARAZ WINS FIRST ATP FINALS TITLE * INDIA-NZ TEST DRAWN", 36, 940, 2, INK);
  drawTextCentred("SOURCES: REUTERS * AP * BBC * CHESS.COM", 512, 970, 1, GREY);
}

drawMasthead();
drawHero();
drawGrid();
drawSportAndFooter();

const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "entry.png"), encodePNG());
