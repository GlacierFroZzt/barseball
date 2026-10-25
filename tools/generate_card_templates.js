const fs = require('fs');
const path = require('path');

const TEAMS_CONFIG = [
  {
    id: 144,
    slug: 'braves',
    name: 'BRAVES',
    city: 'ATLANTA',
    fullName: 'Atlanta Braves',
    div: 'LN Este',
    color1: '#CE1141',
    color2: '#13274F',
    color3: '#EAAA00',
    modelType: 'JERSEY OFICIAL',
    titles: '4 Series Mundiales',
    stadium: 'Truist Park',
    founded: '1871'
  },
  {
    id: 146,
    slug: 'marlins',
    name: 'MARLINS',
    city: 'MIAMI',
    fullName: 'Miami Marlins',
    div: 'LN Este',
    color1: '#00A3E0',
    color2: '#EF3340',
    color3: '#000000',
    modelType: 'BATE PROFESIONAL',
    titles: '2 Series Mundiales',
    stadium: 'loanDepot park',
    founded: '1993'
  },
  {
    id: 121,
    slug: 'mets',
    name: 'METS',
    city: 'NEW YORK',
    fullName: 'New York Mets',
    div: 'LN Este',
    color1: '#FF5910',
    color2: '#002D72',
    color3: '#FFFFFF',
    modelType: 'BATE PROFESIONAL',
    titles: '2 Series Mundiales',
    stadium: 'Citi Field',
    founded: '1962'
  },
  {
    id: 143,
    slug: 'phillies',
    name: 'PHILLIES',
    city: 'PHILADELPHIA',
    fullName: 'Philadelphia Phillies',
    div: 'LN Este',
    color1: '#E81828',
    color2: '#002D72',
    color3: '#FFFFFF',
    modelType: 'BATE PROFESIONAL',
    titles: '2 Series Mundiales',
    stadium: 'Citizens Bank Park',
    founded: '1883'
  },
  {
    id: 120,
    slug: 'nationals',
    name: 'NATIONALS',
    city: 'WASHINGTON',
    fullName: 'Washington Nationals',
    div: 'LN Este',
    color1: '#AB0003',
    color2: '#14225A',
    color3: '#FFFFFF',
    modelType: 'JERSEY OFICIAL',
    titles: '1 Serie Mundial (2019)',
    stadium: 'Nationals Park',
    founded: '1969'
  },
  {
    id: 112,
    slug: 'cubs',
    name: 'CUBS',
    city: 'CHICAGO',
    fullName: 'Chicago Cubs',
    div: 'LN Central',
    color1: '#0E3386',
    color2: '#CC3433',
    color3: '#FFFFFF',
    modelType: 'MODELO EN DESARROLLO',
    titles: '3 Series Mundiales',
    stadium: 'Wrigley Field',
    founded: '1876'
  },
  {
    id: 113,
    slug: 'reds',
    name: 'REDS',
    city: 'CINCINNATI',
    fullName: 'Cincinnati Reds',
    div: 'LN Central',
    color1: '#C6011F',
    color2: '#000000',
    color3: '#FFFFFF',
    modelType: 'CASCO DE BATEO',
    titles: '5 Series Mundiales',
    stadium: 'Great American Ball Park',
    founded: '1881'
  },
  {
    id: 158,
    slug: 'brewers',
    name: 'BREWERS',
    city: 'MILWAUKEE',
    fullName: 'Milwaukee Brewers',
    div: 'LN Central',
    color1: '#FFC52F',
    color2: '#12284C',
    color3: '#FFFFFF',
    modelType: 'JERSEY OFICIAL',
    titles: 'Campeón Banderín LN',
    stadium: 'American Family Field',
    founded: '1969'
  },
  {
    id: 134,
    slug: 'pirates',
    name: 'PIRATES',
    city: 'PITTSBURGH',
    fullName: 'Pittsburgh Pirates',
    div: 'LN Central',
    color1: '#FDB827',
    color2: '#000000',
    color3: '#FFFFFF',
    modelType: 'CASCO DE BATEO',
    titles: '5 Series Mundiales',
    stadium: 'PNC Park',
    founded: '1882'
  },
  {
    id: 138,
    slug: 'cardinals',
    name: 'CARDINALS',
    city: 'ST. LOUIS',
    fullName: 'St. Louis Cardinals',
    div: 'LN Central',
    color1: '#C41E3A',
    color2: '#0C2340',
    color3: '#FEDB00',
    modelType: 'CASCO DE BATEO',
    titles: '11 Series Mundiales',
    stadium: 'Busch Stadium',
    founded: '1882'
  },
  {
    id: 109,
    slug: 'diamondbacks',
    name: 'D-BACKS',
    city: 'ARIZONA',
    fullName: 'Arizona Diamondbacks',
    div: 'LN Oeste',
    color1: '#A71930',
    color2: '#30CED8',
    color3: '#E3D4AD',
    modelType: 'MODELO EN DESARROLLO',
    titles: '1 Serie Mundial (2001)',
    stadium: 'Chase Field',
    founded: '1998'
  },
  {
    id: 115,
    slug: 'rockies',
    name: 'ROCKIES',
    city: 'COLORADO',
    fullName: 'Colorado Rockies',
    div: 'LN Oeste',
    color1: '#33006F',
    color2: '#C4CED4',
    color3: '#000000',
    modelType: 'MODELO EN DESARROLLO',
    titles: 'Campeón Banderín LN',
    stadium: 'Coors Field',
    founded: '1993'
  },
  {
    id: 119,
    slug: 'dodgers',
    name: 'DODGERS',
    city: 'LOS ANGELES',
    fullName: 'Los Angeles Dodgers',
    div: 'LN Oeste',
    color1: '#005A9C',
    color2: '#EF3E42',
    color3: '#FFFFFF',
    modelType: 'PELOTA OFICIAL',
    titles: '8 Series Mundiales',
    stadium: 'Dodger Stadium',
    founded: '1883'
  },
  {
    id: 135,
    slug: 'padres',
    name: 'PADRES',
    city: 'SAN DIEGO',
    fullName: 'San Diego Padres',
    div: 'LN Oeste',
    color1: '#FFC425',
    color2: '#2F241D',
    color3: '#FFFFFF',
    modelType: 'PELOTA OFICIAL',
    titles: '2 Banderines LN',
    stadium: 'Petco Park',
    founded: '1969'
  },
  {
    id: 137,
    slug: 'giants',
    name: 'GIANTS',
    city: 'SAN FRANCISCO',
    fullName: 'San Francisco Giants',
    div: 'LN Oeste',
    color1: '#FD5A1E',
    color2: '#27251F',
    color3: '#EFD19F',
    modelType: 'PELOTA OFICIAL',
    titles: '8 Series Mundiales',
    stadium: 'Oracle Park',
    founded: '1883'
  }
];

