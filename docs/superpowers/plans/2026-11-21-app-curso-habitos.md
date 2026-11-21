# App do curso "Códigos do Emagrecimento e Saúde" — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o app instalável (PWA) dos alunos do curso: 12 cardápios, lista de compras, versículo/oração antes das refeições, check-in diário com palavra de força, com acesso liberado pela Eduzz.

**Architecture:** Página estática (Vite + TypeScript, sem framework) instalável como PWA, hospedada no GitHub Pages. Supabase fornece login por código de e-mail, banco Postgres com regras por aluno (RLS) e uma Edge Function que recebe o webhook da Eduzz. Toda a lógica de negócio (lista de compras, sequência, mensagens, mapeamento de eventos da Eduzz) fica em funções puras testadas.

**Tech Stack:** Vite, TypeScript, Vitest, vite-plugin-pwa, @supabase/supabase-js, Supabase (Auth, Postgres, Edge Functions em Deno), Python 3 + pdftotext para extrair os PDFs.

**Spec:** `docs/superpowers/specs/2026-11-21-app-curso-habitos-design.md`

## Global Constraints

- Idioma de toda a interface e dos textos: português do Brasil.
- Acesso só com o e-mail da compra, validado pela Eduzz (pago → ativo; reembolsado, cancelado ou contestado → bloqueado).
- Cardápios: 12 faixas, 1.100 a 2.200 kcal (de 100 em 100); 4 refeições até 1.300 kcal, 5 refeições de 1.400 a 2.200 kcal.
- Lista de compras: só os nomes dos alimentos, sem gramas.
- Check-in diário com exatamente 5 itens: alimentação, água, movimento, sono, momento com Deus.
- Versículos na versão NAA, curtos, com referência e crédito da versão no app.
- Visual: tons de verde claro e verde escuro, texto preto, negrito para ênfase; todas as cores como variáveis CSS em um único arquivo de tema.
- Tom das mensagens: acolhedor, sem culpa, sem clichês motivacionais, sem promessa de resultado.
- Fora da v1: aulas hospedadas no app, cálculo de calorias, manual de organização, push, comunidade. O e-book de receitas entra na Task 11, depois do núcleo.
- Fuso dos dias de check-in: `America/Sao_Paulo`.
- Dados pessoais mínimos (e-mail, cardápio escolhido, trocas, check-ins); política de privacidade e termos acessíveis no app.

## Review Focus

1. E-mail com maiúsculas, espaços ou digitado diferente da compra (`Maria@Gmail.com ` vs `maria@gmail.com`): deve entrar normalmente.
2. Webhook da Eduzz duplicado ou fora de ordem (reembolso chegando antes do "pago" antigo): o status final deve refletir o evento mais recente.
3. Check-in perto da meia-noite ou em outro fuso do aparelho: o dia conta no fuso de São Paulo.
4. Aluno sem internet ao salvar o check-in: não pode perder a marcação nem travar a tela.
5. Aluno reembolsado com o app já aberto: perde o acesso aos dados na próxima chamada, sem precisar sair.

---

## File Structure

```
app-curso/
  package.json, vite.config.ts, tsconfig.json, index.html
  src/theme.css                      # variáveis de cor e tipografia
  src/domain/types.ts                # Cardapio, Refeicao, Item, CheckIn, Mensagem
  src/domain/shopping.ts             # buildShoppingList
  src/domain/streak.ts               # diaLocal, computeStreak, resultadoDoDia
  src/domain/messages.ts             # pickMessage
  src/data/cardapios/{1100..2200}.json
  src/data/versiculos.json, src/data/incentivos.json
  src/lib/supabase.ts, src/lib/auth.ts, src/lib/checkins.ts
  src/views/{login,hoje,cardapio,compras,checkin,aulas,privacidade}.ts
  src/main.ts                        # roteador simples e inicialização
  tools/extract_cardapios.py         # PDFs → JSON
  supabase/migrations/001_init.sql
  supabase/functions/eduzz-webhook/{handler.ts,index.ts,handler.test.ts,fixtures/}
  tests/                             # testes do domínio e dos dados
```

