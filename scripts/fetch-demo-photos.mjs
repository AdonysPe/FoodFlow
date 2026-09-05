/**
 * Downloads the demo carta's dish photos from Wikimedia Commons into
 * `public/demo/carta/` as WebP, and writes the attribution file their licences
 * require.
 *
 * Run once (`node scripts/fetch-demo-photos.mjs`); the files are committed, so
 * the seed and the public carta never depend on Wikimedia being reachable.
 * Hotlinking upload.wikimedia.org from a live menu gets rate-limited (429) —
 * measured — and Wikimedia asks people not to do it, so the bytes live here.
 *
 * Every file below is a real photo of the dish it is named after, chosen from
 * the Spanish Wikipedia article's lead image or a Commons search. They are
 * placeholder content for the Tanta demo account, not photos of any real venue.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const UA = "FoodFlow-demo-seed/1.0 (https://foodflow.site; info@foodflow.site)";
const OUT_DIR = path.join(process.cwd(), "public", "demo", "carta");
const WIDTH = 800;
const QUALITY = 72;

// dish name → { file: Commons File: title, slug: local basename }
const DISHES = {
  "Causa limeña": ["Causa Rellena.jpg", "causa-limena"],
  "Tiradito nikkei": ["Tiradito.jpg", "tiradito"],
  "Papa a la huancaína": ["Papa huancaina.jpg", "papa-huancaina"],
  "Anticuchos de corazón": ["Anticuchos de la Tia Grima.jpg", "anticuchos"],
  "Ceviche clásico": ["Ceviche at Peru.jpg", "ceviche"],
  "Lomo Saltado": ["Lomo-saltado-perudelights.jpg", "lomo-saltado"],
  "Ají de gallina": ["Ají de gallina - Tradicional.jpg", "aji-de-gallina"],
  "Arroz con mariscos": ["Arroz con mariscos.jpg", "arroz-con-mariscos"],
  "Tacu tacu con lomo": ["Tacu Tacu.jpg", "tacu-tacu"],
  "Chaufa de mariscos": ["Arroz chaufa especial 12032009.JPG", "chaufa"],
  "Pollo a la brasa (1/4)": ["Pollo a la brasa peruano.jpg", "pollo-a-la-brasa"],
  "Yuca frita": ["Yuca frita.jpg", "yuca-frita"],
  "Ensalada criolla": ["Sarza rocoto.jpg", "ensalada-criolla"],
  "Arroz blanco": ["Meshi 001.jpg", "arroz-blanco"],
  "Chicha morada": ["Chicha Morada 2017.jpg", "chicha-morada"],
  "Limonada frozen": ["Limonada - Paloma.jpg", "limonada"],
  "Inca Kola 500 ml": ["IncaKolaBottleGlass.jpg", "inca-kola"],
  "Pisco sour": ["Pisco sour 20100613b.JPG", "pisco-sour"],
  "Cerveza artesanal": ["Homebrew Beer (cropped).jpg", "cerveza"],
  "Suspiro a la limeña": ["Suspiro limeño.jpg", "suspiro-limeno"],
  Picarones: ["Recetas de picarones.jpg", "picarones"],
  "Torta de chocolate": [
    "Piece of chocolate cake on a white plate decorated with chocolate sauce.jpg",
    "torta-chocolate",
  ],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Commons throttles hard; every call retries with a widening backoff. */
async function api(url) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) {
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        /* fall through to the wait */
      }
    }
    await sleep(2000 * (attempt + 1));
  }
  throw new Error(`Commons no respondió: ${url}`);
}

async function download(url) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    await sleep(2000 * (attempt + 1));
  }
  throw new Error(`No se pudo descargar ${url}`);
}

const stripHtml = (s) =>
  (s ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const credits = [];

  for (const [dish, [file, slug]] of Object.entries(DISHES)) {
    const info = await api(
      "https://commons.wikimedia.org/w/api.php?action=query&format=json" +
        `&titles=${encodeURIComponent(`File:${file}`)}` +
        `&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=${WIDTH * 2}`
    );
    const page = Object.values(info?.query?.pages ?? {})[0];
    const ii = page?.imageinfo?.[0];
    if (!ii) throw new Error(`Sin imageinfo para ${file}`);

    const meta = ii.extmetadata ?? {};
    const bytes = await download(ii.thumburl ?? ii.url);
    const webp = await sharp(bytes)
      .resize({ width: WIDTH, height: Math.round((WIDTH * 3) / 4), fit: "cover", position: "attention" })
      .webp({ quality: QUALITY })
      .toBuffer();

    const target = path.join(OUT_DIR, `${slug}.webp`);
    await writeFile(target, webp);

    credits.push({
      dish,
      slug,
      file,
      page: ii.descriptionurl,
      author: stripHtml(meta.Artist?.value) || "Desconocido",
      licence: stripHtml(meta.LicenseShortName?.value) || "ver página del archivo",
    });

    console.log(
      `  ${slug}.webp  ${String(Math.round(webp.length / 1024)).padStart(4)} KB  ← ${file}`
    );
    await sleep(900);
  }

  const lines = [
    "# Créditos de las fotos de la carta demo",
    "",
    "Las imágenes de `public/demo/carta/` provienen de Wikimedia Commons y se",
    "usan únicamente como contenido de prueba de la cuenta demo (Tanta). No son",
    "fotografías de ningún restaurante real. Cada archivo fue redimensionado a",
    `${WIDTH} px de ancho y convertido a WebP; el original está en el enlace.`,
    "",
    "| Plato | Archivo | Autor | Licencia | Original |",
    "| --- | --- | --- | --- | --- |",
    ...credits.map(
      (c) =>
        `| ${c.dish} | \`${c.slug}.webp\` | ${c.author} | ${c.licence} | [Commons](${c.page}) |`
    ),
    "",
  ];
  await writeFile(path.join(OUT_DIR, "CREDITOS.md"), lines.join("\n"), "utf8");
  console.log(`\n${credits.length} fotos guardadas en public/demo/carta/ + CREDITOS.md`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
