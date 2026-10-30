// O Mentiroso: dados e renderização da página.
// Valores aproximados e arredondados; fontes na seção "Fontes".

const PROMESSAS = [
  { t: "Picanha e cervejinha no fim de semana", s: "nao", custo: "—",
    d: "A comida continua cara. A inflação de alimentos superou a inflação geral em vários anos do mandato e a carne segue fora do orçamento das famílias pobres." },
  { t: "Criar o Ministério da Segurança Pública", s: "nao", custo: "—",
    d: "Não saiu do papel. Enquanto isso, a parcela da população que vive sob influência de facções subiu de 14% para 19% em um ano." },
  { t: "Acabar com o orçamento secreto", s: "nao", custo: "≈ R$ 50 bi/ano em emendas",
    d: "Quem proibiu foi o STF, em 2022. As emendas parlamentares só cresceram, inclusive as “emendas Pix”, de baixa transparência." },
  { t: "Acabar com o sigilo de 100 anos", s: "parcial", custo: "—",
    d: "Revisou parte dos sigilos do governo anterior, mas impôs novos: 99,5% dos gastos da Presidência com cartão estão sob sigilo, segundo o TCU." },
  { t: "Zerar a fila do INSS", s: "nao", custo: "—",
    d: "A fila continua na casa dos milhões de pedidos. E foi no INSS que estourou o esquema de R$ 6,3 bi em descontos indevidos de aposentados." },
  { t: "Zerar a fila do SUS", s: "nao", custo: "—",
    d: "O programa “Agora Tem Especialistas” veio só em 2025. A fila de cirurgias, consultas e exames continua enorme." },
  { t: "Regulamentar o trabalho por aplicativo", s: "nao", custo: "—",
    d: "O projeto foi enviado ao Congresso em 2024 e empacou." },
  { t: "Internet banda larga em todas as escolas", s: "parcial", custo: "—",
    d: "Houve avanço, mas a meta não foi universalizada." },
  { t: "Desmatamento zero na Amazônia", s: "parcial", custo: "—",
    d: "O desmatamento caiu, mas a meta é só para 2030 e as queimadas bateram recordes em 2024." },
  { t: "Bolsa Família de R$ 600 + R$ 150 por criança", s: "cumprida", custo: "≈ R$ 157–168 bi/ano",
    d: "Cumprida. O valor de R$ 600 já tinha sido aprovado no governo anterior, e hoje 1 em cada 4 brasileiros vive em família beneficiária." },
  { t: "Isenção do IR para quem ganha até R$ 5 mil", s: "cumprida", custo: "≈ R$ 26 bi/ano",
    d: "Aprovada só em 2025, para valer a partir de janeiro de 2026, ano da eleição. Foram três anos de espera." },
  { t: "Salário mínimo com ganho real", s: "cumprida", custo: "≈ R$ 400 mi/ano a cada R$ 1 de aumento",
    d: "Cumprida, mas o próprio governo limitou o ganho real a 2,5% ao ano no pacote de corte de gastos de dezembro de 2024." },
  { t: "Reforma tributária", s: "cumprida", custo: "—",
    d: "Aprovada em 2023 (EC 132). Com IVA estimado em cerca de 28%, o Brasil deve ter um dos maiores impostos sobre consumo do mundo." },
  { t: "Retomar Mais Médicos e Minha Casa Minha Vida", s: "cumprida", custo: "—",
    d: "Retomados com novos nomes e metas. São programas de 2009 e 2013 relançados." },
  { t: "Renegociar dívidas das famílias (Desenrola)", s: "cumprida", custo: "≈ R$ 8 bi em garantias",
    d: "Lançado em 2023. Mesmo assim, o endividamento das famílias voltou a bater recordes com a Selic alta." },
];

