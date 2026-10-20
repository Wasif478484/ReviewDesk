# Demo assets

Two submission assets for Devpost: the walkthrough video and the image
gallery.

## `reviewdesk-demo.mp4`

The three-minute walkthrough of ReviewDesk.

- 1920x1080, 30 fps, H.264, 2m 56s
- Silent stereo track, so narration can be added later without re-encoding the
  picture
- Captions are burned in

### What it shows

| #     | Scene                                                     |
| ----- | --------------------------------------------------------- |
| 00    | Title                                                     |
| 01-06 | The marketing page: the four lanes, control, setup, FAQ   |
| 07-10 | Sign up and the three-step onboarding                     |
| 11-12 | The desk: stats, the analytics breakdown, the triage table |
| 13-14 | A Roman Urdu complaint, the draft editor, copy             |
| 15-16 | An owner rule forcing a hold, marked urgent                |
| 17    | The audit ledger                                          |
| 18    | Autopilot and the veto window                             |
| 19-21 | Business profile, team roles, the template library        |
| 22    | Closing card                                              |

## `gallery/`

The image gallery for the Devpost project page: 15 PNGs at 1600x1067, which
is the 3:2 ratio Devpost asks for, so nothing is cropped. The largest file is
364 KB, well under the 5 MB limit.

See [gallery/README.md](gallery/README.md) for the upload order and the
caption for each image.

## How these were made

The frames were captured from the deployed app in headless Edge. The video
frames are composed into 1920x1080 cards in the app's own design language
and then cross-faded with ffmpeg. The gallery frames are captured at
1600x1067 so the app renders natively at that size, and the first one is a
title card composed the same way.

Everything runs on mock provider mode, so no live model calls are made and no
review text leaves the machine.

To record a fresh set after a UI change, re-run the capture and compose steps
against the live URL, then rebuild the video with the same durations.
