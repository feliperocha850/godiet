#!/usr/bin/env python3
"""Extrai os 12 PDFs de cardápio (pdftotext -layout) para JSON no formato de src/domain/types.ts.

Uso: python3 tools/extract_cardapios.py <pasta_com_pdfs> <pasta_saida> [--debug]
Os PDFs seguem o mesmo molde: item padrão (nome + porção) à esquerda e
"pode substituir por" à direita; sugestões de montagem; hortaliças; refeição substituta.
"""
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

PORCAO = re.compile(
    r"(½|¼|\d+(?:[.,/]\d+)?)\s*(colher|colheres|fatia|fatias|unidade|unidades|xícara|xícaras|concha|conchas|"
    r"pote|rodela|rodelas|filé|filés|posta|postas|folha|folhas|sachê|dose|doses|scoop|g\b|kg\b|mL\b|ml\b|L\b)",
    re.I,
)
UPPER = "A-ZÁÀÂÃÉÊÍÓÔÕÚÇ"

GRUPOS = {
    "carboidrato": ["pão", "arroz", "batata", "aveia", "tapioca", "milharina", "flocão", "feijão", "quinoa",
                    "ervilha", "lentilha", "grão-de-bico", "rap 10", "abóbora", "crepioca", "farelo"],
    "proteina": ["frango", "carne", "peixe", "ovo", "queijo", "iogurte", "leite", "whey", "albumina",
                 "requeijão", "cottage", "atum", "clara"],
    "gordura": ["azeite", "óleo", "amendoim", "abacate", "nozes", "amêndoas", "castanha"],
    "fruta": ["banana", "maçã", "pera", "laranja", "mamão", "melão", "melancia", "morango", "uva", "kiwi",
              "manga", "abacaxi", "ameixa", "tangerina", "pêssego"],
    "vegetal": ["brócolis", "couve", "vagem", "espinafre", "abobrinha", "berinjela", "beterraba", "chuchu",
                "cenoura", "tomate", "pepino", "palmito", "alface", "rúcula", "agrião"],
}


