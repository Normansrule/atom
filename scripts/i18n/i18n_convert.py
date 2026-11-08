#!/usr/bin/env python3
"""i18n_convert.py: wrap every English sentence in a JavaScript source in TT(),
turning concatenations into templates with placeholders, so a language pack
can translate it with its own word order.

    python3 i18n_convert.py file.js [--write] [--report]

Without --write it prints what it would change. The English output of the
page must not change: T() returns its key when no pack is loaded, and the
placeholders are filled with String(expr), which is what "+" did.

What it leaves alone: object keys, case labels, operands of == / ===, the
first argument of DOM lookups (getElementById, querySelector, classList...),
attribute names, identifiers, CSS, colours, units, URLs, fonts, dotted keys,
anything inside a template literal, and any literal on a line marked
/* i18n:skip */.
"""
import re, sys

UNITS = {"eV","keV","MeV","GeV","TeV","nm","pm","fm","am","km","mm","cm","kg","g","mg","u","K","s","ms","ns","ps","fs","Hz","kHz","MHz","GHz","THz",
         "J","kJ","MJ","GJ","mol","°C","°","%","V","kV","A","mA","T","mT","m","N","Pa","W","kW","MW","GW","TW","Wh","kWh","MWh","Bq","Gy","Sv","au","ly","pc","e","c","h","ħ","Å","L","mL","yr","Myr","Gyr","ka","Ma","Ga","ppm","ppb","min","hr","d","wk"}
DOM_SINKS = {"TT","T","querySelector","querySelectorAll","closest","matches","getAttribute","removeAttribute","hasAttribute","createElement","createElementNS",
             "addEventListener","removeEventListener","dispatchEvent","Event","CustomEvent","getItem","setItem","removeItem","hasOwnProperty","setProperty","getPropertyValue",
             "RegExp","test","match","exec","split","indexOf","lastIndexOf","startsWith","endsWith","includes","localeCompare","charAt","getContext","createRadialGradient",
             "$","q","qs","qa","el","elt","pane","byId","hasClass","on","off","emit","ev","track"}
SINK_FIRST_ONLY = {"setAttribute","classList","toggle","add","remove","contains","replace","setProperty","css","attr","data","style"}
INLINE_TAGS = {"b","i","em","strong","sup","sub","span","code","kbd","a","small","abbr","var","u","s","mark","dfn","time","br"}
BLOCK_SPLIT = True

def is_unit(text):
    t = text.strip()
    if not t: return True
    parts = re.split(r"[\s/·×*^]+", t)
    return all((re.sub(r"[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺\d]+$", "", p) in UNITS) or re.fullmatch(r"[\d.,+\-−×^⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺/()%]*", p) for p in parts)

def strip_tags(s): return re.sub(r"<[^>]*>", " ", s)

def words_of(t): return re.findall(r"[A-Za-z][A-Za-z'’\-]*", t)

