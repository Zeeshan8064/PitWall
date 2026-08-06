// Hand-maintained team background. None of this exists in OpenF1 — there is no
// team endpoint at all — so it cannot be ingested and has to live here.
//
// MAINTENANCE NOTE. The fields split into two kinds:
//
//   Stable   — entered, base, constructorsTitles, lineage. These change once a
//              decade, if ever.
//   Volatile — owner, principal, powerUnit, titleSponsor. These move most
//              off-seasons and are the ones to check each year.
//
// Compiled from public knowledge as of the 2026 season. Verify the volatile
// fields before treating them as authoritative — team principals and sponsor
// deals in particular turn over frequently.

export interface TeamInfo {
  fullName: string;
  // First championship season under any name in this team's unbroken lineage.
  entered: number;
  enteredAs?: string;
  base: string;
  owner: string;
  principal: string;
  powerUnit: string;
  titleSponsor?: string;
  constructorsTitles: number;
  // Previous identities, oldest first. Most of the current grid is a rename of
  // something older, which is why "entered" and the team name disagree.
  lineage?: string[];
  blurb: string;
}

export const TEAM_INFO: Record<string, TeamInfo> = {
  ferrari: {
    fullName: "Scuderia Ferrari",
    entered: 1950,
    base: "Maranello, Italy",
    owner: "Ferrari N.V.",
    principal: "Frédéric Vasseur",
    powerUnit: "Ferrari",
    constructorsTitles: 16,
    blurb:
      "The only team to have contested every Formula 1 world championship since it began in 1950, and the sport's most successful constructor.",
  },

  mclaren: {
    fullName: "McLaren Formula 1 Team",
    entered: 1966,
    base: "Woking, United Kingdom",
    owner: "McLaren Group",
    principal: "Andrea Stella",
    powerUnit: "Mercedes",
    constructorsTitles: 9,
    blurb:
      "Founded by New Zealander Bruce McLaren, who entered his own cars from 1966. The second-oldest surviving team on the grid after Ferrari.",
  },

  mercedes: {
    fullName: "Mercedes-AMG PETRONAS Formula One Team",
    entered: 2010,
    enteredAs: "Mercedes GP",
    base: "Brackley, United Kingdom",
    owner: "Mercedes-Benz, Toto Wolff and INEOS",
    principal: "Toto Wolff",
    powerUnit: "Mercedes",
    titleSponsor: "PETRONAS",
    constructorsTitles: 8,
    lineage: ["Tyrrell", "BAR", "Honda Racing", "Brawn GP"],
    blurb:
      "Mercedes returned as a works team in 2010 by buying the Brawn GP operation, then won eight consecutive constructors' titles from 2014 to 2021.",
  },

  "red-bull-racing": {
    fullName: "Oracle Red Bull Racing",
    entered: 2005,
    base: "Milton Keynes, United Kingdom",
    owner: "Red Bull GmbH",
    principal: "Laurent Mekies",
    powerUnit: "Red Bull Ford Powertrains",
    titleSponsor: "Oracle",
    constructorsTitles: 6,
    lineage: ["Stewart Grand Prix", "Jaguar Racing"],
    blurb:
      "Red Bull bought the struggling Jaguar team for a nominal fee in 2004. From 2026 it builds its own power unit in partnership with Ford.",
  },

  "racing-bulls": {
    fullName: "Visa Cash App Racing Bulls",
    entered: 1985,
    enteredAs: "Minardi",
    base: "Faenza, Italy",
    owner: "Red Bull GmbH",
    principal: "Alan Permane",
    powerUnit: "Red Bull Ford Powertrains",
    constructorsTitles: 0,
    lineage: ["Minardi", "Toro Rosso", "AlphaTauri", "RB"],
    blurb:
      "Red Bull's second team and its driver academy in practice. Its sole win came at Monza in 2008, in the hands of Sebastian Vettel.",
  },

  "aston-martin": {
    fullName: "Aston Martin Aramco Formula One Team",
    entered: 1991,
    enteredAs: "Jordan Grand Prix",
    base: "Silverstone, United Kingdom",
    owner: "Consortium led by Lawrence Stroll",
    principal: "Andy Cowell",
    powerUnit: "Honda",
    titleSponsor: "Aramco",
    constructorsTitles: 0,
    lineage: ["Jordan", "Midland", "Spyker", "Force India", "Racing Point"],
    blurb:
      "The Silverstone team has changed identity five times since Eddie Jordan founded it. It became a Honda works partner for the 2026 regulations.",
  },

  williams: {
    fullName: "Atlassian Williams Racing",
    entered: 1977,
    base: "Grove, United Kingdom",
    owner: "Dorilton Capital",
    principal: "James Vowles",
    powerUnit: "Mercedes",
    titleSponsor: "Atlassian",
    constructorsTitles: 9,
    blurb:
      "Frank Williams' team won nine constructors' titles between 1980 and 1997. Family ownership ended in 2020 when Dorilton Capital bought it.",
  },

  alpine: {
    fullName: "BWT Alpine Formula One Team",
    entered: 1981,
    enteredAs: "Toleman",
    base: "Enstone, United Kingdom",
    owner: "Renault Group",
    principal: "Steve Nielsen",
    powerUnit: "Mercedes",
    constructorsTitles: 2,
    lineage: ["Toleman", "Benetton", "Renault", "Lotus"],
    blurb:
      "The Enstone team won titles as Benetton and Renault before being rebranded to Renault's Alpine marque in 2021. It became a customer engine team in 2026.",
  },

  audi: {
    fullName: "Audi F1 Team",
    entered: 1993,
    enteredAs: "Sauber",
    base: "Hinwil, Switzerland",
    owner: "Audi AG",
    principal: "Jonathan Wheatley",
    powerUnit: "Audi",
    constructorsTitles: 0,
    lineage: ["Sauber", "BMW Sauber", "Alfa Romeo", "Kick Sauber"],
    blurb:
      "Audi took full control of the long-running Sauber team and entered as a works manufacturer in 2026, building its own power unit at Neuburg.",
  },

  "haas-f1-team": {
    fullName: "MoneyGram Haas F1 Team",
    entered: 2016,
    base: "Kannapolis, United States",
    owner: "Gene Haas",
    principal: "Ayao Komatsu",
    powerUnit: "Ferrari",
    titleSponsor: "MoneyGram",
    constructorsTitles: 0,
    blurb:
      "The first American-owned team since 1986, built on a customer model: Ferrari supplies the power unit and gearbox, Dallara builds the chassis.",
  },

  cadillac: {
    fullName: "Cadillac Formula 1 Team",
    entered: 2026,
    base: "Fishers, United States",
    owner: "TWG Global and General Motors",
    principal: "Graeme Lowdon",
    powerUnit: "Ferrari",
    constructorsTitles: 0,
    blurb:
      "The grid's eleventh team and its first new entry since 2016, running Ferrari power units while General Motors develops its own for later in the ruleset.",
  },
};

export function getTeamInfo(slug: string): TeamInfo | null {
  return TEAM_INFO[slug] ?? null;
}
