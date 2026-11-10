# Verify localized release media

Verify the language visible in each public screenshot, poster, GIF, and MP4. A translated README or alt text does not establish the language inside an asset.

## Run the checks

Use the confirmed Mac mini with Node.js, Swift, macOS Vision, FFmpeg, and ffprobe. Existing real API recording prerequisites still apply when generating replacement media. Keep credentials outside Git.

Run `node scripts/check-localized-media.mjs` from the checkout under the existing Mac recorder lock. On the confirmed machine, use `/Users/liushiyu/.local/bin/chatcut-rec-lock run --owner dsh-sidebar-localized --purpose "Verify localized media" --ttl 1800 --wait-timeout 30 -- node scripts/check-localized-media.mjs`. Use the same lock around `scripts/record-localized-media.py` and the final commit. Do not create a second lock. Use `--root /absolute/checkout` for an isolated candidate or `--only ja` for a failed language during repair. A publication verdict requires all five locales. Use `--output /absolute/output` to retain a specific run. The default output is ignored `.runtime/localization/verify/<run-id>`.

Run `node --test tests/localized-media.test.mjs`. The negative test copies the actual English screenshot, assigns a Japanese filename and newly computed hash, then requires Vision OCR to reject the content. The unit assertions are controlled checks, not real-model E2E.

A missing Mac Vision runtime or supported OCR language is BLOCKED. A mismatch is FAIL. Never skip OCR or silently reuse English to obtain PASS.

## Check intermediate model text

Check every nonempty text field in the actual API receipts, including text emitted before native tools and cancellation.call.text from the actual native Stop stream. Do not check only finalAssistantText. The Swift helper uses macOS NaturalLanguage to retain sentence-level language hypotheses for all response texts and every OCR line. Before classification, both sentence eligibility and NaturalLanguage remove inline code, URLs, file paths and the same known technical field names. Retain the original text unchanged and save classificationText beside its language hypotheses. A Chinese explanation of quantity * unitPrice + shipping remains Chinese prose after those field names are removed; never skip the complete sentence to make it pass.

Reject an English prose sentence in a non-English capture when the recognizer identifies English with at least 0.7 confidence. Reject another confidently identified sentence language at 0.9 confidence when it differs from the document language. Prose classification requires at least five Latin words and 24 Latin letters, or 12 Chinese or Japanese characters. File paths, inline code, URLs, field names, and short technical labels are excluded from this prose threshold. Distinctive visible language terms and full visual review still apply to short labels.

Reject explicit Simplified Chinese fragments in Traditional Chinese, including 轨迹 and 并. Do not normalize Simplified characters into Traditional characters before validation. Save the original recognized text, sentence language hypotheses, and API response texts in the ignored run directory. A Spanish final reply cannot excuse an earlier English explanation.

The negative tests retain English intermediate sentences and a Traditional Chinese sentence containing 并. They must fail content-language checks. The same tests require Spanish prose, Traditional Chinese prose, a real Chinese explanation containing quantity * unitPrice + shipping, Off, orders.json, and the standalone formula to pass the appropriate checks. These controlled examples test the verifier. They are not a substitute for recording and validating the real product.


## Resolve unreliable OCR with pixel evidence

A damaged transcription is not reliable evidence of the displayed language. Keep the existing 0.7 English and 0.9 other-language thresholds. If a conflicting non-English OCR segment has Vision confidence at most 0.5, the gate returns BLOCKED with REVIEW_REQUIRED unless there is a valid, inspected pixel review. This does not apply to API text, English prose conflicts, untranslated English UI, or explicit Simplified Chinese in Traditional Chinese. Those remain hard failures.

Store an actual review in the locale's qa.json under ocr_reviews. Each record uses status VISUALLY_CONFIRMED, asset relative to that media directory, sha256 of the exact PNG, the exact four-value Vision box, original ocrText, observedLocale, reviewedAt, an explanation of the observed damage, and reference with asset, sha256 and the complete corresponding text. Inspect both real images before writing this record. The bounding-box tolerance is 0.000001 normalized units, below 0.002 pixels at the recorded resolution.

