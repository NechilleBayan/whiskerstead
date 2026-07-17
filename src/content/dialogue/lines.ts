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

  // ---------- M2 wave 2: event categories migrated from the flat LINES
  // table into toned bands (06-dialogue-m2w2-spec). Same category names, so
  // selectLine() falls through LINES -> TONED_LINES unchanged. ----------
  fish_catch: {
    normal: {
      any: [
        "got one!",
        "dinner!",
        "look at this one",
        "a real fish. finally",
        "supper, sorted",
        "pulled one clean out",
        "fresh from the pond",
        "this'll make good soup",
      ],
      planner: ["right on schedule", "one for the ration count"],
      optimist: ["knew it!!", "the pond loves me"],
    },
    dry: {
      any: [
        "a fish. against all odds",
        "well. the pond delivered",
        "caught something. shocking",
        "dinner, i suppose",
        "the pond came through this time",
        "one fish. don't get used to it",
        "the pond owed me one",
      ],
      planner: ["logged. one fish"],
      cynic: ["huh. one actually bit", "probably poisoned"],
    },
    unhinged: {
      any: [
        "FISH. IN MY PAWS. NOW",
        "i AM the pond now",
        "it's WET and it's MINE",
        "whiskers said left. FISH was left",
        "caught it. still vibrating",
        "the pond blinked and i STRUCK",
      ],
      chaos: ["FISH!!!", "caught it with my EYES CLOSED"],
      cryptic: ["the pond offered this one willingly", "it chose to be caught"],
    },
    dark: {
      any: [
        "one fish. entropy waits",
        "dinner now. dust later",
        "the pond gives, the pond takes",
        "we eat, then the soup eats us",
        "caught. briefly, all is well",
      ],
      cynic: ["savor it. it's only borrowed"],
      cryptic: ["the pond let this one go. for now", "it swims to us, then to nowhere"],
    },
  },

  fish_miss: {
    normal: {
      any: [
        "empty paws again",
        "the pond kept that one",
        "maybe it wasn't hungry",
        "just ripples this time",
        "no bite. that's fishing",
        "the water stayed quiet",
        "one slipped off the paw",
        "i'll wait for the next",
        "quiet pond today",
      ],
      planner: ["adjusting the cast angle"],
      optimist: ["the big one's still down there!", "pond's just saving it for me"],
    },
    dry: {
      any: [
        "cast. nothing. classic",
        "wet paw, no fish. balanced",
        "the pond and i disagree",
        "great. more water",
        "caught a whole lot of nothing",
        "the fish declined my offer",
        "the water wins this round",
      ],
      planner: ["recalibrating the odds"],
      cynic: ["the pond never gives freely", "figured. empty as ever"],
    },
    unhinged: {
      any: [
        "the fish are ORGANIZED",
        "i SAW it wink at me",
        "the pond is TAUNTING me",
        "COME BACK here, fish!!",
        "i'll drink the whole POND",
        "the water SPAT at me",
        "every ripple is a LIE",
      ],
      chaos: ["gonna yell INTO the pond", "the fish started it. WAR"],
      cryptic: ["something's DOWN there. i KNOW it"],
    },
    dark: {
      any: [
        "the pond keeps what it keeps",
        "we all come up empty sometime",
        "the water takes its own back",
        "one day the pond keeps me too",
        "the pond outlives every cast",
      ],
      cynic: ["the water never owed me a fish"],
      cryptic: ["some depths don't answer", "the pond remembers what it swallows"],
    },
  },

  eat_good: {
    normal: {
      any: [
        "so good",
        "mm.",
        "needed that",
        "warm ♥",
        "that soup hit right",
        "good bread. real good",
        "belly's happy now",
        "purring already",
      ],
      planner: ["worth the wait, that pot", "portioned it just right"],
      optimist: ["best soup ever!!", "the pot came through!!"],
    },
    dry: {
      any: [
        "edible. genuinely",
        "the soup did its job",
        "fed. we move on",
        "not bad. for soup",
        "bread held up its end",
        "adequate. surprisingly",
        "the fish was, in fact, fine",
      ],
      planner: ["hunger: handled"],
      cynic: ["…fine. it's good. whatever", "don't get used to good soup"],
    },
    unhinged: {
      any: [
        "SOUP!!",
        "this bread SLAPS",
        "MORE. i need MORE soup",
        "the fish looked at me. i WON",
        "mushrooms are GENIUS",
        "lick the bowl. LICK IT",
        "my whiskers are VIBRATING",
      ],
      chaos: ["ate it in ONE go. record", "the WHOLE village needs to KNOW"],
      cryptic: ["the soup and i are one now"],
    },
    dark: {
      any: [
        "warm bowl. brief life. worth it",
        "good soup won't save us. still good",
        "the pot empties. we all do",
        "fed today. that's the whole deal",
        "a full belly, a fading day",
      ],
      cynic: ["the bread's gone soon. savor it", "even good soup goes cold. eat fast"],
      cryptic: ["the soup fed something temporary. me"],
    },
  },

  eat_bad: {
    normal: {
      any: [
        "ew",
        "what IS this",
        "the soup betrayed me",
        "i trusted this pot",
        "my whiskers are recoiling",
        "one bite. big mistake",
        "that's not soup. that's a dare",
        "the bread fought back",
      ],
      planner: ["someone measured wrong", "next pot, we plan better"],
      optimist: ["it's… made with love?", "still warm. that counts, right?"],
    },
    dry: {
      any: [
        "…i've had worse. barely",
        "soup's fine. i'm just leaving",
        "well. that's a flavor",
        "bold of the pot",
        "i asked for soup, not this",
        "the bread and i have differences",
      ],
      planner: ["this violates several standards", "quality control left the pot"],
      cynic: ["knew the pot would do this", "betrayal. tastes like soup"],
    },
    unhinged: {
      any: [
        "THE SOUP MOVED",
        "i saw the bread BLINK",
        "the pot did something UNSPEAKABLE",
        "spit take. glorious spit take",
        "my TONGUE is filing a complaint",
        "AWAY. take the bowl AWAY",
      ],
      chaos: ["i'm gonna eat it AGAIN. why", "FLIP THE POT. FLIP IT"],
      cryptic: ["the soup remembers my face", "the bread whispered. i obeyed"],
    },
    dark: {
      any: [
        "we all meet our last bowl",
        "someday the pot claims us all",
        "every whisker meets its bad pot",
        "the pot giveth. the pot betrayeth",
        "the bonfire ash looks tastier",
      ],
      cynic: ["this is how it ends. by soup", "we're all one bad pot from the end"],
      cryptic: ["the soup was always going to win"],
    },
  },

  cook_done: {
    normal: {
      any: [
        "soup's on!",
        "come get it",
        "fresh pot!",
        "hot bowls, right here",
        "pot's ready. come eat",
        "dinner's up!",
        "made enough for everyone",
        "grab a bowl ♥",
      ],
      planner: ["ration queue forms LEFT", "bowls lined up. all set"],
      optimist: ["best pot yet, i think!", "smells like a good night"],
    },
    dry: {
      any: [
        "it's soup. it's fine",
        "pot didn't explode. progress",
        "edible. probably",
        "another pot. thrilling",
        "come eat before it judges you",
        "soup exists now",
      ],
      planner: ["one ladle per bowl. no exceptions", "portions are final"],
      cynic: ["it's warm. that's the review", "eat it or don't"],
    },
    unhinged: {
      any: [
        "SOUP. SOUP. SOUP",
        "the pot SPOKE to me",
        "i stirred it 400 times",
        "BEHOLD. the pot",
        "tastes like VICTORY and mushroom",
        "come eat my creation!!",
      ],
      chaos: ["i made a THING. it might be soup", "threw everything in. no notes"],
      cryptic: ["the pot hums now. don't ask", "the soup chose its own bowl"],
    },
    dark: {
      any: [
        "the pot gets us all, someday",
        "everything simmers down someday",
        "the ladle outlives us all",
        "bowls empty, bowls fill, forever",
        "eat now. entropy waits",
      ],
      cynic: ["warm today. cold soon enough", "enjoy it before the pot cools"],
      cryptic: ["the pot remembers every bowl"],
    },
  },

  build: {
    normal: {
      any: [
        "needs more nails",
        "almost home",
        "another wall stands",
        "the frame's holding",
        "wood smells good today",
        "one more log up",
        "look at that wall go",
        "house is getting real",
      ],
      planner: ["measure twice. cut once. perfect", "every nail has a place"],
      optimist: ["it'll be cozy in here", "we built this. together"],
    },
    dry: {
      any: [
        "this wall is fine. probably",
        "level-ish",
        "a wall. congratulations to me",
        "hammered my paw. progress",
        "close enough to a wall",
        "the house remains theoretical",
        "swung the hammer. it swung back",
      ],
      planner: ["measured it. twice. still crooked"],
      cynic: ["it'll fall down. building it anyway", "great. more wall to fix later"],
    },
    unhinged: {
      any: [
        "hammer time",
        "NAIL. NAIL. NAIL.",
        "i AM the wall now",
        "MORE WOOD. FEED THE FRAME",
        "the hammer whispered yes",
        "wall go UP",
        "i licked a nail. tasted like sky",
      ],
      chaos: ["walls are a suggestion", "who needs a plan. SWING"],
      cryptic: ["the nails know something"],
    },
    dark: {
      any: [
        "this wall will outlast me. rude",
        "we build. the mud waits",
        "all frames sag eventually",
        "houses fall. we hammer anyway",
        "one day the wall wins",
        "dust to wood, wood to dust",
      ],
      cynic: ["build it. entropy's patient"],
      cryptic: ["the frame remembers every paw"],
    },
  },

  gossip_open: {
    normal: {
      any: [
        "did you hear…",
        "psst",
        "so about {who}…",
        "don't tell anyone but",
        "keep this between us",
        "you know {who}, right",
        "come closer for this one",
        "just between you and me",
      ],
      planner: ["wait til {who} naps", "heard it first. remember that"],
      optimist: ["i'm sure {who} didn't mean it…", "{who}'s sweet though. mostly"],
    },
    dry: {
      any: [
        "not gossip. just facts",
        "you didn't hear it from me",
        "so. {who}.",
        "it's about {who} again",
        "shocking. to no one",
        "big news. small whisper",
        "i have thoughts on {who}",
      ],
      planner: ["filed under: told you so"],
      cynic: ["called it. {who}, i mean", "obviously it's {who}"],
    },
    unhinged: {
      any: [
        "OK SO. lean in",
        "you will NOT believe {who}",
        "{who}. i saw EVERYTHING",
        "{who}. a fish. THAT'S IT",
        "WHISPER MODE. engage",
        "the WALLS have ears",
        "{who} did a THING. oh boy",
      ],
      chaos: ["SECRETS. i have SO MANY", "i'm VIBRATING. gossip time"],
      cryptic: ["the whiskers told me of {who}"],
    },
    dark: {
      any: [
        "we're all gossip eventually",
        "secrets outlive the soup",
        "whisper now, we're all puddles soon",
        "{who}'s tale outlasts us all",
        "even embers spread rumors",
      ],
      cynic: ["{who} talks. we all fade anyway"],
      cryptic: ["the moon forgets us too…", "all secrets return to dust…"],
    },
  },

  argue: {
    normal: {
      any: [
        "you always do this",
        "take it back",
        "hmph.",
        "unbelievable",
        "that's not what i said",
        "you weren't even listening",
        "you knew. and you did it anyway",
        "that was my spot",
        "i'm not sorry. not yet",
      ],
      planner: ["this is why nothing works around here", "i had a plan. you sat on it"],
      optimist: ["we can patch this up. later"],
    },
    dry: {
      any: [
        "great talk. truly",
        "wow. bold of you",
        "sure. if you say so",
        "noted. and ignored",
        "riveting. still no",
        "we're doing this. again",
        "love this for us. really",
      ],
      planner: ["adding this to my list of grievances"],
      cynic: ["i knew you'd say that", "called it. you never change"],
    },
    unhinged: {
      any: [
        "SAY IT AGAIN. i DARE you",
        "my WHISKERS are furious",
        "i'm hissing. this is a HISS",
        "i will yowl. i WILL",
        "my tail is a THUNDERCLOUD",
        "ears BACK. it's ON",
        "i'll flip the whole soup pot",
      ],
      chaos: ["claws OUT. metaphorically. mostly", "gonna knock something over about THIS"],
      cryptic: ["we were ALWAYS gonna clash…"],
    },
    dark: {
      any: [
        "we'll both be dust. still mad",
        "grudges outlast the grove",
        "the pond forgets. i won't",
        "even the fire quits before i do",
        "carrying this to my last nap",
      ],
      cynic: ["grudges keep. warmth spoils first"],
      cryptic: ["some hisses echo past the fire…", "the stump remembers who was right…"],
    },
  },

  beg: {
    normal: {
      any: [
        "spare a bite?",
        "please. anything",
        "i'm SO hungry",
        "half a fish? i'd owe you",
        "just one bite. promise",
        "got any bread to spare?",
        "share your soup? please?",
        "even day-old bread helps",
        "cold soup's fine by me",
      ],
      planner: ["rationed wrong. lesson learned"],
      optimist: ["you're the generous type, right?", "you'd share, right? you would"],
    },
    dry: {
      any: [
        "feed me or watch me sulk",
        "not begging. just. hovering",
        "this bowl won't fill itself",
        "i'm told sharing is a thing",
        "your soup, my empty bowl. math",
        "i'll act surprised. just feed me",
        "starving. quietly. right here",
      ],
      planner: ["budgeted zero fish. bad plan"],
      cynic: ["you won't. but i'll ask anyway", "spare food? no? predictable"],
    },
    unhinged: {
      any: [
        "FEED ME. i'll do a trick",
        "i can SMELL your bread",
        "one fish and i'm YOURS",
        "i'd trade a whisker for bread",
        "SHARE. i'm begging with my EYES",
        "my belly is SCREAMING fish",
        "give me the soup. ALL of it",
      ],
      chaos: ["toss it here. i'll CATCH it", "i'll guard your fish. feed me first"],
      cryptic: ["the soup called. it wants me"],
    },
    dark: {
      any: [
        "feed me before the void does",
        "we all get hungry. then hungrier",
        "an empty bowl is a slow ending",
        "share now. entropy skips no one",
        "a bite between me and the dark",
        "the hunger wins eventually. delay it?",
      ],
      cynic: ["you'll share when i'm dust. share now"],
      cryptic: ["the bowl remembers being full"],
    },
  },

  comfort: {
    normal: {
      any: [
        "it's okay",
        "i'm here",
        "breathe. slowly",
        "rough day, huh",
        "you're safe now",
        "i'm not going anywhere",
        "let's just sit here",
        "warm soup fixes a lot",
        "c'mere. paws up",
      ],
      planner: ["one paw at a time"],
      optimist: ["tomorrow will be better. promise", "the sun comes back. always"],
    },
    dry: {
      any: [
        "well. that happened",
        "rough. yep. noted",
        "sit. i'll pretend to help",
        "there there. professionally",
        "i'm bad at this. still here",
        "look, a fire. go be sad by it",
        "soup's warm. cry into it",
      ],
      planner: ["step one: stop. step two: soup"],
      cynic: ["everyone's day is bad. yours louder", "there. fixed nothing. you're welcome"],
    },
    unhinged: {
      any: [
        "i will FIGHT your bad day",
        "FUR WALL. nothing gets past me",
        "we're stealing extra soup. c'mon",
        "i licked your ear. healing now",
        "SAD? not on my watch",
        "here's a trinket. it's yours. SHH",
        "i piled all the flowers on you",
      ],
      chaos: ["we RIOT against the sad. gently", "i'll yell at the rain FOR you"],
      cryptic: ["the pond says you'll be okay"],
    },
    dark: {
      any: [
        "even embers keep each other warm",
        "the soup wins someday. not today",
        "everything ends. not this nap though",
        "we all fade. slower, together",
        "entropy's patient. so am i",
        "we end as quiet. purrs til then",
      ],
      cynic: ["the void waited this long. it can wait more"],
      cryptic: ["this too was foreseen. it passes"],
    },
  },

  scavenge: {
    normal: {
      any: [
        "finders keepers",
        "ooh, shiny",
        "look what i found!!",
        "it's junk. it's MY junk",
        "a trinket. all mine",
        "yarn! the good kind",
        "flowers. free flowers",
        "found it. keeping it",
      ],
      planner: ["into the pile it goes", "sorted. shiny with shiny"],
      optimist: ["today gave me a gift", "the ground provides!"],
    },
    dry: {
      any: [
        "someone dropped this. tragic",
        "junk. but it's warm junk",
        "a trinket. thrilling",
        "found yarn. life peaks",
        "it's mine now. rules",
        "another treasure. sure",
        "the ground had this. neat",
      ],
      planner: ["adds to the collection. technically"],
      cynic: ["one cat's junk, another's shrine", "finders keepers, losers whatever"],
    },
    unhinged: {
      any: [
        "MINE MINE MINE",
        "SHINY!! it's SHINY",
        "the junk CHOSE me",
        "never sharing. NEVER",
        "found it FIRST. no takebacks",
        "TRINKET. keeping it forever",
        "a shiny!! i'm vibrating",
      ],
      chaos: ["gonna hoard ALL of it", "i found it so it's LAW"],
      cryptic: ["found it. or it found me…"],
    },
    dark: {
      any: [
        "junk outlives us all",
        "treasure now, dust later",
        "we're all somebody's junk…",
        "found it. we all get found",
        "shiny fades. i fade. fair",
      ],
      cynic: ["everything's junk eventually", "the ground wants it back"],
      cryptic: ["the trinket will outlast me…"],
    },
  },

  chop: {
    normal: {
      any: [
        "there. solid log",
        "wood for the pile",
        "that'll warm someone",
        "clean cut. nice",
        "paws full of timber",
        "the forest can spare it",
        "smells like fresh wood",
        "good swing, that one",
      ],
      planner: ["enough wood for days now", "counted the grove. plenty left"],
      optimist: ["the grove gives so much!", "a sapling grows where this stood"],
    },
    dry: {
      any: [
        "tree: down. me: tired",
        "chopped a thing. it fell",
        "wood acquired. joy",
        "the tree lost. as expected",
        "swing, thud, splinters. art",
        "another log for the collection",
        "my apologies, tree. sort of",
      ],
      planner: ["timber quota: met"],
      cynic: ["grows back. so they claim", "the grove won't miss one"],
    },
    unhinged: {
      any: [
        "TIMBERRRR!!",
        "the tree NEVER stood a chance",
        "WOOD. so much WOOD",
        "the grove FEARS my swing",
        "i could chop the whole forest",
        "the stump and i made EYE CONTACT",
        "log go BONK. i go YES",
      ],
      chaos: ["gonna hug the wood pile now", "MORE TIMBER. FEED THE FIRE"],
      cryptic: ["the tree agreed to this. it whispered"],
    },
    dark: {
      any: [
        "every tree meets its stump",
        "wood was alive once. warm now",
        "the grove feeds the fire that feeds us",
        "one less tree. the forest counts",
        "we all become firewood somehow",
        "the sapling won't remember this one",
      ],
      cynic: ["trees fall. villages take the warmth"],
      cryptic: ["the grove keeps a longer memory than us"],
    },
  },

  steal_success: {
    normal: {
      any: [
        "mine now",
        "they weren't using it",
        "finders keepers, right?",
        "it looked lonely there",
        "just needed it more",
        "i'll give it back. maybe",
        "it wanted to come with me",
        "borrowing this forever",
      ],
      planner: ["one trinket. reallocated", "quietly rehomed. all set"],
      optimist: ["everyone shares, sort of!", "it's a gift now, basically"],
    },
    dry: {
      any: [
        "not stealing. relocating",
        "it's mine on a technicality",
        "borrowed. return date: never",
        "the yarn changed paws. quietly",
        "a trinket wandered off. with me",
        "found it. in their bowl",
        "consider it a long loan",
        "it's junk. i collect junk",
      ],
      cynic: ["nobody owned it. now i do", "guilt: filed. trinket: kept"],
    },
    unhinged: {
      any: [
        "SNATCHED. gone. bye",
        "the yarn is MINE now HAHA",
        "gremlin mode: SUCCESSFUL",
        "grabbed it and RAN",
        "my paws are QUICK today",
        "the fish never stood a chance",
        "took it. POOF. gone",
        "GOTCHA little trinket",
      ],
      chaos: ["you'll never catch me HA!!", "my junk pile GROWS!! mwahaha"],
    },
    dark: {
      any: [
        "everything's borrowed anyway",
        "we all return to the junk pile",
        "possession is a passing thing",
        "the trinket outlives us both",
        "it'll be junk again someday. like us",
        "nothing stays owned for long",
      ],
      cynic: ["yours, mine, dust. same ending"],
      cryptic: ["the yarn keeps no owner for long"],
    },
  },

  cookoff: {
    normal: {
      any: [
        "may the best pot win",
        "my soup, my whole heart",
        "stir with love. win with love",
        "smell that? that's victory",
        "the ladle is ready",
        "hope your bowl is hungry",
        "good luck. you'll need it",
        "one pot to rule them all",
      ],
      planner: ["measured the herbs twice", "herb first. then the root"],
      optimist: ["everybody wins with soup!", "no bad bowls today"],
    },
    dry: {
      any: [
        "it's just soup. also personal",
        "my ladle. your loss",
        "taste it. try not to cry",
        "stirring. thrilling stuff",
        "another pot, another shrug",
        "broth: adequate. me: winning",
      ],
      planner: ["prep beats flair. every time", "seasoned in the right order"],
      cynic: ["second place, first loser", "we all lose. i lose slower"],
    },
    unhinged: {
      any: [
        "taste test. RIGHT NOW",
        "MY LADLE. MY RULES.",
        "MORE FIRE. MORE POWER",
        "the pot is SPEAKING to me",
        "i licked the ladle. no regrets",
        "STIR!! STIR!! STIR!!",
      ],
      chaos: ["i put a whole root in. RAW", "flip the pot. see what happens"],
      cryptic: ["the soup knows who wins", "every bowl remembers the ladle"],
    },
    dark: {
      any: [
        "all pots go cold eventually",
        "we're all broth in the end",
        "every bowl empties. still, stir",
        "the ladle outlives the cook",
      ],
      cynic: ["win now. entropy's undefeated", "even champions go cold"],
      cryptic: ["cold soup keeps its own counsel", "the pot outlasts the fire. and us"],
    },
  },

  oust_campaign: {
    normal: {
      any: [
        "the soup situation is a PROBLEM",
        "we need to talk about the cook",
        "how many bad pots is too many",
        "the pot needs new paws",
        "someone else should stir tonight",
        "the bowls keep coming back full",
        "we deserve a better pot",
        "the cook's had enough chances",
        "another gray bowl. we can do better",
        "time for a new ladle-paw",
      ],
      planner: ["we vote. new cook by dawn"],
      optimist: ["a fresh cook could be lovely!"],
    },
    dry: {
      any: [
        "the soup's an acquired dread",
        "the pot has notes. all bad",
        "great pot. for growing mold",
        "the cook tries. that's the tragedy",
        "our ladle's held hostage",
        "the bowl and i have suffered",
      ],
      planner: ["motion to retire the ladle", "the pot needs a change. formally"],
      cynic: ["knew the pot would sink us", "same cook, same gray water"],
    },
    unhinged: {
      any: [
        "OVERTHROW THE POT",
        "the ladle must FALL",
        "i've SEEN what's in that pot",
        "no more gray soup. NONE",
        "the bowls RISE UP tonight",
        "storm the soup station!!",
        "the pot has WRONGED us all",
      ],
      chaos: ["riot. but make it soup", "i'll eat the ladle in PROTEST"],
      cryptic: ["the pot knows what it did"],
    },
    dark: {
      any: [
        "every pot goes cold in the end",
        "the soup wins if we let it",
        "we rot waiting on this cook",
        "bad soup outlives good cats",
        "the ladle stirs us toward the void",
      ],
      cynic: ["the pot always sinks us. always", "gray soup, gray forever"],
      cryptic: ["the pot remembers every bad bowl"],
    },
  },

  beg_refused: {
    normal: {
      any: [
        "fine. FINE.",
        "not even one bite?",
        "i asked so nicely…",
        "my bowl stays empty then",
        "i would've shared mine",
        "one crumb. that's all",
      ],
      planner: ["noted. no soup from you"],
      optimist: ["next time you'll share. right?"],
    },
    dry: {
      any: [
        "i'll remember this",
        "generous. truly",
        "great talk. empty bowl",
        "love that for me",
        "so we're doing this",
        "cool. starving quietly then",
      ],
      planner: ["you're on the list now"],
      cynic: ["knew you'd say no"],
    },
    unhinged: {
      any: [
        "NO?? to ME??",
        "i will haunt your soup",
        "GRUDGE. ACQUIRED.",
        "my hunger is ETERNAL now",
        "the bowl HISSES now",
      ],
      chaos: ["i'm gonna EAT THE POT", "off to forage my RAGE"],
      cryptic: ["the empty bowl remembers"],
    },
    dark: {
      any: [
        "we all go hungry in the end",
        "the soup runs out eventually",
        "the pot outlives us all",
        "starving, but make it graceful",
      ],
      cynic: ["we fade. the soup stays warm"],
      cryptic: ["an empty bowl is still a bowl"],
    },
  },

  confront_apology: {
    normal: {
      any: [
        "you're right. i'm sorry",
        "i'll do better. promise",
        "you deserve better soup",
        "new pots. i mean it",
        "i heard you. really",
        "i'll make it right",
      ],
      planner: ["better soup. i've got a plan"],
      optimist: ["next pot will be the good one!"],
    },
    dry: {
      any: [
        "fine. bad soup. sorry",
        "yeah, that pot was rough",
        "point taken. better soup coming",
        "the ladle and i will talk",
      ],
      planner: ["noted. better soup, phase one"],
      cynic: ["i'll try. the pot may not"],
    },
    unhinged: {
      any: [
        "I WAS WRONG. so wrong. SORRY",
        "new pots!! ALL NEW POTS!!",
        "i'll stir till the pot's PERFECT",
      ],
      chaos: ["the bad pot is GONE. i threw it"],
    },
    dark: {
      any: [
        "one day the soup wins. not today. sorry",
        "we all cook a bad pot in the end",
        "the pot forgives. maybe you will too",
        "better soup. while the fire still burns",
      ],
      cynic: ["every cook fails. today it was me"],
      cryptic: ["the ladle keeps score. i'll settle it"],
    },
  },

  confront_quit: {
    normal: {
      any: [
        "FINE. cook it yourselves",
        "the pot is yours now",
        "i hang up my ladle",
        "no more soup from me",
        "cook your own soup then",
      ],
      planner: ["no more ration lines from me"],
    },
    dry: {
      any: [
        "may your soup be forever lukewarm",
        "good luck with the pot",
        "hope you like it cold",
        "the pot's all yours. condolences",
        "stir it yourselves",
        "i'll take my ladle, thanks",
      ],
      cynic: ["every pot from here tastes worse", "you'll be back. they always are"],
    },
    unhinged: {
      any: [
        "TAKE THE POT. TAKE IT",
        "i'm THROWING the ladle",
        "goodbye pot. GOODBYE SOUP",
        "i will boil NOTHING for you",
      ],
      chaos: ["the pot and i are ELOPING", "i live in the forage patch now"],
    },
    dark: {
      any: ["one day the pot goes cold. today, actually", "every soup ends. this one ends now"],
      cynic: ["the ladle outlasts us all. keep it"],
      cryptic: ["the pot forgets who stirred it"],
    },
  },

  confront_defended: {
    normal: {
      any: [
        "the cook stirs like it matters",
        "every cook burns a pot sometimes",
        "they cook every single dawn",
        "one bad pot isn't the whole cook",
        "you'd stir better? didn't think so",
        "they feed us. show some purr",
      ],
      planner: ["give the ladle time. it improves"],
      optimist: ["next pot'll be better. i believe it"],
    },
    dry: {
      any: [
        "yes it's watery. we're still alive",
        "leave the cook alone. i'm napping",
        "it's soup. lower your expectations",
        "the pot's fine. you're just loud",
        "nobody's making you eat it",
        "great, another pot critic",
      ],
      planner: ["one bad pot. the average holds"],
      cynic: ["everyone hates the cook till they're hungry"],
    },
    unhinged: {
      any: [
        "HISS AT THE POT NOT THE COOK",
        "the ladle CHOSE them. RESPECT IT",
        "you insult the soup you insult ME",
      ],
      chaos: ["DEFEND THE POT. DEFEND THE POT"],
    },
    dark: {
      any: [
        "we all eat bad soup and fade someday",
        "the pot outlives us all. be kind to it",
        "someday the last pot goes cold. not today",
      ],
      cryptic: ["the soup returns to soup. so do we"],
    },
  },

  cult_visit: {
    normal: {
      any: [
        "there's a shape out here…",
        "it hums, almost like a purr",
        "the site feels… kind, somehow",
        "i just stood there, listening",
      ],
      planner: ["found the site. worth remembering"],
      optimist: ["the hum feels friendly!"],
    },
    dry: {
      any: [
        "the fourth bell. of course",
        "it hums. i'm ignoring it",
        "a shape in the grove. neat",
      ],
      cynic: ["a humming shape. this ends well"],
    },
    unhinged: {
      any: [
        "it hums. do you hear it",
        "the SHAPE. the shape is HERE",
        "i touched the site. TINGLY",
        "the hum is in my TEETH",
        "i can taste the humming!!",
      ],
      chaos: ["gonna ring the fourth bell. watch"],
      cryptic: ["the shape KNOWS. it KNOWS!!", "the site was WAITING for me!!"],
    },
    dark: {
      any: [
        "…don't ring the fourth bell.",
        "the hum was here before us",
        "the site hums after we're gone",
        "the shape outlasts everything",
        "we're small. the hum is not",
        "one day we all hear the bell",
      ],
      cynic: ["we'll all forget it by soup", "hum all you want. dust wins"],
      cryptic: ["the fourth bell knows our names", "the shape came before the grove"],
    },
  },

  cult_recruit: {
    normal: {
      any: [
        "you should see what i found.",
        "there's… something you need to witness",
        "come see. just once",
        "there's room for you too",
        "we saved you a spot",
        "come sit by the site",
      ],
      planner: ["come by the fourth bell"],
      optimist: ["you'll feel so welcome!"],
    },
    dry: {
      any: [
        "it's a whole thing. come see",
        "it hums. you get used to it. come",
        "no pressure. the bell waits",
      ],
      cynic: ["everyone joins eventually. you too"],
    },
    unhinged: {
      any: [
        "COME SEE THE SHAPE!!",
        "it hums it hums COME",
        "the fourth bell is RINGING for you",
        "you HAVE to feel this",
      ],
      chaos: ["RING IT RING IT ring the bell"],
      cryptic: ["the shape learned your name…"],
    },
    dark: {
      any: [
        "we're all embers, come warm up",
        "the site keeps us all. eventually",
        "one day the bell rings for all of us",
        "everything hums out in the end. come hear",
      ],
      cynic: ["the shape gets us all. sooner's cozier"],
      cryptic: ["the shape has been waiting. patiently…"],
    },
  },

  // ---------- reconcile: initiator makes peace with a rival, ACCEPTED
  // (06-dialogue M4 §A). Sincere making-up register; the dark band is wry, not
  // grim — a feud is a waste of a short life, not a death sentence. ----------
  reconcile: {
    normal: {
      any: [
        "hey {who}. can we start over",
        "i've been meaning to say sorry",
        "let's not stay mad, {who}",
        "i miss us being okay",
        "truce? i even brought flowers",
        "you and me, {who}. let's fix it",
        "i don't wanna fight anymore, {who}",
        "clean slate? please",
        "no hard feelings, {who}. deal?",
      ],
      optimist: ["we're better as friends, {who}"],
      planner: ["let's talk it through. calmly"],
    },
    dry: {
      any: [
        "so. grudge forever, or nah",
        "i'm here to un-hate you, {who}",
        "this is me being the bigger cat",
        "peace. and no, i'm not going soft",
        "consider this me lowering my tail",
        "fine. i forgive you. mostly",
      ],
      cynic: ["against my better judgment, {who}"],
    },
    unhinged: {
      any: [
        "let's just be okay again, {who}!!",
        "i came to make PEACE. loudly",
        "no more feud. hissing is exhausting",
        "truce or i flop on you, {who}",
        "{who}!! i surrender the whole grudge!!",
      ],
      chaos: ["peace treaty. chaotic. binding"],
    },
    dark: {
      any: [
        "grudges just rot. let's not, {who}",
        "short lives. no sense spending one mad",
        "even the pond lets go. we can too",
        "the feud outlives us. let it starve",
      ],
      cryptic: ["the knot loosens. if you let it"],
      cynic: ["hating you is a lot of upkeep, {who}"],
    },
  },

  // ---------- rumor_good: a cat re-voices a POSITIVE `heard:` memory later
  // (06-dialogue M4 §B). It conveys only "there's warm talk about {who}" — never
  // the raw event; the hearer doesn't know the specifics, just the good buzz.
  // Dark band stays wry (good word is fleeting), not grim. ----------
  rumor_good: {
    normal: {
      any: [
        "word is {who}'s a good one",
        "folks speak well of {who} lately",
        "heard {who}'s been kind to everyone",
        "nice things going round about {who}",
        "the fireside's fond of {who} these days",
        "{who}'s name comes up warm",
        "they say {who}'s alright, and i buy it",
      ],
      optimist: ["good buzz about {who}. love that"],
      planner: ["noting it: {who}'s well regarded"],
    },
    dry: {
      any: [
        "so {who}'s popular now. huh",
        "the village approves of {who}, seems like",
        "word on the pond: {who}'s decent",
        "{who}'s getting good press. sure",
        "everyone's charmed by {who}. noted",
      ],
      cynic: ["nobody's got dirt on {who}. suspicious"],
    },
    unhinged: {
      any: [
        "the whole village is BUZZING about {who}",
        "{who}?? beloved, apparently!!",
        "word says {who} is GREAT and i AGREE",
        "the gossip crowned {who} tonight!!",
      ],
      chaos: ["spreading the GOOD word about {who}"],
    },
    dark: {
      any: [
        "kind words for {who}. rare. hoard them",
        "good talk fades. enjoy {who}'s while it's warm",
        "even the grove speaks well of {who}",
      ],
      cryptic: ["the whispers favor {who}. for now"],
      cynic: ["praise is cheap, but {who} earned this batch"],
    },
  },

  // ---------- rumor_bad: a cat re-voices a NEGATIVE `heard:` memory later
  // (06-dialogue M4 §B). It conveys only "there's sour talk about {who}" — never
  // the raw event; secondhand, so the specifics stay vague. Dark band wry. ------
  rumor_bad: {
    normal: {
      any: [
        "word is {who}'s been trouble",
        "folks are talking about {who}. not warmly",
        "heard {who}'s in the doghouse",
        "the fireside's got notes on {who}",
        "{who}'s name keeps coming up sour",
        "they say {who} crossed somebody",
        "there's grumbling about {who} going round",
      ],
      optimist: ["hope the talk about {who} isn't true"],
      planner: ["flagging it: {who}'s got bad word out"],
    },
    dry: {
      any: [
        "so {who}'s the talk of the pond. not good",
        "the village has opinions on {who}. all bad",
        "word says {who} messed up. shocking",
        "heard {who}'s on everyone's list now",
        "{who}'s getting dragged fireside. anyway",
      ],
      cynic: ["figures the whispers found {who}"],
    },
    unhinged: {
      any: [
        "the WHOLE village is whispering about {who}",
        "{who}?? oh they are in TROUBLE",
        "word is {who} did something. big something",
        "the gossip pile is ALL {who} tonight",
      ],
      chaos: ["ooh the {who} rumors are SPICY"],
    },
    dark: {
      any: [
        "bad word sticks longer than good. sorry {who}",
        "the murmurs found {who}. they always do",
        "{who}'s in the talk now. we all get a turn",
      ],
      cryptic: ["the whispers circle {who} lately"],
      cynic: ["rumor eats {who} today. someone else tomorrow"],
    },
  },

  // ---------- reconcile_rebuffed: the peace offer is turned down; the rivalry
  // stands (06-dialogue M4 §A). Stung but not crushed; dark stays wry. ----------
  reconcile_rebuffed: {
    normal: {
      any: [
        "worth a try, i guess",
        "okay. maybe not today, {who}",
        "i tried. that's something",
        "still mad, huh. fair enough",
        "i'll leave the door open, {who}",
      ],
      optimist: ["next time, maybe, {who}"],
    },
    dry: {
      any: [
        "cool. rejected. very warm",
        "well. that went great",
        "guess the grudge stays, {who}",
        "noted. still on the outs",
      ],
      cynic: ["figured you'd say no, {who}"],
    },
    unhinged: {
      any: [
        "FINE. keep your feud, {who}",
        "i offered PEACE and got a hiss",
        "rejected!! my whiskers are wounded",
      ],
      chaos: ["you'll regret spurning my truce!!"],
    },
    dark: {
      any: [
        "grudge wins this round, {who}",
        "peace declined. the feud eats on",
        "well. we take that to the grave",
      ],
      cynic: ["figures. warmth's wasted on {who}"],
      cryptic: ["the knot holds. for now, {who}"],
    },
  },

  // ---------- campfire_reply: a turn-taking reply to a fireside neighbor who
  // just spoke (06-dialogue M4 §C). EVENT-ONLY — never in GATES/AMBIENT_CATEGORIES,
  // so it never competes in the ambient roll and never double-fires with
  // campfire_talk. Short, warm/ribbing reactions to {who}=the neighbor; every line
  // addresses them by name. Dark band stays wry (the glow is brief), not grim. ----
  campfire_reply: {
    normal: {
      any: [
        "you said it, {who}",
        "right there with you, {who}",
        "mm, {who}'s onto something",
        "couldn't agree more, {who}",
        "ha, fair point, {who}",
        "well put, {who}",
        "same, honestly, {who}",
      ],
      optimist: ["love where {who}'s head is at"],
      planner: ["{who}'s right. noting it for later"],
    },
    dry: {
      any: [
        "bold take, {who}",
        "sure, {who}. if you say so",
        "{who} talks, the fire listens",
        "deep. for a log fire, {who}",
        "noted, {who}. do go on",
      ],
      cynic: ["easy for {who} to say, warm as we are"],
    },
    unhinged: {
      any: [
        "YES {who}. exactly THAT",
        "{who} GETS it!!",
        "say it LOUDER, {who}",
        "sparks agree with {who}!!",
        "preach by firelight, {who}!!",
      ],
      chaos: ["{who} said it so i'm YELLING it"],
    },
    dark: {
      any: [
        "we'll all be ash, but you're right {who}",
        "true, {who}. the dark's still listening",
        "even the embers nod at {who}",
        "wise, {who}. shame it fades by dawn",
      ],
      cynic: ["{who}'s right. rare, this close to the cold"],
      cryptic: ["the flame heard {who} too"],
    },
  },
};