function generateCardHTML(team) {
  const logosDir = path.resolve(__dirname, '..', 'logos_svg');
  const svgPath = path.join(logosDir, `${team.slug}.svg`);
  let svgContent = '';
  if (fs.existsSync(svgPath)) {
    svgContent = fs.readFileSync(svgPath, 'utf8');
    svgContent = svgContent.replace(/<svg\b([^>]*)>/i, '<svg $1 style="width:100%;height:100%;max-width:320px;max-height:320px;filter:drop-shadow(0 14px 28px rgba(0,0,0,0.65));">');
  }

  return `<!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1280px;
        height: 720px;
        overflow: hidden;
        background-color: #080c14;
        font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
        color: #ffffff;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* Fondo Dinámico con Iluminación Ambiental de Equipo */
      .bg-container {
        position: absolute;
        inset: 0;
        background: 
          radial-gradient(circle at 25% 50%, ${team.color1}40 0%, transparent 55%),
          radial-gradient(circle at 80% 30%, ${team.color2}55 0%, transparent 60%),
          linear-gradient(135deg, #070a12 0%, #101726 50%, #05080e 100%);
        overflow: hidden;
      }

      /* Trama de Puntos y Cuadrícula para Máxima Detección AR */
      .dot-grid {
        position: absolute;
        inset: 0;
        background-image: 
          radial-gradient(rgba(255, 255, 255, 0.16) 1.5px, transparent 1.5px),
          linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px);
        background-size: 32px 32px, 64px 64px, 64px 64px;
        opacity: 0.9;
      }

      /* Costuras Icónicas de Béisbol */
      .baseball-seams {
        position: absolute;
        right: -80px;
        top: -80px;
        width: 520px;
        height: 520px;
        border: 5px dashed ${team.color1};
        border-radius: 50%;
        opacity: 0.35;
        pointer-events: none;
      }
      .baseball-seams-2 {
        position: absolute;
        left: -140px;
        bottom: -140px;
        width: 560px;
        height: 560px;
        border: 5px dashed ${team.color3};
        border-radius: 50%;
        opacity: 0.25;
        pointer-events: none;
      }

      /* Marco Exterior AR Target con Miras Calibradas */
      .ar-frame {
        position: absolute;
        inset: 22px;
        border: 2px solid rgba(255, 255, 255, 0.22);
        border-radius: 24px;
        pointer-events: none;
      }

      .corner-bracket {
        position: absolute;
        width: 54px;
        height: 54px;
        border: 6px solid ${team.color1};
      }
      .cb-tl { top: 14px; left: 14px; border-right: none; border-bottom: none; border-top-left-radius: 16px; }
      .cb-tr { top: 14px; right: 14px; border-left: none; border-bottom: none; border-top-right-radius: 16px; }
      .cb-bl { bottom: 14px; left: 14px; border-right: none; border-top: none; border-bottom-left-radius: 16px; }
      .cb-br { bottom: 14px; right: 14px; border-left: none; border-top: none; border-bottom-right-radius: 16px; }

      .corner-crosshair {
        position: absolute;
        font-family: 'Consolas', 'Courier New', monospace;
        font-size: 13px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.65);
        letter-spacing: 2.5px;
      }
      .ch-tl { top: 30px; left: 84px; }
      .ch-tr { top: 30px; right: 84px; }
      .ch-bl { bottom: 30px; left: 84px; }
      .ch-br { bottom: 30px; right: 84px; }

      /* Tarjeta Principal */
      .main-card {
        position: relative;
        z-index: 10;
        width: 1200px;
        height: 640px;
        display: flex;
        align-items: center;
        padding: 40px 60px;
        gap: 60px;
      }

      /* Columna del Logo (Izquierda) */
      .logo-col {
        flex: 0 0 460px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
      }

      .logo-badge {
        width: 410px;
        height: 410px;
        border-radius: 42px;
        background: linear-gradient(145deg, rgba(255,255,255,0.09) 0%, rgba(18,25,40,0.85) 100%);
        border: 2px solid rgba(255, 255, 255, 0.28);
        box-shadow: 
          0 25px 60px rgba(0, 0, 0, 0.75),
          inset 0 0 50px ${team.color1}30;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px;
        position: relative;
      }

      .logo-badge::before {
        content: '';
        position: absolute;
        inset: -7px;
        border-radius: 49px;
        border: 2px dashed ${team.color1};
        pointer-events: none;
        opacity: 0.8;
      }

      .logo-tag {
        margin-top: 18px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(0, 0, 0, 0.65);
        border: 1px solid rgba(255, 255, 255, 0.25);
        padding: 6px 20px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 2px;
        color: #f8fafc;
        text-transform: uppercase;
      }

      /* Columna de Información (Derecha) */
      .info-col {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        text-align: left;
      }

      .league-tag {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
        font-weight: 900;
        letter-spacing: 3px;
        color: ${team.color1};
        text-transform: uppercase;
        margin-bottom: 10px;
      }

      .league-badge-pill {
        background: ${team.color1}33;
        border: 1.5px solid ${team.color1};
        color: #ffffff;
        padding: 4px 14px;
        border-radius: 8px;
        font-size: 13px;
      }

      .city-name {
        font-size: 32px;
        font-weight: 900;
        letter-spacing: 7px;
        color: #cbd5e1;
        text-transform: uppercase;
        line-height: 1.1;
      }

      .team-name {
        font-family: 'Impact', 'Arial Black', sans-serif;
        font-size: 102px;
        font-weight: 900;
        line-height: 0.95;
        letter-spacing: 3px;
        text-transform: uppercase;
        color: #ffffff;
        text-shadow: 
          0 4px 15px rgba(0,0,0,0.9),
          0 0 35px ${team.color1}44;
        margin-bottom: 12px;
      }

      .divider-line {
        width: 100%;
        height: 4px;
        background: linear-gradient(to right, ${team.color1}, ${team.color2}, rgba(255,255,255,0.1));
        margin: 10px 0 20px 0;
        border-radius: 2px;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 22px;
      }

      .stat-item {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        padding: 10px 18px;
      }

      .stat-label {
        font-size: 11px;
        font-weight: 800;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 1.8px;
        margin-bottom: 3px;
      }

      .stat-value {
        font-size: 16px;
        font-weight: 800;
        color: #f8fafc;
      }

      .footer-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(15, 23, 42, 0.85);
        border: 1.5px solid rgba(255, 255, 255, 0.18);
        border-radius: 16px;
        padding: 14px 22px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      }

      .model-badge {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 900;
        color: #38bdf8;
        letter-spacing: 1.2px;
      }

      .ar-scan-callout {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 900;
        color: #facc15;
        letter-spacing: 2px;
      }
    </style>
  </head>
  <body>
    <div class="bg-container">
      <div class="dot-grid"></div>
      <div class="baseball-seams"></div>
      <div class="baseball-seams-2"></div>
    </div>

    <div class="ar-frame">
      <div class="corner-bracket cb-tl"></div>
      <div class="corner-bracket cb-tr"></div>
      <div class="corner-bracket cb-bl"></div>
      <div class="corner-bracket cb-br"></div>
      <div class="corner-crosshair ch-tl">AR_TARGET // NL-${team.id}</div>
      <div class="corner-crosshair ch-tr">bARseball.com</div>
      <div class="corner-crosshair ch-bl">DIM: 1280x720</div>
      <div class="corner-crosshair ch-br">[ ${team.div.toUpperCase()} ]</div>
    </div>

    <div class="main-card">
      <div class="logo-col">
        <div class="logo-badge">
          ${svgContent}
        </div>
        <div class="logo-tag">
          <span>⚾</span>
          <span>LOGO OFICIAL MLB</span>
        </div>
      </div>

      <div class="info-col">
        <div class="league-tag">
          <span class="league-badge-pill">MLB</span>
          <span>LIGA NACIONAL &bull; ${team.div}</span>
        </div>

        <div class="city-name">${team.city}</div>
        <div class="team-name">${team.name}</div>

        <div class="divider-line"></div>

        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-label">Sede / Estadio</div>
            <div class="stat-value">${team.stadium}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Palmarés</div>
            <div class="stat-value">${team.titles}</div>
          </div>
        </div>

        <div class="footer-bar">
          <div class="model-badge">
            <span>📦</span>
            <span>${team.modelType}</span>
          </div>
          <div class="ar-scan-callout">
            <span>📷</span>
            <span>ESCANEAR CON bARseball AR</span>
          </div>
        </div>
      </div>
    </div>
  </body>
  </html>`;
}

module.exports = { TEAMS_CONFIG, generateCardHTML };
