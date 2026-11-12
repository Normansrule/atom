#!/usr/bin/env python3
"""i18n_tool.py: the English catalog, the pack checks, and the pack builder.

  extract <repo>          every TT("...") key in the built app and site, and every data-i
                          block in the pages -> <repo>/i18n/en.catalog.json, with where each
                          key is used (so the site can load its own slice of a pack)
  check <repo> [code...]  each i18n/<code>.json against the catalog: missing and stale keys,
                          placeholders, tags, plural and select structure, untranslated
                          sentences, element names, glossary, meta. Exit 1 on any problem.
  build <repo>            i18n/<code>.json -> the served packs: app/i18n/<code>.js (whole) and
                          docs/assets/i18n/<code>.js, <code>.site.js, <code>.labs.js
  todo <repo> <code> [n]  print the untranslated keys, n at a time
  stats <repo>            how many keys and words the catalog holds
  pseudo <repo> <code>    write i18n/<code>.json as a pseudo-translation of the catalog
                          (longer, accented text) for layout tests; never shipped

A pack's source is JSON that people edit: {"meta", "el", "art", "t": {English: translation},
"s": {English: simpler telling}, "g": {term: {"t", "f", "d", "x"}}}. The served files are
generated, hold data only, and are never executed by this tool. Keys are exact strings: the
text between the quotes of TT("..."), unescaped, or a data-i element's innerHTML with its
whitespace collapsed.
"""
import json, os, re, sys, html, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

DATA_I = re.compile(r'<([a-z0-9]+)([^>]*\sdata-i(?:=""|(?=[\s>]))[^>]*)>(.*?)</\1>', re.S)

def norm(s): return re.sub(r"\s+", " ", s).strip()

# ------------------------------------------------------------------ extraction
ESC = {"n": "\n", "t": "\t", "r": "\r", "b": "\b", "f": "\f", "v": "\v", "0": "\0", "\n": ""}
def unescape_js(raw):
    """a JavaScript string literal's content -> the string it denotes"""
    out = []; i = 0; n = len(raw)
    while i < n:
        c = raw[i]
        if c != "\\": out.append(c); i += 1; continue
        i += 1
        if i >= n: break
        c = raw[i]
        if c == "u" and i + 4 < n + 0 and re.fullmatch(r"[0-9a-fA-F]{4}", raw[i+1:i+5] or ""): out.append(chr(int(raw[i+1:i+5], 16))); i += 5
        elif c == "x" and re.fullmatch(r"[0-9a-fA-F]{2}", raw[i+1:i+3] or ""): out.append(chr(int(raw[i+1:i+3], 16))); i += 3
        else: out.append(ESC.get(c, c)); i += 1
    return "".join(out)

TT_OPEN = re.compile(r'(?<![\w$.])TT\(')
STR = re.compile(r'\s*(?:"((?:[^"\\\n]|\\.)*)"|\'((?:[^\'\\\n]|\\.)*)\')\s*([,)])', re.S)
def keys_from_js(text, unreadable=None):
    """every TT("literal", ...) or TT("literal"); a TT( whose first argument is anything else
    (a variable, a concatenation, a template literal) cannot be cataloged and is reported"""
    out = []
    for m in TT_OPEN.finditer(text):
        s = STR.match(text, m.end())
        if not s:
            if unreadable is not None: unreadable.append(text[m.start():m.start() + 90].replace("\n", " "))
            continue
        out.append(unescape_js(s.group(1) if s.group(1) is not None else s.group(2)))
    return out

