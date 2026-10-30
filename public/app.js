// O Mentiroso: renderização da página.
// Dados manuais: data/dados.js (window.DADOS). Dados oficiais automáticos: data/auto.js (window.AUTO).
// Os gráficos são HTML/SVG próprios, sem bibliotecas externas, para aparecerem em qualquer navegador.

const D = window.DADOS;
const A = window.AUTO || { series: {} };
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const INICIO_LULA3 = "2023-01";

/* ---------- Formatação ---------- */
const nf = d => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const num = (v, d = 1) => nf(d).format(v);
const pct = (v, d = 1) => num(v, d) + "%";
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const mes = ym => { const [a, m] = ym.split("-"); return `${MESES[+m - 1]}/${a}`; };
function reais(v) {
  if (v >= 1e12) return "R$ " + num(v / 1e12, 2) + " tri";
  if (v >= 1e9) return "R$ " + num(v / 1e9, 1) + " bi";
  return "R$ " + num(v / 1e6, 1) + " mi";
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------- Acesso às séries automáticas ---------- */
const serie = nome => A.series[nome] || [];
const ultimo = nome => serie(nome).at(-1) || [null, null];
const em = (nome, ym) => (serie(nome).find(([m]) => m === ym) || [null, null])[1];
const mediaAno = (nome, ano) => {
  const v = serie(nome).filter(([m]) => m.startsWith(ano + "-")).map(([, x]) => x);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
};
const maxDesde = (nome, ym) => Math.max(...serie(nome).filter(([m]) => m >= ym).map(([, v]) => v));

// Valores que preenchem os elementos com data-auto="chave".
function valoresAuto() {
  const [dRef, dVal] = ultimo("divida");
  const [sRef, sVal] = ultimo("selic");
  const [jRef, jVal] = ultimo("juros12mPib");
  const [uRef, uVal] = ultimo("desemprego");
  const [iRef, iVal] = ultimo("ipca12m");
  const dr = ultimo("dividaReais")[1];
  const v = {};
  if (dVal != null) Object.assign(v, { dividaPct: pct(dVal), dividaRef: mes(dRef) });
  if (em("divida", "2022-12") != null) v.divida2022 = pct(em("divida", "2022-12"));
  if (dr != null) v.dividaReais = reais(dr * 1e6);
  if (sVal != null) Object.assign(v, { selic: pct(sVal, 2), selicRef: mes(sRef), selicMax: new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(maxDesde("selic", INICIO_LULA3)) + "%" });
  if (jVal != null) Object.assign(v, { jurosPib: pct(jVal, 2), jurosRef: mes(jRef) });
  if (A.juros12mReais) Object.assign(v, {
    jurosReais: reais(A.juros12mReais.valor),
    jurosSegundo: "R$ " + num(A.juros12mReais.valor / 365 / 86400 / 1000, 1) + " mil",
  });
  if (uVal != null) Object.assign(v, { desemprego: pct(uVal), desempregoRef: mes(uRef) });
  if (iVal != null) Object.assign(v, { ipca: pct(iVal, 2), ipcaRef: mes(iRef) });
  if (A.atualizadoEm) {
    const d = new Date(A.atualizadoEm);
    v.atualizado = d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  return v;
}

function aplicarAuto() {
  const v = valoresAuto();
  document.querySelectorAll("[data-auto]").forEach(n => {
    if (v[n.dataset.auto] != null) n.textContent = v[n.dataset.auto];
  });
}

/* ---------- Componentes de gráfico ---------- */
function moldura(el, titulo, fonte, corpo, extra = "") {
  el.classList.add("chart");
  el.innerHTML = `<div class="chart-head"><h3>${esc(titulo)}</h3>${extra}</div>${corpo}` +
    (fonte ? `<p class="chart-src">Fonte: ${esc(fonte)}</p>` : "");
}

// Barras verticais. pontos: [rótulo, valor, destacar?]
function vbars(id, { titulo, fonte, pontos, fmt = v => num(v), destaque }) {
  const el = document.getElementById(id);
  if (!el || !pontos?.length) return;
  const max = Math.max(...pontos.map(p => p[1])) * 1.1;
  const cols = pontos.map(([l, v, lula], i) => {
    const hot = lula || destaque?.includes(l);
    return `<div class="vb${hot ? " hot" : ""}" style="--h:${(v / max) * 100}%;--i:${i}">
      <span class="vb-val">${fmt(v)}</span><div class="vb-bar"></div><span class="vb-lbl">${esc(l)}</span></div>`;
  }).join("");
  moldura(el, titulo, fonte, `<div class="vbars">${cols}</div>`);
}

// Barras horizontais com rótulo acima da trilha (funciona em qualquer largura).
function hbars(id, { titulo, fonte, pontos, fmt = v => num(v), destaque, compacto }) {
  const el = document.getElementById(id);
  if (!el || !pontos?.length) return;
  const max = Math.max(...pontos.map(p => p[1]));
  const rows = pontos.map(([l, v, hot], i) => `
    <div class="hb${hot || destaque?.includes(l) ? " hot" : ""}" style="--w:${(v / max) * 100}%;--i:${i}">
      <div class="hb-top"><span>${esc(l)}</span><b>${fmt(v)}</b></div>
      <div class="hb-track"><div class="hb-fill"></div></div>
    </div>`).join("");
  moldura(el, titulo, fonte, `<div class="hbars${compacto ? " compact" : ""}">${rows}</div>`);
}

// Rosca (donut) com legenda.
function donut(id, { titulo, fonte, pontos, cores, fmt = v => pct(v) }) {
  const el = document.getElementById(id);
  if (!el || !pontos?.length) return;
  const total = pontos.reduce((s, p) => s + p[1], 0);
  let acc = 0;
  const stops = pontos.map(([, v], i) => {
    const a = (acc / total) * 100; acc += v;
    return `${cores[i]} ${a}% ${(acc / total) * 100}%`;
  }).join(",");
  const leg = pontos.map(([l, v], i) => `<li><i style="background:${cores[i]}"></i>${esc(l)}<b>${fmt(v)}</b></li>`).join("");
  moldura(el, titulo, fonte, `<div class="donut-wrap">
    <div class="donut" style="--stops:${stops}"><div class="donut-hole"><b>${fmt(pontos[0][1])}</b><span>${esc(pontos[0][0])}</span></div></div>
    <ul class="legend">${leg}</ul></div>`);
}

// Linha do tempo com área, faixa da pandemia, faixa do governo Lula 3 e leitura ao passar o dedo/mouse.
function linha(id, { titulo, fonte, dados, fmt = v => num(v), desde = "2018-01", zero = false }) {
  const el = document.getElementById(id);
  const s = dados.filter(([m]) => m >= desde);
  if (!el || s.length < 2) return;
  const W = 1000, H = 320, n = s.length;
  const vals = s.map(p => p[1]);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * 0.12 || 1;
  lo = zero ? 0 : lo - pad; hi += pad;
  const X = i => (i / (n - 1)) * W;
  const Y = v => H - ((v - lo) / (hi - lo)) * H;
  const pts = s.map(([, v], i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`);
  const idx = ym => Math.max(0, s.findIndex(([m]) => m >= ym));
  const faixa = (a, b, cls, rotulo) => {
    const ia = s.findIndex(([m]) => m >= a);
    if (ia < 0) return "";
    const ib = b ? Math.max(ia, s.findLastIndex(([m]) => m <= b)) : n - 1;
    return `<div class="band ${cls}" style="left:${(X(ia) / W) * 100}%;width:${((X(ib) - X(ia)) / W) * 100}%"><span>${rotulo}</span></div>`;
  };
  const anos = [...new Set(s.map(([m]) => m.slice(0, 4)))];
  const passo = anos.length > 7 ? 2 : 1;
  const ticks = anos.filter((_, i) => i % passo === 0).map(a =>
    `<span style="left:${(X(idx(a + "-01")) / W) * 100}%">${a}</span>`).join("");
  const grid = [0.25, 0.5, 0.75].map(f => `<line x1="0" x2="${W}" y1="${H * f}" y2="${H * f}"/>`).join("");
  const [ultM, ultV] = s.at(-1);
  const gid = "g" + id;
  el.classList.add("chart");
  el.innerHTML = `
    <div class="chart-head"><h3>${esc(titulo)}</h3>
      <div class="chart-now"><b>${fmt(ultV)}</b><span>${mes(ultM)}</span></div></div>
    <div class="legend-inline"><span class="lg pand">Pandemia</span><span class="lg lula">Governo Lula 3</span></div>
    <div class="plot">
      ${faixa("2020-03", "2021-12", "pand", "")}${faixa(INICIO_LULA3, null, "lula", "")}
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ff2b2b" stop-opacity=".45"/><stop offset="1" stop-color="#ff2b2b" stop-opacity="0"/></linearGradient></defs>
        <g class="grid">${grid}</g>
        <g class="draw">
          <polygon points="0,${H} ${pts.join(" ")} ${W},${H}" fill="url(#${gid})"/>
          <polyline points="${pts.join(" ")}" fill="none" stroke="#ff3b3b" stroke-width="3" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
        </g>
      </svg>
      <span class="y-lbl top">${fmt(hi)}</span><span class="y-lbl bot">${fmt(lo)}</span>
      <i class="dot end" style="left:100%;top:${(Y(ultV) / H) * 100}%"></i>
      <i class="dot hover"></i><i class="cross"></i><div class="tip"></div>
    </div>
    <div class="xaxis">${ticks}</div>
    ${fonte ? `<p class="chart-src">Fonte: ${esc(fonte)} · atualizado automaticamente</p>` : ""}`;

  const plot = el.querySelector(".plot"), tip = el.querySelector(".tip"),
    dot = el.querySelector(".dot.hover"), cross = el.querySelector(".cross");
  const mover = e => {
    const r = plot.getBoundingClientRect();
    const i = Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * (n - 1));
    const [m, v] = s[i];
    const x = (X(i) / W) * 100, y = (Y(v) / H) * 100;
    plot.classList.add("hovering");
    dot.style.left = cross.style.left = tip.style.left = x + "%";
    dot.style.top = y + "%";
    tip.style.top = y + "%";
    tip.classList.toggle("flip", x > 70);
    tip.innerHTML = `<span>${mes(m)}</span><b>${fmt(v)}</b>`;
  };
  plot.addEventListener("pointermove", mover);
  plot.addEventListener("pointerdown", mover);
  plot.addEventListener("pointerleave", () => plot.classList.remove("hovering"));
}

// Antes × depois: cada indicador com uma barra para 2020 e outra para hoje.
function comparativo(id, linhas) {
  const el = document.getElementById(id);
  if (!el) return;
  const rows = linhas.filter(r => r.antes != null && r.hoje != null).map((r, i) => {
    const max = Math.max(r.antes, r.hoje);
    const pior = r.menorMelhor ? r.hoje > r.antes : r.hoje < r.antes;
    return `<div class="cmp" style="--i:${i}">
      <div class="cmp-head"><span>${esc(r.nome)}</span><em class="trend ${pior ? "down" : "up"}">${pior ? "pior" : "melhor"}</em></div>
      <div class="cmp-row old"><span>${esc(r.rotAntes || "2020")}</span><div class="hb-track"><div class="hb-fill" style="--w:${(r.antes / max) * 100}%"></div></div><b>${r.fmt(r.antes)}</b></div>
      <div class="cmp-row now"><span>${esc(r.rotHoje || "Hoje")}</span><div class="hb-track"><div class="hb-fill" style="--w:${(r.hoje / max) * 100}%"></div></div><b>${r.fmt(r.hoje)}</b></div>
    </div>`;
  }).join("");
  moldura(el, "Pandemia (2020) × hoje", "Banco Central e IBGE (automático); Ministério da Saúde", `<div class="cmps">${rows}</div>`);
}

/* ---------- Seções de conteúdo ---------- */
const STATUS_LABEL = { nao: "Não cumprida", parcial: "Parcial", cumprida: "Cumprida" };

function renderPromessas(filtro) {
  const box = document.getElementById("promises");
  box.innerHTML = D.promessas.filter(p => filtro === "todas" || p.s === filtro).map((p, i) => `
    <article class="promise tilt ${p.s}" style="--i:${i}">
      <span class="badge ${p.s}">${STATUS_LABEL[p.s]}</span>
      <h3>${esc(p.t)}</h3><p>${esc(p.d)}</p><p class="cost">Custo: <b>${esc(p.custo)}</b></p>
    </article>`).join("");
}

function renderPlacar() {
  const c = s => D.promessas.filter(p => p.s === s).length;
  document.getElementById("scoreboard").innerHTML = `
    <div class="score nao"><b>${c("nao")}</b><span>não cumpridas</span></div>
    <div class="score parcial"><b>${c("parcial")}</b><span>parciais</span></div>
    <div class="score cumprida"><b>${c("cumprida")}</b><span>cumpridas (com asterisco)</span></div>
    <div class="score quaest"><b>70%</b><span>acham que ele não cumpre</span></div>`;
}

function renderPessoas() {
  document.getElementById("people").innerHTML =
    Array.from({ length: 100 }, (_, i) => `<span class="p${i < 23 ? " on" : ""}" style="--i:${i}"></span>`).join("");
}

function renderTabelas() {
  document.getElementById("criouBody").innerHTML = D.criou.map(([p, o, v]) =>
    `<tr><td><b>${esc(p)}</b></td><td>${esc(o)}</td><td><span class="verdict">${esc(v)}</span></td></tr>`).join("");
  document.getElementById("cortesCards").innerHTML = D.cortes.map(([t, d]) =>
    `<article class="card tilt"><div class="scissors" aria-hidden="true">✂</div><h3>${esc(t)}</h3><p>${esc(d)}</p></article>`).join("");
  document.getElementById("sourcesList").innerHTML = D.fontes.map(([t, u]) =>
    `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join("");
}

function renderGraficos() {
  const G = D.graficos;
  const bcb = "Banco Central (SGS)";
  linha("gDivida", { titulo: "Dívida bruta do governo geral (% do PIB)", fonte: bcb + " 13762", dados: serie("divida"), fmt: v => pct(v) });
  linha("gJuros", { titulo: "Juros pagos em 12 meses (% do PIB)", fonte: bcb + " 5760", dados: serie("juros12mPib"), fmt: v => pct(v, 2), zero: true });
  linha("gSelic", { titulo: "Taxa Selic (% ao ano)", fonte: bcb + " 432", dados: serie("selic"), fmt: v => pct(v, 2), zero: true });
  linha("gDesemp", { titulo: "Desemprego (%)", fonte: "IBGE, PNAD Contínua (via " + bcb + " 24369)", dados: serie("desemprego"), fmt: v => pct(v) });

  vbars("gBF", { ...G.bolsaFamilia, fmt: v => num(v, 2) + " mi" });
  donut("gBFReg", { ...G.bolsaFamiliaRegiao, cores: ["#d0141b", "#5a4446"], fmt: v => num(v, 2) + " mi" });
  hbars("gEdu", { ...G.educacao, fmt: v => pct(v, 0), destaque: G.educacao.pontos.map(p => p[0]) });
  hbars("gAnalf", { ...G.analfabetismo, fmt: v => pct(v) });
  hbars("gHomic", { ...G.homicidios });
  vbars("gDengue", { ...G.dengue, fmt: v => num(v, 2) + " mi" });
  hbars("gArbo", { ...G.arboviroses, fmt: v => num(v, 0), destaque: ["Chikungunya", "Oropouche"] });
  vbars("gCartao", { ...G.cartao, fmt: v => "R$ " + num(v, 0) + " mi" });
  vbars("gViagens", { ...G.viagens, fmt: v => "R$ " + num(v, 1) + " mi" });
  vbars("gFaccoes", { ...G.faccoes, fmt: v => pct(v, 0) });
  donut("gPresidios", { ...G.presidios, cores: ["#d0141b", "#2f6fb0", "#5a4446"] });

  const uf = A.desempregoUF || [];
  if (uf.length) {
    hbars("gDesempUF", {
      titulo: `Desemprego por estado (%, ${uf[0].periodo})`,
      fonte: "IBGE SIDRA, tabela 4099 · atualizado automaticamente · vermelho = Nordeste",
      pontos: uf.map(u => [u.uf, u.valor, u.regiao === "Nordeste"]),
      fmt: v => pct(v), compacto: true,
    });
  }

  const dengue = Object.fromEntries(G.dengue.pontos.map(([a, v]) => [a, v]));
  comparativo("gPandemia", [
    { nome: "Selic (% ao ano)", antes: em("selic", "2020-12"), hoje: ultimo("selic")[1], fmt: v => pct(v, 2), menorMelhor: true },
    { nome: "Juros pagos em 12 meses", antes: A.juros2020Reais, hoje: A.juros12mReais?.valor, fmt: reais, menorMelhor: true },
    { nome: "Juros em 12 meses (% do PIB)", antes: em("juros12mPib", "2020-12"), hoje: ultimo("juros12mPib")[1], fmt: v => pct(v, 2), menorMelhor: true },
    { nome: "Dívida bruta (% do PIB)", antes: em("divida", "2020-12"), hoje: ultimo("divida")[1], fmt: v => pct(v), menorMelhor: true },
    { nome: "Inflação em 12 meses (IPCA)", antes: em("ipca12m", "2020-12"), hoje: ultimo("ipca12m")[1], fmt: v => pct(v, 2), menorMelhor: true },
    { nome: "Casos prováveis de dengue", antes: dengue["2020"] * 1e6, hoje: dengue["2024"] * 1e6, rotHoje: "2024", fmt: v => num(v / 1e6, 2) + " mi", menorMelhor: true },
    { nome: "Desemprego (média do ano × último dado)", antes: mediaAno("desemprego", "2020"), hoje: ultimo("desemprego")[1], fmt: v => pct(v), menorMelhor: true },
  ]);
}

/* ---------- Atualização ao vivo no navegador ---------- */
// O Banco Central libera CORS: ao abrir a página, busca o último dado das séries principais.
// Se vier algo mais novo que o auto.js, atualiza os números na hora.
async function atualizarAoVivo() {
  const codigos = { selic: 432, divida: 13762, juros12mPib: 5760, desemprego: 24369, ipca12m: 13522 };
  let mudou = false;
  await Promise.all(Object.entries(codigos).map(async ([nome, cod]) => {
    try {
      const r = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${cod}/dados/ultimos/1?formato=json`, { signal: AbortSignal.timeout(8000) });
      const [{ data, valor }] = await r.json();
      const [, m, a] = data.split("/");
      const ym = `${a}-${m}`, v = parseFloat(valor), s = (A.series[nome] ||= []);
      const last = s.at(-1);
      if (!last || ym > last[0]) { s.push([ym, v]); mudou = true; }
      else if (ym === last[0] && v !== last[1]) { last[1] = v; mudou = true; }
    } catch { /* sem rede ou API fora do ar: fica com o auto.js */ }
  }));
  if (mudou) { aplicarAuto(); renderGraficos(); observarGraficos(); }
}

/* ---------- Movimento ---------- */
function startCounter() {
  const total = A.juros12mReais?.valor || 1.182e12;
  const porSeg = total / 365 / 86400;
  const out = document.getElementById("jurosCounter");
  const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const t0 = performance.now();
  (function tick() {
    out.textContent = fmt.format(((performance.now() - t0) / 1000) * porSeg);
    requestAnimationFrame(tick);
  })();
}

function startProgress() {
  const bar = document.getElementById("progressBar");
  const update = () => {
    const h = document.documentElement;
    bar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100 + "%";
  };
  addEventListener("scroll", update, { passive: true });
  update();
}

// Anima de 0 até o número escrito no elemento, mantendo prefixo e sufixo.
function countUp(node) {
  const m = node.textContent.match(/^(\D*?)(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:,\d+)?)(.*)$/s);
  if (!m) return;
  const [, pre, n, post] = m;
  const decimals = (n.split(",")[1] || "").length;
  const target = parseFloat(n.replace(/\./g, "").replace(",", "."));
  const f = nf(decimals), t0 = performance.now(), dur = 1600;
  (function tick(t) {
    const k = Math.min(1, (t - t0) / dur);
    node.textContent = pre + f.format(target * (1 - Math.pow(1 - k, 3))) + post;
    if (k < 1) requestAnimationFrame(tick);
  })(t0);
}

function startReveal() {
  const alvos = document.querySelectorAll(".section h2, .intro, .stat, .score, .table-wrap, .callout, .timeline li, .card, .prison, .people, .people-legend, .globe, .sub, .sources, .disclaimer");
  alvos.forEach(t => {
    t.classList.add("reveal");
    t.style.setProperty("--rd", ([...t.parentElement.children].indexOf(t) % 6) * 80 + "ms");
  });
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add("in");
    io.unobserve(e.target);
    if (!REDUCED) e.target.querySelectorAll(":scope > b").forEach(countUp);
  }), { threshold: 0.12 });
  alvos.forEach(t => io.observe(t));
}

// Gráficos já nascem visíveis; a classe "in" só dispara a animação de entrada.
let ioGraficos;
function observarGraficos() {
  const charts = document.querySelectorAll(".chart:not(.in)");
  if (REDUCED || !("IntersectionObserver" in window)) { charts.forEach(c => c.classList.add("in")); return; }
  ioGraficos ||= new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in"); ioGraficos.unobserve(e.target); }
  }), { threshold: 0.05 });
  charts.forEach(c => { c.classList.add("armed"); ioGraficos.observe(c); });
  // Garantia: se por algum motivo o observador não disparar, mostra tudo.
  setTimeout(() => document.querySelectorAll(".chart.armed:not(.in)").forEach(c => {
    const r = c.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) c.classList.add("in");
  }), 2500);
}

function startTilt() {
  if (REDUCED || !matchMedia("(hover: hover)").matches) return;
  document.addEventListener("pointermove", e => {
    const c = e.target.closest(".tilt");
    if (!c) return;
    const r = c.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    c.style.transform = `perspective(700px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg) translateY(-4px)`;
  });
  document.addEventListener("pointerout", e => {
    const c = e.target.closest(".tilt");
    if (c && !c.contains(e.relatedTarget)) c.style.transform = "";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  aplicarAuto();
  renderPlacar();
  renderPromessas("todas");
  renderPessoas();
  renderTabelas();
  renderGraficos();
  startCounter();
  startProgress();
  startReveal();
  observarGraficos();
  startTilt();
  atualizarAoVivo();
  document.getElementById("filters").addEventListener("click", e => {
    const b = e.target.closest(".chip");
    if (!b) return;
    document.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c === b));
    renderPromessas(b.dataset.f);
  });
});
