import { useEffect, useRef, useState } from "react";
import mqtt from "mqtt";
// @ts-ignore
import logNivelRaw from "./log_nivel.txt?raw";

const BROKER_URL = "wss://broker.hivemq.com:8884/mqtt";
const TOPICO_NIVEL = "topic_sensor_uni";
const TOPICO_STATUS = "topic_status_uni";

function parseLogNivel(logText: string) {
  return logText
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const [date, time, value] = line.split(" ");
      return {
        time: `${date} ${time}`,
        value: Number(value),
      };
    });
}

// --- Status Calculation Logic ---
function getStatusFromNivel(nivel: number, autoLevels?: Array<{servo: number, led: number, buzzer: number}>) {
  if (autoLevels && Array.isArray(autoLevels) && autoLevels.length === 5) {
    if (nivel <= 10) return autoLevels[0];
    if (nivel <= 15) return autoLevels[1];
    if (nivel <= 20) return autoLevels[2];
    if (nivel <= 30) return autoLevels[3];
    return autoLevels[4];
  }

  let servo = 0, led = 0, buzzer = 0;
  if (nivel <= 10) {
    servo = 1; led = 2; buzzer = 1;
  } else if (nivel <= 15) {
    servo = 0; led = 2; buzzer = 1;
  } else if (nivel <= 20) {
    servo = 0; led = 1; buzzer = 0;
  } else if (nivel <= 30) {
    servo = 0; led = 0; buzzer = 0;
  } else {
    servo = 0; led = 0; buzzer = 0;
  }
  return { servo, led, buzzer };
}

// --- MQTT Status String Builder ---
function buildStatusString(
  servo: number,
  led: number,
  buzzer: number,
) {
  const variable = `{"servo":${servo},"led":${led},"buzzer":${buzzer}}`;
  return variable;
}

// --- API Weather Data Normalization ---
function normalizeWeatherData(weatherData: any) {
  if (!weatherData || !weatherData.timelines || !weatherData.timelines.hourly)
    return null;
  const hourly = weatherData.timelines.hourly[0]?.values;
  if (!hourly) return null;
  return {
    temperature: hourly.temperature,
    humidity: hourly.humidity,
    precipitationProbability: hourly.precipitationProbability,
    rainIntensity: hourly.rainIntensity,
    weatherCode: hourly.weatherCode,
    windSpeed: hourly.windSpeed,
    windGust: hourly.windGust,
    cloudCover: hourly.cloudCover,
  };
}