def keys_from_html(text, problems=None):
    from i18n_mark_html import serialize_like_dom
    out = []
    for m in DATA_I.finditer(text):
        name, inner = m.group(1), m.group(3)
        # nested data-i blocks are their own keys; a block with block children is not a key
        if re.search(r"<(p|div|ul|ol|li|h[1-6]|section|table|figure)\b", inner): continue
        # the pattern stops at the first closing tag of the same name: a same-name child would cut the key short
        if problems is not None and re.search(r"<" + name + r"[\s>]", inner): problems.append("data-i <%s> holds another <%s>: %s" % (name, name, norm(inner)[:70]))
        ctx = re.search(r'\sdata-i-ctx="([^"]+)"', m.group(2))
        out.append(norm(serialize_like_dom(inner)) + (" [[" + ctx.group(1) + "]]" if ctx else ""))
    for m in re.finditer(r"<[^>]+\sdata-i-attr=\"([^\"]+)\"[^>]*>", text):
        tag = m.group(0)
        for name in m.group(1).split(","):
            name = name.strip()
            v = re.search(r"\s" + re.escape(name) + r"=\"([^\"]*)\"", tag)
            if v: out.append(norm(html.unescape(v.group(1))))
            elif problems is not None: problems.append("data-i-attr names %s but the tag has none: %s" % (name, tag[:70]))
    return out

def fnv(key, salt=0):
    """the engine's hash (i18n.js hk): FNV-1a over UTF-16 code units, 32 bits, base 36"""
    h = (0x811c9dc5 ^ salt) & 0xFFFFFFFF
    b = key.encode("utf-16-le")
    for i in range(0, len(b), 2):
        h ^= b[i] | (b[i+1] << 8)
        h = (h * 0x01000193) & 0xFFFFFFFF
    digits = "0123456789abcdefghijklmnopqrstuvwxyz"; s = ""
    if h == 0: return "0"
    while h: s = digits[h % 36] + s; h //= 36
    return s

# where a key is used decides which served slice carries it
SOURCES = [("app/atom.html", "app"), ("docs/index.html", "site"), ("docs/teachers.html", "teachers"), ("docs/404.html", "404"),
           ("docs/assets/site.js", "site.js"), ("docs/handout.html", "handout")]
SITE_PARTS = ["docs/assets/atom-i18n.js", "docs/assets/atom-data.js", "docs/assets/atom-engines.js", "docs/assets/atom-ptable.js"]
LABS_PART = "docs/assets/atom-labs.js"

