# Fruit & Vegetable Classification System - Database and Metadata

PRODUCE_METADATA = {
    "apple": {
        "name": "Apple",
        "scientific_name": "Malus domestica",
        "nutrition": {
            "calories": "52 kcal",
            "carbs": "13.8 g",
            "protein": "0.3 g",
            "fiber": "2.4 g",
            "vitamin_c": "14% DV",
            "potassium": "107 mg"
        },
        "shelf_life": {
            "fresh": 14,       # Days remaining
            "semi-fresh": 5,
            "rotten": 0
        },
        "storage_tips": "Apples release ethylene gas, which speeds up ripening in other produce. Store them in a perforated plastic bag in the refrigerator crisper drawer, away from other fruits.",
        "recipes": {
            "ripe": "Enjoy fresh as a snack, slice into green salads, or bake with cinnamon.",
            "semi-fresh": "Perfect for making homemade applesauce, apple pie, apple cider, or baking into apple chips."
        },
        "actions": {
            "fresh": "Grade A/B. Suitable for direct retail sale, eating raw, or long-term cold storage.",
            "semi-fresh": "Use within 3-5 days. Best for cooking, baking, or juice processing.",
            "rotten": "DO NOT CONSUME. Discard or compost. Quarantine immediately to prevent ethylene and mold from spreading to nearby apples."
        }
    },
    "banana": {
        "name": "Banana",
        "scientific_name": "Musa acuminata",
        "nutrition": {
            "calories": "89 kcal",
            "carbs": "22.8 g",
            "protein": "1.1 g",
            "fiber": "2.6 g",
            "vitamin_c": "15% DV",
            "potassium": "358 mg"
        },
        "shelf_life": {
            "fresh": 7,
            "semi-fresh": 3,
            "rotten": 0
        },
        "storage_tips": "Keep bananas at room temperature. Wrap the stems in plastic wrap to slow down ethylene release. Keep away from other fruits unless you want to ripen them quickly.",
        "recipes": {
            "ripe": "Eat fresh, blend into smoothies, or slice onto cereal/oatmeal.",
            "semi-fresh": "Ideal for banana bread, banana pancakes, muffins, or freezing for vegan ice cream (nice cream)."
        },
        "actions": {
            "fresh": "Excellent grade. Retail-ready. Store at room temp away from direct sunlight.",
            "semi-fresh": "Peel and freeze for smoothies, or use in baking immediately.",
            "rotten": "Discard. Rotten bananas attract fruit flies quickly and can turn mushy/leak. Clean the storage area."
        }
    },
    "tomato": {
        "name": "Tomato",
        "scientific_name": "Solanum lycopersicum",
        "nutrition": {
            "calories": "18 kcal",
            "carbs": "3.9 g",
            "protein": "0.9 g",
            "fiber": "1.2 g",
            "vitamin_c": "21% DV",
            "potassium": "237 mg"
        },
        "shelf_life": {
            "fresh": 10,
            "semi-fresh": 3,
            "rotten": 0
        },
        "storage_tips": "Store tomatoes stem-side down at room temperature to preserve flavor. Avoid refrigerating unripe tomatoes, as cold temperatures degrade their texture and flavor compounds.",
        "recipes": {
            "ripe": "Slice for sandwiches, chop into fresh salsas, or toss in caprese salads.",
            "semi-fresh": "Perfect for roasting, slow-cooking into tomato paste, marinara sauce, or blending into hot tomato soup."
        },
        "actions": {
            "fresh": "Grade A. Suitable for raw consumption and salads. Store in a cool dry area.",
            "semi-fresh": "Cook immediately. Puree or freeze if not using within 24 hours.",
            "rotten": "Discard immediately. Rotten tomatoes mold rapidly and can contaminate the entire batch. Wash storage bin with soap and water."
        }
    },
    "orange": {
        "name": "Orange",
        "scientific_name": "Citrus sinensis",
        "nutrition": {
            "calories": "47 kcal",
            "carbs": "11.8 g",
            "protein": "0.9 g",
            "fiber": "2.4 g",
            "vitamin_c": "88% DV",
            "potassium": "181 mg"
        },
        "shelf_life": {
            "fresh": 21,
            "semi-fresh": 7,
            "rotten": 0
        },
        "storage_tips": "Oranges store well at room temperature for a week, but can last up to a month in the refrigerator. Ensure they stay dry to prevent mold growth.",
        "recipes": {
            "ripe": "Peel and eat fresh, squeeze into orange juice, or zest for baking.",
            "semi-fresh": "Ideal for making orange marmalade, candied orange peels, or citrus glaze for meats."
        },
        "actions": {
            "fresh": "Premium citrus grade. Store in a ventilated bag in the fridge crisper.",
            "semi-fresh": "Extract juice immediately and freeze, or make zest/marmalade.",
            "rotten": "Discard immediately. Blue/green citrus mold spreads extremely fast via airborne spores. Wipe down the entire bin."
        }
    },
    "potato": {
        "name": "Potato",
        "scientific_name": "Solanum tuberosum",
        "nutrition": {
            "calories": "77 kcal",
            "carbs": "17.5 g",
            "protein": "2.0 g",
            "fiber": "2.2 g",
            "vitamin_c": "22% DV",
            "potassium": "421 mg"
        },
        "shelf_life": {
            "fresh": 30,
            "semi-fresh": 10,
            "rotten": 0
        },
        "storage_tips": "Store potatoes in a dark, cool, and well-ventilated space (like a paper bag in a pantry). Never store them near onions, as onions release moisture and gases that make potatoes sprout faster.",
        "recipes": {
            "ripe": "Great for french fries, mashed potatoes, baked potato sides, or gnocchi.",
            "semi-fresh": "Excellent for thick potato soups, stews, hashbrowns, or boiling to make potato salads."
        },
        "actions": {
            "fresh": "Grade A root vegetable. Keep in dry, dark pantry storage.",
            "semi-fresh": "Cut off any minor sprouts or green spots. Cook soon. Do not eat if heavily greened (contains toxic solanine).",
            "rotten": "Discard. Rotten potatoes develop an extremely foul odor and leak liquid. Clean containment immediately."
        }
    },
    "onion": {
        "name": "Onion",
        "scientific_name": "Allium cepa",
        "nutrition": {
            "calories": "40 kcal",
            "carbs": "9.3 g",
            "protein": "1.1 g",
            "fiber": "1.7 g",
            "vitamin_c": "12% DV",
            "potassium": "146 mg"
        },
        "shelf_life": {
            "fresh": 45,
            "semi-fresh": 14,
            "rotten": 0
        },
        "storage_tips": "Keep onions in a cool, dark, dry, and well-ventilated area. Wire baskets or mesh bags are ideal. Do not store in plastic bags or near potatoes.",
        "recipes": {
            "ripe": "Use raw in salads, saute as a base for sauces/curries, or pickle them.",
            "semi-fresh": "Caramelize slowly for French onion soup, onion jam, or batter and fry as onion rings."
        },
        "actions": {
            "fresh": "Store in mesh bags in a cool, dark, dry cellar or pantry.",
            "semi-fresh": "Peel outer soft layers, chop up and freeze for future cooking bases.",
            "rotten": "Discard. Check for black mold (Aspergillus niger). Wash hands thoroughly after handling."
        }
    },
    "carrot": {
        "name": "Carrot",
        "scientific_name": "Daucus carota",
        "nutrition": {
            "calories": "41 kcal",
            "carbs": "9.6 g",
            "protein": "0.9 g",
            "fiber": "2.8 g",
            "vitamin_c": "9% DV",
            "potassium": "320 mg"
        },
        "shelf_life": {
            "fresh": 21,
            "semi-fresh": 7,
            "rotten": 0
        },
        "storage_tips": "Cut off green tops (which draw moisture out). Store carrots in a sealed container submerged in water in the fridge, changing the water every few days, to keep them crisp.",
        "recipes": {
            "ripe": "Eat raw with hummus, slice into stir-fries, or roast with honey.",
            "semi-fresh": "Blend into carrot soups, bake carrot cakes, or add to slow-cooked stews and stocks."
        },
        "actions": {
            "fresh": "Store in the fridge. Keep dry or submerged in fresh water for crispness.",
            "semi-fresh": "Limber or soft carrots can be revived by soaking in ice water for 30 minutes before cooking.",
            "rotten": "Discard. Soft rot turns carrots mushy and slimy. Clean surrounding storage."
        }
    },
    "lemon": {
        "name": "Lemon",
        "scientific_name": "Citrus limon",
        "nutrition": {
            "calories": "29 kcal",
            "carbs": "9.3 g",
            "protein": "1.1 g",
            "fiber": "2.8 g",
            "vitamin_c": "88% DV",
            "potassium": "138 mg"
        },
        "shelf_life": {
            "fresh": 14,
            "semi-fresh": 5,
            "rotten": 0
        },
        "storage_tips": "Lemons keep well at room temperature for a week, but last up to a month if sealed in a zip-top bag in the refrigerator.",
        "recipes": {
            "ripe": "Squeeze for fresh lemonade, use juice in salad dressings, or make lemon curd.",
            "semi-fresh": "Preserve in salt (Moroccan style), extract and freeze juice in ice-cube trays, or bake lemon bars."
        },
        "actions": {
            "fresh": "Store in fridge. Keep dry to prevent surface molds.",
            "semi-fresh": "Juice and freeze. Zest can be dried or frozen.",
            "rotten": "Discard. Spreads mold quickly. Sanitize surrounding storage."
        }
    }
}

