# Consórcio PDF → Excel

## Visão Geral

Sistema web desenvolvido para automatizar a conversão de extratos de consórcio da HS Administradora (em PDF) para planilhas Excel consolidadas. O sistema permite que o usuário faça upload de múltiplos PDFs de uma vez e receba um único arquivo Excel no formato "listão" — uma linha por cota, com fórmulas e colunas filtráveis, pronto para análise.

---

## Problema que resolve

A consultora recebia dezenas (até centenas) de PDFs de extratos de consórcio e precisava consolidar manualmente as informações financeiras de cada cota em uma planilha. O processo era:

- Repetitivo e demorado (5 grupos × 150 cotas)
- Propenso a erros de digitação
- Inviável de escalar

Com o sistema, o processo se resume a: **arrastar os PDFs → clicar em exportar → pronto.**

---

## Stack Tecnológica

### Backend (API)

| Tecnologia | Função |
|---|---|
| **Python** | Linguagem principal do backend |
| **FastAPI** | Framework para criação da API REST |
| **pdfplumber** | Extração de texto dos PDFs |
| **openpyxl** | Geração de planilhas Excel (.xlsx) com fórmulas e estilos |
| **uvicorn** | Servidor ASGI para rodar a API |

### Frontend (Web)

| Tecnologia | Função |
|---|---|
| **Next.js (App Router)** | Framework React para o frontend |
| **React 19** | Biblioteca de UI |
| **TypeScript** | Tipagem estática no frontend |
| **Tailwind CSS v4** | Estilização (design responsivo e moderno) |
| **react-dropzone** | Componente de drag & drop para upload de arquivos |
| **lucide-react** | Biblioteca de ícones |
| **Clerk** | Autenticação (login, controle de acesso, convites por e-mail) |

### Infraestrutura

| Serviço | Função |
|---|---|
| **Vercel** | Hospedagem do frontend (Next.js) |
| **Render** | Hospedagem da API (Python/FastAPI) |
| **Clerk** | Gerenciamento de usuários e autenticação |

---

## Funcionalidades Atuais

### Upload e processamento

- Upload de múltiplos PDFs via drag & drop ou seleção de arquivos
- Validação automática: somente PDFs no formato da HS Administradora são aceitos
- PDFs fora do padrão são rejeitados com mensagem de erro clara
- Processamento em lote: todos os PDFs são consolidados em um único resultado

### Extração de dados (Parser)

O sistema extrai automaticamente do PDF:

| Dado | Descrição |
|---|---|
| **Data de Emissão** | Data em que o extrato foi gerado |
| **Grupo** | Número do grupo do consórcio |
| **Cota** | Identificador da cota |
| **Nome** | Nome do consorciado |
| **Contrato** | Número do contrato |
| **Valor Crédito** | Valor do crédito contratado |
| **Lance Embutido** | Valor do lance embutido (líquido, com estornos já cancelados) |
| **Quota Consórcio (Fundo Comum)** | Parcela que alimenta o fundo do grupo |
| **Fundo de Reserva** | Reserva para inadimplência |
| **Taxa de Administração** | Remuneração da administradora |
| **Parcelas pagas** | Detalhamento de cada parcela (data, valor devido, valor pago, % pago) |
| **Prazo do grupo** | Duração total do consórcio em meses |

### Pré-visualização na web

Duas visualizações disponíveis:

- **Por Cota** — cards expansíveis com detalhamento de cada parcela paga, incluindo Quota Consórcio, Fundo Reserva e Taxa ADM
- **Todas as Parcelas** — tabela consolidada com todas as parcelas de todas as cotas

Barra de estatísticas mostrando: total de cotas, parcelas pagas, total pago e crédito total.

### Exportação Excel (Listão)

Planilha gerada com as colunas:

| Coluna | Conteúdo | Tipo |
|---|---|---|
| Mês | Índice sequencial | valor |
| Grupo | Número do grupo | valor |
| Cota | Identificador da cota | valor |
| Data Emissão | Data de emissão do extrato | valor |
| Cota contemplada | Valor do crédito contratado | valor |
| Quota Consórcio | Fundo Comum pago | valor |
| Fundo Reserva | Fundo de Reserva pago | valor |
| Taxa ADM | Taxa de Administração paga | valor |
| Cont. Lanc. Emb | Lance Embutido líquido | valor |
| Saldo Contemplação | Crédito - Lance Embutido | **fórmula** |
| Soma | Acumulado de Saldo Contemplação | **fórmula** |
| Pagamentos | Total pago (FC + FR + TxAdm) | valor |
| Saldo Crédito - Parcelas | Saldo Contemplação - Pagamentos acumulados | **fórmula** |

As colunas com fórmulas recalculam automaticamente se o usuário editar valores no Excel. Cabeçalho congelado e linha de totais no final.

### Autenticação e controle de acesso

- Login via e-mail e senha (gerenciado pelo Clerk)
- Allowlist: somente e-mails autorizados podem criar conta
- O administrador convida novos usuários pelo painel do Clerk (sem precisar de dev)
- Tela de login integrada no próprio site (não redireciona pra fora)

