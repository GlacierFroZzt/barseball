const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { TEAMS_CONFIG, generateCardHTML } = require('./generate_card_templates');

const BASE_DIR = path.resolve(__dirname, '..');
const TEAMS_DIR = path.join(BASE_DIR, 'teams');
const TARGETS_PREVIEW_DIR = path.join(BASE_DIR, 'targets_1280x720');
const MODELS_EXPORT_DIR = path.join(BASE_DIR, 'models_export');
const PORT = 8999;

fs.mkdirSync(TEAMS_DIR, { recursive: true });
fs.mkdirSync(TARGETS_PREVIEW_DIR, { recursive: true });
fs.mkdirSync(path.join(BASE_DIR, 'cascos'), { recursive: true });
fs.mkdirSync(path.join(BASE_DIR, 'pelotas'), { recursive: true });
fs.mkdirSync(path.join(BASE_DIR, 'jerseys'), { recursive: true });
fs.mkdirSync(path.join(BASE_DIR, 'bate'), { recursive: true });

const MODEL_MAP = {
  braves: 'jersey_braves.glb',
  marlins: 'bat_marlins.glb',
  mets: 'bat_mets.glb',
  phillies: 'bat_phillies.glb',
  nationals: 'jersey_nationals.glb',
  reds: 'helmet_reds.glb',
  brewers: 'jersey_brewers.glb',
  pirates: 'helmet_pirates.glb',
  cardinals: 'helmet_cardinals.glb',
  dodgers: 'ball_dodgers.glb',
  padres: 'ball_padres.glb',
  giants: 'ball_giants.glb'
};

const CATEGORY_MAP = {
  braves: { folder: 'jerseys', destName: 'jersey_braves.glb' },
  brewers: { folder: 'jerseys', destName: 'jersey_brewers.glb' },
  nationals: { folder: 'jerseys', destName: 'jersey_nationals.glb' },
  marlins: { folder: 'bate', destName: 'bate_marlins.glb' },
  mets: { folder: 'bate', destName: 'bate_mets.glb' },
  phillies: { folder: 'bate', destName: 'bate_phillies.glb' },
  cardinals: { folder: 'cascos', destName: 'casco_cardinals.glb' },
  reds: { folder: 'cascos', destName: 'casco_reds.glb' },
  pirates: { folder: 'cascos', destName: 'casco_pirates.glb' },
  dodgers: { folder: 'pelotas', destName: 'pelota_dodgers.glb' },
  padres: { folder: 'pelotas', destName: 'pelota_padres.glb' },
  giants: { folder: 'pelotas', destName: 'pelota_giants.glb' }
};

const server = http.createServer((req, res) => {
  const safePath = path.normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(BASE_DIR, safePath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.glb': 'model/gltf-binary',
    '.mind': 'application/octet-stream'
  };

  res.writeHead(200, {
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    'Access-Control-Allow-Origin': '*'
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Servidor local activo en http://127.0.0.1:${PORT}`);

  try {
    const browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });

    console.log('\n--- 1. GENERANDO 15 IMÁGENES (1280x720) Y COPIANDO MODELOS ---');
    const renderedImages = [];

    for (let i = 0; i < TEAMS_CONFIG.length; i++) {
      const team = TEAMS_CONFIG[i];
      console.log(`[${i + 1}/15] Generando imagen para: ${team.fullName}...`);

      const teamDir = path.join(TEAMS_DIR, team.slug);
      fs.mkdirSync(teamDir, { recursive: true });

      const html = generateCardHTML(team);
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 200));

      const targetImgPath = path.join(teamDir, 'target.png');
      const previewImgPath = path.join(TARGETS_PREVIEW_DIR, `${team.slug}_1280x720.png`);

      await page.screenshot({ path: targetImgPath });
      fs.copyFileSync(targetImgPath, previewImgPath);

      renderedImages.push({
        team,
        imgPath: targetImgPath,
        teamDir
      });

      if (MODEL_MAP[team.slug]) {
        const srcGlb = path.join(MODELS_EXPORT_DIR, MODEL_MAP[team.slug]);
        if (fs.existsSync(srcGlb)) {
          const destGlb = path.join(teamDir, 'model.glb');
          fs.copyFileSync(srcGlb, destGlb);

          const cat = CATEGORY_MAP[team.slug];
          if (cat) {
            const catDir = path.join(BASE_DIR, cat.folder);
            fs.mkdirSync(catDir, { recursive: true });
            fs.copyFileSync(srcGlb, path.join(catDir, cat.destName));
          }
        }
      }
    }
    console.log('✓ 15 imágenes generadas correctamente a 1280x720.');

    console.log('\n--- 2. INICIANDO COMPILADOR MINDAR LOCAL ---');
    // Cargar página con import local de MindAR
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <script type="module">
          import { Compiler } from "./node_modules/mind-ar/dist/mindar-image.prod.js";
          window.Compiler = Compiler;
          window.__READY__ = true;
        </script>
      </body>
      </html>
    `, { waitUntil: 'domcontentloaded' });

    // Wait for Compiler
    await page.waitForFunction(() => window.__READY__ === true, { timeout: 15000 });
    console.log('✓ Compilador MindAR listo.');

    await page.evaluate(() => {
      window.compileDataUrls = async (dataUrls) => {
        const compiler = new window.Compiler();
        const imgs = await Promise.all(dataUrls.map(url => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
          });
        }));

        await compiler.compileImageTargets(imgs, () => {});
        const buffer = await compiler.exportData();
        return Array.from(new Uint8Array(buffer));
      };
    });

    console.log('\n--- 3. COMPILANDO TARGET.MIND INDIVIDUAL EN CADA CARPETA ---');
    for (let i = 0; i < renderedImages.length; i++) {
      const item = renderedImages[i];
      console.log(`[${i + 1}/15] Compilando .mind para: ${item.team.fullName}...`);

      const imgB64 = fs.readFileSync(item.imgPath).toString('base64');
      const dataUrl = `data:image/png;base64,${imgB64}`;

      const bytes = await page.evaluate(async (url) => {
        return await window.compileDataUrls([url]);
      }, dataUrl);

      const targetMindPath = path.join(item.teamDir, 'target.mind');
      fs.writeFileSync(targetMindPath, Buffer.from(bytes));
    }

    console.log('\n--- 4. COMPILANDO TARGETS_COMBINED.MIND CON LOS 15 EQUIPOS ---');
    const allDataUrls = renderedImages.map(item => {
      const b64 = fs.readFileSync(item.imgPath).toString('base64');
      return `data:image/png;base64,${b64}`;
    });

    const masterBytes = await page.evaluate(async (urls) => {
      return await window.compileDataUrls(urls);
    }, allDataUrls);

    const masterMindPath = path.join(BASE_DIR, 'targets_combined.mind');
    fs.writeFileSync(masterMindPath, Buffer.from(masterBytes));
    console.log(`✓ Master targets_combined.mind creado exitosamente: ${masterMindPath} (${masterBytes.length} bytes)`);

    await browser.close();
    console.log('\n=== PROCESO COMPLETADO AL 100% ===');
  } catch (err) {
    console.error('Error durante el proceso:', err);
  } finally {
    server.close();
  }
});