DISEASE_DATABASE = {
    "apple_scab": {
        "name": "Apple Scab",
        "pathogen": "Venturia inaequalis (Fungus)",
        "severity": "Moderate",
        "description": "Characterized by olive-green to black velvety spots on leaves and fruit. Affected fruit becomes deformed and cracked as it grows.",
        "prevention": "Prune trees to improve airflow, rake and destroy fallen leaves in autumn, and apply organic fungicides in early spring.",
        "disposal": "Fruit is safe to eat if scabs are peeled off. For commercial stock: Grade C. Quarantine infected batches, compost leaves, but do not compost infected fruit as spores survive."
    },
    "tomato_blight": {
        "name": "Tomato Blight (Early/Late)",
        "pathogen": "Alternaria solani / Phytophthora infestans (Oomycete)",
        "severity": "High",
        "description": "Causes dark, concentric target-like spots on leaves and leathery, dark brown spots on the tomato fruit itself. Spreads rapidly in wet, humid conditions.",
        "prevention": "Water plants at the base (avoid wet leaves), space plants properly, rotate crops yearly, and spray copper fungicides.",
        "disposal": "DO NOT EAT heavily blighted tomatoes as the rot spoils flavor and quality. Quarantine immediately. Burn or bury infected plant material; do not compost."
    },
    "banana_sigatoka": {
        "name": "Black Sigatoka",
        "pathogen": "Pseudocercospora fijiensis (Fungus)",
        "severity": "High",
        "description": "Causes dark streaks on leaves, reducing photosynthesis. The bananas mature prematurely and are undersized, often with uneven ripening and rind blemishes.",
        "prevention": "De-leafing infected plants, maintaining proper drainage, and applying protective fungicides.",
        "disposal": "Fruit itself is safe but quality is poor. Separate from healthy batches. Peel and use immediately for processed foods or animal feed."
    },
    "citrus_canker": {
        "name": "Citrus Canker",
        "pathogen": "Xanthomonas citri (Bacteria)",
        "severity": "High (Quarantine Concern)",
        "description": "Produces raised, brown, corky lesions with oily, water-soaked margins and yellow halos on leaves, stems, and orange peels.",
        "prevention": "Plant resistant citrus varieties, spray windbreaks, and apply copper bactericides. Clean tools between trees.",
        "disposal": "Fruit is edible but unmarketable. Commercial fruit must be quarantined and destroyed according to local agricultural regulations to prevent spreading."
    },
    "potato_early_blight": {
        "name": "Potato Early Blight",
        "pathogen": "Alternaria solani (Fungus)",
        "severity": "Moderate",
        "description": "Causes dark, sunken, circular lesions on tubers. The flesh underneath becomes brown, dry, and leathery.",
        "prevention": "Ensure balanced soil nutrition, avoid overhead irrigation, harvest only in dry weather, and rotate crops.",
        "disposal": "Cut away infected flesh before cooking. Do not use for seed potatoes. Store affected tubers separately and consume them quickly."
    }
}