---

### Task 1: Esqueleto do projeto, tema e casca do PWA

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/theme.css`, `src/main.ts`, `tests/theme.test.ts`

**Interfaces:**
- Produces: variáveis CSS `--verde-claro`, `--verde-escuro`, `--texto`, `--fundo`, `--destaque` em `src/theme.css`; comando `npm test` (Vitest) e `npm run build`.

- [ ] **Step 1:** `git init` em `app-curso/` e criar o projeto Vite + TypeScript com Vitest e vite-plugin-pwa (manifest: nome provisório "Mesa com Propósito", `lang: pt-BR`, ícones provisórios).
- [ ] **Step 2: Write the failing test** `tests/theme.test.ts`: lê `src/theme.css` e afirma que define as cinco variáveis acima e que nenhum outro arquivo em `src/` contém cor hexadecimal literal (`/#[0-9a-fA-F]{3,6}/`).
- [ ] **Step 3: Run** `npx vitest run tests/theme.test.ts` — Expected: FAIL (variáveis ausentes).
- [ ] **Step 4:** Criar `src/theme.css` com a paleta (verde claro de fundo/cartões, verde escuro nos títulos e botões, texto preto, negrito para ênfase) e `index.html` + `src/main.ts` mostrando uma tela vazia estilizada.
- [ ] **Step 5: Run** `npx vitest run` e `npm run build` — Expected: PASS e build sem erro.
- [ ] **Step 6: Commit** `feat: esqueleto do app e tema verde`

### Task 2: Dados dos 12 cardápios (extração dos PDFs)

**Files:**
- Create: `src/domain/types.ts`, `tools/extract_cardapios.py`, `src/data/cardapios/1100.json` … `2200.json`, `tests/cardapios.test.ts`

**Interfaces:**
- Produces (`src/domain/types.ts`):
  - `type Item = { nome: string; porcao: string; grupo: 'carboidrato'|'proteina'|'gordura'|'fruta'|'vegetal'|'outro'; substituicoes: { nome: string; porcao: string }[] }`
  - `type Refeicao = { id: string; nome: string; horario: string; padrao: Item[]; hortalicas?: string[]; sugestoes: string[]; substituta?: { nome: string; itens: Item[]; observacao: string } }`
  - `type Cardapio = { kcal: number; refeicoes: Refeicao[] }`

- [ ] **Step 1: Write the failing test** `tests/cardapios.test.ts`: para `kcal` em 1100..2200 de 100 em 100, o arquivo existe e carrega; `refeicoes.length` é 4 até 1300 e 5 de 1400 em diante; toda refeição tem `horario` no formato `HH:MM` e ao menos 1 item em `padrao`; cada `Item.nome` não vazio; nenhum `nome` repete dentro da mesma refeição; os horários do cardápio 1100 são `07:00, 12:00, 16:00, 20:00`.
- [ ] **Step 2: Run** `npx vitest run tests/cardapios.test.ts` — Expected: FAIL (arquivos ausentes).
- [ ] **Step 3: Implement** `tools/extract_cardapios.py`: usa `pdftotext -layout` em cada PDF e escreve o JSON no formato de `Cardapio`. Os PDFs seguem o mesmo molde (item padrão + coluna "pode substituir por" + sugestões de montagem + hortaliças + refeição substituta); itens extras (whey, psyllium, albumina) aparecem em alguns níveis. Onde a extração por layout for ambígua, gerar o JSON e apontar a linha para conferência manual.
- [ ] **Step 4:** Gerar os 12 JSON e conferir cada um contra o PDF correspondente (refeições, horários, itens padrão, substituições); registrar a conferência em `docs/conferencia-cardapios.md` para Felipe revisar por amostragem.
- [ ] **Step 5: Run** `npx vitest run tests/cardapios.test.ts` — Expected: PASS.
- [ ] **Step 6: Commit** `feat: 12 cardápios em dados`

### Task 3: Lista de compras

**Files:**
- Create: `src/domain/shopping.ts`, `tests/shopping.test.ts`

