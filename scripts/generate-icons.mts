import sharp from "sharp";
import path from "node:path";

const brand = "#832321";

function svgIcon(size: number, padding: number) {
  const inner = size - padding * 2;
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="${brand}"/>
    <text x="50%" y="50%" font-family="Arial, sans-serif" font-weight="bold" font-size="${inner * 0.55}"
      fill="#ffffff" text-anchor="middle" dominant-baseline="central">M</text>
  </svg>`;
}

async function main() {
  const dir = path.join(process.cwd(), "public/icons");
  const targets: { name: string; size: number; padding: number }[] = [
    { name: "icon-192.png", size: 192, padding: 0 },
    { name: "icon-512.png", size: 512, padding: 0 },
    { name: "icon-maskable-192.png", size: 192, padding: 24 },
    { name: "icon-maskable-512.png", size: 512, padding: 64 },
    { name: "apple-touch-icon.png", size: 180, padding: 0 },
  ];
  for (const t of targets) {
    await sharp(Buffer.from(svgIcon(t.size, t.padding)))
      .png()
      .toFile(path.join(dir, t.name));
    console.log("Generated", t.name);
  }
}

main();
