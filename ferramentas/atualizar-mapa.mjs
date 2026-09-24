// Baixa uma "foto" do mapa (satélite e nomes atuais) para a pasta mapa/,
// para o site não depender desses servidores nem baixar tudo ao vivo.
// Rode de vez em quando para atualizar e faça o commit da pasta mapa/:
//
//   node ferramentas/atualizar-mapa.mjs
//
// Cobertura: a região inteira em zoom baixo, o miolo (Galileia → Mar Morto) em zoom médio
// e só os arredores de cada local em zoom alto. Fora disso o mapa mostra a versão menos nítida.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = path.join(RAIZ, "mapa");
const TEMP = path.join(RAIZ, "mapa.novo");

const CAMADAS = {
  sat: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", ext: "jpg" },
  nomes: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", ext: "png" },
};

// [oeste, sul, leste, norte] — REGIAO é o maxBounds do app.js
const REGIAO = [32.5, 29.3, 38.3, 34.9];
const MIOLO = [34.15, 30.85, 36.6, 33.65];

// Locais do data.js (arredores de cada um ganham zoom alto)
const dados = fs.readFileSync(path.join(RAIZ, "data.js"), "utf8");
const LUGARES = new Function(dados + "; return LUGARES;")();

const lon2x = (lon, z) => Math.floor(((lon + 180) / 360) * 2 ** z);
const lat2y = (lat, z) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
};

function caixa(set, [o, s, l, n], z) {
  for (let x = lon2x(o, z); x <= lon2x(l, z); x++)
    for (let y = lat2y(n, z); y <= lat2y(s, z); y++) set.add(`${z}/${x}/${y}`);
}
function arredores(set, z, raio) {
  for (const { c: [lon, lat] } of LUGARES) {
    const cx = lon2x(lon, z), cy = lat2y(lat, z);
    for (let dx = -raio; dx <= raio; dx++)
      for (let dy = -raio; dy <= raio; dy++) set.add(`${z}/${cx + dx}/${cy + dy}`);
  }
}

// Quais tiles cada camada baixa
const planos = { sat: new Set(), nomes: new Set() };
for (let z = 5; z <= 9; z++) Object.values(planos).forEach((s) => caixa(s, REGIAO, z));
[10, 11].forEach((z) => Object.values(planos).forEach((s) => caixa(s, MIOLO, z)));
arredores(planos.sat, 12, 2);
arredores(planos.sat, 13, 1);
arredores(planos.nomes, 12, 1);

async function baixar(url, arquivo, tentativas = 3) {
  for (let t = 1; ; t++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "CEOLocalBiblico.ai (atualizar-mapa)" } });
      if (r.status === 404) return false;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      fs.mkdirSync(path.dirname(arquivo), { recursive: true });
      fs.writeFileSync(arquivo, Buffer.from(await r.arrayBuffer()));
      return true;
    } catch (e) {
      if (t >= tentativas) throw new Error(`${url}: ${e.message}`);
      await new Promise((ok) => setTimeout(ok, 1000 * t));
    }
  }
}

const tarefas = Object.entries(planos).flatMap(([nome, set]) =>
  [...set].map((zxy) => {
    const [z, x, y] = zxy.split("/");
    const { url, ext } = CAMADAS[nome];
    return { url: url.replace("{z}", z).replace("{x}", x).replace("{y}", y), arquivo: path.join(TEMP, nome, z, x, `${y}.${ext}`) };
  }));

fs.rmSync(TEMP, { recursive: true, force: true });
console.log(`Baixando ${tarefas.length} tiles…`);
let feitos = 0, i = 0;
await Promise.all(Array.from({ length: 8 }, async () => {
  while (i < tarefas.length) {
    const { url, arquivo } = tarefas[i++];
    await baixar(url, arquivo);
    if (++feitos % 100 === 0) process.stdout.write(`  ${feitos}/${tarefas.length}\r`);
  }
}));

const hoje = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(TEMP, "info.js"),
  `// Gerado por ferramentas/atualizar-mapa.mjs — não edite à mão.\nconst MAPA_OFFLINE = { atualizadoEm: "${hoje}" };\n`);

// Só troca a pasta antiga depois que tudo baixou
fs.rmSync(DESTINO, { recursive: true, force: true });
fs.renameSync(TEMP, DESTINO);

let bytes = 0;
const somar = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) =>
  e.isDirectory() ? somar(path.join(d, e.name)) : (bytes += fs.statSync(path.join(d, e.name)).size));
somar(DESTINO);
console.log(`\nPronto: mapa/ atualizado em ${hoje} (${(bytes / 1048576).toFixed(1)} MB). Agora é só fazer o commit.`);
