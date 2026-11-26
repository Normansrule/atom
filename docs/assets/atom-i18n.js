/* ATOM-I18N BEGIN */
/* ----------------------------------------------------------------------------
   Languages. Every sentence Atom shows goes through the function TT: the
   English text is the key, a language pack maps it to the translation, and
   placeholders are filled in afterwards so each language keeps its own word
   order. (The examples are spaced so the catalog extractor does not take them
   for sentences.)

     TT ("{The_el} melts at {t} °C.", {z:26, t:fmt(1538,0)})
     TT ("{n, plural, one {# electron} other {# electrons}}", {n:3})

   A pack is written by people as i18n/<code>.json (English sentence ->
   translation) and served as small generated files that call
   AtomI18N.load(code, {...}):
     meta   {name, dir, script, voice, locale, salt}
     el     the 118 element names in that language
     art    optional: the article each name takes ("el", "la", "der"...)
     forms  optional: other forms of the names ({gen:[118]} gives {el_gen})
     t      hash of the English template -> translation (0: same as English)
     s      hash -> a simpler telling (the "say it simpler" level)
     g      glossary: key -> {t: term, d: one-line definition, f: [forms], x: [exact-case forms]}
   The keys are hashed (FNV-1a, 32 bits, salted so no two collide) because
   half of a pack would otherwise be the English repeated. A page asks for a
   slice of the pack (the site's first screen does not need the labs' text);
   the app, one file, takes the whole pack. English's own pack carries only s
   and g and is fetched only when Simpler or Term help is on.

   The language comes from ?lang=, then the saved choice, then the browser's
   languages, and only a language that ships is ever accepted. The pack is
   written into the page before any other script runs, so every sentence is right from
   the first line. If it cannot be loaded the page says so and stays English.
   ---------------------------------------------------------------------------- */
