#!/usr/bin/env python3
"""
Endangered Species Prediction Model
Uses Decision Tree Classifier trained on synthetic biodiversity data.
Input:  JSON string via command-line argument
Output: JSON prediction result to stdout
"""

import sys
import json
import os
import pickle
import numpy as np

# Try importing ML libraries
try:
    from sklearn.tree import DecisionTreeClassifier
    from sklearn.preprocessing import StandardScaler
    import pandas as pd
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False


def generate_training_data():
    """Generate synthetic training data for the model."""
    np.random.seed(42)
    n = 600

    # Safe species: high population, low threats
    safe_pop = np.random.randint(5000, 100000, 200)
    safe_hl = np.random.uniform(0, 30, 200)
    safe_pl = np.random.uniform(0, 30, 200)
    safe_cr = np.random.uniform(0, 30, 200)
    safe_labels = ["Safe"] * 200

    # Vulnerable species: medium population, moderate threats
    vuln_pop = np.random.randint(500, 10000, 200)
    vuln_hl = np.random.uniform(25, 65, 200)
    vuln_pl = np.random.uniform(25, 65, 200)
    vuln_cr = np.random.uniform(25, 65, 200)
    vuln_labels = ["Vulnerable"] * 200

    # Endangered species: low population, high threats
    end_pop = np.random.randint(10, 1000, 200)
    end_hl = np.random.uniform(55, 100, 200)
    end_pl = np.random.uniform(50, 100, 200)
    end_cr = np.random.uniform(50, 100, 200)
    end_labels = ["Endangered"] * 200

    populations = np.concatenate([safe_pop, vuln_pop, end_pop])
    habitat_loss = np.concatenate([safe_hl, vuln_hl, end_hl])
    pollution = np.concatenate([safe_pl, vuln_pl, end_pl])
    climate = np.concatenate([safe_cr, vuln_cr, end_cr])
    labels = safe_labels + vuln_labels + end_labels

    X = np.column_stack([populations, habitat_loss, pollution, climate])
    y = np.array(labels)

    return X, y


def get_or_train_model():
    """Load cached model or train a new one."""
    model_path = os.path.join(os.path.dirname(__file__), "model.pkl")
    scaler_path = os.path.join(os.path.dirname(__file__), "scaler.pkl")

    if os.path.exists(model_path) and os.path.exists(scaler_path):
        with open(model_path, "rb") as f:
            model = pickle.load(f)
        with open(scaler_path, "rb") as f:
            scaler = pickle.load(f)
    else:
        X, y = generate_training_data()
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        model = DecisionTreeClassifier(max_depth=6, min_samples_split=10, random_state=42)
        model.fit(X_scaled, y)

        with open(model_path, "wb") as f:
            pickle.dump(model, f)
        with open(scaler_path, "wb") as f:
            pickle.dump(scaler, f)

    return model, scaler


def predict(input_data):
    """Run prediction and return result as dict."""
    population = float(input_data["population"])
    habitat_loss = float(input_data["habitatLoss"])
    pollution_level = float(input_data["pollutionLevel"])
    climate_risk = float(input_data["climateRisk"])

    features = np.array([[population, habitat_loss, pollution_level, climate_risk]])

    model, scaler = get_or_train_model()
    features_scaled = scaler.transform(features)

    prediction = model.predict(features_scaled)[0]
    probabilities = model.predict_proba(features_scaled)[0]
    classes = model.classes_
    confidence = float(max(probabilities))

    prob_dict = {cls: round(float(prob), 3) for cls, prob in zip(classes, probabilities)}

    return {
        "status": prediction,
        "confidence": round(confidence, 3),
        "probabilities": prob_dict
    }


def rule_based_predict(input_data):
    """Fallback rule-based prediction when sklearn not available."""
    population = float(input_data["population"])
    habitat_loss = float(input_data["habitatLoss"])
    pollution_level = float(input_data["pollutionLevel"])
    climate_risk = float(input_data["climateRisk"])

    risk_score = (
        habitat_loss * 0.35 +
        pollution_level * 0.25 +
        climate_risk * 0.25 +
        max(0, (1000 - population) / 1000) * 15
    )

    if risk_score >= 65:
        return {"status": "Endangered", "confidence": 0.85, "riskScore": round(risk_score, 2)}
    elif risk_score >= 35:
        return {"status": "Vulnerable", "confidence": 0.75, "riskScore": round(risk_score, 2)}
    else:
        return {"status": "Safe", "confidence": 0.80, "riskScore": round(risk_score, 2)}


if __name__ == "__main__":
    try:
        if len(sys.argv) < 2:
            raise ValueError("No input data provided")

        input_data = json.loads(sys.argv[1])

        if ML_AVAILABLE:
            result = predict(input_data)
        else:
            result = rule_based_predict(input_data)

        print(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
