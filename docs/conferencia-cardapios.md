# Conferência dos 12 cardápios (PDF → app)

Os dados em `src/data/cardapios/*.json` foram gerados dos PDFs por `tools/extract_cardapios.py`.

**Verificação automática (rodada em 2026-11-21):** `python3 tools/verificar_cardapios.py <pasta_dos_pdfs> src/data/cardapios`
compara, palavra por palavra (com contagem), as tabelas "refeição padrão / pode substituir por" de cada PDF com os itens e
substituições do JSON. Resultado: **OK nos 12 cardápios** (nada perdido, nada a mais).

**O que a verificação automática não cobre** (conferir por amostragem, olhando o app ou o JSON):
- a associação de cada substituição ao item certo (a ordem vertical do PDF define isso);
- sugestões de montagem, hortaliças complementares, salada e observações;
- classificação de grupo (carboidrato, proteína, gordura, fruta, vegetal, outro), usada só na lista de compras.

**Convenções do JSON**
- Nome entre parênteses vira `detalhe` ("Banana" + "ouro, prata, d'água, da terra etc.").
- "A 1 unidade + B 1 fatia" vira uma substituição de nome "A + B".
- "sem substituição" = lista de substituições vazia.
- "mesma porção" é gravado como porção de cada alternativa (ex.: Couve, Vagem, Espinafre).

**Sugestão de conferência para o Felipe:** abrir 2 cardápios (um de 1.100 e um de 2.200 kcal) e comparar uma refeição de cada com o PDF.
