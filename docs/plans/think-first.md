# Think-first

DSA Practice asks for a plan before the editor opens, then records whether the solve was really done alone. The Hub uses that record. Nothing here calls an AI service. It works offline.

## The gate

An unsolved planned problem, or a redo that is due, stays covered until Think-first is done or skipped. The four questions are the target complexity, a brute force, what that brute force wastes, and a pattern. Skipping, or a pattern that was not confirmed on the first try, cannot count as solved alone.

A complexity that looks too slow for the largest size in the constraints is a warning. It does not lock the editor. Real problems also depend on other limits, so one number is not a hard rule.

The cover over the editor is only a reminder. It does not prove the solution was never opened.

## What counts as solved alone

All of these have to be true:

- Think-first was not skipped.
- The pattern was confirmed on the first try, and it was not left unconfirmed.
- The solution was not opened during that try.
- The mark came from an Accepted submission, not a manual button.
- A key insight of a few real words was saved.

Unknown custom problems still go through Think-first, but they are marked unverifiable and cannot count as solved alone. A known problem from the dataset can.

Manual Solved alone, including the shortcut, does nothing while the gate is closed, and it cannot replace a verified alone record.

## Attempts

Each problem keeps one in-progress try until it is recorded. Leaving and coming back restores the answers. Opening the solution sets a flag that stays until the try is saved, including across a reload. The focus timer keeps running during Think-first so that time is counted.

On a redo, unlocking the editor asks LeetCode to reset to the starter code. If that control is not on the page, nothing else changes.

## The Hub

A verified alone solve counts fully toward mastery. Other alone marks count half. Help counts a quarter. An accepted redo that was solved alone changes Help to Alone and still follows the redo schedule. Needed help stays Help.

A quiz below 75% schedules a 20 minute revision of that topic for 3 days later. A later passing quiz clears it.

## Shared plan

A plan from Plan Mode is counted in problems per day, which the user chooses. The practice schedule screen asks for that number, plus study days. Problems per day, study days, and a single company flow back to the Hub goal. The Hub's role, dates, and hours are left alone when the practice app does not have a real replacement. Hub setup still builds the practice plan when its id changes. A bad problem count is clamped. It does not throw or wipe the day list.

Days follow the computer's local calendar. Reminders rebuild at the next local midnight and after sleep.

## This branch

PR #2 also keeps in-progress evidence honest, treats Accepted detection as an exact fresh result on leetcode.com, locks must-do to the leftovers of that day, and flushes saves before a view change or quit.
