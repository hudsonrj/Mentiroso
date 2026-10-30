// Busca os indicadores oficiais (Banco Central e IBGE) e grava public/data/auto.js.
// Uso: node scripts/atualizar-dados.mjs
// Roda todo dia pelo GitHub Actions (.github/workflows/atualizar-dados.yml).
// Se uma fonte falhar, mantém o valor anterior daquela fonte em vez de quebrar o site.

import { readFile, writeFile } from "node:fs/promises";

const OUT = new URL("../public/data/auto.js", import.meta.url);
const DESDE = "01/01/2018";

// Séries do SGS (Banco Central). Códigos conferidos no catálogo dadosabertos.bcb.gov.br.
const SGS = {
  selic: 432,          // Meta Selic definida pelo Copom (% a.a.), diária
  divida: 13762,       // Dívida bruta do governo geral (% do PIB), mensal
  dividaReais: 13761,  // Dívida bruta do governo geral (R$ milhões), mensal
  juros12mPib: 5760,   // Juros nominais do setor público consolidado, acumulado em 12 meses (% do PIB)
  jurosMes: 4616,      // Juros nominais do setor público consolidado, fluxo mensal (R$ milhões)
  primario12mPib: 5793, // Resultado primário do setor público, acumulado em 12 meses (% do PIB; positivo = déficit)
  desemprego: 24369,   // Taxa de desocupação, PNAD Contínua (%), trimestre móvel
  ipca12m: 13522,      // IPCA acumulado em 12 meses (%)
};

const UF_REGIAO = { 1: "Norte", 2: "Nordeste", 3: "Sudeste", 4: "Sul", 5: "Centro-Oeste" };

async function getJSON(url, tentativas = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (i >= tentativas) throw new Error(`${url}: ${e.message}`);
      await new Promise(res => setTimeout(res, 2000 * i));
    }
  }
}

// Converte "dd/mm/aaaa" em "aaaa-mm" e agrupa por mês, ficando com o último valor do mês.
function mensal(rows) {
  const porMes = new Map();
  for (const { data, valor } of rows) {
    const [, m, a] = data.split("/");
    const v = parseFloat(valor);
    if (!Number.isNaN(v)) porMes.set(`${a}-${m}`, v);
  }
  return [...porMes.entries()].sort(([a], [b]) => a.localeCompare(b));
}

async function sgs(codigo) {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados?formato=json&dataInicial=${DESDE}`;
  return mensal(await getJSON(url));
}

async function desempregoPorUF() {
  const rows = await getJSON("https://apisidra.ibge.gov.br/values/t/4099/n3/all/v/4099/p/last%201?formato=json");
  return rows.slice(1).map(r => ({
    uf: r.D1N,
    regiao: UF_REGIAO[r.D1C[0]],
    valor: parseFloat(r.V),
    periodo: r.D3N,
  })).filter(r => !Number.isNaN(r.valor)).sort((a, b) => b.valor - a.valor);
}

async function anterior() {
  try {
    const txt = await readFile(OUT, "utf8");
    return JSON.parse(txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1));
  } catch {
    return { series: {} };
  }
}

const dados = await anterior();
dados.series ??= {};
const falhas = [];

for (const [nome, codigo] of Object.entries(SGS)) {
  try {
    const serie = await sgs(codigo);
    if (serie.length) dados.series[nome] = serie;
  } catch (e) {
    falhas.push(`${nome}: ${e.message}`);
  }
}

try {
  dados.desempregoUF = await desempregoPorUF();
} catch (e) {
  falhas.push(`desempregoUF: ${e.message}`);
}

// Juros pagos nos últimos 12 meses, em R$ (soma dos fluxos mensais).
const jm = dados.series.jurosMes || [];
if (jm.length >= 12) {
  const ult = jm.slice(-12);
  dados.juros12mReais = { valor: ult.reduce((s, [, v]) => s + v, 0) * 1e6, ref: ult.at(-1)[0] };
}
// Juros pagos em 2020, o ano da pandemia, para comparação.
const j2020 = jm.filter(([m]) => m.startsWith("2020-"));
if (j2020.length === 12) dados.juros2020Reais = j2020.reduce((s, [, v]) => s + v, 0) * 1e6;

dados.atualizadoEm = new Date().toISOString();
dados.falhas = falhas;

const js = `// Gerado automaticamente por scripts/atualizar-dados.mjs. Não edite à mão.\nwindow.AUTO = ${JSON.stringify(dados)};\n`;
await writeFile(OUT, js);

console.log(`Gravado ${OUT.pathname}`);
for (const [k, s] of Object.entries(dados.series)) console.log(`  ${k}: ${s.length} meses, último ${s.at(-1)?.join(" = ")}`);
console.log(`  desempregoUF: ${dados.desempregoUF?.length ?? 0} UFs (${dados.desempregoUF?.[0]?.periodo ?? "—"})`);
if (falhas.length) {
  console.warn("Falhas (valores anteriores mantidos):\n  " + falhas.join("\n  "));
  // Só falha o job se nada foi obtido, para não publicar um site sem dados.
  if (!Object.keys(dados.series).length) process.exit(1);
}
