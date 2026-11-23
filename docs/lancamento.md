# Checklist de lançamento — app do curso

Estado em 2026-11-21: o núcleo do app está construído e testado. Falta tudo o que depende de contas e decisões do Felipe.

## 1. Contas e configuração (Felipe)
- [ ] Projeto no Supabase; aplicar `supabase/migrations/001` a `005` (SQL Editor, na ordem). Conferir as regras de acesso com um aluno ativo e um bloqueado.
- [ ] Autenticação do Supabase: **desligar "Allow new users to sign up"** (só a compra cria usuário, pelo webhook); e-mail por código, texto do e-mail em português, **serviço de envio próprio** (o padrão tem limite baixo), "Confirm email" ligado.
- [ ] Repositório no GitHub com Pages ativado; segredos `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_AULAS_URL` (link da área do aluno na Eduzz).
- [ ] Publicar a função `eduzz-webhook` (Edge Function) com o segredo `EDUZZ_WEBHOOK_TOKEN` (texto longo e aleatório). `supabase/config.toml` já desliga a verificação de JWT dessa função (a Eduzz não envia); se publicar pelo painel, use "Verify JWT" desligado.
- [ ] No Supabase real, conferir: RLS com aluno ativo/bloqueado, `encerrar_sessoes` (apagar em `auth.sessions` e marcar `banned_until`), `meu_acesso()` e a corrida de eventos simultâneos (PGlite não reproduz).

## 2. Eduzz (com o Felipe, no navegador do app)
- [ ] Confirmar se a conta tem webhooks liberados (pode exigir pedido ao suporte da Eduzz).
- [ ] Ler os eventos de fatura e anotar: nome dos eventos (pago, reembolso, cancelamento, contestação), campo do e-mail do comprador, identificador e data do evento.
- [ ] Capturar um payload real de cada tipo → trocar `supabase/functions/eduzz-webhook/fixtures/provisorio-*.json` por eles e ajustar `parseEduzzEvent` (hoje PROVISÓRIO) até os testes passarem. Pendências que dependem do formato real: (a) a ordem dos eventos deve usar a data da mudança de status da fatura, não a de envio; (b) filtrar pelo(s) produto(s) do curso (um pagamento/reembolso de outro produto não pode liberar nem bloquear) e guardar o status por fatura. Tudo o que chega fica em `eventos_brutos`: conferir lá se algum evento real foi ignorado.
- [ ] Criar o webhook (tipo Fatura) apontando para `<url da função>?token=<EDUZZ_WEBHOOK_TOKEN>` — com o OK do Felipe antes de salvar.
- [ ] Compra de teste (feita pelo Felipe): aluno vira ativo, recebe código e entra; reembolso do teste bloqueia o acesso, mesmo com o app aberto.

## 3. Conteúdo (Felipe)
- [ ] Revisar `src/data/incentivos.json` e as orações em `src/data/versiculos.json` (marcar `"verificado": true`).
- [x] Versículos: texto da Bíblia Livre (BLIVRE, 2018, CC BY 4.0), com crédito em cada versículo. A NAA só entra com autorização da SBB (use só o texto autorizado e o crédito que eles pedirem). Conferir uma amostra de versículos contra o site oficial.
- [ ] Conferir por amostragem os cardápios (`docs/conferencia-cardapios.md`).
- [ ] Texto de privacidade (`src/views/privacidade.ts`) é rascunho: revisar juridicamente.
- [ ] Nome: GODIET (decidido). Conferir o ícone final em `public/` e o texto do rodapé/privacidade com o novo nome.

## 4. Testes em aparelhos
- [ ] iPhone (Safari → Compartilhar → Adicionar à Tela de Início) e Android (Chrome → Instalar app): login, os 12 cardápios, lista de compras, check-in com e sem internet, virada do dia.

## Observação
Liberar um aluno à mão (compra com outro e-mail): rodar `select liberar_aluno('email@...')` no SQL Editor **e** criar o usuário em Authentication → Add user (e-mail confirmado).
