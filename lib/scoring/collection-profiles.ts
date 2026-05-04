import { CollectionProfile } from "@/lib/types";

export const DEFAULT_PROFILE_ID = "bible-era";

export const collectionProfiles: Record<string, CollectionProfile> = {
  "bible-era": {
    id: "bible-era",
    name: "Bible Era",
    description:
      "Coins from the world of the Bible — the money, rulers, and empire surrounding the life of Jesus and early Christianity.",
    priorities: [
      "Alexander Jannaeus AE prutah / Widow’s Mite",
      "Herodian dynasty coins",
      "Pontius Pilate prutah",
      "Roman provincial Judaea",
      "Tyrian shekel / half shekel",
      "Tiberius denarius / Tribute Penny",
      "Judaea Capta",
      "First Jewish Revolt",
      "Bar Kokhba revolt"
    ],
    ownedCoins: ["Alexander Jannaeus AE prutah / Widow’s Mite type, 103–76 BC"]
  },
  "roman-imperial": {
    id: "roman-imperial",
    name: "Roman Imperial",
    description: "Imperial Roman portraits and reverse types from Augustus through late antiquity.",
    priorities: ["Julio-Claudian", "Flavian", "Five Good Emperors", "Severan", "Late Roman bronze"],
    ownedCoins: []
  },
  "greek-classics": {
    id: "greek-classics",
    name: "Greek Classics",
    description: "Greek city-state and Hellenistic coinage with strong artistry and historical types.",
    priorities: ["Athenian owl", "Alexander III", "Sicily tetradrachms", "Seleucid", "Ptolemaic"],
    ownedCoins: []
  },
  byzantine: {
    id: "byzantine",
    name: "Byzantine",
    description: "Byzantine coinage from Anastasius reform through late empire issues.",
    priorities: ["Anastasius follis", "Justinian", "Heraclius", "Iconoclasm period", "Anonymous folles"],
    ownedCoins: []
  },
  none: {
    id: "none",
    name: "No Profile",
    description: "Generic profile with no collection-specific weighting.",
    priorities: [],
    ownedCoins: []
  }
};

export function getCollectionProfile(profileId?: string): CollectionProfile {
  if (!profileId) return collectionProfiles[DEFAULT_PROFILE_ID];
  return collectionProfiles[profileId] ?? collectionProfiles[DEFAULT_PROFILE_ID];
}
