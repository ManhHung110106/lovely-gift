import { mkdir, writeFile } from "node:fs/promises";
await mkdir("public/demo", { recursive: true });
const start = (bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="700" viewBox="0 0 600 700"><rect width="600" height="700" fill="${bg}"/>`;
const flower = (x, y, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0Q-20 80 0 160" stroke="#6c7c58" stroke-width="5" fill="none"/><path d="M-10 98Q-90 58-60 34Q-17 45-10 98M-7 65Q55 5 69 27Q48 68-7 65" fill="#849772"/>${Array.from({ length: 7 }, (_, i) => `<ellipse cx="0" cy="-24" rx="21" ry="37" fill="${i % 2 ? "#d991a1" : "#edb6bc"}" transform="rotate(${i * 51})"/>`).join("")}<circle r="20" fill="#bf738a"/><circle r="9" fill="#f0c28b"/></g>`;
await writeFile(
  "public/demo/flowers.svg",
  start("#ead6c6") +
    `<rect x="45" y="45" width="510" height="610" rx="240" fill="#d5bbaa"/>${flower(260, 240, 1.7)}${flower(375, 310, 1.25)}${flower(170, 330, 1.1)}<path d="M195 475Q300 425 390 475L365 650H220Z" fill="#f7e5d0"/><path d="M180 490Q300 535 415 490" fill="none" stroke="#9c5b6f" stroke-width="12"/><text x="300" y="680" text-anchor="middle" font-family="serif" font-style="italic" font-size="17" fill="#9c7785">a little bouquet of happiness</text></svg>`,
);
await writeFile(
  "public/demo/garden.svg",
  start("#d6ddc8") +
    `<circle cx="430" cy="150" r="64" fill="#f9e5bb"/><path d="M0 450Q160 280 340 470Q490 355 600 420V700H0Z" fill="#8fa58b"/><path d="M0 570Q300 400 600 590V700H0Z" fill="#6d8a72"/><path d="M290 700Q200 580 300 420Q280 580 420 700" fill="#ead6b5"/>${flower(120, 430, 0.9)}${flower(490, 495, 0.7)}${flower(80, 570, 0.55)}${flower(470, 595, 0.65)}<text x="300" y="55" text-anchor="middle" font-family="serif" font-size="24" fill="#687e69">a day to bloom</text></svg>`,
);
await writeFile(
  "public/demo/sunset.svg",
  start("#eac5bf") +
    `<circle cx="300" cy="325" r="120" fill="#f6d899"/><path d="M0 440Q100 425 240 445T600 440V700H0Z" fill="#aa9aa6"/><path d="M0 510Q200 490 600 510M0 560Q200 545 600 560M0 620Q200 600 600 620" stroke="#dfc9c1" stroke-width="3" fill="none"/><path d="M200 455H390M220 480H370" stroke="#f6d899" stroke-width="7"/><path d="M60 240q20-16 40 0q20-16 40 0M390 180q20-16 40 0q20-16 40 0" fill="none" stroke="#b57f89" stroke-width="3"/><text x="300" y="80" text-anchor="middle" font-family="serif" font-style="italic" font-size="24" fill="#aa7483">collecting little moments</text></svg>`,
);
await writeFile(
  "public/demo/moon.svg",
  start("#655c79") +
    `<circle cx="320" cy="230" r="93" fill="#ead9b0"/><circle cx="360" cy="198" r="90" fill="#655c79"/>${Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 83) % 600}" cy="${(i * 47) % 450}" r="${(i % 3) + 1}" fill="#eddfca"/>`).join("")}<path d="M0 470Q120 420 280 480T600 480V700H0Z" fill="#4a4a69"/><path d="M0 570Q220 490 600 610V700H0Z" fill="#3a405d"/><text x="300" y="650" text-anchor="middle" font-family="serif" font-style="italic" font-size="24" fill="#e6cfd7">you are a little bit of magic</text></svg>`,
);
console.log("Original demo illustrations created.");
