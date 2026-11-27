// The names, captions, and conversations in this fixture are fictional.
export const creators = [
  ["mia_trails", "Mia Brook", "messages/mili"],
  ["milo_sketches", "Milo Finch", "messages/rahul"],
  ["nora_fields", "Nora Vale", "messages/riya"],
  ["dev_kitchen", "Dev Rowan", "messages/karan"],
  ["lena_rides", "Lena Pike", "explore/ananya"],
  ["omar_light", "Omar Reed", "messages/nomad"],
  ["ivy_coast", "Ivy Shore", "explore/meera"],
  ["finn_frames", "Finn Alder", "explore/rohit"],
  ["tara_fern", "Tara Moss", "home/meera"],
  ["ravi_rambles", "Ravi Birch", "explore/arjun"],
  ["zoya_supper", "Zoya Lane", "profile/food"],
  ["jo_rivers", "Jo Rivers", "explore/boat"],
  ["emma_stone", "Emma Lark", "explore/ruins"],
  ["arlo_alpine", "Arlo Peak", "profile/summit"],
  ["lea_wild", "Lea Wren", "explore/lavender"],
  ["kai_lakes", "Kai Linden", "profile/lake"],
  ["ines_studio", "Ines Dale", "explore/village"],
  ["noah_roams", "Noah Ash", "profile/camp"],
] as const;

// Two different moments for each scene. Every post owns its storage object.
const scenes = [
  ["explore/beach", "Travel", "A quiet strip of coast before the beach umbrellas opened.", "Last morning by the sea. I packed the towel before I packed the camera."],
  ["profile/forest", "Nature", "The boardwalk was still wet from last night's rain.", "A slow walk through the trees with the phone on silent."],
  ["explore/pasta", "Food", "Lunch today was basil pasta, a warm bowl, and an open window.", "A second handful of basil made all the difference."],
  ["explore/hiker", "People", "The best part of this hike was the company on the last climb.", "Caught a friend taking in the ridgeline between switchbacks."],
  ["explore/boat", "Travel", "We took the last boat back while the water was still.", "Found a seat on the bow and stayed there until the dock."],
  ["profile/summit", "Nature", "A clean line of snow where the clouds finally lifted.", "First light brushed just the top of the summit."],
  ["profile/food", "Food", "A long lunch and a table full of dishes to pass around.", "This little plate was the first thing to disappear at dinner."],
  ["home/himalayas", "People", "A tiny red jacket against a whole valley of blue.", "Our trail guide knew exactly where the light would break through."],
  ["explore/village", "Travel", "Took the long way through the village to find the old landing.", "A row of bright houses and the sound of boats knocking at the quay."],
  ["explore/lavender", "Nature", "The lavender rows were buzzing long before sunrise.", "I followed the purple rows to the shade at the edge of the field."],
  ["explore/ruins", "Travel", "Counted the arches, lost count, and started sketching instead.", "Stone warmed by the sun and a courtyard all to ourselves."],
  ["profile/camp", "People", "Everyone pitched in before we stopped for a cup of tea.", "The last tent went up just as the sun slipped behind the ridge."],
  ["home/manali", "Nature", "Took a break where the river bends through the pines.", "We could hear this stretch of whitewater from the trail above."],
  ["explore/peak", "Travel", "A mountain window seat worth waking up for.", "One last view of the pass before the road dipped into the valley."],
  ["profile/lake", "Nature", "Wind dropped for a minute and the water turned into a mirror.", "The lake held on to the evening light longer than the trail did."],
  ["profile/hiker", "People", "Our walking group stopped here to compare routes.", "A hat, a small pack, and a friend who always brings extra snacks."],
  ["profile/sunset", "Nature", "Waited out the grey sky for these few seconds of colour.", "Caught the last band of orange on the way home."],
  ["explore/dog", "People", "Someone on the walk made a very enthusiastic new friend.", "Our honorary walking companion insisted on a second lap."],
  ["profile/cover", "Travel", "The view from our first stop after the early train.", "We put a pin on the map for the next time we come this way."],
  ["explore/pasta", "Food", "Tested the sauce with a spoon and nearly forgot to boil the pasta.", "Tomatoes, basil, and supper ready before the rain arrived."],
  ["profile/mountains", "Nature", "The far ridge disappeared and reappeared all afternoon.", "A pocket-sized sketchbook could barely hold this skyline."],
  ["profile/food", "Food", "An extra place setting turned dinner into a very good evening.", "Shared plates after a day out always taste a little better."],
] as const;

export const snapshots = [0, 1].flatMap(pass => scenes.map(([asset, tag, first, second]) => ({
  path: "assets/images/" + asset + ".jpg", caption: (pass ? second : first) + " #" + tag,
  video: false,
})));
snapshots.push({ path: "scripts/fixtures/trail-post.mp4", caption: "Four seconds on the trail before we packed up. #Travel #Nature", video: true });

export const replies = [
  "That light was worth waiting for.", "I love how much detail there is at the edges.",
  "Adding this to my weekend notebook.", "Which part of the day did you shoot this?",
  "The colours feel so calm here.", "I could spend an afternoon in this spot.",
  "This reminded me to take the slow route home.", "Such a good find!",
  "The second look is even better than the first.", "I'd love to see another frame from this outing.",
  "Thanks for sharing a little of your day.", "There’s a whole story in this frame.",
  "Saving this for our next outing.", "That little detail in the corner makes it for me.",
  "Were you there for long?", "It feels like a very peaceful morning.",
  "I showed this to my walking buddy.", "Love the way you framed it.",
  "What a lovely change of pace.", "Did you plan this shot or just happen upon it?",
  "This made me reach for my camera again.", "Would happily make a detour for this.",
  "My favourite from this series.", "Looking forward to the next one.",
  "Had to come back for another look.", "A small moment beautifully caught.",
  "This would look great as a print.", "Thank you for taking us along.",
] as const;
