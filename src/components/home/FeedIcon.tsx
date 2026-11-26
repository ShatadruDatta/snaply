import { Image } from "expo-image";

const icons = {
  heart: require("../../../assets/images/home/icons/heart.png"),
  comment: require("../../../assets/images/home/icons/comment.png"),
  send: require("../../../assets/images/home/icons/send.png"),
  bookmark: require("../../../assets/images/home/icons/bookmark.png"),
  pin: require("../../../assets/images/home/icons/pin.png"),
  more: require("../../../assets/images/home/icons/more.png"),
  search: require("../../../assets/images/home/icons/search.png"),
  home: require("../../../assets/images/home/icons/home.png"),
  explore: require("../../../assets/images/home/icons/explore.png"),
  create: require("../../../assets/images/home/icons/create.png"),
  messages: require("../../../assets/images/home/icons/messages.png"),
  profile: require("../../../assets/images/home/icons/profile.png"),
};

export type IconName = keyof typeof icons;
export const accent = "#7535ff";

export function FeedIcon({ name, size = 24, color = "#101018" }: { name: IconName; size?: number; color?: string }) {
  return <Image source={icons[name]} tintColor={color} contentFit="contain" style={{ width: size, height: size }} />;
}
