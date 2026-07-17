#!/usr/bin/env python3
"""Author or validate reviewed NYSED ELA question-accessibility sidecars.

Authoring reads the exact checked-in WebP crops and exact cached NYSED PDFs.
Selectable PDF text is preferred when its visual choice geometry is complete;
otherwise the final-crop OCR review cache is used as a draft.  The resulting
sidecars are production inputs, not a runtime OCR fallback.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from collections import Counter
from dataclasses import dataclass
from difflib import SequenceMatcher
from itertools import product
from pathlib import Path
from typing import Any, Iterable, Sequence

try:
    from scripts.nysed_ela_question_accessibility import (
        DEFAULT_ELA_QUESTION_ACCESSIBILITY_ROOT,
        ELA_QUESTION_ACCESSIBILITY_POLICY_VERSION,
        ELA_QUESTION_ACCESSIBILITY_SCHEMA_VERSION,
        EXPECTED_ELA_QUESTION_ACCESSIBILITY_EXAMS,
        EXPECTED_ELA_QUESTION_ACCESSIBILITY_QUESTIONS,
        ela_question_accessibility_input_hash,
        load_exam_question_accessibility,
        sha256_file,
        validate_ela_question_accessibility_text,
    )
except ModuleNotFoundError:  # pragma: no cover - direct script execution.
    from nysed_ela_question_accessibility import (  # type: ignore[no-redef]
        DEFAULT_ELA_QUESTION_ACCESSIBILITY_ROOT,
        ELA_QUESTION_ACCESSIBILITY_POLICY_VERSION,
        ELA_QUESTION_ACCESSIBILITY_SCHEMA_VERSION,
        EXPECTED_ELA_QUESTION_ACCESSIBILITY_EXAMS,
        EXPECTED_ELA_QUESTION_ACCESSIBILITY_QUESTIONS,
        ela_question_accessibility_input_hash,
        load_exam_question_accessibility,
        sha256_file,
        validate_ela_question_accessibility_text,
    )


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CATALOG = REPO_ROOT / "content" / "ela-exams" / "generated" / "catalog.json"
DEFAULT_ASSET_ROOT = REPO_ROOT / "public" / "nysed" / "ela"
DEFAULT_PDF_ROOT = REPO_ROOT / "tmp" / "pdfs" / "nysed-ela-passage-import" / "pdfs"
DEFAULT_OCR_ROOT = (
    REPO_ROOT
    / "tmp"
    / "pdfs"
    / "nysed-ela-passage-import"
    / "ocr"
    / "ela-final-webp"
)
DEFAULT_DRAFT_ROOT = REPO_ROOT / "tmp" / "pdfs" / "ela-question-accessibility-drafts"
APP_PUBLIC_PREFIX = "/vine-app/nysed/ela/"
XML_NAMESPACE = {"x": "http://www.w3.org/1999/xhtml"}

# Reviewed mappings for NYSED embedded-font glyphs seen in the exact releases.
PDF_GLYPHS = {
    "\ue062": "Th",
    "\ue092": "fb",
    "\ue09d": "ft",
    "\ue0bb": "Th",
    "\ue117": "ft",
}
LATIN_LIGATURES = str.maketrans(
    {
        "ﬀ": "ff",
        "ﬁ": "fi",
        "ﬂ": "fl",
        "ﬃ": "ffi",
        "ﬄ": "ffl",
        "ﬅ": "st",
        "ﬆ": "st",
    }
)

# Every entry below was compared with its exact WebP/PDF facsimile. These are
# source-specific repairs, not general OCR guesses.
REVIEWED_CROP_NUMBER_IDS = frozenset(
    {
        "nysed-ela-2022-g3-mc-q1",
        "nysed-ela-2022-g3-mc-q6",
        "nysed-ela-2022-g4-mc-q3",
        "nysed-ela-2022-g4-mc-q6",
        "nysed-ela-2022-g5-mc-q8",
        "nysed-ela-2022-g5-mc-q12",
        "nysed-ela-2022-g5-mc-q34",
        "nysed-ela-2022-g5-mc-q35",
        "nysed-ela-2022-g6-mc-q2",
        "nysed-ela-2022-g6-mc-q5",
        "nysed-ela-2022-g6-mc-q6",
        "nysed-ela-2022-g6-mc-q13",
        "nysed-ela-2022-g6-mc-q28",
        "nysed-ela-2022-g7-mc-q8",
        "nysed-ela-2022-g7-mc-q12",
        "nysed-ela-2022-g7-mc-q13",
        "nysed-ela-2022-g7-mc-q32",
        "nysed-ela-2022-g8-mc-q28",
        "nysed-ela-2026-g4-mc-q24",
    }
)
REVIEWED_DUPLICATE_LABEL_IDS = frozenset(
    {
        "nysed-ela-2021-g4-mc-q18",
        "nysed-ela-2021-g6-mc-q5",
        "nysed-ela-2021-g6-mc-q8",
        "nysed-ela-2021-g6-mc-q11",
        "nysed-ela-2021-g6-mc-q12",
        "nysed-ela-2021-g6-mc-q24",
        "nysed-ela-2021-g6-mc-q26",
        "nysed-ela-2021-g7-mc-q14",
        "nysed-ela-2022-g8-mc-q33",
        "nysed-ela-2024-g8-mc-q20",
        "nysed-ela-2025-g8-mc-q32",
        "nysed-ela-2026-g3-mc-q5",
        "nysed-ela-2026-g3-mc-q14",
        "nysed-ela-2026-g3-mc-q16",
        "nysed-ela-2026-g3-mc-q17",
        "nysed-ela-2026-g3-mc-q19",
        "nysed-ela-2026-g7-mc-q30",
        "nysed-ela-2026-g7-mc-q31",
        "nysed-ela-2026-g7-mc-q38",
    }
)
REVIEWED_LITERAL_REPAIRS: dict[str, tuple[tuple[str, str], ...]] = {
    "nysed-ela-2015-g4-mc-q13": (("most c contributes", "most contributes"),),
    "nysed-ela-2021-g4-mc-q1": (("Question 1. A According", "Question 1. According"),),
    "nysed-ela-2021-g4-mc-q2": (("C: - surprise", "C: surprise"),),
    "nysed-ela-2021-g4-mc-q3": (("C: Hes surprised", "C: He is surprised"),),
    "nysed-ela-2021-g4-mc-q5": (
        ("made history.’", "made history.”"),
        ("“T give", "“I give"),
        ("keyboard”", "keyboard.”"),
    ),
    "nysed-ela-2021-g4-mc-q6": (
        ("children wont be harmed", "children won’t be harmed"),
        ("short stay.’", "short stay.”"),
    ),
    "nysed-ela-2021-g4-mc-q8": (("Question 8. g How", "Question 8. How"), ("byexplaining", "by explaining")),
    "nysed-ela-2021-g4-mc-q9": (
        ("Question 9. g Which", "Question 9. Which"),
        ("they will know.’", "they will know.”"),
    ),
    "nysed-ela-2021-g4-mc-q11": (("Howis", "How is"), ("B: P sequence", "B: sequence"), ("C: q question", "C: question")),
    "nysed-ela-2021-g4-mc-q12": (("byshowing", "by showing"),),
    "nysed-ela-2021-g4-mc-q14": (
        ("afeeling", "a feeling"),
        ("safeeling", "a feeling"),
        ("sa feeling", "a feeling"),
    ),
    "nysed-ela-2017-g4-mc-q19": (("Question 19. yg What", "Question 19. What"),),
    "nysed-ela-2016-g4-mc-q26": (
        ("Question 26. paragraph 7", "Question 26. In paragraph 7"),
    ),
    "nysed-ela-2017-g5-mc-q38": (("Question 38. 3g Which", "Question 38. Which"),),
    "nysed-ela-2016-g5-mc-q21": (("Question 21. oN Which", "Question 21. Which"),),
    "nysed-ela-2016-g5-mc-q38": (("Question 38. 3g How", "Question 38. How"),),
    "nysed-ela-2016-g7-mc-q38": (("Question 38. 3g Read", "Question 38. Read"),),
    "nysed-ela-2016-g8-mc-q38": (("Question 38. 3g The", "Question 38. The"),),
    "nysed-ela-2021-g4-mc-q18": (("Question 18. 1g ", "Question 18. "),),
    "nysed-ela-2021-g6-mc-q5": (("bysharing", "by sharing"), ("byshowing", "by showing")),
    "nysed-ela-2021-g6-mc-q8": (("bystating", "by stating"),),
    "nysed-ela-2021-g6-mc-q11": (("Question 11. J] ", "Question 11. "), ("byillustrating", "by illustrating")),
    "nysed-ela-2021-g6-mc-q12": (
        ("byshowing", "by showing"),
        ("C: c by showing", "C: by showing"),
    ),
    "nysed-ela-2021-g6-mc-q3": (("RV wasa cramped", "RV was a cramped"),),
    "nysed-ela-2021-g6-mc-q9": (("byproviding", "by providing"),),
    "nysed-ela-2021-g6-mc-q14": (
        ("If youre like", "If you’re like"),
        ("“Tf you walk", "“If you walk"),
    ),
    "nysed-ela-2021-g6-mc-q21": (("bycomparing", "by comparing"), ("Rakhee'’s", "Rakhee’s"), ("byshowing", "by showing")),
    "nysed-ela-2021-g6-mc-q22": (("byexplaining", "by explaining"),),
    "nysed-ela-2021-g6-mc-q24": (("byhighlighting", "by highlighting"), ("byillustrating", "by illustrating")),
    "nysed-ela-2021-g7-mc-q14": (("sparagraph", "paragraph"),),
    "nysed-ela-2021-g7-mc-q21": (("bycontrasting", "by contrasting"), ("byrevealing", "by revealing")),
    "nysed-ela-2022-g3-mc-q12": (("Itis", "It is"),),
    "nysed-ela-2022-g5-mc-q1": (("A: itis", "A: It is"),),
    "nysed-ela-2022-g6-mc-q12": (("byexplaining", "by explaining"),),
    "nysed-ela-2022-g8-mc-q33": (("Ithas", "It has"), ("D: Y Y ", "D: ")),
    "nysed-ela-2024-g8-mc-q20": (("Itshifts", "It shifts"),),
    "nysed-ela-2025-g5-mc-q10": (("concert atthe age", "concert at the age"),),
    "nysed-ela-2026-g3-mc-q1": (("his parents the big P news", "his parents the big news"), ("his P parents the big news", "his parents the big news")),
    "nysed-ela-2026-g3-mc-q5": (("Heis", "He is"),),
    "nysed-ela-2026-g3-mc-q6": (("hasa", "has a"), ("ina", "in a")),
    "nysed-ela-2026-g3-mc-q14": (("porcupine’ size", "porcupine’s size"), ("Itincludes", "It includes"), ("porcupine'’s", "porcupine’s")),
    "nysed-ela-2026-g3-mc-q15": (("anangry", "an angry"), ("aworld", "a world")),
    "nysed-ela-2026-g3-mc-q16": (("~Porcupette", "Porcupette"),),
    "nysed-ela-2026-g3-mc-q17": (("~Porcupines", "Porcupines"),),
    "nysed-ela-2026-g3-mc-q18": (("Question 18. 1g ", "Question 18. "),),
    "nysed-ela-2026-g3-mc-q19": (("byexplaining", "by explaining"), ("byshowing", "by showing")),
    "nysed-ela-2026-g3-mc-q20": (
        ("Question 20. 9 Which", "Question 20. Which"),
        ("“‘Thope so; said Jamie. “We have to save the zoo:”", "“‘I hope so,’ said Jamie. ‘We have to save the zoo.’”"),
        ("“J think the city should use the money to make the library bigger”", "“I think the city should use the money to make the library bigger.”"),
    ),
    "nysed-ela-2026-g3-mc-q21": (("byraising", "by raising"), ("byspeaking", "by speaking"), ("byexplaining", "by explaining")),
    "nysed-ela-2026-g3-mc-q28": (("Question 28. 2g ", "Question 28. "),),
    "nysed-ela-2026-g5-mc-q24": (("byshowing", "by showing"), ("bycontrasting", "by contrasting"), ("byexplaining", "by explaining")),
    "nysed-ela-2026-g5-mc-q18": (("tohighlight", "to highlight"),),
    "nysed-ela-2026-g7-mc-q30": (("Itcreates", "It creates"),),
    "nysed-ela-2026-g7-mc-q31": (("Itis", "It is"),),
    "nysed-ela-2026-g7-mc-q38": (("Itexplains", "It explains"), ("Itintroduces", "It introduces")),
    "nysed-ela-2026-g7-mc-q42": (("Bothscientists", "Both scientists"), ("Eachscientist", "Each scientist")),
    "nysed-ela-2024-g7-mc-q32": (("shed received", "she’d received"),),
    "nysed-ela-2024-g7-mc-q37": (
        ("a aoe’ og’s bark", "a dog’s bark"),
        ("second..", "second."),
        ("as c intensely", "as intensely"),
        ("intensely.’", "intensely.”"),
        ("sounds..", "sounds.”"),
    ),
    "nysed-ela-2023-g6-mc-q4": (("If hed", "If he’d"), ("“T spent", "“I spent"), ("banner?", "banner.”")),
    "nysed-ela-2023-g7-mc-q17": (("back and forth wed go", "back and forth we’d go"), ("“... Thad a friend", "“... I had a friend")),
    "nysed-ela-2023-g7-mc-q20": (("as if youre older", "as if you’re older"), ("“T hurried", "“I hurried")),
    "nysed-ela-2024-g8-mc-q18": (("“T have never", "“I have never"),),
    "nysed-ela-2021-g6-mc-q20": (("D: — New experiences", "D: New experiences"),),
    "nysed-ela-2021-g6-mc-q23": (("tobe", "to be"),),
    "nysed-ela-2021-g6-mc-q27": (("Question 27. a7 What", "Question 27. What"),),
    "nysed-ela-2021-g7-mc-q5": (("around; Willow Grove", "around Willow Grove"),),
    "nysed-ela-2021-g7-mc-q27": (("Franco-American Union,", "Franco-American Union."),),
    "nysed-ela-2022-g4-mc-q4": (("something 4 special", "something special"),),
    "nysed-ela-2022-g4-mc-q19": (("Question 19. 2 paragraph 4", "Question 19. In paragraph 4"),),
    "nysed-ela-2022-g5-mc-q14": (("be s t", "best"),),
    "nysed-ela-2022-g8-mc-q8": (("b e st", "best"),),
    "nysed-ela-2022-g8-mc-q32": (("Question 32. the use", "Question 32. The use"),),
    "nysed-ela-2023-g7-mc-q41": (("suggest? 40 Choices:", "suggest? Choices:"),),
    "nysed-ela-2026-g5-mc-q20": (("Question 20. As A used", "Question 20. As used"),),
}

# Full replacements are reserved for source-verified layout failures where a
# crop's text layer assigned words to the wrong A-D lane.  Literal token fixes
# cannot safely repair those cases because the intended boundary itself moved.
REVIEWED_ALT_OVERRIDES: dict[str, str] = {
    "nysed-ela-2013-g4-mc-q2": (
        "Question 2. Which is the best summary of this story? Choices: "
        "A: Maushop lives near the Wampanoag people. He goes to talk to the Sun on the other side of the world. The Sun calls Maushop his younger brother. Maushop is also friends with the spiders. The spiders weave a net for Maushop to use. "
        "B: The Sun leaves the land of the Wampanoag people because he is not happy with them. When the Sun does not come back, the people turn to Maushop for help. He finds the Sun on the other side of the world and finds out why the Sun will not come back. When the people say they will change their ways, Maushop finds a way to get the Sun to return. "
        "C: The Sun and Maushop are friends. When the Sun leaves the land of the Wampanoag people, they ask Maushop to help get the Sun to come back. Maushop makes two trips to the other side of the world. "
        "D: When the Sun leaves the land of the Wampanoag people, they want him to come back. They need help to find out where the Sun went. Maushop agrees to go look for the Sun and tell him that the people want him to come back. Maushop is able to do this because he is a giant and can travel around the world quickly."
    ),
    "nysed-ela-2014-g7-mc-q7": (
        "Question 7. Which of these is the best summary of this article? Choices: "
        "A: On his travels to Tibet, the author found that although many Tibetan people have moved to cities, there are still those who prefer the nomadic life. They do not live in permanent homes but instead move around in this three-mile high country. Their yak-hair tents provide greater warmth than the author’s modern tents. "
        "B: As the author learned during his visit to Tibet, Tibetan weather is harsh. However, the Tibetan nomads continue to follow the old ways, raising yaks for all of their survival needs. During their moves from place to place, they often have to cross difficult rivers and rough terrain. Nevertheless, they maintain a wonderful attitude about life. "
        "C: When the author traveled with friends to Tibet, he learned that many Tibetans continue to live as nomads. They follow the old customs of raising yaks, which help the nomads move from place to place as well as provide for their basic needs. Though the lives of the nomads present many difficulties, they have developed happy attitudes that suit their lives. "
        "D: Traveling in Tibet, the author saw that Tibetan nomads have learned to depend on the yaks for survival. They get food, clothing, shelter, and even warmth from the animals, which are extremely good natured. The author refers to them as “all-terrain vehicles” for their ability to cross any river without problem. In one situation, the yaks proved to be more dependable than automobiles."
    ),
    "nysed-ela-2021-g3-mc-q14": (
        "Question 14. Which detail from the story best shows the narrator’s point of view about catching crabs for supper? Choices: "
        "A: “My clothes were already sticking to me, and sweat trickled down our faces.” (paragraph 7) "
        "B: “This smells disgusting. How can they eat this?” (paragraph 8) "
        "C: “. . . cracking the shells and pulling out the sweet white meat. We had to keep trying.” (paragraph 11) "
        "D: “. . . but that crab was all claws and those mad pincers were waving all over the place!” (paragraph 15)"
    ),
    "nysed-ela-2021-g4-mc-q16": (
        "Question 16. Which sentence from the story best shows how a character’s actions help to develop the story? Choices: "
        "A: “You must not leave the camp until the brolgas have left.” (paragraph 6) "
        "B: “She wove baskets from the reeds the other children collected.” (paragraph 7) "
        "C: “Slipping out of the camp, she rushed down to the riverbank to dance with the cranes.” (paragraph 8) "
        "D: “Her mother looked for her throughout the camp and, not finding her there, searched near the river.” (paragraph 9)"
    ),
    "nysed-ela-2021-g3-mc-q8": (
        "Question 8. What is the main idea of paragraph 6? Choices: "
        "A: Lightning can reach from the sky to the ground. "
        "B: A bolt of lightning can travel up to nine miles. "
        "C: Flashes of lightning can jump from one cloud to another. "
        "D: Lightning can move over large distances very quickly."
    ),
    "nysed-ela-2021-g6-mc-q13": (
        "Question 13. How do paragraphs 16 through 18 contribute to the structure of the article? Choices: "
        "A: The paragraphs describe a problem introduced earlier in the article. "
        "B: The paragraphs contrast ways of accomplishing goals described in the article. "
        "C: The paragraphs summarize the points made previously in the article. "
        "D: The paragraphs give support to the main argument in the article."
    ),
    "nysed-ela-2021-g6-mc-q28": (
        "Question 28. Which idea would be most important to include in a summary of the article? Choices: "
        "A: “The farther away lightning strikes, the deeper the sound of the thunder...” (paragraph 5) "
        "B: “Lightning zaps the remote mountain village of Kifuka, in central Africa, nearly every day.” (paragraph 6) "
        "C: “Because of its unpredictability and power, lightning can be extremely dangerous.” (paragraph 8) "
        "D: “You’re safe inside the car because electricity will travel over the metal surface instead of through the interior.” (paragraph 9)"
    ),
    "nysed-ela-2021-g7-mc-q4": (
        "Question 4. Which sentence demonstrates how Grandpa Gus’s character is revealed in the setting of the story? Choices: "
        "A: “Old Glory inches toward the gates of McGunn’s Iron and Metal, a junkyard that Gus knows so well, he could walk through it blindfolded and never once bump his shin on anything.” (paragraph 5) "
        "B: “‘Got yourselves a real beauty queen there,’ Mick says as he points to the El Camino attached to the winch on the back of Old Glory.” (paragraph 8) "
        "C: “It’s a shell of what it used to be, missing its hood, and its engine, and all its doors.” (paragraph 9) "
        "D: “He’ll take your old grills or your rusted patio furniture or even clean out the contents of your grandparents’ shed...” (paragraph 10)"
    ),
    "nysed-ela-2021-g7-mc-q26": (
        "Question 26. Which evidence from paragraph 11 best supports the author’s claim that the fund-raising efforts for the Statue of Liberty were “creative”? Choices: "
        "A: “Though the original goal of completing the statue for the hundredth birthday... seemed unlikely, the group still did its best to meet that deadline.” "
        "B: “Appeals for donations for the statue appeared in the French press...” "
        "C: “Banquets and balls were held in several French cities.” "
        "D: “Bartholdi came up with just enough money to begin work on Lady Liberty.”"
    ),
    "nysed-ela-2021-g7-mc-q19": (
        "Question 19. Which detail would be most important to include in a summary of the story? Choices: "
        "A: Ohkwa’ri helps his uncle Big Tree make a fine drinking cup. "
        "B: Ohkwa’ri keeps his personal things under his bed in a box. "
        "C: Ohkwa’ri blows on the coal through a sumac branch. "
        "D: Ohkwa’ri knows how to safely obtain water from a river."
    ),
    "nysed-ela-2021-g8-mc-q7": (
        "Question 7. Which sentence would be most important to include in a summary of the story? Choices: "
        "A: A cable connects space suits to a power source for spacewalks. "
        "B: The power from the nitrogen blast allows Alan to travel farther and faster. "
        "C: Alan soars away from his target during part of his flight. "
        "D: The weather on Titan is cold and hazy."
    ),
    "nysed-ela-2022-g4-mc-q22": (
        "Question 22. How is the information in paragraph 6 organized? Choices: "
        "A: Details are presented in the order they happened. "
        "B: An effect and its cause are mentioned. "
        "C: Different events are compared and contrasted. "
        "D: A problem and its solution are presented."
    ),
    "nysed-ela-2022-g4-mc-q20": (
        "Question 20. Read these sentences from paragraph 5. Now I tell young writers, “Keep trying. If you work hard and make your writing the best you can, you’ll be published too.” The author best supports these sentences by including Choices: "
        "A: information about how he wrote stories for family members "
        "B: the point about how the book he wrote in second grade was turned down "
        "C: a story about why his brother draws for his books "
        "D: the fact that he and his brother sent out four books before one was accepted"
    ),
    "nysed-ela-2022-g4-mc-q24": (
        "Question 24. Which sentence from the article best supports the main idea of “Sharing My Story”? Choices: "
        "A: “The editor at Random House didn’t buy my story.” (paragraph 5) "
        "B: “I had my first story printed in a newspaper when I was in third grade.” (paragraph 6) "
        "C: “However long it takes, there are great rewards.” (paragraph 7) "
        "D: “I never met the editor who told me to keep writing, but she was a friend to me.” (paragraph 8)"
    ),
    "nysed-ela-2022-g5-mc-q7": (
        "Question 7. Which quotation best supports a theme of the story? Choices: "
        "A: “‘Why do you stand so long at the door?’ he asked.” (paragraph 6) "
        "B: “‘You’ve worked well for this cloth, Sali,’ he said.” (paragraph 11) "
        "C: “Sali rushed straight home with her treasure.” (paragraph 12) "
        "D: “Then he started cutting the billows of orange fabric.” (paragraph 19)"
    ),
    "nysed-ela-2022-g5-mc-q10": (
        "Question 10. Which quotation best reveals the author’s point of view? Choices: "
        "A: “It was no surprise that Janet Guthrie excelled at one of the most dangerous sports on Earth.” (paragraph 1) "
        "B: “... the pro taught her how to pull the rip cord that opened the chute, how to absorb the shock after landing...” (paragraph 7) "
        "C: “She flew whenever she could break away from her classes at the University of Michigan.” (paragraph 8) "
        "D: “To get into top physical shape for Vollstedt’s test, Guthrie did exercises...” (paragraph 19)"
    ),
    "nysed-ela-2022-g5-mc-q14": (
        "Question 14. Which idea from the article does the title “‘Janet Guthrie: Lady in the Fast Lane’ from Profiles in Sports Courage” best support? Choices: "
        "A: Guthrie was a hard worker and saved money to achieve her goals. "
        "B: Guthrie was famous for participating in a race with a broken foot. "
        "C: Guthrie was fearless at trying thrilling and challenging new activities. "
        "D: Guthrie was determined to become a commercial pilot like her father."
    ),
    "nysed-ela-2022-g6-mc-q6": (
        "Question 6. Which detail best represents how Aven changes at the end of the story? Choices: "
        "A: “... plucked at a string with one not quite steady toe.” (paragraph 13) "
        "B: “... I saw that all their eyes were on me...” (paragraph 14) "
        "C: “... arms around each other, swaying to the music.” (paragraph 14) "
        "D: “I felt as big as the giant saguaro...” (paragraph 15)"
    ),
    "nysed-ela-2022-g6-mc-q7": (
        "Question 7. Read this phrase from paragraph 15. I felt like I was shining . . . Which sentence best represents the meaning of this phrase? Choices: "
        "A: Aven feels proud of who she is. "
        "B: Aven is looking forward to more performances. "
        "C: Aven understands she is more important than others. "
        "D: Aven is relieved the audience enjoyed her performance."
    ),
    "nysed-ela-2022-g6-mc-q11": (
        "Question 11. Read this sentence from paragraph 3. “Everywhere I went, people were killing bats in large numbers just out of ignorance,” says Merlin. Which quotation from the article best explains the cause of the “ignorance” described by Merlin? Choices: "
        "A: “... Merlin figured out that the books were wrong.” (paragraph 1) "
        "B: “Many people are afraid of bats.” (paragraph 3) "
        "C: “What he found shocked him.” (paragraph 3) "
        "D: “Bats fly at night and spend the day in dark places.” (paragraph 5)"
    ),
    "nysed-ela-2022-g6-mc-q24": (
        "Question 24. How does the plot change in paragraphs 8 through 10? Choices: "
        "A: Someone arrives in search of Milo. "
        "B: Milo hides the wallet in the shed. "
        "C: Someone arrives in search of the wallet. "
        "D: A guest departs because of the snow."
    ),
    "nysed-ela-2022-g7-mc-q11": (
        "Question 11. Which claim by the author is most strongly supported with evidence? Choices: "
        "A: “Two pet Siberian huskies kindled her interest in dogsled racing.” (paragraph 3) "
        "B: “The musher must have faith in each and every dog on her team...” (paragraph 5) "
        "C: “... the race was still largely the domain of men.” (paragraph 6) "
        "D: “In 1986, it was Butcher’s turn.” (paragraph 8)"
    ),
    "nysed-ela-2022-g7-mc-q14": (
        "Question 14. Which detail would be most important to include in a summary of the article? Choices: "
        "A: “... Butcher was drawn as a child to the wilderness and to the animals that filled it.” (paragraph 2) "
        "B: “Training for the Iditarod encompasses a wide scope of activities.” (paragraph 4) "
        "C: “The portion of trail to the left was a flimsy snow bridge that would have collapsed...” (paragraph 5) "
        "D: “She had not only won the race, she had also set a new speed record.” (paragraph 8)"
    ),
    "nysed-ela-2022-g7-mc-q33": (
        "Question 33. Which quotation best conveys a central idea of the article? Choices: "
        "A: “Many of the instruments we know and play today, like the piano, the guitar, and the oboe, evolved from these older instruments.” (paragraph 1) "
        "B: “The fact that marimba songs were well liked by Americans shows the increased exposure the public had to foreign styles of music.” (paragraph 4) "
        "C: “During the Great Depression, people couldn’t afford store-bought instruments so they made their own.” (paragraph 8) "
        "D: “Whistling is a way to use your vocal cords as a musical instrument.” (paragraph 11)"
    ),
    "nysed-ela-2022-g8-mc-q34": (
        "Question 34. Read this sentence from paragraph 11. And from New Jersey’s Wildwood Park to California’s Pacific Park and Florida’s Walt Disney World, other amusement and theme parks have taken their cues from Coney Island. Which quotation best supports this claim? Choices: "
        "A: “The inspiration for amusement parks such as Coney Island sprang from an exciting event in 1893—the World’s Columbian Exposition in Chicago.” (paragraph 2) "
        "B: “When he was unable to buy Ferris’s wheel, he had his own version built.” (paragraph 6) "
        "C: “Attractions that are so familiar today—roller coasters, water rides, fun houses, Tunnels of Love—all got their start there.” (paragraph 9) "
        "D: “They have grown to epic proportions in their efforts to offer a world full of fun.” (paragraph 11)"
    ),
    "nysed-ela-2022-g8-mc-q8": (
        "Question 8. Which detail best reflects the narrator’s point of view of her mother and her beadwork? Choices: "
        "A: comparing the mother to an artist arranging paints upon a palette "
        "B: describing the mother drawing a blade to trim the buckskin "
        "C: mentioning the mother making moccasins for her daughter "
        "D: describing the mother picking up the tiny beads one at a time"
    ),
    "nysed-ela-2022-g8-mc-q32": (
        "Question 32. The use of quotation marks around the word “spaceship” in paragraph 6 suggests that Choices: "
        "A: the spaceship is a form of transportation for the ride "
        "B: the vehicle that the visitors ride looks like a spaceship "
        "C: the park has an old spaceship converted into a ride "
        "D: the spaceship resembles a similar attraction at another park"
    ),
    "nysed-ela-2023-g5-mc-q6": (
        "Question 6. How is Jasmine Moon most likely similar to Brianna in the story? Choices: "
        "A: Jasmine Moon wears her hair in a way that covers her face, showing that she is most likely shy and quiet like Brianna. "
        "B: Jasmine Moon gets along with her teacher quickly when she arrives at school, showing that she is most likely kind and friendly like Brianna. "
        "C: Jasmine Moon is new to the school and decides to run for class president, showing that she is most likely confident and determined like Brianna. "
        "D: Jasmine Moon is interested in being active and participating in social events, showing that she is most likely eager and curious like Brianna."
    ),
    "nysed-ela-2023-g8-mc-q4": (
        "Question 4. Which quotation shows a change in the direction of the story? Choices: "
        "A: “The operator rang his office; no answer. ‘Sorry, but it looks like you’re out of luck, Miss White,’ she said.” (paragraph 7) "
        "B: “I didn’t hesitate. ‘Oh, Mr. Moskowitz!’ I called out. ‘Just a moment, sir, please! I’d like to speak to you.’” (paragraph 10) "
        "C: “‘Never mind, Chester,’ Mr. Moskowitz told the operator. ‘We don’t need you now.’” (paragraph 19) "
        "D: “For the next hour they asked me questions about my age . . . my education, and my experience.” (paragraph 21)"
    ),
    "nysed-ela-2024-g3-mc-q19": (
        "Question 19. Which event would be most important to include in a summary of the story? Choices: "
        "A: A man takes care of the lighthouse and uses a small key to start its light. "
        "B: A boat greets the lighthouse in the day but the lighthouse does not answer. "
        "C: A terrible storm comes in the night and the bridge reminds the lighthouse why it is needed. "
        "D: A group of workers come to the Hudson River and begin digging and building along the shore."
    ),
    "nysed-ela-2023-g6-mc-q35": (
        "Question 35. Which claim by the author is most strongly supported by evidence in the article? Choices: "
        "A: “The rice room... was the generic name for an area in the back of our father’s restaurant.” (paragraph 1) "
        "B: “From the time of my birth... the cafe at 710 Webster Street was my home away from home.” (paragraph 2) "
        "C: “... nothing rivaled the satisfaction of working the plum around, getting down to the plum seed.” (paragraph 9) "
        "D: “... a tall, spindly man with rimless glasses and thinning hair who liked to spin stories to us.” (paragraph 11)"
    ),
    "nysed-ela-2023-g8-mc-q32": (
        "Question 32. How does Aleks’s attitude change in paragraph 5? Choices: "
        "A: It shifts from exhausted to curious. "
        "B: It shifts from panicked to confident. "
        "C: It shifts from distracted to focused. "
        "D: It shifts from annoyed to surprised."
    ),
    "nysed-ela-2024-g5-mc-q23": (
        "Question 23. Which detail from the article best explains why wildlife can survive in urban areas? Choices: "
        "A: “A frog darts from a drainpipe to snatch the dragonfly. From the rooftops, a hawk swoops down to grab the frog.” (paragraph 1) "
        "B: “Wild animals need food, water, space to hunt or hide, and a place to raise young. A city offers all of these.” (paragraph 1) "
        "C: “These insects can live for two months without food, and haven’t changed much since scurrying around with dinosaurs millions of years ago.” (paragraph 3) "
        "D: “These marvelous little wrigglers gobble up dead leaves, food scraps, and garbage, and turn them into rich soil.” (paragraph 3)"
    ),
    "nysed-ela-2024-g7-mc-q32": (
        "Question 32. Which detail would be most important to include in a summary of the story? Choices: "
        "A: “... she’d received twelve years of strict training and guidance in history and philosophy and psychology...” (paragraph 1) "
        "B: “The students who select the wisest answer will become Deciders.” (paragraph 2) "
        "C: “Lee’s face flushed, and his lips trembled. He ran out of the room...” (paragraph 6) "
        "D: “The Proctor sat at a red table. Behind him there was an exit.” (paragraph 10)"
    ),
    "nysed-ela-2024-g8-mc-q24": (
        "Question 24. Which detail best shows David’s attitude toward his situation? Choices: "
        "A: “The storm might be days getting to him, might not come at all, and he didn’t have much food and fishing wasn’t going that well.” (paragraph 2) "
        "B: “... he brought her around, up into the wind until she was tacking northwest and making a solid six knots.” (paragraph 4) "
        "C: “More than once he was knocked off his feet by a wall of water... but he never let go of the helm, rose and took it again and again...” (paragraph 8) "
        "D: “It was then that he saw the ship—a small, older ship, coming out of the dusk, aiming almost at him but slightly off his bow, running with the wind and sea.” (paragraph 11)"
    ),
    "nysed-ela-2024-g8-mc-q25": (
        "Question 25. Which detail from the excerpt best supports the idea that David is an experienced sailor? Choices: "
        "A: “He thought of turning and going back into the bay to ride it out but decided against it.” (paragraph 2) "
        "B: “... he worked the helm, let her ease up... kept the speed between five and six knots, did not run from the storm but into it, used it, rolled with it, absorbed it.” (paragraph 7) "
        "C: “... at one point he snarled, growled at the wind and sea—the helm in his gut, his arms aching, his legs on fire...” (paragraph 9) "
        "D: “He came about and let the Frog sail closer, came up into the wind and stopped about thirty yards away, rising and settling on the waves and swells.” (paragraph 14)"
    ),
    "nysed-ela-2025-g4-mc-q29": (
        "Question 29. Which sentence from the story best describes the setting? Choices: "
        "A: “Even so, I enjoyed making the steep but quick (ten-minute) climb to Miss Sabines’ house.” (paragraph 2) "
        "B: “It has a big garden, with beautiful desert plants and herbs growing everywhere, and a courtyard that has tiles painted bright colors, with sculptures, pinwheels, wind chimes, and lawn ornaments scattered throughout.” (paragraph 5) "
        "C: “The pleasant voice came floating across the courtyard walls, putting me instantly at ease.” (paragraph 7) "
        "D: “Miss Sabines showed me some of her new plantings, we played with her pets, and I leafed through a collection of photographs by Ansel Adams, whom Miss Sabines calls a ‘poet of Southwestern landscapes.’” (paragraph 11)"
    ),
    "nysed-ela-2025-g6-mc-q14": (
        "Question 14. Which detail from the article best reveals the importance of Grotjan’s discovery? Choices: "
        "A: “Their cries of ‘That’s it!’ ‘Whoopee!’ ‘Hooray!’ broke the silence of the room, which was usually as quiet as a library.” (paragraph 3) "
        "B: “Each symbol stood for a letter, but the letter it stood for changed as the machine moved forward.” (paragraph 9) "
        "C: “... the SIS and U.S. Navy built a Purple cipher machine just like the decoding machines used in Japanese embassies.” (paragraph 11) "
        "D: “... Magic contributed enormously to the defeat of the enemy, greatly shortened the war, and saved many thousands of lives.” (paragraph 12)"
    ),
    "nysed-ela-2025-g8-mc-q24": (
        "Question 24. Which statement represents an important distinction the author makes between corvids and blue whales in the section “Big Brains”? Choices: "
        "A: Corvids are more intelligent than blue whales because they are very large birds. "
        "B: Blue whales should be smarter than they are because they are so much larger than corvids. "
        "C: A blue whale’s brain, which can weigh over 16 pounds, is much larger than a corvid’s brain. "
        "D: When comparing brain size to body size, a corvid’s brain-to-body ratio is greater than a blue whale’s."
    ),
    "nysed-ela-2025-g8-mc-q31": (
        "Question 31. How do the actions of the piglet’s young owner in paragraphs 8 and 9 affect the plot? Choices: "
        "A: They cause the narrator to believe that his purpose in this new land is to help others. "
        "B: They cause the narrator to have to choose between his old culture and a new one in Brazil. "
        "C: They make the narrator feel hopeful that he will be able to adjust in a new country. "
        "D: They make the narrator feel disappointed with the new surroundings when he arrives in Brazil."
    ),
    "nysed-ela-2025-g8-mc-q41": (
        "Question 41. Which detail best expresses a central idea of the section “A National Park”? Choices: "
        "A: “Over the next 15 months, the Wetherill family found and explored 182 different cliff dwellings in Mesa Verde.” (paragraph 14) "
        "B: “Many looters and treasure seekers began visiting the area, too.” (paragraph 15) "
        "C: “... the U.S. government would own, protect, and preserve Mesa Verde and all of its treasures.” (paragraph 16) "
        "D: “... more than 600,000 visitors enjoy the amazing sites at Mesa Verde National Park each year.” (paragraph 17)"
    ),
    "nysed-ela-2026-g5-mc-q27": (
        "Question 27. Washington State law requires that all people aged 12 through 16 must pass a Snowmobile Safety Course before they drive a snowmobile. How does this idea connect with the details in the article? Choices: "
        "A: It explains that Snowcamp is attended by relatively few people because of the strict rules. "
        "B: It shows that the Venturers do the same amount of work as other people to learn snowmobiling. "
        "C: It supports the idea that people in Washington State take pride in its snowmobiling opportunities. "
        "D: It supports the idea that snowmobiling can be dangerous and requires practice and skill."
    ),
    "nysed-ela-2026-g5-mc-q25": (
        "Question 25. Which detail from the article most likely reveals the author’s opinion about the Venturers’ campsite? Choices: "
        "A: “When they get to their spot—about 5,000 feet above sea level—they begin setting up camp.” (paragraph 11) "
        "B: “As the fire burns, the platform drops deeper and deeper into the snow, at the rate of about 1 foot per hour.” (paragraph 12) "
        "C: “It’s like a miniature coliseum, and it’s the perfect winter shelter—protected from the wind and warmed by the fire.” (paragraph 14) "
        "D: “They are usually able to get back to the same spot the very next weekend for another three nights.” (paragraph 17)"
    ),
    "nysed-ela-2026-g3-mc-q27": (
        "Question 27. Which sentence best supports a theme of the story? Choices: "
        "A: “Back at the cottage, Sabeel ran to his room to admire the shell.” (paragraph 7) "
        "B: “This time, Sabeel tucked the shell under his pillow, where no one could see it.” (paragraph 11) "
        "C: “I have to return a gift.” (paragraph 25) "
        "D: “With the next wave, he was gone.” (paragraph 26)"
    ),
    "nysed-ela-2026-g7-mc-q20": (
        "Question 20. Which detail would be most important to include in a summary of the article? Choices: "
        "A: “... a teenager named William Henry Perkin found himself captivated by this fascinating science.” (paragraph 3) "
        "B: “... Young Perkin realized that this chemical would make a great dye for fabrics.” (paragraph 6) "
        "C: “Perkin himself kept inventing, making more new colors, including Britannia Violet and Perkin’s Green...” (paragraph 11) "
        "D: “Today, the Perkin Medal, named in his honor, is presented each year to a scientist in the United States...” (paragraph 14)"
    ),
    "nysed-ela-2021-g8-mc-q16": (
        "Question 16. Which quotation best expresses a central idea of the story? Choices: "
        "A: “I started experimenting with being a vegetarian when I turned fourteen...” (paragraph 5) "
        "B: “... I decided early on that this is the work I want to do...” (paragraph 6) "
        "C: “It hardly seems fair that I have to walk away from all of that...” (paragraph 8) "
        "D: “... just in case I ever want to do anything else with my life.” (paragraph 8)"
    ),
    "nysed-ela-2025-g8-mc-q40": (
        "Question 40. Which sentence best shows the author’s viewpoint? Choices: "
        "A: “Wetherill and Mason had discovered a large cliff dwelling that had been abandoned hundreds of years ago by ancient Pueblo people.” (paragraph 3) "
        "B: “Builders filled in the spaces where the stone bricks fit together with smaller stones, mud, and wood pieces.” (paragraph 4) "
        "C: “For about 700 years, Mesa Verde was a thriving community of many thousands of Native American people now referred to as Ancestral Puebloans.” (paragraph 7) "
        "D: “We do know that these people settled the area that is now the home of the modern Pueblo tribes, including the Hopi, Zuni, Acoma, and Laguna.” (paragraph 11)"
    ),
    "nysed-ela-2026-g6-mc-q33": (
        "Question 33. Which sentence best shows the rising action in the story? Choices: "
        "A: “From the time he was fifteen until he turned twenty, he worked for a bakery in southeast Houston.” (paragraph 2) "
        "B: “He had never seen so many old trees, including dead trees that were still standing, perfect trees for woodpecker nests.” (paragraph 5) "
        "C: “Only one creature on the entire planet made that sound, only one.” (paragraph 10) "
        "D: “Then he waved the photo in the air until it dried, and slipped it into the ammo can.” (paragraph 16)"
    ),
    "nysed-ela-2024-g8-mc-q29": (
        "Question 29. Which idea would be most important to include in a summary of the article? Choices: "
        "A: “The Serengeti is about the size of Vermont, so the scientists could not study the entire area. Instead, they surveyed three regions . . .” (paragraph 5) "
        "B: “The scientists looked at four possible causes: lions, parasites, illegal hunters (called poachers), and poor food supply.” (paragraph 6) "
        "C: “To find out if lions had been killing more giraffes in recent years, the team looked at calf survival rates and long-term records . . .” (paragraph 7) "
        "D: “When the food supply is short, the environment supports fewer giraffes and the females have fewer calves.” (paragraph 10)"
    ),
    "nysed-ela-2026-g7-mc-q36": (
        "Question 36. Read this sentence from paragraph 3. Areas of the United States with especially colorful fall displays attract thousands of leaf peepers. Which phrase helps the reader to understand the meaning of “leaf peepers” as used in the sentence? Choices: "
        "A: “These tourists flock to the region . . .” (paragraph 1) "
        "B: “Being in the Northeast during autumn . . .” (paragraph 2) "
        "C: “Lee studies leaf color . . .” (paragraph 3) "
        "D: “The chemical chlorophyll, which gives leaves their green color . . .” (paragraph 4)"
    ),
    "nysed-ela-2021-g7-mc-q7": (
        "Question 7. Which idea best supports a theme of the story? Choices: "
        "A: “Our voices sound like a whole playground as we squeal and squirm.” (paragraph 3) "
        "B: “But that makes it the perfect car for Gus, who’s a trash hauler.” (paragraph 10) "
        "C: “It’s amazing, I think, his ability to take something broken and worthless and turn it into a fold of green bills in his pocket.” (paragraph 11) "
        "D: “And that, in my mind, is another special power that belongs to Gus.” (paragraph 12)"
    ),
    "nysed-ela-2021-g7-mc-q12": (
        "Question 12. Which claim from the article is most strongly supported with evidence? Choices: "
        "A: “Even without modern technology, though, teens shift their circadian rhythm.” (paragraph 7) "
        "B: “The rest of the world doesn’t shift, however.” (paragraph 9) "
        "C: “Lack of sleep could hurt mental health.” (paragraph 12) "
        "D: “Lots of issues remain for sleep researchers to explore.” (paragraph 20)"
    ),
    "nysed-ela-2021-g7-mc-q13": (
        "Question 13. Which sentence from the article best shows the author’s point of view? Choices: "
        "A: “Blame your brain, at least in part.” (paragraph 1) "
        "B: “And that’s a serious public health problem.” (paragraph 9) "
        "C: “Crankiness can result, especially if you don’t feel well.” (paragraph 14) "
        "D: “And you can’t easily change your body’s natural circadian rhythm.” (paragraph 21)"
    ),
    "nysed-ela-2021-g7-mc-q18": (
        "Question 18. Which quotation best supports a central idea of the story? Choices: "
        "A: “He could help his uncle finish hollowing the bowl by blowing on the coal through the thin hollow branch of a sumac.” (paragraph 5) "
        "B: “Now I only have to smooth the inside and this cup will be ready to use.” (paragraph 6) "
        "C: “It was useful, but it was better to have something that was useful and beautiful.” (paragraph 12) "
        "D: “It would be a good way to learn, a good way to make myself tougher and stronger.” (paragraph 17)"
    ),
    "nysed-ela-2021-g7-mc-q23": (
        "Question 23. Read this sentence from paragraph 3. Bartholdi wrote that the seed for the Statue of Liberty was sown at the party that night. The words “the seed for the Statue of Liberty was sown” refer to the Choices: "
        "A: timetable for building the statue "
        "B: first ideas about the project "
        "C: plan for funding the project "
        "D: design for the statue"
    ),
    "nysed-ela-2025-g5-mc-q25": (
        "Question 25. Which sentence best represents the turning point in the story? Choices: "
        "A: “Eventually, First Woman had an idea for a different way to send light to Earth.” (paragraph 6) "
        "B: “On the rim, they placed bird feathers—cardinal, lark, and eagle—to fly it through the sky and spread the rays of heat and light in the four directions.” (paragraph 7) "
        "C: “At that moment, two ancient, wise men stepped forward and offered to help.” (paragraph 11) "
        "D: “Once the Sun and the Moon were following their paths through the sky, the people returned to where First Woman had carved the wheels.” (paragraph 12)"
    ),
    "nysed-ela-2023-g7-mc-q25": (
        "Question 25. Which lines best support a theme of the poem? Choices: "
        "A: “Searching my heart for its true sorrow, / This is the thing I find to be: / That I am weary of words and people, / Sick of the city, wanting the sea;” (lines 1-4) "
        "B: “If I could hear the green piles groaning / Under the windy, wooden piers, / See once again the bobbing barrels, / And the black sticks that fence the weirs;” (lines 17-20) "
        "C: “If I could see the weedy mussels / Crusting the wrecked and rotting hulls, / Hear once again the hungry crying / Overhead, of the wheeling gulls.” (lines 21-24) "
        "D: “Feel once again the shanty straining / Under the turning of the tide, / Fear once again the rising freshet, / Dread the bell in the fog outside;” (lines 25-28)"
    ),
    "nysed-ela-2024-g7-mc-q40": (
        "Question 40. Which statement best represents a central idea of the article? Choices: "
        "A: “Actually, maybe they should’ve been called prairie watchdogs because they bark to alert the colony . . .” (paragraph 1) "
        "B: “After all, prairie dogs are just rodents, like mice and rats, and aren’t supposed to be that smart.” (paragraph 9) "
        "C: “Although the calls are a single sound, or at least a continuous one, they seem to carry a lot of information.” (paragraph 10) "
        "D: “Besides studying alarm calls, he has also recorded the little noises, the chitter-chattering . . .” (paragraph 11)"
    ),
    "nysed-ela-2026-g8-mc-q41": (
        "Question 41. Which detail best shows how scientists determine if there could be life on an exoplanet? Choices: "
        "A: “We can basically look for what life does here. It uses chemistry to store and release energy.” (paragraph 11) "
        "B: “Signs of life won’t necessarily indicate if it is microbes, plants, or intelligent life.” (paragraph 12) "
        "C: “For that I have a core team that has different branches focused on different things . . .” (paragraph 13) "
        "D: “We have partnered up and are helping choose their instruments. It would be a small rocket . . .” (paragraph 13)"
    ),
    "nysed-ela-2021-g4-mc-q10": (
        "Question 10. Which idea from the article best supports the main idea? Choices: "
        "A: “The snow leopard is smaller than the tiger, the lion, and the leopard of Africa and Asia.” (paragraph 2) "
        "B: “Researchers estimate that only 3,500 to 7,500 snow leopards are alive today.” (paragraph 6) "
        "C: “Each snow leopard’s spot pattern is different.” (paragraph 10) "
        "D: “The cameras had taken photos of 15 different snow leopards at two study sites.” (paragraph 10)"
    ),
    "nysed-ela-2025-g7-mc-q1": (
        "Question 1. Which idea would be most important to include in a summary of the story? Choices: "
        "A: “Today began our adventure at the Columbian Exposition, the largest world’s fair in history!” (paragraph 1) "
        "B: “Father insisted on staying late, footsore and dusty as we were.” (paragraph 3) "
        "C: “Father decreed that we spend all day in the Manufactures and Liberal Arts Building, by far the biggest of the Great Buildings.” (paragraph 4) "
        "D: “At dusk, we watched the lights come on again like thousands of candles lit all at once.” (paragraph 5)"
    ),
    "nysed-ela-2025-g7-mc-q40": (
        "Question 40. Which sentence best supports the claim made by the author in paragraph 1? Choices: "
        "A: “Graham’s techniques are still taught today, and her approach to movement has inspired many young dancers to make their careers on the stage.” (paragraph 3) "
        "B: “Dunham spent 18 months in Jamaica, Martinique, Trinidad, and Haiti, gaining the trust of her subjects so she could learn and perform their ritual dances.” (paragraph 4) "
        "C: “She received a scholarship to the New Dance Group, which offered dance lessons to professionals and children.” (paragraph 7) "
        "D: “The all-female group was known for avant-garde performances minimalistic in both movement and stage design.” (paragraph 9)"
    ),
    "nysed-ela-2022-g7-mc-q12": (
        "Question 12. Which quotation best portrays Susan Butcher’s relationship with her dogs? Choices: "
        "A: “. . . she studied veterinary medicine at a nearby university, focusing on the care of dogs.” (paragraph 3) "
        "B: “. . . both the musher of the dogsled and the entire team of dogs must be in top physical condition.” (paragraph 4) "
        "C: “. . . Butcher bonded with her dogs and treated them as friends, family, and professional athletes.” (paragraph 5) "
        "D: “. . . Butcher was able to pull the dogs to safety and continue the race.” (paragraph 8)"
    ),
    "nysed-ela-2026-g5-mc-q19": (
        "Question 19. In the section titled “How Fungi Function,” the author best develops the idea that fungi and plants help each other by Choices: "
        "A: describing the way fungi filter water in the soil "
        "B: showing how fungi spores help fruit to develop "
        "C: describing how fungi roots create food for insects "
        "D: showing how fungi and trees share their food"
    ),
    "nysed-ela-2024-g6-mc-q17": (
        "Question 17. Which sentence from the article best supports the author’s central claim? Choices: "
        "A: “The sun—its rise and fall over a day and the whirling of the Earth around it for a year—powers these events.” (paragraph 2) "
        "B: “Like the region’s other hoofed animals—wildebeests and gazelles—zebras must stay on the move for fresh grass and water.” (paragraph 16) "
        "C: “Sometimes, herds will come together by the thousands to find better feeding grounds.” (paragraph 17) "
        "D: “The timing of their travels is driven by rainfall, which fuels the growth of new grass and refills water holes.” (paragraph 19)"
    ),
    "nysed-ela-2023-g6-mc-q26": (
        "Question 26. Which detail from the article would be most important to include in a summary? Choices: "
        "A: “Stand between a hummingbird and the sun—with the light to your back—and you’ll witness the flash as the bird faces the sun.” (paragraph 3) "
        "B: “Hummingbirds live where flowers bloom—but only in the western half of the world.” (paragraph 4) "
        "C: “Ruby-throated and rufous hummers fly more than 3200 kilometres (2000 miles) from their nesting sites in the north to their winter homes in the south.” (paragraph 6) "
        "D: “They’re surprisingly good right away, but they have to work to improve their landing skills.” (paragraph 13)"
    ),
    "nysed-ela-2023-g5-mc-q3": (
        "Question 3. Which evidence best supports Brianna’s claim in paragraph 4 about making good things happen? Choices: "
        "A: “Think about what you want, decide how you plan to get it, then write it down . . .” (paragraph 6) "
        "B: “. . . she didn’t think any of her success would have been possible had it not been for the skills . . .” (paragraph 9) "
        "C: “. . . the election wasn’t just for each fifth-grade class to have its own president.” (paragraph 19) "
        "D: “And I could just see me making my acceptance speech . . .” (paragraph 23)"
    ),
    "nysed-ela-2023-g8-mc-q24": (
        "Question 24. Which detail supports a theme of the story? Choices: "
        "A: “She had been lost without food for many sleeps on the North Slope of Alaska.” (paragraph 2) "
        "B: “Patience with the ways of nature had been instilled in her by her father.” (paragraph 6) "
        "C: “Then his eyes sped to each of the three adult wolves that made up his pack and finally to the five pups . . .” (paragraph 7) "
        "D: “Not a tree grew anywhere to break the monotony of the gold-green plain . . .” (paragraph 8)"
    ),
    "nysed-ela-2023-g8-mc-q38": (
        "Question 38. Which detail from the article best shows the author’s point of view about SoFi? Choices: "
        "A: “Robotic fish like her could be essential to understanding and protecting marine life in danger of disappearing . . .” (paragraph 5) "
        "B: “This foot-and-a-half long robot mimics a real fish.” (paragraph 6) "
        "C: “I was amazed at how well it was working, how well I was able to get this tail to beat back and forth or swim left and right . . .” (paragraph 10) "
        "D: “And the fish can’t be as big as a submarine—unless we wanted to build a whale.” (paragraph 13)"
    ),
    "nysed-ela-2026-g7-mc-q29": (
        "Question 29. Which detail from paragraph 1 best develops Chengli’s claim that the journey is long and dull? Choices: "
        "A: “Three weeks on the road” "
        "B: “Hour after hour, it was all the same” "
        "C: “. . . sometimes a farmer could be seen walking behind his ox . . .” "
        "D: “The caravan did not stop at these villages . . .”"
    ),
    "nysed-ela-2025-g5-mc-q26": (
        "Question 26. Which detail best expresses a theme of being determined? Choices: "
        "A: “So First Woman sent Glowworm, Fox Fire, Lightning Beetle, and Firefly to the four corners.” (paragraph 3) "
        "B: “She consulted Fire Man on his glowing mountain.” (paragraph 4) "
        "C: “It took a lot of hard work and a lot of help . . .” (paragraph 6) "
        "D: “. . . they worked with their flint knives, chisels, and stone hammers to shape the stars.” (paragraph 13)"
    ),
    "nysed-ela-2024-g7-mc-q23": (
        "Question 23. Which detail would be most important to include in a summary of the story? Choices: "
        "A: “Always meticulously neat, six-year-old Little Man never allowed dirt or tears or stains to mar anything he owned.” (paragraph 1) "
        "B: “If I hadn’t known the cause of it, I could have forgotten very easily that he was, at twelve, bigger than I . . .” (paragraph 5) "
        "C: “An ancient oak tree on the slope, visible even now, was the official dividing mark between Logan land and the beginning of a dense forest.” (paragraph 10) "
        "D: “. . . for the past three years there had not been enough money from the cotton to pay both and live on too.” (paragraph 11)"
    ),
}


@dataclass(frozen=True)
class Word:
    text: str
    x0: float
    y0: float
    x1: float
    y1: float

    @property
    def x(self) -> float:
        return (self.x0 + self.x1) / 2

    @property
    def y(self) -> float:
        return (self.y0 + self.y1) / 2


def _asset_path(asset_root: Path, src: Any) -> Path:
    if not isinstance(src, str) or not src.startswith(APP_PUBLIC_PREFIX):
        raise ValueError(f"Invalid ELA image path {src!r}")
    root = asset_root.resolve()
    candidate = root / src[len(APP_PUBLIC_PREFIX) :]
    if candidate.is_symlink():
        raise ValueError(f"Unsafe symlink ELA image {candidate}")
    path = candidate.resolve()
    try:
        path.relative_to(root)
    except ValueError as exc:
        raise ValueError(f"ELA image escapes the asset root: {src!r}") from exc
    if not path.is_file() or path.is_symlink():
        raise ValueError(f"Missing or unsafe ELA image {path}")
    return path


def _normalize_pdf_glyphs(value: str) -> str:
    for source, replacement in PDF_GLYPHS.items():
        value = value.replace(source, replacement)
    return value


def _collapse_doubled_token(value: str) -> str:
    """Collapse a token only when every adjacent character is duplicated."""

    if len(value) < 4 or len(value) % 2:
        return value
    # A doubled PDF glyph can expand to two Unicode letters (notably fi/fl/Th),
    # producing runs such as ``fifi`` and ``ThTh`` amid ordinary doubled
    # characters. Decode only when the entire run has one unambiguous pairing.
    units = {"fi", "fl", "ff", "ft", "Th", "th"}

    def decode(index: int) -> str | None:
        if index == len(value):
            return ""
        if index + 2 <= len(value) and value[index] == value[index + 1]:
            remainder = decode(index + 2)
            if remainder is not None:
                return value[index] + remainder
        if index + 4 <= len(value):
            unit = value[index : index + 2]
            if unit in units and value[index + 2 : index + 4] == unit:
                remainder = decode(index + 4)
                if remainder is not None:
                    return unit + remainder
        return None

    collapsed = decode(0)
    return collapsed if collapsed is not None else value


def _repair_doubled_layout(value: str) -> str:
    tokens = re.split(r"(\s+)", value)
    value = "".join(
        token if token.isspace() else _collapse_doubled_token(token)
        for token in tokens
    ).replace("““", "“").replace("””", "”")
    return re.sub(
        r"[A-Za-z]{4,}",
        lambda match: _collapse_doubled_token(match.group(0)),
        value,
    )


def _clean_source_text(value: str) -> str:
    value = _normalize_pdf_glyphs(html.unescape(value)).translate(LATIN_LIGATURES)
    value = _repair_doubled_layout(value)
    value = value.replace("_", " ")
    value = re.sub(r"(?<![A-Za-z])Tt(?![A-Za-z])", "It", value)
    value = re.sub(r"(?<![A-Za-z])/n(?![A-Za-z])", "In", value)
    value = re.sub(r"(?<!\S)[=»](?!\S)", " ", value)
    value = re.sub(r"\s+([,.;:!?])", r"\1", value)
    value = re.sub(r"([“‘(])\s+", r"\1", value)
    value = re.sub(r"\s+([”’)])", r"\1", value)
    return re.sub(r"\s+", " ", value).strip()


def _line_text(words: Iterable[Word]) -> str:
    ordered = sorted(words, key=lambda item: item.x)
    if len(ordered) >= 8 and sum(len(word.text) == 1 for word in ordered) / len(ordered) >= 0.7:
        pieces = [ordered[0].text]
        for previous, word in zip(ordered, ordered[1:]):
            pieces.append(" " if word.x0 - previous.x1 > 1.5 else "")
            pieces.append(word.text)
        return _clean_source_text("".join(pieces))
    return _clean_source_text(" ".join(word.text for word in ordered))


def _group_lines(words: Sequence[Word], *, tolerance: float = 3.5) -> list[list[Word]]:
    lines: list[list[Word]] = []
    centers: list[float] = []
    for word in sorted(words, key=lambda item: (item.y, item.x)):
        match = next(
            (index for index, center in enumerate(centers) if abs(word.y - center) <= tolerance),
            None,
        )
        if match is None:
            lines.append([word])
            centers.append(word.y)
        else:
            lines[match].append(word)
            centers[match] = sum(item.y for item in lines[match]) / len(lines[match])
    return [line for _, line in sorted(zip(centers, lines), key=lambda item: item[0])]


def _page_words(xml_path: Path) -> list[Word]:
    root = ET.parse(xml_path).getroot()
    result: list[Word] = []
    for node in root.findall(".//x:word", XML_NAMESPACE):
        text = _normalize_pdf_glyphs(node.text or "")
        if not text:
            continue
        result.append(
            Word(
                text=text,
                x0=float(node.attrib["xMin"]),
                y0=float(node.attrib["yMin"]),
                x1=float(node.attrib["xMax"]),
                y1=float(node.attrib["yMax"]),
            )
        )
    return result


def _pdf_pages(pdf_path: Path, pages: Sequence[int], work_root: Path) -> dict[int, list[Word]]:
    work_root.mkdir(parents=True, exist_ok=True)
    result: dict[int, list[Word]] = {}
    pdf_hash = sha256_file(pdf_path)[:20]
    for page in sorted(set(pages)):
        xml_path = work_root / f"{pdf_hash}-page-{page}.xml"
        if not xml_path.exists():
            completed = subprocess.run(
                [
                    "pdftotext",
                    "-f",
                    str(page),
                    "-l",
                    str(page),
                    "-bbox-layout",
                    str(pdf_path),
                    str(xml_path),
                ],
                check=False,
                capture_output=True,
                text=True,
            )
            if completed.returncode != 0:
                raise RuntimeError(
                    f"pdftotext failed for {pdf_path.name} page {page}: {completed.stderr.strip()}"
                )
        result[page] = _page_words(xml_path)
    return result


def _choice_label_words(words: Sequence[Word], left: float, *, label_lane: float = 105) -> list[Word] | None:
    candidates = sorted([
        word
        for word in words
        if word.text in {"A", "B", "C", "D"} and word.x0 <= left + label_lane
    ], key=lambda word: (word.y, word.x))
    runs: list[tuple[float, list[Word]]] = []
    by_exact_label = {
        label: [word for word in candidates if word.text == label] for label in "ABCD"
    }
    for selected_tuple in product(*(by_exact_label[label] for label in "ABCD")):
        selected = list(selected_tuple)
        if not all(selected[index].y + 4 < selected[index + 1].y for index in range(3)):
            continue
        x_values = [word.x0 for word in selected]
        if max(x_values) - min(x_values) > 30:
            continue
        steps = [selected[index + 1].y - selected[index].y for index in range(3)]
        mean_step = sum(steps) / len(steps)
        score = (max(x_values) - min(x_values)) * 4 + sum(
            abs(step - mean_step) for step in steps
        )
        runs.append((score, selected))
    if runs:
        return min(runs, key=lambda item: item[0])[1]
    # The final-WebP validation cache independently proves that every crop has
    # all four visible labels. Tesseract occasionally misses one (most often a
    # lightly antialiased A). Infer only one missing lane position from the
    # other three; two or more misses remain an authoring failure.
    by_label: dict[str, list[Word]] = {
        label: sorted((word for word in candidates if word.text == label), key=lambda word: word.y)
        for label in "ABCD"
    }
    recognized_count = sum(bool(values) for values in by_label.values())
    if recognized_count == 3:
        selected_by_label: dict[str, Word] = {}
        previous_y = -1.0
        for label in "ABCD":
            if not by_label[label]:
                continue
            match = next((word for word in by_label[label] if word.y > previous_y + 4), None)
            if match is None:
                return None
            selected_by_label[label] = match
            previous_y = match.y
        known = [(index, selected_by_label[label]) for index, label in enumerate("ABCD") if label in selected_by_label]
        mean_index = sum(index for index, _ in known) / len(known)
        mean_y = sum(word.y for _, word in known) / len(known)
        denominator = sum((index - mean_index) ** 2 for index, _ in known)
        if denominator == 0:
            return None
        step = sum((index - mean_index) * (word.y - mean_y) for index, word in known) / denominator
        if step <= 25:
            return None
        exemplar = known[0][1]
        for missing_index, label in enumerate("ABCD"):
            if label in selected_by_label:
                continue
            inferred_y = mean_y + step * (missing_index - mean_index)
            selected_by_label[label] = Word(
                label,
                exemplar.x0,
                inferred_y - (exemplar.y1 - exemplar.y0) / 2,
                exemplar.x1,
                inferred_y + (exemplar.y1 - exemplar.y0) / 2,
            )
        result = [selected_by_label[label] for label in "ABCD"]
        if all(result[index].y < result[index + 1].y for index in range(3)):
            return result
    return None


def _structured_alt_from_words(
    *,
    number: int,
    words: Sequence[Word],
    left: float,
    label_lane: float,
    line_tolerance: float = 3.5,
) -> str | None:
    labels = _choice_label_words(words, left, label_lane=label_lane)
    if labels is None:
        return None
    label_ids = {id(word) for word in labels}
    content = [
        word
        for word in words
        if id(word) not in label_ids
        and not (
            word.text in {"A", "B", "C", "D"}
            and word.x0 <= left + label_lane
            and any(abs(word.y - label.y) <= 20 for label in labels)
        )
    ]

    # The label glyph's baseline is usually lower than the first choice line.
    # Use the nearest right-hand text row as the visual start of each choice.
    row_starts: list[float] = []
    content_lines = _group_lines(content, tolerance=line_tolerance)
    for label in labels:
        candidate_lines = [
            line
            for line in content_lines
            if any(word.x0 >= label.x1 + 5 for word in line)
            and abs(sum(word.y for word in line) / len(line) - label.y) <= 40
        ]
        if not candidate_lines:
            return None
        row_start = min(
            (sum(word.y for word in line) / len(line) for line in candidate_lines),
            key=lambda center: abs(center - label.y) + (15 if center > label.y else 0),
        )
        row_starts.append(row_start)
    if row_starts != sorted(row_starts):
        return None

    boundaries = [(row_starts[index] + row_starts[index + 1]) / 2 for index in range(3)]
    first_choice_words = [word for word in content if word.y < boundaries[0]]
    first_choice_min_y = min(
        (word.y for word in first_choice_words if abs(word.y - row_starts[0]) <= 20),
        default=row_starts[0],
    )
    stem_words = [word for word in content if word.y < first_choice_min_y - 7]
    # Remove the gray-box question number but preserve paragraph/line numbers
    # printed as part of the stem.
    stem_words = [
        word
        for word in stem_words
        if not (word.text == str(number) and word.x0 <= left + 45)
    ]
    stem = " ".join(
        _line_text(line) for line in _group_lines(stem_words, tolerance=line_tolerance)
    )
    stem = _clean_source_text(stem)
    stem = re.sub(rf"^{number}\s*[.]?\s*", "", stem)
    if len(re.sub(r"[^A-Za-z0-9]", "", stem)) < 6:
        return None

    choices: list[str] = []
    starts = [first_choice_min_y, *boundaries]
    ends = [*boundaries, float("inf")]
    for start, end in zip(starts, ends, strict=True):
        choice_words = [word for word in content if start - 0.2 <= word.y < end]
        choice = " ".join(
            _line_text(line)
            for line in _group_lines(choice_words, tolerance=line_tolerance)
        )
        choice = _clean_source_text(choice)
        if not choice or not any(character.isalnum() for character in choice):
            return None
        choices.append(choice)
    return (
        f"Question {number}. {stem} Choices: "
        + " ".join(f"{label}: {choice}" for label, choice in zip("ABCD", choices, strict=True))
    )


def _pdf_structured_alt(
    *, number: int, crop: dict[str, Any], words: Sequence[Word]
) -> str | None:
    left, top, right, bottom = (float(value) for value in crop["box"])
    cropped = [
        word
        for word in words
        if left <= word.x <= right and top <= word.y <= bottom
    ]
    return _structured_alt_from_words(
        number=number, words=cropped, left=left, label_lane=105, line_tolerance=3.5
    )


def _tesseract_words(image_path: Path) -> list[Word]:
    completed = subprocess.run(
        ["tesseract", str(image_path), "stdout", "--psm", "6", "tsv"],
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        raise RuntimeError(
            f"Tesseract TSV failed for {image_path}: {completed.stderr.strip()}"
        )
    def parse_tsv(value: str, *, x_offset: float = 0, y_offset: float = 0, labels_only: bool = False) -> list[Word]:
        parsed: list[Word] = []
        for line in value.splitlines()[1:]:
            columns = line.split("\t", 11)
            if len(columns) != 12 or columns[0] != "5" or not columns[11].strip():
                continue
            try:
                left, top, width, height = (float(columns[index]) for index in range(6, 10))
                confidence = float(columns[10])
            except ValueError:
                continue
            text = _clean_source_text(columns[11])
            # The review cache proves all four visual choice labels independently;
            # normalize only label-lane variants that Tesseract emits repeatedly.
            text = {
                "Aa": "A",
                "Bb": "B",
                "Bs": "B",
                "Cc": "C",
                "Dd": "D",
                "Ds": "D",
            }.get(text, text)
            if left + x_offset < 140 and text in {"a", "b", "c", "d"}:
                text = text.upper()
            if labels_only and text not in {"A", "B", "C", "D"}:
                continue
            parsed.append(
                Word(
                    text,
                    left + x_offset,
                    top + y_offset,
                    left + width + x_offset,
                    top + height + y_offset,
                )
            )
        return parsed

    result = parse_tsv(completed.stdout)

    # Whole-crop OCR misses a surprising number of isolated option letters.
    # A second source-image pass examines only the fixed left label lane with
    # an A-D whitelist. This is authoring evidence; production never OCRs.
    identify = subprocess.run(
        ["magick", "identify", "-format", "%h", str(image_path)],
        check=False,
        capture_output=True,
        text=True,
    )
    if identify.returncode != 0 or not identify.stdout.strip().isdigit():
        raise RuntimeError(f"Could not inspect ELA crop dimensions: {image_path}")
    height = int(identify.stdout.strip())
    with tempfile.NamedTemporaryFile(suffix=".png") as temporary:
        cropped = subprocess.run(
            [
                "magick",
                str(image_path),
                "-crop",
                f"100x{height}+50+0",
                "+repage",
                temporary.name,
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        if cropped.returncode != 0:
            raise RuntimeError(
                f"Could not isolate ELA choice-label lane in {image_path}: {cropped.stderr.strip()}"
            )
        lane = subprocess.run(
            [
                "tesseract",
                temporary.name,
                "stdout",
                "--psm",
                "6",
                "-c",
                "tessedit_char_whitelist=ABCD",
                "tsv",
            ],
            check=False,
            capture_output=True,
            text=True,
        )
    if lane.returncode != 0:
        raise RuntimeError(f"ELA choice-label OCR failed for {image_path}")
    lane_words = parse_tsv(lane.stdout, x_offset=50, labels_only=True)
    for word in lane_words:
        if any(
            existing.text == word.text and abs(existing.y - word.y) <= 12
            for existing in result
        ):
            continue
        result.append(word)
    return result


def _ocr_map(ocr_root: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    for path in sorted(ocr_root.glob("*.json")):
        try:
            record = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        image_hash = record.get("imageSha256")
        text = record.get("normalizedOcr")
        if isinstance(image_hash, str) and isinstance(text, str) and text.strip():
            existing = result.setdefault(image_hash, text)
            if existing != text:
                raise ValueError(f"Conflicting final-WebP OCR for {image_hash}")
    return result


def _ocr_structured_alt(number: int, value: str) -> str | None:
    value = _clean_source_text(value)
    value = re.sub(rf"^\s*{number}\s+", "", value)
    # Source-reviewed label substitutions only; they occur in the left choice
    # lane, never as genuine prose tokens in this corpus.
    value = re.sub(r"(?m)^\s*Cc(?=\s)", "C", value)
    value = re.sub(r"(?m)^\s*Ds(?=\s)", "D", value)
    value = re.sub(r"(?m)^\s*Bs(?=\s)", "B", value)
    lines = value.splitlines() if "\n" in value else [value]
    # _clean_source_text flattened newlines; recover labels with a conservative
    # token boundary scan and require exactly one monotonic A-D run.
    matches = list(re.finditer(r"(?<![A-Za-z0-9])([ABCD])\s+", value))
    runs: list[list[re.Match[str]]] = []
    for a_index, match in enumerate(matches):
        if match.group(1) != "A":
            continue
        run = [match]
        cursor = a_index + 1
        for expected in "BCD":
            found = next((item for item in matches[cursor:] if item.group(1) == expected), None)
            if found is None:
                break
            run.append(found)
            cursor = matches.index(found) + 1
        if len(run) == 4:
            runs.append(run)
    if not runs:
        return None
    run = runs[-1]
    stem = _clean_source_text(value[: run[0].start()])
    choices = [
        _clean_source_text(
            value[match.end() : run[index + 1].start() if index < 3 else len(value)]
        )
        for index, match in enumerate(run)
    ]
    if len(re.sub(r"[^A-Za-z0-9]", "", stem)) < 6 or any(not choice for choice in choices):
        return None
    return (
        f"Question {number}. {stem} Choices: "
        + " ".join(f"{label}: {choice}" for label, choice in zip("ABCD", choices, strict=True))
    )


def _structured_segments(value: str, number: int) -> list[str] | None:
    prefix = f"Question {number}."
    if not value.startswith(prefix) or value.count("Choices:") != 1:
        return None
    stem, choice_text = value[len(prefix) :].split("Choices:", 1)
    matches = list(re.finditer(r"(?<![A-Za-z0-9])([ABCD]):\s*", choice_text))
    if [match.group(1) for match in matches] != list("ABCD"):
        return None
    choices = [
        choice_text[
            match.end() : matches[index + 1].start() if index < 3 else len(choice_text)
        ].strip()
        for index, match in enumerate(matches)
    ]
    result = [_clean_source_text(stem), *(_clean_source_text(choice) for choice in choices)]
    return result if all(result) else None


def _alignment_token(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def _catalog_label(value: str) -> str | None:
    token = value.strip()
    match = re.fullmatch(r"([A-D])[:]?_*$", token)
    if match:
        return match.group(1)
    return {
        "Aa": "A",
        "Bb": "B",
        "Bs": "B",
        "Cc": "C",
        "Dd": "D",
        "Ds": "D",
    }.get(token.rstrip("_"))


def _remove_catalog_choice_labels(value: str, geometry_tokens: Sequence[str]) -> list[str] | None:
    tokens = value.split()
    by_label = {
        label: [index for index, token in enumerate(tokens) if _catalog_label(token) == label]
        for label in "ABCD"
    }
    candidates: list[tuple[float, list[str]]] = []
    for indices in product(*([None, *by_label[label]] for label in "ABCD")):
        selected = [index for index in indices if index is not None]
        if selected != sorted(selected) or len(set(selected)) != len(selected):
            continue
        remaining = [token for index, token in enumerate(tokens) if index not in set(selected)]
        normalized = [_alignment_token(token) for token in remaining]
        normalized = [token for token in normalized if token]
        score = (
            SequenceMatcher(None, geometry_tokens, normalized, autojunk=False).ratio()
            - (4 - len(selected)) * 0.005
        )
        candidates.append((score, remaining))
    if not candidates:
        return None
    return max(candidates, key=lambda item: item[0])[1]


def _project_alignment_boundary(
    matcher: SequenceMatcher[str], boundary: int, source_length: int, target_length: int
) -> int:
    if boundary <= 0:
        return 0
    if boundary >= source_length:
        return target_length
    for _, i1, i2, j1, j2 in matcher.get_opcodes():
        if i1 <= boundary <= i2:
            if i2 == i1:
                return j1
            fraction = (boundary - i1) / (i2 - i1)
            return round(j1 + fraction * (j2 - j1))
    raise AssertionError("SequenceMatcher boundary was not covered")


def _catalog_first_structured_alt(
    *, number: int, catalog_alt: str, geometry_alt: str
) -> str | None:
    """Use image geometry for boundaries while preserving catalog prose."""

    # A strict catalog description has already passed the reviewed production
    # policy. Preserve its A-D boundaries verbatim on maintenance re-runs;
    # source-specific overrides below still replace the two legacy records
    # whose formerly strict text had visually incorrect boundaries.
    if _strict_candidate(
        catalog_alt,
        question_id=f"catalog-question-{number}",
        number=number,
    ):
        return _clean_source_text(catalog_alt)

    geometry_segments = _structured_segments(geometry_alt, number)
    if geometry_segments is None:
        return None
    geometry_segment_tokens = [
        [token for token in (_alignment_token(value) for value in segment.split()) if token]
        for segment in geometry_segments
    ]
    geometry_tokens = [token for segment in geometry_segment_tokens for token in segment]

    prefix = f"Question {number}."
    if not catalog_alt.startswith(prefix):
        return None
    raw_body = catalog_alt[len(prefix) :].strip()
    raw_body = re.sub(rf"^{number}\s*[.]?\s*", "", raw_body)
    # Generated catalogs already contain the reviewed ``Choices:`` separator.
    # It is structural metadata, not part of choice A's prose, so remove it
    # before projecting the source-image choice boundaries onto catalog text.
    raw_body = re.sub(r"\s+Choices:\s+", " ", raw_body, count=1)
    raw_body = _clean_source_text(raw_body)
    remaining = _remove_catalog_choice_labels(raw_body, geometry_tokens)
    if remaining is None:
        return None
    cleaned = _clean_source_text(" ".join(remaining))
    catalog_tokens = [token for token in cleaned.split() if _alignment_token(token)]
    catalog_normalized = [_alignment_token(token) for token in catalog_tokens]
    matcher: SequenceMatcher[str] = SequenceMatcher(
        None, geometry_tokens, catalog_normalized, autojunk=False
    )
    if matcher.ratio() < 0.72:
        return None
    geometry_boundaries: list[int] = []
    cursor = 0
    for segment in geometry_segment_tokens[:-1]:
        cursor += len(segment)
        geometry_boundaries.append(cursor)
    projected = [
        _project_alignment_boundary(
            matcher, boundary, len(geometry_tokens), len(catalog_tokens)
        )
        for boundary in geometry_boundaries
    ]
    if projected != sorted(projected) or any(
        right <= left for left, right in zip([0, *projected], [*projected, len(catalog_tokens)])
    ):
        return None
    starts = [0, *projected]
    ends = [*projected, len(catalog_tokens)]
    result = [
        _clean_source_text(" ".join(catalog_tokens[start:end]))
        for start, end in zip(starts, ends, strict=True)
    ]
    if any(not segment for segment in result):
        return None
    return (
        f"Question {number}. {result[0]} Choices: "
        + " ".join(
            f"{label}: {choice}"
            for label, choice in zip("ABCD", result[1:], strict=True)
        )
    )


def _candidate_tokens(value: str, number: int) -> list[str]:
    segments = _structured_segments(value, number)
    if segments is None:
        return []
    return [
        token
        for segment in segments
        for token in (_alignment_token(raw) for raw in segment.split())
        if token
    ]


def _token_recall(reference: Sequence[str], candidate: Sequence[str]) -> float:
    if not reference:
        return 0.0
    reference_counts = Counter(reference)
    candidate_counts = Counter(candidate)
    matched = sum(
        min(count, candidate_counts[token]) for token, count in reference_counts.items()
    )
    return matched / sum(reference_counts.values())


def _strict_candidate(value: str, *, question_id: str, number: int) -> bool:
    try:
        validate_ela_question_accessibility_text(
            value, question_id=question_id, number=number
        )
    except (TypeError, ValueError):
        return False
    return True


def _choose_source_compared_candidate(
    *, question_id: str, number: int, geometry_alt: str, catalog_alt: str
) -> str:
    """Prefer clean facsimile OCR only when it retains the source draft."""

    geometry_tokens = _candidate_tokens(geometry_alt, number)
    catalog_tokens = _candidate_tokens(catalog_alt, number)
    geometry_is_strict = _strict_candidate(
        geometry_alt, question_id=question_id, number=number
    )
    catalog_is_strict = _strict_candidate(
        catalog_alt, question_id=question_id, number=number
    )
    recall = _token_recall(catalog_tokens, geometry_tokens)
    order_similarity = SequenceMatcher(
        None, catalog_tokens, geometry_tokens, autojunk=False
    ).ratio()
    if catalog_is_strict:
        return catalog_alt
    if geometry_is_strict and recall >= 0.90 and order_similarity >= 0.70:
        return geometry_alt
    # Draft output remains deliberately unapproved. Retaining the catalog
    # candidate here minimizes textual loss and leaves strict validation plus
    # facsimile review to the separate promotion workflow.
    return catalog_alt


def _apply_reviewed_question_repairs(
    *, question_id: str, number: int, value: str
) -> str:
    override = REVIEWED_ALT_OVERRIDES.get(question_id)
    if override is not None:
        return validate_ela_question_accessibility_text(
            override,
            question_id=question_id,
            number=number,
        )
    if question_id in REVIEWED_DUPLICATE_LABEL_IDS:
        # Some embedded-font text layers repeat a visual answer label in the
        # prose lane (for example ``B: B: by sharing``). Collapse that exact
        # reviewed artifact before parsing the four structural boundaries.
        value = re.sub(
            r"(?<![A-Za-z0-9])([ABCD]):\s*\1:\s*",
            r"\1: ",
            value,
        )
    segments = _structured_segments(value, number)
    if segments is None:
        raise ValueError(f"Cannot repair malformed ELA draft {question_id}")
    if question_id in REVIEWED_CROP_NUMBER_IDS:
        segments[1:] = [
            re.sub(rf"^{number}\s+", "", choice) for choice in segments[1:]
        ]
    if question_id in REVIEWED_DUPLICATE_LABEL_IDS:
        segments[1:] = [
            re.sub(rf"^{label}\s+", "", choice)
            for label, choice in zip("ABCD", segments[1:], strict=True)
        ]
    repaired = (
        f"Question {number}. {segments[0]} Choices: "
        + " ".join(
            f"{label}: {choice}"
            for label, choice in zip("ABCD", segments[1:], strict=True)
        )
    )
    replacements = REVIEWED_LITERAL_REPAIRS.get(question_id, ())
    matched = 0
    for source, replacement in replacements:
        count = repaired.count(source)
        if count:
            repaired = repaired.replace(source, replacement)
            matched += count
    if replacements and matched == 0 and not all(
        replacement in repaired for _, replacement in replacements
    ):
        raise ValueError(f"Reviewed ELA repair anchors changed for {question_id}")
    return _clean_source_text(repaired)


def _find_pdf(pdf_root: Path, *, year: int, grade: int, expected_sha: str) -> Path:
    matches = [
        path
        for path in pdf_root.glob(f"{year}-g{grade}-*.pdf")
        if sha256_file(path) == expected_sha
    ]
    if len(matches) != 1:
        raise ValueError(
            f"Expected one exact {year} Grade {grade} PDF with SHA {expected_sha}; got {matches}"
        )
    return matches[0]


def _atomic_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    temporary.replace(path)


def _exam_inputs(
    exam: dict[str, Any], asset_root: Path, source_pdf_sha256: str
) -> tuple[dict[str, str], dict[str, int]]:
    hashes: dict[str, str] = {}
    numbers: dict[str, int] = {}
    for question in exam["questions"]:
        question_id = str(question["id"])
        number = int(question["number"])
        image_sha256 = sha256_file(_asset_path(asset_root, question["image"]["src"]))
        hashes[question_id] = ela_question_accessibility_input_hash(
            question_id=question_id,
            number=number,
            source_pdf_sha256=source_pdf_sha256,
            question_image_sha256=image_sha256,
        )
        numbers[question_id] = number
    return hashes, numbers


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--asset-root", type=Path, default=DEFAULT_ASSET_ROOT)
    parser.add_argument("--pdf-root", type=Path, default=DEFAULT_PDF_ROOT)
    parser.add_argument("--ocr-root", type=Path, default=DEFAULT_OCR_ROOT)
    parser.add_argument(
        "--sidecar-root", type=Path
    )
    parser.add_argument("--author", action="store_true")
    parser.add_argument("--year", type=int)
    parser.add_argument("--grade", type=int)
    args = parser.parse_args(argv)
    sidecar_root = args.sidecar_root or (
        DEFAULT_DRAFT_ROOT if args.author else DEFAULT_ELA_QUESTION_ACCESSIBILITY_ROOT
    )

    catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
    all_exams = [
        exam for exam in catalog["exams"] if int(exam["grade"]) in range(3, 9)
    ]
    if len(all_exams) != EXPECTED_ELA_QUESTION_ACCESSIBILITY_EXAMS:
        raise ValueError(f"Expected 78 ELA exams, found {len(all_exams)}")
    if (args.year is not None or args.grade is not None) and not args.author:
        raise ValueError("--year/--grade are authoring resume filters; validation is always full-corpus")
    exams = [
        exam
        for exam in all_exams
        if (args.year is None or int(exam["year"]) == args.year)
        and (args.grade is None or int(exam["grade"]) == args.grade)
    ]
    if not exams:
        raise ValueError("Authoring filter selected no ELA exams")
    ocr_by_hash = _ocr_map(args.ocr_root) if args.author else {}
    total = 0
    source_counts = {"pdf": 0, "ocr": 0}
    with tempfile.TemporaryDirectory(prefix="ela-question-accessibility-") as temporary:
        work_root = Path(temporary)
        for exam in exams:
            year = int(exam["year"])
            grade = int(exam["grade"])
            manifest_path = args.asset_root / str(year) / f"grade-{grade}" / "en" / ".nysed-import.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            source_pdf_sha256 = str(manifest["sourcePdfSha256"])
            input_hashes, numbers = _exam_inputs(
                exam, args.asset_root, source_pdf_sha256
            )
            total += len(numbers)
            sidecar_path = sidecar_root / f"{year}-grade-{grade}.json"
            if not args.author:
                load_exam_question_accessibility(
                    year=year,
                    grade=grade,
                    exam_id=str(exam["id"]),
                    source_pdf_sha256=source_pdf_sha256,
                    expected_input_hashes=input_hashes,
                    expected_numbers=numbers,
                    root=sidecar_root,
                )
                continue

            pdf_path = _find_pdf(
                args.pdf_root,
                year=year,
                grade=grade,
                expected_sha=source_pdf_sha256,
            )
            pages = [int(manifest["crops"][str(number)]["sourcePage"]) for number in numbers.values()]
            page_words = _pdf_pages(pdf_path, pages, work_root)
            entries: dict[str, dict[str, str]] = {}
            questions_by_id = {str(question["id"]): question for question in exam["questions"]}
            for question_id, number in numbers.items():
                question = questions_by_id[question_id]
                crop = manifest["crops"][str(number)]
                alt = _pdf_structured_alt(
                    number=number,
                    crop=crop,
                    words=page_words[int(crop["sourcePage"])],
                )
                source = "pdf"
                if alt is None:
                    image_path = _asset_path(args.asset_root, question["image"]["src"])
                    alt = _structured_alt_from_words(
                        number=number,
                        words=_tesseract_words(image_path),
                        left=0,
                        label_lane=150,
                        line_tolerance=14,
                    )
                    source = "ocr"
                if alt is None:
                    image_hash = sha256_file(_asset_path(args.asset_root, question["image"]["src"]))
                    alt = _ocr_structured_alt(number, ocr_by_hash.get(image_hash, ""))
                if alt is None:
                    raise ValueError(f"Could not structure source text for {question_id}")
                catalog_first = _catalog_first_structured_alt(
                    number=number,
                    catalog_alt=str(question.get("alt", "")),
                    geometry_alt=alt,
                )
                if catalog_first is None:
                    raise ValueError(
                        f"Could not preserve catalog prose while structuring {question_id}"
                    )
                alt = _choose_source_compared_candidate(
                    question_id=question_id,
                    number=number,
                    geometry_alt=alt,
                    catalog_alt=catalog_first,
                )
                alt = _apply_reviewed_question_repairs(
                    question_id=question_id,
                    number=number,
                    value=alt,
                )
                if _structured_segments(alt, number) is None:
                    raise ValueError(f"Malformed structured draft for {question_id}")
                source_counts[source] += 1
                entries[question_id] = {
                    "inputHash": input_hashes[question_id],
                    "alt": alt,
                }
            _atomic_json(
                sidecar_path,
                {
                    "schemaVersion": ELA_QUESTION_ACCESSIBILITY_SCHEMA_VERSION,
                    "policyVersion": ELA_QUESTION_ACCESSIBILITY_POLICY_VERSION,
                    "examId": exam["id"],
                    "sourcePdfSha256": source_pdf_sha256,
                    "questions": entries,
                },
            )
    if args.year is None and args.grade is None and total != EXPECTED_ELA_QUESTION_ACCESSIBILITY_QUESTIONS:
        raise ValueError(f"Expected 1,583 ELA questions, found {total}")
    action = "Authored" if args.author else "Validated"
    print(
        f"{action} {len(exams)} ELA accessibility sidecars / {total} questions"
        + (f" (PDF={source_counts['pdf']}, OCR={source_counts['ocr']})" if args.author else "")
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