def sem_acento(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").lower()


def grupo_de(nome: str) -> str:
    n = sem_acento(nome)
    for g, chaves in GRUPOS.items():
        if any(sem_acento(k) in n for k in chaves):
            return g
    return "outro"


def squeeze(s: str) -> str:
    return re.sub(r"\s+", "", s)


def dividir_subs(texto: str):
    """Divide uma linha da coluna direita em substituições (separadas por 3+ espaços)."""
    partes = [p.strip() for p in re.split(r"\s{3,}", texto.strip()) if p.strip()]
    return partes


def nome_porcao(texto: str):
    """'Melão 1 fatia (100g)' -> ('Melão', '1 fatia (100g)'). 'Couve' -> ('Couve', '')."""
    t = texto.strip()
    livre = re.match(r"^(.*?)\s+(folhas livres)$", t)
    if livre:
        return livre.group(1).strip(), livre.group(2)
    m = PORCAO.search(t)
    if not m:
        return t.rstrip(" -"), ""
    nome = t[: m.start()].rstrip(" -").strip()
    return nome, t[m.start():].strip()


def pdf_para_texto(pdf: Path) -> str:
    return subprocess.run(["pdftotext", "-layout", str(pdf), "-"], capture_output=True, text=True, check=True).stdout


def eh_marcador_fim_tabela(linha: str) -> bool:
    s = squeeze(linha)
    return (
        s.startswith("SUGESTÕESDEMONTAGEM")
        or s.startswith("VEGETAISCOMPLEMENTARES")
        or s.startswith("SALADAVERDE")
        or s.startswith("REFEIÇÃOSUBSTITUTA")
        or s.startswith("OBSERVAÇÃO")
        or linha.strip().startswith("Obs:")
        or re.match(r"^\s*\d{2}:\d{2}\s*$", linha) is not None
        or s.startswith("HÁBITOSQUETRANSFORMAM")
        or s.startswith("ALÉMDOPRATO")
    )


def parse_tabela(linhas, cut):
    """Converte linhas de uma tabela (padrão | substituições) em itens."""
    itens = []  # cada um: dict(nome, porcao, subs[list of [nome, porcao]], sem_sub)
    atual = None
    for raw in linhas:
        if not raw.strip():
            continue
        esq = raw[:cut].rstrip()
        dir_ = raw[cut:].strip() if len(raw) > cut else ""
        esq_s = esq.strip()
        if esq_s:
            eh_porcao = re.match(r"^(½|¼|\d)", esq_s) is not None
            if eh_porcao:
                if atual is not None:
                    atual["porcao"] = (atual["porcao"] + " " + esq_s).strip()
            else:
                aberto = atual is not None and atual["nome"].count("(") > atual["nome"].count(")")
                if aberto:
                    atual["nome"] += " " + esq_s
                elif atual is not None and atual["porcao"] == "" and not atual["subs"] and not atual["sem_sub"] and not re.search(r"\)$", atual["nome"]) and re.match(rf"^[{UPPER}]", esq_s) is None:
                    atual["nome"] += " " + esq_s
                else:
                    atual = {"nome": esq_s, "porcao": "", "subs": [], "sem_sub": False}
                    itens.append(atual)
        if dir_ and atual is not None:
            if sem_acento(dir_).startswith("sem substituicao"):
                atual["sem_sub"] = True
                continue
            if re.match(rf"^[{UPPER}]", dir_):
                for p in dividir_subs(raw[cut:]):
                    atual["subs"].append([p])
            elif atual["subs"]:
                # continuação de linha quebrada, ex.: '(20g)' ou '- 100g'
                atual["subs"][-1][0] += " " + dir_
    return itens


def separar_detalhe(nome: str):
    """'Banana (ouro, prata etc.)' -> ('Banana', 'ouro, prata etc.')."""
    nome = re.sub(r"\s+", " ", nome).strip()
    m = re.match(r"^(.*?)\s*\((.*)\)\s*$", nome)
    if m and m.group(1):
        return m.group(1).strip(), m.group(2).strip()
    return nome, ""


def parse_sub(texto: str):
    """Uma substituição; combinações 'A 1 unidade + B 1 fatia' viram nome 'A + B'."""
    texto = re.sub(r"\s+", " ", texto).strip()
    if " + " in texto:
        nomes, porcoes = [], []
        for parte in texto.split(" + "):
            n, p = nome_porcao(parte)
            nomes.append(n)
            porcoes.append(p)
        return {"nome": " + ".join(nomes), "porcao": " + ".join(x for x in porcoes if x)}
    n, p = nome_porcao(texto)
    nome, detalhe = separar_detalhe(n)
    sub = {"nome": nome, "porcao": p}
    if detalhe:
        sub["detalhe"] = detalhe
    return sub


def montar_item(it) -> dict:
    subs = [parse_sub(texto) for (texto,) in it["subs"]]
    # 'Couve   Vagem   Espinafre   mesma porção': a última parte é só o rótulo
    if subs and subs[-1]["nome"].lower() == "mesma porção":
        subs.pop()
        for s_ in subs:
            if s_["porcao"] == "":
                s_["porcao"] = "mesma porção"
    nome, detalhe = separar_detalhe(it["nome"])
    item = {
        "nome": nome,
        "porcao": re.sub(r"\s+", " ", it["porcao"]).strip(),
        "grupo": grupo_de(nome),
        "substituicoes": subs,
    }
    if detalhe:
        item["detalhe"] = detalhe
    return item


def parse_sugestoes(linhas):
    texto = [l.rstrip() for l in linhas if l.strip()]
    if not texto:
        return []
    primeira = texto[0]
    nums = [m for m in re.finditer(r"(?:^|\s)(\d)\s{2,}\S", primeira)]
    cut = nums[1].start(1) if len(nums) > 1 else None
    colunas = {0: [], 1: []}
    for l in texto:
        esq, dir_ = (l[:cut], l[cut:]) if cut else (l, "")
        for i, parte in ((0, esq), (1, dir_)):
            p = parte.strip()
            if not p:
                continue
            m = re.match(r"^(\d)\s{2,}(.*)$", p)
            if m:
                colunas[i].append(m.group(2).strip())
            elif colunas[i]:
                colunas[i][-1] += " " + p
    res = []
    # ordem por número: esquerda e direita alternadas por linha de início
    n = max(len(colunas[0]), len(colunas[1]))
    for k in range(n):
        for i in (0, 1):
            if k < len(colunas[i]):
                res.append(re.sub(r"\s+", " ", colunas[i][k]))
    return res


def parse_orientacao_hortalicas(header: str) -> str:
    s = squeeze(header)
    partes = []
    m = re.search(r"ESCOLHA(\d)(?:A(\d))?OP", s)
    if m:
        partes.append(f"Escolha {m.group(1)} a {m.group(2)} opções" if m.group(2) else f"Escolha {m.group(1)} opção")
    if "1COLHERDESERVIR" in s:
        partes.append("1 colher de servir")
    return " · ".join(partes)


def parse_cardapio(texto: str, kcal: int, avisos: list):
    linhas = texto.split("\n")
    refeicoes = []
    i = 0
    while i < len(linhas):
        m = re.match(r"^\s*(\d{2}):(\d{2})\s*$", linhas[i])
        if not m:
            i += 1
            continue
        horario = f"{m.group(1)}:{m.group(2)}"
        j = i + 1
        while j < len(linhas) and not linhas[j].strip():
            j += 1
        nome = linhas[j].strip().capitalize() if j < len(linhas) else "?"
        nome = {"Cafe da manha": "Café da manhã"}.get(nome, nome)
        # fim do bloco: próxima hora ou fim de página sem refeição
        k = j + 1
        bloco = []
        while k < len(linhas) and not re.match(r"^\s*\d{2}:\d{2}\s*$", linhas[k]):
            bloco.append(linhas[k])
            k += 1
        refeicoes.append(parse_bloco(horario, nome, bloco, avisos, kcal))
        i = k
    return {"kcal": kcal, "refeicoes": refeicoes}


def seccionar(bloco):
    """Divide o bloco da refeição em seções rotuladas."""
    secoes = []  # (tipo, [linhas], header)
    atual = ("inicio", [], "")
    for l in bloco:
        s = squeeze(l)
        if s.startswith("ALÉMDOPRATO"):
            break
        if "PODESUBSTITUIRPOR" in s:
            tipo = "tabela_subst" if secoes and secoes[-1][0] == "marc_subst" else "tabela"
            secoes.append(atual)
            atual = (tipo, [], l)
        elif s.startswith("SUGESTÕESDEMONTAGEM"):
            secoes.append(atual)
            atual = ("sugestoes", [], l)
        elif s.startswith("VEGETAISCOMPLEMENTARES"):
            secoes.append(atual)
            atual = ("hortalicas", [], l)
        elif s.startswith("SALADAVERDE"):
            secoes.append(atual)
            atual = ("salada", [], l)
        elif s.startswith("REFEIÇÃOSUBSTITUTA"):
            secoes.append(atual)
            atual = ("marc_subst", [], l)
        elif s.startswith("OBSERVAÇÃO"):
            secoes.append(atual)
            atual = ("observacao", [], l)
        elif l.strip().startswith("Obs:"):
            secoes.append(atual)
            atual = ("obs_linha", [l], l)
        elif s.startswith("HÁBITOSQUETRANSFORMAM") or re.match(r"^CARDÁPIO[\d.]+KCAL", s):
            continue
        else:
            atual[1].append(l)
    secoes.append(atual)
    return secoes


def parse_bloco(horario, nome, bloco, avisos, kcal):
    secoes = seccionar(bloco)
    ref = {"id": "", "nome": nome, "horario": horario, "padrao": [], "sugestoes": []}
    nome_slug = sem_acento(nome).replace(" ", "-")
    ref["id"] = nome_slug
    tab = 0
    for tipo, ls, header in secoes:
        if tipo == "tabela":
            tab += 1
            cut = header.find("PODE")
            itens = [montar_item(x) for x in parse_tabela(ls, cut)]
            if tab == 1:
                ref["padrao"] = itens
            else:
                ref.setdefault("substituta", {"nome": "", "itens": [], "observacao": ""})["itens"] = itens
        elif tipo == "tabela_subst":
            cut = header.find("PODE")
            itens = [montar_item(x) for x in parse_tabela(ls, cut)]
            ref.setdefault("substituta", {"nome": "", "itens": [], "observacao": ""})["itens"] = itens
        elif tipo == "sugestoes":
            ref["sugestoes"] = parse_sugestoes(ls)
        elif tipo == "hortalicas":
            extra = ""
            while ls and (not ls[0].strip() or not re.search(r"[a-zà-ú]", ls[0])):
                extra += ls.pop(0)
                if not ls or ls[0].strip() and re.search(r"[a-zà-ú]", ls[0]):
                    break
            ref["hortalicasOrientacao"] = parse_orientacao_hortalicas(header + extra)
            ref["hortalicas"] = [x for l in ls for x in re.split(r"\s{2,}", l.strip()) if x]
        elif tipo == "salada":
            ref["salada"] = [x for l in ls for x in re.split(r"\s{2,}", l.strip()) if x]
        elif tipo == "observacao":
            obs = " ".join(l.strip() for l in ls if l.strip())
            ref.setdefault("substituta", {"nome": "", "itens": [], "observacao": ""})["observacao"] = obs
        elif tipo == "obs_linha":
            ref["observacao"] = ls[0].strip().removeprefix("Obs:").strip()
        elif tipo == "marc_subst":
            m = re.search(r"no lugar (d[oa]s? .*)$", header.strip())
            if m:
                ref.setdefault("substituta", {"nome": "", "itens": [], "observacao": ""})["nome"] = "No lugar " + m.group(1)
    if not ref["padrao"]:
        avisos.append(f"{kcal} kcal / {nome}: sem itens padrão")
    return ref


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    pasta, saida = Path(sys.argv[1]), Path(sys.argv[2])
    debug = "--debug" in sys.argv
    saida.mkdir(parents=True, exist_ok=True)
    avisos = []
    for pdf in sorted(pasta.glob("*Cardapio_*kcal.pdf")):
        kcal = int(re.search(r"(\d{4})kcal", pdf.name).group(1))
        dados = parse_cardapio(pdf_para_texto(pdf), kcal, avisos)
        (saida / f"{kcal}.json").write_text(json.dumps(dados, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        if debug:
            print(f"{kcal}: {[ (r['horario'], len(r['padrao'])) for r in dados['refeicoes'] ]}")
    for a in avisos:
        print("AVISO:", a)


if __name__ == "__main__":
    main()