const CRIOU = [
  ["Bolsa Família", "Criado em 2003 juntando Bolsa Escola (FHC, 2001), Auxílio Gás (FHC, 2002), Bolsa Alimentação e Cartão Alimentação.", "Rebatizou e unificou"],
  ["Benefício de R$ 600", "Valor criado no Auxílio Brasil em 2022, no governo Bolsonaro.", "Herdou"],
  ["SUS", "Constituição de 1988.", "Não é dele"],
  ["Plano Real", "1994, governo Itamar Franco e FHC. O PT votou contra.", "Não é dele"],
  ["Pix", "Banco Central, lançado em novembro de 2020.", "Não é dele"],
  ["FIES", "1999, governo FHC, no lugar do antigo Crédito Educativo.", "Não é dele"],
  ["Luz para Todos", "2003, sucessor do Luz no Campo (FHC, 1999).", "Ampliou"],
  ["Transposição do São Francisco", "Projeto antigo. As obras começaram em 2007; os eixos foram entregues entre 2017 e 2022.", "Começou, outros entregaram"],
  ["Mais Médicos", "2013, governo Dilma.", "Do PT, mas não dele"],
  ["ProUni", "2004.", "Criou"],
  ["Farmácia Popular", "2004.", "Criou"],
  ["SAMU", "2003, em âmbito nacional.", "Criou"],
  ["Minha Casa Minha Vida", "2009.", "Criou"],
  ["Pé-de-Meia", "2024, parcialmente pago fora do Orçamento, o que levou o TCU a intervir.", "Criou (com contabilidade criativa)"],
];

const PANDEMIA = [
  ["Selic (fim do ano)", "2,0%", "13,75%", "pior"],
  ["Juros pagos pelo setor público em 12 meses", "R$ 312 bi (4,2% do PIB)", "R$ 1,18 tri (8,86% do PIB)", "pior"],
  ["Dívida bruta (% do PIB)", "86,9%", "82,9%, e subindo", "quase igual, sem pandemia"],
  ["Casos prováveis de dengue", "≈ 980 mil", "6,5 mi em 2024 (recorde)", "pior"],
  ["Desemprego", "13,8% (média de 2020)", "5,6% (média de 2025)", "melhor"],
];

const CORTES = [
  ["Salário mínimo travado", "O pacote fiscal de dezembro de 2024 limitou o ganho real do mínimo a 2,5% ao ano, o que também reduz aposentadorias e o BPC."],
  ["Abono salarial encolhido", "O limite de renda para receber o abono passa a cair gradualmente até 1,5 salário mínimo. Milhões de trabalhadores vão perder o benefício."],
  ["BPC mais difícil", "Regras mais duras de renda e cadastro para idosos e pessoas com deficiência de baixa renda."],
  ["Congelamento de R$ 31,3 bi", "Em maio de 2025, o governo bloqueou e contingenciou R$ 31,3 bi do Orçamento, atingindo saúde, educação e investimentos."],
  ["Universidades no aperto", "Orçamento discricionário apertado e greve de professores e técnicos das federais em 2024."],
];

