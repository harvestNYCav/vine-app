#!/usr/bin/env python3
"""Author source-pinned Grade 3–8 NYSED ELA passage transcript sidecars.

This is an offline authoring tool. It prefers authoritative selectable PDF
text page by page, repairs only documented embedded-font ligatures, and falls
back to high-resolution OCR for pages without substantive text. Production
imports consume the checked-in result and never run OCR implicitly.
"""

from __future__ import annotations

import argparse
import io
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any, Sequence

import pdfplumber
from PIL import Image

try:
    from scripts.import_nysed_math_mc import atomic_write_json, sha256_file
    from scripts.nysed_ela_passages import _prepare_passage_page
    from scripts.nysed_ela_transcripts import (
        ALLOWED_NESTED_SINGLE_QUOTE_FRAGMENTS,
        DEFAULT_SIDECAR_ROOT,
        ElaTranscriptError,
        SINGLE_CLOSING_QUOTE_RE,
        SOURCE_VALUES,
        TRANSCRIPT_POLICY_VERSION,
        normalize_transcript_text,
        passage_transcript_input_hash,
        transcript_paragraph_markers,
        transcript_visual_description_count,
        validate_transcript_text,
    )
except ModuleNotFoundError:  # pragma: no cover - permits direct script execution.
    from import_nysed_math_mc import atomic_write_json, sha256_file  # type: ignore[no-redef]
    from nysed_ela_passages import _prepare_passage_page  # type: ignore[no-redef]
    from nysed_ela_transcripts import (  # type: ignore[no-redef]
        ALLOWED_NESTED_SINGLE_QUOTE_FRAGMENTS,
        DEFAULT_SIDECAR_ROOT,
        ElaTranscriptError,
        SINGLE_CLOSING_QUOTE_RE,
        SOURCE_VALUES,
        TRANSCRIPT_POLICY_VERSION,
        normalize_transcript_text,
        passage_transcript_input_hash,
        transcript_paragraph_markers,
        transcript_visual_description_count,
        validate_transcript_text,
    )


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CATALOG = REPO_ROOT / "content" / "ela-exams" / "generated" / "catalog.json"
DEFAULT_PUBLIC_ROOT = REPO_ROOT / "public" / "nysed" / "ela"
DEFAULT_CACHE_ROOT = REPO_ROOT / "tmp" / "pdfs" / "nysed-ela-passage-import"
DEFAULT_TESSERACT = shutil.which("tesseract")
OCR_DPI = 300
EMBEDDED_TEXT_MIN_WORDS = 50


# Every replacement counted here was checked against the NYSED passage
# facsimile. Counts make the repair fail closed if OCR output changes instead
# of silently applying the same heuristic to different text.
REVIEWED_SINGLE_TO_DOUBLE_CLOSING_COUNTS: dict[str, int] = {
    "nysed-ela-2016-g5-stimulus-1-7": 3,
    "nysed-ela-2016-g5-stimulus-8-14": 4,
    "nysed-ela-2016-g5-stimulus-36-42": 5,
    "nysed-ela-2016-g6-stimulus-29-35": 4,
    "nysed-ela-2016-g6-stimulus-36-42": 1,
    "nysed-ela-2016-g7-stimulus-1-7": 1,
    "nysed-ela-2016-g7-stimulus-36-42": 3,
    "nysed-ela-2016-g8-stimulus-1-7": 4,
    "nysed-ela-2016-g8-stimulus-29-35": 2,
    "nysed-ela-2017-g5-stimulus-1-7": 3,
    "nysed-ela-2017-g5-stimulus-36-42": 1,
    "nysed-ela-2018-g5-stimulus-1-7": 6,
    "nysed-ela-2018-g6-stimulus-1-7": 2,
    "nysed-ela-2018-g6-stimulus-22-28": 5,
    "nysed-ela-2018-g7-stimulus-15-21": 2,
    "nysed-ela-2018-g7-stimulus-22-28": 3,
    "nysed-ela-2018-g8-stimulus-1-7": 1,
    "nysed-ela-2021-g6-stimulus-8-14": 2,
    "nysed-ela-2021-g6-stimulus-15-21": 2,
    "nysed-ela-2021-g7-stimulus-1-7": 2,
    "nysed-ela-2021-g7-stimulus-8-14": 1,
    "nysed-ela-2021-g7-stimulus-15-21": 3,
    "nysed-ela-2026-g5-stimulus-1-7": 1,
    "nysed-ela-2026-g5-stimulus-29-35": 2,
    "nysed-ela-2026-g7-stimulus-22-27": 1,
    "nysed-ela-2026-g7-stimulus-29-35": 2,
    "nysed-ela-2016-g3-stimulus-1-6": 3,
    "nysed-ela-2016-g3-stimulus-13-18": 8,
    "nysed-ela-2016-g4-stimulus-1-6": 3,
    "nysed-ela-2016-g4-stimulus-25-31": 1,
    "nysed-ela-2017-g4-stimulus-19-24": 2,
    "nysed-ela-2018-g3-stimulus-1-6": 8,
    "nysed-ela-2018-g3-stimulus-19-24": 8,
    "nysed-ela-2018-g4-stimulus-7-12": 1,
    "nysed-ela-2018-g4-stimulus-19-24": 1,
    "nysed-ela-2019-g4-stimulus-19-24": 2,
    "nysed-ela-2021-g4-stimulus-1-6": 1,
    "nysed-ela-2021-g4-stimulus-7-12": 2,
    "nysed-ela-2026-g3-stimulus-1-6": 3,
    "nysed-ela-2026-g3-stimulus-20-24": 7,
}


# Repairs below are deliberately stimulus-specific and source-anchored. They
# were reviewed against the stitched NYSED facsimiles in ``public/nysed/ela``.
# This keeps the OCR authoring step reproducible without turning broad spelling
# guesses into silent edits of unrelated passages.
REMOVE_EXACT_LINES: dict[str, frozenset[str]] = {
    "nysed-ela-2015-g4-stimulus-13-19": frozenset({"31 37"}),
    "nysed-ela-2016-g3-stimulus-1-6": frozenset({"py", "yo) | ———", "ibe, nN nay"}),
    "nysed-ela-2016-g3-stimulus-13-18": frozenset({"py"}),
    "nysed-ela-2016-g3-stimulus-25-31": frozenset({"gyre"}),
    "nysed-ela-2016-g4-stimulus-1-6": frozenset({",y", "fet !", "Ps ae", "/ eA |"}),
    "nysed-ela-2016-g4-stimulus-13-18": frozenset({"yD tins", "lo om"}),
    "nysed-ela-2016-g4-stimulus-25-31": frozenset({"KB isatetes"}),
    "nysed-ela-2016-g5-stimulus-1-7": frozenset({"e & @", "e e"}),
    "nysed-ela-2016-g6-stimulus-22-28": frozenset({"LB eae", "e e"}),
    "nysed-ela-2016-g6-stimulus-29-35": frozenset({"® e"}),
    "nysed-ela-2016-g7-stimulus-1-7": frozenset(
        {
            "England 9 fz *, pf =e",
            "FING o Pacific Ocean",
            'Africa \\ " > he.',
            "y M N etn. ee South",
            "*s @— Australia )) ~ ; ere tice",
            "N v ye w",
            "“New *® ow",
            "Ww E Zealand Ocee?",
            "a —a",
        }
    ),
    "nysed-ela-2016-g7-stimulus-8-14": frozenset({"e e", "e ] e e"}),
    "nysed-ela-2016-g7-stimulus-36-42": frozenset({"Lyre"}),
    "nysed-ela-2017-g3-stimulus-7-12": frozenset({"D", "irections", "Page?"}),
    "nysed-ela-2017-g4-stimulus-19-24": frozenset({"Dieters"}),
    "nysed-ela-2017-g4-stimulus-25-31": frozenset({"Dieters"}),
    "nysed-ela-2017-g5-stimulus-1-7": frozenset({"e"}),
    "nysed-ela-2017-g5-stimulus-29-35": frozenset({"e e"}),
    "nysed-ela-2017-g5-stimulus-36-42": frozenset({"e"}),
    "nysed-ela-2018-g3-stimulus-1-6": frozenset({"e", "am *", "F) ¥.", "nig fae."}),
    "nysed-ela-2018-g3-stimulus-19-24": frozenset({"e"}),
    "nysed-ela-2018-g6-stimulus-1-7": frozenset({"+4"}),
    "nysed-ela-2018-g6-stimulus-29-35": frozenset({"e e e"}),
    "nysed-ela-2018-g7-stimulus-15-21": frozenset({"e", "e e"}),
    "nysed-ela-2018-g7-stimulus-22-28": frozenset({"¢¢ > »9"}),
    "nysed-ela-2019-g4-stimulus-13-18": frozenset({"Dietions"}),
    "nysed-ela-2019-g4-stimulus-19-24": frozenset({"Dies"}),
    "nysed-ela-2021-g3-stimulus-13-18": frozenset({"ae", "MH", "WN oes", "<*"}),
    "nysed-ela-2021-g6-stimulus-1-7": frozenset({"+4"}),
    "nysed-ela-2021-g6-stimulus-8-14": frozenset({"e"}),
    "nysed-ela-2021-g6-stimulus-15-21": frozenset({"e e"}),
    "nysed-ela-2021-g7-stimulus-1-7": frozenset({"e e"}),
    "nysed-ela-2021-g7-stimulus-8-14": frozenset({"e", "e e"}),
    "nysed-ela-2021-g7-stimulus-15-21": frozenset({"<4 > >)"}),
    "nysed-ela-2022-g7-stimulus-29-35": frozenset(
        {"{", "GiB", "////", "tes, C=)", "_______________________"}
    ),
    "nysed-ela-2026-g3-stimulus-13-19": frozenset(
        {"Dietions", "ry 000 277", "CS ee SS :"}
    ),
    "nysed-ela-2026-g3-stimulus-26-31": frozenset({"Dietions", "« > 9"}),
    "nysed-ela-2026-g5-stimulus-22-27": frozenset({"ce e", "e bl >>]"}),
    "nysed-ela-2025-g6-stimulus-29-35": frozenset(
        {"tw ec) Nee Pig, a ical ;", "Soe NG a", "iar"}
    ),
    "nysed-ela-2026-g7-stimulus-29-35": frozenset({"e e"}),
}


