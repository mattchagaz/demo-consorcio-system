# Consórcio PDF → Excel

Sistema web para converter extratos de consórcio em PDF (HS Administradora) em uma planilha Excel consolidada no formato "listão" — uma linha por cota, com fórmulas de acumulado para análise/filtro.

## Stack

```
api/   FastAPI + pdfplumber + openpyxl         → porta 8000
web/   Next.js + React + Tailwind v4 + dropzone → porta 3000
```

O frontend não fala direto com a API — usa `next.config.ts` com rewrites de `/api/*` → `http://localhost:8000/*`, evitando CORS.

## Rodando em dev

```bash
# terminal 1 — API
cd api
./run.sh                  # uvicorn com --reload na 8000

# terminal 2 — web
cd web
npm run dev               # Next em localhost:3000
```

Abra http://localhost:3000, arraste os PDFs, pré-visualize ou baixe o XLSX.

## Endpoints da API

| Método | Rota       | Retorno                                              |
|--------|------------|------------------------------------------------------|
| GET    | `/health`  | `{ok: true}`                                         |
| POST   | `/extract` | JSON: `{count, extracts:[ExtractResult]}`            |
| POST   | `/export`  | `application/vnd...spreadsheetml.sheet` (download)   |

Ambos `POST` aceitam `multipart/form-data` com campo `files` repetido (múltiplos PDFs numa requisição).

## Formato do XLSX ("listão")

Uma linha por cota. Colunas:

| Col | Campo                     | Origem                                                 |
|-----|---------------------------|--------------------------------------------------------|
| A   | Mês                       | índice sequencial                                      |
| B   | Grupo                     | parser (`HEADER_RE`)                                   |
| C   | Cota                      | parser (`HEADER_RE`)                                   |
| D   | Cota contemplada          | `Valor Crédito:` do contrato                           |
| E   | Cont. Lanc. Emb           | Lance Embutido líquido (RECBTO − EST.RECBTO)           |
| F   | Saldo Contemplação        | fórmula `=D-E`                                         |
| G   | Soma                      | fórmula `=SUM($F$4:F<n>)` (acumulado de F)             |
| H   | Pagamentos                | FC + FR + Taxa Adm pagos                               |
| I   | Saldo Crédito − Parcelas  | fórmula `=F<n>-SUM($H$4:H<n>)`                         |

Linha 1 traz totais de crédito contratado (D) e pagamentos (I). Linha final traz TOTAL com `=SUM()` por coluna. `freeze_panes = A4`.

## Como a extração funciona (`api/parser.py`)

`pdfplumber.extract_text()` em todas as páginas → string única → regex por seção.

1. **Cabeçalho** — `HEADER_RE` casa `Grupo: X  Cota: Y  NOME  Contrato: Z`.
2. **Valor Crédito** — `VALOR_CREDITO_RE` pega o número após `Valor Crédito:`.
3. **Conta Corrente** — localiza o bloco entre `"Conta Corrente"` e `"Pend"`, aplica `CC_ROW_RE` linha a linha. Cada match vira `ContaCorrenteRow` (15 campos).
4. **Valores / Percentuais Pagos** — dentro do bloco homônimo, `VALOR_PAGO_LINE_RE(label)` pega o primeiro número após `Fundo Comum:`, `Fundo de Reserva:`, `Taxa de Administração:`.
5. **Qtde parcelas pagas** — `"Resumo Parcelas Pagas"` + `QTDE_TOTAL_RE` (`Qtde Total: N`); fallback = `len(conta_corrente)`.
6. **Lance Embutido** (caso especial) — o pdfplumber **corrompe** essas linhas (gruda datas com letras, ex. `D0/I0L3/2026`, e números negativos sem espaço). A regex estrutural falha, então a estratégia é:
   - filtrar linhas com `LANCE EMBUT` e sem `PAGTO`;
   - ancorar na **última data limpa** (`DATE_RE`);
   - tokenizar o resto com `NUM_RE` e pegar o 4º número (`vl_pago`);
   - somar RECBTO + EST.RECBTO — assim estornos zeram naturalmente.

Números brasileiros (`1.446,76`) passam por `_to_float()` (remove `.`, troca `,` por `.`).

Saída: dataclass `ExtractResult` com `grupo`, `cota`, `nome`, `contrato`, `contrato_valor_credito`, `lance_embutido`, `qtde_parcelas_pagas`, `conta_corrente: list[ContaCorrenteRow]`, `valores_pagos: ValoresPagos`.

## Geração do XLSX (`api/xlsx_writer.py`)

`build_xlsx(results)` recebe a lista de `ExtractResult`, abre um `Workbook` do openpyxl e:

- escreve linha 1 com totais (fórmulas `SUM` cobrindo toda a área de dados);
- escreve linha 3 com cabeçalhos estilizados;
- uma linha por cota com valores literais nas colunas de origem e **fórmulas** nas colunas derivadas (D/E → F, F → G, F/H → I) — assim o usuário pode editar D/E/H no Excel e os acumulados recalculam;
- escreve linha de TOTAL com `SUM` por coluna;
- congela em A4.

Retorna `bytes` (via `BytesIO`).

## Frontend (`web/`)

- `src/app/page.tsx` — tela única: dropzone, lista de arquivos, tabs de visualização, botão de exportar.
- `src/components/` — `Dropzone`, `FileList`, `PreviewTable`, `CotaCards`, `StatsBar`, `ViewTabs`, `Header`, `Toast`.
- `src/app/globals.css` — força `color-scheme: light` (evita tema escuro automático do browser), define gradientes de fundo e animações `fade-in-up` / `float-slow`.
- `next.config.ts` — rewrite `/api/:path* → http://localhost:8000/:path*`.

> `web/AGENTS.md` avisa: essa versão do Next tem breaking changes — consultar `node_modules/next/dist/docs/` antes de escrever código novo do Next.

## Estrutura de arquivos

```
consorcio-system/
├── README.md                    ← este arquivo
├── api/
│   ├── main.py                  FastAPI (endpoints /health, /extract, /export)
│   ├── parser.py                regex + dataclasses (ExtractResult)
│   ├── xlsx_writer.py           listão com fórmulas (openpyxl)
│   ├── requirements.txt
│   └── run.sh                   uvicorn --reload
└── web/
    ├── next.config.ts           rewrites /api/* → :8000/*
    ├── src/app/{page,layout,globals}
    └── src/components/*.tsx
```

## Fluxo end-to-end

```
[usuário arrasta N PDFs no browser]
         │
         ▼
POST /api/extract (ou /api/export) — multipart com N files
         │
         ▼ (rewrite do Next)
FastAPI :8000
         │
         ▼
_parse_uploads → salva em tempdir → parse_pdf(path) por arquivo
         │                          (pdfplumber + regex)
         ▼
sort by (grupo, cota) → list[ExtractResult]
         │
         ├── /extract: dataclass → asdict → JSON
         └── /export : build_xlsx → bytes → Response com Content-Disposition
```

## Limitações conhecidas

- Parser é específico pro layout da HS Administradora — outras administradoras precisariam de novos padrões (`HEADER_RE`, `CC_ROW_RE` etc.).
- pdfplumber corrompe linhas de Lance Embutido; a heurística por data-âncora resolve os casos vistos, mas layouts muito diferentes podem quebrar.
- Rendimento é variável (depende da amortização) — o listão atual não tem coluna dedicada. Se precisar, o dado viria da tabela de movimentação financeira por parcela.