**Interfaces:**
- Consumes: `Cardapio`, `Item` (Task 2).
- Produces: `buildShoppingList(c: Cardapio, escolhas: { trocas: Record<string, string>; hortalicas: string[] }): { grupo: Item['grupo']; itens: string[] }[]` — `trocas` mapeia nome do item padrão → nome da substituição escolhida.

- [ ] **Step 1: Write the failing tests:** (a) lista do cardápio 1100 contém "Frango", "Arroz" e "Banana" uma única vez cada, mesmo aparecendo em várias refeições; (b) nenhum texto da lista contém dígitos nem "g)" (sem gramas); (c) com `trocas: { Frango: 'Peixe' }`, "Peixe" entra e "Frango" sai; (d) hortaliças marcadas entram no grupo `vegetal`; (e) grupos vêm em ordem fixa: carboidrato, proteína, gordura, fruta, vegetal, outro; (f) nomes iguais com caixa/acentos diferentes ("Ovo"/"ovo") viram um só.
- [ ] **Step 2: Run** `npx vitest run tests/shopping.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `buildShoppingList` (função pura; normaliza para comparar, preserva a grafia original do cardápio na saída).
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: lista de compras a partir do cardápio`

### Task 4: Banco de dados, regras de acesso e liberação manual

**Files:**
- Create: `supabase/migrations/001_init.sql`, `supabase/tests/001_rls.test.sql`

**Interfaces:**
- Produces (tabelas): `alunos(email text primary key, status text check in ('ativo','bloqueado'), eduzz_ultimo_evento_em timestamptz, criado_em timestamptz)`; `eventos_eduzz(event_id text primary key, recebido_em timestamptz, payload jsonb)`; `preferencias(email text primary key, kcal int, trocas jsonb, hortalicas jsonb)`; `checkins(email text, dia date, alimentacao bool, agua bool, movimento bool, sono bool, deus bool, primary key (email, dia))`.
- Produces (função): `liberar_aluno(p_email text) returns void` e `bloquear_aluno(p_email text) returns void`, para uso manual pelo painel do Supabase. E-mails sempre gravados em minúsculas e sem espaços.
- RLS: o aluno só lê e grava as próprias linhas de `preferencias` e `checkins`, e só enquanto `alunos.status = 'ativo'` para o seu e-mail; `alunos` e `eventos_eduzz` só acessíveis pela função de servidor.

- [ ] **Step 1: Write the failing test** `supabase/tests/001_rls.test.sql` (pgTAP, `supabase test db`): aluno A ativo lê/grava o próprio check-in; A não lê o check-in de B; aluno bloqueado não lê nem grava; `liberar_aluno('  Maria@Gmail.com ')` cria `maria@gmail.com` ativo.
- [ ] **Step 2: Run** `supabase test db` — Expected: FAIL.
- [ ] **Step 3: Implement** a migração com tabelas, RLS e funções acima.
- [ ] **Step 4: Run** `supabase test db` — Expected: PASS.
- [ ] **Step 5: Commit** `feat: banco, regras de acesso e liberação manual`

### Task 5: Receptor do webhook da Eduzz

**Files:**
- Create: `supabase/functions/eduzz-webhook/handler.ts`, `supabase/functions/eduzz-webhook/index.ts`, `supabase/functions/eduzz-webhook/handler.test.ts`, `supabase/functions/eduzz-webhook/fixtures/*.json`

**Interfaces:**
- Consumes: tabelas da Task 4.
- Produces: `parseEduzzEvent(body: unknown): { eventId: string; email: string; status: 'ativo' | 'bloqueado'; ocorridoEm: string } | null` (retorna `null` para eventos que não mudam acesso); `applyEvent(db, ev): Promise<'aplicado' | 'duplicado' | 'antigo'>`; `index.ts` expõe o `POST`, rejeita requisições sem a autenticidade válida (401) e responde 200 só depois de gravar.

