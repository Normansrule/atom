#!/usr/bin/env python3
"""i18n_tool.py: the English catalog and the pack checks.

  extract <repo>              every T("...") key in the built app and site, and every
                              data-i block in the site's pages -> <repo>/i18n/en.catalog.json
  check <repo> <pack.js>      a pack against the catalog: missing keys, stale keys,
                              placeholder and tag mismatches, untranslated sentences
  stats <repo>                how many keys and words the catalog holds
  todo <repo> <pack.js> [n]   print the untranslated keys (for writing a pack), n at a time

Keys are exact strings: the text between the quotes of T("..."), unescaped.
"""
import json, os, re, sys, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

T_CALL = re.compile(r'\bTT\(\s*("((?:[^"\\]|\\.)*)"|\'((?:[^\'\\]|\\.)*)\')')
DATA_I = re.compile(r'<([a-z0-9]+)([^>]*\sdata-i(?:=""|(?=[\s>]))[^>]*)>(.*?)</\1>', re.S)
ATTR_I = re.compile(r'data-i-attr="([^"]+)"')

def unescape_js(s):
    return bytes(s, "utf-8").decode("unicode_escape") if "\\u" in s else s.replace('\\"', '"').replace("\\'", "'").replace("\\n", "\n").replace("\\\\", "\\")

def norm(s): return re.sub(r"\s+", " ", s).strip()

def keys_from_js(text):
    out = []
    for m in T_CALL.finditer(text):
        raw = m.group(2) if m.group(2) is not None else m.group(3)
        out.append(unescape_js(raw))
    return out

def keys_from_html(text):
    from i18n_mark_html import serialize_like_dom
    out = []
    for m in DATA_I.finditer(text):
        inner = m.group(3)
        # nested data-i blocks are their own keys; a block with block children is not a key
        if re.search(r"<(p|div|ul|ol|li|h[1-6]|section|table|figure)\b", inner): continue
        out.append(norm(serialize_like_dom(inner)))
    for m in re.finditer(r"<[^>]+\sdata-i-attr=\"([^\"]+)\"[^>]*>", text):
        tag = m.group(0)
        for name in m.group(1).split(","):
            name = name.strip()
            v = re.search(r"\s" + re.escape(name) + r"=\"([^\"]*)\"", tag)
            if v: out.append(norm(html.unescape(v.group(1))))
    return out