EXACT_REPLACEMENTS: dict[str, tuple[tuple[str, str], ...]] = {
    "nysed-ela-2016-g5-stimulus-1-7": (
        ("5 As I gota little older", "5 As I got a little older"),
        ("work!!!” T couldn't believe it", "work!!!” I couldn’t believe it"),
        ("to pick what theyd study", "to pick what they’d study"),
    ),
    "nysed-ela-2016-g5-stimulus-8-14": (
        (
            "Y: ’s T\n"
            "asmeens lLurn\n"
            "by Carol Fraser Hagen",
            "Yasmeen’s Turn\nby Carol Fraser Hagen",
        ),
        ("shed be tickled", "she’d be tickled"),
        ("abbas Koran", "abba’s Koran"),
        ("Amma’ dress", "Amma’s dress"),
        ("16 “T have to share", "16 “I have to share"),
        (
            "20 It was Yasmeen’s turn. With a cone of a\n"
            "henna paste, Amma painted tiny flowers,\n"
            "paisley designs, and intricate patterns on %® £ ee niga xy |\n\n"
            "4 - ays\n"
            "Yasmeen’s hands. Bw ~ a anes\n"
            "21 ; Seconds later, Yasmeen sat straight up. TE a ca\n"
            "That's it,” she blurted out, “Mehndi! . se",
            "20 It was Yasmeen’s turn. With a cone of\n"
            "henna paste, Amma painted tiny flowers,\n"
            "paisley designs, and intricate patterns on\n"
            "Yasmeen’s hands.\n\n"
            "21 Seconds later, Yasmeen sat straight up.\n"
            "“That’s it,” she blurted out, “Mehndi!”",
        ),
        ("\n21 At school the next day", "\n22 At school the next day"),
        ("\n22 “On special Muslim holidays", "\n23 “On special Muslim holidays"),
        ("\n23 “Could you paint", "\n24 “Could you paint"),
        ("\n24 Yasmeen felt", "\n25 Yasmeen felt"),
        ("\n25 “And mine!", "\n26 “And mine!"),
        ("\n26 “Mine, too!", "\n27 “Mine, too!"),
        ("\n27 Yasmeen’s feet", "\n28 Yasmeen’s feet"),
    ),
    "nysed-ela-2014-g5-stimulus-8-14": (
        (
            "A BMX Race\n\n9 The BMX racing bike",
            "A BMX Race\n\n[Photograph: Four helmeted BMX racers ride "
            "head-to-head over a dirt-track rise; their bicycles are airborne "
            "close together.]\n\n9 The BMX racing bike",
        ),
    ),
    "nysed-ela-2014-g7-stimulus-13-19": (
        (
            "I have a head and a tail. I can move around,\n"
            "but you can’t take me for a walk. What am I? The word comet comes from the\n"
            "ancient Greek word kometes,\n"
            "A comet. Comets are dirty, rocky snowballs\n"
            "meaning “long-haired.” People\n"
            "15 that orbit the Sun. They spend most of their\n"
            "thought comets looked like heads\n"
            "lives far away from us, but when a comet’s orbit\n"
            "with hair streaming out behind\n"
            "brings it near the Sun, part of its frozen “head”\n"
            "them. Comets have long inspired\n"
            "defrosts into a dusty, gaseous “tail” millions of\n"
            "fear and awe because, unlike the\n"
            "miles long. Then the comet appears as a predictable Sun, Moon, and stars,\n"
            "20 brilliant streak we can see in the sky for weeks they appeared to come and go as\n"
            "or even months. Since the pressure of the Sun’s they pleased. Ancient people\n"
            "radiation—which is what pushes the dust and believed the unannounced visitors\n"
            "gas away from the comet—always flows away were warnings of something\n"
            "from the Sun, the comet’s tail always points unusual and terrible—war, flood,\n"
            "25 away from the Sun, too. That means that death, sickness, or earthquake.\n"
            "sometimes the comet seems to travel backward,\n"
            "with the tail leading the head!",
            "I have a head and a tail. I can move around,\n"
            "but you can’t take me for a walk. What am I?\n"
            "A comet. Comets are dirty, rocky snowballs\n"
            "15 that orbit the Sun. They spend most of their\n"
            "lives far away from us, but when a comet’s orbit\n"
            "brings it near the Sun, part of its frozen “head”\n"
            "defrosts into a dusty, gaseous “tail” millions of\n"
            "miles long. Then the comet appears as a\n"
            "20 brilliant streak we can see in the sky for weeks\n"
            "or even months. Since the pressure of the Sun’s\n"
            "radiation—which is what pushes the dust and\n"
            "gas away from the comet—always flows away\n"
            "from the Sun, the comet’s tail always points\n"
            "25 away from the Sun, too. That means that\n"
            "sometimes the comet seems to travel backward,\n"
            "with the tail leading the head!\n\n"
            "[Text box: The word comet comes from the ancient Greek word kometes, "
            "meaning “long-haired.” People thought comets looked like heads with "
            "hair streaming out behind them. Comets have long inspired fear and "
            "awe because, unlike the predictable Sun, Moon, and stars, they appeared "
            "to come and go as they pleased. Ancient people believed the unannounced "
            "visitors were warnings of something unusual and terrible—war, flood, "
            "death, sickness, or earthquake.]",
        ),
        (
            "Edmond Halley (1656–1742)\n"
            "As a student at Oxford University in England, Edmond Halley (rhymes\n"
            "with valley) was so excited about astronomy that he left school to map\n"
            "the stars in the Southern Hemisphere’s skies. Halley is best known for his\n"
            "groundbreaking work on comets, especially the one that bears his name.\n"
            "Halley was the first to say that comets sighted in 1531, 1607, and 1682\n"
            "were actually the same comet returning every 76 years. He predicted the\n"
            "comet’s return in 1758, though he knew he wouldn’t live to see the\n"
            "prediction come true. When it did, the comet was named in his honor.\n"
            "Astronomy was just one of Edmond Halley’s many strengths. Among\n"
            "countless other things, he developed the first weather map and studied\n"
            "Earth’s magnetic field. The multitalented Halley was England’s\n"
            "Astronomer Royal from 1719 until he died in 1742 at Greenwich\n"
            "Observatory in England.",
            "[Text box: Edmond Halley (1656–1742). As a student at Oxford University "
            "in England, Edmond Halley (rhymes with valley) was so excited about "
            "astronomy that he left school to map the stars in the Southern "
            "Hemisphere’s skies. Halley is best known for his groundbreaking work on "
            "comets, especially the one that bears his name. Halley was the first to "
            "say that comets sighted in 1531, 1607, and 1682 were actually the same "
            "comet returning every 76 years. He predicted the comet’s return in 1758, "
            "though he knew he would not live to see the prediction come true. When "
            "it did, the comet was named in his honor. Astronomy was just one of "
            "Edmond Halley’s many strengths. Among countless other things, he "
            "developed the first weather map and studied Earth’s magnetic field. The "
            "multitalented Halley was England’s Astronomer Royal from 1719 until he "
            "died in 1742 at Greenwich Observatory in England.]",
        ),
    ),
    "nysed-ela-2015-g6-stimulus-1-7": (
        (
            "Get Some Sleep!\n"
            "Tips for a Good Night’s Sleep\n"
            "So what can you do if you’re running a\n"
            "(cid:127) Try to go to bed and wake\n"
            "sleep deficit? “The good news is that you only\n"
            "up at the same time every day.\n"
            "have to make up about a third of what you\n"
            "(cid:127) Have a bedtime routine that’s\n"
            "70 have lost, to function and feel better,” says relaxing, such as taking a warm\n"
            "Mahowald. Those extra two hours of sleep on shower or reading for fun.\n"
            "Saturday and Sunday mornings can really help. (cid:127) Keep your bedroom\n"
            "But sleeping until noon on the weekend can comfortable, dark, cool,\n"
            "cause problems—you’ll likely be wide-eyed and quiet.\n"
            "75 until late those nights. Instead, try maintaining (cid:127) Limit your use of electronics,\n"
            "such as computers and video\n"
            "a reasonable, regular sleeping and waking\n"
            "games, for several hours\n"
            "schedule. And remember, sleep is not\n"
            "before you go to sleep.\n"
            "negotiable. Get those zzzzzs!\n"
            "(cid:127) Avoid drinking any caffeine\n"
            "after lunchtime.\n"
            "(cid:127) Avoid cigarettes, alcohol,\n"
            "and drugs.\n"
            "(cid:127) Get regular exercise, but don’t\n"
            "exercise late in the evening.",
            "Get Some Sleep!\n"
            "So what can you do if you’re running a\n"
            "sleep deficit? “The good news is that you only\n"
            "70 have to make up about a third of what you\n"
            "have lost, to function and feel better,” says\n"
            "Mahowald. Those extra two hours of sleep on\n"
            "Saturday and Sunday mornings can really help.\n"
            "But sleeping until noon on the weekend can\n"
            "cause problems—you’ll likely be wide-eyed\n"
            "75 until late those nights. Instead, try maintaining\n"
            "a reasonable, regular sleeping and waking\n"
            "schedule. And remember, sleep is not\n"
            "negotiable. Get those zzzzzs!\n\n"
            "[Text box: “Tips for a Good Night’s Sleep.” Try to go to bed and wake "
            "up at the same time every day. Have a relaxing bedtime routine, such "
            "as taking a warm shower or reading for fun. Keep your bedroom "
            "comfortable, dark, cool, and quiet. Limit electronics, such as "
            "computers and video games, for several hours before sleep. Avoid "
            "caffeine after lunchtime. Avoid cigarettes, alcohol, and drugs. Get "
            "regular exercise, but do not exercise late in the evening.]",
        ),
    ),
    "nysed-ela-2015-g7-stimulus-1-7": (
        (
            "65 “What we are doing will be reflected At a pumpkin contest in Rhode Island,\n"
            "on the dinner table of America.” a pumpkin is transported for weighing.",
            "65 “What we are doing will be reflected\n"
            "on the dinner table of America.”\n\n"
            "[Photograph: An enormous pumpkin is strapped beneath the lifting arm "
            "of a skid-steer beside a man. Caption: “At a pumpkin contest in Rhode "
            "Island, a pumpkin is transported for weighing.”]",
        ),
    ),
    "nysed-ela-2015-g7-stimulus-15-21": (
        (
            "Plastic Bags: By the Numbers\n"
            "1,500\n"
            "Average number of plastic shopping bags American families take home annually.\n"
            "12 million\n"
            "Barrels of oil it takes each year to make the plastic bags used in the U.S.\n"
            "10,000\n"
            "Number of U.S. jobs in the plastic-bag manufacturing industry.\n"
            "= 1 = 68 Se] a\n"
            "rh ; ‘ }\n"
            "+See N | -F A\" 3 ee ee\n"
            "y™ | % 225 hehehe\n"
            "» gree:\n"
            ": c = ~ nee Bs _ A os aa ~% NE = ‘ aa",
            "[Sidebar: “Plastic Bags: By the Numbers.” 1,500: average number of "
            "plastic shopping bags American families take home annually. 12 million: "
            "barrels of oil it takes each year to make the plastic bags used in the "
            "United States. 10,000: number of U.S. jobs in the plastic-bag "
            "manufacturing industry.]",
        ),
    ),
    "nysed-ela-2016-g6-stimulus-1-7": (
        ("“Maith thi, a Chaitlin!?’", "“Maith thú, a Chaitlín!”"),
        ("ina heap", "in a heap"),
        ("squeezebox'", "squeezebox¹"),
        ("adjudicator,”", "adjudicator,²"),
        ("' squeezebox", "¹ squeezebox"),
        ("> adjudicator", "² adjudicator"),
        ("35. “She", "35 “She"),
        ("that’s for sure?”", "that’s for sure.”"),
        ("Id lost", "I’d lost"),
        ("41 “Maith", "45 “Maith"),
        ("be your teacher”", "be your teacher.”"),
        ("wasnt", "wasn’t"),
        ("“T only", "“I only"),
        ("“Flying”", "“Flying.”"),
    ),
    "nysed-ela-2016-g6-stimulus-29-35": (
        ("’ma novelist", "I’m a novelist"),
        ("plasticity,’", "plasticity,¹"),
        ("their children”", "their children.”"),
        ("get at it?", "get at it.”"),
        ("11 Reading can enrich", "15 Reading can enrich"),
        ("' plasticity: flexibility", "¹ plasticity: flexibility"),
        ("‘doing’ it”", "‘doing’ it.”"),
        ("35. ourselves", "35 ourselves"),
        ("Reading not only staves off feelings", "Reading not only staves off² feelings"),
        ("ona daily basis", "on a daily basis"),
        ("51 Although the study", "55 Although the study"),
        ("> staves off: holds back", "² staves off: holds back"),
    ),
    "nysed-ela-2016-g6-stimulus-36-42": (
        ("millions of hectares’ of crops", "millions of hectares¹ of crops"),
        ("lowa State University", "Iowa State University"),
        ("25 toa lottery", "25 to a lottery"),
        ("' 1 hectare equals", "¹ 1 hectare equals"),
        ("Culpepper’ says", "Culpepper² says"),
        ("\n‘These weeds", "\nThese weeds"),
        ("halfa million", "half a million"),
        ("weeds wont be", "weeds won’t be"),
        ("Tranel’s’ team", "Tranel’s³ team"),
        ("* Stanley Culpepper", "² Stanley Culpepper"),
        ("> Patrick Tranel", "³ Patrick Tranel"),
    ),
    "nysed-ela-2016-g7-stimulus-15-21": (
        ("\n‘They were in the form", "\nThey were in the form"),
        ("shed put", "she’d put"),
        ("on motors. Hed bought", "on motors. He’d bought"),
        ("same way. Hed bought", "same way. He’d bought"),
        ("40 _ off", "40 off"),
        ("couldnt", "couldn’t"),
        ("It’s beautiful . . ”", "It’s beautiful . . .”"),
        ("51 Time", "55 Time"),
    ),
    "nysed-ela-2016-g7-stimulus-36-42": (
        ("\n‘The teachers loved it", "\nThe teachers loved it"),
        ("isnt", "isn’t"),
        ("“Too salty, he says", "“Too salty,” he says"),
    ),
    "nysed-ela-2016-g7-stimulus-1-7": (
        ("y what we now know", "5 what we now know"),
        ("“gentlemen. For", "“gentlemen.” For"),
        ("heros welcome", "hero’s welcome"),
    ),
    "nysed-ela-2016-g7-stimulus-8-14": (
        ("NFL™ players", "NFLˢᴹ players"),
        ("the NFL™ for", "the NFLˢᴹ for"),
        ("NFL™ is a registered", "NFLˢᴹ is a registered"),
        ("Riddell”", "Riddell®"),
        ("Riddell’", "Riddell®"),
    ),
    "nysed-ela-2016-g8-stimulus-29-35": (
        ("mountain bike,’\nboredom", "mountain bike, [footnote 1]\nboredom"),
        ("' pulling a 360", "¹ pulling a 360"),
        ("we feel bored”", "we feel bored.”"),
        ("“tractor beam’ —", "“tractor beam” —"),
        ("classes that dont interest", "classes that don’t interest"),
        ("Boredom doesnt exist", "Boredom doesn’t exist"),
        ("I fell asleep in class...", "I fell asleep in class. . . ."),
    ),
    "nysed-ela-2016-g8-stimulus-36-42": (
        ("The Sil hi\ne Silver Dream Machine", "The Silver Dream Machine"),
        ("\n‘The only thing that holds", "\nThe only thing that holds"),
        ("ona bend", "on a bend"),
        ("Nervidn River", "Nervión River"),
        ("30. «the computer.”", "30 the computer.”"),
        ("It was affordable. . -", "It was affordable."),
        ("amillion came", "a million came"),
        ("’'m way beyond Bilbao", "I’m way beyond Bilbao"),
        ("youre scared", "you’re scared"),
        ("who had studied art = = SS", "who had studied art"),
        ("architect, Bilbao was —— =", "architect, Bilbao was"),
        (
            "It took four years to build the museum, Rs \" e y\n\n"
            "45 and when the titanium was installed on the [Ba ; ‘a\n"
            "roof, the workers on the top level could see . om | ~s\n"
            "panoramic views of the city and the Lenore Ree\n"
            "building blossoming like silver petals Sr TLL LL\n"
            "beneath them. a t : E",
            "It took four years to build the museum,\n"
            "45 and when the titanium was installed on the\n"
            "roof, the workers on the top level could see\n"
            "panoramic views of the city and the\n"
            "building blossoming like silver petals\n"
            "beneath them.\n\n"
            "[Photograph: Seen across the river, the Guggenheim Museum Bilbao is "
            "formed from overlapping curved masses of reflective silver titanium "
            "that resemble large silver petals.]",
        ),
    ),
    "nysed-ela-2016-g8-stimulus-1-7": (
        ("5 _ sense", "5 sense"),
        ("| can't control", "I can’t control"),
        ("T’ll", "I’ll"),
        ("21 “I want", "25 “I want"),
        ("“That’s not for girls”", "“That’s not for girls.”"),
        ("Id pace", "I’d pace"),
        ("couldnt", "couldn’t"),
        (
            "“Youre like a crazy person, my dad said.",
            "“You’re like a crazy person,” my dad said.",
        ),
    ),
    "nysed-ela-2016-g8-stimulus-22-28": (
        ("chateau’", "chateau¹"),
        ("When J arrived", "When I arrived"),
        ("“Good-night”", "“Good-night.”"),
        ("darkness?", "darkness.”"),
        ("‘chateau:", "¹ chateau:"),
        ("valet’", "valet²"),
        ("*valet:", "² valet:"),
    ),
    "nysed-ela-2016-g5-stimulus-36-42": (
        ("13 “T think I’m going", "13 “I think I’m going"),
        ("he explained. “T felt less", "he explained. “I felt less"),
        ("Said Kenny, “T felt", "Said Kenny, “I felt"),
        ("“I think Pll be", "“I think I’ll be"),
        (
            "without\nit. Said the teen, “It was a reality check.”",
            "without\nit,” said the teen. “It was a reality check.”",
        ),
    ),
    "nysed-ela-2017-g5-stimulus-1-7": (
        ("6 “Look at this place” Todd’s", "6 “Look at this place,” Todd’s"),
        ("upstairs soaking in a hot tub”", "upstairs soaking in a hot tub.”"),
        ("cereals” Todd explained", "cereals,” Todd explained"),
        (
            "29 When she came into the kitchen, she stared in apparent disbelief. “You even fixed\n"
            "broccoli, she whispered.",
            "29 When she came into the kitchen, she stared in apparent disbelief. “You even fixed\n"
            "broccoli,” she whispered.",
        ),
        (
            "Fats, Oils, & Sweets\n"
            "0 2%%\n"
            ". g Meat, Poultry, Fish, Dry Beans\n"
            "A 7 ' ' '\n"
            "Vegetable crour>/®@ F.. Fruit Group\n"
            "=\n"
            "\" Bread, Cereal\n"
            "< ‘ ‘\n"
            "Weep con B Rice, & Pasta Group",
            "[Diagram: A food pyramid has a wide bottom labeled “Bread, Cereal, "
            "Rice, & Pasta Group.” The next level contains the “Vegetable Group” "
            "and “Fruit Group.” Above those are the “Milk, Yogurt, & Cheese Group” "
            "and “Meat, Poultry, Fish, Dry Beans, Eggs, & Nuts Group.” The small "
            "top is labeled “Fats, Oils, & Sweets.”]",
        ),
    ),
    "nysed-ela-2017-g5-stimulus-8-14": (
        ("“I was what is known as a bashful child” Clara", "“I was what is known as a bashful child,” Clara"),
        ("three boys and three girls .. ”", "three boys and three girls . . .”"),
        ("ridgepole' when", "ridgepole¹ when"),
        ("great aplomb.” Among", "great aplomb.² Among"),
        ("' ridgepole: the horizontal", "¹ ridgepole: the horizontal"),
        ("? aplomb: confidence and skill", "² aplomb: confidence and skill"),
    ),
    "nysed-ela-2017-g5-stimulus-29-35": (
        ("often just “G”", "often just “G.”"),
        (
            "13 “She’s the first coach who really taught me the game of basketball? says Pondexter, whom",
            "13 “She’s the first coach who really taught me the game of basketball,” says Pondexter, whom",
        ),
        ("play ina YMCA", "play in a YMCA"),
        ("helped hone’ her talent", "helped hone² her talent"),
        ("because “no one else wanted to do it”", "because “no one else wanted to do it.”"),
        ("memorabilia’ in her office", "memorabilia³ in her office"),
        ("lady would do this forever if she could”", "lady would do this forever if she could.”"),
        ("' candor: the quality", "¹ candor: the quality"),
        ("* hone: make something better", "² hone: make something better"),
        ("* memorabilia: things collected as souvenirs", "³ memorabilia: things collected as souvenirs"),
    ),
    "nysed-ela-2017-g5-stimulus-36-42": (
        ("distance of 3 feet; says Novak", "distance of 3 feet,” says Novak"),
        ("CD from the 1980s or “90s", "CD from the 1980s or ’90s"),
        (
            "Ae\n"
            "Outer Ear 4 \\\n"
            "L a \\ . Auditory\n"
            "Z Ossicles N\n"
            "Q erve\n"
            "(/ \\\\ ON , _.. cochlea\n"
            "0) G, ae A ‘ge )\\ =\n"
            "X\\ \\ So; (FR i) 4\n"
            "VARY. See\n"
            "Sound Se Ie — \\ a) ZN yy\n"
            "Waves WwW ©)) By\n"
            "a. = .g\n"
            "ZU SS g y\n"
            "lg 7 f KC oOo <\n"
            "Yy Eardrum \\.\n"
            "Z Auditory _~\n"
            "Canal\n"
            "How an Ear Hears",
            "[Diagram: “How an Ear Hears.” A cutaway ear is labeled “Outer Ear,” "
            "“Auditory Canal,” “Eardrum,” “Ossicles,” “Cochlea,” and “Auditory "
            "Nerve.” Sound waves enter the outer ear and travel through those parts "
            "in that order toward the auditory nerve and brain.]",
        ),
    ),
    "nysed-ela-2018-g5-stimulus-29-35": (
        (
            "Excerpt from The Brooklyn Bridge: New\n"
            "> e\n"
            "York's Graceful Connection\n"
            "by Vicki Weiner\n"
            "RSS: S. Te",
            "Excerpt from The Brooklyn Bridge: New York’s Graceful Connection\n"
            "by Vicki Weiner\n\n"
            "[Photograph: An oblique aerial view of the Brooklyn Bridge over water "
            "shows a tall stone tower with Gothic arches, the roadway, and dense "
            "suspension cables.]",
        ),
    ),
    "nysed-ela-2018-g5-stimulus-1-7": (
        ("case the Woolly-Pufts\nproved", "case the Woolly-Puffs\nproved"),
        ("but Pll have to", "but I’ll have to"),
        (
            "22 “Sorry; Mayor Murphy said firmly.",
            "22 “Sorry,” Mayor Murphy said firmly.",
        ),
        (
            "26 Wendy smiled. “They are. Naggers don’t like Woolly-Pufts”",
            "26 Wendy smiled. “They are. Naggers don’t like Woolly-Puffs.”",
        ),
    ),
    "nysed-ela-2018-g6-stimulus-1-7": (
        ("pavement. |\nhad to hide", "pavement. I\nhad to hide"),
        ("4 “Paige, I heard", "4 “Paige,” I heard"),
        ("5 “Rats, I whispered", "5 “Rats,” I whispered"),
        ("raring!\nto go", "raring¹\nto go"),
        ("riding in the boat?", "riding in the boat.”"),
        ("Id even settle", "I’d even settle"),
        ("last\none, said Grandpa", "last\none,” said Grandpa"),
        ("“#1\nGrandpa’ and", "“#1\nGrandpa” and"),
        ("1 aring: eager", "¹ raring: eager"),
    ),
    "nysed-ela-2018-g6-stimulus-22-28": (
        ("red raindrop on her forehead!", "red raindrop on her forehead¹"),
        (
            "I painted a red raindrop on her forehead: known as a bindi",
            "¹ painted a red raindrop on her forehead: known as a bindi",
        ),
    ),
    "nysed-ela-2018-g6-stimulus-29-35": (
        ("favorite trainers!\nwont", "favorite trainers¹\nwon’t"),
        ("‘trainers: British", "¹ trainers: British"),
        (
            "Be Pe NS\n"
            "ae Blinn. Ne ea aN\n"
            "2. a. ie\n"
            "eds Si a 4\n"
            "This map shows how often lightning strikes different places around the world (darker areas get more).",
            "[Map: An oval world map labels Florida and central Africa. Darker "
            "shading means more frequent lightning, with the darkest areas "
            "concentrated mainly over tropical and equatorial land, including "
            "Florida and central Africa. Caption: “This map shows how often "
            "lightning strikes different places around the world (darker areas get "
            "more).”]",
        ),
    ),
    "nysed-ela-2017-g8-stimulus-22-28": (
        ("chipotle.’’", "chipotle.”"),
        ("painfully hot!’’", "painfully hot!”"),
        ("of that, please!’’", "of that, please!”"),
        ("“hot.’’", "“hot.”"),
    ),
    "nysed-ela-2018-g7-stimulus-22-28": (
        ("“T do not mean", "“I do not mean"),
    ),
    "nysed-ela-2018-g8-stimulus-1-7": (
        ("“T feel I’m going", "“I feel I’m going"),
    ),
    "nysed-ela-2021-g7-stimulus-15-21": (
        ("“IT do not mean", "“I do not mean"),
    ),
    "nysed-ela-2018-g8-stimulus-15-21": (
        ("“T did it?’", "“I did it?”"),
    ),
    "nysed-ela-2019-g6-stimulus-29-35": (
        ("9 The Egyptians wrote as many different kinds of things as we do. ‘They wrote", "9 The Egyptians wrote as many different kinds of things as we do. They wrote"),
        ("Read these\nwords, from a father to his son. ‘They were written", "Read these\nwords, from a father to his son. They were written"),
        (
            "26 letters!\n4 Scribes also had to know",
            "26 letters!\n\n[Photograph: Rows of many Egyptian hieroglyphic "
            "signs are carved into a stone surface. Caption: “A photograph of an "
            "ancient Egyptian language.”]\n\n4 Scribes also had to know",
        ),
        (
            "I will make you love writing more than your mother.\n"
            "I will present its beauties to you.\n\n"
            "Now it is greater than any trade.\n\n"
            "There is nothing like it in the land.\n\n"
            "I have seen the metal worker at his labor...\n\n"
            "At the opening of his furnace,\n\n"
            "With fingers like claws of a crocodile.\n\n"
            "He stinks more than a fish.\n\n"
            "The gardener carries a yoke.\n\n"
            "He works himself to death.\n\n"
            "I'll speak of the fisherman also...\n\n"
            "He labors on the river,\n\n"
            "Mingling with the crocodiles.\n\n"
            "So if you know writing, it will go better for you.\n"
            "Than any other profession I’ve told you about.\n"
            "A day in the school room is excellent for you.\n\n"
            "It is for eternity, its works are (like) stone.",
            "[Text box: A father’s letter to his son reads: “I will make you love "
            "writing more than your mother. I will present its beauties to you. Now "
            "it is greater than any trade. There is nothing like it in the land. I "
            "have seen the metal worker at his labor. At the opening of his furnace, "
            "with fingers like claws of a crocodile, he stinks more than a fish. The "
            "gardener carries a yoke. He works himself to death. I’ll speak of the "
            "fisherman also. He labors on the river, mingling with the crocodiles. "
            "So if you know writing, it will go better for you than any other "
            "profession I’ve told you about. A day in the school room is excellent "
            "for you. It is for eternity, its works are (like) stone.”]",
        ),
    ),
    "nysed-ela-2021-g6-stimulus-8-14": (
        (
            "Activities Commonly Chosen by Children\n"
            "90 @ Just playing or hanging out\n"
            "84%\n\n"
            "< P| in Listening to music, watching\n"
            "‘ee 70 movies, or using electronic\n"
            "A | po devices\n"
            "i)\n"
            "E 50 Z Bird watching, wildlife\n"
            "4 P| viewing, etc.\n"
            "ol vn\n"
            "A=\n"
            "= 30 Hiking, camping, fishing etc.\n"
            "Z| =\n"
            "= 20\n"
            "“tL\n\n"
            "ol _\n\n"
            "Activity\n"
            "1[M: Instant message (such as a phone text message or online chat)",
            "[Chart: A bar graph titled “Activities Commonly Chosen by Children” "
            "has a vertical axis labeled “Total Children Participating (%)” and "
            "shows: just playing or hanging out, 84%; listening to music, watching "
            "movies, or using electronic devices, 65.3%; bird watching, wildlife "
            "viewing, etc., 30.7%; and hiking, camping, fishing, etc., 29%.]\n"
            "Footnote 1: IM means instant message, such as a phone text message or "
            "online chat.",
        ),
    ),
    "nysed-ela-2021-g6-stimulus-1-7": (
        ("just pulled up”", "just pulled up.”"),
        ("raring!\nto go”", "raring¹\nto go.”"),
        ("riding in the boat?", "riding in the boat.”"),
        ("Id even settle", "I’d even settle"),
        ("last\none, said Grandpa", "last\none,” said Grandpa"),
        ("“#1\nGrandpa’ and", "“#1\nGrandpa” and"),
        ("‘raring: eager", "¹ raring: eager"),
    ),
    "nysed-ela-2021-g6-stimulus-15-21": (
        ("red raindrop on her forehead!", "red raindrop on her forehead¹"),
        (
            "1 painted a red raindrop on her forehead: known as a bindi",
            "¹ painted a red raindrop on her forehead: known as a bindi",
        ),
    ),
    "nysed-ela-2021-g6-stimulus-22-28": (
        ("If\nyoure caught", "If\nyou’re caught"),
        ("favorite trainers!\nwont", "favorite trainers¹\nwon’t"),
        ("‘trainers: British", "¹ trainers: British"),
        (
            "\\ ; F 3 > aed 4\n"
            "This map shows how often lightning strikes different places around the world (darker areas get more).",
            "[Map: An oval world map labels Florida and central Africa. Darker "
            "shading means more frequent lightning, with the darkest areas "
            "concentrated mainly over tropical and equatorial land, including "
            "Florida and central Africa. Caption: “This map shows how often "
            "lightning strikes different places around the world (darker areas get "
            "more).”]",
        ),
    ),
    "nysed-ela-2022-g5-stimulus-1-7": (
        (
            "EExxcceerrpptt ffrroomm AA SSccrraapp aanndd aa RRoobbee",
            "Excerpt from A Scrap and a Robe",
        ),
    ),
    "nysed-ela-2022-g5-stimulus-8-14": (
        (
            "““JJaanneett GGuutthhrriiee:: LLaaddyy iinn tthhee FFaasstt\n"
            "LLaannee”” ffrroomm PPrroofifilleess iinn SSppoorrttss CCoouurraaggee",
            "“Janet Guthrie: Lady in the Fast Lane” from Profiles in Sports Courage",
        ),
    ),
    "nysed-ela-2022-g6-stimulus-1-7": (
        (
            "EExxcceerrpptt ffrroomm IInnssiiggnniifificcaanntt EEvveennttss iinn tthhee\n"
            "LLiiffee ooff aa CCaaccttuuss",
            "Excerpt from Insignificant Events in the Life of a Cactus",
        ),
        ("vendors11", "vendors¹"),
        ("saguaro22", "saguaro²"),
        ("11vveennddoorrss:: people who sell things", "¹ vendors: people who sell things"),
        (
            "22ssaagguuaarroo:: a kind of cactus that is often 15 feet tall, and can sometimes grow much taller",
            "² saguaro: a kind of cactus that is often 15 feet tall, and can sometimes grow much taller",
        ),
    ),
    "nysed-ela-2022-g6-stimulus-8-14": (
        (
            "EExxcceerrpptt ffrroomm ThThee BBaatt SScciieennttiissttss",
            "Excerpt from The Bat Scientists",
        ),
        ("FFrroomm NNaattuurree BBooyy ttoo BBaattmmaann", "From Nature Boy to Batman"),
        (
            "FFrroomm SScciieennttiisstt ttoo CCoonnsseerrvvaattiioonniisstt",
            "From Scientist to Conservationist",
        ),
    ),
    "nysed-ela-2022-g6-stimulus-22-28": (
        (
            "EExxcceerrpptt ffrroomm GGrreeeennggllaassss HHoouussee",
            "Excerpt from Greenglass House",
        ),
        ("watermark:11", "watermark:¹"),
        (
            "11wwaatteerrmmaarrkk:: a faint design placed on paper that can only be read when held up to a light",
            "¹ watermark: a faint design placed on paper that can only be read when held up to a light",
        ),
    ),
    "nysed-ela-2022-g7-stimulus-1-7": (
        (
            "EExxcceerrpptt ffrroomm ThThee LLaasstt WWiilldd PPllaaccee",
            "Excerpt from The Last Wild Place",
        ),
        ("blue skink11", "blue skink¹"),
        ("11sskkiinnkk:: a type of lizard", "¹ skink: a type of lizard"),
    ),
    "nysed-ela-2022-g7-stimulus-8-14": (
        (
            "““SSuussaann BBuuttcchheerr”” ffrroomm LLaaddiieess FFiirrsstt::\n"
            "4400 DDaarriinngg AAmmeerriiccaann WWoommeenn WWhhoo WWeerree\n"
            "SSeeccoonndd ttoo NNoonnee",
            "“Susan Butcher” from Ladies First:\n"
            "40 Daring American Women Who Were\n"
            "Second to None",
        ),
    ),
    "nysed-ela-2022-g8-stimulus-8-14": (
        (
            "EExxcceerrpptt ffrroomm ““ThThee BBeeaaddwwoorrkk”” ffrroomm\n"
            "AAmmeerriiccaann IInnddiiaann SSttoorriieess",
            "Excerpt from “The Beadwork” from\nAmerican Indian Stories",
        ),
        ("satiated11", "satiated¹"),
        ("sportive nymphs22", "sportive nymphs²"),
        ("impudence33", "impudence³"),
        ("11ssaattiiaatteedd:: completely satisfied", "¹ satiated: completely satisfied"),
        (
            "22ssppoorrttiivvee nnyymmpphhss:: playful creatures of the woods",
            "² sportive nymphs: playful creatures of the woods",
        ),
        ("33iimmppuuddeennccee:: nerve", "³ impudence: nerve"),
    ),
    "nysed-ela-2022-g8-stimulus-22-28": (
        (
            "EExxcceerrpptt ffrroomm ThThee GGuueesstt CCaatt",
            "Excerpt from The Guest Cat",
        ),
        ("extolling11", "extolling¹"),
        ("talisman22", "talisman²"),
        ("ubiquitous33", "ubiquitous³"),
        ("11eexxttoolllliinngg:: praising", "¹ extolling: praising"),
        (
            "22ttaalliissmmaann:: an object thought to bring good luck",
            "² talisman: an object thought to bring good luck",
        ),
        ("33uubbiiqquuiittoouuss:: present everywhere", "³ ubiquitous: present everywhere"),
    ),
    "nysed-ela-2022-g8-stimulus-29-35": (
        (
            "EExxcceerrpptt ffrroomm ThThee CCaallll ooff CCoonneeyy IIssllaanndd",
            "Excerpt from The Call of Coney Island",
        ),
        ("penny arcades,11", "penny arcades,¹"),
        (
            "11ppeennnnyy aarrccaaddeess:: indoor area with amusements such as games and photo booths operated by",
            "¹ penny arcades: indoor area with amusements such as games and photo booths operated by",
        ),
    ),
    "nysed-ela-2022-g5-stimulus-29-35": (
        ("WWhhaatt IIss LLaakkee--EEffffeecctt SSnnooww??", "What Is Lake-Effect Snow?"),
        (
            "Lake-effect snow forms when cold air moves over warm water\n"
            "Heavy snow bands form\n"
            "Clouds grow bigger down wind of the lake\n"
            "Heat and moisture and snow begins to\n"
            "cause clouds to form fall\n"
            "Cold air moves\n"
            "over the warm Clouds form > Clouds grow > Heavy snow falls\n"
            "lake water a\n"
            "Cold Air\n"
            "-_ a : g.\n"
            "Heat and Moisture . ae:\n"
            "Warm Lake Water",
            "[Diagram: Titled “Lake-effect snow forms when cold air moves over "
            "warm water.” Cold-air arrows cross warm lake water; heat and moisture "
            "rise from the lake; clouds form, grow bigger downwind, and snow begins "
            "to fall; then heavy snow bands fall downwind over a house. The printed "
            "sequence is “Clouds form > Clouds grow > Heavy snow falls.”]",
        ),
    ),
    "nysed-ela-2022-g7-stimulus-29-35": (
        ("WWiinndd IInnssttrruummeennttss", "Wind Instruments"),
        (
            "11vvaauuddeevviillllee:: a type of live entertainment that was popular in the early 1900s",
            "vaudeville: a type of live entertainment that was popular in the early 1900s",
        ),
    ),
    "nysed-ela-2023-g6-stimulus-22-26": (
        (
            "Spotting the Ruby-Throated Hummingbird in New York\n"
            "What to Look For When to Look Where to Look\n"
            "(by Region)\n\n"
            "Male: Mid-March through Countryside:\n"
            "Ruby-red throat, which summer: thimble-sized nests in\n"
            "gives the bird its name,| NYC and Long Island ferns, oaks, maples,\n\n"
            "emerald-green head . poplars, pines, spruce\n"
            "and back, white chest Early April through trees\n"
            "summer:\n"
            "Female: Bright green Catskill and southern Neighborhoods:\n"
            "back, white chest region beds of bright flowers,\n"
            "Ane especially red,\n"
            "Mid-April through tube-shaped ones,\n"
            "summer. backyard feeders\n"
            "Central and western NY y '\n"
            "parks\n"
            "Early May through New York City:\n"
            "summer. Wagner Park and\n"
            "Northern New York, g\n"
            "Central Park\n"
            "near Canada\n"
            "\" hover: to remain in one place while flying",
            "[Chart: “Spotting the Ruby-Throated Hummingbird in New York.” What "
            "to look for: males have a ruby-red throat, emerald-green head and "
            "back, and white chest; females have a bright green back and white "
            "chest. When to look by region: New York City and Long Island, "
            "mid-March through summer; Catskill and southern region, early April "
            "through summer; central and western New York, mid-April through "
            "summer; northern New York near Canada, early May through summer. "
            "Where to look: in the countryside, thimble-sized nests in ferns, oaks, "
            "maples, poplars, pines, and spruce trees; in neighborhoods, beds of "
            "bright flowers—especially red, tube-shaped ones—backyard feeders, and "
            "parks; in New York City, Wagner Park and Central Park.]\n"
            "Footnote 1: hover means to remain in one place while flying.",
        ),
    ),
    "nysed-ela-2024-g5-stimulus-22-26": (
        (
            "Spotting New York City Wildlife\n"
            "Riverside Park along the . .\n"
            "Bald Hudson River; Flushing Look high up in the sky or\n"
            "in trees; look for the\n"
            "Eagles Meadows Corona Park in .\n"
            "eagle’s white head.\n"
            "Queens\n"
            "Coney Island Beach in Look for their gray heads\n"
            "Seals Brooklyn; Orchard Beach | bobbing above the water\n"
            "in the Bronx during the winter.\n"
            "Central Park and the Look for dark shapes in\n"
            "Bats Greenbelt on Staten the trees at dawn and\n"
            "Island dusk during the spring.\n"
            "Look in open areas at\n"
            "Van Cortlandt Park in the} dawn and dusk, or look in\n"
            "Coyotes Bronx the snow or mud for their\n"
            "tracks.\n"
            "Look for orange and black\n"
            "Monarch Central Park and wings on or near flowers\n"
            "Butterflies Prospect Park in in September when the\n"
            "Brooklyn monarch butterflies are\n"
            "flying south.",
            "[Chart: “Spotting New York City Wildlife,” with columns for animal, "
            "where, and how to spot it. Bald eagles: Riverside Park along the "
            "Hudson River and Flushing Meadows Corona Park in Queens; look high in "
            "the sky or trees for a white head. Seals: Coney Island Beach in "
            "Brooklyn and Orchard Beach in the Bronx; look for gray heads above the "
            "water in winter. Bats: Central Park and the Greenbelt on Staten "
            "Island; look for dark shapes in trees at dawn and dusk in spring. "
            "Coyotes: Van Cortlandt Park in the Bronx; look in open areas at dawn "
            "and dusk or for tracks in snow or mud. Monarch butterflies: Central "
            "Park and Prospect Park in Brooklyn; look for orange-and-black wings "
            "near flowers during the September migration south.]",
        ),
    ),
    "nysed-ela-2025-g5-stimulus-29-35": (
        (
            "turtles grow a thick layer of leathery skin instead.\n\n"
            "What Shape Is Your Shell?",
            "turtles grow a thick layer of leathery skin instead.\n\n"
            "[Diagram: A turtle is shown from the side. Labels point to the scutes "
            "as plate-like sections across the upper shell, the carapace as the "
            "upper shell, the bridge as the side connection, and the plastron as "
            "the underside or belly of the shell.]\n\n"
            "What Shape Is Your Shell?",
        ),
    ),
    "nysed-ela-2025-g6-stimulus-8-14": (
        ("10 ‘The cryptanalysts", "10 The cryptanalysts"),
        (
            "{ |\n"
            "|\n"
            "A cipher machine similar to the one described in the article.",
            "[Illustration: An open box- or suitcase-shaped cipher machine has a "
            "keyboard and internal rotor and switch components. Caption: “A cipher "
            "machine similar to the one described in the article.”]",
        ),
    ),
    "nysed-ela-2026-g5-stimulus-15-21": (
        ("14 ‘The fungal hyphae", "14 The fungal hyphae"),
        (
            "BS SCALE\n"
            "ee CAP\n"
            "| im - “*\\ ss¢— SPORES\n"
            "GILLS | e\n"
            "MYCELIAL ¢ y\n"
            "(COMPOSED OF\n"
            "HYPHAE) ——>",
            "[Diagram: A mushroom and its underground fungal network are labeled. "
            "Scales cover parts of the cap; spores are released from the gills "
            "beneath the cap; and underground mycelial cords are composed of "
            "hyphae.]",
        ),
    ),
    "nysed-ela-2026-g5-stimulus-1-7": (
        (
            "“She is so not equipped for this.”...",
            "“She is so not equipped for this.” . . .",
        ),
    ),
    "nysed-ela-2026-g5-stimulus-22-27": (
        (
            "Know Before You Go\n"
            "WHERE:\n"
            "Swan Lake Campground, near Snoqualmie Pass,\n"
            "Washington\n"
            "WHEN:\n\n"
            "Snowmobiling: January to March\n"
            "Everything else: Every other month\n"
            "WHAT:\n\n"
            "The state of Washington has a very good\n"
            "snowmobiling trail maintenance program.\n"
            "But to get to the traditional camping spot,\n"
            "Crew 115 must venture a couple of miles\n"
            "off the trail. Don’t try this at home\n"
            "without proper training and preparation.\n"
            "SAFETY FIRST:\n\n"
            "Before you plan a trip, learn the state laws for\n"
            "who can use snowmobiles, where you can\n"
            "use them, and how to become certified\n"
            "as an operator.\n\n"
            "Check all your equipment before you start out.\n"
            "Get the right clothing. Full-faced helmets are\n"
            "often required. Clothing must fit and protect\n"
            "against snow, water, and cold.\n"
            "High-tech headwear, footwear, and\n"
            "gloves are recommended.",
            "[Text box: “Know Before You Go.” Where: Swan Lake Campground near "
            "Snoqualmie Pass, Washington. When: snowmobiling from January to March; "
            "everything else every other month. What: Washington has a good "
            "snowmobiling-trail maintenance program, but Crew 115 travels a couple "
            "of miles off trail to reach its traditional campsite; do not try this "
            "without proper training and preparation. Safety first: before a trip, "
            "learn state laws about who may use snowmobiles, where they may be used, "
            "and how to become certified as an operator; check all equipment; wear "
            "properly fitting clothing that protects against snow, water, and cold; "
            "full-faced helmets are often required; and high-tech headwear, footwear, "
            "and gloves are recommended.]",
        ),
    ),
    "nysed-ela-2026-g5-stimulus-29-35": (
        ("stuff you do”", "stuff you do.”"),
        (
            "“ “Intranet Club’ is boring.”",
            "“‘Intranet Club’ is boring.”",
        ),
        ("“The letter I”", "“The letter I.”"),
        ("“Cool”", "“Cool.”"),
        ("stuff” Mark said", "stuff,” Mark said"),
    ),
    "nysed-ela-2016-g5-stimulus-15-21": (
        ("5 ‘The fox came straight", "5 The fox came straight"),
        ("go-rillllllas,””", "go-rillllllas,”"),
    ),
    "nysed-ela-2013-g4-stimulus-1-5": (
        ("steps to cross the\n\nocean", "steps to cross the\nocean"),
    ),
    "nysed-ela-2014-g3-stimulus-1-4": (
        (
            "season has begun.\nTapping the Trees",
            "season has begun.\n\n[Diagram: A maple tree is split into a sunny "
            "daytime half and a moonlit nighttime half. Arrows show sap moving "
            "up from the roots toward the branches during the day and down toward "
            "the roots at night.]\n\nTapping the Trees",
        ),
        (
            "put a spout into each hole.\n\n7 Some",
            "put a spout into each hole.\n\n[Illustration: A covered metal bucket "
            "hangs beneath a spout inserted into a maple tree trunk, ready to "
            "collect sap.]\n\n7 Some",
        ),
    ),
    "nysed-ela-2014-g3-stimulus-10-16": (
        (
            "Snowshoe Smarts\nSnowshoeing is tough—\nunless you can already\nwalk! "
            "Here are a couple\nof tips:\n• In a group, follow\nthe trail-breaker.\n"
            "• Take turns being the\ntrail-breaker.\n• Going uphill, dig the\nties in.\n"
            "• Going across a hill,\ndig edges in.\n• Dress in layers; you’ll\nget warm.",
            "[Text box: “Snowshoe Smarts” lists five tips: in a group, follow the "
            "trail-breaker; take turns being the trail-breaker; going uphill, dig "
            "the ties in; going across a hill, dig the edges in; and dress in layers "
            "because you will get warm.]",
        ),
        (
            "“Snowshoes spread your weight",
            "[Photograph: Sam kneels in deep snow beside two snowshoes. Each "
            "snowshoe has a large, flat, elongated oval frame crossed by a web of "
            "cord.]\n\n“Snowshoes spread your weight",
        ),
    ),
    "nysed-ela-2014-g4-stimulus-12-17": (
        ("saying that my\n\ngrandfather", "saying that my\ngrandfather"),
        (
            "Excerpt from Lawn Boy\nby Gary Paulsen\n1 Okay.",
            "Excerpt from Lawn Boy\nby Gary Paulsen\n\n[Illustration: A boy wearing "
            "sunglasses sits upright on a riding lawn mower with his hands on the "
            "steering controls; motion marks appear around the mower.]\n\n1 Okay.",
        ),
    ),
    "nysed-ela-2016-g3-stimulus-1-6": (
        ("by Wendi Silvano\n1 Inez", "by Wendi Silvano\n\n[Illustration: Three girls investigate a smelly pillow and pair of slippers in a bedroom.]\n\n1 Inez"),
        ("6 “I’m not joking,’", "6 “I’m not joking,”"),
        ("15 “Let's see", "15 “Let’s see"),
        ("26 “Ha, ha,”", "26 “Ha, ha,”"),
        ("34 “And look—brown hairs on my slippers!” said Izzy. “I suspect", "34 “And look—brown hairs on my slippers!” said Izzy. “I suspect"),
        ("48 Ivy peeked", "48 Ivy peeked"),
        ("52 “Come on, Baxter,’", "52 “Come on, Baxter,”"),
        ("That’s why I like to lie on it”", "That’s why I like to lie on it.”"),
        ("They’re all crushed from Baxter\nrolling in them”", "They’re all crushed from Baxter\nrolling in them.”"),
        ("Let's get you un-stinked”", "Let’s get you un-stinked.”"),
    ),
    "nysed-ela-2016-g3-stimulus-13-18": (
        ("6 “It wasnt me,’", "6 “It wasn’t me,”"),
        ("7 “Tt wasn't me either,’", "7 “It wasn’t me either,”"),
        ("14 “T remember,’", "14 “I remember,”"),
        ("\nie “He would hide", "\n17 “He would hide"),
        ("\n17 “That chair is not ugly!", "\n18 “That chair is not ugly!"),
        ("\n18 “OK, Mom,’", "\n19 “OK, Mom,”"),
        ("23 “T still don't", "23 “I still don’t"),
        ("I wonder what\nhappened to them”", "I wonder what\nhappened to them.”"),
        ("behind it”\nShe hopped", "behind it.”\nShe hopped"),
        ("plays with those” She laughed", "plays with those.” She laughed"),
        ("funny when you think about it”", "funny when you think about it.”"),
        ("wash cloth. ‘The leftover", "wash cloth. The leftover"),
        ("looked up at her.\n\nShe leaned", "looked up at her.\nShe leaned"),
    ),
    "nysed-ela-2016-g3-stimulus-25-31": (
        ("Auto means “self?” Mobile means\n“moving.", "Auto means “self.” Mobile means\n“moving.”"),
        ("14 ‘The first gas-powered", "14 The first gas-powered"),
        ("most were slow. ‘The New York City police", "most were slow. The New York City police"),
        ("Americas roads", "America’s roads"),
    ),
    "nysed-ela-2016-g4-stimulus-1-6": (
        ("by Patricia MacLachlan\n\n1 ‘The streets", "by Patricia MacLachlan\n\n[Illustration: Minna sits in a chair and plays her cello.]\n\n1 The streets"),
        ("16 “Well, said Porch", "16 “Well,” said Porch"),
        ("book youre reading", "book you’re reading"),
        ("22 “Tll never", "22 “I’ll never"),
        ("24 Minna couldn’ help", "24 Minna couldn’t help"),
        ("“You will” He tapped", "“You will.” He tapped"),
        ("ask him that yourself,”", "ask him that yourself.”"),
        ("much more like...”", "much more like . . .”"),
    ),
    "nysed-ela-2016-g4-stimulus-13-18": (
        ("3 The rainforest was a jungle full of tropical plants, wild animals, and creepy\ncrawlies. It was also home to the small cacao tree that grew strange, bright pods.", "3 The rainforest was a jungle full of tropical plants, wild animals, and creepy\ncrawlies. It was also home to the small cacao tree that grew strange, bright pods.\n\n[Photograph: Whole and cut-open cacao pods reveal the pale pulp and beans inside.]"),
        ("\nd Monkeys knew", "\n4 Monkeys knew"),
        ("\n4 They liked", "\n5 They liked"),
        ("\n5 Then they spat", "\n6 Then they spat"),
        ("\n6 One day, a farmer", "\n7 One day, a farmer"),
        ("\n7 But then, some villagers", "\n8 But then, some villagers"),
        ("\n8 Over the next few months", "\n9 Over the next few months"),
        ("\nPe) Today,", "\n22 Today,"),
        ("\n22 When the Mayans", "\n23 When the Mayans"),
        ("Mayan Chocolate\nWant to know what spicy Mayan chocolate tasted like?\nStir ; teaspoon of cinnamon and a pinch of cloves or chili powder\ninto a cup of hot chocolate or chocolate milk.", "[Sidebar: Mayan Chocolate — Want to know what spicy Mayan chocolate tasted like? Stir 1/2 teaspoon of cinnamon and a pinch of cloves or chili powder into a cup of hot chocolate or chocolate milk.]"),
        ("banana leaves . .. then", "banana leaves . . . then"),
        ("over a fire... ground", "over a fire . . . ground"),
        ("into a paste... and", "into a paste . . . and"),
        ("spices. ‘They called", "spices. They called"),
        ("\n14 ‘The Spanish", "\n14 The Spanish"),
    ),
    "nysed-ela-2016-g4-stimulus-25-31": (
        ("1 “Youre serious", "1 “You’re serious"),
        ("\n. “If we're lucky", "\n2 “If we’re lucky"),
        ("\n2 Sarah looked", "\n3 Sarah looked"),
        ("\n3 Sarah felt", "\n4 Sarah felt"),
        ("\n4 “Tl get ready,”", "\n5 “I’ll get ready,”"),
        ("\n5 “This is what we'll do,’", "\n6 “This is what we’ll do,”"),
        ("“TIl take out the hook", "“I’ll take out the hook"),
        ("Then Ill release", "Then I’ll release"),
        ("in front of him. Hes tired", "in front of him. He’s tired"),
        ("if we move\n\nslowly.", "if we move\nslowly."),
        ("\nfs “Yes, Granddad,’", "\n7 “Yes, Granddad,”"),
        ("\n12 ‘The tiger shark", "\n12 The tiger shark"),
        ("felt so... bare and... unprotected", "felt so . . . bare and . . . unprotected"),
    ),
    "nysed-ela-2017-g3-stimulus-7-12": (
        (
            "DISCOVERING THE NIGHT SKY\nplanetarium= a building\n1 The lights in the planetarium dimmed. Nine-\nor room in which images\nyear-old Neil sat in the darkness and stared up at\nof stars, planets, and\nthe huge domed ceiling. The audience grew silent.\nconstellations are shown\nA voice boomed, \"We are now in the universe, and on a high, curved ceiling\nhere are the stars:'",
            "DISCOVERING THE NIGHT SKY\n1 The lights in the planetarium dimmed. Nine-year-old Neil sat in the darkness and stared up at the huge domed ceiling. The audience grew silent. A voice boomed, “We are now in the universe, and here are the stars.”\n\n[Sidebar: planetarium = a building or room in which images of stars, planets, and constellations are shown on a high, curved ceiling.]",
        ),
        ("lights ofNew York City", "lights of New York City"),
        ("part ofa show", "part of a show"),
        (
            "7 Soon Neil wanted a bigger telescope to learn\nmore about astronomy. But a more powerful astronomy = the scientific\nstudy of stars, planets, and\ntelescope cost two hundred dollars. Neil's\nother objects in outer space\nparents didn't have a lot ofextra money. So Neil\nstarted a business walking dogs for people who\nlived in his building.",
            "7 Soon Neil wanted a bigger telescope to learn more about astronomy. But a more powerful telescope cost two hundred dollars. Neil’s parents didn’t have a lot of extra money. So Neil started a business walking dogs for people who lived in his building.\n\n[Sidebar: astronomy = the scientific study of stars, planets, and other objects in outer space.]",
        ),
        ("pair ofbinoculars", "pair of binoculars"),
        ("roof ofhis building", "roof of his building"),
        ("halfof the telescope", "half of the telescope"),
        ("photos ofthe stars", "photos of the stars"),
        ("age ofeleven", "age of eleven"),
        ("roofofhis apartment", "roof of his apartment"),
        ("theywere", "they were"),
    ),
    "nysed-ela-2017-g3-stimulus-19-24": (
        ("Hayley>s stomach", "Hayley’s stomach"),
        (
            "3 There had been some rumors that the talent\ncutbacks = less money\nshow would have to be canceled due to cutbacks.\navailable for spending\nBut somehow it had worked out, and now Hayley\nwaited backstage, softly strumming her uke.",
            "3 There had been some rumors that the talent show would have to be canceled due to cutbacks. But somehow it had worked out, and now Hayley waited backstage, softly strumming her uke.\n\n[Sidebar: cutbacks = less money available for spending.]",
        ),
        (
            "10 Finally, the MC announced Hayley. She walked out\nI\nto the front ofthe stage. She stood in front ofthe mic mic\n=\nmicrophone\nthe way Mr. Y told her to.",
            "10 Finally, the MC announced Hayley. She walked out to the front of the stage. She stood in front of the mic the way Mr. Y told her to.\n\n[Sidebar: mic = microphone.]",
        ),
        ("12 Then the spotlight came on. She took a deep breath, and suddenly all ofher\nbutterflies flew away. She grinned. She tossed her head, making her curls dance.\nBring it on! She was ready!", "12 Then the spotlight came on. She took a deep breath, and suddenly all of her\nbutterflies flew away. She grinned. She tossed her head, making her curls dance.\nBring it on! She was ready!\n\n[Illustration: Hayley plays a ukulele at center stage beneath a “Bridgewater Talent Show” banner while the audience cheers.]"),
        ("I'll teach you to plaY:'", "I’ll teach you to play.”"),
        ("17 \"But I don't have a band;' she said.", "17 “But I don’t have a band,” she said."),
        ("18 \"Start one:' Skeeter advised.", "18 “Start one,” Skeeter advised."),
        ("19 \"Okay;' said Hayley. \"Anyone", "19 “Okay,” said Hayley. “Anyone"),
    ),
    "nysed-ela-2017-g3-stimulus-25-31": (
        ("Stories ofAmazing", "Stories of Amazing"),
        ("sound ofour voices", "sound of our voices"),
        ("ahead ofhim", "ahead of him"),
        ("even ifthey stood", "even if they stood"),
        ("treats (scraps ofchicken", "treats (scraps of chicken"),
        ("Page2 Book 2", ""),
        ("Book2 Page 3", ""),
        (
            "3 \"He would sit and stare at the concrete walls;' Kathryn said. ''And when he\ndid turn toward our voices, he would follow the sound of our voices. But not our\nmovements:'",
            "3 “He would sit and stare at the concrete walls,” Kathryn said. “And when he\ndid turn toward our voices, he would follow the sound of our voices. But not our\nmovements.”",
        ),
        ('injury. "We just don\'t know', 'injury. “We just don’t know'),
        ("condition;' Kathryn said.", "condition,” Kathryn said."),
        ('11 "He was roughing', '11 “He was roughing'),
        (
            "and hit it:' Kathryn said. \"We kept thinking, 'you have to slow down: \" But",
            "and hit it,” Kathryn said. “We kept thinking, ‘you have to slow down.’ ” But",
        ),
        (
            "12 \"We decided to start marking the fence with peppermint;' Kathryn explained.",
            "12 “We decided to start marking the fence with peppermint,” Kathryn explained.",
        ),
        (
            "\"He would know when he smelled it, he should slow down. The peppermint\nmarked the borders of his space:'",
            "“He would know when he smelled it, he should slow down. The peppermint\nmarked the borders of his space.”",
        ),
        (
            "\"He has a great attitude;' Kathryn says. \"Things haven't been easy for him.\nBut he still comes up to the fence happily chuffling:'",
            "19 “He has a great attitude,” Kathryn says. “Things haven’t been easy for him.\nBut he still comes up to the fence happily chuffling.”",
        ),
        (
            "17 He chuffled in their direction to get them to answer.\nHe wanted to hear if he knew their voices. He wanted\nto know who they were.\n18 Nitro, the blind tiger, has become a Rescue\nfavorite. Volunteers guide people through Carolina\nTiger Rescue once a week. They never miss a stop\nat Nitro's cage. They tell his story and give him little\nDID YOU KNOW?\nWhat's a chuffle? It's the\nsound a tiger makes\nwhen it sees or smells a\nfriend. It sounds like a\npurr with a tiny cough.\ntreats (scraps of chicken or beef). Nitro never disappoints.",
            "17 He chuffled in their direction to get them to answer. He wanted to hear if he knew their voices. He wanted to know who they were.\n\n[Sidebar: Did you know? A chuffle is the sound a tiger makes when it sees or smells a friend. It sounds like a purr with a tiny cough.]\n\n18 Nitro, the blind tiger, has become a Rescue favorite. Volunteers guide people through Carolina Tiger Rescue once a week. They never miss a stop at Nitro’s cage. They tell his story and give him little treats (scraps of chicken or beef). Nitro never disappoints.",
        ),
    ),
    "nysed-ela-2017-g4-stimulus-1-6": (
        ("3 Stunt performers perform aerial\nacrobatics in circuses or dangerous\nstunts for the movies. Circus performers\ncan swing on the flying trapeze high\nabove the audience. Stunt actors can\ncrash speeding cars in movie stunts.", "3 Stunt performers perform aerial\nacrobatics in circuses or dangerous\nstunts for the movies. Circus performers\ncan swing on the flying trapeze high\nabove the audience. Stunt actors can\ncrash speeding cars in movie stunts.\n\n[Photograph: Two circus performers fly between trapezes high above the ground.]"),
    ),
    "nysed-ela-2017-g4-stimulus-19-24": (
        ("Kids who live on Ali’ block", "Kids who live on Ali’s block"),
        ("1 “T had the most", "1 “I had the most"),
        ("“As soon as | got", "“As soon as I got"),
        ("I wrote this note to myself, just\nso I wouldn't forget. ’'m embarrassed", "I wrote this note to myself, just\nso I wouldn’t forget. I’m embarrassed"),
        ("4 ““M? is for mystery,’", "4 “‘M’ is for mystery,”"),
        ("8 “Mee”", "8 “Me?”"),
        (
            "11 Ms. Snoops placed the disk, the nails, and the sock in a separate pile.\n“These are common household items,” she said. She picked up the scratched\nmetal disk. “This is part of a glass preserve jar. Everyone put up fruits and\nvegetables in the old days. And if they were lucky to\nh ; . marmalade = a sweet\nave orange trees in their yards, they made marmalade. | . ;\nbe the onl d who still h jelly that contains\nI may be the only one around who still puts up her own | pieces of fruit\npreserves, however.” She tapped on the iron nail. “A\nnail is just a nail. And the sock probably fell from an\n. . . . puts up = stores\nold-fashioned clothesline on a windy day. No particular for later use\nmemories come to mind about these articles. Hmmm...\nBut this is interesting.”\npreserves = a sweet\n\n12 She held up the icy-blue stone. It twinkled in the food made of fruit\nsunlight from the window. “I would bet dollars to cooked in sugar\ndoughnuts this was one of Pug’s stones. He collected",
            "11 Ms. Snoops placed the disk, the nails, and the sock in a separate pile.\n“These are common household items,” she said. She picked up the scratched\nmetal disk. “This is part of a glass preserve jar. Everyone put up fruits and\nvegetables in the old days. And if they were lucky to have orange trees in their\nyards, they made marmalade. I may be the only one around who still puts up her\nown preserves, however.” She tapped on the iron nail. “A nail is just a nail. And\nthe sock probably fell from an old-fashioned clothesline on a windy day. No\nparticular memories come to mind about these articles. Hmmm . . . But this is\ninteresting.”\n\n[Sidebar: marmalade = a sweet jelly that contains pieces of fruit; puts up = stores for later use; preserves = a sweet food made of fruit cooked in sugar.]\n\n12 She held up the icy-blue stone. It twinkled in the sunlight from the window.\n“I would bet dollars to doughnuts this was one of Pug’s stones. He collected",
        ),
        (
            "16 “T used to love the old stories when I was your age,” said Ms. Snoops. “I\nwould pick up bits and pieces, do some digging, metaphorically = comparing\nand fill in the holes myself, metaphorically one thing to another to\nspeaking” help explain something",
            "16 “I used to love the old stories when I was your age,” said Ms. Snoops. “I\nwould pick up bits and pieces, do some digging, and fill in the holes myself,\nmetaphorically speaking.”\n\n[Sidebar: metaphorically = comparing one thing to another to help explain something.]",
        ),
        (
            "19 . m i ctually P lanning on jecoming he hsh archaeologist = a scientist\narchaeologist, not a writer, Ali said. Although she | Wno studies objects from\nhad to admit, sometimes making things up was a the past to understand\nlot more fun than sticking to the facts. ancient peoples and\n\n20 “No reason you couldn't be both,” said how they lived",
            "19 “I’m actually planning on becoming an archaeologist, not a writer,” Ali said.\nAlthough she had to admit, sometimes making things up was a lot more fun\nthan sticking to the facts.\n\n[Sidebar: archaeologist = a scientist who studies objects from the past to understand ancient peoples and how they lived.]\n\n20 “No reason you couldn’t be both,” said",
        ),
        ("Itis! Shirley", "It is! Shirley"),
    ),
    "nysed-ela-2017-g4-stimulus-25-31": (
        ("you'I’ll get", "you’ll get"),
        ("minytes", "minutes"),
        ("SXETCISES", "exercises"),
        (
            "2 “Running a mile is a great accomplishment—no matter how long it takes. But\nto perform your best in the mile run, and to feel good doing it, you really need to\nprepare properly,’ says Larry Greene. He\nis an exercise science expert, a former Fun Run\nprofessional distance runner and coach, | To make your run more fun,\nand a coauthor of Training for Young add a silly challenge after\nDistance Runners. each lap. For example, run\n\n3 One way to start running is to join one lap, and then stop and\na school team or a local running club dance like a rock star fora\nthat has a good coach, advises Greene. minute. Then continue\nA coach can teach you correct running running. After your second\nform—that’s how you hold your body lap, pretend you are a\nand move your arms and legs. Good form | Monkey climbing a tree.\nis important for avoiding injuries and\ndoing your best, Greene says, but it’s not Come up with new challenges\nsomething you can learn completely on to do after each lap. What are\nyour own. A coach can also remind you to | Some other goofy things you\npace yourself. “If you start too fast, you'll +| Could do after each lap? What\nhave to slow down or stop due to fatigue” | are some ways you can add\nhe explains. “If you start too slowly, you other types of exercise\nmight not achieve your time goal” between each lap?",
            "2 “Running a mile is a great accomplishment—no matter how long it takes. But\nto perform your best in the mile run, and to feel good doing it, you really need to\nprepare properly,” says Larry Greene. He is an exercise science expert, a former\nprofessional distance runner and coach, and a coauthor of Training for Young\nDistance Runners.\n\n3 One way to start running is to join a school team or a local running club that\nhas a good coach, advises Greene. A coach can teach you correct running\nform—that’s how you hold your body and move your arms and legs. Good form\nis important for avoiding injuries and doing your best, Greene says, but it’s not\nsomething you can learn completely on your own. A coach can also remind you to\npace yourself. “If you start too fast, you’ll have to slow down or stop due to fatigue,”\nhe explains. “If you start too slowly, you might not achieve your time goal.”\n\n[Text box: Fun Run — To make your run more fun, add a silly challenge after each lap. For example, run one lap, stop and dance like a rock star for a minute, then continue running. After your second lap, pretend you are a monkey climbing a tree. Come up with new challenges after each lap, including goofy activities or other types of exercise.]",
        ),
        (
            "4 The library and the Internet can ; _\nimprove your running. “When I First Place Finish!\nfirst started competing in track and Demian L. started running\ncross country at age 12, I benefited about a year and a half ago\nso much from reading... about the at his school in Brooklyn, N.Y.,\nsports,” Greene says. “Learn as much and then he joined another\nas you can by reading running books, running program, called the\nmagazines, and Web site articles.” Mighty Milers. He’s come a\nStart With Short Distances long Way. This past Spring,\n\nDemian qualified for a\n\n5 To train for a mile run, start by national running event: the\nrunning a short distance, such as USA Track and Field National\none-quarter mile. Over the next few Youth Indoor Track and Field\nweeks, slowly increase the distance by Championships in Chicago.\none-eighth or one-quarter of a mile at Demian, now in fifth grade,\na time. That gives your body time to took first place in the\nadjust to each new challenge. (It can 1,500-meter race for his age\nalso lower your risk of injury.) Don’t group. He ran the distance,\nforget to congratulate yourself after which is nearly 1 mile, in 5\nyou complete each new distance—with | minutes and 44 seconds. That\na big gulp of water. is superfast! “It felt really\nStay Safe good and was a big\n\n6 If you ever feel too tired to keep confidence builder,” he says.\ngoing, stop. “Don’t push yourself when To train for the race, Demian\nrunning becomes painful,” Greene ran three times a week and\nsays. And never run outside alone— did stretching exercises and\nhave a workout partner who will run other sports. He likes the way\nwith you. Warm up, stretch, and cool running keeps him fit and\ndown together. Check each other's feeling good. “Running\nposture as well as your running form. makes me happy!” he says.\nHaving someone else watch you run\nwill help you make sure you are running both safely and efficiently. It helps to\npass the time too!",
            "4 The library and the Internet can improve your running. “When I first started\ncompeting in track and cross country at age 12, I benefited so much from\nreading . . . about the sports,” Greene says. “Learn as much as you can by reading\nrunning books, magazines, and Web site articles.”\n\nStart With Short Distances\n\n5 To train for a mile run, start by running a short distance, such as one-quarter\nmile. Over the next few weeks, slowly increase the distance by one-eighth or\none-quarter of a mile at a time. That gives your body time to adjust to each new\nchallenge. (It can also lower your risk of injury.) Don’t forget to congratulate\nyourself after you complete each new distance—with a big gulp of water.\n\nStay Safe\n\n6 If you ever feel too tired to keep going, stop. “Don’t push yourself when running\nbecomes painful,” Greene says. And never run outside alone—have a workout\npartner who will run with you. Warm up, stretch, and cool down together. Check\neach other’s posture as well as your running form. Having someone else watch\nyou run will help you make sure you are running both safely and efficiently. It\nhelps to pass the time too!\n\n[Text box: First Place Finish! — Demian L. started running about a year and a half ago at his school in Brooklyn, New York, then joined the Mighty Milers. He qualified for a national event and, as a fifth grader, won the 1,500-meter race for his age group in 5 minutes 44 seconds. He trained three times a week, stretched, and did other sports. He says running keeps him fit, feels good, and makes him happy.]",
        ),
        (
            "[Text box: Fun Run — To make your run more fun, add a silly challenge after each lap. For example, run one lap, stop and dance like a rock star for a minute, then continue running. After your second lap, pretend you are a monkey climbing a tree. Come up with new challenges after each lap, including goofy activities or other types of exercise.]",
            "[Text box: Fun Run — To make your run more fun, add a silly challenge after each lap. For example, run one lap, and then stop and dance like a rock star for a minute. Then continue running. After your second lap, pretend you are a monkey climbing a tree. Come up with new challenges to do after each lap. What are some other goofy things you could do after each lap? What are some ways you can add other types of exercise between each lap?]",
        ),
        (
            "[Text box: First Place Finish! — Demian L. started running about a year and a half ago at his school in Brooklyn, New York, then joined the Mighty Milers. He qualified for a national event and, as a fifth grader, won the 1,500-meter race for his age group in 5 minutes 44 seconds. He trained three times a week, stretched, and did other sports. He says running keeps him fit, feels good, and makes him happy.]",
            "[Text box: First Place Finish! — Demian L. started running about a year and a half ago at his school in Brooklyn, N.Y., and then he joined another running program, called the Mighty Milers. He’s come a long way. This past spring, Demian qualified for a national running event: the USA Track and Field National Youth Indoor Track and Field Championships in Chicago. Demian, now in fifth grade, took first place in the 1,500-meter race for his age group. He ran the distance, which is nearly 1 mile, in 5 minutes and 44 seconds. That is superfast! “It felt really good and was a big confidence builder,” he says. To train for the race, Demian ran three times a week and did stretching exercises and other sports. He likes the way running keeps him fit and feeling good. “Running makes me happy!” he says.]",
        ),
    ),
    "nysed-ela-2018-g3-stimulus-1-6": (
        ("what theyre saying", "what they’re saying"),
        ("13 “Three, he answers.", "13 “Three,” he answers."),
        ("14 Irene praises him again. “Good boy, good birdie,” she says as she hands him\nthe yellow key to play with.", "14 Irene praises him again. “Good boy, good birdie,” she says as she hands him\nthe yellow key to play with.\n\n[Photograph: Alex the parrot stands beside Dr. Irene Pepperberg while she works with him using objects on a tray.]"),
        ("26 “T love you,”", "26 “I love you,”"),
        ("25 “Bye, she responds.", "25 “Bye,” she responds."),
    ),
    "nysed-ela-2018-g3-stimulus-19-24": (
        ("you'I’ll get", "you’ll get"),
        ("20 “You can keep it,” said Robby. “Tll", "20 “You can keep it,” said Robby. “I’ll"),
        ("14 “Stella, your sister is waiting, her mother called again.", "14 “Stella, your sister is waiting,” her mother called again."),
        ("“We're leaving””", "“We’re leaving.”"),
        ("Maybe you can make it fly”", "Maybe you can make it fly.”"),
        ("See you next weekend, Stella”", "See you next weekend, Stella.”"),
        ("complicated to fly,”", "complicated to fly.”"),
    ),
    "nysed-ela-2018-g4-stimulus-7-12": (
        (
            "12 “Most people will never see a snow leopard, yet it has a right to exist,’ Dr. Kyle\nMcCarthy says. “It’s too magnificent to think about losing.”\nTHREATS TO SNOW LEOPARDS",
            "12 “Most people will never see a snow leopard, yet it has a right to exist,” Dr. Kyle\nMcCarthy says. “It’s too magnificent to think about losing.”\n\n[Chart: Threats to snow leopards — Illegal hunting: snow leopards are hunted for fur and bones. Loss of habitat: people and livestock move into snow leopard range. Loss of prey: wild sheep and goats are hunted, and livestock compete for food. Killed by herders: herders kill leopards that eat livestock. Lack of effective protection: their range is large and many countries cannot afford protection. Lack of awareness and support: some herders do not understand snow leopards’ importance to the ecosystem.]\n\nTHREATS TO SNOW LEOPARDS",
        ),
        (
            "THREATS TO SNOW LEOPARDS\n. « Snow leopards are hunted\nIllegal hunting for their fur and bones.\nLoss of habitat ° People and livestock move\ninto snow leopard range.\nFewer prey are available to\nsnow leopards when wild\nsheep and goats are hunted.\nLoss of prey « Livestock compete with the\nwild sheep and goats for\nfood and the number of wild\nanimals is reduced.\ne Sheep and goat herders kill\nKilled by herders the leopards when the\nleopards eat livestock.\ne The areas in which the\nsnow leopards live are too\nLack of effective protection large to protect.\ne Many countries cannot\nafford to pay for protection.\n¢ Herders do not understand\nLack of awareness and support} the importance of snow\nleopards to the ecosystem.",
            "",
        ),
    ),
    "nysed-ela-2018-g4-stimulus-19-24": (
        ("\naction\n\n6 “I can", "\n[Sidebar: impelled = moved or driven into action.]\n\n6 “I can"),
        ("shed think", "she’d think"),
    ),
    "nysed-ela-2019-g3-stimulus-7-12": (
        ("(27,760 degrees Celsius). That is five times as hot as the surface of the sun.", "(27,760 degrees Celsius). That is five times as hot as the surface of the sun.\n\n[Diagram: A thermometer compares the average temperature of lightning at 50,000°F with the sun at 10,000°F and Earth at 0–100°F.]"),
        ("expand = make larger", "[Sidebar: expand = make larger.]"),
        ("Forked Lightning Ribbon Lightning\nHeat Lightning Sheet Lightning", "[Illustrations: Forked lightning branches like an upside-down tree; ribbon lightning appears as jagged streaks side by side; heat lightning glows behind distant clouds; sheet lightning lights a cloud as a broad bright area.]"),
    ),
    "nysed-ela-2019-g4-stimulus-13-18": (
        ("controversial = a topic that causes an argument", "[Sidebar: controversial = a topic that causes an argument.]"),
        ("telegraphed = a way to send messages to a faraway place", "[Sidebar: telegraphed = a way to send messages to a faraway place.]"),
        ("competent = capable\nresourceful = skilled at solving problems", "[Sidebar: competent = capable; resourceful = skilled at solving problems.]"),
        ("She reached New\nYork in 4% days.", "She reached New\nYork in 4½ days."),
        (
            "Nellie Bly’s Historic 1888 Trip Around the World in 72 Days\ner ;\nan ’ ra 6.\na » P\n— es s.\nwer” Start v 7 tee\nPacific Ocean acai. .\n. 1. Start: 4. Egypt 8. Japan\n~ Jersey City, NJ. 5. Yemen 9. San Francisco\n\n2. England 6. Singapore 10. End:\n\n3. France 7. China New York",
            "[Map: Nellie Bly’s historic 1888 trip around the world in 72 days starts in Jersey City, New Jersey, and travels in order through England, France, Egypt, Yemen, Singapore, China, Japan, San Francisco, and finally New York.]",
        ),
    ),
    "nysed-ela-2019-g4-stimulus-19-24": (
        (
            "1 King Tiger thought he was 7\nthe greatest tiger in the world. e e. on er > ’\nWhile I do not know if that was ad \"a, aS\ntrue, he was certainly the a : ay :\ngreediest. One day he said to a — a\nhimself, “I wonder if there is ~ ~ fs . Pn ted'\ntasty food nearby on the Island ~ — » ee | J — . & a1\nof Borneo.” ite oAt mses ig acs Oe",
            "1 King Tiger thought he was the greatest tiger in the world. While I do not know if that was true, he was certainly the greediest. One day he said to himself, “I wonder if there is tasty food nearby on the Island of Borneo?”\n\n[Photograph: A small mouse deer stands in a forest clearing.]",
        ),
        ("18 Assoon as", "18 As soon as"),
        ("16 ‘The tigers", "16 The tigers"),
        ("quill = a thick hair with a sharp point", "[Sidebar: quill = a thick hair with a sharp point.]"),
        ("and I will get him”", "and I will get him.”"),
        ("for you to give your\nking”", "for you to give your\nking.”"),
        ("\n10 ‘The whisker", "\n10 The whisker"),
        ("think fast or, or... I", "think fast or, or . . . I"),
    ),
    "nysed-ela-2021-g3-stimulus-1-6": (
        ("skates. They might fit you.”\n\nskates. They might fit you.”", "skates. They might fit you.”"),
    ),
    "nysed-ela-2021-g3-stimulus-7-12": (
        ("(27,760 degrees Celsius). That is five times as hot as the surface of the sun.", "(27,760 degrees Celsius). That is five times as hot as the surface of the sun.\n\n[Diagram: A thermometer compares the average temperature of lightning at 50,000°F with the sun at 10,000°F and Earth at 0–100°F.]"),
        ("expand = make larger", "[Sidebar: expand = make larger.]"),
        ("Forked Lightning Ribbon Lightning\nHeat Lightning Sheet Lightning", "[Illustrations: Forked lightning branches like an upside-down tree; ribbon lightning appears as jagged streaks side by side; heat lightning glows behind distant clouds; sheet lightning lights a cloud as a broad bright area.]"),
    ),
    "nysed-ela-2021-g3-stimulus-13-18": (
        ("by Laurel Sheridan\n\n1 Dad", "by Laurel Sheridan\n\n[Illustration: Two children stand on a dock beside the bay with a bucket, a long-handled net, and bait for catching crabs.]\n\n1 Dad"),
        (
            "15 Paulie hauled up the net with the crab inside, but that crab was all claws\nand those mad pincers were waving all over the place!\n“Look out!” I screamed, but the crab’s big claw already had hold of\n\n16 “Look out!”",
            "15 Paulie hauled up the net with the crab inside, but that crab was all claws\nand those mad pincers were waving all over the place!\n\n16 “Look out!”",
        ),
        (
            "33 We raced to give Dad the crabs.\n“Whoa!” he said. “You caught a lot!”\n\n34 “Whoa!”",
            "33 We raced to give Dad the crabs.\n\n34 “Whoa!”",
        ),
    ),
    "nysed-ela-2021-g4-stimulus-1-6": (
        ("when\nyoure waiting", "when\nyou’re waiting"),
        ("9 When I was five, one of the techs showed me the Space Alpha Text booth, or\nS.A.T. “Practice your letters on this, Jem,’", "9 When I was five, one of the techs showed me the Space Alpha Text booth, or\nS.A.T. “Practice your letters on this, Jem,”"),
        ("The shuttle’s shields\narent", "The shuttle’s shields\naren’t"),
        ("26 “Tt does,”", "26 “It does,”"),
        ("2 Crackle. “The radius. . 2” Crackle.", "2 Crackle. “The radius . . .” Crackle."),
        ("Technicians report to...”", "Technicians report to . . .”"),
        ("\n-Vianna", "\n–Vianna"),
    ),
    "nysed-ela-2021-g4-stimulus-7-12": (
        (
            "12 “Most people will never see a snow leopard, yet it has a right to exist,” Dr. Kyle\nMcCarthy says. “It’s too magnificent to think about losing”\nTHREATS TO SNOW LEOPARDS",
            "12 “Most people will never see a snow leopard, yet it has a right to exist,” Dr. Kyle\nMcCarthy says. “It’s too magnificent to think about losing.”\n\n[Chart: Threats to snow leopards — Illegal hunting: snow leopards are hunted for fur and bones. Loss of habitat: people and livestock move into snow leopard range. Loss of prey: wild sheep and goats are hunted, and livestock compete for food. Killed by herders: herders kill leopards that eat livestock. Lack of effective protection: their range is large and many countries cannot afford protection. Lack of awareness and support: some herders do not understand snow leopards’ importance to the ecosystem.]\n\nTHREATS TO SNOW LEOPARDS",
        ),
        (
            "THREATS TO SNOW LEOPARDS\n. ¢ Snow leopards are hunted\nIllegal hunting for their fur and bones.\nLoss of habitat ° People and livestock move\ninto snow leopard range.\n\ne Fewer prey are available to\nsnow leopards when wild\nsheep and goats are hunted.\n\nLoss of prey e Livestock compete with the\nwild sheep and goats for\nfood and the number of wild\nanimals is reduced.\n\ne Sheep and goat herders kill\n\nKilled by herders the leopards when the\nleopards eat livestock.\n\ne The areas in which the\nsnow leopards live are too\n\nLack of effective protection large to protect.\n\ne Many countries cannot\nafford to pay for protection.\n\n¢ Herders do not understand\n\nLack of awareness and support| the importance of snow\nleopards to the ecosystem.",
            "",
        ),
    ),
    "nysed-ela-2021-g4-stimulus-13-18": (
        ("\naction\n\n6 “I can", "\n[Sidebar: impelled = moved or driven into action.]\n\n6 “I can"),
        ("Kanikiya’ss mother", "Kanikiya’s mother"),
        ("shed think", "she’d think"),
    ),
    "nysed-ela-2022-g3-stimulus-1-6": (
        ("GGeettttiinngg EEvveenn", "Getting Even"),
        ("On the bus ride, Rosa discovered that Kiara was not the quiet girl Rosa\n\n9 On the bus ride", "9 On the bus ride"),
    ),
    "nysed-ela-2022-g3-stimulus-7-12": (
        ("JJuusstt LLiisstteenn", "Just Listen"),
        ("Sound waves travel not only through air but also through water. They\n\n6 Sound waves", "6 Sound waves"),
        (
            "HOW EARS AND HEARING WORK\n\nSound Ear canal\n\nwaves\n\nhe ae\nchange sound\nwaves into\nmessages the brain\ncan understand\n\nEardrum",
            "[Diagram: Sound waves enter the ear canal and vibrate the eardrum. Nerve hairs farther inside the ear change the sound waves into messages the brain can understand.]",
        ),
    ),
    "nysed-ela-2022-g4-stimulus-1-6": (
        ("FFaabbuulloouuss FFaatthheerrss", "Fabulous Fathers"),
        ("survival skills = skills needed to stay alive", "[Sidebar: survival skills = skills needed to stay alive.]"),
        ("SSuucckk ThTheemm UUpp aanndd SSppiitt ThTheemm OOuutt", "Suck Them Up and Spit Them Out"),
        ("EExxccuussee MMee,, II’’vvee GGoott aa FFrroogg iinn mmyy ThThrrooaatt", "Excuse Me, I’ve Got a Frog in My Throat"),
        ("PPiiggggyybbaacckk NNuurrsseerryy", "Piggyback Nursery"),
        ("CCoolldd FFeeeett,, BBiigg HHeeaarrtt", "Cold Feet, Big Heart"),
        ("SSllyy TTeeaacchheerr", "Sly Teacher"),
        ("egg pad. When\n\nshe’s done", "egg pad. When\nshe’s done"),
    ),
    "nysed-ela-2022-g4-stimulus-19-24": (
        ("SShhaarriinngg MMyy SSttoorryy", "Sharing My Story"),
    ),
    "nysed-ela-2023-g3-stimulus-1-6": (
        ("prodded = gently tried to get someone to do something", "[Sidebar: prodded = gently tried to get someone to do something.]"),
        ("centimeter = unit of measure equal to less than 1/2 inch", "[Sidebar: centimeter = unit of measure equal to less than 1/2 inch.]"),
        ("scoffed = said in a way that did not show respect and\nseemed bothered", "[Sidebar: scoffed = said in a way that did not show respect and seemed bothered.]"),
        ("undeniable = certain", "[Sidebar: undeniable = certain.]"),
    ),
    "nysed-ela-2023-g4-stimulus-1-6": (
        ("ourish = wave", "[Sidebar: flourish = wave.]"),
    ),
    "nysed-ela-2023-g4-stimulus-19-23": (
        ("perseverance = the quality that allows s omeone to continue\ntrying to do s omething even though it is dif cult", "[Sidebar: perseverance = the quality that allows someone to continue trying to do something even though it is difficult.]"),
    ),
    "nysed-ela-2023-g4-stimulus-26-31": (
        (
            "PARTS OF A TURKEY\nS Zz\nat KY\nif Wings\nSmall drumstick—G \\\nea\nWishb Sy\nishbone SS a\n—\nBreast bone \\ Large drumstick\nv/",
            "[Diagram: On a turkey, the wishbone is in the upper chest between the two wings, above the breastbone. The small and large drumsticks are in the legs.]",
        ),
        ("leverage = a good hold", "[Sidebar: leverage = a good hold.]"),
    ),
    "nysed-ela-2024-g3-stimulus-13-18": (
        (
            "31 No matter what, you are sure to find many wonderful shapes drifting in\nthe sky.",
            "31 No matter what, you are sure to find many wonderful shapes drifting in\nthe sky.\n\n[Chart: Cloud types — Stratus clouds look like layers and sheets, may cover the sky and block the sun and moon, and are low. Cumulus clouds are puffy and white, may appear alone or in a group, and may be high or low. Cirrus clouds are thin and feathery, are made completely of tiny pieces of ice, and are high. Cumulonimbus clouds are tall and gray, bring bad storms and even tornadoes, and may be high or low.]",
        ),
    ),
    "nysed-ela-2024-g4-stimulus-1-6": (
        (
            "Area for King",
            "[Diagram: A cross-section of the Great Pyramid shows an entrance near ground level leading through a hallway. The passage continues down to an underground chamber and up to separate areas for the queen and king. Air shafts run from the inner rooms through the pyramid’s sides.]",
        ),
    ),
    "nysed-ela-2024-g4-stimulus-19-23": (
        ("Abigail Iris: Th e Pet", "Abigail Iris: The Pet"),
    ),
    "nysed-ela-2024-g4-stimulus-26-31": (
        (
            "pests that harm trees.\n4 In 2013",
            "pests that harm trees.\n\n[Photograph: Cacao pods hang from a cacao tree. Chocolate makers remove the seeds, or beans, inside the pods to make chocolate.]\n\n4 In 2013",
        ),
        (
            "trees. Most of the work is done by hand.\n\n15 3. The beans are fermented.",
            "trees. Most of the work is done by hand.\n\n[Photograph: An opened cacao pod shows the beans inside; after the pod is opened, the seeds or beans are taken out.]\n\n15 3. The beans are fermented.",
        ),
    ),
    "nysed-ela-2025-g3-stimulus-19-23": (
        ("come out at night. ...", "come out at night. . . ."),
        (
            "A Raccoon in Its Den\nA raccoon has a great\nsense of hearing.\nA raccoon sees very\nwell in the dark.\nA raccoon uses its\npaws to get food.",
            "[Illustration: A raccoon rests in its den. The labels explain that a raccoon has a great sense of hearing, sees very well in the dark, and uses its paws to get food.]",
        ),
    ),
    "nysed-ela-2025-g4-stimulus-1-6": (
        (
            "STAGES OF SLEEP\nStages of Sleep What Happens\n\nEyelids feel heavy, but brain is\nPre-Sleep actively preparing the body\n\nfor sleep\nStage 1: Feel drowsy, but can be\nLight Sleep awakened easily\nStage 2: Muscles relax; breathing and\nBeginning of deep | heartbeat slows; body\nsleep temperature falls\nStage 3: Blood pressure lowers, but body is\nDeep slow-wave unaware of temperature changes;\nsleep might talk in sleep\nStage 4: Very hard to wake up and may be\nDeepest sleep (also | confused if awakened; might talk\nslow-wave) in sleep\n\nMuscles are completely relaxed,\nREM (Rapid Eye though eyes move back and forth\nMovement) sleep quickly; heartbeats quicken;\n\nbreathing is irregular; dreaming",
            "[Chart: Stages of sleep — Pre-sleep: eyelids feel heavy while the brain prepares the body for sleep. Stage 1, light sleep: drowsy but easily awakened. Stage 2, beginning deep sleep: muscles relax, breathing and heartbeat slow, and body temperature falls. Stage 3, deep slow-wave sleep: blood pressure lowers, the body is unaware of temperature changes, and sleep talking may occur. Stage 4, deepest slow-wave sleep: very hard to wake and may be confused if awakened; sleep talking may occur. REM sleep: muscles relax completely, eyes move quickly, heartbeats quicken, breathing is irregular, and dreaming occurs.]",
        ),
    ),
    "nysed-ela-2026-g3-stimulus-1-6": (
        ("4 “Maybe you could bring your parents to the rec center,” said Barry. “T\nbet", "4 “Maybe you could bring your parents to the rec center,” said Barry. “I\nbet"),
        ("9 “Tt was okay,’", "9 “It was okay,”"),
        ("15 “What about your chores?” asked Mom. “We always have to remind\nyou to make your bed”", "15 “What about your chores?” asked Mom. “We always have to remind\nyou to make your bed.”"),
        ("18 In all the excitement about the pet fair, Little Shaq had forgotten to tell\nhis parents the big news. “Wait, starting Monday, I’m going to be Star of the\nWeek,” he said. “Tl have loads", "18 In all the excitement about the pet fair, Little Shaq had forgotten to tell\nhis parents the big news. “Wait, starting Monday, I’m going to be Star of the\nWeek,” he said. “I’ll have loads"),
        ("19 “That's true,” said Malia. “Being Star of the Week is a lot of work?", "19 “That’s true,” said Malia. “Being Star of the Week is a lot of work.”"),
        ("cool event next week”", "cool event next week.”"),
        ("flier on the rec\n\ncenter's front door", "flier on the rec\ncenter’s front door"),
    ),
    "nysed-ela-2026-g3-stimulus-13-19": (
        (
            "by Susan Yoder Ackerman\nBaby porcupines",
            "by Susan Yoder Ackerman\n\n[Photograph: A small baby porcupine stands beside its much larger mother.]\n\nBaby porcupines",
        ),
        ("quills = sharp pointy hairs", "[Sidebar: quills = sharp pointy hairs.]"),
        ("rodents = small animals that have sharp front teeth", "[Sidebar: rodents = small animals that have sharp front teeth.]"),
        ("he will bite into her soft, smooth stomach where\nno quills grow. He creeps closer.", "he will bite into her soft, smooth stomach where\nno quills grow. He creeps closer.\n\n[Sidebar: menacing = dangerous.]"),
        ("The cat wont get rid", "The cat won’t get rid"),
    ),
    "nysed-ela-2026-g3-stimulus-20-24": (
        ("vote ‘no, there won't", "vote ‘no,’ there won’t"),
        ("7 “Wow!” said Sam. “Wed have", "7 “Wow!” said Sam. “We’d have"),
        ("12 “What do you mean?” asked Sam,", "12 “What do you mean?” asked Sam."),
        ("9 Jamie looked around. If she were an animal, shed want to live ina\nnewer place ten times bigger. “I'd vote for a new zoo; she said, “if I coul@\nvote.”", "9 Jamie looked around. If she were an animal, she’d want to live in a\nnewer place ten times bigger. “I’d vote for a new zoo,” she said, “if I could\nvote.”"),
        ("13 “Instead of voting, we'll campaign,’ Jamie said. “We'I’ll get", "13 “Instead of voting, we’ll campaign,” Jamie said. “We’ll get"),
        ("32 “Tm sorry, Jamie,”", "32 “I’m sorry, Jamie,”"),
        ("she cried. ...", "she cried. . . ."),
        ("posters.” ...", "posters.” . . ."),
        ("Save Our Zoo!” ...", "Save Our Zoo!” . . ."),
        ("polling site... .", "polling site. . . ."),
        ("newspaper. ...", "newspaper. . . ."),
    ),
    "nysed-ela-2026-g3-stimulus-26-31": (
        ("Excerpt from “Sabeel’s Shell\nby Paula DePaolo", "Excerpt from “Sabeel’s Shell”\nby Paula DePaolo\n\n[Illustration: A speckled spiral seashell has a pale pink opening.]"),
        ("4 “Tt is a gift", "4 “It is a gift"),
        ("Take good care of it”", "Take good care of it.”"),
        ("Take good care of it.”...", "Take good care of it.” . . ."),
    ),
    "nysed-ela-2026-g4-stimulus-20-24": (
        (
            "Balloon Firsts\nJune 5, 1783 | The Montgolfier brothers\nlaunch the first hot-air balloon\nAugust 27, 1783 | Professor Jacques Charles\nlaunches the first\nhydrogen balloon\nNovember 21, 1783 | Rozier and d’Arlandes are\nthe first humans on a\nhot-air balloon\nMarch 2, 1784 | First time humans take flight\nin hydrogen balloon\n1793 | First balloon flight in the\nUnited States",
            "[Chart: Balloon firsts — June 5, 1783: the Montgolfier brothers launch the first hot-air balloon. August 27, 1783: Professor Jacques Charles launches the first hydrogen balloon. November 21, 1783: Rozier and d’Arlandes are the first humans in a hot-air balloon. March 2, 1784: humans first fly in a hydrogen balloon. 1793: the first balloon flight takes place in the United States.]",
        ),
    ),
}