const SOURCES = [
  ["Banco Central: dívida bruta e juros (via Poder360)", "https://www.poder360.com.br/poder-economia/divida-bruta-atinge-819-do-pib-em-junho-diz-banco-central/"],
  ["Dívida bruta sobe a 82,5% do PIB, maior nível desde 2021 (SBT News)", "https://sbtnews.sbt.com.br/noticia/economia/divida-bruta-governo-sobe-para-82-5-do-pib-em-julho"],
  ["Juros da dívida chegam a R$ 1,18 tri em 12 meses (Paraíba Business)", "https://paraibabusiness.com.br/juros-da-divida-publica-chegam-a-r-118-trilhao-em-12-meses-e-pressionam-divida-do-brasil/"],
  ["Próximo presidente herdará dívida de 82,9% do PIB e Selic de 13,75% (Forbes, via Paraíba Business)", "https://paraibabusiness.com.br/proximo-presidente-herdara-divida-de-829-do-pib-e-selic-de-1375-diz-forbes/"],
  ["MDS: Informes do Bolsa Família", "https://www.gov.br/mds/pt-br/acoes-e-programas/bolsa-familia/informes/informe-bolsa-familia-115"],
  ["Bolsa Família volta a crescer em 2026 (Poder360)", "https://www.poder360.com.br/poder-governo/bolsa-familia-volta-a-crescer-em-2026-depois-de-queda-em-2025/"],
  ["IBGE: Censo 2022, analfabetismo", "https://agenciadenoticias.ibge.gov.br/agencia-noticias/2012-agencia-denoticias/40098-censo-2022-taxa-de-analfabetismo-cai-de-9-6-para-7-0-em-12-anos-mas-desifualdades-persistem"],
  ["IBGE: desemprego por estado (2º tri 2025, via SBT News)", "https://sbtnews.sbt.com.br/noticia/economia/taxa-de-desemprego-cai-em-18-estados-do-brasil-no-segundo-trimestre-de-2025-diz-ibge"],
  ["Atlas da Violência: homicídios por estado (NSC Total)", "https://www.nsctotal.com.br/noticias/novo-ranking-revela-os-estados-mais-violentos-do-brasil-veja-a-posicao-de-sc"],
  ["Bahia é o estado mais violento do Brasil (Correio)", "https://www.correio24horas.com.br/minha-bahia/bahia-e-o-estado-mais-violento-do-brasil-entenda-o-que-esta-por-tras-dos-homicidios-no-estado-0526"],
  ["Ministério da Saúde: informes de arboviroses", "https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/arboviroses/informe-semanal/2025/informe-semanal-no-15"],
  ["Conass: apresentação sobre arboviroses (nov/2025)", "https://www.conass.org.br/wp-content/uploads/2025/11/2.2-Apresentacao-CGARB-CIT-Novembro_25.pdf"],
  ["Aos Fatos: gastos com cartão corporativo", "https://www.aosfatos.org/noticias/posts-enganam-ao-comparar-gastos-de-cartao-corporativo-de-lula-e-bolsonaro/"],
  ["TCU: R$ 55 mi em cartões da Presidência e sigilo", "https://portaldeprefeitura.com.br/bastidores-da-politica/governo-federal/tcu-governo-lula-r-55-milhoes-cartoes-corporativos-veja/599193/"],
  ["Lula gastou R$ 65,9 mi em 62 dias de viagens em 2023 (Poder360)", "https://poder360.com.br/governo/lula-gastou-r-659-mi-em-62-dias-de-viagens-ao-exterior-em-2023"],
  ["Hospedagens de Lula e equipe em 2023 custaram R$ 27,8 mi (Poder360)", "https://www.poder360.com.br/governo/hospedagens-de-lula-e-equipe-em-2023-custaram-r-278-mi/"],
  ["Viagens internacionais de Lula custaram R$ 44 mi em 2025 (Poder360)", "https://www.poder360.com.br/poder-governo/viagens-internacionais-de-lula-custaram-44-mi-em-2025/"],
  ["Lula soma 155 dias fora do Brasil no 3º mandato (Revista Oeste)", "https://revistaoeste.com/politica/lula-soma-155-dias-fora-do-brasil-desde-o-inicio-do-3o-mandato/"],
  ["CPMI do INSS: fraudes de até R$ 6,3 bi (FPA)", "https://fpabramo.org.br/cpmi-do-inss-o-que-ainda-vem-pela-frente/"],
  ["Datafolha/FBSP: 28,5 mi vivem em áreas com facções (Diário de Pernambuco)", "https://www.diariodepernambuco.com.br/brasil/2025/10/11698304-faccoes-e-milicias-atuam-em-bairros-de-285-milhoes-de-brasileiros-diz-datafolha.html"],
  ["Votos em seções de presídios em 2026 (Gazeta SP)", "https://www.gazetasp.com.br/gazeta-mais/curiosidades/presos-podem-votar-no-brasil-entenda-o-que-diz-a-lei-apos-fala-de-flavio-bolsonaro-na-band/"],
  ["Lula cumpre 26 das 36 promessas de 2022 (levantamento g1, via Boca)", "https://www.boca.com.br/politica/lula-cumpre-26-das-36-promessas-feitas-em-2022"],
  ["Genial/Quaest: 70% dizem que Lula não cumpre promessas (Diário de Pernambuco)", "https://www.diariodepernambuco.com.br/politica/2025/06/3894834-genial-quaest-70-dos-brasileiros-dizem-que-lula-nao-cumpre-promessas-de-campanha.html"],
  ["Portal da Transparência (cartões, viagens e diárias)", "https://portaldatransparencia.gov.br/"],
  ["TSE: resultados e boletins de urna", "https://resultados.tse.jus.br/"],
];

