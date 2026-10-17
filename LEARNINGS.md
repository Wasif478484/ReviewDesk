# LEARNINGS.md

Builder and QA add one line here when something surprising happens during
development or testing. These feed the README's "What we learned" section.

- The project description docx says 9 test cases, but prompts.py::run_tests
  actually has 13 cases (TEST_CASES lines 525-570). prompts.py wins per AGENTS.md.
- The docx UI label "check facts first" was simplified to "Check facts" to match
  the single action label used throughout; labels and colors now live in one
  ACTION_STYLE dict keyed by prompts.ACTIONS values.
- samples.csv needs columns stars, language, text, expected_action (15 rows);
  row 2 is an empty-text 5-star review on purpose. The sample loader handles the
  extra columns while normal CSV upload needs only stars and text.
- The 30-review batch cap is enforced in app.py; the single retry-on-failure lives
  inside call_model in llm.py.
- All user- and model-produced text is HTML-escaped (html.escape) before entering
  any unsafe_allow_html string.
