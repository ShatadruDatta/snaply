import { Image, type ImageProps } from "expo-image";
import { useSessionProfile } from "./SessionProfile";

const fallback = require("../../../assets/images/profile/portrait.jpg");

export function ProfileAvatar({ style }: Pick<ImageProps, "style">) {
  const { profile: { photo } } = useSessionProfile();
  return (
    <Image
      source={photo || fallback}
      recyclingKey={photo || "default-profile-portrait"}
      contentFit="cover"
      style={style}
    />
  );
}
