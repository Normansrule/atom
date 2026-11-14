#!/usr/bin/env python3
"""check_css.py: every style sheet's braces balance, and nothing is declared outside a rule.

From 1.3.0 to 1.7.0 one stray "}" in docs/assets/site.css closed :root early. The
declarations after it (--veil, color-scheme) and the @supports block after those
were dropped by every browser, without an error anywhere, and the labs' text was
drawn straight onto the moving scene. A browser forgives a style sheet; this does
not. It reads the .css files under docs/assets and the <style> blocks of the pages,
and exits 1 on a "}" with nothing open, a "{" never closed, or a declaration
(name: value;) sitting at the top level.

It also holds one rule the sheets were written to: Safari before 16.2 has no
color-mix(), and drops a declaration that uses it. So every such declaration
needs a plain one for the same property before it in the same rule, and a custom
property that mixes needs a plain value inside an "@supports not (color:
color-mix(...))" block. Without that, an older iPad shows nothing where the
color should be.
"""
import glob, os, re, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def sheets():
    for p in sorted(glob.glob(os.path.join(HERE, "docs", "assets", "*.css"))):
        yield os.path.relpath(p, HERE), open(p, encoding="utf-8").read()
    for p in sorted(glob.glob(os.path.join(HERE, "docs", "*.html"))) + [os.path.join(HERE, "app", "atom.html")]:
        if not os.path.exists(p): continue
        for i, m in enumerate(re.finditer(r"<style[^>]*>(.*?)</style>", open(p, encoding="utf-8").read(), re.S)):
            yield "%s <style> %d" % (os.path.relpath(p, HERE), i + 1), m.group(1)

def check(name, css):
    bad = []
    css = re.sub(r"/\*.*?\*/", lambda m: re.sub(r"[^\n]", " ", m.group(0)), css, flags=re.S)       # comments, keeping line numbers
    css = re.sub(r"\"(?:\\.|[^\"\\\n])*\"|'(?:\\.|[^'\\\n])*'", lambda m: '"' + " " * (len(m.group(0)) - 2) + '"', css)
    css = re.sub(r"url\([^)]*\)", lambda m: "url(" + " " * (len(m.group(0)) - 5) + ")", css)
    depth, top = 0, []          # top: the text seen at depth 0 since the last rule ended
    line = 1
    for ch in css:
        if ch == "\n": line += 1
        if ch == "{":
            if depth == 0:
                head = "".join(top).strip()
                if ";" in head and not head.startswith("@"):      # "--veil:...; color-scheme:dark;" then a brace
                    bad.append("line %d: a declaration outside any rule: %r" % (line, head[:70]))
                top = []
            depth += 1
        elif ch == "}":
            if depth == 0: bad.append("line %d: a \"}\" with nothing open" % line); top = []
            else:
                depth -= 1
                if depth == 0: top = []
        elif depth == 0:
            top.append(ch)
            if ch == ";":
                head = "".join(top).strip()
                if not head.startswith("@"): bad.append("line %d: a declaration outside any rule: %r" % (line, head[:70]))
                top = []
    if depth: bad.append("%d \"{\" never closed" % depth)
    return bad

def fallbacks(name, css):
    """Every color-mix() has something an older Safari can use instead."""
    bad = []
    css = re.sub(r"/\*.*?\*/", lambda m: re.sub(r"[^\n]", " ", m.group(0)), css, flags=re.S)
    plain = set()               # custom properties given a plain value where color-mix() is not supported
    for m in re.finditer(r"@supports\s+not\s*\(\s*color\s*:\s*color-mix", css):
        i = css.find("{", m.end()); depth, j = 1, i + 1
        while j < len(css) and depth: depth += {"{": 1, "}": -1}.get(css[j], 0); j += 1
        plain.update(re.findall(r"(--[\w-]+)\s*:", css[i:j]))
    for m in re.finditer(r"([^{}]*)\{([^{}]*)\}", css):
        decls = [d.strip() for d in m.group(2).split(";") if ":" in d]
        for k, d in enumerate(decls):
            if "color-mix(" not in d: continue
            prop = d.split(":", 1)[0].strip()
            ok = prop in plain if prop.startswith("--") else any(e.split(":", 1)[0].strip() == prop and "color-mix(" not in e for e in decls[:k])
            if not ok: bad.append("line %d: %s uses color-mix() in %r with no plain value before it" % (css.count("\n", 0, m.start(2)) + 1, prop, " ".join(m.group(1).split())[-50:]))
    return bad

if __name__ == "__main__":
    n = fails = mixes = 0
    for name, css in sheets():
        n += 1; mixes += css.count("color-mix(")
        for b in check(name, css) + fallbacks(name, css): fails += 1; print("FAIL %s: %s" % (name, b))
    print("%d style sheets: %s" % (n, "braces balance, every declaration is inside a rule, and every color-mix() has a plain fallback" if not fails else "%d problems" % fails))
    sys.exit(1 if fails else 0)