# Additional source-verified repairs from the Grade 5–8 facsimile audit. Keeping
# this ledger separate makes the final audit tranche easy to review while the
# application path below still treats every anchor as fail-closed.
ADDITIONAL_EXACT_REPLACEMENTS: dict[str, tuple[tuple[str, str], ...]] = {
    "nysed-ela-2021-g6-stimulus-8-14": (
        ("IM!\nyour buddies", "IM¹\nyour buddies"),
        ("when you ’re outside", "when you’re outside"),
        ("They’ re role-playing", "They’re role-playing"),
        ("when you ’re indoors", "when you’re indoors"),
        ("if you’ re having", "if you’re having"),
        ("that ‘nearby\nnature,” Louv", "that ‘nearby\nnature,’” Louv"),
    ),
    "nysed-ela-2023-g6-stimulus-22-26": (
        ("can hover1 in midair", "can hover¹ in midair"),
    ),
    "nysed-ela-2024-g6-stimulus-15-21": (
        ("most vulnerable.1", "most vulnerable.¹"),
        ("butterflies’ toxic2 skin", "butterflies’ toxic² skin"),
        ("small, pulsating3 jellyfish", "small, pulsating³ jellyfish"),
        ("the Serengeti4 has", "the Serengeti⁴ has"),
        (
            "MIGRATION PATTERNS\n"
            "Type of Animal Participants Route of Migration | Distance Traveled\n"
            "Mali Elephant Counter-clockwise\n"
            "over the southern 435 miles\n"
            "part of the per year\n"
            "Saharan Desert\n"
            "Monarch To North America 2,500 miles\n"
            "Butterfly 300 Million in spring and (over four\n"
            "Central Mexico in :\n"
            ". generations)\n"
            "winter\n"
            "Golden Jellyfish In Jellyfish Half a mile\n"
            "a Lake on Eil Malk, per day;\n"
            "10 Million an island in the depths of 45\n"
            "Pacific Ocean feet per night\n"
            "Zebra 300,000 Over the Serengeti 1,000 miles\n"
            "’ Plains per year\n"
            "Wildebeests In a circle across .\n"
            "1.4 Million Kenya and 1500 miles\n"
            "Tanzania pery\n"
            "‘vulnerable: likely to be affected by something bad\n"
            "*toxic: poisonous to others\n"
            "*pulsating: pulsing, pumping, or beating with blood or breath\n"
            "‘Serengeti: a plain in northern Tanzania",
            "[Chart: “Migration Patterns.” Mali elephants: 400 participants travel "
            "counter-clockwise over the southern Sahara Desert, 435 miles per year. "
            "Monarch butterflies: 300 million travel to North America in spring and "
            "Central Mexico in winter, 2,500 miles over four generations. Golden "
            "jellyfish: 10 million travel within Jellyfish Lake on Eil Malk in the "
            "Pacific Ocean, half a mile per day and to depths of 45 feet per night. "
            "Zebras: 300,000 travel over the Serengeti Plains, 1,000 miles per year. "
            "Wildebeests: 1.4 million travel in a circle across Kenya and Tanzania, "
            "1,800 miles per year.]\n"
            "¹ vulnerable: likely to be affected by something bad\n"
            "² toxic: poisonous to others\n"
            "³ pulsating: pulsing, pumping, or beating with blood or breath\n"
            "⁴ Serengeti: a plain in northern Tanzania",
        ),
    ),
    "nysed-ela-2024-g6-stimulus-22-26": (
        ("produced static electricity.1", "produced static electricity.¹"),
        ("‘static electricity: an electrical charge", "¹ static electricity: an electrical charge"),
    ),
    "nysed-ela-2025-g6-stimulus-22-26": (
        (
            "Residents also did not have electric power until after 1918. . . .",
            "Residents also did not have electric power until after 1918. . . .\n\n"
            "[Chart: “More New York Local Legacies.” Albany Tulip Festival: "
            "celebrates Albany’s Dutch history as one of the oldest Dutch settlements "
            "in the United States, with tulips supplied by the Dutch; Mayor Erastus "
            "Corning started the festival in 1949. New York Walk Through History: "
            "highlights historic sites, including the Harriet Tubman Walking Tour; "
            "the governor began the program in 2012. Little Falls Canal Celebration: "
            "honors the Erie Canal, which linked Buffalo and Albany and helped town "
            "economies; the celebration began in 1987 and commemorates the 1917 "
            "opening of the Barge Canal.]",
        ),
    ),
    "nysed-ela-2025-g6-stimulus-29-35": (
        ("created Peter Rabbit.1", "created Peter Rabbit.¹"),
        ("looked like an alga.2", "looked like an alga.²"),
        ("the botanists3 at", "the botanists³ at"),
        ("*Peter Rabbit: a well-known", "¹ Peter Rabbit: a well-known"),
        ("alga, algae: green, non-flowering", "² alga, algae: green, non-flowering"),
        ("botanists: scientists who study", "³ botanists: scientists who study"),
    ),
    "nysed-ela-2026-g6-stimulus-22-27": (
        (
            "TIMELINE OF JOHN MUIR’S LIFE\n"
            "John Muir is born in\n"
            "Scotland.\n"
            "Muir immigrates to\n"
            "Wisconsin.\n"
            "C1863 > Muir leaves university to\n"
            "begin a walking tour of\n"
            "Wisconsin, Iowa, Illinois,\n"
            "and parts of Canada.\n"
            "Muir starts a 1,000 C1867)\n"
            "mile walk to Florida\n"
            "and then sails to Cuba to\n"
            "study nature. Muir spends time exploring\n"
            "various areas in California\n"
            "and herds sheep in the\n"
            "Sierra.\n"
            "Muir lives in Yosemite.\n"
            "C1879 > Muir makes his first\n"
            "trip to Alaska.\n"
            "Yosemite becomes a\n"
            "national park.\n"
            "C 1892) Muir helps found\n"
            "the Sierra Club.\n"
            "Muir takes President C1903 >\n"
            "Theodore Roosevelt on\n"
            "a 3-day camping trip\n"
            "through Yosemite. oy.\n"
            "<> John Muir dies at\n"
            "the age of 76.",
            "[Chart: “Timeline of John Muir’s Life.” 1838: born in Scotland. "
            "1849: immigrates to Wisconsin. 1863: leaves university for a walking "
            "tour of Wisconsin, Iowa, Illinois, and parts of Canada. 1867: begins a "
            "1,000-mile walk to Florida, then sails to Cuba. 1868–1869: explores "
            "California and herds sheep in the Sierra. 1869–1873: lives in Yosemite. "
            "1879: makes his first trip to Alaska. 1890: Yosemite becomes a national "
            "park. 1892: helps found the Sierra Club. 1903: takes President Theodore "
            "Roosevelt on a three-day camping trip through Yosemite. 1914: dies at "
            "age 76.]",
        ),
    ),
    "nysed-ela-2018-g7-stimulus-15-21": (
        ("youd feel", "you’d feel"),
        ("inverse correlation!", "inverse correlation¹"),
        ("longer” Crankiness", "longer.” Crankiness"),
        ("‘eat\nmore, eat more, ”", "‘eat\nmore, eat more,’”"),
        ("youre more likely", "you’re more likely"),
        ("linverse correlation:", "¹ inverse correlation:"),
    ),
    "nysed-ela-2021-g7-stimulus-8-14": (
        ("youd feel", "you’d feel"),
        ("youd stay up later", "you’d stay up later"),
        ("youre doing", "you’re doing"),
        ("inverse correlation!", "inverse correlation¹"),
        ("longer” Crankiness", "longer.” Crankiness"),
        ("‘eat\nmore, eat more, ”", "‘eat\nmore, eat more,’”"),
        ("youre more likely", "you’re more likely"),
        ("linverse correlation:", "¹ inverse correlation:"),
    ),
    "nysed-ela-2018-g7-stimulus-22-28": (
        ("myself tougher and stronger”", "myself tougher and stronger.”"),
    ),
    "nysed-ela-2021-g7-stimulus-15-21": (
        ("myself tougher and stronger”", "myself tougher and stronger.”"),
    ),
    "nysed-ela-2018-g7-stimulus-29-35": (
        ("means “Lesser Island; because", "means “Lesser Island,” because"),
        ("first view of the New World” He", "first view of the New World.” He"),
    ),
    "nysed-ela-2021-g7-stimulus-22-28": (
        ("means “Lesser Island; because", "means “Lesser Island,” because"),
        ("first view of the New World” He", "first view of the New World.” He"),
    ),
    "nysed-ela-2021-g7-stimulus-1-7": (
        ("roof? Gus teases", "roof,” Gus teases"),
        ("itd be", "it’d be"),
        ("El] Camino", "El Camino"),
        ("the winch! on", "the winch¹ on"),
        ("whos a trash hauler", "who’s a trash hauler"),
        ("1winch: a hauling", "¹ winch: a hauling"),
    ),
    "nysed-ela-2022-g7-stimulus-29-35": (
        ("hammer)... .", "hammer). . . ."),
        ("Today’ s", "Today’s"),
        ("stand....", "stand. . . ."),
        ("vaudeville! and", "vaudeville¹ and"),
        ("vaudeville: a type", "¹ vaudeville: a type"),
    ),
    "nysed-ela-2026-g7-stimulus-22-27": (
        ("the apiarists1 had", "the apiarists¹ had"),
        ("with scores2 of", "with scores² of"),
        ("full of brood,3 with", "full of brood,³ with"),
        ("their indomitable4 instinct", "their indomitable⁴ instinct"),
        ("‘apiarists: people", "¹ apiarists: people"),
        ("*scores: large", "² scores: large"),
        ("*brood: young", "³ brood: young"),
        ("‘indomitable: strong", "⁴ indomitable: strong"),
    ),
    "nysed-ela-2026-g7-stimulus-29-35": (
        ("lives in Changan, a city", "lives in Chang’an, a city"),
        ("lead camel... .", "lead camel. . . ."),
        (
            "7 “I hate these donkeys!” Fourth Brother growled. “Master Fong promised me I could\n"
            "be a guard, but now he has shoved me back with animals. “That’s where you're needed, he\n"
            "says. I'll show him I can do more than watch over a bunch of lazy donkeys!” .. .",
            "7 “I hate these donkeys!” Fourth Brother growled. “Master Fong promised me I could\n"
            "be a guard, but now he has shoved me back with animals. ‘That’s where you’re needed,’ he\n"
            "says. I’ll show him I can do more than watch over a bunch of lazy donkeys!” . . .",
        ),
        ("he hobbled’ the camels", "he hobbled¹ the camels"),
        ("‘Mr. Zuo’s\nwaterwheels. ”", "‘Mr. Zuo’s\nwaterwheels.’”"),
        ('"hobbled: secured', "¹ hobbled: secured"),
    ),
    "nysed-ela-2026-g7-stimulus-36-42": (
        ("amount of red produced, he says.", "amount of red produced,” he says."),
        ("debate back and\nforth”", "debate back and\nforth.”"),
    ),
    "nysed-ela-2018-g8-stimulus-1-7": (
        ("if 1 was going", "if I was going"),
        ("“When I’ve got something, I take care of it? she", "“When I’ve got something, I take care of it,” she"),
        ("the ranchers,! even", "the ranchers,¹ even"),
        ("Moms is a quiet face", "Mom’s is a quiet face"),
        ("the elevator? till", "the elevator² till"),
        ("1ranchers: a ranch house", "¹ ranchers: a ranch house"),
        ("2(grain) elevator: a building", "² (grain) elevator: a building"),
    ),
    "nysed-ela-2018-g8-stimulus-8-14": (
        ("the ubiquitous! MGM", "the ubiquitous¹ MGM"),
        ("“I’m sure\nyou will love her” Baum", "“I’m sure\nyou will love her.” Baum"),
        ("1 ubiquitous: ever-present", "¹ ubiquitous: ever-present"),
    ),
    "nysed-ela-2018-g8-stimulus-15-21": (
        ("When Ass legs", "When A’s legs"),
        ("“I did it?” she", "“I did it,” she"),
        ("GREGARINE”", "GREGARINE.”"),
        ("“..I..” Pound. “..N...” Pound. “..E..” Pound. “Gregarine”", "“. . . I . . .” Pound. “. . . N . . .” Pound. “. . . E . . .” Pound. “Gregarine.”"),
        ("DUVETYN”", "DUVETYN.”"),
        ("Duvetyn”", "Duvetyn.”"),
        ("or silk”", "or silk.”"),
        ('“D-U..””', '“D-U . . .”'),
    ),
}