def extract(repo):
    cat = {}; unreadable = []; problems = []
    def read(rel):
        p = os.path.join(repo, rel)
        return open(p, encoding="utf-8").read() if os.path.exists(p) else ""
    for rel, tag in SOURCES:
        text = read(rel)
        if not text: continue
        bad = []
        ks = keys_from_js(text, bad) if rel.endswith(".js") else keys_from_js(text, bad) + keys_from_html(text, problems)
        unreadable += ["%s: %s" % (rel, b) for b in bad]
        for k in ks:
            if not k.strip(): continue
            e = cat.setdefault(k, {"n": 0, "in": []})
            e["n"] += 1
            if tag not in e["in"]: e["in"].append(tag)
    site = set(); labs = set()
    for rel in SITE_PARTS: site |= set(keys_from_js(read(rel)))
    labs |= set(keys_from_js(read(LABS_PART)))
    for k, e in cat.items():
        if k in site or any(t != "app" for t in e["in"]): e["slice"] = "site"
        elif k in labs: e["slice"] = "labs"
        else: e["slice"] = "app"
    for k in cat:
        if k != k.strip(): problems.append("a key begins or ends with a space (keep the space in the code, outside TT): %r" % k[:70])
    if unreadable or problems:
        for u in unreadable[:30]: print("  cannot catalog:", u)
        for p in problems[:30]: print("  markup:", p)
        sys.exit("extract: %d TT() calls without a plain string and %d markup problems; a sentence that is not a literal cannot be translated" % (len(unreadable), len(problems)))
    salt = 0
    while len({fnv(k, salt) for k in cat}) != len(cat): salt += 1
    out = os.path.join(repo, "i18n", "en.catalog.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump({"salt": salt, "keys": cat}, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=0, sort_keys=True)
    words = sum(len(re.findall(r"[A-Za-z][A-Za-z'’\-]+", k)) for k in cat)
    by = {}
    for e in cat.values(): by[e["slice"]] = by.get(e["slice"], 0) + 1
    print(f"catalog: {len(cat):,} keys, {words:,} words, slices {by}, salt {salt} -> {out}")
    return cat

def catalog(repo):
    d = json.load(open(os.path.join(repo, "i18n", "en.catalog.json"), encoding="utf-8"))
    return d["keys"], d.get("salt", 0)

# ------------------------------------------------------------------ packs
def pack_path(repo, code): return os.path.join(repo, "i18n", code + ".json")
def pack_codes(repo): return sorted(os.path.basename(p)[:-5] for p in glob.glob(os.path.join(repo, "i18n", "*.json")) if not p.endswith(".catalog.json"))
def load_pack(repo, code): return json.load(open(pack_path(repo, code), encoding="utf-8"))
def save_pack(repo, code, p):
    order = ["meta", "el", "art", "forms", "t", "s", "g"]
    q = {k: p[k] for k in order if k in p}
    for k in ("t", "s"):
        if k in q: q[k] = dict(sorted(q[k].items()))
    json.dump(q, open(pack_path(repo, code), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    open(pack_path(repo, code), "a", encoding="utf-8").write("\n")

EL_FAMILY = {"el", "El", "the_el", "The_el", "sym", "Z", "Name", "name", "cap", "E"}   # an element named any of these ways may be answered with any other (elVars)

def icu_blocks(s):
    """every {var}, {var, plural, ...} and {var, select, ...} in a template, nested ones included:
    yields (name, kind or None, {option: body})"""
    out = []; i = 0; n = len(s)
    while i < n:
        if s[i] != "{": i += 1; continue
        depth = 1; k = i + 1
        while k < n and depth:
            if s[k] == "{": depth += 1
            elif s[k] == "}": depth -= 1
            k += 1
        inner = s[i+1:k-1]
        m = re.match(r"\s*([A-Za-z_]\w*)\s*(?:,\s*(plural|select)\s*,(.*))?$", inner, re.S)
        if not m: i += 1; continue
        if not m.group(2): out.append((m.group(1), None, {}))
        else:
            rest = m.group(3); opts = {}; j = 0
            while True:
                mm = re.compile(r"\s*([^\s{}]+)\s*\{").match(rest, j)
                if not mm: break
                b = mm.end(); d = 1; q = b
                while q < len(rest) and d:
                    if rest[q] == "{": d += 1
                    elif rest[q] == "}": d -= 1
                    q += 1
                opts[mm.group(1)] = rest[b:q-1]; j = q
                out += icu_blocks(rest[b:q-1])
            out.append((m.group(1), m.group(2), opts))
        i = k
    return out

def placeholder_names(s): return {b[0] for b in icu_blocks(s)}
def placeholders(s):
    names = placeholder_names(s)
    fam = {n for n in names if n in EL_FAMILY or n.startswith("el_")}
    if fam: names = (names - fam) | {"<element>"}
    return sorted(names)

TAG = re.compile(r"<(/?)([A-Za-z][A-Za-z0-9]*)((?:\s[^<>]*)?)>")
FREE = re.compile(r'\s(?:title|alt|aria-label|data-el)="[^"]*"')   # the attributes a translator may change (data-el: which form of the element's name a slot takes)
VOID = {"br", "wbr", "img", "input", "hr"}
def flat_other(s):
    """a template with every plural and select replaced by its "other" branch: the markup a reader
    gets whichever branch is taken, so a language with more plural forms than English is not
    counted as having more tags"""
    out = []; i = 0; n = len(s)
    while i < n:
        if s[i] != "{": out.append(s[i]); i += 1; continue
        depth = 1; k = i + 1
        while k < n and depth:
            if s[k] == "{": depth += 1
            elif s[k] == "}": depth -= 1
            k += 1
        inner = s[i+1:k-1]
        m = re.match(r"\s*([A-Za-z_]\w*)\s*,\s*(plural|select)\s*,(.*)$", inner, re.S)
        if not m: out.append(s[i:k]); i = k; continue
        opts = dict((o, b) for _, kind, od in [icu_blocks(s[i:k])[-1]] for o, b in od.items())
        out.append(flat_other(opts.get("other", ""))); i = k
    return "".join(out)
def tags(s): return sorted((m.group(1), m.group(2).lower(), FREE.sub("", m.group(3)).strip().rstrip("/").strip()) for m in TAG.finditer(flat_other(s)))
def unbalanced(s):
    stack = []
    for m in TAG.finditer(s):
        name = m.group(2).lower()
        if name in VOID or m.group(3).rstrip().endswith("/"): continue
        if not m.group(1): stack.append(name)
        elif not stack or stack.pop() != name: return True
    return bool(stack)
def key_unbalanced(k): return unbalanced(k)

# the plural categories a language's whole numbers use, besides "other" (CLDR cardinals);
# NEED lists the ones a translation of a plural must not leave out
PLURAL = {"en": {"one"}, "es": {"one", "many"}, "fr": {"one", "many"}, "pt": {"one", "many"}, "it": {"one", "many"}, "de": {"one"},
          "ru": {"one", "few", "many"}, "ar": {"zero", "one", "two", "few", "many"}, "hi": {"one"}, "bn": {"one"}, "ur": {"one"},
          "tr": {"one"}, "ta": {"one"}, "te": {"one"}, "mr": {"one"}, "sw": {"one"}, "id": set(), "ja": set(), "ko": set(), "zh": set(), "vi": set()}
NEED = {"ru": {"one", "few", "many"}, "ar": {"zero", "one", "two", "few", "many"}}
def icu_problems(code, k, v):
    out = []
    for name, kind, opts in icu_blocks(v):
        if not kind: continue
        if "other" not in opts: out.append(("no-other-branch", k, name))
        elif any(tags(b) != tags(opts["other"]) for b in opts.values()): out.append(("branch-tags", k, name))   # every branch carries the same markup
        if kind == "plural":
            bad = [o for o in opts if o != "other" and not re.fullmatch(r"=\d+", o) and o not in PLURAL.get(code, {"one"})]
            if bad: out.append(("plural-category", k, name, bad))
            need = NEED.get(code, set()) - set(opts)
            if need: out.append(("plural-missing", k, name, sorted(need)))
    return out

PARTICLES = {"de", "von", "van", "der", "den", "du", "da", "del", "la", "le", "di", "and", "et"}
CITATION = re.compile(r"\((?:1[89]|20)\d\d[a-z]?\)|\(n\.d\.\)|https?://|\bdoi\b")
CODEISH = re.compile(r"^(?:[.#\[]|[a-z-]+\(|[A-Za-z]+/[a-z]|atom-progress-|A\d\.|calc:|\{\w+\}:)")
def prose_words(k):
    """the readable words of a key: tags, entities and placeholders removed"""
    k = re.sub(r"<[^>]+>|&[a-z0-9#]+;|\{[^{}]*\}", " ", k)
    return re.findall(r"[A-Za-z]{3,}", k)
def is_passthrough(k):
    """a catalog key a pack may carry verbatim: a reference, a selector or code, or
    markup and formulas with no sentence in them"""
    return bool(CITATION.search(k) or CODEISH.match(k) or len(prose_words(k)) < 3)

TAGRX = re.compile(r"^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$")
def check(repo, code, quiet=False):
    cat, _ = catalog(repo)
    p = load_pack(repo, code)
    t = p.get("t", {}); s = p.get("s", {}); el = p.get("el") or []; g = p.get("g", {}); meta = p.get("meta") or {}
    problems = []
    if code != "en" and not t: problems.append(("no-translations", code))
    missing = [] if code == "en" else [k for k in cat if k not in t]   # English is the key itself; its pack carries only s and g
    stale = [k for k in t if k not in cat] + [k for k in s if k not in cat]
    for k, v in t.items():
        if k not in cat: continue
        if not isinstance(v, str) or not v.strip(): problems.append(("empty", k)); continue
        a, b = placeholders(k), placeholders(v)
        if a != b: problems.append(("placeholders", k, a, b))
        if tags(k) != tags(v): problems.append(("tags", k, [x for x in tags(k) if x not in tags(v)], [x for x in tags(v) if x not in tags(k)]))
        elif unbalanced(v) and not unbalanced(k): problems.append(("tag-not-closed", k))
        if v.count("{") != v.count("}"): problems.append(("braces", k))
        problems += icu_problems(code, k, v)
        # identical to English and reads as a sentence (two or more lowercase words that are not
        # name particles): a name like "Lecoq de Boisbaudran" is not a translation problem
        if code != "en" and v == k and not is_passthrough(k) and len([w for w in prose_words(k) if w[0].islower() and w not in PARTICLES]) >= 2:
            problems.append(("untranslated", k))
    for k, v in s.items():
        if k not in cat: continue
        if not isinstance(v, str) or not v.strip(): problems.append(("simple-empty", k)); continue
        if placeholders(k) != placeholders(v): problems.append(("simple-placeholders", k, placeholders(k), placeholders(v)))
        if tags(k) != tags(v): problems.append(("simple-tags", k))
        elif unbalanced(v) and not unbalanced(k): problems.append(("simple-tag-not-closed", k))
        problems += icu_problems(code, k, v)
    for k, e in g.items():
        if not isinstance(e, dict) or not isinstance(e.get("t"), str) or not e["t"].strip() or not isinstance(e.get("d"), str) or not e["d"].strip():
            problems.append(("glossary-entry", k)); continue
        f = e.get("f", [])
        if not isinstance(f, list) or any(not isinstance(x, str) or not x.strip() for x in f): problems.append(("glossary-forms", k)); continue
        # x: the forms spelled one way only. A unit symbol is one (MeV is not meV, pm is not Pm),
        # so anything of three characters or fewer belongs there, not among the forms matched in any case
        x = e.get("x", [])
        if not isinstance(x, list) or any(not isinstance(y, str) or not y.strip() for y in x): problems.append(("glossary-exact", k)); continue
        short = [y for y in f if len(y) <= 3]
        if short: problems.append(("glossary-short-form-not-exact", k, short))
    if meta.get("dir", "ltr") not in ("ltr", "rtl"): problems.append(("meta-dir", meta.get("dir")))
    for fld in ("locale", "voice"):
        if fld in meta and not TAGRX.match(str(meta[fld])): problems.append(("meta-" + fld, meta[fld]))
    if code != "en":
        if not meta.get("name"): problems.append(("meta-name", code))
        if len(el) != 118: problems.append(("elements", "%d names, need 118" % len(el)))
        elif any(not isinstance(x, str) or not x.strip() for x in el): problems.append(("elements", "an empty name"))
        elif len(set(el)) != 118: problems.append(("elements", "a name is used twice"))
        if p.get("art") is not None and len(p["art"]) != 118: problems.append(("articles", "%d, need 118" % len(p["art"])))
        for fk, fv in (p.get("forms") or {}).items():
            if not isinstance(fv, list) or len(fv) != 118: problems.append(("forms", fk))
    words_done = sum(len(re.findall(r"[A-Za-z][A-Za-z'’\-]+", k)) for k in cat if k in t)
    words_all = sum(len(re.findall(r"[A-Za-z][A-Za-z'’\-]+", k)) for k in cat)
    print(f"{code}: {len([k for k in t if k in cat]):,} of {len(cat):,} keys translated ({words_done:,} of {words_all:,} words), {len(s):,} simple variants, {len(g):,} glossary terms")
    print(f"  missing {len(missing):,}, stale {len(stale):,}, problems {len(problems):,}")
    if not quiet:
        for pr in problems[:60]: print("  !", pr[0], repr(pr[1])[:100], *[str(x)[:90] for x in pr[2:]])
        for k in stale[:10]: print("  stale:", repr(k)[:100])
        for k in missing[:10]: print("  missing:", repr(k)[:100])
    return missing, stale, problems

# ------------------------------------------------------------------ the served files
HEAD = "/* Atom language pack ({code}{part}). Generated by scripts/i18n/i18n_tool.py build from i18n/{code}.json; edit that file, not this one. */\n"
def served(code, obj, part=""):
    return HEAD.format(code=code, part=(", " + part) if part else "") + 'AtomI18N.load("' + code + '",' + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + ");\n"

def build(repo, out_app=None, out_site=None):
    cat, salt = catalog(repo)
    out_app = out_app or os.path.join(repo, "app", "i18n"); out_site = out_site or os.path.join(repo, "docs", "assets", "i18n")
    os.makedirs(out_app, exist_ok=True); os.makedirs(out_site, exist_ok=True)
    en_g = load_pack(repo, "en").get("g", {}) if os.path.exists(pack_path(repo, "en")) else {}
    made_app = set(); made_site = set(); report = []
    for code in pack_codes(repo):
        p = load_pack(repo, code)
        meta = dict(p.get("meta") or {}); meta["salt"] = salt
        def hashed(table, slices, zero_same):
            o = {}
            for k, v in (table or {}).items():
                if k not in cat or cat[k]["slice"] not in slices: continue
                o[fnv(k, salt)] = 0 if (zero_same and v == k) else v
            return dict(sorted(o.items()))
        g = {}
        for k, e in (p.get("g") or {}).items():
            ge = {"t": e["t"], "f": e.get("f", []), "d": e["d"]}
            if e.get("x"): ge["x"] = e["x"]
            if code != "en": ge["en"] = (en_g.get(k) or {}).get("t", k)
            g[k] = ge
        base = {"meta": meta}
        for fld in ("el", "art", "forms"):
            if p.get(fld): base[fld] = p[fld]
        ALL = ("site", "labs", "app")
        whole = dict(base); whole["t"] = hashed(p.get("t"), ALL, True); whole["s"] = hashed(p.get("s"), ALL, False); whole["g"] = g
        if code == "en": whole.pop("t")
        site = dict(base); site["slice"] = "site"; site["t"] = hashed(p.get("t"), ("site",), True); site["s"] = hashed(p.get("s"), ("site",), False)
        labs = {"slice": "labs", "t": hashed(p.get("t"), ("labs",), True), "s": hashed(p.get("s"), ("labs",), False), "g": g}
        if code == "en": site.pop("t"); labs.pop("t")
        files = [(out_app, code + ".js", served(code, whole)), (out_site, code + ".js", served(code, whole)),
                 (out_site, code + ".site.js", served(code, site, "site")), (out_site, code + ".labs.js", served(code, labs, "labs"))]
        for d, name, text in files:
            open(os.path.join(d, name), "w", encoding="utf-8").write(text)
            (made_app if d == out_app else made_site).add(name)
        report.append("%s: whole %d KB, site %d KB, labs %d KB" % (code, len(files[0][2].encode()) // 1024, len(files[2][2].encode()) // 1024, len(files[3][2].encode()) // 1024))
    for d, made in ((out_app, made_app), (out_site, made_site)):
        for f in os.listdir(d):
            if f.endswith(".js") and f not in made: os.remove(os.path.join(d, f))
    print("built: " + "; ".join(report))

# ------------------------------------------------------------------ helpers for writing packs
def todo(repo, code, n):
    missing, _, _ = check(repo, code, quiet=True)
    for k in missing[:n]: print(json.dumps(k, ensure_ascii=False))

def stats(repo):
    cat, salt = catalog(repo)
    words = sum(len(re.findall(r"[A-Za-z][A-Za-z'’\-]+", k)) for k in cat)
    by = {}
    for k, e in cat.items(): by[e["slice"]] = by.get(e["slice"], 0) + 1
    print(f"{len(cat):,} keys, {words:,} words; by slice: {by}; salt {salt}")
    for k in sorted(cat, key=len, reverse=True)[:3]: print("  longest:", len(k), repr(k[:80]))

ACCENT = str.maketrans("aeiouAEIOUcnyCNY", "áéíóúÁÉÍÓÚçñýÇÑÝ")
def pseudo_text(s):
    """the same sentence, accented and about a third longer, with every placeholder, tag,
    entity, and plural/select keyword left exactly as it was"""
    out = []; i = 0; n = len(s)
    def words(t):
        t = t.translate(ACCENT)
        return re.sub(r"([^\W\d_]{4,})", lambda m: m.group(1) + m.group(1)[-1] * max(1, len(m.group(1)) // 3), t)
    while i < n:
        c = s[i]
        if c == "<":
            j = s.find(">", i); j = n - 1 if j < 0 else j
            out.append(s[i:j+1]); i = j + 1
        elif c == "&":
            m = re.match(r"&[a-zA-Z0-9#]+;", s[i:])
            if m: out.append(m.group(0)); i += len(m.group(0))
            else: out.append(c); i += 1
        elif c == "{":
            depth = 1; k = i + 1
            while k < n and depth:
                if s[k] == "{": depth += 1
                elif s[k] == "}": depth -= 1
                k += 1
            inner = s[i+1:k-1]
            m = re.match(r"(\s*[A-Za-z_]\w*\s*,\s*(?:plural|select)\s*,)(.*)$", inner, re.S)
            if not m: out.append(s[i:k])
            else:
                rest = m.group(2); res = [m.group(1)]; j = 0
                while True:
                    mm = re.compile(r"(\s*[^\s{}]+\s*)\{").match(rest, j)
                    if not mm: res.append(rest[j:]); break
                    b = mm.end(); d = 1; q = b
                    while q < len(rest) and d:
                        if rest[q] == "{": d += 1
                        elif rest[q] == "}": d -= 1
                        q += 1
                    res.append(mm.group(1) + "{" + pseudo_text(rest[b:q-1]) + "}"); j = q
                out.append("{" + "".join(res) + "}")
            i = k
        else:
            j = i
            while j < n and s[j] not in "<&{": j += 1
            out.append(words(s[i:j])); i = j
    return "".join(out)

def pseudo(repo, code):
    cat, _ = catalog(repo)
    src = load_pack(repo, "es") if os.path.exists(pack_path(repo, "es")) else {}
    p = {"meta": dict(src.get("meta") or {"name": "Pseudo", "dir": "ltr", "script": "latin"}), "el": src.get("el"), "art": src.get("art"),
         "t": {k: (k if is_passthrough(k) else pseudo_text(k)) for k in cat}, "s": {}, "g": src.get("g", {})}
    p["meta"]["name"] = "Pseudo"
    save_pack(repo, code, p)
    print("pseudo pack written:", pack_path(repo, code))

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "extract": extract(sys.argv[2])
    elif cmd == "check":
        repo = sys.argv[2]; codes = sys.argv[3:] or pack_codes(repo); bad = 0
        for c in codes:
            c = os.path.basename(c).replace(".json", "").replace(".js", "")
            m, s, pr = check(repo, c); bad += len(m) + len(s) + len(pr)
        sys.exit(1 if bad else 0)
    elif cmd == "build": build(sys.argv[2], *(sys.argv[3:5]))
    elif cmd == "stats": stats(sys.argv[2])
    elif cmd == "todo": todo(sys.argv[2], sys.argv[3], int(sys.argv[4]) if len(sys.argv) > 4 else 50)
    elif cmd == "pseudo": pseudo(sys.argv[2], sys.argv[3])
    else: print(__doc__)