The checker validates both image hashes and the original OCR line. It reruns Vision on the separate same-locale reference PNG, requires the complete reference line at Vision confidence at least 0.9, and applies the original sentence-language rules to it. At least one prose segment must identify the requested language at 0.9. The damaged and complete lines must have at least 0.7 normalized edit similarity. This correspondence check supports the actual pixel review; it does not replace it or change any language threshold. A changed image, box, language, reference hash or unrelated reference sentence blocks the result.

Retain reference OCR in a separate *.reference.json sidecar. The primary receipt and report identify pixelReviewCount and the exact reviewed line and reference. Report this as automated OCR plus hash-bound pixel review, with the review count. Do not describe it as an entirely automatic OCR pass. Keep the clipped Spanish counterexample, missing-review, wrong-hash, wrong-box, unrelated-reference and high-confidence English regressions alongside the existing English and Traditional Chinese negatives.

## Retain the language contract

Maintain docs/media/locales.json with schemaVersion 1 and exactly en, zh-CN, zh-TW, ja, and es. Give each entry a separate directory and README, its actual hostLocale, its actual htmlLang, and distinctive visible ocrTerms. English remains in docs/media/live. Other languages use their own localized directories. Add a website path for each published HTML language.

Each capture's evidence/result.json must retain mediaLocale, hostLocale, htmlLang, visibleTextAtProof, expectedUiLabels, expectedTaskLabels, and languageChecks.status=PASS. Preserve actual API receipts, native events, saved TODO text, model response, source hashes, proof timing, and screenshot hashes. Record visibleTextAtProof from the actual browser. Never author substitute model text or TODO events.

Each media directory contains its own immutable raw/gt.mp4, identical demo.mp4, eight-second feature-8s.gif, snapshot.png, poster.png, contact-sheet.png, interaction-strip.png, real API evidence and provenance.json hashes. The snapshot and poster match that run's final browser screenshot. README and website media links must resolve to that language's directory, including Open Graph images.

The checker matches native tools to API receipts, rejects current-source mismatches, validates media hashes and format, checks document links, and reruns OCR against the snapshot, poster, all 15 original screenshots (including navigation/search, mobile/reflow, both app themes, earlier reply, follow-up, Stop, restart and lifecycle reload), two final-hold video frames, and a final GIF frame. With snapshot and poster, this is 20 samples per language and 100 for five languages. The preflight uses the native new-session label because history cards have not yet opened. All original screenshot hashes are also verified. The required screenshot manifest must match every PNG actually published under evidence; leaving an extra unchecked screenshot is a failure. It saves the actual recognized text and pixel hashes. Distinct languages must not share canonical snapshot, GIF, or MP4 bytes.

## Inspect the full story

Inspect the actual pixels of every final screenshot, contact sheet and interaction strip. Confirm that the task labels, latest saved reply, sidebar labels, surrounding native UI, dates and visible controls match the language. Check for truncation, blank frames, stale English, mixed Simplified and Traditional Chinese, and unreadable text. Retain explicit visual QA separately from automated OCR. OCR of selected proof frames does not replace full-timeline visual review.

Keep original recordings. Run recording, FFmpeg conversion and frame extraction on Mac mini. Do not add translation overlays or replace DOM text to claim localized application behavior. Repair actual runtime localization, record again, assemble from the new raw run, then repeat the same checks.

Before committing, stage the complete candidate and run the repository's existing fresh real API pre-commit gate plus this language gate. An old PASS or file existence cannot replace the candidate's checks. When publishing, download the public bytes and verify their hashes and document language mapping. Keep per-language outcomes and cleanup limited to this run's temporary outputs.

Run `npm run verify:published` after deployment. It downloads every provenance-listed media artifact, QA, provenance, the public language registry, and all five current README files with no authentication. Every public byte hash must match the verified checkout; a translated filename or a successful HTTP response alone cannot pass. Use `DSH_PUBLISHED_MEDIA_OUTPUT` to retain each deployment result.