COUNTED_EXACT_REPLACEMENTS: dict[str, tuple[tuple[str, str, int], ...]] = {
    "nysed-ela-2017-g6-stimulus-8-14": (
        ("Th eir", "Their", 2),
        ("Th ey", "They", 2),
        ("Th en", "Then", 1),
        ("Th at", "That", 2),
        ("aft ernoon", "afternoon", 1),
        ("fi eld", "field", 2),
        ("fl oat", "float", 1),
        ("stuff ed", "stuffed", 1),
    ),
    "nysed-ela-2017-g6-stimulus-15-21": (
        ("Th ese", "These", 1),
        ("Th en", "Then", 1),
        ("Th ere", "There", 1),
        ("Th e", "The", 2),
        ("devilfi sh", "devilfish", 2),
        ("fl eet", "fleet", 1),
        ("soft en", "soften", 1),
    ),
    "nysed-ela-2017-g6-stimulus-36-42": (
        ("Th at", "That", 1),
        ("Th ey", "They", 1),
        ("Th en", "Then", 1),
        ("Th e", "The", 3),
        ("Aft er", "After", 1),
        ("fi gure", "figure", 1),
        ("fi ngers", "fingers", 1),
        ("fl ung", "flung", 1),
        ("diff erent", "different", 1),
        ("drift ed", "drifted", 1),
        ("I nterference", "Interference", 1),
    ),
    "nysed-ela-2017-g7-stimulus-1-7": (
        ("Th eir", "Their", 3),
        ("Th ough", "Though", 1),
        ("Th en", "Then", 2),
        ("Th ey", "They", 1),
        ("Th is", "This", 1),
        ("Th e", "The", 9),
        ("aft ernoon", "afternoon", 1),
        ("aft er", "after", 2),
        ("Parrotfi shes", "Parrotfishes", 2),
        ("parrotfi shes", "parrotfishes", 1),
        ("parrotfi sh", "parrotfish", 1),
        ("triggerfi sh", "triggerfish", 2),
        ("lionfi sh", "lionfish", 1),
        ("fi shes", "fishes", 13),
        ("fi sh", "fish", 4),
        ("fi ns", "fins", 1),
        ("fi n", "fin", 1),
        ("effi cient", "efficient", 1),
        ("fi le", "file", 1),
        ("fi rst", "first", 1),
        ("fi lm", "film", 1),
        ("fl ashy", "flashy", 1),
        ("fl owing", "flowing", 1),
        ("refl ect", "reflect", 1),
        ("off er", "offer", 1),
        ("eff ective", "effective", 1),
        ("C oral", "Coral", 1),
    ),
    "nysed-ela-2017-g7-stimulus-8-14": (
        ("chlorofl uorocarbons", "chlorofluorocarbons", 1),
        ("chlorofl uorocarbon", "chlorofluorocarbon", 1),
        ("diff erent", "different", 1),
        ("Th at", "That", 1),
        ("frappé2", "frappé²", 1),
        ("2f rappé: an iced or chilled drink", "² frappé: an iced or chilled drink", 1),
    ),
    "nysed-ela-2017-g7-stimulus-29-35": (
        ("Th e", "The", 2),
        ("fi ft y", "fifty", 1),
        ("fl ood", "flood", 1),
    ),
    "nysed-ela-2017-g7-stimulus-36-42": (
        ("F ire", "Fire", 1),
        ("Th e", "The", 5),
        ("Aft er", "After", 1),
        ("Wildfi res", "Wildfires", 1),
        ("fi res", "fires", 3),
        ("wildfi re", "wildfire", 2),
        ("fi re", "fire", 13),
        ("fi ght", "fight", 1),
        ("fi ne", "fine", 1),
        ("fi ve", "five", 1),
        ("fl oor", "floor", 2),
    ),
    "nysed-ela-2017-g8-stimulus-1-7": (
        ("O ne-Eyed", "One-Eyed", 1),
        ("Th ere", "There", 1),
        ("Th e", "The", 1),
        ("fi nding", "finding", 1),
        ("fi rst", "first", 1),
        ("heft ing", "hefting", 1),
    ),
    "nysed-ela-2023-g5-stimulus-22-26": (
        ("Th e", "The", 1),
    ),
    "nysed-ela-2018-g7-stimulus-22-28": (
        ("Ohkwarri", "Ohkwa’ri", 3),
        ("Ohkwari", "Ohkwa’ri", 14),
    ),
    "nysed-ela-2021-g7-stimulus-15-21": (
        ("Ohkwarri", "Ohkwa’ri", 6),
        ("Ohkwari", "Ohkwa’ri", 11),
    ),
    "nysed-ela-2026-g7-stimulus-29-35": (
        (" hed ", " he’d ", 3),
    ),
}


