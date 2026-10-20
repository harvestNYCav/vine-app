# ESL Lesson Evaluation Summary (all 20 lessons, rubric v3)

The lesson files are `content/modules/*.ts`, taught in the order of `ALL_MODULES` (ESL track only). The other files in `evals/` are:
- `curriculum_map.json`: what each lesson introduces
- `lesson_NN.json`: one per lesson, with scores and findings
- `sequence.json`: ordering problems across the whole course

**Validation:**
- All 21 eval files are valid JSON, every score is an integer from 1 to 5, and every finding has all six v3 tags.
- Every quote was checked against its source: lesson quotes against the lesson file, sequence quotes against the curriculum map. All matched, so 0 findings were dropped.
- No lesson file was modified.

**Severity rules (v3).** `evals/postcheck.py` applies these to every finding. It computes severity from the finding's tags, not from the evaluator's own label:
- **Blocker:**
  - wrong English or an incorrect grammar rule
  - a wrong answer key
  - a narrow answer key in the **Student app**, where grading is automatic
  - a graded or required item asking for family, immigration, legal or trauma details, or a real address or phone number
  - another sensitivity harm
- **Major:**
  - a narrow answer key on the **Tutor slides**, where the tutor can overrule it
  - a disclosure item the lesson explicitly marks optional. An ungraded tutor-led activity counts as required unless the lesson marks it optional, and no lesson currently does.
  - a graded answer that depends on a word not taught yet
- **Minor:** untaught words in background text only, where no answer depends on them.
- **Cap:** a finding that triggers none of these rules keeps the evaluator's severity, capped at major.

A "narrow" key is correct but rejects another valid answer, or a multiple-choice distractor is also correct. Score anchors: 5 = no issues a tutor would notice, 3 = a tutor must patch something on the fly, 1 = can't be taught as is. Timing counts only the tutor slides.

**How v3 was applied:**
- **Lessons 01 and 07** were re-run from scratch with the v3 brief.
- **The other 18** were tagged by their original evaluators.
- **The post-check** then changed 0 severities: . The evaluators had already applied v3 while tagging. Every change is listed in `evals/postcheck_report.json`.
- **Compared with v2:** the 18 tagged lessons had 15 findings go from blocker to major (mostly narrow tutor-slides keys), 3 from major to blocker (required family or address items), 10 from minor to major and 2 from major to minor.
- **The manual consistency pass from v2 has been removed.**
- **Blocker verification:** 36 independent verifiers checked the blockers (see `evals/verified_blockers.md`): 32 confirmed, 3 downgrade-to-major and 1 rejected.
  - **Rejected:** lesson 03 homework item 5 (w5). It was moved to `rejected_findings` in `lesson_03.json` and is no longer counted.
  - **Downgrades overruled:** B17, B22 and B36 stay blockers under the rule that an activity is required unless marked optional.
  - **New blockers:** the same rule raised 2 role-plays to blocker, lesson 06 Part 2 and lesson 12 Part 3. These 2 were not part of the verifier run.
  - After verification there were 37 blockers. Each one still open is listed below with its verifier verdict.
- **Resolved:** 9 homework blockers are fixed. Each is in `resolved_findings` and no longer counted:
  - 05 Student app › Homework worksheet, item 1 (w1): acceptedAnswers added to the homework item in content/modules; checked against the real grader. Now accepts 'to cook'. Still open: cw6/cw8 on the tutor slides (also in this finding) are unchanged.
  - 10 Student app › Homework worksheet, item 1 (w1): Grader fix: lib/lesson-answers.ts now treats curly and straight apostrophes, and contractions and full forms, as the same answer. Now accepts 'do not' and 'don’t'.
  - 11 Student app › Homework worksheet, item 4 (w4): acceptedAnswers added to the homework item in content/modules; checked against the real grader. Now accepts 'Could'.
  - 13 Student app › Homework worksheet, item 2 (w2): acceptedAnswers added to the homework item in content/modules; checked against the real grader. Now accepts 'restroom'.
  - 14 Student app › Homework worksheet, item 2 (w2): Grader fix: lib/lesson-answers.ts now treats curly and straight apostrophes, and contractions and full forms, as the same answer. Now accepts 'o’clock' and 'oclock'.
  - 15 Student app › Homework worksheet, item 3 (w3): acceptedAnswers added to the homework item in content/modules; checked against the real grader. Now accepts 'bill'.
  - 16 Student app › Homework worksheet, item 3 (w3): acceptedAnswers added to the homework item in content/modules; checked against the real grader. Now accepts 'right'; neither prompt fixes the direction, and the lesson teaches both.
  - 17 Student app › Homework worksheet, item 5 (w5): acceptedAnswers added to the homework item in content/modules; checked against the real grader. Now accepts 'get'.
  - 18 Student app › Homework worksheet, item 3 (w3): acceptedAnswers added to the homework item in content/modules; checked against the real grader. Now accepts 'kids'. Still open: cw8 on the tutor slides (also in this finding) is unchanged.