def extract(repo):
    files = [("app/atom.html", "app"), ("docs/index.html", "site"), ("docs/teachers.html", "teachers"), ("docs/404.html", "404"),
             ("docs/assets/site.js", "site.js"), ("docs/handout.html", "handout")]
    cat = {}
    for rel, tag in files:
        p = os.path.join(repo, rel)
        if not os.path.exists(p): continue
        text = open(p, encoding="utf-8").read()
        ks = keys_from_js(text) if rel.endswith(".js") else keys_from_js(text) + keys_from_html(text)
        for k in ks:
            if not k.strip(): continue
            e = cat.setdefault(k, {"n": 0, "in": []})
            e["n"] += 1
            if tag not in e["in"]: e["in"].append(tag)
    out = os.path.join(repo, "i18n", "en.catalog.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump({"keys": cat}, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=0, sort_keys=True)
    words = sum(len(re.findall(r"[A-Za-z][A-Za-z'’\-]+", k)) for k in cat)
    print(f"catalog: {len(cat):,} keys, {words:,} words -> {out}")
    return cat

def load_pack(path):
    """read AtomI18N.load("xx", {...}) without a browser"""
    src = open(path, encoding="utf-8").read()
    import subprocess, tempfile
    js = ("var out=null; var AtomI18N={load:function(c,p){ out={code:c,pack:p}; }};\n" + src +
          "\nprocess.stdout.write(JSON.stringify(out));")
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f: f.write(js); tmp = f.name
    r = subprocess.run(["node", tmp], capture_output=True, text=True)
    os.unlink(tmp)
    if r.returncode != 0: sys.exit("pack does not run: " + r.stderr[:400])
    return json.loads(r.stdout)

PH = re.compile(r"\{([A-Za-z_]\w*)(?:\s*,\s*(plural|select)\b)?")
EL_FAMILY = {"el", "El", "the_el", "The_el", "sym", "Z", "Name", "name", "cap"}   # Name, name, cap: an element name the engine resolves to z (elVars), so a pack may answer with any member
def placeholder_names(s):
    """the variable names a template uses: {name}, {name, plural, ...}, {name, select, ...},
    and any placeholder inside a plural/select branch; the words of a branch body are text"""
    names = set(); i = 0; n = len(s)
    def body(j):
        # j is just after an opening brace; return (text, index after the matching brace)
        depth = 1; k = j
        while k < n and depth:
            if s[k] == "{": depth += 1
            elif s[k] == "}": depth -= 1
            k += 1
        return s[j:k-1], k
    while i < n:
        if s[i] != "{": i += 1; continue
        inner, after = body(i + 1)
        m = re.match(r"\s*([A-Za-z_]\w*)\s*(?:,\s*(plural|select)\s*,(.*))?$", inner, re.S)
        if not m: i += 1; continue
        names.add(m.group(1))
        if m.group(2):
            rest = m.group(3); j = 0
            while True:
                b = rest.find("{", j)
                if b < 0: break
                depth = 1; k = b + 1
                while k < len(rest) and depth:
                    if rest[k] == "{": depth += 1
                    elif rest[k] == "}": depth -= 1
                    k += 1
                names |= placeholder_names(rest[b+1:k-1]); j = k
        i = after
    return names

PARTICLES = {"de", "von", "van", "der", "den", "du", "da", "del", "la", "le", "di", "and", "et"}
CITATION = re.compile(r"\((?:1[89]|20)\d\d[a-z]?\)|\(n\.d\.\)|https?://|\bdoi\b")
CODEISH = re.compile(r"^(?:[.#\[]|[a-z-]+\(|[A-Za-z]+/[a-z]|atom-progress-|A1\.|calc:|depth:|\{\w+\}:|IntersectionObserver|translate\(|.*\{\w+\}px\b)")
def prose_words(k):
    """the readable words of a key: tags, entities and placeholders removed"""
    k = re.sub(r"<[^>]+>|&[a-z0-9#]+;|\{[^{}]*\}", " ", k)
    return re.findall(r"[A-Za-z]{3,}", k)
def is_passthrough(k):
    """a catalog key a pack may carry verbatim: a reference, a selector or code, or
    markup and formulas with no sentence in them"""
    return bool(CITATION.search(k) or CODEISH.match(k) or len(prose_words(k)) < 3)

def placeholders(s):
    names = placeholder_names(s)
    # a pack may name the element with any member of the family when the key names it with one
    if names & EL_FAMILY: names = (names - EL_FAMILY) | {"<element>"}
    return sorted(names)
def tags(s): return sorted(re.findall(r"</?([a-z][a-z0-9]*)", s))

def check(repo, pack_path, quiet=False):
    cat = json.load(open(os.path.join(repo, "i18n", "en.catalog.json"), encoding="utf-8"))["keys"]
    pk = load_pack(pack_path); code = pk["code"]; p = pk["pack"]
    t = p.get("t", {}); s = p.get("s", {}); el = p.get("el") or []; g = p.get("g", {})
    problems = []
    missing = [] if code == "en" else [k for k in cat if k not in t]   # English is the key itself; its pack carries only s and g
    stale = [k for k in t if k not in cat]
    for k, v in t.items():
        if not isinstance(v, str) or not v.strip(): problems.append(("empty", k)); continue
        a, b = placeholders(k), placeholders(v)
        if a != b: problems.append(("placeholders", k, a, b))
        if tags(k) != tags(v): problems.append(("tags", k, tags(k), tags(v)))
        # identical to English and reads as a sentence (two or more lowercase words that are not
        # name particles): a name like "Lecoq de Boisbaudran" is not a translation problem
        if code != "en" and v == k and not is_passthrough(k) and len([w for w in prose_words(k) if w[0].islower() and w not in PARTICLES]) >= 2:
            problems.append(("untranslated", k))
        if "{" in v and v.count("{") != v.count("}"): problems.append(("braces", k))
    for k, v in s.items():
        if k not in cat and k not in t: problems.append(("simple-for-unknown-key", k))
        if placeholders(k) != placeholders(v): problems.append(("simple-placeholders", k))
    if code != "en":
        if len(el) != 118: problems.append(("elements", "%d names, need 118" % len(el)))
        elif any(not isinstance(x, str) or not x for x in el): problems.append(("elements", "an empty name"))
        if p.get("art") is not None and len(p["art"]) != 118: problems.append(("articles", "%d, need 118" % len(p["art"])))
    words_done = sum(len(re.findall(r"[A-Za-z][A-Za-z'’\-]+", k)) for k in cat if k in t)
    words_all = sum(len(re.findall(r"[A-Za-z][A-Za-z'’\-]+", k)) for k in cat)
    print(f"{code}: {len(t):,} of {len(cat):,} keys translated ({words_done:,} of {words_all:,} words), {len(s):,} simple variants, {len(g):,} glossary terms")
    print(f"  missing {len(missing):,}, stale {len(stale):,}, problems {len(problems):,}")
    if not quiet:
        for pr in problems[:40]: print("  !", pr[0], repr(pr[1])[:100], *[str(x)[:80] for x in pr[2:]])
        for k in stale[:10]: print("  stale:", repr(k)[:100])
    return missing, stale, problems

def todo(repo, pack_path, n):
    missing, _, _ = check(repo, pack_path, quiet=True)
    for k in missing[:n]: print(json.dumps(k, ensure_ascii=False))

def stats(repo):
    cat = json.load(open(os.path.join(repo, "i18n", "en.catalog.json"), encoding="utf-8"))["keys"]
    words = sum(len(re.findall(r"[A-Za-z][A-Za-z'’\-]+", k)) for k in cat)
    by = {}
    for k, e in cat.items():
        for w in e["in"]: by[w] = by.get(w, 0) + 1
    print(f"{len(cat):,} keys, {words:,} words; by source: {by}")
    long = sorted(cat, key=len, reverse=True)[:3]
    for k in long: print("  longest:", len(k), repr(k[:80]))

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "extract": extract(sys.argv[2])
    elif cmd == "check": check(sys.argv[2], sys.argv[3])
    elif cmd == "stats": stats(sys.argv[2])
    elif cmd == "todo": todo(sys.argv[2], sys.argv[3], int(sys.argv[4]) if len(sys.argv) > 4 else 50)
    else: print(__doc__)