- [ ] **Step 1 (com Felipe, no navegador do app):** abrir Avançado → Webhooks na Eduzz, anotar nome dos eventos de fatura (paga, reembolsada, cancelada, contestada), campos que trazem o e-mail do comprador, o identificador do evento e a data, e como validar a autenticidade do aviso; salvar um payload real de cada tipo em `fixtures/`. Nada é criado na conta nesta etapa.
- [ ] **Step 2: Write the failing tests** `handler.test.ts` usando as fixtures: pago → `ativo`; reembolso, cancelamento e contestação → `bloqueado`; evento irrelevante → `null`; e-mail `' Maria@Gmail.com'` vira `maria@gmail.com`; o mesmo `eventId` duas vezes → segundo é `duplicado`; reembolso com `ocorridoEm` mais novo seguido de "pago" mais antigo → continua `bloqueado` (`antigo`); requisição sem autenticidade válida → 401 e nada gravado.
- [ ] **Step 3: Run** `deno test supabase/functions/eduzz-webhook` — Expected: FAIL.
- [ ] **Step 4: Implement** `parseEduzzEvent`, `applyEvent` e `index.ts`. Ao ativar um aluno novo, criar o usuário de login pelo Auth Admin com e-mail confirmado (assim só quem comprou consegue pedir código); ao bloquear, marcar `bloqueado` e encerrar as sessões do usuário.
- [ ] **Step 5: Run** `deno test supabase/functions/eduzz-webhook` — Expected: PASS.
- [ ] **Step 6: Commit** `feat: webhook da Eduzz libera e bloqueia acesso`

### Task 6: Login por código e bloqueio na interface

**Files:**
- Create: `src/lib/supabase.ts`, `src/lib/auth.ts`, `src/views/login.ts`, `tests/auth.test.ts`

**Interfaces:**
- Consumes: Auth do Supabase (Task 5 cria os usuários).
- Produces: `normalizarEmail(s: string): string`; `pedirCodigo(email: string): Promise<{ ok: true } | { ok: false; motivo: 'nao-encontrado' | 'erro' }>` (usa `signInWithOtp` com `shouldCreateUser: false`); `confirmarCodigo(email: string, codigo: string): Promise<boolean>`; `sessaoAtiva(): Promise<boolean>`.

- [ ] **Step 1: Write the failing tests** `tests/auth.test.ts`: `normalizarEmail('  Maria@Gmail.com ')` → `'maria@gmail.com'`; `pedirCodigo` com cliente falso que responde "signups not allowed" → `{ ok: false, motivo: 'nao-encontrado' }`; código com espaços ou traço ("123 456") é aceito após limpeza.
- [ ] **Step 2: Run** `npx vitest run tests/auth.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** as funções acima e a tela de login com mensagens em português: e-mail não encontrado orienta a usar o e-mail da compra ou falar com o suporte; erro de rede pede para tentar de novo.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: login por código de e-mail`

### Task 7: Bancos de versículos e de incentivo

**Files:**
- Create: `src/domain/messages.ts`, `src/data/versiculos.json`, `src/data/incentivos.json`, `tests/messages.test.ts`

**Interfaces:**
- Produces: `type Mensagem = { id: string; texto: string; referencia?: string; tipo: 'versiculo' | 'oracao' | 'incentivo' | 'gratidao' }`; `pickMessage(banco: Mensagem[], ultimoId: string | null, rng: () => number): Mensagem` (nunca devolve o `ultimoId` quando o banco tem mais de um item).

- [ ] **Step 1: Write the failing tests:** `pickMessage` nunca repete `ultimoId` em 1.000 sorteios com `rng` aleatório; com banco de 1 item devolve esse item; `versiculos.json` tem ao menos 30 itens, todos com `referencia`; `incentivos.json` tem ao menos 20 itens, nenhum contendo as palavras "fracasso", "culpa", "falhou" (texto de acolhimento).
- [ ] **Step 2: Run** `npx vitest run tests/messages.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `pickMessage` e rascunhar os dois bancos: versículos curtos ligados a alimentação, gratidão, domínio próprio e cuidado do corpo (incluindo 1 Coríntios 10:31 e Romanos 12:1), mais orações curtas de gratidão; incentivos acolhedores. Cada versículo marcado `"verificado": false` até Felipe e a conferência no texto oficial da NAA.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: bancos de versículos e incentivos (rascunho para revisão)`

