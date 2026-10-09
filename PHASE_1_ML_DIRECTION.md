# UrbanPulse – Smart City Monitoring & Response Network
## Phase 1: Machine Learning Direction & Analytical Framework

---

## 1. Primary Machine Learning Engine: XGBoost

**XGBoost (eXtreme Gradient Boosting)** is selected as the primary ML model candidate for UrbanPulse.

### 1.1 Technical Selection Rationale
1. **Optimization for Tabular Urban Datasets**: Urban condition data (traffic speeds, rainfall rates, pedestrian footfall, temporal indices) is tabular in structure. Gradient boosted decision trees excel on structured tabular data compared to uncalibrated deep neural networks.
2. **Non-Linear Cross-Domain Interaction Modeling**: XGBoost constructs sequential decision trees that natively capture non-linear feature interactions (e.g., how rain intensity amplifies traffic congestion specifically during high crowd density) without requiring manual polynomial expansion.
3. **Handling Missing Data & Outliers**: Tree-based partitioning is robust against monotonic feature transformations and natively handles missing observations commonly encountered in real-world urban telemetry.
4. **Native Feature Attribution**: XGBoost provides intrinsic gain, weight, and cover metrics that support transparent model explainability.

### 1.2 Model Evaluation Stance
UrbanPulse does **NOT** assert that XGBoost is unconditionally superior to Random Forest, Extra Trees, or Linear models prior to empirical validation. In Phase 4 (ML Development), XGBoost performance will be benchmarked against baseline algorithms under identical data split conditions.

---

## 2. ML Modeling Task Trade-offs: Classification vs. Regression

Phase 1 establishes the decision framework for selecting between **Classification** and **Regression** modeling paradigms, which will be frozen after empirical data exploratory analysis.

| Paradigm | Target Definition | Practical Urban Domain Application | Trade-offs & Considerations |
| :--- | :--- | :--- | :--- |
| **Classification Paradigm** | Discrete Urban Condition Categories:<br>• `Normal`<br>• `Moderate`<br>• `High / Critical` | Aligns directly with municipal operational threat levels and automated alert triggers. Easy to interpret for control room staff. | Requires a rigorous, data-driven methodology to define class boundary thresholds. **Arbitrary thresholding to inflate accuracy is strictly prohibited.** |
| **Regression Paradigm** | Continuous Numerical Urban Severity Score:<br>• `Index Value [0.0 - 100.0]` or continuous speed/density target | Captures fine-grained, continuous urban condition fluctuations. Avoids artificial discretization boundaries. | Requires downstream threshold mapping to generate discrete alerts for operational personnel. |

*Protocol Rule*: UrbanPulse will finalize a single primary task paradigm (Classification OR Regression) during Phase 2/4 based on dataset target distribution. Both paradigms will be implemented only if explicit project requirements mandate dual evaluation.

---

## 3. Data Requirements & Feature Engineering Plan

Phase 1 documents raw data requirements across domains:

```
INPUT FEEDS                           DERIVED FEATURES                        PREDICTION TARGET
+--------------------+               +-----------------------+               +-----------------------+
| Traffic Data       |               | Temporal Cycles       |               | Urban Condition State |
| • Speed / Volume   |               | • Hour Sin/Cos        |               |                       |
| Weather Data       |               | Spatial Indices       |               | • Classification:     |
| • Rain, Visibility | ------> ----- | • Corridor ID         | ------> ----- |   Normal/Moderate/High|
| Crowd Data         |               | Interaction Terms     |               | • Regression:         |
| • Pedestrian Density|              | • Rain x Crowd Density|               |   Severity Index      |
| Project Telemetry  |               | Rolling Aggregations  |               |                       |
+--------------------+               +-----------------------+               +-----------------------+
```

---

## 4. Scientific Stance on Generative AI & Gemini API

* **Core Prediction Engine**: Gemini API or LLMs shall **NOT** be used as the predictive engine for urban conditions. All urban condition predictions must originate exclusively from the trained, deterministic ML model (XGBoost).
* **Optional Future Role**: Generative AI (e.g., Gemini API) may be evaluated in future phases *strictly* as an optional natural-language synthesis layer to generate executive summaries of model outputs or parse natural-language dashboard queries.
* **Phase 1 Status**: Generative AI is explicitly excluded from Phase 1 scope.

---

## 5. Prohibition of Invented Empirical Metrics

In strict accordance with academic integrity rules:
* Phase 1 does **NOT** present invented model accuracy percentages (e.g., "Achieved 94.5% accuracy").
* Phase 1 does **NOT** present invented Precision, Recall, F1-Score, MAE, RMSE, or R² values.
* Phase 1 does **NOT** present hardcoded feature importance charts.

All empirical metrics will be calculated and reported exclusively following real model training and validation on empirical urban datasets in Phase 4.
