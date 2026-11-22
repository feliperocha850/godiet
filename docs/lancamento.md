# Checklist de lançamento — app do curso

Estado em 2026-11-21: o núcleo do app está construído e testado. Falta tudo o que depende de contas e decisões do Felipe.

## 1. Contas e configuração (Felipe)
- [ ] Projeto no Supabase; aplicar `supabase/migrations/001`, `002`, `003` (SQL Editor, na ordem). Conferir as regras de acesso com um aluno ativo e um bloqueado.
- [ ] Autenticação do Supabase: e-mail por código, texto do e-mail em português, **serviço de envio próprio** (o padrão tem limite baixo), "Confirm email" ligado.
- [ ] Repositório no GitHub com Pages ativado; segredos `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_AULAS_URL` (link da área do aluno na Eduzz).
- [ ] Publicar a função `eduzz-webhook` (Edge Function) com o segredo `EDUZZ_WEBHOOK_TOKEN` (texto longo e aleatório).

## 2. Eduzz (com o Felipe, no navegador do app)
- [ ] Confirmar se a conta tem webhooks liberados (pode exigir pedido ao suporte da Eduzz).
- [ ] Ler os eventos de fatura e anotar: nome dos eventos (pago, reembolso, cancelamento, contestação), campo do e-mail do comprador, identificador e data do evento.
- [ ] Capturar um payload real de cada tipo → trocar `supabase/functions/eduzz-webhook/fixtures/provisorio-*.json` por eles e ajustar `parseEduzzEvent` (hoje PROVISÓRIO) até os testes passarem.
- [ ] Criar o webhook (tipo Fatura) apontando para `<url da função>?token=<EDUZZ_WEBHOOK_TOKEN>` — com o OK do Felipe antes de salvar.
- [ ] Compra de teste (feita pelo Felipe): aluno vira ativo, recebe código e entra; reembolso do teste bloqueia o acesso, mesmo com o app aberto.

## 3. Conteúdo (Felipe)
- [ ] Revisar `src/data/incentivos.json` e as orações em `src/data/versiculos.json` (marcar `"verificado": true`).
- [ ] Versículos: preencher o campo `texto` com o texto oficial da NAA, a partir de fonte licenciada, e confirmar com a SBB o uso de trechos no app. Até lá a tela mostra o tema do versículo.
- [ ] Conferir por amostragem os cardápios (`docs/conferencia-cardapios.md`).
- [ ] Texto de privacidade (`src/views/privacidade.ts`) é rascunho: revisar juridicamente.
- [ ] Nome definitivo e logo (hoje: "Mesa com Propósito", ícones provisórios em `public/`).

## 4. Testes em aparelhos
- [ ] iPhone (Safari → Compartilhar → Adicionar à Tela de Início) e Android (Chrome → Instalar app): login, os 12 cardápios, lista de compras, check-in com e sem internet, virada do dia.

## Observação
Liberar um aluno à mão (compra com outro e-mail): rodar `select liberar_aluno('email@...')` no SQL Editor **e** criar o usuário em Authentication → Add user (e-mail confirmado).
