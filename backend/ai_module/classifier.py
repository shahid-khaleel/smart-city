from transformers import pipeline 

# Initialize the zero-shot classifier
# (This runs locally; it will download a ~1.6GB model on first execution)
classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

# Define the exact departments your SmartCity uses. These strings must match
# app.models.jurisdiction.Department rows exactly (see seed.py) - the
# department-routing logic in routes_complaints.py matches on these names,
# so a mismatch here means a "successfully classified" complaint still
# silently falls back to the default department.
CATEGORIES = [
    "Roads & Infrastructure",
    "Water & Sanitation",
    "Electrical & Lighting",
    "Vandalism & Safety",
    "Environment & Parks",
    "Other / Unclassified",
]

def classify_issue(description: str) -> str:
    """
    Predicts the best category/department for a given text description.
    """
    try:
        # Pass the text and our custom categories to the AI
        result = classifier(description, CATEGORIES)
        
        # The AI returns lists ordered by confidence. Grab the highest one.
        best_match = result['labels'][0]
        return best_match
    except Exception as e:
        print(f"Classification Error: {e}")
        return "Uncategorized"