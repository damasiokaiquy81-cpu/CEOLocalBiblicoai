/* CEOLocalBiblico.ai — dois mapas 3D sincronizados: época de Jesus (em cima, recortado) × hoje (embaixo). */

const $ = (s) => document.querySelector(s);
const pequeno = () => matchMedia("(max-width: 820px)").matches;

const VISAO_GERAL = () => ({
  center: pequeno() ? [35.42, 32.05] : [35.50, 32.12],
  zoom: pequeno() ? 6.9 : 7.75,
  pitch: 55,
  bearing: -14,
});

// nomes sempre visíveis; os demais aparecem ao aproximar (evita amontoado na visão geral)
const IMPORTANTES = new Set(["jerusalem", "belem", "nazare", "cafarnaum", "jerico", "cesareiafilipe", "sicar",
  "tiro", "sidom", "cesareia", "damasco", "gaza", "jope", "tiberiades", "gerasa"]);

// ---------- Fontes de dados comuns ----------
const SAT = {
  type: "raster", tileSize: 256, maxzoom: 19,
  tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
  attribution: "Imagens © Esri, Maxar, Earthstar Geographics",
};
const DEM = () => ({
  type: "raster-dem", encoding: "terrarium", tileSize: 256, maxzoom: 13,
  tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
  attribution: "Relevo: Terrain Tiles (AWS Open Data / SRTM)",
});

const fechar = (anel) => [...anel, anel[0]];
const geoRegioes = {
  type: "FeatureCollection",
  features: REGIOES.map((r) => ({
    type: "Feature", properties: { id: r.id, cor: r.cor },
    geometry: { type: "Polygon", coordinates: [fechar(r.poly)] },
  })),
};
const geoAguas = {
  type: "FeatureCollection",
  features: AGUAS_ANTIGAS.map((a) => ({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [fechar(a.poly)] } })),
};
const geoEstradas = {
  type: "FeatureCollection",
  features: ESTRADAS.map((e) => ({ type: "Feature", properties: { nome: e.nome }, geometry: { type: "LineString", coordinates: e.c } })),
};

