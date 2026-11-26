export const categories = [
  { name: "For You", icon: null },
  { name: "Travel", icon: require("../../../assets/images/explore/travel.png") },
  { name: "Nature", icon: require("../../../assets/images/explore/nature.png") },
  { name: "Food", icon: require("../../../assets/images/explore/food.png") },
  { name: "People", icon: require("../../../assets/images/explore/people.png") },
] as const;

export const people = [
  { name: "Ananya Das", followers: "12.4K", image: require("../../../assets/images/explore/ananya.jpg") },
  { name: "Arjun Mehta", followers: "8.7K", image: require("../../../assets/images/explore/arjun.jpg") },
  { name: "Meera Rao", followers: "15.9K", image: require("../../../assets/images/explore/meera.jpg") },
  { name: "Rohit Sharma", followers: "21.3K", image: require("../../../assets/images/explore/rohit.jpg") },
];

export const tiles = [
  { label: "Tropical beach", tags: "travel nature ocean", image: require("../../../assets/images/explore/beach.jpg"), ratio: 268/228 },
  { label: "Himalayan summit", tags: "nature travel mountains himalayas india", image: require("../../../assets/images/explore/peak.jpg"), ratio: 254/191 },
  { label: "Fresh basil pasta", tags: "food", image: require("../../../assets/images/explore/pasta.jpg"), ratio: 252/225 },
  { label: "Sunset on the lake", tags: "nature travel boat", image: require("../../../assets/images/explore/boat.jpg"), ratio: 268/217 },
  { label: "Morning views from the Himalayas", tags: "travel people nature rohit sharma india hiker", image: require("../../../assets/images/explore/hiker.jpg"), ratio: 254/293 },
  { label: "Lavender fields", tags: "nature travel flowers", image: require("../../../assets/images/explore/lavender.jpg"), ratio: 252/242 },
  { label: "Lakeside village", tags: "travel", image: require("../../../assets/images/explore/village.jpg"), ratio: 268/214 },
  { label: "Golden retriever", tags: "nature dog", image: require("../../../assets/images/explore/dog.jpg"), ratio: 254/175 },
  { label: "Historic stone arches", tags: "travel architecture", image: require("../../../assets/images/explore/ruins.jpg"), ratio: 252/192 },
];
