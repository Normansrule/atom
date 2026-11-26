#!/usr/bin/env python3
"""check_csp.py: every page's Content-Security-Policy still says what the README says it says.

Atom's promise is that nothing leaves the device and nothing foreign runs on the page. The browser enforces
that from one <meta> line per page, and a line like that is easy to loosen by accident. This reads the five
pages and exits 1 unless each one:

  - has a policy, with connect-src 'none' (no request can leave), object-src 'none' or default-src 'none',
    base-uri and form-action locked, and no 'unsafe-eval' anywhere;
  - allows no inline script except by hash: script-src has no 'unsafe-inline', and every inline <script> in
    the page is named there by its SHA-256 (so the page's own scripts run and an injected one cannot);
  - has no inline event handler (onclick= and the like) and no javascript: link in its markup;
  - loads no script, style sheet, image, font, or frame from another site;
  - sends no referrer with a link out.
"""
import base64, hashlib, os, re, sys
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = ["docs/index.html", "docs/teachers.html", "docs/handout.html", "docs/404.html", "app/atom.html", "docs/app/index.html"]

def policy(html):
    m = re.search(r'<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"', html, re.S)
    if not m: return None
    out = {}
    for part in m.group(1).split(";"):
        w = part.split()
        if w: out[w[0]] = w[1:]
    return out

def check(rel):
    bad = []; html = open(os.path.join(HERE, rel), encoding="utf-8").read()
    p = policy(html)
    if p is None: return ["no Content-Security-Policy"]
    def src(name): return p.get(name, p.get("default-src", []))
    if p.get("connect-src") != ["'none'"]: bad.append("connect-src is %s, not 'none'" % " ".join(p.get("connect-src", ["missing"])))
    if src("object-src") != ["'none'"]: bad.append("plugins are not refused (object-src)")
    if p.get("base-uri") not in (["'none'"], ["'self'"]): bad.append("base-uri is not locked")
    if p.get("form-action") != ["'none'"]: bad.append("form-action is not 'none'")
    if any("'unsafe-eval'" in v for v in p.values()): bad.append("'unsafe-eval' is allowed")
    ss = src("script-src")
    if "'unsafe-inline'" in ss: bad.append("script-src allows 'unsafe-inline'")
    if any(x in ("*", "https:", "http:", "data:", "blob:") for x in ss): bad.append("script-src allows a whole scheme: %s" % " ".join(ss))
    for name, v in p.items():
        for x in v:
            if re.match(r"(https?:)?//|\*", x) or (re.match(r"[a-z0-9.-]+\.[a-z]{2,}", x) and not x.startswith("'")): bad.append("%s names another site: %s" % (name, x))
    body = re.sub(r"<!--.*?-->", "", html, flags=re.S)
    inline = re.findall(r"<script(?![^>]*\ssrc=)[^>]*>(.*?)</script>", body, re.S)
    for i, text in enumerate(inline):
        h = "'sha256-%s'" % base64.b64encode(hashlib.sha256(text.encode("utf-8")).digest()).decode()
        if h not in ss: bad.append("inline script %d (%d bytes) is not named in script-src by its hash %s" % (i + 1, len(text), h))
    for h in ss:
        if h.startswith("'sha256-") and not any(h == "'sha256-%s'" % base64.b64encode(hashlib.sha256(t.encode("utf-8")).digest()).decode() for t in inline):
            bad.append("script-src names a hash no script in the page has: %s" % h)
    markup = re.sub(r"<script[^>]*>.*?</script>|<style[^>]*>.*?</style>", "", body, flags=re.S)
    on = re.findall(r"<[a-zA-Z][^>]*\s(on[a-z]+)\s*=", markup)
    if on: bad.append("inline event handlers in the markup: %s" % ", ".join(sorted(set(on))[:5]))
    if re.search(r"""(?:href|src|action)\s*=\s*["']?\s*javascript:""", markup, re.I): bad.append("a javascript: link")
    for tag, attr in (("script", "src"), ("link", "href"), ("img", "src"), ("iframe", "src"), ("source", "src"), ("video", "src"), ("audio", "src"), ("object", "data"), ("embed", "src")):
        for m in re.finditer(r"<%s\b[^>]*\s%s\s*=\s*[\"']?((?:https?:)?//[^\"'\s>]+)" % (tag, attr), markup, re.I):
            if tag == "link" and not re.search(r'rel\s*=\s*["\']?(?:stylesheet|preload|modulepreload|icon|manifest|apple-touch-icon)', m.group(0), re.I): continue   # a canonical or alternate link is an address, not a load
            bad.append("<%s> loads from another site: %s" % (tag, m.group(1)[:80]))
    if not re.search(r'<meta\s+name="referrer"\s+content="no-referrer"', html): bad.append("no <meta name=\"referrer\" content=\"no-referrer\">")
    return bad

if __name__ == "__main__":
    fails = 0
    for rel in PAGES:
        if not os.path.exists(os.path.join(HERE, rel)): print("FAIL %s: the page is missing" % rel); fails += 1; continue
        for b in check(rel): print("FAIL %s: %s" % (rel, b)); fails += 1
    print("%d pages: %s" % (len(PAGES), "each has a policy that lets no request out, runs no inline script but its own, and loads nothing from another site" if not fails else "%d problems" % fails))
    sys.exit(1 if fails else 0)
