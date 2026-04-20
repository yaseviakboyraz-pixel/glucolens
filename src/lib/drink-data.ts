// GlucoLens Drink Database v1.0
// Sources: USDA FoodData, WHO Alcohol Guidelines, Diabetes UK, Sydney GI DB
// Coverage: Alcoholic (beer, wine, spirits, liqueurs), Cocktails, Non-alcoholic

export interface DrinkEntry {
  name: string;
  name_tr?: string;
  category: DrinkCategory;
  subcategory?: string;
  alcohol_pct: number;        // ABV %
  carb_per_100ml: number;     // g
  sugar_per_100ml: number;    // g
  cal_per_100ml: number;      // kcal
  gi: number;                 // glycemic index
  serving_ml: number;         // standard serving
  // calculated per serving:
  gl_per_serving?: number;
  diabetes_risk: "low" | "medium" | "high" | "very_high";
  hypo_risk: boolean;         // hypoglycemia risk for diabetics
  source: string;
  notes?: string;
}

export type DrinkCategory =
  | "beer" | "wine" | "spirit" | "liqueur"
  | "cocktail" | "juice" | "soda" | "energy"
  | "coffee" | "tea" | "dairy_drink" | "water"
  | "smoothie" | "traditional";

export const DRINK_DATABASE: Record<string, DrinkEntry> = {

  // ══════════════════════════════════════════════
  // BİRA / BEER
  // ══════════════════════════════════════════════

  "bira": {
    name: "Beer (Lager)", name_tr: "Bira",
    category: "beer", subcategory: "lager",
    alcohol_pct: 5.0, carb_per_100ml: 3.6, sugar_per_100ml: 0,
    cal_per_100ml: 43, gi: 66, serving_ml: 330,
    diabetes_risk: "medium", hypo_risk: true,
    source: "USDA", notes: "Carbs from malt. Alcohol suppresses liver glucose output — hypoglycemia risk.",
  },
  "beer": {
    name: "Beer (Lager)", name_tr: "Bira",
    category: "beer", subcategory: "lager",
    alcohol_pct: 5.0, carb_per_100ml: 3.6, sugar_per_100ml: 0,
    cal_per_100ml: 43, gi: 66, serving_ml: 330,
    diabetes_risk: "medium", hypo_risk: true, source: "USDA",
  },
  "lager": {
    name: "Lager Beer", name_tr: "Lager Bira",
    category: "beer", subcategory: "lager",
    alcohol_pct: 5.0, carb_per_100ml: 3.6, sugar_per_100ml: 0,
    cal_per_100ml: 43, gi: 66, serving_ml: 330,
    diabetes_risk: "medium", hypo_risk: true, source: "USDA",
  },
  "efes": {
    name: "Efes Pilsen", name_tr: "Efes Pilsen",
    category: "beer", subcategory: "lager",
    alcohol_pct: 5.0, carb_per_100ml: 3.8, sugar_per_100ml: 0,
    cal_per_100ml: 44, gi: 66, serving_ml: 330,
    diabetes_risk: "medium", hypo_risk: true, source: "Anadolu Efes",
  },
  "bomonti": {
    name: "Bomonti Beer", name_tr: "Bomonti Bira",
    category: "beer", subcategory: "lager",
    alcohol_pct: 5.0, carb_per_100ml: 3.5, sugar_per_100ml: 0,
    cal_per_100ml: 43, gi: 66, serving_ml: 330,
    diabetes_risk: "medium", hypo_risk: true, source: "Bomonti",
  },
  "heineken": {
    name: "Heineken", name_tr: "Heineken",
    category: "beer", subcategory: "lager",
    alcohol_pct: 5.0, carb_per_100ml: 3.2, sugar_per_100ml: 0,
    cal_per_100ml: 42, gi: 66, serving_ml: 330,
    diabetes_risk: "medium", hypo_risk: true, source: "Heineken",
  },
  "corona": {
    name: "Corona Extra", name_tr: "Corona",
    category: "beer", subcategory: "lager",
    alcohol_pct: 4.5, carb_per_100ml: 3.6, sugar_per_100ml: 0,
    cal_per_100ml: 41, gi: 66, serving_ml: 355,
    diabetes_risk: "medium", hypo_risk: true, source: "AB InBev",
  },
  "guinness": {
    name: "Guinness Stout", name_tr: "Guinness",
    category: "beer", subcategory: "stout",
    alcohol_pct: 4.2, carb_per_100ml: 4.3, sugar_per_100ml: 0.4,
    cal_per_100ml: 45, gi: 66, serving_ml: 440,
    diabetes_risk: "medium", hypo_risk: true, source: "Diageo",
  },
  "wheat beer": {
    name: "Wheat Beer (Weizen)", name_tr: "Buğday Birası",
    category: "beer", subcategory: "wheat",
    alcohol_pct: 5.4, carb_per_100ml: 4.5, sugar_per_100ml: 0,
    cal_per_100ml: 51, gi: 66, serving_ml: 500,
    diabetes_risk: "medium", hypo_risk: true, source: "USDA",
  },
  "buğday birası": {
    name: "Wheat Beer", name_tr: "Buğday Birası",
    category: "beer", subcategory: "wheat",
    alcohol_pct: 5.4, carb_per_100ml: 4.5, sugar_per_100ml: 0,
    cal_per_100ml: 51, gi: 66, serving_ml: 500,
    diabetes_risk: "medium", hypo_risk: true, source: "USDA",
  },
  "light beer": {
    name: "Light Beer", name_tr: "Light Bira",
    category: "beer", subcategory: "light",
    alcohol_pct: 3.5, carb_per_100ml: 1.5, sugar_per_100ml: 0,
    cal_per_100ml: 29, gi: 50, serving_ml: 330,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
    notes: "Lower carbs but alcohol still raises hypo risk.",
  },
  "light bira": {
    name: "Light Beer", name_tr: "Light Bira",
    category: "beer", subcategory: "light",
    alcohol_pct: 3.5, carb_per_100ml: 1.5, sugar_per_100ml: 0,
    cal_per_100ml: 29, gi: 50, serving_ml: 330,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
  },
  "ipa": {
    name: "IPA (India Pale Ale)", name_tr: "IPA Bira",
    category: "beer", subcategory: "ale",
    alcohol_pct: 6.5, carb_per_100ml: 5.2, sugar_per_100ml: 0,
    cal_per_100ml: 59, gi: 66, serving_ml: 330,
    diabetes_risk: "medium", hypo_risk: true, source: "USDA",
  },
  "ale": {
    name: "Ale Beer", name_tr: "Ale Bira",
    category: "beer", subcategory: "ale",
    alcohol_pct: 5.2, carb_per_100ml: 4.0, sugar_per_100ml: 0,
    cal_per_100ml: 47, gi: 66, serving_ml: 330,
    diabetes_risk: "medium", hypo_risk: true, source: "USDA",
  },
  "radler": {
    name: "Radler (Beer + Lemon)", name_tr: "Radler",
    category: "beer", subcategory: "radler",
    alcohol_pct: 2.5, carb_per_100ml: 6.8, sugar_per_100ml: 6.0,
    cal_per_100ml: 52, gi: 60, serving_ml: 330,
    diabetes_risk: "medium", hypo_risk: false, source: "General",
    notes: "High sugar from lemon soda mixer.",
  },

  // ══════════════════════════════════════════════
  // ŞARAP / WINE
  // ══════════════════════════════════════════════

  "şarap": {
    name: "Red Wine", name_tr: "Kırmızı Şarap",
    category: "wine", subcategory: "red",
    alcohol_pct: 13.5, carb_per_100ml: 2.3, sugar_per_100ml: 0.6,
    cal_per_100ml: 85, gi: 0, serving_ml: 150,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
    notes: "Low GI. Resveratrol may improve insulin sensitivity.",
  },
  "kırmızı şarap": {
    name: "Red Wine", name_tr: "Kırmızı Şarap",
    category: "wine", subcategory: "red",
    alcohol_pct: 13.5, carb_per_100ml: 2.3, sugar_per_100ml: 0.6,
    cal_per_100ml: 85, gi: 0, serving_ml: 150,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
  },
  "red wine": {
    name: "Red Wine", name_tr: "Kırmızı Şarap",
    category: "wine", subcategory: "red",
    alcohol_pct: 13.5, carb_per_100ml: 2.3, sugar_per_100ml: 0.6,
    cal_per_100ml: 85, gi: 0, serving_ml: 150,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
  },
  "beyaz şarap": {
    name: "White Wine (Dry)", name_tr: "Beyaz Şarap",
    category: "wine", subcategory: "white",
    alcohol_pct: 12.0, carb_per_100ml: 1.5, sugar_per_100ml: 0.6,
    cal_per_100ml: 77, gi: 0, serving_ml: 150,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
  },
  "white wine": {
    name: "White Wine (Dry)", name_tr: "Beyaz Şarap",
    category: "wine", subcategory: "white",
    alcohol_pct: 12.0, carb_per_100ml: 1.5, sugar_per_100ml: 0.6,
    cal_per_100ml: 77, gi: 0, serving_ml: 150,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
  },
  "rosé": {
    name: "Rosé Wine", name_tr: "Roze Şarap",
    category: "wine", subcategory: "rose",
    alcohol_pct: 12.0, carb_per_100ml: 2.5, sugar_per_100ml: 1.0,
    cal_per_100ml: 80, gi: 0, serving_ml: 150,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
  },
  "roze şarap": {
    name: "Rosé Wine", name_tr: "Roze Şarap",
    category: "wine", subcategory: "rose",
    alcohol_pct: 12.0, carb_per_100ml: 2.5, sugar_per_100ml: 1.0,
    cal_per_100ml: 80, gi: 0, serving_ml: 150,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
  },
  "prosecco": {
    name: "Prosecco", name_tr: "Prosecco",
    category: "wine", subcategory: "sparkling",
    alcohol_pct: 11.5, carb_per_100ml: 3.0, sugar_per_100ml: 1.5,
    cal_per_100ml: 80, gi: 0, serving_ml: 150,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
  },
  "champagne": {
    name: "Champagne", name_tr: "Şampanya",
    category: "wine", subcategory: "sparkling",
    alcohol_pct: 12.0, carb_per_100ml: 3.8, sugar_per_100ml: 1.7,
    cal_per_100ml: 81, gi: 0, serving_ml: 150,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
  },
  "şampanya": {
    name: "Champagne", name_tr: "Şampanya",
    category: "wine", subcategory: "sparkling",
    alcohol_pct: 12.0, carb_per_100ml: 3.8, sugar_per_100ml: 1.7,
    cal_per_100ml: 81, gi: 0, serving_ml: 150,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
  },
  "sweet wine": {
    name: "Sweet Wine (Dessert)", name_tr: "Tatlı Şarap",
    category: "wine", subcategory: "sweet",
    alcohol_pct: 12.0, carb_per_100ml: 12.0, sugar_per_100ml: 11.0,
    cal_per_100ml: 130, gi: 55, serving_ml: 90,
    diabetes_risk: "high", hypo_risk: false, source: "USDA",
    notes: "High sugar. Treat like dessert.",
  },
  "tatlı şarap": {
    name: "Sweet Wine", name_tr: "Tatlı Şarap",
    category: "wine", subcategory: "sweet",
    alcohol_pct: 12.0, carb_per_100ml: 12.0, sugar_per_100ml: 11.0,
    cal_per_100ml: 130, gi: 55, serving_ml: 90,
    diabetes_risk: "high", hypo_risk: false, source: "USDA",
  },
  "port wine": {
    name: "Port Wine", name_tr: "Port Şarap",
    category: "wine", subcategory: "fortified",
    alcohol_pct: 20.0, carb_per_100ml: 14.0, sugar_per_100ml: 13.0,
    cal_per_100ml: 156, gi: 55, serving_ml: 60,
    diabetes_risk: "high", hypo_risk: false, source: "USDA",
  },

  // ══════════════════════════════════════════════
  // RAKLI İÇECEKLER / SPIRITS
  // ══════════════════════════════════════════════

  "rakı": {
    name: "Rakı", name_tr: "Rakı",
    category: "spirit", subcategory: "anise",
    alcohol_pct: 45.0, carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 231, gi: 0, serving_ml: 45,
    diabetes_risk: "medium", hypo_risk: true, source: "TürKomp",
    notes: "Pure alcohol — no carbs but strong hypo risk. Usually paired with meze (reduces hypo risk).",
  },
  "raki": {
    name: "Rakı", name_tr: "Rakı",
    category: "spirit", subcategory: "anise",
    alcohol_pct: 45.0, carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 231, gi: 0, serving_ml: 45,
    diabetes_risk: "medium", hypo_risk: true, source: "TürKomp",
  },
  "votka": {
    name: "Vodka", name_tr: "Votka",
    category: "spirit", subcategory: "vodka",
    alcohol_pct: 40.0, carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 231, gi: 0, serving_ml: 40,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
    notes: "Zero carbs but strong hypo risk when drunk without food.",
  },
  "vodka": {
    name: "Vodka", name_tr: "Votka",
    category: "spirit", subcategory: "vodka",
    alcohol_pct: 40.0, carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 231, gi: 0, serving_ml: 40,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
  },
  "viski": {
    name: "Whiskey", name_tr: "Viski",
    category: "spirit", subcategory: "whiskey",
    alcohol_pct: 40.0, carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 250, gi: 0, serving_ml: 40,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
  },
  "whiskey": {
    name: "Whiskey", name_tr: "Viski",
    category: "spirit", subcategory: "whiskey",
    alcohol_pct: 40.0, carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 250, gi: 0, serving_ml: 40,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
  },
  "whisky": {
    name: "Whisky (Scotch)", name_tr: "Viski",
    category: "spirit", subcategory: "whiskey",
    alcohol_pct: 40.0, carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 250, gi: 0, serving_ml: 40,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
  },
  "bourbon": {
    name: "Bourbon Whiskey", name_tr: "Burbon Viski",
    category: "spirit", subcategory: "whiskey",
    alcohol_pct: 40.0, carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 250, gi: 0, serving_ml: 40,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
  },
  "cin": {
    name: "Gin", name_tr: "Cin",
    category: "spirit", subcategory: "gin",
    alcohol_pct: 40.0, carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 263, gi: 0, serving_ml: 40,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
  },
  "gin": {
    name: "Gin", name_tr: "Cin",
    category: "spirit", subcategory: "gin",
    alcohol_pct: 40.0, carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 263, gi: 0, serving_ml: 40,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
  },
  "rom": {
    name: "Rum", name_tr: "Rom",
    category: "spirit", subcategory: "rum",
    alcohol_pct: 40.0, carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 231, gi: 0, serving_ml: 40,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
  },
  "rum": {
    name: "Rum", name_tr: "Rom",
    category: "spirit", subcategory: "rum",
    alcohol_pct: 40.0, carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 231, gi: 0, serving_ml: 40,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
  },
  "tekila": {
    name: "Tequila", name_tr: "Tekila",
    category: "spirit", subcategory: "tequila",
    alcohol_pct: 38.0, carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 231, gi: 0, serving_ml: 40,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
  },
  "tequila": {
    name: "Tequila", name_tr: "Tekila",
    category: "spirit", subcategory: "tequila",
    alcohol_pct: 38.0, carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 231, gi: 0, serving_ml: 40,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
  },
  "brendi": {
    name: "Brandy / Cognac", name_tr: "Brendi",
    category: "spirit", subcategory: "brandy",
    alcohol_pct: 40.0, carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 237, gi: 0, serving_ml: 40,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
  },
  "brandy": {
    name: "Brandy", name_tr: "Brendi",
    category: "spirit", subcategory: "brandy",
    alcohol_pct: 40.0, carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 237, gi: 0, serving_ml: 40,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
  },
  "cognac": {
    name: "Cognac", name_tr: "Konyak",
    category: "spirit", subcategory: "brandy",
    alcohol_pct: 40.0, carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 237, gi: 0, serving_ml: 40,
    diabetes_risk: "low", hypo_risk: true, source: "USDA",
  },
  "ouzo": {
    name: "Ouzo", name_tr: "Uzo",
    category: "spirit", subcategory: "anise",
    alcohol_pct: 40.0, carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 231, gi: 0, serving_ml: 40,
    diabetes_risk: "medium", hypo_risk: true, source: "General",
  },

  // ══════════════════════════════════════════════
  // LİKÖRLER / LIQUEURS
  // ══════════════════════════════════════════════

  "likör": {
    name: "Liqueur (general)", name_tr: "Likör",
    category: "liqueur", subcategory: "general",
    alcohol_pct: 25.0, carb_per_100ml: 30.0, sugar_per_100ml: 28.0,
    cal_per_100ml: 327, gi: 65, serving_ml: 30,
    diabetes_risk: "high", hypo_risk: false, source: "USDA",
    notes: "Very high sugar. Small servings still spike blood sugar.",
  },
  "baileys": {
    name: "Baileys Irish Cream", name_tr: "Baileys",
    category: "liqueur", subcategory: "cream",
    alcohol_pct: 17.0, carb_per_100ml: 25.0, sugar_per_100ml: 23.0,
    cal_per_100ml: 327, gi: 55, serving_ml: 50,
    diabetes_risk: "high", hypo_risk: false, source: "Diageo",
  },
  "kahlúa": {
    name: "Kahlúa", name_tr: "Kahlua",
    category: "liqueur", subcategory: "coffee",
    alcohol_pct: 20.0, carb_per_100ml: 46.0, sugar_per_100ml: 46.0,
    cal_per_100ml: 347, gi: 65, serving_ml: 30,
    diabetes_risk: "very_high", hypo_risk: false, source: "Pernod Ricard",
    notes: "Extremely high sugar.",
  },
  "kahlua": {
    name: "Kahlúa", name_tr: "Kahlua",
    category: "liqueur", subcategory: "coffee",
    alcohol_pct: 20.0, carb_per_100ml: 46.0, sugar_per_100ml: 46.0,
    cal_per_100ml: 347, gi: 65, serving_ml: 30,
    diabetes_risk: "very_high", hypo_risk: false, source: "Pernod Ricard",
  },
  "amaretto": {
    name: "Amaretto", name_tr: "Amaretto",
    category: "liqueur", subcategory: "almond",
    alcohol_pct: 28.0, carb_per_100ml: 35.0, sugar_per_100ml: 35.0,
    cal_per_100ml: 380, gi: 65, serving_ml: 30,
    diabetes_risk: "high", hypo_risk: false, source: "General",
  },
  "triple sec": {
    name: "Triple Sec / Cointreau", name_tr: "Triple Sec",
    category: "liqueur", subcategory: "orange",
    alcohol_pct: 38.0, carb_per_100ml: 28.0, sugar_per_100ml: 28.0,
    cal_per_100ml: 317, gi: 65, serving_ml: 30,
    diabetes_risk: "high", hypo_risk: false, source: "General",
  },
  "midori": {
    name: "Midori", name_tr: "Midori",
    category: "liqueur", subcategory: "melon",
    alcohol_pct: 20.0, carb_per_100ml: 40.0, sugar_per_100ml: 40.0,
    cal_per_100ml: 330, gi: 65, serving_ml: 30,
    diabetes_risk: "very_high", hypo_risk: false, source: "Suntory",
  },
  "sambuca": {
    name: "Sambuca", name_tr: "Sambuka",
    category: "liqueur", subcategory: "anise",
    alcohol_pct: 42.0, carb_per_100ml: 35.0, sugar_per_100ml: 35.0,
    cal_per_100ml: 360, gi: 65, serving_ml: 30,
    diabetes_risk: "high", hypo_risk: false, source: "General",
  },
  "schnapps": {
    name: "Schnapps", name_tr: "Schnapps",
    category: "liqueur", subcategory: "fruit",
    alcohol_pct: 25.0, carb_per_100ml: 30.0, sugar_per_100ml: 28.0,
    cal_per_100ml: 290, gi: 65, serving_ml: 30,
    diabetes_risk: "high", hypo_risk: false, source: "General",
  },
  "frangelico": {
    name: "Frangelico", name_tr: "Frangelico",
    category: "liqueur", subcategory: "hazelnut",
    alcohol_pct: 20.0, carb_per_100ml: 32.0, sugar_per_100ml: 32.0,
    cal_per_100ml: 325, gi: 65, serving_ml: 30,
    diabetes_risk: "high", hypo_risk: false, source: "General",
  },

  // ══════════════════════════════════════════════
  // KOKTEYLLER / COCKTAILS
  // ══════════════════════════════════════════════

  "mojito": {
    name: "Mojito", name_tr: "Mojito",
    category: "cocktail", subcategory: "rum_based",
    alcohol_pct: 10.0, carb_per_100ml: 8.5, sugar_per_100ml: 8.0,
    cal_per_100ml: 95, gi: 65, serving_ml: 250,
    diabetes_risk: "high", hypo_risk: false, source: "General",
    notes: "Sugar + lime juice + soda. GL ~22 per glass.",
  },
  "margarita": {
    name: "Margarita", name_tr: "Margarita",
    category: "cocktail", subcategory: "tequila_based",
    alcohol_pct: 15.0, carb_per_100ml: 10.0, sugar_per_100ml: 9.0,
    cal_per_100ml: 145, gi: 65, serving_ml: 150,
    diabetes_risk: "high", hypo_risk: false, source: "General",
    notes: "Triple sec + lime juice = high sugar.",
  },
  "cosmopolitan": {
    name: "Cosmopolitan", name_tr: "Kozmopolitan",
    category: "cocktail", subcategory: "vodka_based",
    alcohol_pct: 20.0, carb_per_100ml: 9.0, sugar_per_100ml: 8.5,
    cal_per_100ml: 145, gi: 65, serving_ml: 120,
    diabetes_risk: "high", hypo_risk: false, source: "General",
  },
  "daiquiri": {
    name: "Daiquiri", name_tr: "Daiquiri",
    category: "cocktail", subcategory: "rum_based",
    alcohol_pct: 20.0, carb_per_100ml: 7.5, sugar_per_100ml: 7.0,
    cal_per_100ml: 130, gi: 65, serving_ml: 120,
    diabetes_risk: "high", hypo_risk: false, source: "General",
  },
  "pina colada": {
    name: "Piña Colada", name_tr: "Pina Colada",
    category: "cocktail", subcategory: "rum_based",
    alcohol_pct: 13.0, carb_per_100ml: 18.0, sugar_per_100ml: 17.0,
    cal_per_100ml: 175, gi: 65, serving_ml: 250,
    diabetes_risk: "very_high", hypo_risk: false, source: "General",
    notes: "Coconut cream + pineapple juice = very high sugar. GL ~29 per glass.",
  },
  "piña colada": {
    name: "Piña Colada", name_tr: "Pina Colada",
    category: "cocktail", subcategory: "rum_based",
    alcohol_pct: 13.0, carb_per_100ml: 18.0, sugar_per_100ml: 17.0,
    cal_per_100ml: 175, gi: 65, serving_ml: 250,
    diabetes_risk: "very_high", hypo_risk: false, source: "General",
  },
  "sangria": {
    name: "Sangria", name_tr: "Sangria",
    category: "cocktail", subcategory: "wine_based",
    alcohol_pct: 8.0, carb_per_100ml: 12.0, sugar_per_100ml: 11.0,
    cal_per_100ml: 95, gi: 55, serving_ml: 250,
    diabetes_risk: "high", hypo_risk: false, source: "General",
    notes: "Wine + fruit juice + added sugar.",
  },
  "long island iced tea": {
    name: "Long Island Iced Tea", name_tr: "Long Island",
    category: "cocktail", subcategory: "multi_spirit",
    alcohol_pct: 22.0, carb_per_100ml: 9.0, sugar_per_100ml: 8.5,
    cal_per_100ml: 160, gi: 65, serving_ml: 350,
    diabetes_risk: "very_high", hypo_risk: false, source: "General",
    notes: "5 spirits + cola. High alcohol AND high sugar.",
  },
  "aperol spritz": {
    name: "Aperol Spritz", name_tr: "Aperol Spritz",
    category: "cocktail", subcategory: "wine_based",
    alcohol_pct: 9.0, carb_per_100ml: 8.5, sugar_per_100ml: 7.5,
    cal_per_100ml: 88, gi: 55, serving_ml: 200,
    diabetes_risk: "medium", hypo_risk: false, source: "Campari Group",
  },
  "negroni": {
    name: "Negroni", name_tr: "Negroni",
    category: "cocktail", subcategory: "gin_based",
    alcohol_pct: 25.0, carb_per_100ml: 5.0, sugar_per_100ml: 4.5,
    cal_per_100ml: 180, gi: 55, serving_ml: 90,
    diabetes_risk: "medium", hypo_risk: true, source: "General",
    notes: "Lower sugar than most cocktails.",
  },
  "old fashioned": {
    name: "Old Fashioned", name_tr: "Old Fashioned",
    category: "cocktail", subcategory: "whiskey_based",
    alcohol_pct: 32.0, carb_per_100ml: 4.0, sugar_per_100ml: 4.0,
    cal_per_100ml: 220, gi: 55, serving_ml: 90,
    diabetes_risk: "medium", hypo_risk: true, source: "General",
  },
  "manhattan": {
    name: "Manhattan", name_tr: "Manhattan",
    category: "cocktail", subcategory: "whiskey_based",
    alcohol_pct: 30.0, carb_per_100ml: 4.5, sugar_per_100ml: 4.0,
    cal_per_100ml: 215, gi: 55, serving_ml: 90,
    diabetes_risk: "medium", hypo_risk: true, source: "General",
  },
  "moscow mule": {
    name: "Moscow Mule", name_tr: "Moscow Mule",
    category: "cocktail", subcategory: "vodka_based",
    alcohol_pct: 10.0, carb_per_100ml: 6.0, sugar_per_100ml: 5.5,
    cal_per_100ml: 90, gi: 65, serving_ml: 250,
    diabetes_risk: "medium", hypo_risk: false, source: "General",
    notes: "Ginger beer mixer adds sugar.",
  },
  "mimosa": {
    name: "Mimosa", name_tr: "Mimoza",
    category: "cocktail", subcategory: "wine_based",
    alcohol_pct: 6.0, carb_per_100ml: 7.0, sugar_per_100ml: 6.5,
    cal_per_100ml: 75, gi: 55, serving_ml: 150,
    diabetes_risk: "medium", hypo_risk: false, source: "General",
  },
  "bellini": {
    name: "Bellini", name_tr: "Bellini",
    category: "cocktail", subcategory: "wine_based",
    alcohol_pct: 5.5, carb_per_100ml: 10.0, sugar_per_100ml: 9.5,
    cal_per_100ml: 80, gi: 55, serving_ml: 150,
    diabetes_risk: "medium", hypo_risk: false, source: "General",
  },
  "gin tonic": {
    name: "Gin & Tonic", name_tr: "Cin Tonik",
    category: "cocktail", subcategory: "gin_based",
    alcohol_pct: 10.0, carb_per_100ml: 4.5, sugar_per_100ml: 4.0,
    cal_per_100ml: 95, gi: 65, serving_ml: 250,
    diabetes_risk: "medium", hypo_risk: false, source: "General",
    notes: "Tonic water has 8g sugar per 100ml.",
  },
  "cin tonik": {
    name: "Gin & Tonic", name_tr: "Cin Tonik",
    category: "cocktail", subcategory: "gin_based",
    alcohol_pct: 10.0, carb_per_100ml: 4.5, sugar_per_100ml: 4.0,
    cal_per_100ml: 95, gi: 65, serving_ml: 250,
    diabetes_risk: "medium", hypo_risk: false, source: "General",
  },
  "screwdriver": {
    name: "Screwdriver (Vodka + OJ)", name_tr: "Screwdriver",
    category: "cocktail", subcategory: "vodka_based",
    alcohol_pct: 10.0, carb_per_100ml: 8.0, sugar_per_100ml: 7.5,
    cal_per_100ml: 95, gi: 55, serving_ml: 250,
    diabetes_risk: "high", hypo_risk: false, source: "General",
    notes: "Orange juice adds significant sugar.",
  },
  "bloody mary": {
    name: "Bloody Mary", name_tr: "Kanlı Mary",
    category: "cocktail", subcategory: "vodka_based",
    alcohol_pct: 10.0, carb_per_100ml: 4.0, sugar_per_100ml: 3.5,
    cal_per_100ml: 80, gi: 40, serving_ml: 250,
    diabetes_risk: "medium", hypo_risk: false, source: "General",
    notes: "Tomato juice base — lower sugar than most cocktails.",
  },
  "sex on the beach": {
    name: "Sex on the Beach", name_tr: "Sex on the Beach",
    category: "cocktail", subcategory: "vodka_based",
    alcohol_pct: 12.0, carb_per_100ml: 12.0, sugar_per_100ml: 11.5,
    cal_per_100ml: 120, gi: 65, serving_ml: 250,
    diabetes_risk: "high", hypo_risk: false, source: "General",
  },
  "tequila sunrise": {
    name: "Tequila Sunrise", name_tr: "Tekila Sunrise",
    category: "cocktail", subcategory: "tequila_based",
    alcohol_pct: 12.0, carb_per_100ml: 12.0, sugar_per_100ml: 11.5,
    cal_per_100ml: 125, gi: 60, serving_ml: 250,
    diabetes_risk: "high", hypo_risk: false, source: "General",
  },
  "mai tai": {
    name: "Mai Tai", name_tr: "Mai Tai",
    category: "cocktail", subcategory: "rum_based",
    alcohol_pct: 15.0, carb_per_100ml: 14.0, sugar_per_100ml: 13.0,
    cal_per_100ml: 160, gi: 65, serving_ml: 200,
    diabetes_risk: "very_high", hypo_risk: false, source: "General",
  },
  "white russian": {
    name: "White Russian", name_tr: "Beyaz Rus",
    category: "cocktail", subcategory: "vodka_based",
    alcohol_pct: 18.0, carb_per_100ml: 14.0, sugar_per_100ml: 13.0,
    cal_per_100ml: 230, gi: 55, serving_ml: 120,
    diabetes_risk: "high", hypo_risk: false, source: "General",
    notes: "Kahlúa + cream = very high sugar and fat.",
  },
  "espresso martini": {
    name: "Espresso Martini", name_tr: "Espresso Martini",
    category: "cocktail", subcategory: "vodka_based",
    alcohol_pct: 20.0, carb_per_100ml: 16.0, sugar_per_100ml: 15.0,
    cal_per_100ml: 200, gi: 65, serving_ml: 120,
    diabetes_risk: "high", hypo_risk: false, source: "General",
  },
  "dark and stormy": {
    name: "Dark & Stormy", name_tr: "Dark & Stormy",
    category: "cocktail", subcategory: "rum_based",
    alcohol_pct: 10.0, carb_per_100ml: 9.0, sugar_per_100ml: 8.5,
    cal_per_100ml: 100, gi: 65, serving_ml: 250,
    diabetes_risk: "high", hypo_risk: false, source: "General",
  },
  "hugo spritz": {
    name: "Hugo Spritz", name_tr: "Hugo Spritz",
    category: "cocktail", subcategory: "wine_based",
    alcohol_pct: 8.0, carb_per_100ml: 9.0, sugar_per_100ml: 8.5,
    cal_per_100ml: 85, gi: 55, serving_ml: 200,
    diabetes_risk: "medium", hypo_risk: false, source: "General",
  },

  // ══════════════════════════════════════════════
  // ALKOLSÜZ İÇECEKLER / NON-ALCOHOLIC
  // ══════════════════════════════════════════════

  // Meyve Suları
  "portakal suyu": {
    name: "Orange Juice", name_tr: "Portakal Suyu",
    category: "juice", alcohol_pct: 0,
    carb_per_100ml: 10.4, sugar_per_100ml: 8.4,
    cal_per_100ml: 45, gi: 50, serving_ml: 200,
    diabetes_risk: "medium", hypo_risk: false, source: "USDA",
    notes: "No fiber — faster sugar absorption than eating an orange.",
  },
  "orange juice": {
    name: "Orange Juice", name_tr: "Portakal Suyu",
    category: "juice", alcohol_pct: 0,
    carb_per_100ml: 10.4, sugar_per_100ml: 8.4,
    cal_per_100ml: 45, gi: 50, serving_ml: 200,
    diabetes_risk: "medium", hypo_risk: false, source: "USDA",
  },
  "elma suyu": {
    name: "Apple Juice", name_tr: "Elma Suyu",
    category: "juice", alcohol_pct: 0,
    carb_per_100ml: 11.3, sugar_per_100ml: 9.6,
    cal_per_100ml: 46, gi: 40, serving_ml: 200,
    diabetes_risk: "medium", hypo_risk: false, source: "USDA",
  },
  "apple juice": {
    name: "Apple Juice", name_tr: "Elma Suyu",
    category: "juice", alcohol_pct: 0,
    carb_per_100ml: 11.3, sugar_per_100ml: 9.6,
    cal_per_100ml: 46, gi: 40, serving_ml: 200,
    diabetes_risk: "medium", hypo_risk: false, source: "USDA",
  },
  "üzüm suyu": {
    name: "Grape Juice", name_tr: "Üzüm Suyu",
    category: "juice", alcohol_pct: 0,
    carb_per_100ml: 16.0, sugar_per_100ml: 15.0,
    cal_per_100ml: 60, gi: 52, serving_ml: 200,
    diabetes_risk: "high", hypo_risk: false, source: "USDA",
  },
  "grape juice": {
    name: "Grape Juice", name_tr: "Üzüm Suyu",
    category: "juice", alcohol_pct: 0,
    carb_per_100ml: 16.0, sugar_per_100ml: 15.0,
    cal_per_100ml: 60, gi: 52, serving_ml: 200,
    diabetes_risk: "high", hypo_risk: false, source: "USDA",
  },
  "nar suyu": {
    name: "Pomegranate Juice", name_tr: "Nar Suyu",
    category: "juice", alcohol_pct: 0,
    carb_per_100ml: 13.1, sugar_per_100ml: 12.7,
    cal_per_100ml: 54, gi: 53, serving_ml: 200,
    diabetes_risk: "medium", hypo_risk: false, source: "USDA",
  },
  "ananas suyu": {
    name: "Pineapple Juice", name_tr: "Ananas Suyu",
    category: "juice", alcohol_pct: 0,
    carb_per_100ml: 13.0, sugar_per_100ml: 9.9,
    cal_per_100ml: 53, gi: 46, serving_ml: 200,
    diabetes_risk: "medium", hypo_risk: false, source: "USDA",
  },
  "domates suyu": {
    name: "Tomato Juice", name_tr: "Domates Suyu",
    category: "juice", alcohol_pct: 0,
    carb_per_100ml: 4.2, sugar_per_100ml: 3.5,
    cal_per_100ml: 17, gi: 38, serving_ml: 200,
    diabetes_risk: "low", hypo_risk: false, source: "USDA",
    notes: "Low sugar. Good choice.",
  },
  "tomato juice": {
    name: "Tomato Juice", name_tr: "Domates Suyu",
    category: "juice", alcohol_pct: 0,
    carb_per_100ml: 4.2, sugar_per_100ml: 3.5,
    cal_per_100ml: 17, gi: 38, serving_ml: 200,
    diabetes_risk: "low", hypo_risk: false, source: "USDA",
  },

  // Gazlı İçecekler
  "cola": {
    name: "Cola", name_tr: "Kola",
    category: "soda", alcohol_pct: 0,
    carb_per_100ml: 10.6, sugar_per_100ml: 10.6,
    cal_per_100ml: 41, gi: 63, serving_ml: 330,
    diabetes_risk: "high", hypo_risk: false, source: "USDA",
  },
  "kola": {
    name: "Cola", name_tr: "Kola",
    category: "soda", alcohol_pct: 0,
    carb_per_100ml: 10.6, sugar_per_100ml: 10.6,
    cal_per_100ml: 41, gi: 63, serving_ml: 330,
    diabetes_risk: "high", hypo_risk: false, source: "USDA",
  },
  "coca cola": {
    name: "Coca-Cola", name_tr: "Coca-Cola",
    category: "soda", alcohol_pct: 0,
    carb_per_100ml: 10.6, sugar_per_100ml: 10.6,
    cal_per_100ml: 41, gi: 63, serving_ml: 330,
    diabetes_risk: "high", hypo_risk: false, source: "Coca-Cola",
  },
  "cola zero": {
    name: "Cola Zero / Diet", name_tr: "Kola Zero",
    category: "soda", alcohol_pct: 0,
    carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 0, gi: 0, serving_ml: 330,
    diabetes_risk: "low", hypo_risk: false, source: "Coca-Cola",
    notes: "Zero sugar but artificial sweeteners may still affect insulin response in some people.",
  },
  "sprite": {
    name: "Sprite", name_tr: "Sprite",
    category: "soda", alcohol_pct: 0,
    carb_per_100ml: 10.1, sugar_per_100ml: 10.1,
    cal_per_100ml: 41, gi: 63, serving_ml: 330,
    diabetes_risk: "high", hypo_risk: false, source: "Coca-Cola",
  },
  "fanta": {
    name: "Fanta (Orange)", name_tr: "Fanta",
    category: "soda", alcohol_pct: 0,
    carb_per_100ml: 11.5, sugar_per_100ml: 11.5,
    cal_per_100ml: 44, gi: 68, serving_ml: 330,
    diabetes_risk: "high", hypo_risk: false, source: "Coca-Cola",
  },
  "soda": {
    name: "Soda Water", name_tr: "Soda",
    category: "soda", alcohol_pct: 0,
    carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 0, gi: 0, serving_ml: 330,
    diabetes_risk: "low", hypo_risk: false, source: "General",
  },
  "tonik": {
    name: "Tonic Water", name_tr: "Tonik",
    category: "soda", alcohol_pct: 0,
    carb_per_100ml: 8.0, sugar_per_100ml: 7.5,
    cal_per_100ml: 34, gi: 65, serving_ml: 200,
    diabetes_risk: "medium", hypo_risk: false, source: "General",
    notes: "Often mistaken for soda — has significant sugar.",
  },
  "tonic water": {
    name: "Tonic Water", name_tr: "Tonik",
    category: "soda", alcohol_pct: 0,
    carb_per_100ml: 8.0, sugar_per_100ml: 7.5,
    cal_per_100ml: 34, gi: 65, serving_ml: 200,
    diabetes_risk: "medium", hypo_risk: false, source: "General",
  },
  "ginger beer": {
    name: "Ginger Beer", name_tr: "Zencefil Birası",
    category: "soda", alcohol_pct: 0,
    carb_per_100ml: 9.0, sugar_per_100ml: 8.5,
    cal_per_100ml: 34, gi: 65, serving_ml: 200,
    diabetes_risk: "medium", hypo_risk: false, source: "General",
  },

  // Enerji İçecekleri
  "red bull": {
    name: "Red Bull", name_tr: "Red Bull",
    category: "energy", alcohol_pct: 0,
    carb_per_100ml: 11.3, sugar_per_100ml: 11.0,
    cal_per_100ml: 45, gi: 73, serving_ml: 250,
    diabetes_risk: "high", hypo_risk: false, source: "Red Bull",
    notes: "High sugar + caffeine. Can mask hypoglycemia symptoms.",
  },
  "monster": {
    name: "Monster Energy", name_tr: "Monster",
    category: "energy", alcohol_pct: 0,
    carb_per_100ml: 11.0, sugar_per_100ml: 11.0,
    cal_per_100ml: 44, gi: 73, serving_ml: 500,
    diabetes_risk: "very_high", hypo_risk: false, source: "Monster",
  },
  "burn": {
    name: "Burn Energy", name_tr: "Burn",
    category: "energy", alcohol_pct: 0,
    carb_per_100ml: 10.8, sugar_per_100ml: 10.6,
    cal_per_100ml: 43, gi: 73, serving_ml: 250,
    diabetes_risk: "high", hypo_risk: false, source: "Coca-Cola",
  },

  // Geleneksel Türk İçecekleri
  "ayran": {
    name: "Ayran", name_tr: "Ayran",
    category: "traditional", alcohol_pct: 0,
    carb_per_100ml: 3.5, sugar_per_100ml: 3.5,
    cal_per_100ml: 36, gi: 30, serving_ml: 300,
    diabetes_risk: "low", hypo_risk: false, source: "TürKomp",
    notes: "Excellent choice. Probiotic, low GI, protein rich.",
  },
  "şalgam": {
    name: "Şalgam Suyu", name_tr: "Şalgam",
    category: "traditional", alcohol_pct: 0,
    carb_per_100ml: 2.5, sugar_per_100ml: 1.5,
    cal_per_100ml: 15, gi: 15, serving_ml: 300,
    diabetes_risk: "low", hypo_risk: false, source: "TürKomp",
    notes: "Very low sugar. Fermented. Excellent choice.",
  },
  "boza": {
    name: "Boza", name_tr: "Boza",
    category: "traditional", alcohol_pct: 1.0,
    carb_per_100ml: 13.0, sugar_per_100ml: 9.0,
    cal_per_100ml: 55, gi: 60, serving_ml: 250,
    diabetes_risk: "medium", hypo_risk: false, source: "TürKomp",
    notes: "Traditional fermented drink. Moderate sugar.",
  },
  "salep": {
    name: "Salep", name_tr: "Salep",
    category: "traditional", alcohol_pct: 0,
    carb_per_100ml: 20.0, sugar_per_100ml: 16.0,
    cal_per_100ml: 90, gi: 55, serving_ml: 250,
    diabetes_risk: "high", hypo_risk: false, source: "TürKomp",
    notes: "High sugar + milk. Winter drink — use moderation.",
  },
  "limonata": {
    name: "Limonata", name_tr: "Limonata",
    category: "traditional", alcohol_pct: 0,
    carb_per_100ml: 9.0, sugar_per_100ml: 8.5,
    cal_per_100ml: 35, gi: 50, serving_ml: 300,
    diabetes_risk: "medium", hypo_risk: false, source: "TürKomp",
  },

  // Kahve / Coffee
  "türk kahvesi": {
    name: "Turkish Coffee (plain)", name_tr: "Türk Kahvesi",
    category: "coffee", alcohol_pct: 0,
    carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 2, gi: 0, serving_ml: 60,
    diabetes_risk: "low", hypo_risk: false, source: "TürKomp",
    notes: "Plain — no sugar effect. May improve insulin sensitivity.",
  },
  "turkish coffee": {
    name: "Turkish Coffee", name_tr: "Türk Kahvesi",
    category: "coffee", alcohol_pct: 0,
    carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 2, gi: 0, serving_ml: 60,
    diabetes_risk: "low", hypo_risk: false, source: "General",
  },
  "espresso": {
    name: "Espresso", name_tr: "Espresso",
    category: "coffee", alcohol_pct: 0,
    carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 1, gi: 0, serving_ml: 30,
    diabetes_risk: "low", hypo_risk: false, source: "USDA",
  },
  "latte": {
    name: "Caffè Latte", name_tr: "Latte",
    category: "coffee", alcohol_pct: 0,
    carb_per_100ml: 5.0, sugar_per_100ml: 4.8,
    cal_per_100ml: 54, gi: 27, serving_ml: 350,
    diabetes_risk: "low", hypo_risk: false, source: "USDA",
    notes: "Milk adds carbs. Without sugar syrup — safe.",
  },
  "cappuccino": {
    name: "Cappuccino", name_tr: "Kapuçino",
    category: "coffee", alcohol_pct: 0,
    carb_per_100ml: 5.5, sugar_per_100ml: 5.0,
    cal_per_100ml: 60, gi: 27, serving_ml: 180,
    diabetes_risk: "low", hypo_risk: false, source: "USDA",
  },
  "frappuccino": {
    name: "Frappuccino", name_tr: "Frappuccino",
    category: "coffee", alcohol_pct: 0,
    carb_per_100ml: 18.0, sugar_per_100ml: 16.0,
    cal_per_100ml: 93, gi: 55, serving_ml: 350,
    diabetes_risk: "very_high", hypo_risk: false, source: "Starbucks",
    notes: "Blended + syrup = very high sugar. More dessert than coffee.",
  },

  // Çay / Tea
  "çay": {
    name: "Black Tea (plain)", name_tr: "Çay",
    category: "tea", alcohol_pct: 0,
    carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 1, gi: 0, serving_ml: 200,
    diabetes_risk: "low", hypo_risk: false, source: "USDA",
    notes: "Plain tea — excellent. May improve insulin sensitivity.",
  },
  "yeşil çay": {
    name: "Green Tea", name_tr: "Yeşil Çay",
    category: "tea", alcohol_pct: 0,
    carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 1, gi: 0, serving_ml: 200,
    diabetes_risk: "low", hypo_risk: false, source: "USDA",
    notes: "Antioxidants may help glucose metabolism.",
  },
  "green tea": {
    name: "Green Tea", name_tr: "Yeşil Çay",
    category: "tea", alcohol_pct: 0,
    carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 1, gi: 0, serving_ml: 200,
    diabetes_risk: "low", hypo_risk: false, source: "USDA",
  },
  "iced tea": {
    name: "Iced Tea (sweetened)", name_tr: "Buzlu Çay",
    category: "tea", alcohol_pct: 0,
    carb_per_100ml: 9.0, sugar_per_100ml: 8.5,
    cal_per_100ml: 34, gi: 55, serving_ml: 330,
    diabetes_risk: "medium", hypo_risk: false, source: "USDA",
    notes: "Store-bought iced tea has added sugar.",
  },
  "buzlu çay": {
    name: "Iced Tea", name_tr: "Buzlu Çay",
    category: "tea", alcohol_pct: 0,
    carb_per_100ml: 9.0, sugar_per_100ml: 8.5,
    cal_per_100ml: 34, gi: 55, serving_ml: 330,
    diabetes_risk: "medium", hypo_risk: false, source: "General",
  },

  // Su / Water
  "su": {
    name: "Water", name_tr: "Su",
    category: "water", alcohol_pct: 0,
    carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 0, gi: 0, serving_ml: 250,
    diabetes_risk: "low", hypo_risk: false, source: "General",
    notes: "Best choice. Helps glucose metabolism.",
  },
  "water": {
    name: "Water", name_tr: "Su",
    category: "water", alcohol_pct: 0,
    carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 0, gi: 0, serving_ml: 250,
    diabetes_risk: "low", hypo_risk: false, source: "General",
  },
  "maden suyu": {
    name: "Sparkling Water", name_tr: "Maden Suyu",
    category: "water", alcohol_pct: 0,
    carb_per_100ml: 0, sugar_per_100ml: 0,
    cal_per_100ml: 0, gi: 0, serving_ml: 250,
    diabetes_risk: "low", hypo_risk: false, source: "General",
  },
};

