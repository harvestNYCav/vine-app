"""Deterministic severity post-check for evals/lesson_NN.json (rubric v3).

Severity is computed from each finding's tags, never from the evaluator's own label:
  wrong_english or key_issue == "wrong"           -> blocker
  key_issue == "narrow", Student app section       -> blocker (auto-graded, no tutor to overrule)
  key_issue == "narrow", Tutor slides section      -> major   (a tutor can overrule)
  disclosure != "none", item_status graded/required -> blocker
  disclosure != "none", item_status optional        -> major, but only if the lesson explicitly
      marks that activity optional; an ungraded tutor-led activity with no such marker counts as
      required -> blocker
  harm                                              -> blocker
  untaught == "answer_depends"                      -> major
If any rule fires, severity = the most severe rule result.
Otherwise: untaught == "background" -> minor; else keep the evaluator's label, capped at major
(a blocker needs one of the blocker rules above).

Findings with verifier_verdict == "rejected" are moved to "rejected_findings", and findings with
a "resolved" note (the fix is in place) to "resolved_findings"; neither is counted.

Usage: python3 -I evals/postcheck.py [--write]   (run from the repo root)
Without --write it only reports. With --write it rewrites the lesson files and writes
evals/postcheck_report.json.
"""
import json
import re
import sys
from collections import Counter

OPTIONAL_MARKER = re.compile(r"\b(optional|opcional)\b", re.IGNORECASE)
# Each activity in a lesson file starts with one of these keys, so the text between the one before
# a quote and the one after it is that quote's activity.
ACTIVITY_START = re.compile(r"^\s*(label|titleEn|id):", re.MULTILINE)


def explicitly_optional(src, quote):
    """True if the activity containing `quote` in the lesson source says it is optional."""
    at = src.find(quote)
    if at < 0:
        return False
    starts = [m.start() for m in ACTIVITY_START.finditer(src)]
    begin = max((s for s in starts if s <= at), default=0)
    end = min((s for s in starts if s > at), default=len(src))
    return bool(OPTIONAL_MARKER.search(src[begin:end]))

ORDER = {"blocker": 0, "major": 1, "minor": 2}
ENUMS = {
    "key_issue": {"none", "narrow", "wrong"},
    "disclosure": {"none", "family", "immigration", "legal", "trauma", "address_phone"},
    "item_status": {"graded", "required", "optional", "n/a"},
    "untaught": {"none", "answer_depends", "background"},
}
BOOLS = ("wrong_english", "harm")


def tag_errors(f):
    errs = [f"{k}={f.get(k)!r}" for k, allowed in ENUMS.items() if f.get(k) not in allowed]
    errs += [f"{k}={f.get(k)!r}" for k in BOOLS if not isinstance(f.get(k), bool)]
    if f.get("disclosure") not in (None, "none") and f.get("item_status") == "n/a":
        errs.append("disclosure set but item_status is n/a")
    return errs


def rule_severity(f, src):
    """Return (severity, rule names that fired)."""
    student = f["section"].startswith("Student app")
    fired = []
    status = f["item_status"]
    if f["disclosure"] != "none" and status == "optional" and not explicitly_optional(src, f["quote"]):
        status = "required_not_marked_optional"
    if f["wrong_english"]:
        fired.append(("blocker", "wrong_english"))
    if f["key_issue"] == "wrong":
        fired.append(("blocker", "key_wrong"))
    if f["key_issue"] == "narrow":
        fired.append(("blocker", "key_narrow_student_app") if student else ("major", "key_narrow_tutor_slides"))
    if f["disclosure"] != "none":
        if status != "optional":
            fired.append(("blocker", f"disclosure_{status}"))
        else:
            fired.append(("major", "disclosure_optional"))
    if f["harm"]:
        fired.append(("blocker", "harm"))
    if f["untaught"] == "answer_depends":
        fired.append(("major", "untaught_answer_depends"))
    if fired:
        return min((s for s, _ in fired), key=ORDER.get), [r for _, r in fired]
    if f["untaught"] == "background":
        return "minor", ["untaught_background"]
    sev = f["severity"] if f["severity"] in ORDER else "minor"
    return ("major", ["no_blocker_rule_cap"]) if sev == "blocker" else (sev, [])


def main():
    write = "--write" in sys.argv
    changes, errors = [], []
    transitions = Counter()
    for n in range(1, 21):
        nn = f"{n:02d}"
        path = f"evals/lesson_{nn}.json"
        ev = json.load(open(path))
        src = open(ev["file"]).read()
        rejected = [f for f in ev["findings"] if f.get("verifier_verdict") == "rejected"]
        if rejected:
            ev["findings"] = [f for f in ev["findings"] if f not in rejected]
            ev["rejected_findings"] = ev.get("rejected_findings", []) + rejected
        resolved = [f for f in ev["findings"] if f.get("resolved")]
        if resolved:
            ev["findings"] = [f for f in ev["findings"] if f not in resolved]
            ev["resolved_findings"] = ev.get("resolved_findings", []) + resolved
        for i, f in enumerate(ev["findings"]):
            errs = tag_errors(f)
            if errs:
                errors.append({"lesson": nn, "index": i, "section": f.get("section"), "errors": errs})
                continue
            new, rules = rule_severity(f, src)
            if new != f["severity"]:
                transitions[f"{f['severity']} -> {new}"] += 1
                changes.append({"lesson": nn, "section": f["section"], "quote": f["quote"],
                                "from": f["severity"], "to": new, "rules": rules})
                f["evaluator_severity"] = f["severity"]
                f["severity"] = new
            f["severity_rules"] = rules
        ev["findings"].sort(key=lambda f: ORDER[f["severity"]])
        if write:
            json.dump(ev, open(path, "w"), indent=2, ensure_ascii=False)
    report = {"changed": len(changes), "transitions": dict(transitions),
              "tag_errors": errors, "changes": changes}
    if write:
        json.dump(report, open("evals/postcheck_report.json", "w"), indent=2, ensure_ascii=False)
    print(json.dumps({k: report[k] for k in ("changed", "transitions")}, indent=2))
    print(f"tag errors: {len(errors)}")
    for e in errors:
        print(" ", e)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