def is_prose(lit):
    """lit is the raw (unescaped) string content"""
    s = lit
    if "${" in s: return False
    text = re.sub(r"&[a-zA-Z]+;|&#\d+;", " ", strip_tags(s))        # entities are not words
    if not re.search(r"[A-Za-z]{2}", text): return False
    st = s.strip()
    if re.fullmatch(r"[a-z][A-Za-z0-9_\-]*", st): return False            # identifier / class name
    if re.match(r"^[A-Za-z-]+=[\"']", st) or re.fullmatch(r"[a-z]+:[\w*:\-{}]+", st) or re.fullmatch(r"[a-z]_[\w²³]+", st): return False   # an attribute, a key like build:6:12:0, f_xz²
    if re.fullmatch(r"[\d.]+\s*[a-zA-Zµ]{1,4}(yr|kg|m³|/m³)?", st) or re.fullmatch(r"&[a-z]+;.*", st) and len(words_of(text)) <= 2: return False   # 159 kyr, &radic;2
    if re.fullmatch(r"[A-Z][A-Z0-9_]+(_[A-Za-z0-9_]+)*", st) or re.fullmatch(r"[A-Z]+_[A-Za-z_]+", st): return False   # a constant name: WEBGL_debug_renderer_info
    if re.fullmatch(r"[a-z0-9_\-]+(\.[a-z0-9_\-]+)+", st): return False     # dotted key
    if re.match(r"^A\d\.[a-z0-9]+\.", st): return False                     # a challenge or turn-in code
    if re.match(r"^[#.\[]", st) and " " not in st: return False             # selector
    if re.fullmatch(r"\((?:[a-z-]+:\s*[a-z-]+)\)", st): return False       # a media query
    if re.match(r"^<[a-z][a-z0-9]*\b", st) and ">" not in st: return False  # an unterminated tag
    if re.fullmatch(r"[a-z]+\[[^\]]*\]", st) or re.match(r"^\{\w+\}, \.", st): return False   # a selector
    if len(re.findall(r"(?:^|,\s*)\.[a-z][\w-]*", st)) >= 2 or re.fullmatch(r"[a-z]+\[[^\]]*\](?:\s*,\s*[.#]?[\w-]+(\[[^\]]*\])?)*", st): return False   # a selector list
    if "\n" in s and not re.search(r"[.!?]\s", s): return False             # a console message
    if re.fullmatch(r"#[0-9a-fA-F]{3,8}", st): return False
    if re.match(r"^(rgba?|hsla?)\(", st): return False
    if re.match(r"^(https?:|mailto:|data:|blob:|\.\./|\./)", st): return False
    if re.fullmatch(r"[\w.-]+\.(io|com|org|edu|net|gov|html?|js|css|json)(/\S*)?", st): return False   # a bare address or a file name
    if re.search(r"\d+(px|em|rem|vw|vh|%)\b", st) and len(text.split()) <= 4: return False
    if re.search(r"\b(sans-serif|serif|monospace|Archivo|ui-monospace)\b", s) or re.search(r"\b(translate[XYZ]?|scale[XYZ]?|rotate[XYZ]?|matrix|calc|var|url|rgba?|hsla?)\(", text): return False   # fonts, transforms, CSS functions (in the text itself; a swatch's inline style around prose is not)
    if re.match(r"^[\d\s.,+\-×]+$", text.strip()): return False
    if is_unit(text): return False
    # a long string with sentences is prose whatever else it contains (E=mc², "l=0 is s", "precision tests")
    long_words = [w for w in re.findall(r"[A-Za-z][A-Za-z'’\-]*", text) if len(w) >= 3]
    if len(long_words) >= 8 and re.search(r"[.!?](\s|$)", text) and not re.search(r"[{};]\s*\n|\bfunction\s*\(|\breturn\b|\bvar\s+\w+\s*=", s): return True
    if re.search(r"\w=[\w.(\-]", re.sub(r"\bE=mc²", "", s)) or re.search(r"[+\-*/]=", s) or re.search(r"\b(vec[234]|ivec[234]|mat[234]|float|int|sampler2D)\s+\w+\s*[;=,)]", s) or re.search(r"\b(uniform|varying|attribute)\s+\w+\s+\w+\s*;|\bprecision\s+(lowp|mediump|highp)\b|\bgl_FragColor\b|\bdiscard\s*;|use strict", s) or st.startswith("#version"): return False   # code, GLSL
    if re.fullmatch(r"[A-Z][a-z]?\d*(?:[A-Z][a-z]?\d*|[()·\d⁺⁻²³⁴⁵⁶⁷⁸⁹₀-₉+\-])*", st): return False   # a formula: CuSO4·5H2O, Fe2O3
    words = re.findall(r"[A-Za-z][A-Za-z'’\-]*", text)
    long = [w for w in words if len(w) >= 3]
    if not any(re.fullmatch(r"[A-Z]?[a-z]{2,}[A-Za-z'’\-]*", w) for w in words): return False   # no ordinary word at all (H-He-Li, MeV, DNA)
    if not long and len(words) < 2: return False
    # a lone lowercase word with no space is code unless it is clearly prose
    if len(words) == 1 and " " not in text.strip() and words[0][0].islower() and len(words[0]) < 5: return False
    # looks like a CSS declaration or a JS snippet
    if re.search(r"(^|[;{]\s*)[a-z-]+:\s*[^;{}]{1,60};", re.sub(r"&[a-zA-Z]+;|&#\d+;", " ", s)) or re.search(r"[{}]", text): return False   # CSS: a declaration at the start or after another (an entity's semicolon is not one)
    if re.search(r"\bfunction\s*(?:[A-Za-z_$][\w$]*\s*)?\([\w$\s,]*\)\s*\{|\breturn\b[^.!?]*;|\b(?:if|while|for|switch)\s*\(|\bvar\s+\w+\s*[=;]|=>|\|\||&&", s): return False   # code; "the radial function" and "return rockets" are words
    return True

