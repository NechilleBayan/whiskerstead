// M2 fresh-authored toned dialogue — 06-dialogue-integration-spec §0.
// Voice: short, lowercase-casual, matching src/content/bubbles.ts (the locked
// reference table). Four tone bands per category; personality keys are FLAVOR
// pools merged with `any` at selection — never gates. The dark band is the
// user-approved FULL dark-humor override (§0 decision 3): mortality jokes are
// intended creative direction even though nothing dies — do not "fix" them.
// Only real Whiskerstead nouns appear: no seasons, predators, visitors, money,
// tools, maps, or humans. {who} is filled with a nearby/subject cat's name.
// Every line is ≤ BUBBLE.maxChars and globally unique — the M2 test audits.

import type { LineTable } from "../bubbles.ts";

export type Tone = "normal" | "dry" | "unhinged" | "dark";
export const TONES: readonly Tone[] = ["normal", "dry", "unhinged", "dark"];

export const TONED_LINES: Record<string, Partial<Record<Tone, LineTable>>> = {
  // ---------- idle_thought: idling or wandering, no urgent need ----------
  idle_thought: {
    normal: {
      any: [
        "nothing to do. wonderful",
        "the grass is doing great today",
        "a nap could happen. or not",
        "just me and my tail",
        "good day for standing around",
        "the village hums along",
        "i live here. still can't believe it",
        "air's nice. that's the whole thought",
      ],
      planner: ["free time. suspicious", "i should schedule more of this"],
      optimist: ["everything's basically fine!"],
    },
    dry: {
      any: [
        "busy. clearly",
        "watching grass grow. it's slow",
        "another productive stare",
        "i was doing something. probably",
        "standing: accomplished",
        "big plans: none",
      ],
      cynic: ["leisure. my one talent", "don't tell anyone i'm content"],
      planner: ["unstructured time. tolerable"],
    },
    unhinged: {
      any: [
        "what if i ran. just ran",
        "my tail moved. i didn't move it",
        "the clouds are cat shaped today",
        "i'm going to yell. no reason",
        "does the pond know my name",
        "my whiskers are picking something up",
      ],
      chaos: ["i could knock something over rn", "bored. dangerous combo"],
      cryptic: ["the field breathes. slowly"],
    },
    dark: {
      any: [
        "idle paws, doom postponed",
        "doing nothing. the void approves",
        "rest now. entropy later",
        "the quiet before some soup",
        "one day the soup wins",
        "we're all naps between naps",
      ],
      cynic: ["enjoy it. it never lasts"],
      cryptic: ["stillness is how it finds you"],
    },
  },

  // ---------- philosophical: night, or near the lit bonfire ----------
  philosophical: {
    normal: {
      any: [
        "do fish dream of us",
        "the fire remembers every log",
        "what makes a village a home",
        "small lives, big sky",
        "wonder who lit the first fire",
        "we're all just soft and trying",
      ],
      planner: ["even stars keep a schedule"],
      optimist: ["somewhere the sun is rising"],
    },
    dry: {
      any: [
        "deep thoughts. shallow cat",
        "the universe is big. noted",
        "philosophy is just tired thinking",
        "meaning of life: snacks, probably",
        "stars: far. me: here. even trade",
        "big sky. small me. checks out",
      ],
      cynic: ["we invented soup. that's the peak", "the moon owes us nothing"],
    },
    unhinged: {
      any: [
        "what if whiskers are antennas",
        "am i the village or is it me",
        "time is a circle. a warm circle",
        "what if trees are slow cats",
        "maybe the moon is a big trinket",
        "what if the stars are pond spray",
      ],
      cryptic: ["every flame is the same flame"],
    },
    dark: {
      any: [
        "the fire eats to live. same",
        "we're all embers eventually",
        "stars burn out. keep purring anyway",
        "the pond doesn't need us to be deep",
        "every day ends. rude, honestly",
      ],
      cryptic: ["endings are just doors, badly lit"],
    },
  },

  // ---------- philosophical_night: the night-observing musings — gated
  // strictly on the night phase, so "the stars are out" is never a lie
  // spoken by the daytime bonfire crowd ----------
  philosophical_night: {
    normal: { any: ["the stars don't blink. we do", "night makes everything honest"] },
    unhinged: { any: ["the dark is just thick air"], cryptic: ["the night reads us back"] },
    dark: { any: ["night swallows the day whole. daily"], cynic: ["the dark always wins. till dawn"] },
  },

  // ---------- nonsense: anytime low-urgency ambient ----------
  nonsense: {
    normal: {
      any: [
        "mrrp",
        "toe beans. that's it. that's the thought",
        "yarn is just soft string. wild",
        "i like a good sit",
        "whisker check: all present",
        "a bug walked by. big news",
        "bap. bap bap.",
        "ears did the swivel thing",
      ],
    },
    dry: {
      any: [
        "meow, i guess",
        "thought loading. try later",
        "this is my thinking face. same face",
        "i forgot what i forgot",
        "insert thought here",
        "riveting stuff, brain",
      ],
      cynic: ["hm. no."],
    },
    unhinged: {
      any: [
        "BREAD.",
        "what if i bit the wind",
        "the yarn knows what it did",
        "fish fish fish fish",
        "i am speed. i am also nap",
        "gonna sniff that later",
        "my paws are LOUD today",
        "wiggle wiggle pounce",
        "the wind said my name wrong",
      ],
      chaos: ["chaos status: brewing", "EVERYTHING IS A TOY"],
    },
    dark: {
      any: [
        "the junk pile calls my name",
        "somewhere a fish is plotting",
        "the trinket stares back",
        "every yarn ball ends unraveled",
        "dust was something once",
      ],
      cryptic: ["the flowers know. they always know"],
    },
  },

  // ---------- likes & dislikes: gated on preference + present context ----------
  like_rain: {
    normal: { any: ["rain again. lucky me", "good sound, rain"], optimist: ["the pond loves refills!"] },
    dry: { any: ["wet. as intended"] },
    unhinged: { any: ["sky water!! for free!!"] },
    dark: { any: ["the sky cries so i don't have to"] },
  },
  dislike_rain: {
    normal: { any: ["not a fan of this sky"] },
    dry: { any: ["wet fur. delightful"], planner: ["this wasn't in the forecast"] },
    unhinged: { any: ["the sky is THROWING water"] },
    dark: { any: ["the storm knows where i live", "the sky's got it out for my fur"] },
  },
  like_library: {
    normal: { any: ["shelves of quiet. perfect", "books smell like good decisions"] },
    dry: { any: ["paper. my people"] },
    unhinged: { any: ["the books whisper. i listen"] },
    dark: { any: ["every book outlives its reader"], cryptic: ["the library keeps our other lives"] },
  },
  like_pond: {
    normal: { any: ["the pond's in a good mood", "nice water today"], optimist: ["best puddle in the village"] },
    dry: { any: ["water: still there. good"] },
    unhinged: { any: ["the ripples wave at ME"] },
    dark: { any: ["the pond keeps count"] },
  },
  like_fire: {
    normal: { any: ["warm side of everything", "the fire's got opinions tonight"] },
    dry: { any: ["fire good. me warm. done"] },
    unhinged: { any: ["the flames dance MY dance"] },
    dark: { any: ["the fire eats so politely"], cryptic: ["the flame knows my name by now"] },
  },
  dislike_crowds: {
    normal: { any: ["too many tails here"] },
    dry: { any: ["a crowd. joy", "personal space is a real thing"], cynic: ["i liked this spot empty"] },
    unhinged: { any: ["everyone's LOOKING"] },
    dark: { any: ["crowds are just lonely in bulk"] },
  },
  like_solitude: {
    normal: { any: ["just me. as it should be", "quiet enough to hear my fur"] },
    dry: { any: ["alone at last. don't tell anyone"] },
    unhinged: { any: ["solitude tastes like victory"] },
    dark: { any: ["alone is where i'm least haunted"], cryptic: ["silence says the most"] },
  },

  // ---------- time of day: one sub-category per phase ----------
  time_dawn: {
    normal: { any: ["the sun's up. barely", "first light, first stretch"], planner: ["dawn. right on time"] },
    dry: { any: ["morning already. bold of it"] },
    unhinged: { any: ["the sun SNUCK up again", "dawn smells like wet grass"] },
    dark: { any: ["another day survives the night"], cryptic: ["the light returns. it always asks"] },
  },
  time_morning: {
    normal: { any: ["morning's the good part", "dew on everything. nice"], optimist: ["today's got promise!"] },
    dry: { any: ["awake. allegedly", "morning. we meet again"] },
    unhinged: { any: ["so much DAY left to use", "the grass is extra loud today"] },
    dark: { any: ["mornings: the day's first trap"] },
  },
  time_afternoon: {
    normal: { any: ["warm patch o'clock", "the day's leaning back now"], planner: ["afternoon check: on track"] },
    dry: { any: ["afternoon. peak nap window", "halfway through. probably"] },
    unhinged: { any: ["the shadows are getting IDEAS", "sun's melting the whole field"] },
    dark: { any: ["the light's already leaving us"] },
  },
  time_sunset: {
    normal: { any: ["the sky's showing off again", "golden hour, golden fur"], optimist: ["best sky of the day!"] },
    dry: { any: ["sun's clocking out", "pretty. anyway."] },
    unhinged: { any: ["the sky is ON FIRE. calmly", "sunset tastes like orange"] },
    dark: { any: ["the day dies gorgeous every time"] },
  },
  time_night: {
    normal: {
      any: ["the quiet hours are here", "stars are out. all of them"],
      cryptic: ["the stars rearrange when we blink"],
    },
    dry: { any: ["dark out. as scheduled", "night again. it does that"] },
    unhinged: { any: ["the dark is FULL of maybe", "moon's watching. hi moon"] },
    dark: { any: ["night: the big soft nothing"] },
  },

  // ---------- weather_ambient: ongoing rain/storm mutters ----------
  weather_ambient: {
    normal: {
      any: [
        "still coming down",
        "the roofs are earning it today",
        "everything's dripping",
        "puddle inventory: rising",
        "wet paws. wet everything",
        "the fire's fighting the damp",
        "the pond's overflowing with itself",
        "ears flat till this passes",
      ],
      optimist: ["the forage will love this", "clean fur by dinner!"],
    },
    dry: {
      any: [
        "yep. still wet",
        "weather: aggressively moist",
        "the sky's not done, apparently",
        "fur status: soup",
        "rain. rain. more rain. bold choice",
        "drip. drip. riveting",
        "wetter. it got wetter",
      ],
      cynic: ["the sky's showing off. badly"],
    },
    unhinged: {
      any: [
        "the puddles are MULTIPLYING",
        "i could drink the AIR right now",
        "every drop has a tiny agenda",
        "the mud is ALIVE today",
        "sky water keeps CHOOSING me",
        "the sky's doing its big splash bit",
        "my tail is a wet rope now",
      ],
      chaos: ["puddle jumping is CARDIO"],
    },
    dark: {
      any: [
        "the sky weeps. relatable",
        "rain: the sky slowly falling",
        "we live at the bottom of the weather",
        "the damp gets into everything. everything",
        "somewhere the pond plans a flood",
        "the sky has more where that came from",
      ],
      cryptic: ["the water remembers being sky", "rain speaks in old tongues"],
    },
  },

  // ---------- memory_musing: a strongly charged memory resurfaces ----------
  memory_musing: {
    normal: {
      any: [
        "still thinking about it",
        "some days stick to your fur",
        "that one stays with me",
        "funny what the mind keeps",
        "i remember it different every time",
        "can't unremember it, huh",
        "wonder if they remember it too",
      ],
      planner: ["filed it. it un-files itself"],
      optimist: ["good memories keep me warm"],
    },
    dry: {
      any: [
        "ah yes. that. again",
        "memory: unskippable, apparently",
        "brain, we've been over this",
        "thanks, memory. very timely",
        "replaying it changes nothing. anyway",
        "core memory. didn't ask for it",
      ],
      cynic: ["the past keeps loud opinions"],
    },
    unhinged: {
      any: [
        "the memory ITCHES",
        "my brain hums old songs at me",
        "it lives behind my eyes now",
        "the past pounced on me again",
        "one smell and i'm BACK there",
        "my memories have memories",
      ],
      cryptic: ["what happened is still happening"],
    },
    dark: {
      any: [
        "memories outlive everything else",
        "the mind keeps what hurts best",
        "forgetting would be too easy",
        "some ghosts are just yesterdays",
        "carved in. no undo",
        "the past never blinks first",
      ],
      cryptic: ["old echoes keep their shape"],
    },
  },

  // ---------- need grumbles: one sub-category per ACTUAL low need ----------
  need_hunger: {
    normal: {
      any: ["belly's rumbling something fierce", "could really use a bite"],
      optimist: ["next meal's gonna be great"],
    },
    dry: { any: ["hunger: present. food: not", "stomach's filing complaints"] },
    unhinged: { any: ["i would fight the soup pot rn", "my belly ROARS"] },
    dark: { any: ["the hunger always comes back"] },
  },
  need_energy: {
    normal: { any: ["paws are heavy today", "could sleep standing up"], planner: ["nap: overdue. rescheduling"] },
    dry: { any: ["running on fumes and fur", "tired. that's the report"] },
    unhinged: { any: ["my bones want the floor", "blinking is exercise now"] },
    dark: { any: ["the tired goes bone deep"] },
  },
  need_social: {
    normal: { any: ["kinda miss the others", "a chat would fix a lot"], optimist: ["someone will wander by soon!"] },
    dry: { any: ["talking to myself again. great crowd", "company: zero. noted"] },
    unhinged: { any: ["i'll befriend a BUG at this point", "my voice forgot other ears"] },
    dark: { any: ["lonely is a slow weather"] },
  },
  need_comfort: {
    normal: { any: ["everything's slightly itchy", "want a warm spot bad"], cryptic: ["ease left. it took its warmth"] },
    dry: { any: ["comfort levels: none", "this ground is all elbows"] },
    unhinged: { any: ["my fur is WRONG today", "i need a blanket the size of me"] },
    dark: { any: ["cozy is a rumor lately"] },
  },
  need_curiosity: {
    normal: {
      any: ["brain's hungry for something new", "need a mystery. any mystery"],
      chaos: ["about to invent a problem"],
    },
    dry: { any: ["bored. profoundly. academically", "nothing new under this sun"] },
    unhinged: { any: ["i'll investigate DIRT if i must", "show me one weird thing. please"] },
    dark: { any: ["boredom eats from the inside"] },
  },

  // ---------- repetition: same work action ≥ streak in a row ----------
  repeat_fish: {
    normal: {
      any: ["another cast, another maybe", "the pond and me, on repeat", "same spot. same hope"],
      optimist: ["this streak feels lucky!"],
    },
    dry: {
      any: ["fishing. again. shocking", "cast. wait. repeat. living the dream", "the fish know my schedule now"],
      planner: ["efficiency through repetition"],
    },
    unhinged: {
      any: ["i'm basically part pond now", "one more cast. the pond insists", "the fish and i share a routine"],
    },
    dark: { any: ["the pond and i are locked in this", "i'll fish till the pond blinks"] },
  },
  repeat_chop: {
    normal: { any: ["another tree, another armful", "the wood pile grows on me", "the grove and i have a rhythm"] },
    dry: {
      any: ["chop. stack. chop. poetry", "yes, tree. you again", "my whole life is timber now"],
      cynic: ["the trees talk about me. rudely"],
    },
    unhinged: {
      any: ["the trees LINE UP for me", "i hear chopping in my sleep", "swing enough, become the swing"],
    },
    dark: { any: ["the forest forgives slowly", "every stump remembers me"] },
  },
  repeat_gather: {
    normal: {
      any: ["back to the patch again", "these paws know the way blind"],
      optimist: ["the patch keeps on giving!"],
    },
    dry: {
      any: [
        "gathering. the sequel. again",
        "veg, patch, repeat. thrilling",
        "the patch and i are going steady",
        "more veg. the excitement continues",
      ],
    },
    unhinged: { any: ["the mushrooms EXPECT me now", "i dream in vegetables", "the patch whispers: more"] },
    dark: {
      any: ["the patch gives till it doesn't", "one day the patch takes back"],
      cynic: ["picked clean. story of everything"],
    },
  },

  // ---------- campfire_talk: lit bonfire + awake company ----------
  campfire_talk: {
    normal: {
      any: [
        "good fire tonight",
        "scoot over, warm spot",
        "this is the good part of the day",
        "the whole village smells like woodsmoke",
        "fires are better shared",
        "someone tell a story",
        "hey {who}, warm enough?",
        "the crackle's doing the talking",
        "nights like this, huh {who}",
      ],
      optimist: ["best seats in the village!"],
      planner: ["fire attendance: everyone. good"],
    },
    dry: {
      any: [
        "ah yes. communal fire staring",
        "we gather. fire burns. tradition",
        "the fire's the only one talking",
        "{who}'s hogging the warm side",
        "another night, same flames. cozy",
        "burning wood: still undefeated",
      ],
      cynic: ["the fire's the best company here. no offense"],
    },
    unhinged: {
      any: [
        "the sparks are trying to ESCAPE",
        "let's all yell at the moon later",
        "the fire just winked at me",
        "what if we're the fire's pets",
        "{who}, blink if the flames talk to you too",
        "the smoke is writing words",
      ],
      chaos: ["someone dare me. anything"],
    },
    dark: {
      any: [
        "we relight it anyway. every night",
        "every log was a tree with plans",
        "the dark waits right past the glow",
        "huddle up. the night is patient",
        "the fire keeps the nothing out",
        "warm now. that's all anyone gets",
      ],
      cryptic: ["the flames spell something. almost", "we sit where old fires sat"],
    },
  },

  // ---------- sleep_talk: mid-sleep mumbles only ----------
  sleep_talk: {
    normal: {
      any: [
        "mm… five more minutes",
        "warm… good…",
        "zzz… the pond…",
        "mmh. soup…",
        "no… my fish…",
        "soft… everything soft…",
        "purr… mrr…",
        "home… almost home…",
      ],
    },
    dry: {
      any: ["zzz. even asleep i'm tired", "snore. mine. zzz", "asleep. do not perceive me"],
      planner: ["zzz… behind schedule…"],
    },
    unhinged: {
      any: [
        "the bread is CHASING me…",
        "gotta… catch the moon…",
        "no no… the yarn is winning…",
        "fly little fish… fly…",
        "the trees are WALKING…",
        "shhh… the trinket sings…",
        "big fish… biggest fish…",
        "the market… sells clouds now…",
      ],
    },
    dark: {
      any: [
        "the pond… it's so deep…",
        "don't… let the fire out…",
        "the dark… has paws…",
        "falling… always falling…",
        "…don't count me yet, pond…",
      ],
      cryptic: ["…the fourth bell… no…", "…it hums louder asleep…"],
    },
  },

  // ---------- dream_report: right after waking ----------
  dream_report: {
    normal: {
      any: [
        "dreamed of warm bread. classic",
        "i was swimming. it was fine, actually",
        "dreamt the fire never went out",
        "there were so many fish",
        "dreamed the whole village purred",
        "good nap. weird dream",
        "dreamed it rained fish. nice one",
      ],
      optimist: ["dreamed tomorrow. looked great!"],
    },
    dry: {
      any: [
        "dreamed i was napping. efficient",
        "dream review: confusing. would sleep again",
        "forgot the dream already. typical",
        "slept. dreamt. shrugged",
      ],
      cynic: ["dreamed of chores. even asleep"],
    },
    unhinged: {
      any: [
        "the moon LICKED me. in the dream",
        "i was a tree. i had OPINIONS",
        "dreamed my tail left without me",
        "the soup pot spoke. it knows things",
        "i flew. badly. but i flew",
        "the library had ENDLESS shelves. i ran",
      ],
    },
    dark: {
      any: [
        "dreamed the pond swallowed the sky",
        "in the dream, nobody woke up",
        "the dream ended before i did",
        "dreamed of a door in the dark. it knew me",
        "woke up. the dream didn't",
      ],
      cryptic: ["the dream was a message. unopened", "i went somewhere real, i think"],
    },
  },

  // ---------- weather_react: one sub-category per transition direction ----------
  weather_to_rain: {
    normal: {
      any: ["here comes the rain", "smells like rain. yep, rain", "sky's opening up"],
      optimist: ["the patches needed a drink!"],
    },
    dry: {
      any: ["and now: wet", "rain. of course", "the sky sprung a leak"],
      planner: ["everyone under cover. orderly"],
    },
    unhinged: { any: ["SKY WATER incoming!!", "the clouds finally SNAPPED"] },
    dark: { any: ["the sky remembered how to cry"], cryptic: ["the rain was sent. probably"] },
  },
  weather_to_storm: {
    normal: {
      any: ["that's a real storm brewing", "the wind means it now", "hold onto your whiskers"],
      planner: ["storm plan: fire, blanket, wait"],
    },
    dry: { any: ["great. sky drama", "storm. lovely. hiding now"], cynic: ["knew the sky would turn on us"] },
    unhinged: { any: ["the sky is having a MOMENT", "thunder!! the big drums!!"] },
    dark: {
      any: ["the storm came to collect", "hope the roofs hold. hope, mostly"],
      cryptic: ["the sky is saying something angry"],
    },
  },
  weather_to_clear: {
    normal: {
      any: ["sun's back!", "sky's all blue again", "the air smells rinsed"],
      optimist: ["told you it'd clear up!"],
    },
    dry: { any: ["weather: fixed. finally", "oh good. the sky calmed down", "back to regularly scheduled sky"] },
    unhinged: { any: ["the sun REMEMBERED us!!", "blue!! everywhere!! look UP"] },
    dark: {
      any: ["the storm spared us. this time", "the sun returns. it saw everything"],
      cryptic: ["the sky forgives. for now"],
    },
  },

  // ---------- relationship milestones ----------
  friend_milestone: {
    normal: {
      any: [
        "{who} and me. good team",
        "turns out {who}'s alright",
        "made a real friend today",
        "{who} gets it, you know?",
        "friends. official. nice",
        "gonna save {who} a warm spot",
      ],
      optimist: ["{who} is the BEST, actually"],
    },
    dry: {
      any: [
        "{who}'s tolerable. high praise",
        "i guess {who} grew on me",
        "fine. {who}'s my friend now",
        "a friend. how did that happen",
      ],
      cynic: ["don't make it weird, {who}"],
    },
    unhinged: {
      any: ["{who} is MY people now", "me and {who} vs everything", "{who}!! my favorite!! today!!", "us. a team. UNSTOPPABLE"],
    },
    dark: {
      any: [
        "{who}'s stuck with me till the end",
        "few things last. maybe this one",
        "when the soup wins, i'm with {who}",
      ],
      cryptic: ["our paths braided. {who}'s and mine"],
    },
  },
  crush_milestone: {
    normal: {
      any: [
        "oh. oh no. {who}'s great",
        "my heart did a thing just now",
        "is it warm out or is it {who}",
        "{who} laughed and i malfunctioned",
      ],
    },
    dry: {
      any: [
        "i do not have a crush. shut up",
        "great. feelings. wonderful",
        "{who}. anyway. moving on. {who}.",
        "fine. {who} is distracting. fine.",
      ],
    },
    unhinged: {
      any: [
        "MY TAIL WON'T SETTLE around {who}",
        "brain: all {who}, all day",
        "i forgot how walking works near {who}",
      ],
    },
    dark: {
      any: ["falling for {who}. no floor in sight", "of all the hearts, mine picked trouble"],
      cryptic: ["the heart knew before i did"],
    },
  },
  rival_milestone: {
    normal: {
      any: [
        "{who} and i are done",
        "don't talk to me about {who}",
        "some cats just rub wrong",
        "{who} crossed a line",
        "we're not friends. not anymore",
      ],
      optimist: ["even i can't smile at {who} rn"],
    },
    dry: {
      any: [
        "{who}. ugh. moving on",
        "adding {who} to the list",
        "{who} exists. loudly. at me",
        "cool. an enemy. very village of us",
      ],
      cynic: ["trusted {who}. my mistake", "called it. {who} showed their claws"],
      planner: ["revising every plan that had {who}"],
    },
    unhinged: {
      any: [
        "{who} KNOWS what they did",
        "i will out-glare {who}. days if needed",
        "every hiss i have is for {who}",
        "{who}'s name tastes like bad soup",
      ],
      chaos: ["feud time. i don't make the rules"],
    },
    dark: {
      any: [
        "grudges keep better than fish",
        "the pond runs warmer than we do",
        "forgiveness died where {who} stands",
        "{who} made an enemy for life. mine",
        "some doors close loud. that one slammed",
      ],
      cryptic: ["some knots don't untie", "{who} and i share a shadow now"],
    },
  },
};