### Task 8: Check-in, sequência e dia de São Paulo

**Files:**
- Create: `src/domain/streak.ts`, `src/lib/checkins.ts`, `tests/streak.test.ts`, `tests/checkins.test.ts`

**Interfaces:**
- Produces: `diaLocal(d: Date): string` (formato `YYYY-MM-DD` no fuso `America/Sao_Paulo`); `computeStreak(dias: string[], hoje: string): number`; `resultadoDoDia(c: CheckIn | null): 'completo' | 'parcial' | 'vazio'`; `type CheckIn = { dia: string; alimentacao: boolean; agua: boolean; movimento: boolean; sono: boolean; deus: boolean }`; `salvarCheckin(c: CheckIn): Promise<'salvo' | 'pendente'>` (sem internet guarda localmente e devolve `pendente`); `sincronizarPendentes(): Promise<number>`.

- [ ] **Step 1: Write the failing tests:** `diaLocal(new Date('2026-11-22T02:30:00Z'))` → `'2026-11-21'` (23:30 em São Paulo); `computeStreak` conta dias seguidos com check-in, mesmo parcial, até hoje ou ontem; um dia sem registro interrompe; sem registros → 0; `resultadoDoDia` devolve `completo` com 5 marcados, `parcial` com 1 a 4, `vazio` com 0 ou `null`; `salvarCheckin` com rede indisponível devolve `pendente` e `sincronizarPendentes` o envia depois e devolve 1.
- [ ] **Step 2: Run** `npx vitest run tests/streak.test.ts tests/checkins.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** as funções; `salvarCheckin` faz upsert em `checkins` por `(email, dia)` e usa `localStorage` para a fila pendente.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: check-in, sequência e fuso de São Paulo`

### Task 9: Telas e navegação

**Files:**
- Create: `src/views/hoje.ts`, `src/views/cardapio.ts`, `src/views/compras.ts`, `src/views/checkin.ts`, `src/views/aulas.ts`, `src/views/privacidade.ts`; Modify: `src/main.ts`; Test: `tests/views.test.ts`

**Interfaces:**
- Consumes: `Cardapio`, `buildShoppingList`, `pickMessage`, `computeStreak`, `resultadoDoDia`, `salvarCheckin`, `sessaoAtiva`.
- Produces: `proximaRefeicao(c: Cardapio, agora: Date): Refeicao` (a próxima por horário no fuso de São Paulo; depois da última, a primeira do dia seguinte).