function estilo(tipo) {
  const antes = tipo === "antes";
  const s = {
    version: 8,
    sources: { sat: SAT, dem: DEM(), relevo: DEM() },
    layers: [
      { id: "fundo", type: "background", paint: { "background-color": "#121214" } },
      { id: "sat", type: "raster", source: "sat", paint: antes
          ? { "raster-saturation": -0.45, "raster-contrast": 0.12, "raster-brightness-max": 0.92, "raster-hue-rotate": 8, "raster-fade-duration": 250 }
          : { "raster-saturation": 0.08, "raster-contrast": 0.06, "raster-fade-duration": 250 } },
      { id: "relevo", type: "hillshade", source: "relevo", paint: {
          "hillshade-exaggeration": antes ? 0.38 : 0.22,
          "hillshade-shadow-color": antes ? "#2a1d0c" : "#101418",
          "hillshade-highlight-color": antes ? "#fff1cc" : "#ffffff",
          "hillshade-accent-color": "#000000",
          "hillshade-illumination-direction": 315 } },
    ],
    terrain: { source: "dem", exaggeration: 1.7 },
  };

  if (antes) {
    s.sources.regioes = { type: "geojson", data: geoRegioes, promoteId: "id" };
    s.sources.aguas = { type: "geojson", data: geoAguas };
    s.sources.estradas = { type: "geojson", data: geoEstradas };
    s.layers.push(
      { id: "regioes-fill", type: "fill", source: "regioes", paint: {
          "fill-color": ["get", "cor"],
          "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.42, 0.2] } },
      { id: "regioes-borda-brilho", type: "line", source: "regioes", paint: {
          "line-color": ["get", "cor"], "line-width": 7, "line-blur": 6, "line-opacity": 0.45 } },
      { id: "regioes-borda", type: "line", source: "regioes", paint: {
          "line-color": "#f3e2b8", "line-width": 1.4, "line-opacity": 0.85, "line-dasharray": [3, 2] } },
      { id: "aguas", type: "fill", source: "aguas", paint: { "fill-color": "#3f86b8", "fill-opacity": 0.72 } },
      { id: "aguas-borda", type: "line", source: "aguas", paint: { "line-color": "#9fd0f0", "line-width": 1, "line-opacity": 0.8 } },
      { id: "estradas", type: "line", source: "estradas", layout: { "line-cap": "round" }, paint: {
          "line-color": "#e8d7ae", "line-width": ["interpolate", ["linear"], ["zoom"], 7, 1.2, 11, 2.6],
          "line-opacity": 0.75, "line-dasharray": [2, 2.2] } },
    );
  } else {
    s.sources.nomes = {
      type: "raster", tileSize: 256, maxzoom: 19,
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"],
      attribution: "Fronteiras e nomes © Esri",
    };
    s.layers.push({ id: "nomes", type: "raster", source: "nomes", paint: { "raster-opacity": 0.9 } });
  }
  return s;
}

function criarMapa(id, tipo) {
  const m = new maplibregl.Map({
    container: id,
    style: estilo(tipo),
    ...VISAO_GERAL(),
    zoom: 6.2, pitch: 0, bearing: 0,
    maxPitch: 80,
    minZoom: 5.5,
    maxBounds: [[32.5, 29.3], [38.3, 34.9]],
    attributionControl: false,
    fadeDuration: 150,
  });
  m.once("style.load", () => {
    try {
      m.setSky(tipo === "antes"
        ? { "sky-color": "#2b2416", "horizon-color": "#d9b77a", "fog-color": "#8c7650", "sky-horizon-blend": 0.6, "horizon-fog-blend": 0.35, "fog-ground-blend": 0.7, "atmosphere-blend": 0.8 }
        : { "sky-color": "#1c3150", "horizon-color": "#b9d0e6", "fog-color": "#8aa2ba", "sky-horizon-blend": 0.6, "horizon-fog-blend": 0.35, "fog-ground-blend": 0.7, "atmosphere-blend": 0.8 });
    } catch (e) { /* céu é só enfeite */ }
  });
  return m;
}

const mapHoje = criarMapa("mapHoje", "hoje");
const mapAntes = criarMapa("mapAntes", "antes");
mapHoje.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
mapHoje.addControl(new maplibregl.AttributionControl({
  compact: true,
  customAttribution: "Locais: OpenBible.info · Pleiades · Regiões: aprox., segundo Josefo e atlas históricos",
}), "bottom-right");
// os créditos começam recolhidos (no celular o MapLibre os abre por cima do mapa); o "i" abre
mapHoje.once("load", () => document.querySelectorAll(".maplibregl-compact-show").forEach((el) => el.classList.remove("maplibregl-compact-show")));
setTimeout(() => document.querySelectorAll(".maplibregl-compact-show").forEach((el) => el.classList.remove("maplibregl-compact-show")), 1500);

// ---------- Sincronia entre os dois mapas ----------
let sincronizando = false;
function sincronizar(de, para) {
  de.on("move", () => {
    if (sincronizando) return;
    sincronizando = true;
    para.jumpTo({ center: de.getCenter(), zoom: de.getZoom(), bearing: de.getBearing(), pitch: de.getPitch() });
    sincronizando = false;
  });
}
sincronizar(mapHoje, mapAntes);
sincronizar(mapAntes, mapHoje);

// quem o usuário está vendo recebe as animações de câmera
const mapaAtivo = () => (document.body.dataset.mode === "hoje" ? mapHoje : mapAntes);

mapHoje.on("zoom", () => { $("#maps").dataset.zoom = mapHoje.getZoom() >= 9.3 ? "perto" : "longe"; });

// ---------- Divisor arrastável ----------
let split = 50;
function setSplit(p) {
  split = Math.max(0, Math.min(100, p));
  document.documentElement.style.setProperty("--split", split + "%");
  $("#alca").setAttribute("aria-valuenow", Math.round(split));
}
(() => {
  const alca = $("#alca");
  let arrastando = false;
  alca.addEventListener("pointerdown", (e) => { arrastando = true; alca.setPointerCapture(e.pointerId); e.preventDefault(); });
  alca.addEventListener("pointermove", (e) => { if (arrastando) setSplit((e.clientX / innerWidth) * 100); });
  const soltar = () => { arrastando = false; };
  alca.addEventListener("pointerup", soltar);
  alca.addEventListener("pointercancel", soltar);
  alca.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") setSplit(split - 4);
    if (e.key === "ArrowRight") setSplit(split + 4);
  });
})();

