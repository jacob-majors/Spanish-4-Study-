# Packets

Drop anything from class in here, then ask Claude to prepare it.

Works fine:

- A PDF or photo of the review packet or study guide
- A Quizlet export (any format — tab, comma, or the printable PDF)
- A syllabus page, a unit outline, or just a typed list of topics
- A screenshot of the whiteboard

You can also attach the file straight into chat instead of saving it here.

## Telling Claude about a test

Anything you know is enough. A message like this is plenty:

> Unit 5 exam, Thursday October 9. Covers the health and body vocab, preterite
> vs imperfect, and present subjunctive. Format is 20 matching, 15 fill-in
> conjugation, 10 multiple choice. Packet attached.

Missing details get sensible defaults — Claude will say what it assumed.

## What comes back

Claude writes two things into `data/curriculum.ts`:

- **`CURRICULUM_SETS`** — the vocabulary, cleaned up (Quizlet PDF exports lose
  the `fi` ligature, so `fght` becomes `fight` and `febre` becomes `fiebre`)
- **`EXAMS`** — the test itself: date, topics checklist, which sets it covers,
  which tenses and verbs to drill, and the section mix for the mock exam

Then push:

```bash
git add -A && git commit -m "Add Unit 5 exam" && git push
```

Vercel redeploys and it shows up under **Tests**, with a countdown, a topic
checklist, a conjugation drill preset and a mock exam built to match the real
format. There is nothing to add by hand in the browser.

## Your progress is safe

Study progress is keyed to the Spanish term, not to a row number. Regenerating
a set — adding terms, fixing a typo, reordering — keeps every term you have
already studied at the level you had it.