# ------------------------------------------------------------------ tokenizer
KEYWORDS_BEFORE_REGEX = {"return","typeof","case","do","else","in","of","instanceof","new","delete","void","throw"}
PUNCT_BEFORE_REGEX = set("(,=:[!&|?{};+-*%<>~^")

def tokenize(src):
    toks = []  # (kind, text, start, end)
    i, n = 0, len(src)
    def last_sig():
        for t in reversed(toks):
            if t[0] not in ("ws", "comment"): return t
        return None
    while i < n:
        c = src[i]
        if c in " \t\r\n":
            j = i
            while j < n and src[j] in " \t\r\n": j += 1
            toks.append(("ws", src[i:j], i, j)); i = j; continue
        if src.startswith("//", i):
            j = src.find("\n", i); j = n if j < 0 else j
            toks.append(("comment", src[i:j], i, j)); i = j; continue
        if src.startswith("/*", i):
            j = src.find("*/", i + 2); j = n if j < 0 else j + 2
            toks.append(("comment", src[i:j], i, j)); i = j; continue
        if c in "'\"":
            j = i + 1
            while j < n and src[j] != c:
                if src[j] == "\\": j += 1
                j += 1
            toks.append(("str", src[i:j+1], i, j+1)); i = j + 1; continue
        if c == "`":
            j = i + 1; depth = 0
            while j < n:
                if src[j] == "\\": j += 2; continue
                if src.startswith("${", j): depth += 1; j += 2; continue
                if src[j] == "}" and depth: depth -= 1; j += 1; continue
                if src[j] == "`" and not depth: break
                j += 1
            toks.append(("tpl", src[i:j+1], i, j+1)); i = j + 1; continue
        if c == "/":
            prev = last_sig()
            regex = prev is None or (prev[0] == "punct" and prev[1] in PUNCT_BEFORE_REGEX) or (prev[0] == "id" and prev[1] in KEYWORDS_BEFORE_REGEX)
            if regex:
                j = i + 1; incls = False
                while j < n:
                    if src[j] == "\\": j += 2; continue
                    if src[j] == "[": incls = True
                    elif src[j] == "]": incls = False
                    elif src[j] == "/" and not incls: break
                    elif src[j] == "\n": break
                    j += 1
                j += 1
                while j < n and src[j].isalpha(): j += 1
                toks.append(("regex", src[i:j], i, j)); i = j; continue
        if c.isdigit() or (c == "." and i + 1 < n and src[i+1].isdigit()):
            m = re.match(r"(0x[0-9a-fA-F]+|\d*\.?\d+(?:[eE][+-]?\d+)?)", src[i:])
            toks.append(("num", m.group(0), i, i + len(m.group(0)))); i += len(m.group(0)); continue
        if c.isalpha() or c in "_$":
            m = re.match(r"[A-Za-z_$][A-Za-z0-9_$]*", src[i:])
            toks.append(("id", m.group(0), i, i + len(m.group(0)))); i += len(m.group(0)); continue
        m = re.match(r"(===|!==|==|!=|<=|>=|&&|\|\||\+\+|--|\+=|-=|\*=|/=|=>|\.\.\.|[-+*/%=<>!&|^~?:;,.(){}\[\]])", src[i:])
        if m:
            toks.append(("punct", m.group(0), i, i + len(m.group(0)))); i += len(m.group(0)); continue
        toks.append(("other", c, i, i + 1)); i += 1
    return toks

def sig_prev(toks, k):
    k -= 1
    while k >= 0 and toks[k][0] in ("ws", "comment"): k -= 1
    return k
def sig_next(toks, k):
    k += 1
    while k < len(toks) and toks[k][0] in ("ws", "comment"): k += 1
    return k