var AtomI18N = (function(){
  var LANGS = {
    en:{name:"English",            dir:"ltr", script:"latin",      voice:"en-US"},
    es:{name:"Español",            dir:"ltr", script:"latin",      voice:"es-MX"},
    zh:{name:"中文（简体）",         dir:"ltr", script:"cjk",        voice:"zh-CN", tag:"zh-Hans", beta:1},
    hi:{name:"हिन्दी",              dir:"ltr", script:"devanagari", voice:"hi-IN", beta:1},
    ar:{name:"العربية",            dir:"rtl", script:"arabic",     voice:"ar", beta:1},
    fr:{name:"Français",           dir:"ltr", script:"latin",      voice:"fr-FR", beta:1},
    bn:{name:"বাংলা",               dir:"ltr", script:"bengali",    voice:"bn-IN", beta:1},
    pt:{name:"Português (Brasil)", dir:"ltr", script:"latin",      voice:"pt-BR", tag:"pt-BR", beta:1},
    ru:{name:"Русский",            dir:"ltr", script:"cyrillic",   voice:"ru-RU", beta:1},
    ur:{name:"اردو",               dir:"rtl", script:"nastaliq",   voice:"ur-PK", beta:1},
    id:{name:"Bahasa Indonesia",   dir:"ltr", script:"latin",      voice:"id-ID", beta:1},
    de:{name:"Deutsch",            dir:"ltr", script:"latin",      voice:"de-DE"},
    ja:{name:"日本語",              dir:"ltr", script:"japanese",   voice:"ja-JP"},
    tr:{name:"Türkçe",             dir:"ltr", script:"latin",      voice:"tr-TR"},
    vi:{name:"Tiếng Việt",         dir:"ltr", script:"latin",      voice:"vi-VN"},
    ko:{name:"한국어",              dir:"ltr", script:"korean",     voice:"ko-KR"},
    it:{name:"Italiano",           dir:"ltr", script:"latin",      voice:"it-IT"},
    ta:{name:"தமிழ்",               dir:"ltr", script:"tamil",      voice:"ta-IN"},
    te:{name:"తెలుగు",              dir:"ltr", script:"telugu",     voice:"te-IN"},
    mr:{name:"मराठी",               dir:"ltr", script:"devanagari", voice:"mr-IN"},
    sw:{name:"Kiswahili",          dir:"ltr", script:"latin",      voice:"sw"}
  };
  /* the packs that ship; the rest of LANGS are coming and are refused everywhere until they do */
  var AVAILABLE = ["en","es","zh","hi","ar","fr","bn","pt","ru","ur","id"];
  var W = typeof window!=="undefined" ? window : (typeof globalThis!=="undefined" ? globalThis : {}), D = typeof document!=="undefined" ? document : null;
  var own = Object.prototype.hasOwnProperty;
  function table(){ return Object.create(null); }
  var lang = "en", pack = {meta:LANGS.en, el:null, art:null, forms:null, t:table(), s:table(), g:table()}, level = "full", bilingual = false, failed = null;
  var regs = [], missing = table();
  var ready, resolveReady;
  ready = new Promise(function(r){ resolveReady = r; });

  function store(k, v){ try{ if(v===null) localStorage.removeItem(k); else localStorage.setItem(k, v); return (v===null?localStorage.getItem(k)===null:localStorage.getItem(k)===v); }catch(e){ return false; } }
  function stored(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function param(name){ try{ var m=new RegExp("[?&]"+name+"=([^&#]*)").exec(W.location.search||""); return m?decodeURIComponent(m[1]):null; }catch(e){ return null; } }
  function esc(s){ return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }

  /* ------------------------------------------------------------ which language */
  function known(c){ return typeof c==="string" && AVAILABLE.indexOf(c)>=0; }
  /* ES, es-MX, es_419 -> es. Two exceptions: a reader of Traditional Chinese (zh-TW, zh-HK, zh-Hant) is not
     handed the Simplified pack unasked, and old Android reports Indonesian as "in". */
  function tidy(c){ c=String(c||"").toLowerCase().replace(/_/g, "-"); var b=c.split("-")[0];
    if(b==="in") return "id";
    if(b==="zh"&&/-(hant|tw|hk|mo)(-|$)/.test(c)) return "";
    return b; }
  /* the tag a page, a link, and a voice are marked with: zh-Hans and pt-BR, where the file code alone says too little */
  function tagOf(c){ return (c===lang&&pack&&pack.meta&&pack.meta.tag)||(LANGS[c]&&LANGS[c].tag)||c; }
  function pick(){
    var q = tidy(param("lang")); if(known(q)){ store("atom.lang", q); return q; }
    var s = stored("atom.lang"); if(known(s)) return s;
    if(s) store("atom.lang", null);                   /* a language this release does not ship */
    var pref = (navigator.languages||[navigator.language||"en"]);
    for(var i=0;i<pref.length;i++){ var c=tidy(pref[i]); if(known(c)) return c; }
    return "en";
  }
  /* the site keeps packs beside its other assets (assets/i18n/); the app keeps
     them in i18n/ next to itself, and when the app is the site's own copy
     (docs/app/) that folder is the site's, one level up. A page names the
     slice it wants on this script's tag: data-pack="site". */
  var me = D && D.currentScript;
  var SLICE = (me && me.getAttribute && me.getAttribute("data-pack")) || "";
  var packBase = (me && me.src) ? me.src.replace(/[^\/]*$/, "") + "i18n/"
               : (W.location && /\/app\/(index\.html)?$/.test(W.location.pathname) && /^https?:$/.test(W.location.protocol) ? "../assets/i18n/" : "i18n/");
  function packUrl(code, slice){ return packBase + code + (slice?"."+slice:"") + ".js"; }

  /* ------------------------------------------------------------ keys */
  var SALT = 0, HK = table();
  function hk(s){ var h=(0x811c9dc5^SALT)>>>0; for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h, 0x01000193); } return (h>>>0).toString(36); }
  function keyOf(s){ return HK[s]||(HK[s]=hk(s)); }

  /* ------------------------------------------------------------ templates */
  var NF = {};
  /* the locale numbers are written in: the pack's meta.locale when it names one (Spanish
     for US classrooms is es-MX: point decimal, comma thousands), else the language. Digits
     stay 0-9 unless the pack asks for its own (meta.digits "native"), because the formulas,
     the canvases, and the answer boxes are all in 0-9. */
  function numLocale(){ var l=(pack&&pack.meta&&pack.meta.locale)||(lang==="en"?"en-US":lang); return (pack&&pack.meta&&pack.meta.digits==="native")||/-u-/.test(l)?l:l+"-u-nu-latn"; }
  function nf(d, maxOnly){
    var k=numLocale()+":"+d+(maxOnly?"m":"");
    if(!NF[k]){ var o=maxOnly?{maximumFractionDigits:d}:{maximumFractionDigits:d, minimumFractionDigits:d};
      try{ NF[k]=new Intl.NumberFormat(numLocale(), o); }catch(e){ NF[k]=new Intl.NumberFormat("en-US", o); } }
    return NF[k];
  }
  /* N(x, d): x with d decimals in the reader's notation (1 234,5 in French), a real minus sign;
     maxOnly: up to d decimals, trailing zeros dropped */
  function N(x, d, maxOnly){
    if(x===null||x===undefined||x===""||isNaN(x)) return "";
    var f=nf(d===undefined?0:d, maxOnly);
    if(f.formatToParts) return f.formatToParts(+x).map(function(p){ return p.type==="minusSign"?"−":p.value; }).join("");
    return f.format(+x).replace(/^-/, "−");
  }
  /* Nmm(x, min, max): between min and max decimals, for a caller that keeps a couple and drops the rest */
  function Nmm(x, min, max){
    if(x===null||x===undefined||x===""||isNaN(x)) return "";
    var k=numLocale()+":"+min+"-"+max, f=NF[k];
    if(!f){ var o={minimumFractionDigits:min, maximumFractionDigits:Math.max(min,max)}; try{ f=new Intl.NumberFormat(numLocale(), o); }catch(e){ f=new Intl.NumberFormat("en-US", o); } NF[k]=f; }
    if(f.formatToParts) return f.formatToParts(+x).map(function(p){ return p.type==="minusSign"?"−":p.value; }).join("");
    return f.format(+x).replace(/^-/, "−");
  }
  /* list(["2 H","1 O"]): "2 H and 1 O"; list([...], "or"): "a or b"; joined the way the reader's language joins a list */
  function list(a, or){ var items=a||[]; a=items.map(str); return Ref(listPlain(a, or), {k:"list", items:items, or:or}); }
  function listPlain(a, or){ try{ return new Intl.ListFormat(numLocale().replace(/-u-.*$/, ""), {style:"long", type:or?"disjunction":"conjunction"}).format(a); }catch(e){ return a.join(", "); } }
  var PR = null, MARKS = null;
  /* the decimal and grouping marks numbers are written with here ("," and " " in French) */
  function marks(){ if(!MARKS){ MARKS={dec:".", grp:","}; try{ new Intl.NumberFormat(numLocale()).formatToParts(12345.6).forEach(function(p){ if(p.type==="decimal") MARKS.dec=p.value; if(p.type==="group") MARKS.grp=p.value; }); }catch(e){} } return MARKS; }
  var DIGITS=/[\u0660-\u0669\u06f0-\u06f9\u0966-\u096f\u09e6-\u09ef]/g;
  function foldDigits(s){ return String(s).replace(DIGITS, function(c){ var k=c.charCodeAt(0); return String(k>=0x09e6?k-0x09e6:k>=0x0966?k-0x0966:k>=0x06f0?k-0x06f0:k-0x0660); }); }
  /* written(s): the number a string N() made stands for. "1,5" is 1.5 in Russian and "1.234" is 1234 in Portuguese. */
  function written(s){ var m=marks(); s=foldDigits(str(s)).replace(/\u2212/g, "-");
    if(m.grp) s=s.split(m.grp).join(""); s=s.replace(/[\s\u00a0\u202f]/g, ""); if(m.dec!==".") s=s.replace(/\./g, "").split(m.dec).join(".");
    return parseFloat(s.replace(/[^\d.\-]/g, "")); }
  /* parseNumber(s): what a reader typed, as a number. Their own digits and decimal mark are accepted beside
     0-9 and the point; a lone "." or "," is the decimal mark unless it can only be grouping ("1,234" in English). NaN if it is not a number. */
  function parseNumber(s){ var m=marks(); s=foldDigits(str(s)).trim().replace(/[\u2212\u2012\u2013]/g, "-").replace(/[\s\u00a0\u202f\u066c']/g, "").replace(/\u066b/g, ".");
    var dot=s.lastIndexOf("."), com=s.lastIndexOf(",");
    if(dot>=0&&com>=0){ if(dot>com) s=s.replace(/,/g, ""); else s=s.replace(/\./g, "").replace(",", "."); }
    else if(com>=0){ if(m.dec!==","&&/^-?\d{1,3}(,\d{3})+$/.test(s)) s=s.replace(/,/g, ""); else if(s.indexOf(",")===com) s=s.replace(",", "."); else return NaN; }
    return /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)?parseFloat(s):NaN; }
  /* date(d): a day, in the reader's language and the Gregorian calendar, digits 0-9 */
  function date(d){ try{ return new Intl.DateTimeFormat(tagOf(lang)+"-u-ca-gregory-nu-latn", {dateStyle:"medium"}).format(d||new Date()); }catch(e){ return (d||new Date()).toISOString().slice(0, 10); } }
  function plural(n){ try{ if(!PR) PR=new Intl.PluralRules(numLocale().replace(/-u-.*$/, "")); return PR.select(n); }catch(e){ return n===1?"one":"other"; } }

  /* find the "}" that closes the "{" at i */
  function closer(s, i){ var d=0; for(var k=i;k<s.length;k++){ if(s[k]==="{") d++; else if(s[k]==="}"){ d--; if(!d) return k; } } return -1; }
  /* "one {..} other {..}" -> {one:"..", other:".."} */
  function options(s){
    var o=table(), i=0; while(i<s.length){
      while(i<s.length&&/\s/.test(s[i])) i++;
      var j=i; while(j<s.length&&!/[\s{]/.test(s[j])) j++;
      var key=s.slice(i,j); while(j<s.length&&/\s/.test(s[j])) j++;
      if(s[j]!=="{"){ break; } var e=closer(s,j); if(e<0) break;
      o[key]=s.slice(j+1,e); i=e+1;
    }
    return o;
  }
  /* "#" stands for the number, but only at this plural's own level, not inside a nested one */
  function sharp(s, shown){ var out="", d=0; for(var i=0;i<s.length;i++){ var c=s[i]; if(c==="{") d++; else if(c==="}") d--; out+=(c==="#"&&d===0)?shown:c; } return out; }
  /* in a right-to-left sentence a spliced value (a number, a formula, a Latin name) keeps its own direction.
     A name from the pack, or any value that starts in the page's own script, is not wrapped: the wrap is an
     isolate, and an isolate between an Arabic prefix and its noun stops the letters from joining. */
  var RTL = false, RTLCH=/[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufefc]/, STRONG=/[A-Za-z\u00c0-\u024f\u0370-\u052f\u0590-\u08ff\u0900-\u0dff\u3040-\u9fff\ufb1d-\ufdff\ufe70-\ufefc]/;
  function iso(x, own_){ x=str(x); if(!RTL||!x||own_||x.charAt(0)==="<") return x; var m=STRONG.exec(x); return m&&RTLCH.test(m[0])?x:"\u2068"+x+"\u2069"; }

  /* ---- right-to-left pages: a left-to-right expression keeps its order -------------------
     In an Arabic or Urdu sentence the browser lays "[Ar] 3d6 4s2", "p+", "-1", or "19.3 g/cm3" out piece by
     piece from the right, and the pieces change places. bidi() finds each such run and wraps it in a
     left-to-right isolate (U+2066 ... U+2069), so it reads as it was written. It runs on every translated
     sentence, on text glued together in script (the observer below), and on text drawn on a canvas. A plain
     number, a lone Latin word, and anything already isolated are left as they are. A left-to-right page
     never gets here. */
  var LRI="⁦", PDI="⁩", BQ=/[A-Za-z0-9Ͱ-Ͽ]/, BMEMO=table(), BMEMO_N=0;
  var INLINE={SUB:1,SUP:1,B:1,I:1,EM:1,STRONG:1,SPAN:1,A:1,SMALL:1,VAR:1,CODE:1,ABBR:1,BDI:1,U:1,MARK:1,KBD:1,Q:1,CITE:1,DFN:1};
  /* one unit of text and what it may do in a run: L letter, D digit, S sign, E a mark that may end a run,
     O and C brackets, M a relation (< = >) that may open a run, N anything neutral, R a right-to-left letter, T an inline tag, H a hard edge, A a
     value that is already isolated */
  function bType(c){
    var k=c.charCodeAt(0);
    if(k<128){ if((k>=65&&k<=90)||(k>=97&&k<=122)) return "L"; if(k>=48&&k<=57) return "D"; if(k===43) return "S";
      if(k===40||k===91) return "O"; if(k===41||k===93) return "C"; if(k===37) return "E"; if(k===10) return "H";
      if(k===60||k===61||k===62||k===126) return "M"; return "N"; }
    if((k>=0x0590&&k<=0x08ff)||(k>=0xfb1d&&k<=0xfdff)||(k>=0xfe70&&k<=0xfefc)) return "R";
    if((k>=0x00c0&&k<=0x024f&&k!==0x00d7&&k!==0x00f7)||(k>=0x0370&&k<=0x03ff)||(k>=0x0400&&k<=0x052f)||(k>=0x1e00&&k<=0x1fff)) return "L";
    if(k===0x2212||k===0x00b1) return "S";
    if(k===0x2264||k===0x2265||k===0x2248||k===0x2260||k===0x221d) return "M";
    if(k===0x00b0||k===0x00b2||k===0x00b3||k===0x00b9||(k>=0x2070&&k<=0x209c)||k===0x2032||k===0x2033||k===0x2103||k===0x212b) return "E";
    return "N";
  }
  function bidi(s, html){
    s=str(s); if(!RTL||s.length<2||!BQ.test(s)) return s;
    var key=(html?"h":"p")+s, hit=BMEMO[key]; if(hit!==undefined) return hit;
    /* 1: cut the text into units */
    var u=[], ty=[], i=0, n=s.length, m;
    while(i<n){
      var c=s.charAt(i);
      if(c==="⁦"||c==="⁧"||c==="⁨"){            /* a value that is already isolated is one unit */
        var d=1, j=i+1; while(j<n&&d>0){ var cj=s.charCodeAt(j); if(cj>=0x2066&&cj<=0x2068) d++; else if(cj===0x2069) d--; j++; }
        if(d>0){ return (BMEMO[key]=s); }                       /* its close is in another node: not ours to touch */
        var inner=s.slice(i+1, j-1), rtlIn=RTLCH.test((STRONG.exec(inner.replace(/<[^>]*>/g, ""))||[""])[0]);
        u.push(s.slice(i, j)); ty.push(c==="⁧"||(c==="⁨"&&rtlIn)?"H":"A"); i=j; continue; }
      if(c==="⁩"){ return (BMEMO[key]=s); }
      if(html&&c==="<"&&(m=/^<\/?([A-Za-z][A-Za-z0-9]*)\b[^<>]*>/.exec(s.slice(i, i+400)))){ u.push(m[0]); ty.push(INLINE[m[1].toUpperCase()]?"T":"H"); i+=m[0].length; continue; }
      if(html&&c==="&"&&(m=/^&(#?[A-Za-z0-9]+);/.exec(s.slice(i, i+12)))){ u.push(m[0]); ty.push(m[1]==="minus"||m[1]==="plus"||m[1]==="plusmn"||m[1]==="#8722"?"S":m[1]==="deg"?"E":m[1]==="lt"||m[1]==="gt"||m[1]==="le"||m[1]==="ge"?"M":"N"); i+=m[0].length; continue; }
      /* "{k}: {what}" and "{a}, {b}" are a label and a list in the sentence's own direction, not one expression */
      if((c===":"||c===","||c===";")&&ty.length&&ty[ty.length-1]==="A"&&(i+1>=n||s.charAt(i+1)===" ")){ u.push(c); ty.push("H"); i++; continue; }
      u.push(c); ty.push(bType(c)); i++;
    }
    /* 2: in each stretch between right-to-left letters, find the run and decide whether it needs the wrap */
    var out="", a0=0, U=u.length, changed=false;
    function flush(from, to){
      var a=from, b=to-1;
      while(a<=b&&!(ty[a]==="L"||ty[a]==="D"||ty[a]==="S"||ty[a]==="A")){
        /* a relation in front of its value ("<10", "= 5") opens the run */
        if(ty[a]==="M"){ var nx=a+1; while(nx<=b&&(ty[nx]==="T"||(ty[nx]==="N"&&u[nx]===" "))) nx++; if(nx<=b&&(ty[nx]==="L"||ty[nx]==="D"||ty[nx]==="S"||ty[nx]==="A")) break; }
        a++; }
      while(b>=a&&!(ty[b]==="L"||ty[b]==="D"||ty[b]==="S"||ty[b]==="A"||ty[b]==="E")) b--;
      if(a>b){ for(var q=from;q<to;q++) out+=u[q]; return; }
      /* a bracket that opens or closes inside the run takes its partner in with it */
      for(var guard=0;guard<6;guard++){
        var depth=0, low=0; for(var k=a;k<=b;k++){ if(ty[k]==="O") depth++; else if(ty[k]==="C"){ depth--; if(depth<low) low=depth; } }
        var grew=false;
        if(low<0){ var x=a-1; while(x>=from&&ty[x]==="N"&&u[x]===" ") x--; if(x>=from&&ty[x]==="O"){ a=x; grew=true; } }
        else if(depth>0){ var y=b+1; while(y<to&&ty[y]==="N"&&u[y]===" ") y++; if(y<to&&ty[y]==="C"){ b=y; grew=true; } }
        if(!grew) break;
      }
      var hasWord=false, onlyWords=true, onlyNumber=true, atoms=0, others=0;
      for(var k2=a;k2<=b;k2++){ var t=ty[k2], ch=u[k2];
        if(t==="L"||t==="D"||t==="A") hasWord=true;
        if(t==="A") atoms++; else if(t!=="T") others++;
        if(!(t==="L"||t==="T"||(t==="N"&&(ch===" "||ch===" "||ch==="-"||ch==="'"||ch==="’")))) onlyWords=false;
        if(!(t==="D"||t==="T"||(t==="N"&&(ch==="."||ch===","||ch===" "||ch===" "||ch===" "))||(t==="E"&&ch==="%"&&k2===b))) onlyNumber=false; }
      var wrap=hasWord&&!onlyWords&&!onlyNumber&&!(atoms===1&&others===0);
      for(var q2=from;q2<a;q2++) out+=u[q2];
      if(wrap){ out+=LRI; changed=true; }
      for(var q3=a;q3<=b;q3++) out+=u[q3];
      if(wrap) out+=PDI;
      for(var q4=b+1;q4<to;q4++) out+=u[q4];
    }
    for(var z=0;z<U;z++){ if(ty[z]==="R"||ty[z]==="H"){ if(z>a0) flush(a0, z); out+=u[z]; a0=z+1; } }
    if(a0<U) flush(a0, U);
    if(!changed) out=s;
    if(++BMEMO_N>4000){ BMEMO=table(); BMEMO_N=0; }
    return (BMEMO[key]=out);
  }
  function unbidi(s){ return str(s).replace(/[⁦-⁩]/g, ""); }
  /* text put on the page by script (a number with its unit, a configuration, a formula) gets the same care.
     The unit of work is one line of inline content: its text nodes are read as one string, so
     10<sup>9</sup> N, [Ar] 3d<sup>6</sup>, or a label glued to a formula is seen whole, and the marks go into
     the nodes where the run starts and ends. A block inside (a button, a list item, a line break) starts a
     new line of its own. */
  var bidiWatch=null, XHTML="http://www.w3.org/1999/xhtml", NOBIDI={SCRIPT:1,STYLE:1,TEXTAREA:1,TITLE:1,NOSCRIPT:1,TEMPLATE:1,CANVAS:1};
  /* inline by tag and by style: a span laid out as a grid cell or a block is a line of its own */
  function inl(e){ if(e.nodeType!==1||INLINE[e.nodeName]!==1||e.namespaceURI!==XHTML) return false;
    try{ var d=W.getComputedStyle(e).display; return d==="inline"||d==="contents"; }catch(x){ return true; } }
  function bidiSeg(nodes){
    var s="", i; for(i=0;i<nodes.length;i++) s+=nodes[i].data;
    if(s.length<2||s.length>3000||!BQ.test(s)) return;
    var t=bidi(s, false); if(t===s) return;
    var ins=[], a=0, b=0; while(b<t.length){ if(a<s.length&&s.charCodeAt(a)===t.charCodeAt(b)){ a++; b++; } else { ins.push([a, t.charAt(b)]); b++; } }
    var starts=[], off=0; for(i=0;i<nodes.length;i++){ starts.push(off); off+=nodes[i].data.length; }
    for(var k=ins.length-1;k>=0;k--){ var pos=ins[k][0], ch=ins[k][1], j=nodes.length-1;
      if(ch===PDI){ while(j>0&&starts[j]>=pos) j--; } else { while(j>0&&starts[j]>pos) j--; }
      var loc=pos-starts[j], d=nodes[j].data; nodes[j].data=d.slice(0, loc)+ch+d.slice(loc); }
  }
  function bidiBlock(B){
    if(!B||B.nodeType!==1||B.namespaceURI!==XHTML||NOBIDI[B.nodeName]||B.isContentEditable) return;
    var seg=[];
    (function walk(e){ for(var c=e.firstChild;c;c=c.nextSibling){
      if(c.nodeType===3){ if(c.data) seg.push(c); }
      else if(c.nodeType===1){ if(inl(c)) walk(c); else if(seg.length){ bidiSeg(seg); seg=[]; } } } })(B);
    if(seg.length) bidiSeg(seg);
  }
  function blockOf(n){ var b=n.nodeType===3?n.parentNode:n; while(b&&b.nodeType===1&&inl(b)) b=b.parentNode; return b&&b.nodeType===1?b:null; }
  function bidiTree(root){
    if(!root) return; if(root.nodeType===3||(root.nodeType===1&&inl(root))){ bidiBlock(blockOf(root)); return; } if(root.nodeType!==1) return;
    bidiBlock(root); var all=root.getElementsByTagName("*"); for(var i=0;i<all.length;i++) if(!inl(all[i])) bidiBlock(all[i]);
  }
  var HANDS=table();
  function plainHand(g){ if(lang!=="ur") return; var f=g.font, t=HANDS[f];
    if(t===undefined) t=HANDS[f]=/Naskh|Geeza/.test(f)?f:f.replace(/(,\s*(system-ui|-apple-system|sans-serif|serif))*\s*$/, ', "Geeza Pro", "Noto Naskh Arabic", "Noto Sans Arabic", "Segoe UI", Tahoma, sans-serif');
    if(t!==f) g.font=t; }
  function bidiStart(){
    if(!RTL||!D||!D.body||bidiWatch||!W.MutationObserver) return;
    bidiTree(D.body);
    bidiWatch=new MutationObserver(function(recs){ var done=[];
      for(var i=0;i<recs.length;i++){ var r=recs[i];
        if(r.type==="characterData"){ var B=blockOf(r.target); if(B&&done.indexOf(B)<0){ done.push(B); bidiBlock(B); } }
        else for(var j=0;j<r.addedNodes.length;j++){ var x=r.addedNodes[j]; if(x.nodeType===3||(x.nodeType===1&&inl(x))){ var B2=blockOf(x); if(B2&&done.indexOf(B2)<0){ done.push(B2); bidiBlock(B2); } } else bidiTree(x); } } });
    bidiWatch.observe(D.body, {subtree:true, childList:true, characterData:true});
    /* a row of tabs runs from the right, so the arrow that points left is the one that goes on. A row kept
       left to right (the table of elements, a chart) keeps its keys. */
    D.addEventListener("keydown", function(e){
      if(!e.isTrusted||(e.key!=="ArrowLeft"&&e.key!=="ArrowRight")||!e.target||!e.target.closest) return;
      var r=e.target.closest('[role="tab"],[role="radio"]'); if(!r||!r.parentNode||W.getComputedStyle(r.parentNode).direction!=="rtl") return;
      e.stopImmediatePropagation(); e.preventDefault();
      try{ e.target.dispatchEvent(new KeyboardEvent("keydown", {key:e.key==="ArrowLeft"?"ArrowRight":"ArrowLeft", bubbles:true, cancelable:true, shiftKey:e.shiftKey, ctrlKey:e.ctrlKey, altKey:e.altKey, metaKey:e.metaKey})); }catch(x){}
    }, true);
    /* a canvas takes its direction from the page; each string is drawn in its own (an Arabic label from the
       right, "750 nm" from the left), at the place the drawing code worked out for it */
    try{ var P=W.CanvasRenderingContext2D&&W.CanvasRenderingContext2D.prototype;
      if(P&&!P.__atomBidi){ P.__atomBidi=1; ["fillText","strokeText"].forEach(function(name){ var orig=P[name];
        P[name]=function(text){ var s=bidi(text, false), m=STRONG.exec(s), al=this.textAlign;
          try{ plainHand(this); this.direction=m&&RTLCH.test(m[0])?"rtl":"ltr"; if(al==="start") this.textAlign="left"; else if(al==="end") this.textAlign="right"; }catch(e){}
          var args=Array.prototype.slice.call(arguments); args[0]=s; var r=orig.apply(this, args);
          try{ this.textAlign=al; }catch(e2){} return r; }; });
        /* Urdu on a drawing: the plainer hand, named, so a label keeps the height the drawing gave it (see rtl.css) */
        var mt=P.measureText; P.measureText=function(){ try{ plainHand(this); }catch(e){} return mt.apply(this, arguments); }; } }catch(e3){}
  }
  /* ---- names that keep their identity ------------------------------------------------
     A name is handed to a sentence as a String that remembers what it names (.ref), so a language that
     bends its nouns can ask for the form it needs: {el:gen}, {Iso:the}, {next:acc}. Old code that glues
     such a value with "+" still gets the plain text. */
  function Ref(text, ref){ if(text===undefined||text===null||text==="") return "";   /* an empty String object would still be truthy */
    var o=new String(text); o.ref=ref; return o; }
  function theWord(z){ var name=elWord(z); if(pack.forms&&pack.forms.the&&pack.forms.the[z-1]) return pack.forms.the[z-1];
    var art=pack.art&&pack.art[z-1]?pack.art[z-1]:""; return art?art+(/['\u2019]$/.test(art)?"":" ")+name:name; }
  function elForm(z, f){ if(!f) return elWord(z); if(f==="the") return theWord(z); var t=pack.forms&&pack.forms[f]; return (t&&t[z-1])||elWord(z); }
  /* an isotope takes its form from its element through meta.iso: "{el}-{A}" (the default), "{el} {A}" in
     French, or one pattern per form where the ending follows the number ({"":"{el}-{A}","gen":"{el}-{A}-এর"}) */
  function isoForm(z, a, f){ var p=pack.meta&&pack.meta.iso, per=false;
    if(p&&typeof p==="object"){ per=own.call(p, f||""); p=per?p[f||""]:p[""]; }
    if(typeof p!=="string"||!p) p="{el}-{A}";
    return p.replace("{el}", elForm(z, per?"":f)).replace("{A}", a); }
  function listForm(items, or, f){ var a=(items||[]).map(function(x){ return formed(x, f); });
    try{ return new Intl.ListFormat(numLocale().replace(/-u-.*$/, ""), {style:"long", type:or?"disjunction":"conjunction"}).format(a); }catch(e){ return a.join(", "); } }
  var FROMPACK=false;
  /* formed(value, form): the value in the form a template asked for. A value that carries .ref is formed from
     what it names; a plain string is looked up: an element's name, an isotope's ("carbon-14"), or a term the
     pack gives forms to (pack.terms, keyed by the term's own translation). Anything else is shown as it came. */
  function formed(val, f){
    var s=str(val), r=val&&val.ref; FROMPACK=!!r;
    if(!f) return s;
    if(!r&&RTL) s=unbidi(s);
    if(r){ if(r.k==="el") return elForm(r.z, f); if(r.k==="iso") return isoForm(r.z, r.a, f); if(r.k==="list") return listForm(r.items, r.or, f); }
    var t=pack.terms&&(pack.terms[s]||pack.terms[s.charAt(0).toLowerCase()+s.slice(1)]);
    if(t&&typeof t[f]==="string"){ FROMPACK=true; return t[f]; }
    if(s.length<=48){ var z=zByName(s); if(z){ FROMPACK=true; return elForm(z, f); }
      var m=/^(.{1,40}?)[-\u2011\u00a0 ](\d{1,3}m?\d?)$/.exec(s); if(m){ z=zByName(m[1]); if(z){ FROMPACK=true; return isoForm(z, m[2], f); } } }
    return s;
  }
  var PH=/^([A-Za-z_]\w*)(?::([A-Za-z_]\w*))?$/;
  /* value(v, "El:gen"): the text for one placeholder, or null when the call did not pass it. {x} and {X} name
     the same value: the capital asks for a capital first letter. */
  function value(v, spec){
    var m=PH.exec(spec); if(!m) return null;
    var name=m[1], f=m[2]||"", c=name.charAt(0), up=c!==c.toLowerCase(), has=own.call(v, name), val;
    if(has) val=v[name];
    else{ var alt=(up?c.toLowerCase():c.toUpperCase())+name.slice(1); if(alt===name||!own.call(v, alt)) return null; val=v[alt]; }
    var s=formed(val, f);
    if(f||!has) s=up?cap(s):(has?s:low(s));
    return {s:s, raw:val, own:FROMPACK||(!!f&&s!==str(val))};
  }
  function fill(s, v){
    if(s.indexOf("{")<0) return s;
    var out="", i=0;
    while(i<s.length){
      var a=s.indexOf("{", i); if(a<0){ out+=s.slice(i); break; }
      var b=closer(s, a); if(b<0){ out+=s.slice(i); break; }
      out+=s.slice(i, a);
      var body=s.slice(a+1, b), c=body.indexOf(",");
      if(c<0){ var got1=value(v, body.trim()); out+=got1?iso(got1.s, got1.own):"{"+body.trim()+"}"; }
      else{
        var rest=body.slice(c+1), c2=rest.indexOf(","), kind=(c2<0?rest:rest.slice(0,c2)).trim();
        var got2=value(v, body.slice(0,c).trim()), val=got2?(got2.raw!==undefined&&PH.exec(body.slice(0,c).trim())[2]?got2.s:got2.raw):undefined;
        if(kind==="plural"){
          var opts=options(c2<0?"":rest.slice(c2+1));
          /* a count that arrives already written ("1,234") still chooses its form and is shown as it came */
          var n=typeof val==="number"?val:written(val), shown=typeof val==="number"?N(n, Number.isInteger(n)?0:1):str(val);
          var cat=plural(n), pk=opts["="+n]!==undefined?opts["="+n]:(opts[cat]!==undefined?opts[cat]:(opts.other||""));
          out+=fill(sharp(pk, shown), v);
        }
        else if(kind==="select"){ var opts2=options(c2<0?"":rest.slice(c2+1)), k=String(val); out+=fill(opts2[k]!==undefined?opts2[k]:(opts2.other||""), v); }
        else out+="{"+body+"}";                          /* not ours ("the set {1, 2, 3}"): leave it as written */
      }
      i=b+1;
    }
    return out;
  }
  /* a value is written the way "+" wrote it; numbers a reader should see in
     their own notation go through fmt()/N() before they get here */
  function str(x){ return x===undefined||x===null?"":String(x); }
  function cap(s){ if(!s) return s; try{ return s.charAt(0).toLocaleUpperCase(lang)+s.slice(1); }catch(e){ return s.charAt(0).toUpperCase()+s.slice(1); } }
  /* a title used inside a sentence ("Stable" -> "it is stable"): the first letter by the language's own
     rule, and not at all where nouns keep their capital (a pack says so with meta.keepCase) */
  function low(s){ if(!s||(pack.meta&&pack.meta.keepCase)) return s; try{ return s.charAt(0).toLocaleLowerCase(lang)+s.slice(1); }catch(e){ return s.charAt(0).toLowerCase()+s.slice(1); } }
  /* the element placeholders every template may use when it is handed z */
  function elVars(v){
    if(!v||!W.ELEMENTS) return v;
    var z=v.z;
    /* no z given but an element's name is: find it, so the pack may still use {the_el} and {The_el} */
    if(typeof z!=="number"){ var cand=v.El||v.el||v.Name||v.name||v.cap; if(cand&&cand.ref&&cand.ref.k==="el") z=cand.ref.z; else if(typeof cand==="string"&&cand.length<=40) z=zByName(cand); }
    if(typeof z!=="number"||!z) return v;
    var e=W.ELEMENTS[z-1]; if(!e) return v;
    var name=elWord(z), the=theWord(z);
    var o={}; for(var k in v) if(own.call(v, k)) o[k]=v[k];
    if(!own.call(o, "el")) o.el=Ref(name, {k:"el", z:z}); if(!own.call(o, "El")) o.El=Ref(cap(name), {k:"el", z:z});
    if(!own.call(o, "the_el")) o.the_el=Ref(the, {k:"el", z:z}); if(!own.call(o, "The_el")) o.The_el=Ref(cap(the), {k:"el", z:z});
    if(!own.call(o, "sym")) o.sym=e[1]; if(!own.call(o, "Z")) o.Z=z;
    /* a language that bends its nouns brings the bent forms: forms.gen[25] is used as {el_gen} */
    if(pack.forms) for(var f in pack.forms) if(own.call(pack.forms, f)&&!own.call(o, "el_"+f)) o["el_"+f]=(pack.forms[f]&&pack.forms[f][z-1])||name;
    return o;
  }
  function tr(key){
    var h=keyOf(key);
    if(level==="simple"){ var sv=pack.s[h]; if(sv!==undefined) return sv; }
    var t=pack.t[h]; if(t!==undefined&&t!==0) return t;
    if(t===undefined&&lang!=="en"&&!missing[key]) missing[key]=1;
    /* one English word can be two things ("Volume" of sound, "Volume" of a nucleus): the key says which in a
       tag at its end (Volume, then [[sound]] in double square brackets), and the tag is never shown */
    return key.charCodeAt(key.length-1)===93?key.replace(/ ?\[\[[^\]]*\]\]$/, ""):key;
  }
  /* contractions a filled template can produce: "de {the_el}" is "de el hierro" until the
     language's own rule makes it "del hierro". A pack may bring its own rules in
     meta.contract ([["de le","du"], ...]). The edges are letter-aware: "Envía el enlace"
     is not "a el", and the article is lowercase, so "El Salvador" is never touched. */
  var CONTRACT={ es:[["de el","del"],["a el","al"]],
    pt:[["de o","do"],["de a","da"],["de os","dos"],["de as","das"],["em o","no"],["em a","na"],["em os","nos"],["em as","nas"],["a o","ao"],["a os","aos"]] }, CRX=null;
  function contract(s){
    if(CRX===null){ var rules=(pack.meta&&Array.isArray(pack.meta.contract))?pack.meta.contract:CONTRACT[lang]; CRX=[];
      if(rules){ try{ CRX=rules.map(function(r){ return [new RegExp("(^|[^\\p{L}\\p{N}])"+r[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")+"(?![\\p{L}\\p{N}])", "gu"), "$1"+r[1]]; }); }catch(e){ CRX=[]; } } }
    for(var i=0;i<CRX.length;i++) s=s.replace(CRX[i][0], CRX[i][1]);
    return s;
  }
  function T(key, vars){ var s=tr(key); s=s.indexOf("{")>=0?contract(fill(s, elVars(vars||{}))):s; return RTL?bidi(s, true):s; }
  var TT=T;   /* the name the catalog extractor looks for, for the two sentences this file owns */
  /* for a sentence that lives in a data table: same lookup, and the table is
     registered so the extractor can list every sentence it holds */
  function TD(s, vars){ return T(s, vars); }
  function reg(name, arr, cols){ regs.push({name:name, arr:arr, cols:cols}); }
  function dumpData(){
    var out=[]; regs.forEach(function(r){
      function walk(x){ if(typeof x==="string"){ if(x&&/[A-Za-z]{2}/.test(x)) out.push(x); } else if(Array.isArray(x)) x.forEach(walk); else if(x&&typeof x==="object") Object.keys(x).forEach(function(k){ walk(x[k]); }); }
      if(r.cols){ (Array.isArray(r.arr)?r.arr:Object.keys(r.arr).map(function(k){ return r.arr[k]; })).forEach(function(row){ r.cols.forEach(function(c){ if(row&&row[c]!==undefined) walk(row[c]); }); }); }
      else walk(r.arr);
    });
    return out;
  }
  /* elWord: the name as it sits inside a sentence ("iron", "hierro", "Eisen");
     elName: the name as a title, on a tile or a card ("Iron", "Hierro") */
  function elWord(z){ var e=W.ELEMENTS&&W.ELEMENTS[z-1]; if(!e) return ""; return (pack.el&&pack.el[z-1])||(EN_NAMES?EN_NAMES[z-1]:e[2]).toLowerCase(); }
  function elEnglish(z){ var e=W.ELEMENTS&&W.ELEMENTS[z-1]; if(!e) return ""; return EN_NAMES?EN_NAMES[z-1]:e[2]; }
  function elName(z){ return cap(elWord(z)); }
  /* the name with its article where the language uses one: "el hierro", "la plata", "iron" */
  function theEl(z){ if(!W.ELEMENTS||!W.ELEMENTS[z-1]) return elWord(z); return Ref(theWord(z), {k:"el", z:z}); }
  /* el(z), isoRef(z, a), list([...]): a name a sentence can ask a form of */
  function elRef(z){ return Ref(elWord(z), {k:"el", z:z}); }
  function isoRef(z, a, capital){ var t=isoForm(z, a, ""); return Ref(capital?cap(t):t, {k:"iso", z:z, a:a}); }
  function elNames(){ var o=[]; for(var z=1;z<=118;z++) o.push(elName(z)); return o; }

  /* ------------------------------------------------------------ static markup */
  function norm(s){ return String(s).replace(/\s+/g, " ").trim(); }
  function apply(root){
    root=root||D; if(!root) return;
    var els=root.querySelectorAll("[data-i]");
    for(var i=0;i<els.length;i++){
      /* one English word can be two things ("Atom" the name, "Atom" the scale): data-i-ctx tells them apart,
         and the catalog files the second as "Atom [[depth gauge]]" */
      var el=els[i], text=norm(el.innerHTML), ctx=el.getAttribute("data-i-ctx"), key=ctx?text+" [["+ctx+"]]":text, h=keyOf(key), t=tr(key);
      if(t!==key) el.innerHTML=RTL?bidi(t, true):t;
      /* a sentence the pack does not have stays English, and says so to a screen reader */
      else if(lang!=="en"&&pack.t[h]!==0&&/[A-Za-z]{3}/.test(key)&&el.nodeName!=="TITLE"){ el.setAttribute("lang", "en"); el.setAttribute("dir", "ltr"); }
    }
    var at=root.querySelectorAll("[data-i-attr]");
    for(var j=0;j<at.length;j++){
      var a=at[j]; a.getAttribute("data-i-attr").split(",").forEach(function(name){
        name=name.trim(); var v=a.getAttribute(name); if(v){ var t2=tr(norm(v)); if(t2!==norm(v)) a.setAttribute(name, RTL?bidi(t2, false):t2); }
      });
    }
  }

  /* ------------------------------------------------------------ loading
     The pack is written into the page with document.write from this script,
     which the browser runs before any script after it: every sentence in the app,
     data tables included, sees the translation from the first line. A slice
     asked for later (the labs' text, when the labs load) arrives by a script
     tag and need() resolves when it is in. */
  var loaded=false, got=table(), waiting=table();
  function merge(into, from){ if(from) for(var k in from) if(own.call(from, k)) into[k]=from[k]; }
  function load(code, p){
    if(code!==lang||!p) return;      /* a stale pack from an earlier choice */
    if(p.meta){ pack.meta=p.meta; if(typeof p.meta.salt==="number"&&p.meta.salt!==SALT){ SALT=p.meta.salt; HK=table(); } PR=null; NF={}; CRX=null; MARKS=null; }
    if(p.el) pack.el=p.el; if(p.art) pack.art=p.art; if(p.forms) pack.forms=p.forms; if(p.terms) pack.terms=p.terms;
    merge(pack.t, p.t); merge(pack.s, p.s); merge(pack.g, p.g);
    loaded=true; got[p.slice||""]=1;
  }
  function wantsPack(){ return lang!=="en" || level==="simple" || bilingual; }
  function inject(url, done){
    if(!D){ done(false); return; }
    var s=D.createElement("script"); s.src=url; s.onload=function(){ done(true); }; s.onerror=function(){ done(false); };
    (D.head||D.documentElement).appendChild(s);
  }
  /* need("labs"): the labs' slice of the pack, for a page that started with a smaller one */
  function need(slice){
    if(!wantsPack()||!SLICE||got[slice]||got[""]||failed) return Promise.resolve(true);
    if(!waiting[slice]) waiting[slice]=new Promise(function(res){ inject(packUrl(lang, slice), function(ok){ if(!ok){ try{ console.warn("Atom: the "+slice+" part of the "+lang+" pack did not load"); }catch(e){} } res(ok); }); });
    return waiting[slice];
  }
  /* the files this page's language is made of, for the service worker to keep */
  function packFiles(){ if(!wantsPack()) return []; return SLICE?[packUrl(lang, SLICE), packUrl(lang, "labs")]:[packUrl(lang, "")]; }
  var finished=false;
  var EN_NAMES=null;
  /* the table's own names take the pack's: every e[2] in the app then shows
     the language's name, and a search still finds the English one */
  function localizeElements(){
    if(!W.ELEMENTS||!pack.el||EN_NAMES) return;
    EN_NAMES=W.ELEMENTS.map(function(e){ return e[2]; });
    for(var z=1;z<=118;z++){ if(pack.el[z-1]) W.ELEMENTS[z-1][2]=cap(pack.el[z-1]); }
  }
  function fold(s){ return String(s||"").toLowerCase(); }
  function lowL(s){ try{ return String(s||"").toLocaleLowerCase(lang); }catch(e){ return fold(s); } }
  function zByName(s){
    s=String(s||"").trim(); if(!s||!W.ELEMENTS) return 0; var a=fold(s), b=lowL(s);
    for(var z=1;z<=118;z++){ var e=W.ELEMENTS[z-1]; if(!e) continue;
      if(fold(e[1])===a||fold(e[2])===a||lowL(e[2])===b||(EN_NAMES&&fold(EN_NAMES[z-1])===a)||(pack.el&&pack.el[z-1]&&(fold(pack.el[z-1])===a||lowL(pack.el[z-1])===b))) return z; }
    return 0;
  }
  function finish(){ if(finished) return; finished=true;
    if(!loaded&&wantsPack()){
      /* the pack is not here (offline and never fetched, or the single file without its i18n folder):
         say so and be English honestly, in name, direction, numbers, and voice. The saved choice
         stays, so the next visit tries again. */
      failed=lang; if(lang!=="en"){ lang="en"; PR=null; NF={}; CRX=null; MARKS=null; mark(); }
      level="full"; bilingual=false;
      try{ console.warn("Atom: the language pack for "+failed+" did not load; showing English"); }catch(e){}
    }
    localizeElements();
    if(D){ try{ apply(D); }catch(e){} }
    if(D){ try{ D.documentElement.classList.remove("i18n-wait"); }catch(e){} }
    /* a page with no script of its own (the teacher guide, the handout) still gets the language menu */
    if(D){ try{ var h=D.getElementById("langHost"); if(h&&!h.firstChild) mountMenu(h, "langPick"); }catch(e){} }
    if(RTL){ try{ if(D.body) bidiStart(); else D.addEventListener("DOMContentLoaded", bidiStart); }catch(e){} }
    resolveReady(lang); }
  function mark(){
    if(!D) return; var h=D.documentElement, m=LANGS[lang];
    h.lang=tagOf(lang); h.dir=m.dir; h.className=h.className.replace(/\s*\b(lang|script)-[a-z]+\b/g, "")+" lang-"+lang+" script-"+m.script;
    RTL=m.dir==="rtl"; if(RTL) h.classList.add("rtl"); else h.classList.remove("rtl");
    if(m.beta) h.classList.add("lang-beta-on"); else h.classList.remove("lang-beta-on");
  }
  function start(){
    lang=pick(); dispApply();
    /* the two reading settings, from the address when storage is blocked, else from storage */
    var pl=param("level"), pt=param("terms");
    level=(pl==="simple"||(pl===null&&stored("atom.level")==="simple"))?"simple":"full";
    bilingual=(pt==="1"||(pt===null&&stored("atom.bilingual")==="1"));
    mark();
    if(!wantsPack()){ if(D&&D.readyState==="loading") D.addEventListener("DOMContentLoaded", finish); else finish(); return; }
    /* the page's own words stay hidden until they are in the reader's language (three seconds at most) */
    if(D&&lang!=="en"){ try{ D.documentElement.classList.add("i18n-wait"); setTimeout(function(){ D.documentElement.classList.remove("i18n-wait"); }, 3000); }catch(e){} }
    if(D&&D.readyState==="loading"){
      /* parser-inserted, so it runs before the next script tag; same origin, so the page's policy allows it */
      D.write('<script src="'+esc(packUrl(lang, SLICE))+'"><\/script>');
      D.addEventListener("DOMContentLoaded", finish);
    }
    else inject(packUrl(lang, SLICE), function(){ finish(); });   /* this script was deferred or added late: the pack follows by a tag */
  }
  /* a choice is saved when the device lets us and carried in the address when it does not */
  function go(set){
    try{ var u=new URL(W.location.href); set(u.searchParams); var next=u.pathname+u.search+u.hash;
      if(next!==W.location.pathname+W.location.search+W.location.hash){ W.location.assign(next); return; } }catch(e){}
    W.location.reload();
  }
  function hrefFor(code){ try{ var u=new URL(W.location.href); u.searchParams.set("lang", code); return u.pathname+u.search+u.hash; }catch(e){ return "?lang="+code; } }
  function setLang(code){ if(!known(code)) return; var kept=store("atom.lang", code); go(function(q){ if(kept) q.delete("lang"); else q.set("lang", code); }); }
  function setLevel(l){ var simple=l==="simple", kept=store("atom.level", simple?"simple":null); go(function(q){ if(kept) q.delete("level"); else q.set("level", simple?"simple":"full"); }); }
  function setBilingual(on){ var kept=store("atom.bilingual", on?"1":null); go(function(q){ if(kept) q.delete("terms"); else q.set("terms", on?"1":"0"); }); }

  /* ------------------------------------------------------------ display options
     Two switches a reader may need before anything else on the page: more contrast, and wider text spacing.
     They are kept on the device like the language (and carried in the address where storage is blocked), and
     set on <html> by this script, which runs before the first paint, so no page flashes in the wrong one.
     More contrast is on from the start for a reader whose system asks for it, until they say otherwise here. */
  var DISP={contrast:"more", spacing:"wide"};
  function dispGet(k){ var p=param(k), v=p!==null?p:stored("atom."+k);
    if(v===null&&k==="contrast"){ try{ if(W.matchMedia&&W.matchMedia("(prefers-contrast: more)").matches) v="more"; }catch(e){} }
    return v===DISP[k]?v:""; }
  function dispApply(){ if(!D) return; for(var k in DISP) if(own.call(DISP, k)){ var v=dispGet(k); if(v) D.documentElement.setAttribute("data-"+k, v); else D.documentElement.removeAttribute("data-"+k); } }
  function setDisplay(k, on){ if(!own.call(DISP, k)) return; var v=on?DISP[k]:"off", kept=store("atom."+k, v); go(function(q){ if(kept) q.delete(k); else q.set(k, v); }); }
  function dispSwitches(){
    function sw(k, name, what){ return '<button type="button" role="switch" aria-checked="'+(dispGet(k)?"true":"false")+'" data-disp="'+k+'"><b>'+esc(name)+'</b><small>'+esc(what)+'</small></button>'; }
    return '<div class="disp-list" role="group" aria-label="'+esc(TT("Display options"))+'">'
      +sw("contrast", TT("More contrast"), TT("Stronger lines, solid backgrounds, and underlined links."))
      +sw("spacing", TT("Wider text spacing"), TT("More room between letters, words, and lines."))
      +'<p class="lang-note">'+esc(TT("Saved on this device. The page reloads to apply a change."))+'</p></div>';
  }
  /* its own button (Aa) where the bar has room; on a narrow screen the same switches open the language menu's list instead */
  function displayHTML(id){ return '<details class="disp-menu" id="'+esc(id)+'"><summary class="lang-sum disp-sum" aria-label="'+esc(TT("Display options"))+'"><span aria-hidden="true">Aa</span></summary><div class="lang-list">'+dispSwitches()+'</div></details>'; }
  /* the language menu, the same wherever it sits: a two-letter badge that opens
     a short list of links, each language in its own name. Links, not a select:
     an arrow key on a closed select changes the page under a keyboard user. */
  function menuHTML(id){
    var h='<details class="lang-menu" id="'+esc(id)+'"><summary class="lang-sum" aria-label="'+esc(lang.toUpperCase()+", "+TT("Language and display")+": "+LANGS[lang].name)+'"><span>'+lang.toUpperCase()+'</span></summary><ul class="lang-list"><li class="disp-li">'+dispSwitches()+'</li>', anyBeta=false;
    AVAILABLE.forEach(function(c){ var t=tagOf(c), beta=LANGS[c].beta; if(beta) anyBeta=true;
      h+='<li><a href="'+esc(hrefFor(c))+'" data-lang="'+c+'" hreflang="'+t+'"'+(c===lang?' aria-current="true"':'')+'><span lang="'+t+'" dir="'+LANGS[c].dir+'">'+LANGS[c].name+'</span>'+(beta?' <span class="lang-beta">'+esc(TT("Beta"))+'</span>':'')+'</a></li>'; });
    return h+'</ul>'+(anyBeta?'<p class="lang-note lang-beta-note">'+esc(TT("Beta: translated, and not yet reviewed by a fluent reader. Corrections are welcome."))+'</p>':'')
      +(failed?'<p class="lang-note" role="status">'+esc(LANGS[failed]?LANGS[failed].name:failed)+": "+esc(TT("this language could not be loaded here."))+'</p>':'')+'</details>';
  }
  function mountMenu(host, id){ if(!host) return null; id=id||"langPick"; host.innerHTML=menuHTML(id)+displayHTML(id+"Disp"); var d=host.querySelector("details"), d2=host.querySelector(".disp-menu"); wireMenu(d); wireMenu(d2);
    host.addEventListener("click", function(e){ var b=e.target&&e.target.closest?e.target.closest("[data-disp]"):null; if(b) setDisplay(b.getAttribute("data-disp"), b.getAttribute("aria-checked")!=="true"); });
    return d; }
  function wireMenu(d){
    if(!d||!D) return;
    d.addEventListener("click", function(e){ var a=e.target&&e.target.closest?e.target.closest("a[data-lang]"):null; if(!a) return; e.preventDefault(); setLang(a.getAttribute("data-lang")); });
    d.addEventListener("keydown", function(e){ if(e.key==="Escape"&&d.open){ d.open=false; var s=d.querySelector("summary"); if(s) s.focus(); } });
    D.addEventListener("click", function(e){ if(d.open&&!d.contains(e.target)) d.open=false; });
    d.addEventListener("focusout", function(e){ if(d.open&&e.relatedTarget&&!d.contains(e.relatedTarget)) d.open=false; });   /* Tab moved on: the list does not stay open behind it */
  }

  /* ------------------------------------------------------------ read aloud
     Only with a voice that runs on this device. A browser's network voices
     send the text to their maker's servers, and Atom sends nothing anywhere:
     where the device has no voice of its own for the language, Listen is not
     offered. */
  var speaking=null;
  function voiceTag(){ return (pack.meta&&pack.meta.voice)||LANGS[lang].voice||tagOf(lang); }
  function localVoice(){
    var vs=[]; try{ vs=W.speechSynthesis.getVoices()||[]; }catch(e){}
    var want=String(voiceTag()).toLowerCase().replace(/_/g, "-"), base=want.split("-")[0], near=null;
    for(var i=0;i<vs.length;i++){ var v=vs[i]; if(!v||v.localService!==true) continue;
      var vl=String(v.lang||"").toLowerCase().replace(/_/g, "-");      /* Android writes es_ES */
      if(vl===want) return v; if(!near&&vl.split("-")[0]===base) near=v; }
    return near;
  }
  function canSpeak(){ return !!(W.speechSynthesis&&W.SpeechSynthesisUtterance&&localVoice()); }
  function speak(text, onend){
    if(!W.speechSynthesis||!W.SpeechSynthesisUtterance||!text) return false;
    var v=localVoice(); if(!v) return false;          /* say nothing rather than let the browser pick a network voice */
    stopSpeaking();
    var u=new SpeechSynthesisUtterance(unbidi(text).replace(/\s+/g, " ").trim()); u.voice=v; u.lang=v.lang;
    u.onend=u.onerror=function(){ if(speaking===u){ speaking=null; if(onend) onend(); } };
    speaking=u; W.speechSynthesis.speak(u); return true;
  }
  function stopSpeaking(){ var was=speaking; speaking=null; if(W.speechSynthesis){ try{ W.speechSynthesis.cancel(); }catch(e){} } return !!was; }
  if(W.speechSynthesis){
    try{ W.speechSynthesis.getVoices();      /* Chrome fills the list late: ask once now, and tell the labs when it arrives */
      if(W.speechSynthesis.addEventListener) W.speechSynthesis.addEventListener("voiceschanged", function(){ try{ W.dispatchEvent(new Event("atom:voices")); }catch(e){} });
      if(W.addEventListener) W.addEventListener("pagehide", function(){ stopSpeaking(); }); }catch(e){}
  }

  if(D) start(); else finish();
  return {LANGS:LANGS, AVAILABLE:AVAILABLE, ready:ready, T:T, TD:TD, N:N, Nmm:Nmm, list:list, cap:cap, low:low, esc:esc, reg:reg, dumpData:dumpData, elName:elName, elWord:elWord, theEl:theEl, el:elRef, iso:isoRef, formed:formed, bidi:function(s){ return RTL?bidi(s, false):str(s); }, plain:unbidi, parseNumber:parseNumber, date:date, tagOf:tagOf, elEnglish:elEnglish, elNames:elNames, zByName:zByName, localizeElements:localizeElements,
    apply:apply, load:load, need:need, packFiles:packFiles, known:known, setLang:setLang, setLevel:setLevel, setBilingual:setBilingual, menuHTML:menuHTML, mountMenu:mountMenu, wireMenu:wireMenu, setDisplay:setDisplay, display:dispGet,
    speak:speak, stopSpeaking:stopSpeaking, canSpeak:canSpeak, norm:norm, hash:hk,
    get lang(){ return lang; }, get dir(){ return LANGS[lang].dir; }, get level(){ return level; }, get bilingual(){ return bilingual; }, get failed(){ return failed; }, get slice(){ return SLICE; },
    get glossary(){ return pack.g; }, get meta(){ return pack.meta; }, get forms(){ return pack.forms; }, get beta(){ return !!LANGS[lang].beta; }, get missing(){ return Object.keys(missing); }, get isEnglish(){ return lang==="en"; }};
})();
var TT=AtomI18N.T;   /* TT, not T: the labs use T for the theme inside their drawing code */
/* ATOM-I18N END */
