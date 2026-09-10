import pickle
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

with open("diabetes_model.pkl", "rb") as f:
    model = pickle.load(f)


class PredictionInput(BaseModel):
    age: float
    bmi: float
    glucose: float
    hba1c: float
    blood_pressure: float
    family_history: str


@app.get("/")
def root():
    return {"status": "MediSync ML API is running"}


@app.post("/predict")
def predict(data: PredictionInput):
    features = pd.DataFrame([{
        "Pregnancies": 0,
        "Glucose": data.glucose,
        "BloodPressure": data.blood_pressure,
        "SkinThickness": 0,
        "Insulin": 0,
        "BMI": data.bmi,
        "DiabetesPedigreeFunction": 1.5 if data.family_history == "yes" else 0.5,
        "Age": data.age,
    }])

    prediction = model.predict(features)[0]
    probability = model.predict_proba(features)[0][1]

    risk_score = round(probability * 100, 1)

    if risk_score < 30:
        risk_level = "Low Risk"
    elif risk_score < 60:
        risk_level = "Moderate Risk"
    else:
        risk_level = "High Risk"

    risk_factors = []

    if data.glucose > 140:
        risk_factors.append({"name": "Blood Glucose", "value": f"{data.glucose} mg/dL", "status": "danger", "points": 25})
    elif data.glucose > 100:
        risk_factors.append({"name": "Blood Glucose", "value": f"{data.glucose} mg/dL", "status": "warning", "points": 15})
    else:
        risk_factors.append({"name": "Blood Glucose", "value": f"{data.glucose} mg/dL", "status": "normal", "points": 5})

    if data.bmi > 30:
        risk_factors.append({"name": "BMI", "value": f"{data.bmi}", "status": "danger", "points": 20})
    elif data.bmi > 25:
        risk_factors.append({"name": "BMI", "value": f"{data.bmi}", "status": "warning", "points": 12})
    else:
        risk_factors.append({"name": "BMI", "value": f"{data.bmi}", "status": "normal", "points": 5})

    if data.blood_pressure > 140:
        risk_factors.append({"name": "Blood Pressure", "value": f"{data.blood_pressure} mmHg", "status": "danger", "points": 20})
    elif data.blood_pressure > 120:
        risk_factors.append({"name": "Blood Pressure", "value": f"{data.blood_pressure} mmHg", "status": "warning", "points": 12})
    else:
        risk_factors.append({"name": "Blood Pressure", "value": f"{data.blood_pressure} mmHg", "status": "normal", "points": 5})

    if data.hba1c > 6.5:
        risk_factors.append({"name": "HbA1c", "value": f"{data.hba1c}%", "status": "danger", "points": 25})
    elif data.hba1c > 5.7:
        risk_factors.append({"name": "HbA1c", "value": f"{data.hba1c}%", "status": "warning", "points": 15})
    else:
        risk_factors.append({"name": "HbA1c", "value": f"{data.hba1c}%", "status": "normal", "points": 5})

    if data.age > 45:
        risk_factors.append({"name": "Age", "value": f"{int(data.age)} years", "status": "warning", "points": 15})
    else:
        risk_factors.append({"name": "Age", "value": f"{int(data.age)} years", "status": "normal", "points": 5})

    if data.family_history == "yes":
        risk_factors.append({"name": "Family History", "value": "Yes", "status": "danger", "points": 15})
    else:
        risk_factors.append({"name": "Family History", "value": "No", "status": "normal", "points": 5})

    return {
        "riskScore": risk_score,
        "riskLevel": risk_level,
        "prediction": int(prediction),
        "riskFactors": risk_factors,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
