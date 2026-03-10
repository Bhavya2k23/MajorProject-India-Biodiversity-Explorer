const { spawn } = require("child_process");
const path = require("path");

// Rule-based fallback prediction (if Python script unavailable)
const ruleBasedPrediction = ({ population, habitatLoss, pollutionLevel, climateRisk }) => {
  const riskScore =
    (habitatLoss * 0.35) + (pollutionLevel * 0.25) + (climateRisk * 0.25) + (Math.max(0, (1000 - population) / 1000) * 15);

  if (riskScore >= 65) return { status: "Endangered", confidence: 0.85, riskScore: riskScore.toFixed(2) };
  if (riskScore >= 35) return { status: "Vulnerable", confidence: 0.75, riskScore: riskScore.toFixed(2) };
  return { status: "Safe", confidence: 0.80, riskScore: riskScore.toFixed(2) };
};

// @desc    Predict conservation status using ML model
// @route   POST /api/predict
// @access  Public
exports.predictStatus = async (req, res, next) => {
  try {
    const { population, habitatLoss, pollutionLevel, climateRisk } = req.body;

    // Validate inputs
    if (
      population === undefined || habitatLoss === undefined ||
      pollutionLevel === undefined || climateRisk === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields required: population, habitatLoss, pollutionLevel, climateRisk",
      });
    }

    const inputData = {
      population: Number(population),
      habitatLoss: Number(habitatLoss),
      pollutionLevel: Number(pollutionLevel),
      climateRisk: Number(climateRisk),
    };

    // Try Python ML model first
    const pythonScriptPath = path.join(__dirname, "../ml/predict.py");

    const python = spawn("python3", [pythonScriptPath, JSON.stringify(inputData)]);

    let pythonOutput = "";
    let pythonError = "";

    python.stdout.on("data", (data) => { pythonOutput += data.toString(); });
    python.stderr.on("data", (data) => { pythonError += data.toString(); });

    python.on("close", (code) => {
      if (code === 0 && pythonOutput) {
        try {
          const prediction = JSON.parse(pythonOutput.trim());
          return res.status(200).json({
            success: true,
            input: inputData,
            prediction,
            model: "ML (Decision Tree)",
          });
        } catch {
          // Fall through to rule-based
        }
      }

      // Fallback to rule-based prediction
      const prediction = ruleBasedPrediction(inputData);
      return res.status(200).json({
        success: true,
        input: inputData,
        prediction,
        model: "Rule-Based (Fallback)",
      });
    });

    python.on("error", () => {
      // Python not available - use rule-based
      const prediction = ruleBasedPrediction(inputData);
      return res.status(200).json({
        success: true,
        input: inputData,
        prediction,
        model: "Rule-Based (Fallback)",
      });
    });
  } catch (error) {
    next(error);
  }
};