class TranscriptSeedError(RuntimeError):
    pass


def _apply_reviewed_repairs(stimulus_id: str, value: str) -> str:
    """Apply only facsimile-reviewed, exact-anchor transcript repairs."""

    lines_to_remove = REMOVE_EXACT_LINES.get(stimulus_id, frozenset())
    if lines_to_remove:
        available = set(value.splitlines())
        missing = sorted(lines_to_remove - available)
        if missing:
            raise TranscriptSeedError(
                f"Reviewed removal anchors changed for {stimulus_id}: {missing}"
            )
        value = "\n".join(
            line for line in value.splitlines() if line not in lines_to_remove
        )
        value = normalize_transcript_text(value)

    replacements = (
        *EXACT_REPLACEMENTS.get(stimulus_id, ()),
        *ADDITIONAL_EXACT_REPLACEMENTS.get(stimulus_id, ()),
    )
    for old, new in replacements:
        if old == new:
            continue
        occurrences = value.count(old)
        if occurrences == 0 and value.count(new) == 1:
            # OCR/library versions occasionally already return the reviewed
            # spelling. Accept that only when the complete replacement is
            # present exactly once; all structural insertions still fail shut.
            continue
        if occurrences != 1:
            raise TranscriptSeedError(
                f"Reviewed replacement anchor changed for {stimulus_id}: "
                f"expected 1 occurrence, found {occurrences}: {old[:80]!r}"
            )
        value = value.replace(old, new, 1)

    for old, new, expected_occurrences in COUNTED_EXACT_REPLACEMENTS.get(
        stimulus_id, ()
    ):
        occurrences = value.count(old)
        if occurrences != expected_occurrences:
            raise TranscriptSeedError(
                f"Reviewed counted replacement anchor changed for {stimulus_id}: "
                f"expected {expected_occurrences} occurrences, found {occurrences}: "
                f"{old[:80]!r}"
            )
        value = value.replace(old, new)
    value = normalize_transcript_text(value)

    allowed_positions: set[int] = set()
    for fragment in ALLOWED_NESTED_SINGLE_QUOTE_FRAGMENTS.get(stimulus_id, ()):
        if value.count(fragment) != 1:
            raise TranscriptSeedError(
                f"Reviewed nested-quotation anchor changed for {stimulus_id}: {fragment!r}"
            )
        start = value.index(fragment)
        allowed_positions.update(
            start + match.start()
            for match in SINGLE_CLOSING_QUOTE_RE.finditer(fragment)
        )
    repair_matches = [
        match
        for match in SINGLE_CLOSING_QUOTE_RE.finditer(value)
        if match.start() not in allowed_positions
    ]
    expected_repairs = REVIEWED_SINGLE_TO_DOUBLE_CLOSING_COUNTS.get(stimulus_id, 0)
    if len(repair_matches) != expected_repairs:
        raise TranscriptSeedError(
            f"Reviewed closing-quote repair count changed for {stimulus_id}: "
            f"expected {expected_repairs}, found {len(repair_matches)}"
        )
    for match in reversed(repair_matches):
        value = value[: match.end() - 1] + "”" + value[match.end() :]
    return normalize_transcript_text(value)


