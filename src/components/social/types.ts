import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";

export type SocialPost = FunctionReturnType<typeof api.social.feed>["page"][number];
export type Person = SocialPost["author"];
