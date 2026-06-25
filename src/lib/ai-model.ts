// Single source of truth for the Anthropic model used by every AI route.
//
// Why this exists: the model string was hardcoded in 6 places and had drifted
// (meal-plan used a different model than the rest). A dated snapshot is also a
// silent deprecation risk — when Anthropic retires it, every endpoint breaks.
//
// Override at deploy time with the ANTHROPIC_MODEL env var. Changing the model
// for the whole app — including when migrating off a deprecated snapshot — is
// then a one-variable change with zero code edits.
//
// The previous default (claude-sonnet-4-20250514) was RETIRED by Anthropic and
// the API began returning 404 not_found_error, breaking every AI endpoint. The
// default is now a current model. Override with ANTHROPIC_MODEL at deploy time.
//
// IMPORTANT for long-term survival: dated snapshots get deprecated ~12 months
// out. Prefer a current alias here and revisit this string at each major
// dependency review so the app never silently dies on a retired model again.
export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