def _find_pdf(cache_root: Path, year: int, grade: int) -> Path:
    matches = sorted(cache_root.rglob(f"{year}-g{grade}-en-release-*.pdf"))
    if len(matches) != 1:
        raise TranscriptSeedError(
            f"Expected one cached source PDF for {year} Grade {grade}, found {len(matches)}"
        )
    return matches[0]


def _passage_image(public_root: Path, year: int, grade: int, stimulus: dict[str, Any]) -> Path:
    source = str(stimulus.get("passage", {}).get("src", ""))
    prefix = f"/vine-app/nysed/ela/{year}/grade-{grade}/en/"
    if not source.startswith(prefix) or "/../" in source:
        raise TranscriptSeedError(f"Unsafe passage image path for {stimulus.get('id')}")
    path = public_root / str(year) / f"grade-{grade}" / "en" / Path(source).name
    if not path.is_file() or path.is_symlink():
        raise TranscriptSeedError(f"Missing passage image: {path}")
    return path


def _substantive_embedded_text(value: str) -> bool:
    words = re.findall(r"[A-Za-z]+", value)
    return len(words) >= EMBEDDED_TEXT_MIN_WORDS


def _flow_preserves_numbered_reading_order(value: str) -> bool:
    markers = [
        int(match.group(1))
        for line in value.splitlines()
        if (
            match := re.match(
                r"^\s*(\d{1,3})\s+(?:[1-6]\.\s+)?(?=[A-Za-z“\"‘'•(\[])",
                line,
            )
        )
    ]
    return len(markers) >= 3 and all(
        right > left for left, right in zip(markers, markers[1:])
    )


