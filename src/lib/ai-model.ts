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
// The default preserves the core analyze path's current, most-tested model.
// To move everything onto a newer model (e.g. claude-sonnet-4-6), set
// ANTHROPIC_MODEL in the environment rather than editing code.
export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
