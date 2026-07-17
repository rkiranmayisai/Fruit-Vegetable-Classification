// AGROSCAN - API Client Module with Client-side Offline Fallbacks

const IS_GITHUB_PAGES = window.location.hostname.includes("github.io");
const IS_FILE_PROTOCOL = window.location.protocol === "file:";
const API_BASE = (IS_GITHUB_PAGES || IS_FILE_PROTOCOL) ? "" : window.location.origin;

// Helper to resolve samples path dynamically
const getSamplesPrefix = () => {
    if (IS_GITHUB_PAGES) {
        return window.location.pathname.includes("/frontend/") ? "../samples" : "samples";
    }
    if (IS_FILE_PROTOCOL) {
        return "samples";
    }
    return "samples";
};

// Embedded metadata and classification databases
const PRODUCE_METADATA = {
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
        "shelf_life": { "fresh": 14, "semi-fresh": 5, "rotten": 0 },
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
        "shelf_life": { "fresh": 7, "semi-fresh": 3, "rotten": 0 },
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
        "shelf_life": { "fresh": 10, "semi-fresh": 3, "rotten": 0 },
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
        "shelf_life": { "fresh": 21, "semi-fresh": 7, "rotten": 0 },
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
        "shelf_life": { "fresh": 14, "semi-fresh": 5, "rotten": 0 },
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
};

const MOCK_SAMPLES = {
    "fresh_apple.jpg": [
        {
            "id": "obj_apple_1",
            "box": [0.15, 0.2, 0.85, 0.8],
            "label": "Apple",
            "class_key": "apple",
            "confidence": 0.98,
            "freshness": "fresh",
            "freshness_confidence": 0.96,
            "ripeness": "ripe",
            "grade": "Grade A",
            "grade_reason": "Excellent size, rich red uniform color, circular shape, zero surface defects.",
            "weight_est": "182g",
            "disease": null,
            "spots_ratio": 0.0
        }
    ],
    "spotted_banana.jpg": [
        {
            "id": "obj_banana_1",
            "box": [0.25, 0.1, 0.75, 0.9],
            "label": "Banana",
            "class_key": "banana",
            "confidence": 0.94,
            "freshness": "semi-fresh",
            "freshness_confidence": 0.89,
            "ripeness": "overripe",
            "grade": "Grade B",
            "grade_reason": "Standard size, brown sugar spots forming (senescent spotting), good flesh firmness.",
            "weight_est": "145g",
            "disease": null,
            "spots_ratio": 4.5
        }
    ],
    "diseased_tomato.jpg": [
        {
            "id": "obj_tomato_1",
            "box": [0.2, 0.2, 0.8, 0.8],
            "label": "Tomato",
            "class_key": "tomato",
            "confidence": 0.91,
            "freshness": "semi-fresh",
            "freshness_confidence": 0.85,
            "ripeness": "ripe",
            "grade": "Grade C",
            "grade_reason": "Visible target-pattern black lesions on skin, uneven surface curvature.",
            "weight_est": "130g",
            "disease": {
                "key": "tomato_blight",
                "name": "Tomato Blight",
                "severity": "High",
                "description": "Sunken leathery dark brown spots with concentric ring boundaries.",
                "prevention": "Water at the soil level, space plants for ventilation, spray copper fungicide.",
                "disposal": "Discard immediately. Do not consume blighted tomatoes as flavor is spoiled."
            },
            "spots_ratio": 12.8
        }
    ],
    "mixed_produce.jpg": [
        {
            "id": "obj_mixed_1",
            "box": [0.15, 0.1, 0.6, 0.55],
            "label": "Apple",
            "class_key": "apple",
            "confidence": 0.95,
            "freshness": "fresh",
            "freshness_confidence": 0.94,
            "ripeness": "ripe",
            "grade": "Grade A",
            "grade_reason": "Vibrant color, no spots, uniform round shape.",
            "weight_est": "175g",
            "disease": null,
            "spots_ratio": 0.2
        },
        {
            "id": "obj_mixed_2",
            "box": [0.35, 0.45, 0.85, 0.9],
            "label": "Orange",
            "class_key": "orange",
            "confidence": 0.96,
            "freshness": "fresh",
            "freshness_confidence": 0.95,
            "ripeness": "ripe",
            "grade": "Grade A",
            "grade_reason": "Uniform spherical shape, healthy dimpled orange rind.",
            "weight_est": "210g",
            "disease": null,
            "spots_ratio": 0.0
        },
        {
            "id": "obj_mixed_3",
            "box": [0.1, 0.6, 0.4, 0.95],
            "label": "Lemon",
            "class_key": "lemon",
            "confidence": 0.89,
            "freshness": "semi-fresh",
            "freshness_confidence": 0.82,
            "ripeness": "ripe",
            "grade": "Grade B",
            "grade_reason": "Elongated citrus profile, slight green tint near stem.",
            "weight_est": "95g",
            "disease": null,
            "spots_ratio": 0.8
        }
    ]
};