// ---------- Modos ----------
function setModo(modo) {
  document.body.dataset.mode = modo;
  document.querySelectorAll(".modos button").forEach((b) => b.classList.toggle("on", b.dataset.mode === modo));
  if (modo === "comparar" && (split < 8 || split > 92)) setSplit(50);
  fecharDica();
}
document.querySelectorAll(".modos button").forEach((b) => b.addEventListener("click", () => setModo(b.dataset.mode)));

// ---------- Rótulos de regiões e águas (época de Jesus) ----------
function rotulo(map, lngLat, html, cls = "rotulo-regiao") {
  const el = document.createElement("div");
  el.className = cls;
  el.innerHTML = html;
  return new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
}
const rotulosRegiao = REGIOES.map((r) => rotulo(mapAntes, r.label, `${r.nome}<small>${r.gov.split(" (")[0]}</small>`));
[
  ["Mar Grande", [34.45, 32.35]],
  ["Mar da Galileia", [35.575, 32.735]],
  ["Mar Salgado", [35.50, 31.40]],
  ["Rio Jordão", [35.545, 32.28]],
].forEach(([n, c]) => {
  const m = rotulo(mapAntes, c, n, "rotulo-regiao");
  Object.assign(m.getElement().style, { fontStyle: "italic", letterSpacing: ".18em", fontSize: "13px", color: "#bfe1f7", textTransform: "none" });
});
mapAntes.on("zoom", () => {
  const z = mapAntes.getZoom();
  const op = z > 10.5 ? 0 : z > 9.5 ? 0.45 : 1;
  rotulosRegiao.forEach((m) => (m.getElement().style.opacity = op));
});

// ---------- Destaque de região ao passar o mouse ----------
let regiaoHover = null;
const chip = $("#chipRegiao");
mapAntes.on("mousemove", "regioes-fill", (e) => {
  const f = e.features[0];
  if (!f) return;
  if (regiaoHover !== f.id) {
    if (regiaoHover) mapAntes.setFeatureState({ source: "regioes", id: regiaoHover }, { hover: false });
    regiaoHover = f.id;
    mapAntes.setFeatureState({ source: "regioes", id: regiaoHover }, { hover: true });
    const r = REGIOES.find((x) => x.id === f.id);
    chip.innerHTML = `<b>${r.nome}</b><small>${r.gov}</small><p>${r.txt}</p>`;
  }
  chip.hidden = false;
  chip.style.left = e.originalEvent.clientX + "px";
  chip.style.top = e.originalEvent.clientY + "px";
});
mapAntes.on("mouseleave", "regioes-fill", () => {
  if (regiaoHover) mapAntes.setFeatureState({ source: "regioes", id: regiaoHover }, { hover: false });
  regiaoHover = null;
  chip.hidden = true;
});
mapAntes.on("movestart", () => (chip.hidden = true));

// ---------- Marcadores dos locais ----------
const marcadores = {}; // id -> [elAntes, elHoje]
let dica = null;
function fecharDica() { if (dica) { dica.remove(); dica = null; } }

function pais(txt) {
  const m = txt.match(/(Cisjordânia|Faixa de Gaza|Colinas de Golã|Jordânia|Líbano|Síria|Israel|Jerusalém)/);
  return m ? m[1] : "";
}

function criarMarcador(map, l, tipo) {
  const el = document.createElement("div");
  el.className = `mk ${tipo}` + (IMPORTANTES.has(l.id) ? "" : " menor");
  el.innerHTML = `<div class="pino"></div><div class="nome">${tipo === "antes" ? l.nome : l.hojeNome.split(" (")[0]}</div>`;
  el.addEventListener("mouseenter", () => {
    fecharDica();
    const html = tipo === "antes"
      ? `<div class="rot">Época de Jesus</div><b>${l.nome}</b><p>${l.antes}</p>`
      : `<div class="rot">Hoje${pais(l.hoje) ? " · " + pais(l.hoje) : ""}</div><b>${l.hojeNome}</b><p>${l.hoje}</p>`;
    dica = new maplibregl.Popup({ closeButton: false, closeOnClick: false, anchor: "bottom", offset: [0, -12], className: `dica ${tipo}`, maxWidth: "270px" })
      .setLngLat(l.c).setHTML(html).addTo(map);
  });
  el.addEventListener("mouseleave", fecharDica);
  el.addEventListener("click", (e) => { e.stopPropagation(); pararTour(); selecionar(l); });
  new maplibregl.Marker({ element: el, anchor: "top", offset: [0, -7] }).setLngLat(l.c).addTo(map);
  return el;
}
LUGARES.forEach((l) => { marcadores[l.id] = [criarMarcador(mapAntes, l, "antes"), criarMarcador(mapHoje, l, "hoje")]; });

