#!/usr/bin/env python3
"""Generate the AirFryerSmart printable cheat-sheet PDF (reportlab)."""
import json, os
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, PageBreak, KeepTogether)
from reportlab.pdfbase import pdfmetrics

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
foods = json.load(open(os.path.join(ROOT, "data", "foods.json")))

ORANGE = colors.HexColor("#ea580c")
ORANGE_DARK = colors.HexColor("#7c2d12")
GRAY = colors.HexColor("#374151")
LIGHT = colors.HexColor("#fff7ed")

def clean(s):
    """Strip anything Helvetica (cp1252) cannot render — emoji etc."""
    return str(s).encode("cp1252", errors="ignore").decode("cp1252")

def c2c(f):
    return round((f - 32) * 5 / 9)

# ---------------------------------------------------------------- styles
S = {}
S["title"] = ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=22,
                            leading=26, textColor=colors.HexColor("#111827"))
S["sub"] = ParagraphStyle("sub", fontName="Helvetica", fontSize=10.5,
                          leading=14, textColor=GRAY)
S["h2"] = ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=14,
                         leading=18, textColor=ORANGE_DARK,
                         spaceBefore=14, spaceAfter=6)
S["body"] = ParagraphStyle("body", fontName="Helvetica", fontSize=9.5,
                           leading=13, textColor=colors.HexColor("#1f2937"))
S["cell"] = ParagraphStyle("cell", fontName="Helvetica", fontSize=8.5,
                           leading=11, textColor=colors.HexColor("#1f2937"))
S["cellb"] = ParagraphStyle("cellb", fontName="Helvetica-Bold", fontSize=8.5,
                            leading=11, textColor=colors.HexColor("#1f2937"))
S["hdr"] = ParagraphStyle("hdr", fontName="Helvetica-Bold", fontSize=9,
                          leading=11, textColor=colors.white)
S["note"] = ParagraphStyle("note", fontName="Helvetica-Oblique", fontSize=8,
                           leading=10.5, textColor=GRAY)

def header_footer(canvas, doc):
    canvas.saveState()
    # top band
    canvas.setFillColor(ORANGE)
    canvas.rect(0, letter[1] - 0.55 * inch, letter[0], 0.55 * inch, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 12)
    canvas.drawString(0.6 * inch, letter[1] - 0.38 * inch,
                      "AirFryerSmart — Air Fryer Conversion Cheat Sheet")
    canvas.setFont("Helvetica", 9)
    canvas.drawRightString(letter[0] - 0.6 * inch, letter[1] - 0.38 * inch,
                           "airfryersmart.netlify.app")
    # page number
    canvas.setFillColor(GRAY)
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(letter[0] / 2, 0.35 * inch,
                             f"Page {doc.page} of 4  ·  airfryersmart.netlify.app")
    canvas.restoreState()

def make_table(header, rows, widths, align_center_cols=()):
    data = [[Paragraph(h, S["hdr"]) for h in header]]
    for r in rows:
        cells = []
        for i, c in enumerate(r):
            st = S["cellb"] if i == 0 else S["cell"]
            cells.append(Paragraph(clean(c), st))
        data.append(cells)
    t = Table(data, colWidths=widths, repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), ORANGE),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d1d5db")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]
    for i in align_center_cols:
        style.append(("ALIGN", (i, 0), (i, -1), "CENTER"))
    t.setStyle(TableStyle(style))
    return t

# ---------------------------------------------------------------- content
story = []
story.append(Paragraph("Air Fryer Conversion Cheat Sheet", S["title"]))
story.append(Spacer(1, 4))
story.append(Paragraph(
    "The complete conversion system: rules, tested food times, frozen adjustments and "
    "USDA safe temperatures. Print this and keep it near the kitchen. Always verify "
    "doneness with a food thermometer.", S["sub"]))
story.append(Spacer(1, 10))

# --- rules
story.append(Paragraph("The conversion rules", S["h2"]))
rules = [
    ["Rule", "Adjustment"],
    ["Base rule", "Oven temperature − 25°F (15°C)  ·  oven time × 0.75–0.8"],
    ["Baked goods & desserts", "Temperature − 40°F  ·  time × 0.8 (fan browns tops fast)"],
    ["Frozen food", "+35% time (5–15 extra minutes)  ·  never thaw breaded or par-fried food"],
    ["Large batch (about 2 lb)", "+13% time — crowding blocks airflow"],
    ["Family batch (3 lb and up)", "+25% time, or cook in two batches"],
    ["Oven-style / toaster-oven models", "+10°F and +10% time vs. basket models"],
    ["Reheating leftovers", "3–4 minutes at 350°F, to 165°F internal"],
    ["Empty basket caution", "Never put empty parchment in a preheating air fryer — it can hit the element"],
]
story.append(make_table(rules[0], rules[1:], [2.0 * inch, 4.9 * inch]))

# --- safe temps
story.append(Paragraph("USDA safe internal temperatures", S["h2"]))
safes = [
    ["Food", "°F", "°C", "Notes"],
    ["Chicken & turkey (all cuts, whole or ground)", "165", "74", "No rest time required"],
    ["Ground beef, pork, veal and lamb", "160", "71", "Grinding spreads surface bacteria"],
    ["Beef, pork, veal, lamb steaks / chops / roasts", "145", "63", "Plus a 3-minute rest"],
    ["Fish and shellfish", "145", "63", "Or opaque and flakes easily"],
    ["Fully cooked ham (to reheat)", "165", "74", "140°F is enough for inspected ham"],
    ["Egg dishes and casseroles", "160", "71", "Yolk and white both firm"],
    ["Leftovers (reheat)", "165", "74", "Hot throughout, not just at the edges"],
]
story.append(make_table(safes[0], safes[1:], [2.9 * inch, 0.55 * inch, 0.55 * inch, 2.9 * inch],
                        align_center_cols=(1, 2)))