- [ ] **Step 1: Write the failing tests** `tests/views.test.ts`: `proximaRefeicao` do cardápio 1100 às 13:00 → lanche da tarde (16:00); às 21:00 → café da manhã; a tela Hoje mostra um versículo antes da refeição; a tela de check-in exibe exatamente 5 itens com os nomes da especificação; ao salvar check-in `parcial` ou `vazio` na virada do dia, a tela mostra uma mensagem do tipo `incentivo`; `completo` mostra `gratidao`; sem sessão ativa o roteador mostra o login.
- [ ] **Step 2: Run** `npx vitest run tests/views.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `proximaRefeicao` e as telas: Hoje (próxima refeição + texto + atalho ao check-in + sequência), Cardápio (escolha das 12 faixas na primeira vez, troca depois, refeições com "pode substituir por", sugestões e hortaliças; nota apontando para a aula do cálculo calórico), Compras (checklist agrupado, com trocas e hortaliças), Check-in (5 toques), Aulas (botão para a área do aluno na Eduzz), Privacidade; navegação inferior; todo texto em português e crédito "NAA — Sociedade Bíblica do Brasil" junto aos versículos.
- [ ] **Step 4: Run** `npx vitest run` e `npm run build` — Expected: PASS.
- [ ] **Step 5: Commit** `feat: telas do aluno`

### Task 10: Publicação, Eduzz real e testes em aparelhos

**Files:**
- Create: `.github/workflows/deploy.yml`, `docs/lancamento.md` (checklist); Modify: `README.md`

**Interfaces:**
- Consumes: tudo acima. Produces: app publicado em URL estável, webhook da Eduzz ativo apontando para a função publicada.

- [ ] **Step 1:** Workflow do GitHub Pages que roda `npm test` e `npm run build` antes de publicar; publicar a função com `supabase functions deploy eduzz-webhook` e aplicar a migração.
- [ ] **Step 2:** Configurar no Supabase o envio de e-mail por serviço próprio (o padrão tem limite baixo) e o texto do e-mail do código em português.
- [ ] **Step 3 (com Felipe, no navegador do app, pedindo o OK dele antes de salvar):** criar na Eduzz o webhook (tipo Fatura) apontando para a função publicada e guardar o segredo de autenticidade no Supabase.
- [ ] **Step 4 (feito por Felipe):** compra de teste na Eduzz com um e-mail de teste; verificar: aluno vira `ativo`, recebe código, entra; depois reembolso do teste e verificar que o acesso é bloqueado na chamada seguinte, mesmo com o app aberto.
- [ ] **Step 5:** Testar no iPhone (Safari → adicionar à tela inicial) e no Android (Chrome): login, os 12 cardápios, lista, check-in com e sem internet, virada do dia.
- [ ] **Step 6:** Conferir com Felipe: revisão dos bancos (marcar `verificado: true` nos versículos conferidos na NAA), nome e logo definitivos, política de privacidade e termos, resposta da SBB sobre uso da NAA.
- [ ] **Step 7: Commit** `chore: publicação e checklist de lançamento`

### Task 11: Receitas com foto (módulo depois do núcleo)

**Files:**
- Create: `tools/extract_receitas.py`, `src/data/receitas.json`, `public/receitas/*.webp`, `src/views/receitas.ts`, `tests/receitas.test.ts`; Modify: `src/main.ts`

**Interfaces:**
- Consumes: e-book de receitas enviado por Felipe (PDF) e a origem das fotos que ele definir.
- Produces: `type Receita = { id: string; titulo: string; porcoes: string; tempo: string; ingredientes: string[]; preparo: string[]; foto: string; fotoIlustrativa: boolean }`; `buscarReceitas(todas: Receita[], termo: string): Receita[]` (ignora caixa e acentos, procura no título e nos ingredientes).

- [ ] **Step 1: Write the failing tests** `tests/receitas.test.ts`: toda receita tem título, ao menos 1 ingrediente e 1 passo de preparo; toda `foto` existe em `public/receitas/`; `buscarReceitas(todas, 'frango')` encontra por título e por ingrediente; `buscarReceitas(todas, 'FRANGÓ')` equivale a `'frango'` quando o acento não muda a palavra buscada.
- [ ] **Step 2: Run** `npx vitest run tests/receitas.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `tools/extract_receitas.py` (texto e imagens do PDF, fotos convertidas para WebP leve), `buscarReceitas` e a tela de receitas (lista com foto, busca, detalhe com ingredientes e preparo; fotos geradas ou de banco levam a legenda "imagem ilustrativa").
- [ ] **Step 4:** Conferir cada receita extraída contra o e-book (ingredientes, quantidades, passos) e registrar em `docs/conferencia-receitas.md` para Felipe.
- [ ] **Step 5: Run** `npx vitest run` e `npm run build` — Expected: PASS.
- [ ] **Step 6: Commit** `feat: receitas com foto`

---

## Self-review

- **Cobertura da especificação:** acesso pela Eduzz (T4–T6), cardápios (T2), lista (T3), versículos/orações e incentivo (T7), check-in e sequência (T8), telas (T9), tema verde (T1), privacidade, SBB e lançamento (T9–T10). Liberação manual: T4.
- **Consistência de tipos:** `Cardapio`, `Item`, `Refeicao` definidos em T2 e usados em T3 e T9; `CheckIn` definido em T8 e usado em T9; `Mensagem` definido em T7 e usado em T9.
- **Dependência externa:** o formato do aviso da Eduzz só é conhecido no Step 1 da T5; as fixtures guiam os testes dali em diante.