export function useMqtt(autoLevels?: Array<{servo: number, led: number, buzzer: number}>) {
  const clientRef = useRef<any>(null);
  const [nivel, setNivel] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("");
  const [nivelHistory, setNivelHistory] = useState<
    { time: string; value: number }[]
  >([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const ultimoNivel = useRef<number | null>(null);
  const ultimoServo = useRef<number | null>(null);
  const ultimoLed = useRef<number | null>(null);
  const ultimoBuzzer = useRef<number | null>(null);
  const [modoManual, setModoManual] = useState(false);
  const [manualServo, setManualServo] = useState(1);
  const [manualLed, setManualLed] = useState(0);
  const [manualBuzzer, setManualBuzzer] = useState(0);
  const lastPublishedStatus = useRef<string | null>(null);
  const lastLoggedNivel = useRef<number | null>(null);
  const historyCache = useRef<{ time: string; value: number }[]>([]);
  const lastRefresh = useRef<number>(0);

  const [prediction, setPrediction] = useState<{
    futureLevel: number;
    timeToReach: string;
    confidence: number;
    recommendation: string;
    severity: "low" | "medium" | "high";
    actionRequired: boolean;
    riskLevel: number;
    weatherImpact: string;
    seasonalTrend: string;
  } | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const predictionCache = useRef<any>(null);
  const lastPredictionFetch = useRef<number>(0);

  const [initialPredictionLoaded, setInitialPredictionLoaded] = useState(false);

  function appendNivelLog(value: number) {
    const now = new Date();
    const line = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(now.getDate()).padStart(2, "0")} ${now.toTimeString().slice(
      0,
      8,
    )} ${value.toFixed(1)}\n`;

    console.log("[LOG_NIVEL]", line.trim());
  }

  function appendStatusLog(servo: number, led: number, buzzer: number) {
    const now = new Date();
    const line = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${now.toTimeString().slice(0, 8)} STATUS servo:${servo} led:${led} buzzer:${buzzer}\n`;
    try {
      // @ts-ignore
      if (typeof window === "undefined" && require) {
        const fs = require("fs");
        const path = require("path");
        const logPath = path.resolve(__dirname, "../log_status.txt");
        fs.appendFileSync(logPath, line);
      } else {
        console.log("[LOG_STATUS]", line.trim());
      }
    } catch (e) {
      console.log("[LOG_STATUS]", line.trim());
    }
  }

  useEffect(() => {
    const client = mqtt.connect(BROKER_URL);
    clientRef.current = client;

    client.on("connect", () => {
      setIsConnected(true);
      setIsLoading(false);
      client.subscribe([TOPICO_NIVEL, TOPICO_STATUS]);
    });

    client.on("disconnect", () => setIsConnected(false));
    client.on("error", (error) => {
      setIsConnected(false);
      setIsLoading(false);
      console.error("MQTT Error:", error);
    });

    client.on("message", (topic, message) => {
      if (topic === TOPICO_NIVEL && !modoManual) {
        const value = Number(message.toString());
        if (isNaN(value)) return;
        setNivel(value);
        const newEntry = {
          time: new Date().toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          value: Math.round(value * 10) / 10,
        };
        setNivelHistory((prev) => {
          const updated = [...prev.slice(-49), newEntry];
          historyCache.current = updated;
          return updated;
        });
        if (
          lastLoggedNivel.current === null ||
          Math.abs(value - lastLoggedNivel.current) > 2
        ) {
          appendNivelLog(value);
          lastLoggedNivel.current = value;
        }
        // Only send status string if the hardware status (servo, led, buzzer) changes
        const { servo, led, buzzer } = getStatusFromNivel(value, autoLevels);
        const statusStr = buildStatusString(servo, led, buzzer);
        const statusChanged =
          ultimoServo.current !== servo ||
          ultimoLed.current !== led ||
          ultimoBuzzer.current !== buzzer;
        if (statusChanged) {
          client.publish(TOPICO_STATUS, statusStr);
          lastPublishedStatus.current = statusStr;
          ultimoServo.current = servo;
          ultimoLed.current = led;
          ultimoBuzzer.current = buzzer;
          appendStatusLog(servo, led, buzzer);
        }
        if (nivelHistory.length > 5) fetchWaterLevelPrediction();
      } else if (modoManual) {
        // Always send manual status if changed
        const statusStr = buildStatusString(
          manualServo,
          manualLed,
          manualBuzzer
        );
        if (lastPublishedStatus.current !== statusStr) {
          console.log(statusStr);

          client.publish(TOPICO_STATUS, statusStr);
          lastPublishedStatus.current = statusStr;
          appendStatusLog(manualServo, manualLed, manualBuzzer);
        }
      }
      if (topic === TOPICO_STATUS) setStatus(message.toString());
    });
    return () => {
      client.end();
    };
  }, [modoManual, manualServo, manualLed, manualBuzzer]);

  // --- Weather API Call ---
  const [weatherData, setWeatherData] = useState<any>(null);
  async function fetchWeatherForecast(lat = 42.3478, lon = -71.0466) {
    const apiKey = import.meta.env.VITE_TOMORROW_API_KEY;
    const url = `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lon}&apikey=${apiKey}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
      const data = await res.json();
      setWeatherData(data);
      return data;
    } catch (err) {
      setWeatherData(null);
      console.error("[WEATHER] Error fetching forecast:", err);
      return null;
    }
  }

  // --- Prediction Logic ---
  async function fetchWaterLevelPrediction() {
    const now = Date.now();
    if (now - lastPredictionFetch.current < 180000 && predictionCache.current) {
      setPrediction(predictionCache.current);
      return;
    }
    const currentLevel =
      nivel ||
      (nivelHistory.length > 0
        ? nivelHistory[nivelHistory.length - 1].value
        : 50);
    const hasMinimalData = nivelHistory.length >= 3;
    if (!hasMinimalData && !initialPredictionLoaded) {
      const initialPrediction = generateInitialPrediction(currentLevel);
      setPrediction(initialPrediction);
      setInitialPredictionLoaded(true);
      return;
    }
    setPredictionLoading(true);
    try {
      const weatherData = await fetchWeatherForecast();
      await new Promise((resolve) => setTimeout(resolve, 800));
      const recentData = nivelHistory.slice(-15);
      const shortTermTrend =
        recentData.length > 5
          ? (recentData[recentData.length - 1].value -
              recentData[recentData.length - 6].value) /
            5
          : 0;
      const longTermTrend =
        recentData.length > 1
          ? (recentData[recentData.length - 1].value - recentData[0].value) /
            recentData.length
          : 0;
      const hour = new Date().getHours();
      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const weatherPattern = Math.sin((dayOfYear / 365) * 2 * Math.PI) * 0.3;
      const dailyPattern = Math.sin((hour / 24) * 2 * Math.PI) * 0.15;
      const randomWeatherEvent = (Math.random() - 0.5) * 0.4;
      const trendWeight = 0.4,
        weatherWeight = 0.3,
        seasonalWeight = 0.2,
        randomWeight = 0.1;
      const predictedChange =
        (shortTermTrend * 0.7 + longTermTrend * 0.3) * trendWeight * 24 +
        weatherPattern * weatherWeight * 15 +
        dailyPattern * seasonalWeight * 8 +
        randomWeatherEvent * randomWeight * 5;
      const futureLevel = Math.max(
        0,
        Math.min(100, currentLevel + predictedChange),
      );
      const dataConsistency =
        recentData.length > 5
          ? 1 - Math.abs(shortTermTrend - longTermTrend) / 10
          : 0.6;
      const confidence = Math.max(
        0.65,
        Math.min(0.94, dataConsistency * 0.85 + 0.1),
      );
      const riskLevel = calculateRiskLevel(futureLevel, shortTermTrend, currentLevel);
      const { recommendation, severity, actionRequired } = generateRecommendation(
        futureLevel,
        currentLevel,
        shortTermTrend,
        riskLevel,
      );
      let weatherImpact = getWeatherImpact(weatherPattern, randomWeatherEvent);
      if (weatherData && weatherData.timelines && weatherData.timelines.hourly) {
        const nextHour = weatherData.timelines.hourly[0];
        if (nextHour && nextHour.values) {
          if (nextHour.values.precipitationIntensity > 0.5) {
            weatherImpact = "Heavy rainfall expected (API)";
          } else if (nextHour.values.precipitationIntensity > 0.1) {
            weatherImpact = "Light rain expected (API)";
          } else {
            weatherImpact = "No significant rain (API)";
          }
        }
      }
      const seasonalTrend = getSeasonalTrend(dayOfYear);
      const predictionData = {
        futureLevel: Math.round(futureLevel * 10) / 10,
        timeToReach: "24 hours",
        confidence: Math.round(confidence * 100),
        recommendation,
        severity,
        actionRequired,
        riskLevel: Math.round(riskLevel * 10) / 10,
        weatherImpact,
        seasonalTrend,
      };
      predictionCache.current = predictionData;
      setPrediction(predictionData);
      lastPredictionFetch.current = now;
      setInitialPredictionLoaded(true);
    } catch (error) {
      console.error("Error fetching prediction:", error);
    } finally {
      setPredictionLoading(false);
    }
  }

  // Generate initial prediction for app startup
  function generateInitialPrediction(currentLevel: number) {
    const baseLevel = currentLevel || 45;
    const futureLevel = Math.max(
      20,
      Math.min(80, baseLevel + (Math.random() - 0.5) * 20),
    );
    const riskLevel = calculateRiskLevel(futureLevel, 0, baseLevel);
    const { recommendation, severity, actionRequired } = generateRecommendation(
      futureLevel,
      baseLevel,
      0,
      riskLevel,
    );

    return {
      futureLevel: Math.round(futureLevel * 10) / 10,
      timeToReach: "24 hours",
      confidence: 75,
      recommendation,
      severity,
      actionRequired,
      riskLevel: Math.round(riskLevel * 10) / 10,
      weatherImpact: "Stable conditions expected",
      seasonalTrend: "Normal seasonal variation",
    };
  }

  // Calculate risk level (0-10 scale)
  function calculateRiskLevel(
    futureLevel: number,
    trend: number,
    currentLevel: number,
  ): number {
    let risk = 0;

    // Level-based risk
    if (futureLevel <= 10) risk += 8;
    else if (futureLevel <= 20) risk += 6;
    else if (futureLevel <= 30) risk += 3;
    else if (futureLevel >= 85) risk += 7;
    else if (futureLevel >= 75) risk += 4;

    // Trend-based risk
    if (Math.abs(trend) > 3) risk += 3;
    else if (Math.abs(trend) > 1.5) risk += 1;

    // Change magnitude risk
    const change = Math.abs(futureLevel - currentLevel);
    if (change > 20) risk += 2;
    else if (change > 10) risk += 1;

    return Math.min(10, risk);
  }

  // Generate enhanced recommendations
  function generateRecommendation(
    futureLevel: number,
    currentLevel: number,
    trend: number,
    riskLevel: number,
  ) {
    let recommendation = "Monitor levels regularly";
    let severity: "low" | "medium" | "high" = "low";
    let actionRequired = false;

    if (futureLevel <= 10) {
      recommendation =
        "CRITICAL: Immediate drainage required. Activate emergency protocols.";
      severity = "high";
      actionRequired = true;
    } else if (futureLevel <= 15) {
      recommendation =
        "HIGH ALERT: Prepare drainage systems. Consider evacuating low areas.";
      severity = "high";
      actionRequired = true;
    } else if (futureLevel <= 25) {
      recommendation =
        "WARNING: Open drainage gates. Monitor closely for rapid changes.";
      severity = "medium";
      actionRequired = true;
    } else if (trend > 2 && futureLevel > currentLevel + 10) {
      recommendation =
        "TREND ALERT: Rapid rise detected. Prepare preventive measures.";
      severity = "medium";
      actionRequired = true;
    } else if (futureLevel >= 80) {
      recommendation =
        "OVERFLOW RISK: Monitor for capacity limits. Prepare overflow channels.";
      severity = "medium";
      actionRequired = true;
    } else if (riskLevel >= 5) {
      recommendation =
        "MODERATE RISK: Increase monitoring frequency. Check equipment status.";
      severity = "medium";
      actionRequired = false;
    } else if (trend < -2) {
      recommendation =
        "FALLING TREND: Good conditions. Maintain current settings.";
      severity = "low";
      actionRequired = false;
    }

    return { recommendation, severity, actionRequired };
  }

  // Get weather impact description
  function getWeatherImpact(
    weatherPattern: number,
    randomEvent: number,
  ): string {
    if (Math.abs(randomEvent) > 0.3) {
      return randomEvent > 0
        ? "Heavy rainfall expected"
        : "Dry conditions forecasted";
    } else if (Math.abs(weatherPattern) > 0.2) {
      return weatherPattern > 0
        ? "Seasonal increase likely"
        : "Seasonal decrease expected";
    }
    return "Stable weather conditions";
  }

  // Get seasonal trend description
  function getSeasonalTrend(dayOfYear: number): string {
    const season = Math.floor((dayOfYear % 365) / 91); // 0-3 for seasons
    const trends = [
      "Winter: Lower evaporation rates",
      "Spring: Increased rainfall potential",
      "Summer: Higher evaporation expected",
      "Fall: Variable weather patterns",
    ];
    return trends[season] || "Normal seasonal variation";
  }

  // Smart refresh function with caching
  function refreshNivelHistory() {
    const now = Date.now();
    // Only refresh if more than 30 seconds have passed
    if (now - lastRefresh.current < 30000 && historyCache.current.length > 0) {
      setNivelHistory([...historyCache.current]);
      return;
    }

    setIsLoading(true);
    try {
      const allHistory = parseLogNivel(logNivelRaw);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const filteredHistory = allHistory
        .filter((entry) => {
          const entryDate = new Date(entry.time);
          return entryDate >= oneWeekAgo;
        })
        .map((entry) => ({
          ...entry,
          value: Math.round(entry.value * 10) / 10, // Round to 1 decimal
        }));

      historyCache.current = filteredHistory;
      setNivelHistory(filteredHistory);
      lastRefresh.current = now;
    } catch (error) {
      console.error("Error refreshing history:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // Get water level status with color coding
  function getWaterLevelStatus(level: number | null) {
    if (level === null)
      return { status: "Unknown", color: "#9b9a97", severity: "unknown" };
    if (level <= 10)
      return { status: "Critical", color: "#e03e3e", severity: "critical" };
    if (level <= 15)
      return { status: "High", color: "#f59e0b", severity: "high" };
    if (level <= 20)
      return { status: "Warning", color: "#eab308", severity: "warning" };
    if (level <= 30)
      return { status: "Normal", color: "#10b981", severity: "normal" };
    return { status: "Safe", color: "#059669", severity: "safe" };
  }

  // Auto-fetch prediction on mount and when history updates
  useEffect(() => {
    // Initial prediction fetch on app startup
    if (!initialPredictionLoaded) {
      const timer = setTimeout(() => {
        fetchWaterLevelPrediction();
      }, 1000);
      return () => clearTimeout(timer);
    }

    // Regular updates when we have data
    if (nivelHistory.length > 3 && !predictionLoading) {
      const timer = setTimeout(() => {
        fetchWaterLevelPrediction();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [nivelHistory.length, initialPredictionLoaded]);

  // Periodic prediction updates every 3 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!predictionLoading) {
        fetchWaterLevelPrediction();
      }
    }, 180000); // 3 minutes

    return () => clearInterval(interval);
  }, [predictionLoading]);

  // Expose manual mode controls for UI
  return {
    nivel,
    status,
    nivelHistory,
    refreshNivelHistory,
    modoManual,
    setModoManual,
    manualServo,
    setManualServo,
    manualLed,
    setManualLed,
    manualBuzzer,
    setManualBuzzer,
    client: clientRef.current,
    isConnected,
    isLoading,
    getWaterLevelStatus,
    prediction,
    predictionLoading,
    fetchWaterLevelPrediction,
    weatherData,
    getWeatherSummary: () => normalizeWeatherData(weatherData),
  };
}