def _normalize_page_text(value: str) -> str:
    """Normalize one page while its trailing legacy page number is identifiable."""

    normalized = normalize_transcript_text(value)
    lines = normalized.splitlines()
    while lines and not lines[-1].strip():
        lines.pop()
    if lines and re.fullmatch(r"\d{1,3}", lines[-1].strip()):
        lines.pop()
    return "\n".join(lines).strip()


def _ocr_page(page: pdfplumber.page.Page, tesseract_binary: str) -> str:
    image = page.to_image(resolution=OCR_DPI, antialias=True).original.convert("RGB")
    prepared = _prepare_passage_page(image, dpi=OCR_DPI)
    crop = prepared.image.crop((prepared.left, prepared.top, prepared.right, prepared.bottom))
    payload = io.BytesIO()
    crop.save(payload, format="PNG", optimize=True)
    environment = os.environ.copy()
    environment.update({"LANG": "C", "LC_ALL": "C", "OMP_THREAD_LIMIT": "1"})
    result = subprocess.run(
        [
            tesseract_binary,
            "stdin",
            "stdout",
            "--psm",
            "6",
            "-l",
            "eng",
            "--dpi",
            str(OCR_DPI),
            "-c",
            "preserve_interword_spaces=1",
        ],
        input=payload.getvalue(),
        check=False,
        capture_output=True,
        timeout=120,
        env=environment,
    )
    if result.returncode != 0:
        detail = result.stderr.decode("utf-8", "replace")[:500]
        raise TranscriptSeedError(f"Tesseract failed: {detail}")
    return result.stdout.decode("utf-8", "replace")