story.append(PageBreak())

# --- foods (part 1)
story.append(Paragraph("Tested food times — fresh and frozen", S["h2"]))
story.append(Paragraph(
    "Standard basket air fryer, about 1 lb portions, straight from frozen. "
    "Shake or flip at the halfway point unless noted.", S["body"]))
story.append(Spacer(1, 6))
half = len(foods) // 2
first_half, second_half = foods[:half], foods[half:]
food_rows1 = [["Food", "Fresh", "Frozen"]]
for f in first_half:
    fr = f["fresh"]
    fz = f["frozen"]
    food_rows1.append([
        f["name"],
        f"{fr['f']}°F ({c2c(fr['f'])}°C) · {fr['min']} min",
        f"{fz['f']}°F ({c2c(fz['f'])}°C) · {fz['min']} min" if fz else "—",
    ])
story.append(make_table(food_rows1[0], food_rows1[1:],
                        [2.2 * inch, 2.0 * inch, 2.0 * inch], align_center_cols=(1, 2)))
story.append(PageBreak())

# --- foods (part 2)
story.append(Paragraph("Tested food times — continued", S["h2"]))
story.append(Spacer(1, 6))
food_rows2 = [["Food", "Fresh", "Frozen"]]
for f in second_half:
    fr = f["fresh"]
    fz = f["frozen"]
    food_rows2.append([
        f["name"],
        f"{fr['f']}°F ({c2c(fr['f'])}°C) · {fr['min']} min",
        f"{fz['f']}°F ({c2c(fz['f'])}°C) · {fz['min']} min" if fz else "—",
    ])
story.append(make_table(food_rows2[0], food_rows2[1:],
                        [2.2 * inch, 2.0 * inch, 2.0 * inch], align_center_cols=(1, 2)))

story.append(Paragraph(
    "Frozen protein: chicken breast 360°F · 28 min · salmon 375°F · 14 min · "
    "shrimp 400°F · 9 min. All to the safe internal temperatures above.",
    S["note"]))
story.append(PageBreak())

# --- fix-it
story.append(Paragraph("Fix-it table", S["h2"]))
fixes = [
    ["Problem", "Fix"],
    ["Soggy, not crispy", "Single layer · preheat 3 minutes · shake at halfway"],
    ["Burning on top", "Lower the temperature 10–15°F · keep food clear of the element"],
    ["Smoke during cooking", "2 tbsp water in the drawer · clean the element weekly"],
    ["Food sticking", "Perforated parchment · oil the basket · never aerosol spray"],
    ["Uneven browning", "Shake more often · don't crowd · check the fan vent is clean"],
    ["Breading falls off", "Pat food dry first · use tongs, not a hard shake"],
    ["Cold centre, dark outside", "Drop 20–25°F · add time · verify with a thermometer"],
    ["Cheese leaked out", "Lower heat · shorter time · cook straight from frozen"],
]
story.append(make_table(fixes[0], fixes[1:], [1.7 * inch, 5.2 * inch]))

story.append(Paragraph("Ten habits that fix most results", S["h2"]))
habits = [
    "1. Cook in a single layer with a finger of space between pieces — two batches beat one full basket.",
    "2. Preheat 3 minutes for anything under 25 minutes of cooking.",
    "3. Pat protein dry before seasoning; frozen breaded food goes in straight from the freezer.",
    "4. Use a pump oil mister, never aerosol spray — propellants damage the non-stick coating.",
    "5. Shake or flip at the halfway point of every cook.",
    "6. Sauce after cooking, or only in the final 2–3 minutes.",
    "7. Use a thermometer: poultry 165°F, ground 160°F, whole cuts 145°F + 3 min rest, fish 145°F.",
    "8. Perforated liners only — solid paper or foil blocks airflow.",
    "9. Weigh down light food (kale, bread) with a rack so it cannot fly into the element.",
    "10. Wipe the heating element weekly — grease there is the #1 cause of smoke and off-flavours.",
]
for h in habits:
    story.append(Paragraph(h, S["cell"]))

story.append(Spacer(1, 14))
story.append(Paragraph(
    "Convert any oven recipe — including ranges, Celsius and UK gas marks — at "
    "airfryersmart.netlify.app. The food database (51 foods, full instructions) is at "
    "airfryersmart.netlify.app/foods.html. Timings are tested starting points; every "
    "machine differs slightly, so check food a few minutes early the first time. "
    "Temperature guidance follows USDA FSIS recommendations.", S["note"]))

doc = SimpleDocTemplate(os.path.join(ROOT, "downloads", "air-fryer-conversion-cheat-sheet.pdf"),
                        pagesize=letter,
                        leftMargin=0.6 * inch, rightMargin=0.6 * inch,
                        topMargin=0.85 * inch, bottomMargin=0.6 * inch,
                        title="AirFryerSmart Air Fryer Conversion Cheat Sheet",
                        author="AirFryerSmart")
doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print("PDF done")