const STATUS_LABEL = { nao: "Não cumprida", parcial: "Parcial", cumprida: "Cumprida" };

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function renderPromessas(filter) {
  const box = document.getElementById("promises");
  box.innerHTML = "";
  PROMESSAS.filter(p => filter === "todas" || p.s === filter).forEach(p => {
    const c = el("article", "promise " + p.s);
    c.innerHTML = `<span class="badge ${p.s}">${STATUS_LABEL[p.s]}</span>
      <h3>${p.t}</h3><p>${p.d}</p><p class="cost">Custo: <b>${p.custo}</b></p>`;
    box.appendChild(c);
  });
}

function renderScoreboard() {
  const count = s => PROMESSAS.filter(p => p.s === s).length;
  document.getElementById("scoreboard").innerHTML = `
    <div class="score nao"><b>${count("nao")}</b><span>não cumpridas</span></div>
    <div class="score parcial"><b>${count("parcial")}</b><span>parciais</span></div>
    <div class="score cumprida"><b>${count("cumprida")}</b><span>cumpridas (com asterisco)</span></div>
    <div class="score quaest"><b>70%</b><span>acham que ele não cumpre</span></div>`;
}

function renderPeople() {
  const box = document.getElementById("people");
  for (let i = 0; i < 100; i++) box.appendChild(el("span", i < 23 ? "p on" : "p"));
}

function renderTables() {
  document.getElementById("criouBody").innerHTML = CRIOU.map(([p, o, v]) =>
    `<tr><td><b>${p}</b></td><td>${o}</td><td><span class="verdict">${v}</span></td></tr>`).join("");
  document.getElementById("pandemiaBody").innerHTML = PANDEMIA.map(([i, a, b, v]) =>
    `<tr><td>${i}</td><td>${a}</td><td><b>${b}</b></td><td><span class="trend ${v === "melhor" ? "up" : "down"}">${v}</span></td></tr>`).join("");
  document.getElementById("cortesCards").innerHTML = CORTES.map(([t, d]) =>
    `<article class="card"><div class="scissors" aria-hidden="true">✂</div><h3>${t}</h3><p>${d}</p></article>`).join("");
  document.getElementById("sourcesList").innerHTML = SOURCES.map(([t, u]) =>
    `<li><a href="${u}" target="_blank" rel="noopener">${t}</a></li>`).join("");
}

function startCounter() {
  const perSecond = 1.182e12 / 365 / 86400;
  const out = document.getElementById("jurosCounter");
  const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const t0 = performance.now();
  (function tick() {
    out.textContent = fmt.format(((performance.now() - t0) / 1000) * perSecond);
    requestAnimationFrame(tick);
  })();
}

