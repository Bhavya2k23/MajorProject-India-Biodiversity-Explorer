const { spawn } = require("child_process");
const path = require("path");
const logger = require("../utils/logger");

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

    logger.info("prediction", "ML prediction request received", { input: inputData });

    // Try Python ML model first
    // NOTE: On Windows use 'python'; on Linux/macOS use 'python3'
    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    const pythonScriptPath = path.join(__dirname, "../services/predict.py");

    let responded = false;
    const respondOnce = (data) => {
      if (!responded) {
        responded = true;
        return res.status(200).json(data);
      }
    };

    const python = spawn(pythonCmd, [pythonScriptPath, JSON.stringify(inputData)]);

    let pythonOutput = "";
    let pythonError = "";

    python.stdout.on("data", (data) => { pythonOutput += data.toString(); });
    python.stderr.on("data", (data) => { pythonError += data.toString(); });

    // Safety timeout — if Python doesn't respond in 15s, fall back to rule-based
    const timeout = setTimeout(() => {
      if (!responded) {
        python.kill();
        const prediction = ruleBasedPrediction(inputData);
        logger.warn("prediction", "Python ML timeout - using rule-based fallback", { input: inputData });
        respondOnce({
          success: true,
          input: inputData,
          prediction,
          model: "Rule-Based (Timeout)",
        });
      }
    }, 15000);

    python.on("close", (code) => {
      clearTimeout(timeout);
      if (responded) return;
      if (code === 0 && pythonOutput) {
        try {
          const prediction = JSON.parse(pythonOutput.trim());
          logger.info("prediction", "ML prediction completed", { input: inputData, model: "ML (Decision Tree)" });
          respondOnce({
            success: true,
            input: inputData,
            prediction,
            model: "ML (Decision Tree)",
          });
          return;
        } catch {
          // Fall through to rule-based
          logger.warn("prediction", "Python output parse failed - using rule-based fallback");
        }
      }
      // Fallback to rule-based prediction
      const prediction = ruleBasedPrediction(inputData);
      logger.info("prediction", "Using rule-based prediction (Python fallback)", { input: inputData });
      respondOnce({
        success: true,
        input: inputData,
        prediction,
        model: "Rule-Based (Fallback)",
      });
    });

    python.on("error", (err) => {
      clearTimeout(timeout);
      if (responded) return;
      logger.error("prediction", "Python spawn error - using rule-based fallback", { error: err.message });
      const prediction = ruleBasedPrediction(inputData);
      respondOnce({
        success: true,
        input: inputData,
        prediction,
        model: "Rule-Based (Fallback)",
      });
    });
  } catch (error) {
    logger.error("prediction", "Prediction controller error", { error: error.message });
    next(error);
  }
};