- **Current count: 28 blockers.**

## 1. Sequence problems (from the curriculum map only)

11 major and 16 minor findings. Full details are in `evals/sequence.json`.

| Severity | Structure | First used | Taught in | Evidence (from the map) | Suggested fix |
|---|---|---|---|---|---|
| major | Verb "to be" (am/is/are) in questions and statements | 01 | 06 | "For "to be" questions, put the question word first, then "is" or "are," then the subject: What is your name? Where are you from? How old are you?" | Move 06 verb-to-be to right after 02 so it is the third lesson. |
| major | Verb "to be" in subject-pronoun examples | 02 | 06 | "He is my son. She is my daughter." | Put 06 right after 02. |
| major | Present continuous, was/were and other "to be" forms used inside the tenses lesson | 04 | 06 | "Use "am/is/are + -ing" for something happening at this exact moment: I am working right now." | Move 04 tenses until after 06 (and ideally after 09 and 14; see recommended order). |
| major | Passive voice | 04 | never | "The house was built in 1990." | Remove it from 04. |
| major | First conditional (If..., I will...) | 04 | never | "If..., I will..." | Drop it from 04. |
| major | All tenses packed into lesson 04 (present, past -ed and irregular, will future, present continuous) | 04 | 04 | "I work / I worked / I will work" | Move 04 later (after 14 in the recommended order). |
| major | Possessive adjectives (my/your/her/their) | 02 | 12 | "This is my friend..." | Move 12 possessives-and-reflexives before 08 (right after 03). |
| major | Family vocabulary (son, daughter, sister, kids) | 02 | 18 | "He is my son. She is my daughter." | Add a small family preview to 02 (mother, father, son, daughter, brother, sister). |
| major | Numbers above 10 (ages, years, prices, phone numbers, times) | 01 | never | "I am Maria. I am thirty-five years old." | Add a numbers block (11-100, saying years, saying prices) as preview vocabulary in 03 or 13. |
| major | Third-person -s in the simple present (regular verbs) | 03 | never | "I have a book. She has an apple." | Widen 09's rule ("Remember to add -s for he/she") into a general simple-present rule with 3-4 common verbs (works, lives, speaks). |
| major | Gerunds and infinitives at lesson 05 | 05 | 05 | "Some verbs are always followed by another verb ending in "-ing" (a gerund): enjoy, stop, start, keep." | Move 05 to after 04, 07 and 09 (position 15 in the recommended order). |
| minor | Possessive pronoun "yours" | 08 | never | "Is this yours?" | Add "yours" (and optionally "his / hers") next to "mine" in 12. |
| minor | Days of the week and months | 04 | never | "I go to church every Sunday. Yesterday I went to the store." | Expand 14 to include all seven days and the twelve months as a list item. |
| minor | "has", infinitive and present continuous in the articles lesson examples | 03 | 04 | "The children are playing." | Swap in to-be or noun-only examples: "These are children.", "I have a car.", "The men are here." |
| minor | like/love + -ing and like/love to taught twice | 05 | 09 | "I like ...-ing" | Teach 09 first. |
| minor | Demonstratives this/these taught twice | 03 | 08 | "These are..." | Keep the 03 items as a labeled preview and mark this/these in 08 as review. |
| minor | do/does questions with action verbs | 01 | 11 | "What do you do?" | Treat 01's question as a chunk. |
| minor | Question word order taught twice | 01 | 11 | "Asking questions: question word + is/are + subject" | Cut 01's point down to a chunk note and point to 11 for the rule. |
| minor | Negatives with don't used before the negation lesson | 08 | 10 | "What is this? I don't know this word." | Accept these as chunks, or move 10 earlier. |
| minor | Modal "can" for ability (I can / I can't) | 10 | never | "I can't..." | Add "I can / I can't" for ability as one vocab item and one example in 10, or as a preview in 11. |
| minor | "would like" taught twice | 15 | 15 | "I would like to order..." | Mark "I would like..." in 17 as review_vocabulary from 15. |
| minor | Imperative taught twice | 16 | 16 | "Directions are usually given as commands — start directly with the verb, with no "you" in front: Turn left. Go straight ahead. Take the uptown train." | In 20, describe it as a review of 16's commands, applied to emergencies. |
| minor | "How many children do you have?" taught twice | 11 | 18 | "How many children do you have?" | With 18 placed before 11, have 11 treat it as review. |
| minor | Comparatives/superlatives and color words | 16 | never | "Excuse me, where is the nearest subway station?" | In 19, add a small chunk list: basic colors plus "bigger / smaller". |
| minor | Object pronouns (me, him, her, them) | 11 | never | "Can you help me?" | Add "me / him / her / us / them" as a preview line in 02 or 12. |
| minor | Irregular past tense beyond go/went | 12 | never | "I made this myself." | Swap in a regular verb ("I cooked this myself.") or add "make / made" to 04's past list. |
| minor | Insurance vocabulary before its lesson | 07 | 20 | "Does she have insurance?" | Use a known noun ("Does she have a car?") in 07, or gloss "insurance" there. |

**Recommended order** (current lesson numbers): 01, 02, 06, 03, 12, 08, 07, 18, 09, 11, 13, 14, 04, 10, 05, 15, 17, 19, 16, 20

Moving "to be" (06) to third, and possessives (12) before demonstratives (08), means am/is/are and my/your are taught before the many lessons that rely on them. Placing family (18) right after to-have (07) gives it its "I have" frame and supports the family words previewed in 02. Tenses (04) and gerunds/infinitives (05) are the biggest early level jumps. They move to after likes, questions and time/days (09, 11, 14), so their -ing, past and days-of-week content builds on known material. Negation (10) follows 04 because it needs "didn't". With 16 before 20, the imperative in 20 becomes review.

A note on this order: lessons 01 and 02 still use "my" and "I am", so they would rely on short memorized phrases until lessons 06 and 12. The family preview in lesson 02 is still needed.

## 2. Scores

| Lesson | Slug | Accuracy | Level fit | Scaffolding | Timing | Tutor usability | Relevance & sensitivity | Blocker | Major | Minor |
|---|---|---|---|---|---|---|---|---|---|---|
| 01 | introducing-yourself | 3 | 4 | 2 | 4 | 4 | 4 | 1 | 6 | 7 |
| 02 | pronouns-and-greetings | 3 | 4 | 3 | 5 | 3 | 5 | 1 | 4 | 11 |
| 03 | nouns-and-articles | 3 | 4 | 3 | 4 | 3 | 4 | 1 | 5 | 6 |
| 04 | tenses | 3 | 3 | 3 | 3 | 3 | 4 | 0 | 8 | 4 |
| 05 | gerunds-and-infinitives | 2 | 4 | 3 | 4 | 3 | 4 | 1 | 5 | 4 |
| 06 | verb-to-be | 3 | 4 | 3 | 4 | 4 | 2 | 3 | 5 | 7 |
| 07 | verb-to-have | 3 | 4 | 3 | 4 | 3 | 2 | 2 | 8 | 6 |
| 08 | demonstratives | 3 | 4 | 3 | 4 | 4 | 5 | 1 | 4 | 6 |
| 09 | likes-and-dislikes | 3 | 4 | 3 | 4 | 4 | 3 | 1 | 4 | 8 |
| 10 | negation | 2 | 4 | 3 | 4 | 4 | 3 | 3 | 5 | 6 |
| 11 | asking-questions | 3 | 4 | 3 | 4 | 3 | 4 | 0 | 6 | 8 |
| 12 | possessives-and-reflexives | 2 | 4 | 3 | 5 | 4 | 2 | 5 | 2 | 7 |
| 13 | everyday-essentials | 3 | 4 | 3 | 5 | 4 | 3 | 1 | 4 | 10 |
| 14 | time-dates-seasons | 3 | 4 | 2 | 4 | 3 | 4 | 0 | 4 | 7 |
| 15 | shopping-dining-out | 3 | 4 | 3 | 4 | 4 | 4 | 0 | 2 | 7 |
| 16 | navigating-subway | 2 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 7 |
| 17 | buying-groceries | 3 | 4 | 3 | 4 | 4 | 4 | 0 | 4 | 10 |
| 18 | family-tree | 3 | 4 | 3 | 5 | 4 | 2 | 4 | 5 | 4 |
| 19 | buying-clothes | 2 | 4 | 3 | 4 | 4 | 5 | 1 | 7 | 7 |
| 20 | health-emergencies | 4 | 4 | 3 | 4 | 4 | 4 | 0 | 3 | 7 |
| **Avg** | | 2.8 | 4.0 | 2.9 | 4.2 | 3.6 | 3.5 | **28** | **95** | **139** |

## 3. All blockers (28)

There are 10 blockers in the student app (online quiz and homework). These are auto-graded with no tutor present, so fix them first. The other 18 are on the tutor slides.

**Cross-cutting (in the app code, not the lesson content), now fixed:**
- `lib/lesson-answers.ts` used to grade homework fill-ins by exact match after trimming and lowercasing.
  - Correct answers were marked wrong: "do not" instead of "don't", "cannot", "oclock", and curly apostrophes from phone keyboards ("don’t", "o’clock").
  - Online quiz answers and homework matching still must match exactly. Section 6 lists the quiz items to fix by hand.
- **Fixed:** the grader now treats curly and straight apostrophes, contractions and full forms, and "oclock" as the same answer. It also supports an `acceptedAnswers` list per item. This resolved lessons 10 (w1) and 14 (w2), and with `acceptedAnswers` added, 7 more homework items.

### Lesson 01: introducing-yourself

- **Student app › Online quiz, Q8 (q8)** (accuracy; rule: key_narrow_student_app): "I am a cook"
  - **Problem:** 'I am a cook' is also a correct English rendering of 'Trabajo como cocinero', but the auto-graded quiz marks it wrong.
  - **Fix:** Replace the distractor 'I am a cook' with a clearly wrong option such as 'I am from a cook' or 'I cook as a work'.
  - **Verifier:** confirmed

### Lesson 02: pronouns-and-greetings

- **Student app › Online quiz, Q2 (q2)** (accuracy; rule: key_narrow_student_app): "How do you greet someone you are meeting for the first time?"
  - **Problem:** The distractor 'Hello' is also a correct greeting for a first meeting; the lesson's own role-play has the student say 'Hello!
  - **Fix:** Ask 'What do you say after someone tells you their name for the first time?' and replace 'Hello' with a non-greeting distractor such as 'See you next week'.
  - **Verifier:** confirmed

### Lesson 03: nouns-and-articles

- **Student app › Online quiz, Q1 (q1)** (accuracy; rule: key_narrow_student_app): "Complete: "I have ___ book.""
  - **Problem:** 'I have the book.' is correct English, so the distractor 'the' is also a correct answer, but only 'a' is accepted.
  - **Fix:** Remove 'the' from the options in q1 and q2 (e.g.
  - **Verifier:** confirmed

### Lesson 05: gerunds-and-infinitives

- **Tutor slides › Grammar focus 1** (accuracy; rule: wrong_english): "Some verbs are always followed by another verb ending in "-ing" (a gerund): enjoy, stop, start, keep."
  - **Problem:** Incorrect grammar explanation: 'start' is not always followed by -ing.
  - **Fix:** Rewrite as: 'Some verbs are followed by a verb ending in -ing: enjoy, stop.
  - **Verifier:** confirmed

### Lesson 06: verb-to-be

- **Tutor slides › In-class worksheet, item 7 (cw7)** (accuracy; rule: key_wrong): "They ____ not home. (short form)"
  - **Problem:** The prompt already prints 'not' after the blank, so the key "aren't" produces "They aren't not home." The Spanish line's frame ('They ____ home.') is different from the English one, so the item contradicts itself.
  - **Fix:** Change promptEn to "They ____ home.
  - **Verifier:** confirmed
- **Tutor slides › Guided practice: All About Me and My Family** (relevance_sensitivity; rule: disclosure_required): "Describe yourself and one family member."
  - **Problem:** The instructions require learners to describe themselves and a real family member, with no alternative.
  - **Fix:** Retitle the activity 'All About a Person' and change the instructions to 'Describe a person: you, a friend, or a made-up person.' Swap the model lines for a picture or a made-up character (e.g., 'This is Ana.
  - **Verifier:** confirmed
- **Tutor slides › Role-play: Part 2: Talking about how you feel** (relevance_sensitivity; rule: disclosure_required_not_marked_optional): "I'm sorry. Is your family okay?"
  - **Problem:** The tutor's scripted question asks about the learner's own family.
  - **Fix:** Change the line to 'Is your friend okay?' / 'Yes, she is okay.', or add a tutor note that the learner can answer about a made-up person.
  - **Verifier:** not verified (raised to blocker after verification)

### Lesson 07: verb-to-have

- **Tutor slides › In-person quiz, item 9 (iq9)** (relevance_sensitivity; rule: disclosure_graded): "Do you have children?"
  - **Problem:** A keyed quiz item asks the learner whether they have children.
  - **Fix:** Ask about a person from the lesson instead: 'Does Marisol have children?' (key: 'Yes, she has four children.'), or say 'Answer for yourself or for a made-up person.'
  - **Verifier:** confirmed
- **Tutor slides › Guided practice: Family Inventory** (relevance_sensitivity; rule: disclosure_required): "Describe what a family member has."
  - **Problem:** The instructions require the learner to describe a real family member (sister, her job, her children), with no alternative.
  - **Fix:** Change to 'Describe what a person has.
  - **Verifier:** confirmed

### Lesson 08: demonstratives

- **Tutor slides › Guided practice: This One or That One? (practiceActivities[2])** (accuracy; rule: wrong_english): "These are my favorite color."
  - **Problem:** The student has just chosen one shirt ('I like this one'), so the plural 'These are' is wrong.
  - **Fix:** Change it to 'It is my favorite color.' / 'Es de mi color favorito.' (or 'This one is my favorite color.' / 'Esta es de mi color favorito.').
  - **Verifier:** confirmed

### Lesson 09: likes-and-dislikes

- **Tutor slides › Guided practice: Describe Someone You Know** (relevance_sensitivity; rule: disclosure_required): "Describe what a family member likes, using "he" or "she.""
  - **Problem:** This optional activity tells learners to talk about a family member, and the scripted questions assume they have a brother and a sister.
  - **Fix:** Change the instructions to 'Describe what a friend, a neighbor, or a made-up person likes, using "he" or "she."', and the tutor lines to 'What does your friend like?' / 'What does your neighbor like?'.
  - **Verifier:** confirmed

### Lesson 10: negation

- **Student app › Online quiz, Q3 (q3)** (accuracy; rule: key_narrow_student_app): "Complete: "She ___ speak Spanish.""
  - **Problem:** The distractor "can't" is also correct: "She can't speak Spanish." is grammatical, and the lesson teaches can't + base verb.
  - **Fix:** Replace "can't" with a clearly wrong option such as "isn't" plus "not" (options: doesn't / don't / isn't / not), or add a Spanish cue: 'Ella no habla español.
  - **Verifier:** confirmed
- **Student app › Online quiz, Q2 (q2)** (accuracy; rule: key_narrow_student_app): "Complete: "I ___ have a car.""
  - **Problem:** The distractor "didn't" is also correct: "I didn't have a car." is grammatical, and this lesson teaches didn't + base verb.
  - **Fix:** Replace "didn't" with a wrong option such as "isn't" or "not", or add a Spanish cue ('No tengo carro.') so only the present fits.
  - **Verifier:** confirmed
- **Tutor slides › Guided practice: True or False About Me** (relevance_sensitivity; rule: disclosure_required): "You have five children."
  - **Problem:** The learner must correct a statement about their own children.
  - **Fix:** Make it about a made-up person or picture ('Ana has five children.' → 'Ana doesn't have five children.'), or add a tutor note: 'Learners can answer about a made-up person.' Use neutral facts (languages, food, transport) for statements about the learner.
  - **Verifier:** downgrade-to-major (overruled by the not-marked-optional rule)

### Lesson 12: possessives-and-reflexives

- **Tutor slides › Grammar focus 2** (accuracy; rule: wrong_english): "Reflexive pronouns (myself, yourself, himself, herself, ourselves, themselves) show that someone did something alone, without help."
  - **Problem:** The explanation gives only the emphatic meaning ('did it alone, without help').
  - **Fix:** Rewrite as: 'Reflexive pronouns have two uses.
  - **Verifier:** confirmed
- **Student app › Online quiz, Q7 (q7)** (accuracy; rule: key_narrow_student_app): "Which word stands alone, with no noun after it?"
  - **Problem:** Two distractors are also correct.
  - **Fix:** Make the contrast explicit with one blank: 'Complete: "This phone is ___." (es mío)', options ['mine', 'my', 'me', 'I'], answer 'mine'.
  - **Verifier:** confirmed
- **Tutor slides › In-person quiz, item 10 (iq10)** (relevance_sensitivity; rule: disclosure_graded): "¿Cómo se llama tu mamá?"
  - **Problem:** A graded quiz item requires the learner to answer about their own mother, with no alternative.
  - **Fix:** Change it to a made-up or third-person prompt, e.g.
  - **Verifier:** confirmed
- **Tutor slides › Role-play: Part 1: Talking about your things and family** (relevance_sensitivity; rule: disclosure_required): "Practice talking about your own belongings and family."
  - **Problem:** The role-play asks learners about their own family, and the tutor lines assume a brother and a sister ('Whose car is that, your brother's?', 'And the phone, your sister's?').
  - **Fix:** Change the text to 'Talk about your things, or the things of a person in a picture or a made-up family.' Rewrite the tutor lines in the third person with names, e.g.
  - **Verifier:** downgrade-to-major (overruled by the not-marked-optional rule)
- **Tutor slides › Role-play: Part 3: Talking about doing things alone** (relevance_sensitivity; rule: disclosure_required_not_marked_optional): "Do you live with family, or by yourself?"
  - **Problem:** This asks about the learner's real living situation and family.
  - **Fix:** Use a made-up person: 'Does Pedro live with his family, or by himself?' / 'He lives by himself.' Or add a tutor note: 'Learners can answer about a made-up person.'
  - **Verifier:** not verified (raised to blocker after verification)

### Lesson 13: everyday-essentials

- **Tutor slides › In-person quiz, item 9 (iq9)** (relevance_sensitivity; rule: disclosure_graded): "My address is ___. (Answers will vary.)"
  - **Problem:** Graded items iq9 and iq10 require learners to write their real home address and phone number on paper.
  - **Fix:** Give a made-up identity, as the role-play word bank already does: 'Use this card: Ana López, 45 Elm Street, 555-0123.
  - **Verifier:** confirmed

### Lesson 16: navigating-subway

- **Student app › Online quiz, Q7 (q7)** (accuracy; rule: key_narrow_student_app): "Complete: "___ train goes to Times Square?""
  - **Problem:** The distractor 'What' is also correct: 'What train goes to Times Square?' is natural, common English, but the auto-graded quiz accepts only 'Which'.
  - **Fix:** Replace the 'What' option with a clearly wrong one (e.g.
  - **Verifier:** confirmed
- **Student app › Online quiz, Q3 (q3)** (accuracy; rule: key_wrong): "Manhattan / north"
  - **Problem:** The key teaches that uptown means 'toward Manhattan'.
  - **Fix:** Make the answer 'north' and the options 'north', 'south', 'east', 'west'.
  - **Verifier:** confirmed
- **Student app › Online quiz, Q1 (q1)** (accuracy; rule: key_wrong): "What do you need to ride the subway in NYC?"
  - **Problem:** The key says a MetroCard is what you need, but NYC has replaced the MetroCard with OMNY (tap a contactless card, phone or OMNY card), so the key is factually wrong, and 'Ticket' is a defensible answer in a self-graded quiz.
  - **Fix:** Change the prompt to 'Where do you buy a subway card?' or teach OMNY: answer 'an OMNY card or a bank card', options 'OMNY card', 'Passport', 'Driver's license', 'Library card'.
  - **Verifier:** confirmed

### Lesson 18: family-tree

- **Tutor slides › In-person quiz, item 9 (iq9)** (relevance_sensitivity; rule: disclosure_graded): "How many brothers and sisters do you have?"
  - **Problem:** A graded in-person quiz item tells learners to answer about their own siblings, with no option to answer about someone else.
  - **Fix:** Ask about a made-up person instead, e.g.
  - **Verifier:** confirmed
- **Tutor slides › Grammar focus 1** (accuracy; rule: wrong_english): "Add "-s" to make family words plural when there\'s more than one."
  - **Problem:** The rule is wrong for 'child', which takes the irregular plural 'children' (taught in Lesson 03), and 'children' is this lesson's main counting word.
  - **Fix:** Add: 'Most family words add -s (brothers, sisters, cousins).
  - **Verifier:** confirmed
- **Tutor slides › Role-play: Part 1: Talking about your immediate family** (relevance_sensitivity; rule: disclosure_required): "They want to know about your parents and siblings."
  - **Problem:** All three role-plays, and the guided practice 'Do You Have...?', tell learners to describe their own parents, siblings, spouse, children and extended family.
  - **Fix:** Add to each role-play and the guided practice: 'You can talk about your real family or a made-up family.' Also offer a picture of a made-up family tree to talk about.
  - **Verifier:** confirmed
- **Tutor slides › Role-play: Part 3: Talking about extended family** (relevance_sensitivity; rule: disclosure_required): "Are your grandparents here?"
  - **Problem:** Asking whether relatives are 'here', with the model answer 'No, they stayed in Mexico.', invites learners to talk about which relatives they left behind.
  - **Fix:** Ask a neutral question instead, e.g.
  - **Verifier:** downgrade-to-major (overruled by the not-marked-optional rule)

### Lesson 19: buying-clothes

- **Student app › Online quiz, Q6 (q6)** (accuracy; rule: key_narrow_student_app): "Complete: "This shirt is ___ small.""
  - **Problem:** The distractors 'very' and 'so' also make correct English ('This shirt is very small', 'This shirt is so small').
  - **Fix:** Add context that forces 'too', e.g.
  - **Verifier:** confirmed

## 4. The 5 most common major issues

There are 95 major findings in total. Most of them fall under the 5 issues below. The 08 l2q3 finding counts toward both #1 and #2.

### 1. Graded answers depend on words no lesson has taught yet (52 findings, all 20 lessons)

This is by far the biggest issue.

**Listening questions** are the main source, in nearly every lesson. Examples:
- 07: "cough" ("I have a headache. He has a cough.")
- 03: "onion" and "under the sink"
- 15: "Chocolate and vanilla. They are 25 dollars."
- 20: "throat" and "fell down"

**In-person quiz translations and dictations** do the same thing. Examples:
- 01: "waiter"
- 03: "keys" and "big"
- 09: "weather"
- 17: "cheese" and "eggs"
- 18: "nephew"
- 19: "dress"

**The root cause is the sequence.** The course never teaches these whole word sets:
- days of the week
- the months
- numbers above 10
- prices
- family words before lesson 18
- clothing and food nouns

That is why the same gaps show up in lesson after lesson.

**Fix:**
- Add a 3–5 word "listening words" bank before each listening, or swap in words from the curriculum map.
- Teach the missing word sets once, as section 1 suggests.

### 2. Narrow answer keys on the tutor slides (29 findings, 18 lessons)

These keys are correct but list only one form, so a tutor reading the key might mark a valid answer wrong. Examples:
- "Tomorrow I will work." but not "I will work tomorrow."
- "I am tired." but not "I'm tired."
- "to go" but not "take-out"
- "Yo tampoco" but not "A mí tampoco"
- 07 iq3 leaves out "lapicero", the word the lesson itself teaches for "pen"

**Fix:** show every accepted answer in the key, e.g. "(the) receipt" or "I'm / I am tired".

### 3. Model answers or dialogues that are wrong or don't hold together (8 findings: 04, 07, 08, 10, 11, 13, 19)

Examples:
- 08: the student answers about plural shoes with "this one"
- 10: "Not yet, thank you." as a reply to "Do you want more time?"
- 11: "about five minutes walking", and student lines that just repeat the tutor's question
- 07: a store clerk asks "Do you have money with you today?"
- 13: a lockout labeled an "emergency" next to "Call 911 in an emergency"
- 19: "too big" glossed as "muy grande"
- 04: the Spanish gloss "estaban" for tú and nosotros

A volunteer will repeat these lines as written.

### 4. Personal questions and assumptions (2 majors: 01, 04)

Examples:
- 04: "Share one real plan" (the model answer is a family visit)
- 01: the job question assumes the learner works

Two former majors in this group, lesson 06 ("Is your family okay?") and lesson 12 ("Do you live with family, or by yourself?"), are now blockers under the not-marked-optional rule. All family disclosure blockers are listed in section 3.

**Fix:** add one standard line to every personal activity: "You can talk about yourself, a friend, or a made-up person."

### 5. Lesson 04 tries to cover too much, and the grammar slides don't explain what is tested (3 findings: 03, 04)

- Lesson 04's two grammar slides cover four tenses.
- Lesson 04 also tests was/were and "If..., I will..." with no slide for either.
- Lesson 04 adds the passive voice ("The house was built in 1990.").
- Lesson 03 tests "the", "some" and "these are" with no explanation.

The sequence section's suggestion to split lesson 04 and move it later addresses most of this.

## 5. Open items and judgment calls

- **Lesson 09 "Describe Someone You Know":** the verifier confirmed it as a blocker. Nothing in the lesson marks the activity optional, so the evaluator's wording ("optional") was wrong.
- **Lesson 05 iq9:** the verifier downgraded it, so it stays major. It is a tutor-graded item and its English is correct.
- **Lesson 11 iq10 "I live in ___.":** per your decision, this is not an address, so it stays as is.
- **Required speaking that isn't graded:** per your decision, this stays minor. That covers lesson 02's third-person -s sentences and lesson 14's "on/at".
- **Two blockers not yet verified:** lesson 06 Part 2 and lesson 12 Part 3 became blockers after the verifier run, under the not-marked-optional rule.
- **MetroCard (lesson 16):** sales ended December 31, 2025, and the MTA is moving to OMNY ([NY1](https://ny1.com/nyc/all-boroughs/traffic_and_transit/2025/12/31/a-final-farewell-to-the-metrocard-ahead-of-its-retirement), [Time Out](https://www.timeout.com/newyork/news/alert-the-mta-will-stop-selling-metrocards-by-the-end-of-the-year-031925)). The verifier confirmed this independently.

## 6. Online-quiz content fixes (deferred, to be handled by hand)

These auto-graded multiple-choice items can't be fixed in the grader. Each one has more than one correct option, so the fix is to replace the extra correct option or add context that rules it out.

| Lesson | Item | Prompt | Key | Also correct |
|---|---|---|---|---|
| 01 | Q8 (q8) | "Trabajo como cocinero" in English is: | I work as a cook | I am a cook |
| 02 | Q2 (q2) | How do you greet someone you are meeting for the first time? | Nice to meet you | Hello |
| 03 | Q1 (q1) | Complete: "I have ___ book." | a | the |
| 10 | Q2 (q2) | Complete: "I ___ have a car." | don't | didn't |
| 10 | Q3 (q3) | Complete: "She ___ speak Spanish." | doesn't | can't |
| 12 | Q7 (q7) | Which word stands alone, with no noun after it? | mine | myself, I |
| 16 | Q7 (q7) | Complete: "___ train goes to Times Square?" | Which | What |
| 19 | Q6 (q6) | Complete: "This shirt is ___ small." | too | very, so |

Two other online-quiz blockers are also content fixes, but there the key itself is wrong rather than having two correct options:
- **16 Q3 (q3):** "uptown" is keyed as "Manhattan / north", but uptown means northbound.
- **16 Q1 (q1):** the key is "MetroCard", which can no longer be bought.
