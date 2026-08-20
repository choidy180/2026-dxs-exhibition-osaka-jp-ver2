# Project AI Instructions

## Mandatory design guide

Every UI change in this repository must follow the single canonical design guide.

- **Read before writing any UI code**: [`docs/design-guide/README.md`](docs/design-guide/README.md)
  (short form: [`docs/design-guide/AI-RULES.md`](docs/design-guide/AI-RULES.md))
- **Import tokens, never hardcode**: [`styles/design-tokens.ts`](styles/design-tokens.ts) is the source of truth for
  colors, radii, spacing, shadows, motion, and z-index. Do not introduce new hex values.
- **Reference screen**: `/material/inbound-inspection` —
  [`components/material-monitoring/MaterialMonitoringClient.tsx`](components/material-monitoring/MaterialMonitoringClient.tsx) (multi-column control dashboard) and
  [`components/material-inbound-status/InboundInspectionStatusClient.tsx`](components/material-inbound-status/InboundInspectionStatusClient.tsx) (metrics + data grid).
- Style with styled-components only; icons from lucide-react; animation from framer-motion.
- Every data area must implement all three states: loading, error (with a retry action), and empty.
- `app/**/page.tsx` stays a thin wrapper around a client component; logic and styles live in `components/<feature>/`.
- Korean UI copy, `toLocaleString('ko-KR')` numbers, `-` for missing values.
- Express selection and emphasis with a soft tone background plus a 1px border on all sides. **Never highlight a single
  edge** (`box-shadow: inset 3px 0 …`, a thick `border-left`, or one differently-coloured side).
- Before finishing, run the checklist in section 9 of the design guide, plus `npx tsc --noEmit` and `npm run lint`.
- If a requirement genuinely conflicts with the guide, ask the user first, then record the exception in section 10 of
  the guide with its rationale. Never silently deviate.
- Per-tool setup (Cursor, Copilot, ChatGPT web) is described in
  [`docs/design-guide/CHATGPT-SETUP.md`](docs/design-guide/CHATGPT-SETUP.md).

## Mandatory AI work log

Every GPT/Codex task performed in this repository must be recorded according to
[`logs/README.md`](logs/README.md).

- The lead agent must update the log after all edits and checks are complete and before sending the final response.
- Use the current `Asia/Seoul` date and append one consolidated entry to `logs/YYYY-MM-DD.md`.
- If the daily file already exists, preserve its contents and append to it. If the same unfinished user request continues, update that request's existing entry instead of adding duplicates.
- Record read-only, failed, or blocked work too. Use `없음 (코드 수정 없음)` when no project code was changed.
- Subagents must not write separate entries. The lead agent includes their work in the single consolidated entry.
- Never include secrets, credentials, personal data, raw prompts, or unrelated pre-existing changes.

