#!/usr/bin/env python3
"""i18n_mark_html.py: mark the prose in a page's markup so AtomI18N.apply()
can translate it: data-i on every element whose content is text (and inline
tags) and reads as prose; data-i-attr="title,aria-label,..." where an
attribute carries prose. Script and style blocks are left alone.

    python3 i18n_mark_html.py page.html [--write]
    from i18n_mark_html import mark; mark(html_text) -> (html_text, keys)
"""
import re, sys, html as H
sys.path.insert(0, __import__("os").path.dirname(__file__))
from i18n_convert import is_prose

INLINE = {"b","i","em","strong","sup","sub","span","code","kbd","a","small","abbr","var","u","s","mark","dfn","time","br","wbr","img","svg","use","path","input"}
SKIP_TAGS = {"script","style","noscript","template","svg","canvas","select","option","datalist","textarea","pre","title","head","meta","link"}
ATTRS = ("title","aria-label","placeholder","alt","aria-description","aria-roledescription")

TAG = re.compile(r"<(/?)([A-Za-z][A-Za-z0-9-]*)((?:\s+[^<>]*?)?)(/?)>", re.S)

def norm(s): return re.sub(r"\s+", " ", s).strip()

def serialize_like_dom(inner):
    """what el.innerHTML would give back for this source: entities decoded, then & < > and nbsp re-escaped in text"""
    out = []; pos = 0
    for m in TAG.finditer(inner):
        text = inner[pos:m.start()]
        out.append(esc_text(text)); out.append(m.group(0)); pos = m.end()
    out.append(esc_text(inner[pos:]))
    return "".join(out)
def esc_text(t):
    t = H.unescape(t)
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\xa0", "&nbsp;")

def mark(src):
    keys = []
    out = []; pos = 0
    # walk the document with a simple tag scanner: for each opening tag of a non-inline,
    # non-skipped element, find its matching close and look at the content
    i = 0; n = len(src)
    skip_until = 0
    result = src
    # collect edits: (start_of_open_tag_end, insertion) and (attr rewrites)
    inserts = []   # (pos, text)
    marked = []    # (start, end) of the content of every marked element
    shadow = []    # (start, end) of rejected blocks whose own text is not prose
    for m in TAG.finditer(src):
        closing, name, attrs, selfclose = m.group(1) == "/", m.group(2).lower(), m.group(3) or "", m.group(4) == "/"
        if m.start() < skip_until: continue
        if not closing and name in ("script", "style", "noscript", "template", "svg", "select", "datalist", "textarea", "pre", "head"):
            end = re.search(r"</" + name + r"\s*>", src[m.end():], re.I)
            skip_until = m.end() + (end.end() if end else 0)
            if name in ("select", "datalist") and end:
                # a menu's options are words the pack translates ("Low", "Medium", "High"); the
                # select itself is skipped so its value attributes stay what the code compares
                for o in re.finditer(r"<option(\s[^<>]*)?>([^<]*)</option>", src[m.end():m.end() + end.start()], re.I):
                    text = norm(H.unescape(o.group(2)))
                    if text and is_prose(text) and "data-i" not in (o.group(1) or ""):
                        inserts.append((m.end() + o.start() + len("<option"), " data-i")); keys.append(text)
            continue
        if closing or selfclose or name in ("br", "wbr", "img", "input", "meta", "link", "hr", "source"):
            # attributes with prose on a self-closing tag (input placeholder, img alt)
            if not closing:
                a = prose_attrs(attrs)
                if a and "data-i-attr" not in attrs: inserts.append((m.start() + 1 + len(name), ' data-i-attr="' + ",".join(a) + '"')); keys.extend(attr_values(attrs, a))
            continue
        # an opening tag: find the matching close by counting same-name tags
        depth = 1; j = m.end()
        for m2 in TAG.finditer(src, m.end()):
            if m2.group(2).lower() != name: continue
            if m2.group(4) == "/": continue
            depth += -1 if m2.group(1) == "/" else 1
            if depth == 0: j = m2.start(); close_end = m2.end(); break
        else:
            continue
        inner = src[m.end():j]
        # attributes with prose on any element
        a = prose_attrs(attrs)
        if a and "data-i-attr" not in attrs: inserts.append((m.start() + 1 + len(name), ' data-i-attr="' + ",".join(a) + '"')); keys.extend(attr_values(attrs, a))
        if name in SKIP_TAGS: continue
        if re.search(r"\sdata-i(?=[\s>]|=\"\")", attrs): continue
        # content must be text plus inline tags only; a picture (svg) is never part of a key
        inner_tags = [t.group(2).lower() for t in TAG.finditer(inner)]
        if any(t not in INLINE for t in inner_tags): continue
        if "<svg" in inner.lower(): continue
        bare = norm(H.unescape(re.sub(r"<[^>]+>", "", inner)))
        text = norm(H.unescape(re.sub(r"<[^>]+>", " ", inner)))
        rejected = (not text or not is_prose(text) or
                    bool(re.fullmatch(r"[\d\s.,+\-−×·%:/()°]+|[A-Z][a-z]?\d*|[\d.]+ ?[a-zA-Z°]{1,4}", text)))
        if rejected:
            # a block with text of its own that is not prose (a reference with a URL, a formula)
            # shadows its inline children: an <i> inside it is not a key on its own
            if name not in INLINE:
                own = norm(H.unescape(re.sub(r"<[^>]+>.*?</[^>]+>|<[^>]+>", "", inner, flags=re.S)))
                if own: shadow.append((m.end(), j))
            continue
        if name in INLINE:
            # an inline element is its own key only when no block above it was marked (a link in a
            # row of links) and no block above it was rejected with text of its own
            if any(a <= m.start() < b for a, b in marked): continue
            if any(a <= m.start() < b for a, b in shadow): continue
        else:
            # a block made only of inline elements with no text of its own (a row of links or buttons): mark the children instead
            own_text = norm(H.unescape(re.sub(r"<[^>]+>.*?</[^>]+>|<[^>]+>", "", inner, flags=re.S)))
            if not own_text and inner_tags and all(t in ("a", "button", "span", "label") for t in inner_tags) and len([t for t in inner_tags if t in ("a", "button")]) > 1: continue
        key = norm(serialize_like_dom(inner))
        keys.append(key)
        inserts.append((m.start() + 1 + len(name), " data-i"))
        marked.append((m.end(), j))
    for p, t in sorted(inserts, key=lambda x: -x[0]):
        result = result[:p] + t + result[p:]
    return result, keys

def prose_attrs(attrs):
    out = []
    for a in ATTRS:
        v = re.search(r"\s" + re.escape(a) + r"=\"([^\"]*)\"", attrs)
        if v and is_prose(H.unescape(v.group(1))): out.append(a)
    return out
def attr_values(attrs, names):
    out = []
    for a in names:
        v = re.search(r"\s" + re.escape(a) + r"=\"([^\"]*)\"", attrs)
        if v: out.append(norm(H.unescape(v.group(1))))
    return out

if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    for f in args:
        src = open(f, encoding="utf-8").read()
        out, keys = mark(src)
        print(f"{f}: {len(keys)} keys")
        if "--report" in sys.argv:
            for k in keys[:300]: print("  ", k[:140])
        if "--write" in sys.argv: open(f, "w", encoding="utf-8").write(out)