const API = {
    /**
     * Fetch the list of available demo sample images
     */
    async getSamples() {
        if (IS_GITHUB_PAGES || IS_FILE_PROTOCOL) {
            const titles = {
                "fresh_apple.jpg": "Fresh Red Apple (Grade A)",
                "spotted_banana.jpg": "Spotted Banana (Grade B - Semi-Fresh/Overripe)",
                "diseased_tomato.jpg": "Tomato with Blight Disease (Grade C)",
                "mixed_produce.jpg": "Mixed Produce Plate (Multi-Object Detection)"
            };
            return Object.keys(MOCK_SAMPLES).map(f => ({
                "filename": f,
                "title": titles[f] || f,
                "url": `${getSamplesPrefix()}/${f}`
            }));
        }

        try {
            const response = await fetch(`${API_BASE}/api/samples`);
            if (!response.ok) throw new Error("Failed to load samples");
            return await response.json();
        } catch (error) {
            console.warn("Backend offline, using client fallback for getSamples");
            const titles = {
                "fresh_apple.jpg": "Fresh Red Apple (Grade A)",
                "spotted_banana.jpg": "Spotted Banana (Grade B - Semi-Fresh/Overripe)",
                "diseased_tomato.jpg": "Tomato with Blight Disease (Grade C)",
                "mixed_produce.jpg": "Mixed Produce Plate (Multi-Object Detection)"
            };
            return Object.keys(MOCK_SAMPLES).map(f => ({
                "filename": f,
                "title": titles[f] || f,
                "url": `${getSamplesPrefix()}/${f}`
            }));
        }
    },

    /**
     * Send an image file to the backend for OpenCV classification analysis
     */
    async analyzeFile(file) {
        if (IS_GITHUB_PAGES || IS_FILE_PROTOCOL) {
            return this.analyzeBase64("", file.name);
        }

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch(`${API_BASE}/api/analyze`, {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Image analysis failed");
            }
            return await response.json();
        } catch (error) {
            console.warn("Backend offline, using client fallback for analyzeFile");
            return this.analyzeBase64("", file.name);
        }
    },

    /**
     * Send a base64 encoded image string (e.g. from camera) to the backend
     */
    async analyzeBase64(base64Data, filename = "webcam_capture.jpg") {
        if (IS_GITHUB_PAGES || IS_FILE_PROTOCOL || !base64Data) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    let results;
                    if (filename && MOCK_SAMPLES[filename]) {
                        results = MOCK_SAMPLES[filename];
                    } else {
                        // Generate random but realistic mock predictions for user custom uploads/webcam
                        const keys = Object.keys(PRODUCE_METADATA);
                        const classKey = keys[Math.floor(Math.random() * keys.length)];
                        const meta = PRODUCE_METADATA[classKey];
                        const confidence = parseFloat((0.85 + Math.random() * 0.12).toFixed(2));
                        const spots_ratio = parseFloat((Math.random() * 5).toFixed(1));
                        
                        let freshness = "fresh";
                        let freshness_conf = 0.95;
                        if (spots_ratio > 3) {
                            freshness = "semi-fresh";
                            freshness_conf = 0.82;
                        }
                        
                        results = [{
                            "id": "obj_" + classKey + "_1",
                            "box": [0.2, 0.2, 0.8, 0.8],
                            "label": meta.name,
                            "class_key": classKey,
                            "confidence": confidence,
                            "freshness": freshness,
                            "freshness_confidence": freshness_conf,
                            "ripeness": "ripe",
                            "grade": "Grade A",
                            "grade_reason": "Good color saturation, typical rounded geometry, negligible minor spots.",
                            "weight_est": "160g",
                            "disease": null,
                            "spots_ratio": spots_ratio
                        }];
                    }
                    resolve({ "filename": filename, "objects": enrichPredictions(results) });
                }, 1200);
            });
        }

        try {
            const response = await fetch(`${API_BASE}/api/analyze-base64`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    image_data: base64Data,
                    filename: filename
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Base64 image analysis failed");
            }
            return await response.json();
        } catch (error) {
            console.warn("Backend offline, using client fallback for analyzeBase64");
            return this.analyzeBase64("", filename);
        }
    },

    getSampleImageUrl(filename) {
        if (IS_GITHUB_PAGES || IS_FILE_PROTOCOL || API_BASE === "null" || !API_BASE) {
            return `${getSamplesPrefix()}/${filename}`;
        }
        return `${API_BASE}/samples/${filename}`;
    }
};

// Enrichment logic mimicking backend/analyzer.py
function enrichPredictions(predictions) {
    return predictions.map(pred => {
        const key = pred.class_key;
        const meta = PRODUCE_METADATA[key] || PRODUCE_METADATA["apple"];
        
        const freshness_val = pred.freshness;
        const shelf_life_days = meta.shelf_life[freshness_val] || 0;
        const action_text = meta.actions[freshness_val] || "No advice available.";
        
        const recipe_key = freshness_val === "semi-fresh" ? "semi-fresh" : "ripe";
        const recipe_text = meta.recipes[recipe_key] || meta.recipes["ripe"];
        
        const enriched = {
            ...pred,
            "scientific_name": meta.scientific_name,
            "nutrition": meta.nutrition,
            "storage_tips": meta.storage_tips,
            "recipe_advice": recipe_text,
            "action_advice": action_text,
            "shelf_life_days": shelf_life_days
        };
        
        if (pred.disease) {
            enriched["action_advice"] = pred.disease.disposal;
            enriched["recipe_advice"] = "DO NOT EAT. This item has active pathogen lesions.";
            enriched["shelf_life_days"] = 0;
        }
        return enriched;
    });
}
