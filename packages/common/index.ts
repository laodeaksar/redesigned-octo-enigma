// =============================================================================
// @repo/common — top-level barrel
//
// Prefer importing from the sub-path for better tree-shaking:
//   import type { User }          from "@repo/common/types"
//   import { registerSchema }     from "@repo/common/schemas"
//   import { NotFoundError }      from "@repo/common/errors"
//   import { createPublisher }    from "@repo/common/events"
//
// This top-level barrel is available for convenience but will include all code.
// =============================================================================

export * from "./types";
export * from "./schemas";
export * from "./errors";
export * from "./events";
