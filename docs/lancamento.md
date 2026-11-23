# GODIET — guia de lançamento e operação

Estado em 2026-11-23: app no ar em https://feliperocha850.github.io/godiet/ (deploy automático a cada push na branch `main` do repositório `feliperocha850/godiet`). Acesso, webhook da Eduzz, bônus e painel de admin já foram testados com compra real. Resta o que depende do Felipe (seção 5).

## 1. Como o acesso funciona
- Compra paga na Eduzz → webhook cria o usuário e marca o aluno como `ativo`. Reembolso, cancelamento ou contestação → `bloqueado` e as sessões são encerradas.
- Login: e-mail da compra + código de 8 números por e-mail. Só entra quem já existe (cadastro aberto está desligado).
- **Entrega manual na Eduzz NÃO dispara o webhook.** Quem for liberado assim precisa ser liberado pelo painel de admin (seção 4).

## 2. Peças e configuração (já feitas)
- **Supabase** (projeto `pqboycbyaxsmfnyweetw`): migrações `supabase/migrations/001` a `008` aplicadas; cadastro aberto desligado; "Confirm email" ligado.
- **Envio de e-mail (Resend)**: SMTP próprio configurado no Supabase, domínio `nutricionistafeliperocha.com.br` verificado. Plano grátis: 100 e-mails/dia e 3.000/mês (cada código enviado conta 1). Se passar disso, o aluno vê "Muitos pedidos de código..."; a saída é o plano Pro do Resend (US$ 20/mês, 50.000 e-mails/mês, sem limite diário).
- **Funções (Edge Functions)**: `eduzz-webhook` (recebe as faturas) e `admin-aluno` (painel de admin, exige login e conferência da lista de administradores).
- **Segredos das funções**: `EDUZZ_WEBHOOK_TOKEN` (vai na URL do webhook) e `EDUZZ_PRODUCT_IDS` (hoje `3106592`, produto do curso; outros produtos são ignorados).
- **Eduzz**: webhook no Developer Hub com os eventos `myeduzz.invoice_paid`, `invoice_refunded`, `invoice_canceled` e `invoice_chargeback`.
- **GitHub Pages**: segredos `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `VITE_AULAS_URL` (link da área do aluno na Eduzz).
- **Planos do Supabase**: grátis serve para começar (50.000 usuários ativos/mês, 500 MB). Limites que importam: o projeto **pausa após 1 semana sem uso** e não há backup diário. O plano Pro (US$ 25/mês) remove a pausa e dá backups; considere quando houver alunos pagantes de verdade.

## 3. Bônus em PDF
Os PDFs ficam **cifrados** (AES-GCM) em `public/bonus/*.bin`. A chave fica na tabela `bonus_chave` do banco e só aluno ativo consegue lê-la; o app decifra no aparelho e abre o PDF. Quem baixar o `.bin` sem ser aluno não consegue abrir.

Para trocar ou adicionar um PDF:
1. Coloque o(s) PDF(s) numa pasta fora do repositório com os nomes `manual.pdf`, `suplementos.pdf`, `excecoes.pdf` (ou inclua um novo nome em `tools/cifrar-bonus.mjs` e em `BONUS` de `src/lib/bonus.ts`).
2. `node tools/cifrar-bonus.mjs <pasta-dos-pdfs> <arquivo-da-chave>` gera os `.bin` em `public/bonus/`. Use **sempre o mesmo arquivo de chave** (hoje `.demo/bonus.key`, que não vai para o Git); se a chave mudar, atualize a linha `id = 1` de `bonus_chave` no banco, senão os PDFs antigos deixam de abrir.
3. Guarde uma cópia do arquivo da chave fora do computador (ex.: gerenciador de senhas). Sem ela não dá para regerar os PDFs.
4. Faça push; o deploy publica.

## 4. Painel de admin (liberar, bloquear, consultar)
- Endereço: `https://feliperocha850.github.io/godiet/#/admin` (não aparece no menu). Entre no app com um e-mail de administrador.
- Botões: **Consultar** (mostra ATIVO, BLOQUEADO ou Não cadastrado), **Liberar acesso** (cria o login e libera; use para entrega manual ou compra com outro e-mail), **Bloquear acesso** (pede confirmação, encerra as sessões e impede novos códigos). Não é possível bloquear um administrador.
- Administradores ficam na tabela `administradores` (hoje só `feliperocha850@gmail.com`). Para incluir outro: `insert into administradores (email) values ('email@...');` no SQL Editor do Supabase.
- Se o painel não aparecer depois de uma atualização, o aparelho está com a versão antiga em cache: feche e reabra o app, ou use Ctrl+Shift+R.

## 5. Pendências do Felipe antes de vender
- [ ] Gravar a aula do app.
- [ ] Revisar uma amostra dos versículos (Bíblia Livre), as mensagens, as orações e as 15 reflexões (`src/data/incentivos.json` e `src/data/versiculos.json`, marcar `"verificado": true`).
- [ ] Texto de privacidade (`src/views/privacidade.ts`) e crédito da Bíblia Livre no rodapé: revisão jurídica.
- [ ] Conferir por amostragem os cardápios (`docs/conferencia-cardapios.md`).
- [ ] Testar no Android (Chrome → Instalar app). O iPhone já foi testado.
- [ ] Na primeira venda real reembolsada, conferir que o aluno foi bloqueado e desconectado. Esse caminho foi testado pelo painel e pelo banco, mas ainda não com um reembolso real da Eduzz.
- [ ] Decidir o plano do Resend (e, depois, do Supabase) conforme o volume de vendas.

## 6. Versículos e licença
Texto da Bíblia Livre (BLIVRE, 2018, CC BY 4.0), com crédito em cada versículo e na tela de privacidade. A NAA é da Sociedade Bíblica do Brasil e só pode entrar com autorização dela.
