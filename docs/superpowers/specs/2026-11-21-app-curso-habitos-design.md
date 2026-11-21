# App do curso de hábitos saudáveis — desenho

Data: 2026-11-21 · Autor do pedido: Felipe Rocha · Status: aguardando aprovação

Curso: **Códigos do Emagrecimento e Saúde — Alimentação e hábitos saudáveis à luz da Bíblia**.
Nome do app: provisório **Mesa com Propósito** (sugestão minha; Felipe decide).

## 1. Intenção e porquê

Felipe tem um curso de alimentação e hábitos saudáveis baseado na Bíblia ("uma alimentação que glorifica a Deus"), hospedado na Eduzz: 25 aulas, 12 cardápios (1.100 a 2.200 kcal), manual de organização e e-book de receitas. Hoje os cardápios são PDFs.

O app é o companheiro do dia a dia de quem comprou o curso: o aluno abre o cardápio dele, monta a lista de compras, lê um versículo ou oração antes de cada refeição e registra um check-in diário. O objetivo é que o aluno mantenha a consistência depois das aulas, com a fé presente na rotina da mesa. O link do app fica dentro da área do aluno na Eduzz.

## 2. Objetivos, não-objetivos e anti-objetivos

**Objetivos (v1)**
- Os 12 cardápios no app, por faixa calórica, no lugar do PDF.
- Lista de compras gerada a partir do cardápio escolhido.
- Versículo curto ou oração de gratidão antes de cada refeição.
- Check-in diário com 5 itens: alimentação, água, movimento, sono, momento com Deus.
- Palavra de força e incentivo nos dias em que o aluno não cumpre tudo.
- Acesso só para quem comprou, liberado e bloqueado automaticamente pela Eduzz.

**Não-objetivos (v1)**
- Não hospeda as aulas (continuam na Eduzz; o app só leva até lá).
- Não calcula calorias nem gasto calórico (isso é ensinado na aula; o app só mostra o cardápio).
- Não inclui o manual de organização (candidato à v2).
- O e-book de receitas entra como módulo logo depois do núcleo (decisão de Felipe): cada receita com ingredientes, modo de preparo detalhado e foto ilustrativa do prato. Depende de Felipe enviar o e-book e dizer de onde vêm as fotos (do próprio e-book, banco de imagens ou imagens geradas, que seriam identificadas como ilustrativas).
- Sem lembretes por notificação push (suporte irregular em iPhone para app instalado pelo navegador; fica para depois).
- Sem comunidade, chat ou mural.

**Anti-objetivos (seria fracasso mesmo funcionando)**
- O app gerar culpa ou cobrança. O tom é de acolhimento.
- Gamificação exagerada, que tire o foco da fé e do cuidado.
- Conteúdo pago sair do app para quem não comprou.
- Promessas de resultado ou de emagrecimento. O app não substitui acompanhamento profissional.

## 3. Restrições

- Público: alunos do curso, centenas de pessoas, majoritariamente no celular (Android e iPhone), pouco técnicas.
- Idioma: português do Brasil.
- Acesso: login com o e-mail usado na compra, validado pela Eduzz (decisão de Felipe).
- A Eduzz envia avisos automáticos (webhook) em Avançado → Webhooks, por tipo de evento (por exemplo "Fatura"). O formato exato do aviso e a forma de validar sua autenticidade precisam ser confirmados na documentação da Eduzz com um aviso de teste real antes de construir essa parte.
- Os dados de check-in (sono, alimentação, hábitos) são dados pessoais ligados à saúde: o app precisa de política de privacidade e termos de uso, e deve coletar o mínimo necessário (LGPD).
- Texto bíblico: versão **NAA** (Nova Almeida Atualizada, Sociedade Bíblica do Brasil), escolhida por Felipe. Falta confirmar com a SBB quanto texto pode aparecer em um app pago e como creditar; até lá, usar só versículos curtos e manter o crédito da versão no app.

## 4. Abordagens consideradas

- **A. App web instalável (PWA) com contas e servidor próprio — escolhida.** Mesma base do app "Finanças Família Rocha" (Supabase + página estática), com uma peça nova: a função que recebe o aviso da Eduzz. Um código para Android e iPhone, sem lojas, com atualização imediata e dados na nuvem.
- B. App nas lojas (Apple/Google): descartada. Mais caro, passa por revisão a cada atualização e o ganho é pequeno para este caso.
- C. App sem servidor, com código de acesso: descartada. O código pode ser repassado e o histórico fica preso ao celular.

## 5. Decisões e comportamento

### Acesso (decisão de Felipe: a mais segura)
- Tabela de alunos com e-mail, status (ativo/bloqueado) e dados da compra.
- A Eduzz avisa cada mudança de fatura. Pago → aluno ativo. Reembolsado, cancelado ou contestado → aluno bloqueado.
- O app só deixa entrar quem está ativo. Quem tenta entrar com outro e-mail vê uma mensagem clara com orientação (usar o e-mail da compra ou falar com o suporte).
- O aviso da Eduzz deve ser verificado como autêntico, processado uma única vez mesmo se chegar duplicado, e registrado em log.
- Felipe precisa conseguir liberar ou bloquear alguém manualmente (compra com outro e-mail, problema técnico).

