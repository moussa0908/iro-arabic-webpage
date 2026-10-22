#!/usr/bin/env python3
"""/ar/ 페이지 생성기.

src/ar/*.html (페이지별 본문)  +  이 파일의 공통 레이아웃(머리말·메뉴·푸터·스키마)
  →  ar/<slug>/index.html, sitemap.xml, robots.txt

본문만 고치고 `python3 tools/build.py` 를 실행하면 모든 페이지의 메뉴·푸터·SEO 태그가 함께 갱신됩니다.
"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "ar"

# 공개 주소. 자체 도메인을 연결하면 이 한 줄만 바꾸고 다시 빌드하세요.
SITE = "https://moussa0908.github.io/iro-arabic-webpage"
# 원어민 검수 + 의료광고 심의가 끝나기 전에는 검색엔진·AI 크롤러가 색인하지 않도록 막아 둡니다.
INDEXABLE = False
UPDATED = "2026-10-22"

NAV = [
    ("face-lifting", "شدّ الوجه"),
    ("fat-repositioning", "إعادة توزيع الدهون"),
    ("facial-surgery", "تجديد العين والجبهة"),
    ("doctor", "الطبيبة"),
    ("journey", "رحلتكم العلاجية"),
    ("faq", "الأسئلة الشائعة"),
]
PROC_NAV = [
    ("face-lifting", "شدّ الوجه"),
    ("fat-repositioning", "إعادة توزيع الدهون وحقن الدهون الذاتية"),
    ("facial-surgery", "تجديد منطقة العين والجبهة"),
    ("other-procedures", "إجراءات أخرى"),
]

WA_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5 2.5 1 3 .8 3.6.7.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z"/></svg>'
STAR = '<svg class="star-bg" viewBox="0 0 200 200" aria-hidden="true"><path d="M100 4 L128 72 L196 100 L128 128 L100 196 L72 128 L4 100 L72 72 Z"/><path d="M32 32 L100 56 L168 32 L144 100 L168 168 L100 144 L32 168 L56 100 Z"/><circle cx="100" cy="100" r="40" fill="none" stroke="#E6C77A" stroke-width=".6"/></svg>'

CLINIC_ID = f"{SITE}/ar/#clinic"
DOCTOR_ID = f"{SITE}/ar/doctor/#physician"


def clinic_schema():
    return {
        "@type": "MedicalClinic",
        "@id": CLINIC_ID,
        "name": "عيادة إيرو للجراحة التجميلية",
        "alternateName": ["IRO Plastic Surgery", "이로성형외과"],
        "url": f"{SITE}/ar/",
        "logo": f"{SITE}/assets/logo-dark.png",
        "image": f"{SITE}/assets/doctor.jpg",
        "telephone": "+82-2-363-5501",
        "medicalSpecialty": "PlasticSurgery",
        "isAcceptingNewPatients": True,
        "availableLanguage": ["ko", "ar"],
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "8F, 10 Sinchon-ro 37-gil",
            "addressLocality": "Seodaemun-gu, Seoul",
            "addressCountry": "KR",
        },
        "openingHoursSpecification": [
            {"@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Friday"], "opens": "10:00", "closes": "19:00"},
            {"@type": "OpeningHoursSpecification", "dayOfWeek": "Saturday", "opens": "10:00", "closes": "16:00"},
        ],
        "employee": {"@id": DOCTOR_ID},
        "sameAs": ["https://www.instagram.com/irops_ar/", "https://iroplasticsurgery.com/"],
    }


def physician_schema():
    return {
        "@type": "Physician",
        "@id": DOCTOR_ID,
        "name": "د. جيهيون كيم",
        "alternateName": "Dr. Jihyun Kim",
        "gender": "Female",
        "medicalSpecialty": "PlasticSurgery",
        "image": f"{SITE}/assets/doctor.jpg",
        "worksFor": {"@id": CLINIC_ID},
        "url": f"{SITE}/ar/doctor/",
    }


def strip_tags(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def faq_items(body):
    pat = re.compile(r'<details[^>]*>\s*<summary>(.*?)<i>\+</i></summary>\s*<div class="a">(.*?)</div>\s*</details>', re.S)
    return [(strip_tags(q), strip_tags(a)) for q, a in pat.findall(body)]


def load(path):
    text = path.read_text(encoding="utf-8")
    m = re.match(r"<!--meta\s*(\{.*?\})\s*-->\s*", text, re.S)
    meta = json.loads(m.group(1))
    body = re.sub(r"<!--include:([\w-]+)-->", lambda i: (SRC / "_partials" / f"{i.group(1)}.html").read_text(encoding="utf-8"), text[m.end():])
    return meta, body


def build_page(meta, body):
    slug = meta["slug"]
    depth = 1 if slug == "" else 2          # ar/index.html or ar/<slug>/index.html
    up = "../" * depth                       # → site root
    ar = "./" if slug == "" else "../"       # → /ar/
    href = lambda s: ar + (s + "/" if s else "")
    url = f"{SITE}/ar/" + (slug + "/" if slug else "")
    is_home = slug == ""

    # 본문 안의 {{slug}} → 상대 링크, {{assets}} → 자산 폴더, {{home}} → /ar/
    body = body.replace("{{WA}}", WA_ICON)
    body = re.sub(r"\{\{([a-z-]+)\}\}", lambda m: up + "assets/" if m.group(1) == "assets" else href("" if m.group(1) == "home" else m.group(1)), body)

    # ---- structured data ----
    graph = [clinic_schema()]
    crumbs = [("الرئيسية", f"{SITE}/ar/")]
    if not is_home:
        crumbs.append((meta["crumb"], url))
    if slug == "doctor" or is_home:
        graph.append(physician_schema())
    page = {
        "@type": "MedicalWebPage" if meta.get("medical") else "WebPage",
        "@id": url + "#page", "url": url, "name": meta["title"], "description": meta["description"],
        "inLanguage": "ar", "isPartOf": {"@type": "WebSite", "name": "عيادة إيرو للجراحة التجميلية", "url": f"{SITE}/ar/"},
        "about": {"@id": CLINIC_ID}, "dateModified": meta.get("updated", UPDATED),
    }
    if meta.get("reviewed"):
        page["reviewedBy"] = {"@id": DOCTOR_ID}
        page["lastReviewed"] = meta.get("updated", UPDATED)
    if meta.get("procedures"):
        page["mainEntity"] = [{"@type": "MedicalProcedure", "name": n, "procedureType": "https://schema.org/SurgicalProcedure" if s else "https://schema.org/NoninvasiveProcedure"} for n, s in meta["procedures"]]
    graph.append(page)
    if not is_home:
        graph.append({"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(crumbs)]})
    faqs = faq_items(body)
    if faqs:
        graph.append({"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faqs]})
    ld = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, indent=1)

    robots = "index, follow, max-image-preview:large" if INDEXABLE else "noindex, nofollow"
    nav = "".join(f'<a href="{href(s)}"{" aria-current=\"page\"" if s == slug else ""}>{t}</a>' for s, t in NAV)
    drawer = "".join(f'<a href="{href(s)}">{t}</a>' for s, t in [("", "الرئيسية")] + NAV[:3] + [("other-procedures", "إجراءات أخرى")] + NAV[3:] + [("consultation", "طلب استشارة")])

    # ---- page hero for inner pages ----
    hero = ""
    if not is_home:
        cta = meta.get("cta", True)
        ctas = (f'<div class="ctas"><a class="btn wa" data-wa="{meta.get("proc", "")}" data-place="page_hero">{WA_ICON}<span>استشارة عبر واتساب</span></a>'
                f'<a class="btn line" href="{href("consultation")}">نموذج طلب الاستشارة</a></div>') if cta else ""
        reviewed = " · المراجعة الطبية: د. جيهيون كيم" if meta.get("reviewed") else ""
        hero = f'''<section class="page-hero">{STAR}
  <div class="wrap">
    <ol class="crumbs"><li><a href="{href("")}">الرئيسية</a></li><li aria-current="page">{meta["crumb"]}</li></ol>
    <h1>{meta["h1"]}</h1>
    {f'<p class="answer">{meta["answer"]}</p>' if meta.get("answer") else ""}
    {ctas}
    <p class="meta-line">آخر تحديث: <bdi>{meta.get("updated", UPDATED)}</bdi>{reviewed}</p>
  </div>
</section>'''

    if meta.get("aside"):
        pnav = "".join(f'<a href="{href(s)}"{" aria-current=\"page\"" if s == slug else ""}>{t}</a>' for s, t in PROC_NAV)
        body = f'''<div class="article"><div class="wrap">
<div class="prose">
{body}
</div>
<aside class="aside">
  <div class="box"><h3>استشيروا الطبيبة قبل السفر</h3><p>أرسلوا صوركم وسؤالكم عبر واتساب، وتراجع الطبيبة حالتكم قبل تحديد موعد الزيارة.</p><a class="btn wa block" data-wa="{meta.get("proc", "")}" data-place="aside">{WA_ICON}<span>واتساب</span></a></div>
  <nav aria-label="الإجراءات">{pnav}</nav>
</aside>
</div></div>'''

    loader = ('<div id="loader" aria-hidden="true"><svg viewBox="0 0 200 200"><path d="M100 10 L127 73 L190 100 L127 127 L100 190 L73 127 L10 100 L73 73 Z"/>'
              '<path d="M36 36 L100 58 L164 36 L142 100 L164 164 L100 142 L36 164 L58 100 Z"/><circle cx="100" cy="100" r="34"/></svg></div>') if is_home else ""

    return f'''<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{meta["title"]}</title>
<meta name="description" content="{html.escape(meta["description"])}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="ar" href="{url}">
<link rel="alternate" hreflang="x-default" href="{url}">
<meta property="og:type" content="website">
<meta property="og:locale" content="ar_AE">
<meta property="og:title" content="{html.escape(meta["title"])}">
<meta property="og:description" content="{html.escape(meta["description"])}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/assets/doctor.jpg">
<meta name="theme-color" content="#0F3324">
<link rel="icon" href="{up}assets/logo-dark.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&display=swap">
<link rel="stylesheet" href="{up}assets/ar.css">
<script type="application/ld+json">
{ld}
</script>
</head>
<body data-clinic="iro" data-procedure="{meta.get("proc", "general")}" data-consult="{href("consultation")}">
{loader}
<header class="site-head">
  <div class="wrap">
    <a class="logo" href="{href("")}" aria-label="عيادة إيرو للجراحة التجميلية — الرئيسية"><img src="{up}assets/logo-dark.png" alt="شعار عيادة إيرو" width="113" height="38"></a>
    <nav aria-label="القائمة الرئيسية">{nav}</nav>
    <div class="actions">
      <a class="btn wa" data-wa data-place="header">{WA_ICON}<span>واتساب</span></a>
      <button class="menu-btn" id="menuBtn" type="button" aria-label="القائمة" aria-expanded="false" aria-controls="drawer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 7h16M4 12h16M4 17h10"/></svg></button>
    </div>
  </div>
</header>
<div class="drawer" id="drawer"><button class="close" type="button" aria-label="إغلاق">×</button>{drawer}</div>

<main>
{hero}
{body}
</main>

<footer class="site-foot">
  <div class="wrap">
    <div>
      <img src="{up}assets/logo-light.png" alt="شعار عيادة إيرو" width="113" height="38">
      <p class="legal">عيادة إيرو للجراحة التجميلية · سيول، سودايمون-غو<br>المديرة: د. جيهيون كيم، أخصائية جراحة التجميل<br>قد تنطوي جميع الإجراءات الطبية على آثار جانبية، وتختلف النتائج وفترة التعافي من شخص لآخر. يُرجى استشارة الطبيبة قبل اتخاذ أي قرار.</p>
    </div>
    <div><h4>الإجراءات</h4><ul>{"".join(f'<li><a href="{href(s)}">{t}</a></li>' for s, t in PROC_NAV)}</ul></div>
    <div><h4>معلومات</h4><ul>
      <li><a href="{href("doctor")}">الطبيبة</a></li><li><a href="{href("journey")}">رحلتكم العلاجية</a></li>
      <li><a href="{href("faq")}">الأسئلة الشائعة</a></li><li><a href="{href("consultation")}">طلب استشارة</a></li>
      <li><a href="{href("privacy")}">سياسة الخصوصية</a></li>
      <li><a href="https://www.instagram.com/irops_ar/" target="_blank" rel="noopener">إنستغرام: <bdi>@irops_ar</bdi></a></li>
      <li><a href="https://iroplasticsurgery.com/" target="_blank" rel="noopener">الموقع الكوري للعيادة</a></li>
    </ul></div>
  </div>
</footer>

<a class="fab-wa" data-wa data-place="float" aria-label="واتساب">{WA_ICON}</a>
<div class="mbar"><a class="btn wa" data-wa data-place="mobile_bar">{WA_ICON}<span>واتساب</span></a><a class="btn gold" href="{href("consultation")}">طلب استشارة</a></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js" defer></script>
<script src="{up}assets/config.js" defer></script>
<script src="{up}assets/site.js" defer></script>
<script src="{up}assets/ar.js" defer></script>
</body>
</html>
'''


def main():
    urls = []
    for path in sorted(SRC.glob("*.html")):
        meta, body = load(path)
        out = ROOT / "ar" / meta["slug"] / "index.html" if meta["slug"] else ROOT / "ar" / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(build_page(meta, body), encoding="utf-8")
        if meta.get("sitemap", True):
            urls.append((f"{SITE}/ar/" + (meta["slug"] + "/" if meta["slug"] else ""), meta.get("updated", UPDATED)))
        print("built", out.relative_to(ROOT))

    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{u}</loc><lastmod>{d}</lastmod></url>\n" for u, d in urls) + "</urlset>\n", encoding="utf-8")

    bots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Bingbot", "Googlebot"]
    rules = "".join(f"User-agent: {b}\nAllow: /ar/\n\n" for b in bots)
    disallow = "" if INDEXABLE else "# 공개 전: 각 페이지에 noindex 가 걸려 있습니다 (tools/build.py 의 INDEXABLE).\n"
    (ROOT / "robots.txt").write_text(
        f"# robots.txt 는 도메인 최상위에서만 동작합니다. 자체 도메인 연결 후 유효합니다.\n{disallow}"
        f"User-agent: *\nAllow: /ar/\nDisallow: /archive/\nDisallow: /docs/\nDisallow: /tools/\nDisallow: /src/\n\n{rules}Sitemap: {SITE}/sitemap.xml\n",
        encoding="utf-8")
    print("built sitemap.xml, robots.txt")


if __name__ == "__main__":
    main()