// ── Helper Functions ───────────────────────────────

export function lookupDrink(name: string): DrinkEntry | null {
  const lower = name.toLowerCase().trim();
  if (DRINK_DATABASE[lower]) return DRINK_DATABASE[lower];
  for (const [key, val] of Object.entries(DRINK_DATABASE)) {
    if (lower.includes(key) || key.includes(lower)) return val;
  }
  // Word-level
  const words = lower.split(/\s+/).filter(w => w.length > 3);
  for (const word of words) {
    for (const [key, val] of Object.entries(DRINK_DATABASE)) {
      if (key.includes(word)) return val;
    }
  }
  return null;
}

export function calculateDrinkGL(drink: DrinkEntry, servingMl?: number): number {
  const ml = servingMl || drink.serving_ml;
  const netCarb = (drink.carb_per_100ml * ml) / 100;
  return parseFloat(((drink.gi * netCarb) / 100).toFixed(1));
}

export function getDiabetesRiskLabel(risk: DrinkEntry["diabetes_risk"]): string {
  switch (risk) {
    case "low": return "✅ Safe";
    case "medium": return "⚠️ Moderate";
    case "high": return "🔴 High Risk";
    case "very_high": return "⛔ Very High Risk";
  }
}

export function getDrinksByCategory(category: DrinkCategory): Record<string, DrinkEntry> {
  return Object.fromEntries(
    Object.entries(DRINK_DATABASE).filter(([, v]) => v.category === category)
  );
}

// Safe drinks for diabetics
export const SAFE_DRINKS = [
  "su", "water", "maden suyu", "çay", "yeşil çay", "türk kahvesi",
  "espresso", "ayran", "şalgam", "soda", "cola zero",
];

// High risk drinks to avoid
export const HIGH_RISK_DRINKS = [
  "pina colada", "piña colada", "long island iced tea", "sangria",
  "frappuccino", "salep", "monster", "red bull", "midori",
  "kahlua", "kahlúa", "sweet wine", "tatlı şarap",
];