// ---------- Lista lateral ----------
const ordenados = [...TOUR, ...LUGARES.filter((l) => !l.tour).sort((a, b) => a.nome.localeCompare(b.nome, "pt"))];
function montarLista(filtro = "") {
  const f = filtro.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const norm = (s) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  $("#lista").innerHTML = ordenados
    .filter((l) => !f || norm(l.nome + " " + l.hojeNome).includes(f))
    .map((l) => `<li data-id="${l.id}" ${l.tour ? "data-tour" : ""} class="${atual && atual.id === l.id ? "on" : ""}">
        <span class="n">${l.tour || "•"}</span>
        <span class="t"><b>${l.nome}</b><small>Hoje: ${l.hojeNome}</small></span></li>`)
    .join("") || `<li style="cursor:default;color:var(--muted)">Nenhum local encontrado.</li>`;
}
$("#lista").addEventListener("click", (e) => {
  const li = e.target.closest("li[data-id]");
  if (!li) return;
  pararTour();
  selecionar(LUGARES.find((l) => l.id === li.dataset.id));
});
$("#busca").addEventListener("input", (e) => montarLista(e.target.value));

// ---------- Legenda ----------
$("#legendaLista").innerHTML = REGIOES.map((r) => `<li data-id="${r.id}"><i style="background:${r.cor}"></i>${r.nome}</li>`).join("");
$("#legendaLista").addEventListener("click", (e) => {
  const li = e.target.closest("li");
  if (!li) return;
  const r = REGIOES.find((x) => x.id === li.dataset.id);
  const b = r.poly.reduce((bb, [x, y]) => [[Math.min(bb[0][0], x), Math.min(bb[0][1], y)], [Math.max(bb[1][0], x), Math.max(bb[1][1], y)]], [[180, 90], [-180, -90]]);
  pararTour();
  if (document.body.dataset.mode === "hoje") setModo("comparar");
  const cam = mapaAtivo().cameraForBounds(b, { padding: pequeno() ? 40 : { top: 120, bottom: 60, left: 300, right: 400 } });
  mapaAtivo().flyTo({ ...cam, zoom: cam.zoom - 0.3, pitch: 50, bearing: -10, duration: 3000, essential: true });
});

// ---------- Seleção de local ----------
let atual = null;
function selecionar(l, voar = true) {
  atual = l;
  Object.entries(marcadores).forEach(([id, els]) => els.forEach((el) => el.classList.toggle("on", id === l.id)));
  montarLista($("#busca").value);
  const ativo = document.querySelector(`#lista li[data-id="${l.id}"]`);
  if (ativo) ativo.scrollIntoView({ block: "nearest", behavior: "smooth" });

  const i = TOUR.indexOf(l);
  $("#detalhe").innerHTML = `
    <div class="topo-det">
      <div><h2>${l.nome}</h2></div>
      <button class="x" id="fecharDet" title="Fechar"><svg class="icon"><use href="#i-x"/></svg></button>
    </div>
    <div class="bloco antes"><div class="rot">Época de Jesus <span>c. 30 d.C.</span></div><p>${l.antes}</p></div>
    <div class="bloco hoje"><div class="rot">Hoje <span>${l.hojeNome}</span></div><p>${l.hoje}</p></div>
    <div class="ref">${l.ref}</div>
    ${i >= 0 ? `<div class="nav-tour">
      <button class="btn small" id="antTour" ${i === 0 ? "disabled" : ""}><svg class="icon"><use href="#i-left"/></svg>Anterior</button>
      <button class="btn small" id="proxTour" ${i === TOUR.length - 1 ? "disabled" : ""}>Próximo<svg class="icon"><use href="#i-right"/></svg></button>
    </div>` : ""}`;
  $("#detalhe").hidden = false;
  $("#painel").classList.add("com-detalhe");
  $("#detalhe").scrollTop = 0;
  $("#fecharDet").onclick = () => { pararTour(); limparSelecao(); };
  if (i >= 0) {
    $("#antTour").onclick = () => { pararTour(); selecionar(TOUR[i - 1]); };
    $("#proxTour").onclick = () => { pararTour(); selecionar(TOUR[i + 1]); };
  }
  history.replaceState(null, "", "#" + l.id);
  if (voar) voarPara(l);
}

