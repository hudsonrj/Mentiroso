# O Mentiroso

Site estático de crítica política ao governo Lula: promessas de campanha, custos, dívida, programas sociais, educação, saúde, gastos com cartão corporativo e viagens, segurança pública e eleição.

No ar em https://o-mentiroso.netlify.app

## Estrutura

- `public/`: o site (é a pasta publicada)
  - `index.html`: estrutura e textos de cada seção
  - `app.js`: renderização e gráficos (HTML/SVG próprios, sem bibliotecas externas)
  - `styles.css`: visual
  - `data/dados.js`: dados editados à mão (promessas, tabelas, gráficos de imprensa, fontes)
  - `data/auto.js`: **gerado automaticamente**, não edite
- `scripts/atualizar-dados.mjs`: busca os dados oficiais e grava `public/data/auto.js`
- `.github/workflows/atualizar-dados.yml`: roda o script todo dia e publica o site
- `netlify.toml`: diz à Netlify para publicar a pasta `public/`

Para ver o site localmente, abra `public/index.html` no navegador.

## Atualização automática

Três camadas, da mais lenta para a mais rápida:

1. **Todo dia às 07:17 (Brasília)** o GitHub Actions roda `scripts/atualizar-dados.mjs`, que busca:
   - Banco Central (SGS): Selic (432), dívida bruta em % do PIB (13762) e em R$ (13761), juros em 12 meses em % do PIB (5760) e mensais em R$ (4616), resultado primário (5793), desemprego (24369) e IPCA em 12 meses (13522);
   - IBGE SIDRA: desemprego nos 27 estados (tabela 4099).

   Se algo mudou, grava `public/data/auto.js`, faz o commit e publica na Netlify.
2. **Ao abrir a página**, o navegador consulta direto a API do Banco Central e, se houver um dado mais novo, atualiza os números e gráficos na hora.
3. Se uma fonte estiver fora do ar, o valor anterior é mantido; o site nunca fica sem dados.

Para rodar a atualização manualmente: `node scripts/atualizar-dados.mjs` (Node 18 ou mais novo).

### Configurar a publicação automática (uma vez)

No GitHub, em *Settings → Secrets and variables → Actions*, crie:

- `NETLIFY_AUTH_TOKEN`: token pessoal criado em https://app.netlify.com/user/applications#personal-access-tokens
- `NETLIFY_SITE_ID`: `5cebd22b-0535-48f8-9f27-2a0e6984fc33`

Sem esses segredos, o workflow continua atualizando os dados no repositório, mas não publica.

## Dados manuais

Bolsa Família, dengue, cartão corporativo, viagens, facções, educação e votos em presídios não têm API aberta confiável. Para atualizar, edite `public/data/dados.js`; a publicação acontece no próximo push.