function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function renderCharts() {
  if (!window.Chart) return;
  const ink = css("--ink-soft"), grid = css("--grid"), red = css("--red"), mute = css("--mute");
  Chart.defaults.color = ink;
  Chart.defaults.font.family = "Inter, system-ui, sans-serif";
  Chart.defaults.borderColor = grid;
  const noLegend = { plugins: { legend: { display: false } }, maintainAspectRatio: false };
  // Destaca em vermelho os anos do governo atual (a partir de 2023).
  const lulaColors = (labels) => labels.map(l => (parseInt(l, 10) >= 2023 ? red : mute));

  const anosDiv = ["2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026*"];
  new Chart(document.getElementById("chartDivida"), {
    type: "bar",
    data: { labels: anosDiv, datasets: [{ data: [75.3, 74.4, 86.9, 78.3, 71.7, 74.4, 76.5, 78.7, 82.9],
      backgroundColor: lulaColors(anosDiv), borderRadius: 4 }] },
    options: { ...noLegend, scales: { y: { min: 60, ticks: { callback: v => v + "%" } } },
      plugins: { legend: { display: false }, title: { display: true, text: "Dívida bruta do governo geral (% do PIB) · *ago/2026 · vermelho = governo Lula 3" } } },
  });

  const anosDen = ["2019", "2020", "2021", "2022", "2023", "2024", "2025"];
  new Chart(document.getElementById("chartDengue"), {
    type: "bar",
    data: { labels: anosDen, datasets: [{ data: [1.54, 0.98, 0.54, 1.45, 1.66, 6.59, 1.64],
      backgroundColor: lulaColors(anosDen), borderRadius: 4 }] },
    options: { ...noLegend, scales: { y: { ticks: { callback: v => v + " mi" } } },
      plugins: { legend: { display: false }, title: { display: true, text: "Casos prováveis de dengue (milhões) · vermelho = governo Lula 3" } } },
  });

  const hbar = (id, labels, data, highlight, suffix) => new Chart(document.getElementById(id), {
    type: "bar",
    data: { labels, datasets: [{ data, backgroundColor: labels.map((_, i) => highlight.includes(i) ? red : mute), borderRadius: 4 }] },
    options: { ...noLegend, indexAxis: "y", scales: { x: { ticks: { callback: v => v + suffix } } } },
  });
  hbar("chartAnalf", ["Nordeste", "Norte", "Brasil", "Centro-Oeste", "Sudeste", "Sul"], [14.2, 8.2, 7.0, 5.1, 3.9, 3.4], [0], "%");
  hbar("chartDesemp", ["Pernambuco", "Bahia", "Brasil", "Mato Grosso", "Santa Catarina"], [10.4, 9.1, 5.8, 2.8, 2.2], [0, 1], "%");
  hbar("chartHomic", ["Amapá", "Bahia", "Santa Catarina", "São Paulo"], [45.7, 40.9, 8.8, 6.6], [1], "");

  new Chart(document.getElementById("chartCartao"), {
    type: "bar",
    data: { labels: ["2023", "2024", "2025"], datasets: [{ data: [430, 584, 423], backgroundColor: red, borderRadius: 4 }] },
    options: { ...noLegend, scales: { y: { ticks: { callback: v => "R$ " + v + " mi" } } },
      plugins: { legend: { display: false }, title: { display: true, text: "Cartões corporativos, governo federal (R$ milhões)" } } },
  });

  new Chart(document.getElementById("chartFaccoes"), {
    type: "bar",
    data: { labels: ["2024", "2025"], datasets: [{ data: [14, 19], backgroundColor: [mute, red], borderRadius: 4 }] },
    options: { ...noLegend, indexAxis: "y", scales: { x: { min: 0, max: 25, ticks: { callback: v => v + "%" } } },
      plugins: { legend: { display: false }, title: { display: true, text: "Brasileiros que vivem em bairros com facções ou milícias (%)" } } },
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderScoreboard();
  renderPromessas("todas");
  renderPeople();
  renderTables();
  startCounter();
  renderCharts();
  document.getElementById("filters").addEventListener("click", e => {
    const b = e.target.closest(".chip");
    if (!b) return;
    document.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c === b));
    renderPromessas(b.dataset.f);
  });
});