---

## Como funciona por baixo

### Fluxo completo

```
Usuário arrasta N PDFs no navegador
        ↓
Frontend envia para /api/extract (ou /api/export)
        ↓
Next.js faz proxy para a API Python (evita CORS)
        ↓
API salva PDFs em diretório temporário
        ↓
pdfplumber extrai texto de cada página
        ↓
Parser valida se é extrato HS válido
        ↓
Regex extrai dados por seção (cabeçalho, conta corrente, valores pagos, lance embutido)
        ↓
Resultado ordenado por (grupo, cota)
        ↓
/extract → retorna JSON para pré-visualização
/export  → gera XLSX com openpyxl e retorna download
```

### Desafios técnicos resolvidos

- **pdfplumber corrompe certas linhas**: linhas de Lance Embutido saem com datas grudadas em letras (ex: `D0/I0L3/2026`) e números negativos sem espaço. Solução: ancoragem por última data limpa + tokenização de números.
- **Estornos de lance**: o parser soma RECBTO + EST.RECBTO para que estornos se cancelem automaticamente (resultado = 0).
- **CORS entre frontend e API**: resolvido com rewrites do Next.js (proxy no mesmo domínio).
- **Tema escuro indesejado**: `color-scheme: light` forçado no CSS para evitar que o browser aplique dark mode.

---

## Endpoints da API

| Método | Rota | Descrição | Retorno |
|---|---|---|---|
| GET | `/health` | Health check | `{ok: true}` |
| POST | `/extract` | Processar PDFs e retornar JSON | `{count, extracts: [...]}` |
| POST | `/export` | Processar PDFs e retornar XLSX | arquivo .xlsx (download) |

---

## Estrutura do Projeto

```
consorcio-system/
├── api/
│   ├── main.py              → API (endpoints FastAPI)
│   ├── parser.py            → Extração de dados dos PDFs (regex + dataclasses)
│   ├── xlsx_writer.py       → Geração do XLSX no formato listão
│   ├── requirements.txt     → Dependências Python
│   └── run.sh               → Script para iniciar em dev
│
├── web/
│   ├── next.config.ts       → Proxy /api/* para a API Python
│   ├── src/app/
│   │   ├── page.tsx          → Tela principal (upload, preview, exportação)
│   │   ├── layout.tsx        → Layout com ClerkProvider
│   │   └── globals.css       → Estilos globais e animações
│   └── src/components/
│       ├── Dropzone.tsx      → Área de drag & drop
│       ├── FileList.tsx      → Lista de arquivos selecionados
│       ├── PreviewTable.tsx  → Tabela "Todas as Parcelas"
│       ├── CotaCards.tsx     → Cards expansíveis "Por Cota"
│       ├── StatsBar.tsx      → Barra de estatísticas
│       ├── ViewTabs.tsx      → Tabs de visualização
│       ├── Header.tsx        → Cabeçalho com logo e avatar
│       └── Toast.tsx         → Notificações de sucesso/erro
│
└── README.md                → Documentação técnica
```

---

## Sugestões de Evolução

### Alto impacto

| Feature | Descrição |
|---|---|
| **Histórico de uploads** | Salvar extratos processados em banco de dados para consulta futura sem re-upload. Comparar evolução mês a mês de cada cota. |
| **Dashboard com gráficos** | Visualizações como evolução de pagamentos por grupo, distribuição de cotas por status, composição da parcela (pizza/barra). |
| **Detecção de inadimplência** | Comparar vencimento vs pagamento e alertar cotas com atraso ou com multa/juros > 0. |
| **Filtros e busca** | Filtrar por grupo, cota, faixa de valor, data de emissão. Essencial para operar com 150+ cotas. |
| **Comparativo entre períodos** | Upload de dois extratos da mesma cota → diff visual mostrando o que mudou. |

### Melhorias de UX

| Feature | Descrição |
|---|---|
| **Exportação customizada** | Usuário escolhe quais colunas incluir no XLSX antes de exportar. |
| **Preview do listão** | Mostrar na web exatamente como vai sair a planilha, no formato listão. |
| **Upload de pastas** | Arrastar uma pasta inteira com todos os PDFs. |
| **Barra de progresso** | "Processando 47/150..." em vez de spinner genérico. |

### Infraestrutura

| Feature | Descrição |
|---|---|
| **Container Docker** | Dockerfile para a API, facilita deploy e evita instância dormindo. |
| **Testes automatizados** | Suite de testes com PDFs de exemplo para validar o parser. |
| **Rate limiting** | Proteção contra abuso (muitos uploads simultâneos). |

---

## Limitações Conhecidas

- O parser é específico para o layout da **HS Administradora**. Outras administradoras exigiriam novos padrões de regex.
- O pdfplumber corrompe algumas linhas do PDF. A solução atual funciona para os casos observados, mas layouts muito diferentes podem precisar de ajustes.
- O campo "Rendimento" é variável (depende da amortização) e ainda não é extraído.
- No plano Free do Render, a API "dorme" após 15 min sem uso. A primeira requisição depois pode levar ~30 segundos.
