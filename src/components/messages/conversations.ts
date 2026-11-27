type SampleChat = {
  day: string;
  opening: string;
  reply: string;
  finalMessage: string;
};

type Conversation = {
  name: string;
  avatar: number;
  preview: string;
  time: string;
  unread?: number;
  history?: SampleChat;
};

const sampleChats = [
  {
    name: "mia_trails", avatar: require("../../../assets/images/messages/mili.jpg"), time: "6h", unread: 1,
    history: { day: "Today", opening: "The footbridge on the lake loop is open again. Want to take that route?", reply: "Yes! Is the little bench still there after the bend?", finalMessage: "Still there. It has the best view of the water." },
  },
  {
    name: "milo_sketches", avatar: require("../../../assets/images/messages/rahul.jpg"), time: "7h",
    history: { day: "Today", opening: "I tried drawing the market in one continuous line.", reply: "Even the baskets outside the fruit stall?", finalMessage: "Especially the baskets. They took half the page!" },
  },
  {
    name: "nora_fields", avatar: require("../../../assets/images/messages/riya.jpg"), time: "8h", unread: 1,
    history: { day: "Today", opening: "Did you hear the birds in that meadow clip?", reply: "There was one call right at the end. What was that?", finalMessage: "A skylark! I finally spotted it above the long grass." },
  },
  {
    name: "dev_kitchen", avatar: require("../../../assets/images/messages/karan.jpg"), time: "9h",
    history: { day: "Today", opening: "The second batch of basil pasta turned out much better.", reply: "What did you change this time?", finalMessage: "A spoonful of pasta water before adding the basil." },
  },
  {
    name: "lena_rides", avatar: require("../../../assets/images/explore/ananya.jpg"), time: "1d",
    history: { day: "Yesterday", opening: "I found a quieter way back from the ferry by bike.", reply: "Does it skip the steep hill by the bakery?", finalMessage: "Yes, turn left at the blue gate and follow the canal." },
  },
  {
    name: "omar_light", avatar: require("../../../assets/images/messages/nomad.jpg"), time: "1d",
    history: { day: "Yesterday", opening: "The light on the arch lasted maybe ten seconds.", reply: "Did you have time to take the wide shot too?", finalMessage: "Just one frame before the cloud rolled in." },
  },
  {
    name: "ivy_coast", avatar: require("../../../assets/images/explore/meera.jpg"), time: "2d",
    history: { day: "Two days ago", opening: "There are tiny pools between the rocks at low tide.", reply: "Was that where you saw the little orange crab?", finalMessage: "Yes, in the pool shaped like a footprint." },
  },
  {
    name: "finn_frames", avatar: require("../../../assets/images/explore/rohit.jpg"), time: "2d",
    history: { day: "Two days ago", opening: "I made two prints of the old station photo.", reply: "How did the black and white one turn out?", finalMessage: "The shadows pop. I’m putting that one on the wall." },
  },
  {
    name: "tara_fern", avatar: require("../../../assets/images/home/meera.jpg"), time: "3d",
    history: { day: "Three days ago", opening: "Remember the fern with the curled-up tip?", reply: "The one under the big mossy log?", finalMessage: "It opened overnight. I took the same photo again." },
  },
  {
    name: "ravi_rambles", avatar: require("../../../assets/images/explore/arjun.jpg"), time: "3d",
    history: { day: "Three days ago", opening: "The tea stand near the trailhead moved.", reply: "I was wondering why the shutters were down!", finalMessage: "Look for the yellow awning across from the bus stop." },
  },
];

export const conversations: Conversation[] = [
  { name: "mili.travels", avatar: require("../../../assets/images/messages/mili.jpg"), preview: "That sounds great!", time: "2m", unread: 1 },
  { name: "adventure.rahul", avatar: require("../../../assets/images/messages/rahul.jpg"), preview: "Are you planning another trip?", time: "24m" },
  { name: "the.travel.nomad", avatar: require("../../../assets/images/messages/nomad.jpg"), preview: "Let me know the dates.", time: "1h" },
  { name: "riya.sen", avatar: require("../../../assets/images/messages/riya.jpg"), preview: "Yes, totally!", time: "3h" },
  { name: "karan.verma", avatar: require("../../../assets/images/messages/karan.jpg"), preview: "Cool, see you there!", time: "5h" },
  ...(__DEV__ ? sampleChats.map(chat => ({ ...chat, preview: chat.history.finalMessage })) : []),
];
