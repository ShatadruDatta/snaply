import { useQuery } from "convex/react";
import { Button } from "react-native";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export function SavedPostLink({ id, open }: { id: Id<"posts">; open: () => void }) {
  const post = useQuery(api.social.getPost, { postId: id });
  if (!post) return null;
  return <Button title={post.author.name + " · " + (post.caption || "Post")} onPress={open} />;
}
