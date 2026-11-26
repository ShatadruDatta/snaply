export const stories = [
  { name: "Ananya", portrait: require("../../../assets/images/home/ananya.jpg") },
  { name: "Rohit", portrait: require("../../../assets/images/home/rohit.jpg") },
  { name: "Meera", portrait: require("../../../assets/images/home/meera.jpg") },
  { name: "Arjun", portrait: require("../../../assets/images/home/arjun.jpg") },
];

export const posts = [
  {
    id: "himalayas",
    author: "Rohit Sharma",
    avatar: require("../../../assets/images/home/rohit-post.jpg"),
    photo: require("../../../assets/images/home/himalayas.jpg"),
    aspectRatio: 784 / 432,
    description: "A hiker in a red jacket overlooking the Himalayas at sunrise",
    time: "2 hours ago",
    location: "Himalayas, India",
    caption: "Morning views from the Himalayas! 🏔️\nThe peace, the mountains, and the endless horizon. 💜",
    likes: 1800,
    comments: 128,
    liked: true,
    following: false,
  },
  {
    id: "manali",
    author: "Ananya Das",
    avatar: stories[0].portrait,
    photo: require("../../../assets/images/home/manali.jpg"),
    aspectRatio: 784 / 124,
    description: "A mountain stream flowing through pine forest in Manali",
    time: "5 hours ago",
    location: "Manali, India",
    caption: "A quiet morning by the river. 🌲",
    likes: 924,
    comments: 32,
    liked: false,
    following: true,
  },
];

export type Post = (typeof posts)[number];
