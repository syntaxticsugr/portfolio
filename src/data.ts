import source from "./content/anime-watchlist.json";

export const github = "https://github.com/syntaxticsugr";
export const animeSource = source.source.url;
export const watchlist = source.entries;
export const counts = source.counts;
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export const projects = [
  {
    id: "audio",
    number: "01",
    name: "Sound, to your taste.",
    product: "ViPER4Android Presets",
    category: "AUDIO EXPLORATION",
    tags: ["Python", "Audio", "Open source"],
    description:
      "A collection of audio presets, impulse responses, and device corrections for people who like their sound just so.",
    detail:
      "A growing collection of ViPER4Android audio presets, kernels, and device correction files, with a Python pipeline that converts and packages the library. The companion on-device converter moves presets between legacy XML, flat JSON, and grouped JSON.",
    url: `${github}/ViPER4Android-Presets`,
  },
];

export const featuredAnime = [
  {
    id: 77,
    title: "Cowboy Bebop",
    subtitle: "COWBOY BEBOP",
    image: "cowboy-bebop.webp",
    color: "#b24e38",
    tag: "SPACE / JAZZ / BOUNTIES",
  },
  {
    id: 73,
    title: "Attack on Titan",
    subtitle: "進撃の巨人",
    image: "attack-on-titan.webp",
    color: "#7b8170",
    tag: "HUMANITY / FREEDOM",
  },
  {
    id: 78,
    title: "Cyberpunk: Edgerunners",
    subtitle: "CYBERPUNK",
    image: "cyberpunk-edgerunners.webp",
    color: "#d5da35",
    tag: "NIGHT CITY / DREAMS",
  },
  {
    id: 97,
    title: "Steins;Gate",
    subtitle: "シュタインズ・ゲート",
    image: "steins-gate.webp",
    color: "#897860",
    tag: "TIME / CONSEQUENCES",
  },
  {
    id: 105,
    title: "Violet Evergarden",
    subtitle: "ヴァイオレット",
    image: "violet-evergarden.png",
    color: "#8f9e94",
    tag: "LETTERS / HUMANITY",
  },
  {
    id: 15,
    title: "Dandadan",
    subtitle: "ダンダダン",
    image: "dandadan.webp",
    color: "#ae482b",
    tag: "OCCULT / ABSURDITY",
  },
];
