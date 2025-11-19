import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function extractJson(text: string) {
  const first = text.indexOf("[");
  const last = text.lastIndexOf("]");
  if (first === -1 || last === -1) return null;
  return text.substring(first, last + 1);
}

// Validate pipeline (avoid dangerous operators)
function validatePipeline(pipeline: any): { ok: boolean; reason?: string } {
  if (!Array.isArray(pipeline)) return { ok: false, reason: "Pipeline must be array" };
  if (pipeline.length > 20) return { ok: false, reason: "Pipeline is too long" };

  const forbidden = ["$where", "function", "$accumulator", "mapReduce"];

  for (const stage of pipeline) {
    if (typeof stage !== "object") return { ok: false, reason: "Invalid stage" };
    const raw = JSON.stringify(stage);

    if (forbidden.some(f => raw.includes(f))) {
      return { ok: false, reason: `Forbidden operator found: ${f}` };
    }
  }

  return { ok: true };
}

// Fix GeoNear to be first stage
function fixGeoNear(pipeline: any[]): any[] {
  const index = pipeline.findIndex(s => s.$geoNear);
  if (index > 0) {
    const geoStage = pipeline.splice(index, 1)[0];
    pipeline.unshift(geoStage);
  }
  return pipeline;
}

// Convert coordinates to numbers
function fixGeoCoordinates(pipeline: any[]): any[] {
  const geo = pipeline.find(s => s.$geoNear);
  if (!geo) return pipeline;

  const coords = geo.$geoNear?.near?.coordinates;
  if (Array.isArray(coords)) {
    geo.$geoNear.near.coordinates = coords.map(Number);
  }

  return pipeline;
}

// Main function for natural-language to pipeline
export async function getPipelineFromNL(question: string) {
const prompt = `
You are an expert MongoDB aggregation pipeline generator.
Return ONLY a JSON array. No comments. No markdown. No explanation.

Collections:
- venues
- subvenues

Allowed fields:
(venues)
name, description, phone, address, city, state, location, amenities, sports, averageRating, totalRatings
(subvenues)
name, sports.name, sports.minPlayers, sports.maxPlayers, price, status, venue

RULES:
1. Output ONLY a JSON array.
2. \\$geoNear MUST be the first stage for distance queries.
3. Coordinates MUST be literal numeric constants.
4. Convert km → meters.
5. If the user does NOT specify any distance (km or meters),
   use a default maxDistance of 30000 (30 km).
6. Amenities filter:
   { "amenities": { "\\$regex": "<word>", "\\$options": "i" } }
7. Sports match:
   {
     "\\$or": [
       { "sports": "<sport>" },
       { "subvenues.sports.name": "<sport>" }
     ]
   }
8. Price filter:
   { "subvenues.price": { "\\$lte": <n> } }
9. City filter must use regex with options i.
10. Use \\$lookup for joining with subvenues.
11. No JS functions or \\$where.

INTERPRETATIONS:

"best venues", "top venues", "good venues", "highest rated venues"
→ Must sort by averageRating in descending order:
  { "$sort": { "averageRating": -1 } }

"popular venues", "famous venues"
→ Same behavior (sort by rating)

If both "nearest" and "best" appear in the question:
→ First use $geoNear to sort by distance
→ Then add this stage:
  { "$sort": { "averageRating": -1 } }

Examples:
Input: "best football venues"
Output:
[
  { "$match": { "sports": "football" }},
  { "$sort": { "averageRating": -1 }}
]


Example:
Input:
football venues in Gandhinagar with washrooms under 1300
Output:
[
  { "\\$match": { "city": { "\\$regex": "gandhinagar", "\\$options": "i" } } },
  { "\\$match": { "amenities": { "\\$regex": "washrooms?", "\\$options": "i" } } },
  {
    "\\$lookup": {
      "from": "subvenues",
      "localField": "_id",
      "foreignField": "venue",
      "as": "subvenues"
    }
  },
  { "\\$unwind": "\\$subvenues" },
  {
    "\\$match": {
      "subvenues.sports.name": { "\\$regex": "football", "\\$options": "i" },
      "subvenues.price": { "\\$lte": 1300 }
    }
  }
]

Generate pipeline for:
"${question}"
`;


  const model = process.env.GROQ_MODEL ?? "llama-3.1-70b-versatile";

  const chat = await groq.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "You output STRICT JSON arrays only." },
      { role: "user", content: prompt }
    ],
    temperature: 0,
    max_tokens: 800
  });

  const raw = chat.choices?.[0]?.message?.content ?? "";
  const json = extractJson(raw);
  if (!json) throw new Error("LLM did not return JSON array");

  let pipeline: any;
  try {
    pipeline = JSON.parse(json);
  } catch (err) {
    throw new Error("Invalid JSON from Groq");
  }

  // Validate pipeline
  const safe = validatePipeline(pipeline);
  if (!safe.ok) throw new Error("Pipeline rejected: " + safe.reason);

  // Auto-fix geo issues
  pipeline = fixGeoCoordinates(pipeline);
  pipeline = fixGeoNear(pipeline);

  return pipeline;
}
