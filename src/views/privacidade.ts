// RASCUNHO: revisar com assessoria jurídica antes do lançamento (LGPD).
export function renderPrivacidade(el: HTMLElement): void {
  el.innerHTML = `
    <h1>Privacidade e termos</h1>
    <div class="cartao">
      <p>Este app é um complemento do curso. Guardamos apenas o necessário: seu e-mail de compra, o cardápio que você escolheu,
      as trocas da lista de compras e seus check-ins diários (alimentação, água, movimento, sono e momento com Deus).</p>
      <p>Esses dados servem só para o funcionamento do app e não são vendidos nem compartilhados para publicidade.</p>
      <p>O app não substitui o acompanhamento de um profissional de saúde. Em caso de dúvida sobre sua saúde, procure seu médico ou nutricionista.</p>
      <p>Para pedir a exclusão dos seus dados, fale com o suporte do curso.</p>
    </div>`;
}