def _repair_ocr_paragraph_markers(value: str) -> str:
    """Repair unambiguous left-margin marker OCR before spaces are folded."""

    expected: int | None = None
    repaired: list[str] = []
    marker_like = re.compile(r"^[0-9AIilSasy|]{1,2}$")
    for line in value.splitlines():
        match = re.match(r"^(\S{1,3})(\s+)(?=([A-Z“\"‘']))(\S.*)$", line)
        if not match:
            repaired.append(line)
            continue
        token, spacing, _, remainder = match.groups()
        if token.isdigit():
            number = int(token)
            if expected is not None and number != expected:
                wanted = str(expected)
                if len(spacing) >= 3 and len(token) == len(wanted) and sum(a != b for a, b in zip(token, wanted)) == 1:
                    token = wanted
                    number = expected
                elif len(spacing) >= 3 and len(token) + 1 == len(wanted) and wanted.endswith(token):
                    token = wanted
                    number = expected
            if expected is None or number >= expected:
                expected = number + 1
        elif len(spacing) >= 3 and expected is None and token in {"I", "i", "l", "|"}:
            token = "1"
            expected = 2
        elif len(spacing) >= 3 and expected is not None and marker_like.fullmatch(token):
            token = str(expected)
            expected += 1
        repaired.append(f"{token}{spacing}{remainder}")
    return "\n".join(repaired)


def _extract_transcript(
    pdf: pdfplumber.PDF,
    stimulus: dict[str, Any],
    *,
    tesseract_binary: str,
) -> tuple[str, str]:
    references = stimulus.get("references")
    if not isinstance(references, list) or len(references) != 1:
        raise TranscriptSeedError(f"Expected one source range for {stimulus.get('id')}")
    reference = references[0]
    page_start = int(reference["pageStart"])
    page_end = int(reference["pageEnd"])
    page_texts: list[str] = []
    sources: list[str] = []
    for page_number in range(page_start, page_end + 1):
        page = pdf.pages[page_number - 1]
        default_embedded = page.extract_text(x_tolerance=2, y_tolerance=3) or ""
        flow_embedded = page.extract_text(
            x_tolerance=2,
            y_tolerance=3,
            use_text_flow=True,
        ) or ""
        embedded = (
            flow_embedded
            if _flow_preserves_numbered_reading_order(flow_embedded)
            else default_embedded
        )
        if _substantive_embedded_text(embedded):
            page_texts.append(_normalize_page_text(embedded))
            sources.append("pdf")
        else:
            page_texts.append(
                _normalize_page_text(
                    _repair_ocr_paragraph_markers(_ocr_page(page, tesseract_binary))
                )
            )
            sources.append("ocr")
    text = normalize_transcript_text("\n\n".join(page_texts))
    text = _apply_reviewed_repairs(str(stimulus["id"]), text)
    if stimulus.get("id") == "nysed-ela-2026-g4-stimulus-26-31":
        diagram_heading = "How Solar Panels Power a School"
        if diagram_heading not in text:
            raise TranscriptSeedError("Missing reviewed solar-panel diagram anchor")
        text = text.split(diagram_heading, 1)[0].rstrip() + (
            "\n\nHow Solar Panels Power a School\n"
            "[Diagram: Light waves from the sun reach solar panels on the school roof. "
            "The panels turn the light waves into electricity, and wires carry that "
            "electricity into the school to provide power.]"
        )
    if all(source == "pdf" for source in sources):
        source = "official-pdf-text"
    elif all(source == "ocr" for source in sources):
        source = "passage-image-ocr"
    else:
        source = "mixed-official-pdf-text-and-ocr"
    if source not in SOURCE_VALUES:
        raise AssertionError(source)
    return validate_transcript_text(text, stimulus_id=str(stimulus["id"])), source


def seed_sidecars(
    *,
    catalog_path: Path,
    cache_root: Path,
    public_root: Path,
    output_root: Path,
    tesseract_binary: str,
    validate_only: bool,
    years: set[int] | None = None,
    grades: set[int] | None = None,
) -> list[Path]:
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    exams = [
        exam
        for exam in catalog.get("exams", [])
        if int(exam.get("grade", 0)) in {3, 4, 5, 6, 7, 8}
        and (years is None or int(exam.get("year", 0)) in years)
        and (grades is None or int(exam.get("grade", 0)) in grades)
    ]
    if years is None and grades is None and len(exams) != 78:
        raise TranscriptSeedError(f"Expected 78 Grade 3–8 releases, found {len(exams)}")
    outputs: list[Path] = []
    stimulus_count = question_count = 0
    for exam in sorted(exams, key=lambda item: (int(item["year"]), int(item["grade"]))):
        year = int(exam["year"])
        grade = int(exam["grade"])
        pdf_path = _find_pdf(cache_root, year, grade)
        pdf_sha = sha256_file(pdf_path)
        passages: list[dict[str, Any]] = []
        with pdfplumber.open(pdf_path) as pdf:
            for stimulus in exam["stimuli"]:
                image_path = _passage_image(public_root, year, grade, stimulus)
                image_sha = sha256_file(image_path)
                text, source = _extract_transcript(
                    pdf,
                    stimulus,
                    tesseract_binary=tesseract_binary,
                )
                passages.append(
                    {
                        "stimulusId": stimulus["id"],
                        "inputHash": passage_transcript_input_hash(
                            exam_id=str(exam["id"]),
                            stimulus=stimulus,
                            source_pdf_sha256=pdf_sha,
                            passage_image_sha256=image_sha,
                        ),
                        "source": source,
                        "reviewedReadingOrder": False,
                        # A reviewer fills this independently from the visible
                        # facsimile; never bless OCR by copying its own output.
                        "paragraphMarkers": [],
                        "visualDescriptionCount": transcript_visual_description_count(text),
                        "text": text,
                    }
                )
                stimulus_count += 1
                question_count += int(stimulus["questionEnd"]) - int(stimulus["questionStart"]) + 1
        payload = {
            "schemaVersion": 1,
            "policyVersion": TRANSCRIPT_POLICY_VERSION,
            "examId": exam["id"],
            "sourcePdfSha256": pdf_sha,
            "reviewedReadingOrder": False,
            "passages": passages,
        }
        destination = output_root / f"{year}-grade-{grade}.json"
        if validate_only:
            if json.loads(destination.read_text(encoding="utf-8")) != payload:
                raise TranscriptSeedError(f"Transcript sidecar is stale: {destination.name}")
        else:
            output_root.mkdir(parents=True, exist_ok=True)
            atomic_write_json(destination, payload)
        outputs.append(destination)
    if years is None and grades is None and (stimulus_count != 242 or question_count != 1583):
        raise TranscriptSeedError(
            f"Transcript parity failed: expected 242/1583, got {stimulus_count}/{question_count}"
        )
    return outputs


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--cache-root", type=Path, default=DEFAULT_CACHE_ROOT)
    parser.add_argument("--public-root", type=Path, default=DEFAULT_PUBLIC_ROOT)
    parser.add_argument("--output-root", type=Path, default=DEFAULT_SIDECAR_ROOT)
    parser.add_argument("--tesseract", default=DEFAULT_TESSERACT)
    parser.add_argument("--year", type=int, action="append")
    parser.add_argument("--grade", type=int, choices=range(3, 9), action="append")
    parser.add_argument("--validate", action="store_true")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    if not args.tesseract:
        raise TranscriptSeedError("Tesseract is required to author transcript sidecars")
    outputs = seed_sidecars(
        catalog_path=args.catalog.resolve(),
        cache_root=args.cache_root.resolve(),
        public_root=args.public_root.resolve(),
        output_root=args.output_root.resolve(),
        tesseract_binary=str(args.tesseract),
        validate_only=args.validate,
        years=set(args.year) if args.year else None,
        grades=set(args.grade) if args.grade else None,
    )
    print(f"Validated {len(outputs)} transcript sidecars" if args.validate else f"Wrote {len(outputs)} transcript sidecars")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (
        OSError,
        ValueError,
        json.JSONDecodeError,
        ElaTranscriptError,
        TranscriptSeedError,
    ) as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)