def unquote(tok):
    q = tok[0]; body = tok[1:-1]
    out = ""; i = 0
    while i < len(body):
        c = body[i]
        if c == "\\" and i + 1 < len(body):
            d = body[i+1]
            if d == "n": out += "\n"
            elif d == "t": out += "\t"
            elif d == "u" and re.match(r"[0-9a-fA-F]{4}", body[i+2:i+6]): out += chr(int(body[i+2:i+6], 16)); i += 6; continue
            elif d == "x" and re.match(r"[0-9a-fA-F]{2}", body[i+2:i+4]): out += chr(int(body[i+2:i+4], 16)); i += 4; continue
            else: out += d
            i += 2; continue
        out += c; i += 1
    return out

def quote(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n").replace("\t", "\\t") + '"'

# ------------------------------------------------------------------ context rules
def skip_context(toks, k):
    """the literal at toks[k] is code, not prose, by where it sits"""
    p = sig_prev(toks, k); nx = sig_next(toks, k)
    pt = toks[p] if p >= 0 else None; nt = toks[nx] if nx < len(toks) else None
    if pt and pt[0] == "punct" and pt[1] in ("===", "!==", "==", "!="): return True
    if nt and nt[0] == "punct" and nt[1] in ("===", "!==", "==", "!="): return True
    if pt and pt[0] == "id" and pt[1] == "case": return True
    if nt and nt[0] == "punct" and nt[1] == ":":
        # object key (prev is { or ,) — but not a ternary branch
        if pt and pt[0] == "punct" and pt[1] in ("{", ","): return True
    if pt and pt[0] == "punct" and pt[1] == "[":
        # index: x["key"]
        pp = sig_prev(toks, p)
        if pp >= 0 and toks[pp][0] in ("id",) or (pp >= 0 and toks[pp][1] in (")", "]")): return True
    if pt and pt[0] == "punct" and pt[1] in ("(", ","):
        # find the call: walk back to the opening paren and its callee
        depth = 0; j = p
        while j >= 0:
            t = toks[j]
            if t[0] == "punct":
                if t[1] in (")", "]", "}"): depth += 1
                elif t[1] in ("(", "[", "{"):
                    if depth == 0: break
                    depth -= 1
            j -= 1
        if j >= 0 and toks[j][1] == "(":
            c = sig_prev(toks, j)
            if c >= 0 and toks[c][0] == "id":
                callee = toks[c][1]
                if callee in DOM_SINKS: return True
                # setTab("Quark"), setMode("light"): a one-word argument to a set*/goto* function is a state name
                if re.match(r"^(set|goto|go|switch|select)[A-Z]\w*$", callee) and pt[1] == "(" and " " not in toks[k][1].strip('"\''): return True
                if callee in SINK_FIRST_ONLY and pt[1] == "(": return True
                # x.classList.add("..") / el.setAttribute("name", ...)
                cp = sig_prev(toks, c)
                if cp >= 0 and toks[cp][1] == "." :
                    obj = sig_prev(toks, cp)
                    if obj >= 0 and toks[obj][1] in ("classList", "localStorage", "sessionStorage", "style", "dataset"): return True
    # assignment to a known code sink: x.font = "...", style.x = "..", .className = "..", .id = ".."
    if pt and pt[0] == "punct" and pt[1] == "=":
        lhs = sig_prev(toks, p)
        if lhs >= 0 and toks[lhs][0] == "id" and toks[lhs][1] in ("font","className","id","src","href","dir","lang","type","name","cursor","display","position","textAlign","textBaseline","lineCap","lineJoin","globalCompositeOperation","mode","kind","key","hash"): return True
    return False

def line_of(src, pos): return src.count("\n", 0, pos) + 1

# ------------------------------------------------------------------ operands and chains
def operand_end(toks, k):
    """toks[k] begins a non-string operand; return the index after it (depth-0 primary with postfixes)"""
    n = len(toks); i = k
    # unary prefixes
    while i < n and ((toks[i][0] == "punct" and toks[i][1] in ("!", "-", "~")) or (toks[i][0] == "id" and toks[i][1] in ("typeof", "new", "void"))):
        i = sig_next(toks, i)
    if i >= n: return k
    t = toks[i]
    if t[0] in ("id", "num", "str", "tpl", "regex"): i += 1
    elif t[0] == "punct" and t[1] in ("(", "["):
        depth = 0
        while i < n:
            if toks[i][0] == "punct":
                if toks[i][1] in ("(", "[", "{"): depth += 1
                elif toks[i][1] in (")", "]", "}"):
                    depth -= 1
                    if depth == 0: i += 1; break
            i += 1
    else: return k
    # postfixes: .name, [..], (..)
    while True:
        j = i
        while j < n and toks[j][0] in ("ws", "comment"): j += 1
        if j >= n: break
        tj = toks[j]
        if tj[0] == "punct" and tj[1] == ".":
            nm = sig_next(toks, j)
            if nm < n and toks[nm][0] == "id": i = nm + 1; continue
            break
        if tj[0] == "punct" and tj[1] in ("(", "["):
            depth = 0; m = j
            while m < n:
                if toks[m][0] == "punct":
                    if toks[m][1] in ("(", "[", "{"): depth += 1
                    elif toks[m][1] in (")", "]", "}"):
                        depth -= 1
                        if depth == 0: m += 1; break
                m += 1
            i = m; continue
        break
    return i

def operand_start(toks, k):
    """toks[k] ends (exclusive index k is the token after) a non-string operand that precedes '+'; return its start index.
       We scan backwards over balanced groups and member chains."""
    i = k - 1
    while i >= 0 and toks[i][0] in ("ws", "comment"): i -= 1
    if i < 0: return k
    n = len(toks)
    # walk back over postfix groups and member names
    while True:
        t = toks[i]
        if t[0] == "punct" and t[1] in (")", "]"):
            depth = 0
            while i >= 0:
                if toks[i][0] == "punct":
                    if toks[i][1] in (")", "]", "}"): depth += 1
                    elif toks[i][1] in ("(", "[", "{"):
                        depth -= 1
                        if depth == 0: break
                i -= 1
            if i < 0: return k
            # is this group a call/index postfix (preceded by id/)/]) or a parenthesized primary?
            p = sig_prev(toks, i)
            if p >= 0 and (toks[p][0] == "id" or (toks[p][0] == "punct" and toks[p][1] in (")", "]"))):
                if toks[p][0] == "id" and toks[p][1] in KEYWORDS_BEFORE_REGEX and toks[p][1] not in ("new",): return i
                i = p; continue
            start = i; break
        if t[0] in ("id", "num", "str", "tpl", "regex"):
            start = i
            p = sig_prev(toks, i)
            if p >= 0 and toks[p][0] == "punct" and toks[p][1] == ".":
                pp = sig_prev(toks, p)
                if pp >= 0 and (toks[pp][0] == "id" or (toks[pp][0] == "punct" and toks[pp][1] in (")", "]"))):
                    i = pp; continue
            break
        return k
    # unary prefixes
    while True:
        p = sig_prev(toks, start)
        if p >= 0 and ((toks[p][0] == "punct" and toks[p][1] in ("!", "~")) or (toks[p][0] == "id" and toks[p][1] in ("typeof", "void"))):
            start = p; continue
        # a leading "-" is unary only if what precedes it is an operator or opener
        if p >= 0 and toks[p][0] == "punct" and toks[p][1] == "-":
            pp = sig_prev(toks, p)
            if pp < 0 or (toks[pp][0] == "punct" and toks[pp][1] in ("(", ",", "=", ":", "?", "[", "{", "+", "-", "*", "/", "return", "&&", "||")):
                start = p; continue
        break
    return start

MUL = ("*", "/", "%")
def mul_right(toks, e):
    """an operand ending at e followed by * / %: absorb the whole product"""
    while True:
        j = sig_next(toks, e - 1)
        if j < len(toks) and toks[j][0] == "punct" and toks[j][1] in MUL:
            s = sig_next(toks, j); e2 = operand_end(toks, s) if s < len(toks) else s
            if e2 == s: break
            e = e2; continue
        break
    return e
def mul_left(toks, s):
    """an operand starting at s preceded by * / %: absorb the whole product"""
    while True:
        j = sig_prev(toks, s)
        if j >= 0 and toks[j][0] == "punct" and toks[j][1] in MUL:
            s2 = operand_start(toks, j)
            if s2 == j: break
            s = s2; continue
        break
    return s

def chain_at(toks, k):
    """the + chain containing the string token k: list of (kind, text/tokens, i0, i1) pieces; kind 'str' or 'expr'"""
    pieces = [("str", k, k + 1)]
    # extend right
    i = k + 1
    while True:
        j = sig_next(toks, i - 1)
        if j >= len(toks) or not (toks[j][0] == "punct" and toks[j][1] == "+"): break
        s = sig_next(toks, j)
        if s >= len(toks): break
        if toks[s][0] == "str":
            e2 = operand_end(toks, s)
            if e2 > s + 1: pieces.append(("expr", s, mul_right(toks, e2))); i = pieces[-1][2]; continue    # "spdf"[i], "abc".length: an expression
            e3 = mul_right(toks, s + 1)
            if e3 > s + 1: pieces.append(("expr", s, e3)); i = e3; continue
            pieces.append(("str", s, s + 1)); i = s + 1; continue
        e = operand_end(toks, s)
        if e == s: break
        e = mul_right(toks, e)
        pieces.append(("expr", s, e)); i = e
    # extend left
    i = k
    while True:
        j = sig_prev(toks, i)
        if j < 0 or not (toks[j][0] == "punct" and toks[j][1] == "+"): break
        # a "+" that is unary (after an operator) ends the chain
        pj = sig_prev(toks, j)
        if pj < 0 or (toks[pj][0] == "punct" and toks[pj][1] in ("(", ",", "=", ":", "?", "[", "{", "+", "-", "*", "/", "&&", "||", "return", ";")): break
        if toks[pj][0] == "str" and operand_end(toks, pj) == pj + 1 and mul_left(toks, pj) == pj: pieces.insert(0, ("str", pj, pj + 1)); i = pj; continue
        s = operand_start(toks, j)
        if s == j: break
        s = mul_left(toks, s)
        pieces.insert(0, ("expr", s, pj + 1)); i = s
    return pieces

# ------------------------------------------------------------------ building templates
TAG_RE = re.compile(r"<(/?)([A-Za-z][A-Za-z0-9]*)([^>]*)>")
ATTR_PROSE = ("title", "aria-label", "placeholder", "alt", "aria-description", "data-tip", "aria-roledescription")

def split_markup(s):
    """split a literal into [('text', t) | ('tag', raw, name, closing)] keeping inline tags as text"""
    out = []; i = 0
    for m in TAG_RE.finditer(s):
        if m.start() > i: out.append(("text", s[i:m.start()]))
        name = m.group(2).lower()
        if name in INLINE_TAGS and name != "br": out.append(("text", m.group(0)))
        else: out.append(("tag", m.group(0), name, bool(m.group(1))))
        i = m.end()
    if i < len(s): out.append(("text", s[i:]))
    return out

NAMED = [(r"cap\(lc\((\w+)\)\)", "El"), (r"lc\((\w+)\)", "el"), (r"nm\((\w+)\)", "Name"), (r"cap\(nm\((\w+)\)\)", "Name"),
         (r"(?:configStr|plainCfg|cfgText)\(.*\)", "cfg"), (r"isoName\(.*\)", "iso"), (r"words\((\w+)\)", "nw"), (r"an\(.*\)", "a_thing"),
         (r"(?:el|E)\((\w+)\)\[1\]", "sym"), (r"(?:el|E)\((\w+)\)\[2\]", "Name"), (r"supNum\(.*\)", "sup"), (r"chargeText\(.*\)", "charge"),
         (r"(?:esc|fmt|String|Math\.round|Math\.abs|sci|N)\(([A-Za-z_$][\w$]*)\b[^)]*\)", None), (r"(?:esc|fmt)\(\s*(?:el|E)\((\w+)\)\[(\d+)\]\s*[^)]*\)", "field")]
def var_name(expr_src, used):
    e = expr_src.strip()
    base = None
    if re.fullmatch(r"[A-Za-z_$][\w$]*", e): base = e
    else:
        for pat, nm in NAMED:
            m = re.fullmatch(pat, e)
            if m:
                base = nm if nm else m.group(1); break
    if base is None and re.fullmatch(r"[A-Za-z_$][\w$]*\.[A-Za-z_$][\w$]*", e): base = e.split(".")[1]
    if base is None:
        m = re.match(r"\(?([A-Za-z_$][\w$]*)", e)
        if m and m.group(1) not in ("Math", "String", "Number", "typeof", "new"): base = m.group(1)
    if not base or base in ("this",): base = "v"
    base = re.sub(r"[^A-Za-z0-9_]", "", base) or "v"
    if base[0].isdigit(): base = "v" + base
    name = base; n = 1
    while name in used: n += 1; name = base + str(n)
    used.add(name)
    return name

ATTR_PAT = re.compile(r"\b(" + "|".join(re.escape(a) for a in ATTR_PROSE) + r")=([\"'])([^\"']*?)\2")
def attr_prose_js(tag_raw):
    """a tag whose title/aria-label/placeholder/alt carry prose -> a JS expression (quoted pieces joined
       with +, the prose through T()) and the keys it uses"""
    keys = []; parts = []; pos = 0
    for m in ATTR_PAT.finditer(tag_raw):
        name, q, val = m.group(1), m.group(2), m.group(3)
        if not (is_prose(val) and "{" not in val): continue
        keys.append(val)
        parts.append(quote(tag_raw[pos:m.start()] + name + "=" + q))
        parts.append("TT(" + quote(val) + ")")
        pos = m.end() - 1          # keep the closing quote in the next piece
    parts.append(quote(tag_raw[pos:]))
    return "+".join(p for p in parts if p != '""'), keys

PLURAL_EXPR = re.compile(r"^\(?\s*(?:Math\.abs\()?([A-Za-z_$][\w$]*)\)?\s*(>1|!==1|!=1)\s*\?\s*\"s\"\s*:\s*\"\"\s*\)?$|^\(?\s*(?:Math\.abs\()?([A-Za-z_$][\w$]*)\)?\s*(===1|==1)\s*\?\s*\"\"\s*:\s*\"s\"\s*\)?$")
def pluralize(tx, vars_):
    """'{n} electron{n2}' with n2 = (n>1?"s":"") -> '{n, plural, one {electron} other {electrons}}'"""
    vmap = dict(vars_)
    changed = True
    while changed:
        changed = False
        for name, expr in list(vmap.items()):
            m = PLURAL_EXPR.match(expr.strip())
            if not m: continue
            cnt = m.group(1) or m.group(3)
            # the count must be a placeholder in the template, or the plain variable itself
            cnt_ph = None
            for n2, e2 in vmap.items():
                if e2.strip() == cnt: cnt_ph = n2; break
            pat = re.compile(r"\{" + (re.escape(cnt_ph) if cnt_ph else "NONE") + r"\}(\s+)([A-Za-z][A-Za-z\-]*)\{" + re.escape(name) + r"\}")
            m2 = pat.search(tx) if cnt_ph else None
            if m2:
                word = m2.group(2)
                tx = tx[:m2.start()] + "{" + cnt_ph + ", plural, one {# " + word + "} other {# " + word + "s}}" + tx[m2.end():]
                del vmap[name]; changed = True; break
            # the word stands without the count beside it: "{n} ... electron{n2}" -> keep count, plural on the word alone
            pat2 = re.compile(r"([A-Za-z][A-Za-z\-]*)\{" + re.escape(name) + r"\}")
            m3 = pat2.search(tx)
            if m3 and (cnt_ph or True):
                word = m3.group(1)
                # need a count placeholder; add one if the variable is not in the template
                if not cnt_ph:
                    cnt_ph = cnt if cnt not in vmap else cnt + "_n"
                    vmap[cnt_ph] = cnt
                tx = tx[:m3.start()] + "{" + cnt_ph + ", plural, one {" + word + "} other {" + word + "s}}" + tx[m3.end():]
                del vmap[name]; changed = True; break
    return tx, [(k, v) for k, v in vmap.items()]

def convert(src, fname="", report=False):
    toks = tokenize(src)
    n = len(toks)
    done = set(); edits = []   # (start, end, replacement)
    keys = []
    off_ranges = []
    for m in re.finditer(r"/\*\s*i18n:off\s*\*/", src):
        e = re.search(r"/\*\s*i18n:on\s*\*/", src[m.end():])
        off_ranges.append((m.start(), m.end() + e.start() if e else len(src)))
    for k, t in enumerate(toks):
        if t[0] != "str" or k in done: continue
        if any(a <= t[2] < b for a, b in off_ranges): continue
        lit = unquote(t[1])
        # a /* i18n:skip */ on the line
        ls = src.rfind("\n", 0, t[2]) + 1; le = src.find("\n", t[3]); le = len(src) if le < 0 else le
        if "i18n:skip" in src[ls:le]: continue
        if skip_context(toks, k): continue
        if operand_end(toks, k) > k + 1: continue          # "spdf"[i]: an expression, not a sentence
        pieces = chain_at(toks, k)
        # every str piece in the chain is handled together
        strs = [p for p in pieces if p[0] == "str"]
        for p in strs: done.add(p[1])
        # does any literal in the chain carry prose, in its text or in a title/aria-label/placeholder?
        def carries(lit):
            if is_prose(lit): return True
            return any(is_prose(m.group(3)) and "{" not in m.group(3) for m in ATTR_PAT.finditer(lit))
        joined = " x ".join(unquote(toks[p[1]][1]) for p in strs)
        if not (any(carries(unquote(toks[p[1]][1])) for p in strs) or is_prose(strip_tags(joined))): continue
        # a chain whose literal pieces are all code-skips (e.g. selectors) is left alone
        if any(skip_context(toks, p[1]) for p in strs): continue
        start = toks[pieces[0][1]][2]; end = toks[pieces[-1][2] - 1][3]
        outer_q = toks[strs[0][1]][1][0]
        # walk the pieces building segments split at block tags
        out_parts = []     # raw JS fragments to join with +
        seg_text = ""; seg_vars = []; used = set(); seg_has_text = False
        def flush():
            nonlocal seg_text, seg_vars, seg_has_text, used
            if seg_text == "" and not seg_vars: return
            tx = seg_text
            if is_prose(re.sub(r"\{\w+\}", " ", tx)) and strip_tags(tx).strip():
                tx, seg_vars = pluralize(tx, seg_vars)
                js = "TT(" + quote(tx)
                if seg_vars: js += ",{" + ",".join(v + ":" + e for v, e in seg_vars) + "}"
                js += ")"
                keys.append(tx); out_parts.append(js)
            else:
                # not prose: emit the pieces as they were
                raw = []
                txt = tx
                # rebuild: replace placeholders with their expressions
                pos = 0
                for v, e in seg_vars:
                    m = txt.find("{" + v + "}", pos)
                    if m < 0: continue
                    if txt[pos:m]: raw.append(quote(txt[pos:m]))
                    raw.append("(" + e + ")")
                    pos = m + len(v) + 2
                if txt[pos:]: raw.append(quote(txt[pos:]))
                out_parts.append("+".join(raw) if raw else quote(""))
            seg_text = ""; seg_vars = []; used = set(); seg_has_text = False
        for kind, a, b in pieces:
            if kind == "str":
                s = unquote(toks[a][1])
                for part in split_markup(s):
                    if part[0] == "text":
                        seg_text += part[1]; seg_has_text = seg_has_text or bool(strip_tags(part[1]).strip())
                    else:
                        flush()
                        js, akeys = attr_prose_js(part[1])
                        keys.extend(akeys)
                        out_parts.append(js)
            else:
                expr = src[toks[a][2]:toks[b-1][3]]
                if '"' in expr or "'" in expr:
                    try: expr = convert(expr)[0]
                    except Exception: pass
                nm = var_name(expr, used)
                seg_text += "{" + nm + "}"; seg_vars.append((nm, expr))
        flush()
        # merge adjacent raw string parts for tidiness
        js = "+".join(out_parts)
        if js != src[start:end]:
            if any(not (end <= s0 or start >= e0) for s0, e0, _ in edits): continue
            edits.append((start, end, js))
    # apply edits back to front
    out = src
    for s, e, r in sorted(edits, key=lambda x: -x[0]):
        out = out[:s] + r + out[e:]
    return out, keys, edits

if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    write = "--write" in sys.argv; report = "--report" in sys.argv
    for f in args:
        src = open(f, encoding="utf-8").read()
        out, keys, edits = convert(src, f, report)
        print(f"{f}: {len(edits)} edits, {len(keys)} keys")
        if report:
            for s, e, r in edits[:400]:
                print("  L%d: %s" % (src.count("\n", 0, s) + 1, r[:160].replace("\n", "\\n")))
        if write:
            open(f + ".prei18n", "w", encoding="utf-8").write(src)
            open(f, "w", encoding="utf-8").write(out)