function limparSelecao() {
  atual = null;
  $("#detalhe").hidden = true;
  $("#painel").classList.remove("com-detalhe");
  Object.values(marcadores).forEach((els) => els.forEach((el) => el.classList.remove("on")));
  montarLista($("#busca").value);
  history.replaceState(null, "", location.pathname + location.search);
}

function voarPara(l, duracao = 4200) {
  const m = mapaAtivo();
  const giro = m.getBearing() + (Math.random() * 50 - 25);
  // desloca o ponto para fora do painel (embaixo em telas pequenas, à direita nas largas).
  // Usa offset e não padding: com padding o centro dos dois mapas deixaria de coincidir.
  const offset = pequeno() ? [0, -innerHeight * 0.2] : [-170, 30];
  m.flyTo({ center: l.c, zoom: 12.2, pitch: 64, bearing: Math.max(-60, Math.min(60, giro)), duration: duracao, curve: 1.6, offset, essential: true });
}

function visaoGeral(duracao = 3000) {
  mapaAtivo().flyTo({ ...VISAO_GERAL(), duration: duracao, essential: true });
}
$("#btnInicio").addEventListener("click", () => { pararTour(); limparSelecao(); visaoGeral(); });

// ---------- Tour "Vida de Jesus" ----------
let tourAtivo = false, tourTimer = null, tourIdx = 0;
function iconeTour() {
  $("#btnTour").innerHTML = tourAtivo
    ? `<svg class="icon"><use href="#i-pause"/></svg><span>Pausar</span>`
    : `<svg class="icon"><use href="#i-play"/></svg><span>Vida de Jesus</span>`;
}
function passoTour() {
  if (!tourAtivo) return;
  const l = TOUR[tourIdx];
  selecionar(l);
  mapaAtivo().once("moveend", () => {
    if (!tourAtivo) return;
    tourTimer = setTimeout(() => {
      tourIdx++;
      if (tourIdx >= TOUR.length) { pararTour(); visaoGeral(4000); return; }
      passoTour();
    }, 6500);
  });
}
function pararTour() {
  if (!tourAtivo) return;
  tourAtivo = false;
  clearTimeout(tourTimer);
  iconeTour();
}
$("#btnTour").addEventListener("click", () => {
  if (tourAtivo) { pararTour(); return; }
  tourAtivo = true;
  iconeTour();
  tourIdx = atual && atual.tour ? TOUR.indexOf(atual) : 0;
  passoTour();
});
// qualquer arraste manual interrompe o tour
[mapHoje, mapAntes].forEach((m) => m.on("dragstart", pararTour));

// ---------- Fontes ----------
$("#btnFontes").addEventListener("click", () => $("#dlgFontes").showModal());
$("#fecharFontes").addEventListener("click", () => $("#dlgFontes").close());
$("#btnSair").addEventListener("click", () => { if (confirm("Sair do CEOLocalBiblico.ai neste aparelho?")) Acesso.sair(); });

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && atual && !$("#dlgFontes").open) { pararTour(); limparSelecao(); }
});

// ---------- Entrada ----------
montarLista();
// "load" só dispara quando TODOS os tiles chegaram; em internet lenta isso demora,
// então a abertura sai no que vier primeiro: os dois mapas prontos ou 6 s.
function sair() {
  if ($("#intro").classList.contains("saindo")) return;
  $("#intro").classList.add("saindo");
  const alvo = LUGARES.find((l) => l.id === location.hash.slice(1));
  if (alvo) selecionar(alvo);
  else mapaAtivo().flyTo({ ...VISAO_GERAL(), duration: 5200, curve: 1.2, essential: true });
}
let prontos = 0;
const aoCarregar = () => { if (++prontos === 2) sair(); };
mapHoje.on("load", aoCarregar);
mapAntes.on("load", aoCarregar);
setTimeout(sair, 6000);
