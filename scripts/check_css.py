#!/usr/bin/env python3
"""check_css.py: every style sheet's braces balance, and nothing is declared outside a rule.

From 1.3.0 to 1.7.0 one stray "}" in docs/assets/site.css closed :root early. The
declarations after it (--veil, color-scheme) and the @supports block after those
were dropped by every browser, without an error anywhere, and the labs' text was
drawn straight onto the moving scene. A browser forgives a style sheet; this does
not. It reads the .css files under docs/assets and the <style> blocks of the pages,
and exits 1 on a "}" with nothing open, a "{" never closed, or a declaration
(name: value;) sitting at the top level.
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

if __name__ == "__main__":
    n = fails = 0
    for name, css in sheets():
        n += 1
        for b in check(name, css): fails += 1; print("FAIL %s: %s" % (name, b))
    print("%d style sheets: %s" % (n, "braces balance and every declaration is inside a rule" if not fails else "%d problems" % fails))
    sys.exit(1 if fails else 0)
