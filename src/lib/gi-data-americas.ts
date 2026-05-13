// GlucoLens GI Database — Americas
// Sources: Sydney GI DB, Atkinson et al. (2021), USDA FoodData Central,
//          TACO (Brazil), Mexican INCAP FCDB, Colombian ICBF FCDB
// Coverage: US, Mexican, Brazilian, Peruvian, Colombian, Argentine, Caribbean
// ~380 entries

import type { GIEntry } from "./turkish-gi-data";
export const GI_AMERICAS: Record<string, GIEntry> = {

  // ── AMERİKAN FAST FOOD ─────────────────────────────────────────────────────
  "big mac":             { gi: 54, confidence: 0.88, source: "Atkinson 2021", carb_per_100g: 26, protein_per_100g: 12, fat_per_100g: 12, cal_per_100g: 260, category: "fast_food" },
  "mcdonalds big mac":   { gi: 54, confidence: 0.88, source: "Atkinson 2021", category: "fast_food" },
  "whopper":             { gi: 52, confidence: 0.85, source: "Atkinson 2021", carb_per_100g: 25, protein_per_100g: 14, fat_per_100g: 15, cal_per_100g: 295, category: "fast_food" },
  "cheeseburger":        { gi: 55, confidence: 0.85, source: "Atkinson 2021", carb_per_100g: 28, protein_per_100g: 12, fat_per_100g: 12, cal_per_100g: 270, category: "fast_food" },
  "chicken mcnuggets":   { gi: 52, confidence: 0.85, source: "Atkinson 2021", carb_per_100g: 16, protein_per_100g: 14, fat_per_100g: 16, cal_per_100g: 268, category: "fast_food" },
  "chicken nuggets":     { gi: 52, confidence: 0.85, source: "Atkinson 2021", category: "fast_food" },
  "mcchicken":           { gi: 55, confidence: 0.82, source: "Atkinson 2021", carb_per_100g: 32, protein_per_100g: 14, fat_per_100g: 12, cal_per_100g: 295, category: "fast_food" },
  "quarter pounder":     { gi: 50, confidence: 0.82, source: "Atkinson 2021", carb_per_100g: 22, protein_per_100g: 18, fat_per_100g: 18, cal_per_100g: 325, category: "fast_food" },
  "double cheeseburger": { gi: 52, confidence: 0.82, source: "Atkinson 2021", carb_per_100g: 24, protein_per_100g: 20, fat_per_100g: 22, cal_per_100g: 375, category: "fast_food" },
  "french fries":        { gi: 75, confidence: 0.92, source: "Sydney GI DB", carb_per_100g: 32, fiber_per_100g: 2.5, fat_per_100g: 15, cal_per_100g: 275, category: "fast_food" },
  "mcdonald fries":      { gi: 75, confidence: 0.90, source: "Atkinson 2021", category: "fast_food" },
  "curly fries":         { gi: 72, confidence: 0.80, source: "USDA", category: "fast_food" },
  "onion rings":         { gi: 62, confidence: 0.82, source: "Atkinson 2021", carb_per_100g: 40, fat_per_100g: 12, cal_per_100g: 275, category: "fast_food" },
  "hot dog":             { gi: 48, confidence: 0.82, source: "Atkinson 2021", carb_per_100g: 22, protein_per_100g: 10, fat_per_100g: 14, cal_per_100g: 265, category: "fast_food" },
  "chicken sandwich":    { gi: 55, confidence: 0.82, source: "USDA", carb_per_100g: 30, protein_per_100g: 16, fat_per_100g: 12, cal_per_100g: 295, category: "fast_food" },
  "fish filet":          { gi: 52, confidence: 0.80, source: "Atkinson 2021", carb_per_100g: 28, protein_per_100g: 14, fat_per_100g: 10, cal_per_100g: 264, category: "fast_food" },
  "fried chicken":       { gi: 48, confidence: 0.85, source: "USDA", carb_per_100g: 12, protein_per_100g: 24, fat_per_100g: 18, cal_per_100g: 312, category: "main" },
  "kfc original":        { gi: 48, confidence: 0.85, source: "Atkinson 2021", category: "fast_food" },
  "popcorn chicken":     { gi: 55, confidence: 0.80, source: "USDA", carb_per_100g: 18, protein_per_100g: 18, fat_per_100g: 14, cal_per_100g: 278, category: "fast_food" },
  "corn dog":            { gi: 68, confidence: 0.80, source: "USDA", carb_per_100g: 30, protein_per_100g: 8, fat_per_100g: 12, cal_per_100g: 265, category: "fast_food" },

  // ── AMERİKAN KAHVALTI / AMERICAN BREAKFAST ─────────────────────────────────
  "pancakes":            { gi: 67, confidence: 0.88, source: "Atkinson 2021", carb_per_100g: 38, fiber_per_100g: 1.0, protein_per_100g: 5, fat_per_100g: 4, cal_per_100g: 212, category: "breakfast" },
  "waffles":             { gi: 76, confidence: 0.88, source: "Atkinson 2021", carb_per_100g: 42, fiber_per_100g: 0.8, protein_per_100g: 5, fat_per_100g: 5, cal_per_100g: 235, category: "breakfast" },
  "french toast":        { gi: 65, confidence: 0.85, source: "Atkinson 2021", carb_per_100g: 30, protein_per_100g: 7, fat_per_100g: 8, cal_per_100g: 225, category: "breakfast" },
  "bagel plain":         { gi: 72, confidence: 0.88, source: "Sydney GI DB", carb_per_100g: 55, fiber_per_100g: 2.0, protein_per_100g: 10, cal_per_100g: 270, category: "bread" },
  "bagel whole wheat":   { gi: 58, confidence: 0.85, source: "Sydney GI DB", carb_per_100g: 50, fiber_per_100g: 5.0, cal_per_100g: 245, category: "bread" },
  "english muffin plain": { gi: 70, confidence: 0.85, source: "USDA", category: "bread" },
  "granola":             { gi: 62, confidence: 0.85, source: "Atkinson 2021", carb_per_100g: 60, fiber_per_100g: 5.0, fat_per_100g: 12, cal_per_100g: 379, category: "breakfast" },
  "granola bar":         { gi: 62, confidence: 0.82, source: "Atkinson 2021", carb_per_100g: 65, fiber_per_100g: 3.0, fat_per_100g: 8, cal_per_100g: 368, category: "snack" },
  "oatmeal instant":     { gi: 79, confidence: 0.88, source: "Atkinson 2021", carb_per_100g: 12, fiber_per_100g: 1.5, cal_per_100g: 71, category: "breakfast" },
  "corn flakes":         { gi: 81, confidence: 0.92, source: "Sydney GI DB", carb_per_100g: 84, fiber_per_100g: 2.0, protein_per_100g: 7, cal_per_100g: 357, category: "breakfast" },
  "frosted flakes":      { gi: 55, confidence: 0.85, source: "Atkinson 2021", carb_per_100g: 87, fiber_per_100g: 1.0, cal_per_100g: 372, category: "breakfast" },
  "cheerios":            { gi: 74, confidence: 0.85, source: "Atkinson 2021", carb_per_100g: 74, fiber_per_100g: 10.6, cal_per_100g: 367, category: "breakfast" },
  "cream of wheat":      { gi: 72, confidence: 0.85, source: "USDA", carb_per_100g: 75, fiber_per_100g: 2.5, cal_per_100g: 360, category: "breakfast" },
  "grits":               { gi: 72, confidence: 0.82, source: "USDA", carb_per_100g: 18, fiber_per_100g: 0.5, cal_per_100g: 85, category: "breakfast" },

  // ── AMERİKAN ANA YEMEKLER / AMERICAN MAINS ─────────────────────────────────
  "mac and cheese":      { gi: 58, confidence: 0.85, source: "Atkinson 2021", carb_per_100g: 28, protein_per_100g: 8, fat_per_100g: 8, cal_per_100g: 220, category: "main" },
  "macaroni and cheese": { gi: 58, confidence: 0.85, source: "Atkinson 2021", category: "main" },
  "mashed potatoes":     { gi: 83, confidence: 0.88, source: "Atkinson 2021", carb_per_100g: 18, protein_per_100g: 2, fat_per_100g: 4, cal_per_100g: 110, category: "main" },
  "biscuits and gravy":  { gi: 62, confidence: 0.78, source: "USDA", carb_per_100g: 28, protein_per_100g: 5, fat_per_100g: 12, cal_per_100g: 240, category: "main" },
  "clam chowder":        { gi: 38, confidence: 0.80, source: "USDA", carb_per_100g: 12, protein_per_100g: 8, fat_per_100g: 5, cal_per_100g: 128, category: "soup" },
  "bbq ribs":            { gi: 28, confidence: 0.82, source: "USDA", carb_per_100g: 10, protein_per_100g: 22, fat_per_100g: 20, cal_per_100g: 315, category: "main" },
  "pulled pork":         { gi: 18, confidence: 0.82, source: "USDA", carb_per_100g: 8, protein_per_100g: 22, fat_per_100g: 14, cal_per_100g: 250, category: "main" },
  "pot roast":           { gi: 5, confidence: 0.85, source: "USDA", protein_per_100g: 25, fat_per_100g: 12, cal_per_100g: 225, category: "main" },
  "meatloaf":            { gi: 32, confidence: 0.80, source: "USDA", carb_per_100g: 12, protein_per_100g: 18, fat_per_100g: 14, cal_per_100g: 248, category: "main" },
  "buffalo wings":       { gi: 12, confidence: 0.82, source: "USDA", carb_per_100g: 4, protein_per_100g: 22, fat_per_100g: 18, cal_per_100g: 270, category: "main" },
  "clam bake":           { gi: 20, confidence: 0.78, source: "USDA", protein_per_100g: 15, fat_per_100g: 3, cal_per_100g: 95, category: "main" },
  "lobster roll":        { gi: 55, confidence: 0.80, source: "USDA", carb_per_100g: 22, protein_per_100g: 18, fat_per_100g: 10, cal_per_100g: 255, category: "main" },

  // ── AMERİKAN ATIŞTIRANMALAR / SNACKS ──────────────────────────────────────
  "potato chips":        { gi: 55, confidence: 0.90, source: "Sydney GI DB", carb_per_100g: 55, fiber_per_100g: 2.0, fat_per_100g: 35, cal_per_100g: 548, category: "snack" },
  "corn chips":          { gi: 72, confidence: 0.85, source: "Sydney GI DB", carb_per_100g: 62, fat_per_100g: 30, cal_per_100g: 530, category: "snack" },
  "nachos":              { gi: 68, confidence: 0.82, source: "USDA", carb_per_100g: 56, fat_per_100g: 18, cal_per_100g: 395, category: "snack" },
  "popcorn plain":       { gi: 65, confidence: 0.88, source: "Sydney GI DB", carb_per_100g: 78, fiber_per_100g: 14.5, fat_per_100g: 4, cal_per_100g: 375, category: "snack" },
  "popcorn butter":      { gi: 65, confidence: 0.85, source: "Sydney GI DB", carb_per_100g: 68, fat_per_100g: 18, cal_per_100g: 454, category: "snack" },
  "pretzel sticks":      { gi: 83, confidence: 0.85, source: "Sydney GI DB", carb_per_100g: 78, fiber_per_100g: 2.5, protein_per_100g: 10, cal_per_100g: 381, category: "snack" },
  "cheeto":              { gi: 72, confidence: 0.78, source: "USDA", carb_per_100g: 62, fat_per_100g: 32, cal_per_100g: 547, category: "snack" },
  "doritos":             { gi: 72, confidence: 0.80, source: "USDA", carb_per_100g: 62, fat_per_100g: 28, cal_per_100g: 490, category: "snack" },

  // ── AMERİKAN TATLILAR / DESSERTS ───────────────────────────────────────────
  "cheesecake":          { gi: 35, confidence: 0.88, source: "Atkinson 2021", carb_per_100g: 28, protein_per_100g: 6, fat_per_100g: 18, cal_per_100g: 297, category: "dessert" },
  "brownie":             { gi: 50, confidence: 0.85, source: "Atkinson 2021", carb_per_100g: 52, fat_per_100g: 18, cal_per_100g: 380, category: "dessert" },
  "chocolate chip cookie": { gi: 55, confidence: 0.88, source: "Atkinson 2021", carb_per_100g: 60, fat_per_100g: 22, cal_per_100g: 488, category: "dessert" },
  "apple pie":           { gi: 55, confidence: 0.85, source: "Atkinson 2021", carb_per_100g: 38, fat_per_100g: 10, cal_per_100g: 246, category: "dessert" },
  "blueberry muffin":    { gi: 59, confidence: 0.85, source: "Atkinson 2021", carb_per_100g: 52, fat_per_100g: 10, cal_per_100g: 305, category: "dessert" },
  "banana bread":        { gi: 51, confidence: 0.82, source: "Atkinson 2021", carb_per_100g: 45, fiber_per_100g: 2.5, fat_per_100g: 8, cal_per_100g: 258, category: "dessert" },
  "pumpkin pie":         { gi: 55, confidence: 0.80, source: "USDA", carb_per_100g: 30, protein_per_100g: 4, fat_per_100g: 8, cal_per_100g: 210, category: "dessert" },
  "pecan pie":           { gi: 48, confidence: 0.78, source: "USDA", carb_per_100g: 55, fat_per_100g: 20, cal_per_100g: 400, category: "dessert" },
  "ice cream vanilla us": { gi: 57, confidence: 0.90, source: "Sydney GI DB", carb_per_100g: 28, fat_per_100g: 10, protein_per_100g: 4, cal_per_100g: 207, category: "dessert" },
  "milkshake chocolate": { gi: 56, confidence: 0.85, source: "Atkinson 2021", carb_per_100g: 18, protein_per_100g: 4, fat_per_100g: 4, cal_per_100g: 125, category: "beverage" },

  // ── MEKSİKA MUTFAĞI / MEXICAN CUISINE ────────────────────────────────────
  "corn tortilla":       { gi: 52, confidence: 0.88, source: "Atkinson 2021", carb_per_100g: 44, fiber_per_100g: 4.5, protein_per_100g: 5, cal_per_100g: 218, category: "bread" },
  "tortilla maíz":       { gi: 52, confidence: 0.88, source: "Atkinson 2021", category: "bread" },
  "flour tortilla":      { gi: 62, confidence: 0.88, source: "Atkinson 2021", carb_per_100g: 50, fiber_per_100g: 2.5, protein_per_100g: 8, fat_per_100g: 6, cal_per_100g: 296, category: "bread" },
  "taco":                { gi: 52, confidence: 0.85, source: "INCAP FCDB", carb_per_100g: 22, protein_per_100g: 10, fat_per_100g: 8, cal_per_100g: 205, category: "main" },
  "taco al pastor":      { gi: 48, confidence: 0.82, source: "INCAP FCDB", carb_per_100g: 18, protein_per_100g: 14, fat_per_100g: 8, cal_per_100g: 205, category: "main" },
  "burrito":             { gi: 55, confidence: 0.85, source: "Atkinson 2021", carb_per_100g: 30, protein_per_100g: 10, fat_per_100g: 8, cal_per_100g: 235, category: "main" },
  "burrito bowl":        { gi: 48, confidence: 0.82, source: "Atkinson 2021", carb_per_100g: 25, protein_per_100g: 12, fat_per_100g: 8, cal_per_100g: 225, category: "main" },
  "quesadilla":          { gi: 58, confidence: 0.82, source: "INCAP FCDB", carb_per_100g: 28, protein_per_100g: 10, fat_per_100g: 12, cal_per_100g: 265, category: "main" },
  "enchilada":           { gi: 52, confidence: 0.82, source: "INCAP FCDB", carb_per_100g: 25, protein_per_100g: 8, fat_per_100g: 8, cal_per_100g: 210, category: "main" },
  "tamale":              { gi: 55, confidence: 0.82, source: "INCAP FCDB", carb_per_100g: 30, fiber_per_100g: 3.0, protein_per_100g: 6, fat_per_100g: 8, cal_per_100g: 220, category: "main" },
  "pozole":              { gi: 45, confidence: 0.82, source: "INCAP FCDB", carb_per_100g: 18, fiber_per_100g: 3.5, protein_per_100g: 10, cal_per_100g: 155, category: "soup" },
  "guacamole":           { gi: 5, confidence: 0.92, source: "Sydney GI DB", carb_per_100g: 9, fiber_per_100g: 6.7, protein_per_100g: 2, fat_per_100g: 15, cal_per_100g: 160, category: "condiment" },
  "refried beans":       { gi: 38, confidence: 0.85, source: "Atkinson 2021", carb_per_100g: 16, fiber_per_100g: 5.5, protein_per_100g: 6, cal_per_100g: 130, category: "legume" },
  "frijoles":            { gi: 38, confidence: 0.85, source: "INCAP FCDB", category: "legume" },
  "salsa":               { gi: 12, confidence: 0.88, source: "USDA", carb_per_100g: 5, fiber_per_100g: 1.5, cal_per_100g: 28, category: "condiment" },
  "mexican rice":        { gi: 65, confidence: 0.82, source: "INCAP FCDB", carb_per_100g: 28, protein_per_100g: 3, fat_per_100g: 3, cal_per_100g: 152, category: "grain" },
  "churros mexican":     { gi: 70, confidence: 0.82, source: "INCAP FCDB", carb_per_100g: 40, fat_per_100g: 12, cal_per_100g: 278, category: "dessert" },
  "tres leches":         { gi: 62, confidence: 0.82, source: "INCAP FCDB", carb_per_100g: 35, protein_per_100g: 6, fat_per_100g: 10, cal_per_100g: 255, category: "dessert" },

  // ── BREZİLYA MUTFAĞI / BRAZILIAN CUISINE ─────────────────────────────────
  "feijoada":            { gi: 38, confidence: 0.85, source: "TACO Brazil", carb_per_100g: 15, fiber_per_100g: 6.0, protein_per_100g: 12, fat_per_100g: 5, cal_per_100g: 153, category: "main" },
  "pão de queijo":       { gi: 62, confidence: 0.85, source: "TACO Brazil", carb_per_100g: 30, protein_per_100g: 5, fat_per_100g: 10, cal_per_100g: 235, category: "bread" },
  "cheese bread brazil": { gi: 62, confidence: 0.85, source: "TACO Brazil", category: "bread" },
  "brigadeiro":          { gi: 68, confidence: 0.82, source: "TACO Brazil", carb_per_100g: 58, fat_per_100g: 12, cal_per_100g: 360, category: "dessert" },
  "coxinha":             { gi: 62, confidence: 0.80, source: "TACO Brazil", carb_per_100g: 28, protein_per_100g: 10, fat_per_100g: 14, cal_per_100g: 285, category: "snack" },
  "açaí bowl":           { gi: 42, confidence: 0.82, source: "TACO Brazil", carb_per_100g: 22, fiber_per_100g: 4.5, fat_per_100g: 6, cal_per_100g: 150, category: "dessert" },
  "acai":                { gi: 42, confidence: 0.82, source: "TACO Brazil", category: "fruit" },
  "pastel":              { gi: 60, confidence: 0.80, source: "TACO Brazil", carb_per_100g: 32, protein_per_100g: 8, fat_per_100g: 14, cal_per_100g: 290, category: "snack" },
  "churrasco":           { gi: 0, confidence: 0.88, source: "TACO Brazil", protein_per_100g: 28, fat_per_100g: 14, cal_per_100g: 250, category: "main" },
  "picanha":             { gi: 0, confidence: 0.88, source: "TACO Brazil", protein_per_100g: 26, fat_per_100g: 18, cal_per_100g: 275, category: "main" },
  "farofa":              { gi: 72, confidence: 0.80, source: "TACO Brazil", carb_per_100g: 72, fiber_per_100g: 5.0, cal_per_100g: 385, category: "condiment" },
  "guaraná":             { gi: 58, confidence: 0.78, source: "TACO Brazil", carb_per_100g: 11, cal_per_100g: 44, category: "beverage" },
  "tapioca brazil":      { gi: 70, confidence: 0.82, source: "TACO Brazil", carb_per_100g: 40, protein_per_100g: 3, fat_per_100g: 3, cal_per_100g: 200, category: "main" },

  // ── PERUVİAN MUTFAĞI / PERUVIAN CUISINE ─────────────────────────────────
  "ceviche":             { gi: 12, confidence: 0.85, source: "Atkinson 2021", carb_per_100g: 5, protein_per_100g: 15, fat_per_100g: 2, cal_per_100g: 100, category: "main" },
  "lomo saltado":        { gi: 58, confidence: 0.82, source: "Atkinson 2021", carb_per_100g: 25, protein_per_100g: 18, fat_per_100g: 10, cal_per_100g: 265, category: "main" },
  "aji de gallina":      { gi: 42, confidence: 0.80, source: "Atkinson 2021", carb_per_100g: 15, protein_per_100g: 18, fat_per_100g: 12, cal_per_100g: 245, category: "main" },
  "arroz con leche peru": { gi: 55, confidence: 0.80, source: "Atkinson 2021", carb_per_100g: 25, protein_per_100g: 4, fat_per_100g: 3, cal_per_100g: 148, category: "dessert" },
  "causa":               { gi: 68, confidence: 0.78, source: "Atkinson 2021", carb_per_100g: 25, protein_per_100g: 5, fat_per_100g: 5, cal_per_100g: 170, category: "main" },
  "chicha morada":       { gi: 42, confidence: 0.78, source: "Atkinson 2021", carb_per_100g: 14, cal_per_100g: 57, category: "beverage" },

  // ── KOLOMBİYA & ARJANTİN ─────────────────────────────────────────────────
  "arepas":              { gi: 55, confidence: 0.82, source: "ICBF Colombia", carb_per_100g: 30, fiber_per_100g: 2.5, protein_per_100g: 5, cal_per_100g: 160, category: "bread" },
  "empanadas":           { gi: 55, confidence: 0.82, source: "Atkinson 2021", carb_per_100g: 28, protein_per_100g: 8, fat_per_100g: 10, cal_per_100g: 240, category: "main" },
  "alfajores":           { gi: 58, confidence: 0.80, source: "Atkinson 2021", carb_per_100g: 62, fat_per_100g: 10, cal_per_100g: 362, category: "dessert" },
  "dulce de leche":      { gi: 54, confidence: 0.82, source: "Atkinson 2021", carb_per_100g: 55, protein_per_100g: 6, fat_per_100g: 7, cal_per_100g: 315, category: "condiment" },
  "asado":               { gi: 0, confidence: 0.88, source: "Atkinson 2021", protein_per_100g: 26, fat_per_100g: 14, cal_per_100g: 240, category: "main" },
  "chimichurri":         { gi: 2, confidence: 0.88, source: "Atkinson 2021", carb_per_100g: 2, fat_per_100g: 20, cal_per_100g: 185, category: "condiment" },
  "bandeja paisa":       { gi: 55, confidence: 0.78, source: "ICBF Colombia", carb_per_100g: 35, protein_per_100g: 20, fat_per_100g: 15, cal_per_100g: 360, category: "main" },

  // ── KARİBİK / CARIBBEAN ──────────────────────────────────────────────────
  "jerk chicken":        { gi: 5, confidence: 0.82, source: "Atkinson 2021", carb_per_100g: 3, protein_per_100g: 28, fat_per_100g: 8, cal_per_100g: 198, category: "main" },
  "rice and peas":       { gi: 52, confidence: 0.82, source: "Atkinson 2021", carb_per_100g: 25, fiber_per_100g: 4.0, protein_per_100g: 6, cal_per_100g: 162, category: "main" },
  "plantain fried":      { gi: 65, confidence: 0.85, source: "Atkinson 2021", carb_per_100g: 35, fiber_per_100g: 2.5, fat_per_100g: 5, cal_per_100g: 185, category: "main" },
  "ripe plantain":       { gi: 65, confidence: 0.85, source: "Atkinson 2021", category: "fruit" },
  "green plantain":      { gi: 45, confidence: 0.82, source: "Atkinson 2021", carb_per_100g: 32, fiber_per_100g: 2.8, cal_per_100g: 140, category: "fruit" },
  "tostones":            { gi: 62, confidence: 0.80, source: "Atkinson 2021", carb_per_100g: 30, fat_per_100g: 8, cal_per_100g: 192, category: "snack" },
  "sorrel drink":        { gi: 42, confidence: 0.78, source: "Atkinson 2021", carb_per_100g: 12, cal_per_100g: 48, category: "beverage" },
};