### Telas
1. **Hoje:** próxima refeição do cardápio com seu versículo/oração, botão para o check-in do dia, sequência de dias.
2. **Cardápio:** o aluno escolhe a faixa (12 opções) na primeira vez e pode trocar depois. Mostra as refeições com horário, item padrão e "pode substituir por", sugestões de montagem e hortaliças complementares, como nos PDFs.
3. **Lista de compras:** gerada do cardápio escolhido, agrupada por tipo (carboidratos, proteínas, frutas, vegetais, gorduras boas, outros), em formato de checklist.
4. **Check-in:** os 5 itens do dia, marcados com um toque. Pode salvar parcial e voltar no mesmo dia.
5. **Aulas e materiais:** botão que leva à área do aluno na Eduzz.

### Lista de compras
- Só cita os alimentos, sem gramas (decisão de Felipe).
- Base: itens padrão de todas as refeições do cardápio + hortaliças que o aluno marcar como as que vai usar.
- O aluno pode trocar um item padrão por uma das substituições do próprio cardápio e a lista acompanha.
- Itens repetidos aparecem uma vez só.

### Versículo ou oração antes da refeição
- Cada refeição mostra um texto curto, sorteado de um banco, sem repetir seguido.
- Banco inicial rascunhado por mim e revisado por Felipe antes de entrar. Versículos devem ter a referência correta e ser conferidos. Os dois que já estão nos PDFs (1 Coríntios 10:31 e Romanos 12:1) entram.

### Check-in e incentivo
- 5 itens: alimentação, água, movimento, sono, momento com Deus.
- Quando o dia termina com algum item não cumprido, ou o aluno abre o app sem ter feito o check-in do dia anterior, aparece uma **palavra de força** do banco de mensagens (nunca a mesma duas vezes seguidas).
- Dia totalmente cumprido recebe uma mensagem de gratidão, curta.
- **Minha escolha, para Felipe revisar:** a sequência conta dias seguidos com check-in registrado, mesmo parcial, para não punir quem tropeçou. Um dia sem nenhum registro interrompe a sequência, e o app incentiva a recomeçar sem cobrar.
- Banco de mensagens de incentivo: tom acolhedor, sem culpa, sem clichês motivacionais, revisado por Felipe.

### Conteúdo dos cardápios
- Extrair os 12 PDFs (já testado: o texto sai bem) para dados estruturados: faixa kcal, refeições (4 até 1.300 kcal; 5 de 1.400 a 2.200), horário, itens padrão com porção, substituições, sugestões de montagem, hortaliças. Itens extras aparecem em alguns níveis (whey, psyllium, albumina).
- A conferência dos dados extraídos contra os PDFs é obrigatória, e Felipe revisa por amostragem.
- O texto "Este é o plano ideal para você?" dos PDFs vira nota no app, apontando para a aula de cálculo do gasto calórico.

### Visual
- Acolhedor, limpo, pensado para o celular, com identidade ligada à fé e à mesa.
- Cores (decisão de Felipe, podem mudar depois): tons de verde claro e verde escuro para transmitir tranquilidade, texto preto, com negrito para dar ênfase. Tudo o que tiver cor entra como variável de tema, para trocar a paleta depois sem refazer telas.
- Logo e nome definitivo ainda dependem de Felipe.

### Tecnologia (minhas escolhas, como no app de finanças)
- Página instalável (PWA), hospedada como página estática.
- Supabase para login, banco de dados e a função que recebe o aviso da Eduzz.
- Login por código enviado ao e-mail (sem senha para o aluno decidir ou esquecer). Isso exige um serviço de envio de e-mail confiável; o envio padrão do Supabase tem limite baixo e não serve para centenas de alunos.
- Dados do aluno: e-mail, cardápio escolhido, trocas, check-ins, sequência.

## 6. O que fica para quem for construir

- Estrutura do banco, regras de segurança por aluno (cada um só vê os próprios dados), formato exato dos dados dos cardápios.
- Confirmar com a documentação e um aviso de teste da Eduzz: nome dos eventos de pago/reembolso/chargeback, validação de autenticidade, e-mail do comprador no aviso.
- Escolher o serviço de envio de e-mail e configurar o domínio de envio.
- Detalhes de interface, textos de tela, estados vazios e de erro.
- Plano de testes: acesso (pago, reembolso, duplicado, e-mail errado), lista de compras de cada um dos 12 cardápios, sequência de dias, uso no iPhone e no Android.
- Limites de uso dos serviços gratuitos para o número esperado de alunos.

## 7. Pendências de Felipe

1. Nome definitivo e logo do app (ou posso propor). Cores: definidas (verdes, texto preto).
2. Confirmar com a SBB o uso de trechos da NAA no app.
3. Revisão do banco de versículos/orações e do banco de mensagens de incentivo (eu rascunho).
4. Eduzz: Felipe faz o login no navegador do app; o webhook só é criado depois que o servidor do app existir, com OK dele, e a compra de teste é feita por ele.
5. Definir se o app terá política de privacidade e termos próprios (eu rascunho; recomendável revisão jurídica).
