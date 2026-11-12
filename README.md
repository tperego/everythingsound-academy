# EverythingSound Academy · Music Theory

The course platform: a course home with modules and lessons, lesson pages (video and exercises), a Sandbox where everything is unlocked, and the teacher's marking page. Student accounts come next.

The class version of the app stays separately, frozen, at practice.everythingsoundacademy.com (folder `EverythingSound`, tag `practice-v1`).

There is no build step and nothing to install: plain HTML, CSS and JavaScript modules. Tone.js (audio) and abcjs (staff notation) load from a CDN.

## Run it

Double-click **`start.command`** in Finder. It starts the site at <http://127.0.0.1:5174/> and opens your browser.

## Pages

| Page | What it is |
|---|---|
| `index.html` | Course home: modules, lessons, progress, Continue button |
| `lesson.html?lesson=…` | A lesson: video, exercises, checks, DAW round-trip, submit; previous/next lesson |
| `sandbox.html` | Everything unlocked; several named pieces saved in the browser; MIDI export; share link |
| `mark.html` | Teacher marking and feedback links |
| `tests.html` | Logic tests |

## Live site

- <https://theory.everythingsoundacademy.com/>, hosted on GitHub Pages from `tperego/everythingsound-academy`.
- Squarespace DNS: CNAME `theory` → `tperego.github.io`.
- **Publishing a change:** commit, then `git push`.

## Adding lessons

1. Fill in `content/Lesson Template.xlsx`: one row per lesson, one per exercise. It isn't published, because `content/` is in `.gitignore`.
2. Each lesson becomes an entry in `js/lessons.js`.
3. List it in its module in `js/course.js`, in the order students should take it.

## What students do

1. Watch the lesson video at the top of the page.
2. Pick an exercise. Enter chords from the palette (or type 1–7) and draw a melody in the scale-degree grid. Shaded rows are chord tones.
3. Press **Check** for instant feedback on anything with a right answer.
4. **Take it into your DAW**: export MIDI (all tracks in one file, or one file per track), work on it in Ableton Live, Logic or Pro Tools, then attach the MIDI and an MP3 or WAV bounce. The app reads the MIDI back and checks it's still in key and keeps the progression.
5. **Submit**: download a `.esound.json` file (it includes the MIDI and audio) or copy a submission link (smaller, but no files).

Work autosaves in the browser. **Live MIDI out** (Chrome or Edge) plays the composer straight into a DAW in real time. On a Mac, use the IAC Driver.

## What you do (teacher)

Open `mark.html`, drop in the submission files (or open a student's submission link). For each submission you can:
- listen to the piece and see it as a grid or on the staff
- see the automatic checks re-run against the current exercise definition
- play the bounce and see the analysis of their DAW MIDI
- score each rubric line and write a comment

Then **Copy feedback link** and send it. The student opens it and sees the marks, your comment and their piece. Marks are saved in your browser. Nothing is uploaded anywhere.

## Adding lessons and exercises

Everything lives in [`js/lessons.js`](js/lessons.js):
- `youtubeId`: the part after `v=` in the YouTube URL
- `videoAt`: seconds into the video, which shows a "Watch this part" button on that exercise
- `start`: key, mode, tempo, bars, and an optional given progression (scale degrees, one per bar) and melody
- `lock`: stop students changing the key, bars or chords
- `checks`: automatic checks (the full list is in [`js/checks.js`](js/checks.js))
- `rubric`: the lines you mark by hand

## Files

| File | What it does |
|---|---|
| `js/theory.js` | Scales, scale degrees, diatonic chords, roman numerals, chord detection |
| `js/project.js` | The piece's data model (stored as scale degrees, so changing key transposes everything) |
| `js/composer.js` | Chord lane and melody grid |
| `js/workspace.js` | Toolbar, playback, staff view, live MIDI out |
| `js/audio.js` | Tone.js playback and Web MIDI output |
| `js/midi.js` | MIDI file writer and reader, and DAW MIDI analysis |
| `js/checks.js` | Automatic checks |
| `js/staff.js` | Staff notation (ABC → abcjs) |
| `js/piano.js` | Piano keyboard (hands, finger numbers, follows playback) and the printable chord sheet |
| `js/form.js` | Melodic form: splitting a melody into phrases and comparing them |
| `js/submission.js` | Submission and feedback formats |
| `js/student.js`, `js/teacher.js` | The two pages |

## Not built yet (phase 2)

Student accounts and an online inbox (instead of files and links), video cue points that open an exercise automatically, TikTok 60-second challenge pages, Ableton template sets, and more exercise types (ear training, intervals, minor keys, rhythm).

## Database scripts (Supabase → SQL Editor → New query → paste → Run)

Run in this order, once each (all are safe to run again): `supabase/schema.sql` (accounts, submissions, progress, Sandbox), `supabase/teacher-setup.sql` (class code and teacher, with your own values), `supabase/chat.sql` (chat), `supabase/game.sql` (XP, levels, badges, leaderboard).

## XP and badges

Students earn XP for real practice: passing an exercise's checks (20), sending it (30), finishing a lesson (50), your feedback (10 + up to 40 for the score), quick-fire rounds (with daily limits) and their first practice each day (5). The database decides the amounts, so XP can't be typed in from the browser. Levels, streaks and badges are worked out in `js/game.js`. The leaderboard is opt-in for students; your profile shows every student's XP and when they last practised.

## Publishing an update

1. `python3 tools/stamp-version.py`: gives every file a new version so browsers never mix old and new code.
2. Commit, then `git push`.
