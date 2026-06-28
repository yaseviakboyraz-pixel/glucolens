// DEPRECATED — kept only as a compatibility shim.
//
// This file used to hold a SECOND, separate ~300-food GI database with its own
// lookupGI(). That made it a competing source of truth, distinct from the live
// unified system in gi-index.ts (turkish-gi-data.ts + 6 regional sets, ~5000
// foods). It was dead code — nothing imported it — and a future edit could have
// pulled stale GI values from here instead of the real database.
//
// To remove the fragmentation risk without breaking any stray import, this file
// now re-exports the unified system. Import from "./gi-index" directly in new
// code. This shim can be deleted once you've confirmed nothing references it
// (`git rm src/lib/gi-database.ts`).
export { GLOBAL_GI_DATABASE as GI_DATABASE, lookupGI, type GIEntry } from "./gi-index";
