# Demo assets

`reviewdesk-demo.mp4` is the three-minute walkthrough of ReviewDesk for the
Devpost submission.

- 1920x1080, 30 fps, H.264, 2m 56s
- Silent stereo track, so narration can be added later without re-encoding the
  picture
- Captions are burned in

## What it shows

| #     | Scene                                                                  |
| ----- | ---------------------------------------------------------------------- |
| 00    | Title                                                                  |
| 01-06 | The marketing page: the four lanes, the control section, setup, FAQ    |
| 07-10 | Sign up and the three-step onboarding                                  |
| 11-12 | The desk: stats, the analytics breakdown, the sortable triage table    |
| 13-14 | A Roman Urdu complaint, the draft editor, sign-off, quick insert, copy |
| 15-16 | An owner rule forcing a hold, marked urgent with the reason attached   |
| 17    | The audit ledger                                                       |
| 18    | Autopilot and the veto window                                          |
| 19-21 | Business profile, team roles, the reply template library               |
| 22    | Closing card                                                           |

## How it was made

The frames were captured from the deployed app in headless Edge, composed into
1920x1080 cards in the app's own design language, then cross-faded with
ffmpeg. The whole thing runs on mock provider mode, so no live model calls are
made and no review text leaves the machine.

To record a fresh one after a UI change, re-run the capture and compose steps
against the live URL, then rebuild the video with the same durations.
