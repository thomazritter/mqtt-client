import "./App.css";
import { useMqtt } from "./useMqtt";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useState } from "react";
import { useRoutes } from "react-router-dom";
import routes from "tempo-routes";

// @ts-ignore
import logAlarmRaw from "./log_alarm.txt?raw";

function App() {
  const [autoLevels, setAutoLevels] = useState([
    { servo: 1, led: 2, buzzer: 1 }, // <= 10
    { servo: 0, led: 2, buzzer: 1 }, // 11-15
    { servo: 0, led: 1, buzzer: 0 }, // 16-20
    { servo: 0, led: 0, buzzer: 0 }, // 21-30
    { servo: 0, led: 0, buzzer: 0 }, // > 30
  ]);

  // Pass autoLevels to useMqtt so backend logic uses UI config
  const {
    nivel,
    status,
    nivelHistory,
    modoManual,
    setModoManual,
    manualServo,
    setManualServo,
    manualLed,
    setManualLed,
    manualBuzzer,
    setManualBuzzer,
    refreshNivelHistory,
    isConnected,
    isLoading,
    getWaterLevelStatus,
    prediction,
    predictionLoading,
    fetchWaterLevelPrediction,
    weatherData, 
    getWeatherSummary,
  } = useMqtt(autoLevels);

  const [activeTab, setActiveTab] = useState("Dashboard");

  // Alarm log state
  const [alarmHistory, setAlarmHistory] = useState<any[]>([]);

  // Helper labels for display
  const servoLabels = ["Desligado", "Ativado"];
  const ledLabels = ["Desligado", "Ligado (Full)", "Piscando"];
  const buzzerLabels = ["Desligado", "Tocando/Ligado"];

  // Handler to update a specific level's setting
  function updateAutoLevel(
    levelIdx: number,
    key: "servo" | "led" | "buzzer",
    nextValue: number,
  ) {
    setAutoLevels((levels) =>
      levels.map((l, i) => (i === levelIdx ? { ...l, [key]: nextValue } : l)),
    );
  }

  // Helper to parse alarm log
  function parseLogAlarm(logText: string) {
    // Example line: 2025-06-05 18:00:00 High Water Level: 85.2% | Action: Gate Opened | Duration: 45 min | Resolved
    return logText
      .split("\n")
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        // Split by | and extract fields
        const [datetime, rest] = line.split(" ", 2);
        const [time, ...restArr] = rest ? rest.split(" ") : ["", ""];
        const restStr = restArr.join(" ");
        // Try to extract fields
        const match = restStr.match(
          /High Water Level: ([\d.]+)% \| Action: ([^|]+) \| Duration: ([^|]+) \| (Resolved|Active)/,
        );
        if (match) {
          return {
            datetime: `${datetime} ${time}`,
            level: match[1],
            action: match[2],
            duration: match[3],
            status: match[4],
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  // Load alarm log on mount and on refresh
  function refreshAlarmHistory() {
    setAlarmHistory(parseLogAlarm(logAlarmRaw));
  }

  return (
    <>
      {/* Tempo routes */}
      {import.meta.env.VITE_TEMPO && useRoutes(routes)}

      <div className="main-bg">
        <nav className="navbar">
          <div className="navbar-title">ESP32 Water Management System</div>
          <div className="navbar-tabs">
            <button
              className={activeTab === "Dashboard" ? "active" : ""}
              onClick={() => setActiveTab("Dashboard")}
            >
              Dashboard
            </button>
            <button
              className={activeTab === "Settings" ? "active" : ""}
              onClick={() => setActiveTab("Settings")}
            >
              Settings
            </button>
            <button
              className={activeTab === "Logs" ? "active" : ""}
              onClick={() => setActiveTab("Logs")}
            >
              Logs
            </button>
          </div>
        </nav>
        {activeTab === "Dashboard" && (
          <div className="dashboard-grid">
            <section className="card water-level-card">
              <div className="section-title">Water Level Monitor</div>
              <div className="section-desc">
                Current and historical water levels
                <div className="connection-status">
                  <span
                    className={`status-indicator ${isConnected ? "connected" : "disconnected"}`}
                  ></span>
                  {isConnected ? "Connected" : "Disconnected"}
                </div>
              </div>
              <div className="chart-controls">
                <button
                  className="btn"
                  onClick={refreshNivelHistory}
                  disabled={isLoading}
                >
                  {isLoading ? "Loading..." : "Refresh History"}
                </button>
                {nivel !== null && (
                  <div
                    className="level-status-badge"
                    style={{
                      backgroundColor: getWaterLevelStatus(nivel).color,
                    }}
                  >
                    {getWaterLevelStatus(nivel).status}
                  </div>
                )}
              </div>
              <div className="chart-container">
                {isLoading && nivelHistory.length === 0 ? (
                  <div className="chart-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading water level data...</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart
                      data={nivelHistory}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <XAxis
                        dataKey="time"
                        minTickGap={50}
                        tick={{ fontSize: 12 }}
                        axisLine={{ stroke: "#e9e9e7" }}
                        tickLine={{ stroke: "#e9e9e7" }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 12 }}
                        axisLine={{ stroke: "#e9e9e7" }}
                        tickLine={{ stroke: "#e9e9e7" }}
                        // removed invalid grid prop
                      />
                      <Tooltip
                        formatter={(v: number) => [`${v}%`, "Water Level"]}
                        labelFormatter={(label) => `Time: ${label}`}
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e9e9e7",
                          borderRadius: "6px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#2383e2"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: "#2383e2" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="current-reading">
                <div className="current-value">
                  {nivel !== null ? `${nivel}%` : "--"}
                </div>
                <div className="current-label">Current Water Level</div>
                {nivelHistory.length > 1 && (
                  <div className="trend-indicator">
                    {nivelHistory[nivelHistory.length - 1].value >
                    nivelHistory[nivelHistory.length - 2].value
                      ? "↗"
                      : "↘"}
                    Trend:{" "}
                    {nivelHistory[nivelHistory.length - 1].value >
                    nivelHistory[nivelHistory.length - 2].value
                      ? "Rising"
                      : "Falling"}
                  </div>
                )}
              </div>
            </section>
            <section className="card prediction-card">
              <div className="section-title">AI Water Level Forecast</div>
              <div className="section-desc">
                AI-powered 24-hour water level forecast
                <button
                  className="btn"
                  style={{
                    marginLeft: "1rem",
                    fontSize: "0.85em",
                    padding: "0.3rem 0.8rem",
                  }}
                  onClick={fetchWaterLevelPrediction}
                  disabled={predictionLoading}
                >
                  {predictionLoading ? "Analyzing..." : "Refresh Forecast"}
                </button>
              </div>

              {predictionLoading && (
                <div className="prediction-loading">
                  <div className="loading-spinner"></div>
                  <p>Analyzing water patterns...</p>
                </div>
              )}

              {prediction && !predictionLoading && (
                <div className="prediction-content">
                  <div className="prediction-main">
                    <div className="prediction-level">
                      <div
                        className="prediction-value"
                        style={{
                          color:
                            prediction.futureLevel <= 15
                              ? "#e03e3e"
                              : prediction.futureLevel <= 25
                                ? "#f59e0b"
                                : "#10b981",
                        }}
                      >
                        {prediction.futureLevel}%
                      </div>
                      <div className="prediction-label">
                        Predicted Level in {prediction.timeToReach}
                      </div>
                      <div className="prediction-confidence">
                        Confidence: {prediction.confidence}% | Risk Level: {" "}
                        {prediction.riskLevel}/10
                      </div>
                    </div>

                    <div className="prediction-trend">
                      {nivel !== null && (
                        <div className="trend-comparison">
                          <span className="current-level">
                            Current: {nivel}%
                          </span>
                          <span
                            className="trend-arrow"
                            style={{
                              color:
                                prediction.futureLevel > nivel
                                  ? "#f59e0b"
                                  : "#10b981",
                            }}
                          >
                            {prediction.futureLevel > nivel ? "↗" : "↘"}
                          </span>
                          <span className="change-amount">
                            {prediction.futureLevel > nivel ? "+" : ""}
                            {(prediction.futureLevel - nivel).toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="prediction-insights">
                      <div className="insight-item">
                        <strong>Weather Impact:</strong> {prediction.weatherImpact}
                      </div>
                      <div className="insight-item">
                        <strong>Seasonal Trend:</strong> {prediction.seasonalTrend}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`prediction-alert ${prediction.severity} ${prediction.actionRequired ? "action-required" : ""}`}
                  >
                    <div className="alert-content">
                      <div className="alert-header">
                        <strong>
                          {prediction.actionRequired
                            ? "ACTION REQUIRED"
                            : "Recommendation"}
                          :
                        </strong>
                        {prediction.actionRequired && (
                          <span className="action-badge">URGENT</span>
                        )}
                      </div>
                      <p>{prediction.recommendation}</p>
                    </div>
                  </div>
                </div>
              )}

              {!prediction && !predictionLoading && (
                <div className="prediction-placeholder">
                  <p>Initializing AI forecast system...</p>
                  <p style={{ fontSize: "0.9em", color: "#888" }}>
                    Analyzing water patterns and environmental factors
                  </p>
                </div>
              )}
            </section>
            <section className="card controls-card">
              <div className="section-title">Manual Controls</div>
              <div className="section-desc">
                Override automatic system controls
              </div>
              <div className="controls-row">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={modoManual}
                    onChange={() => setModoManual(!modoManual)}
                  />
                  <span className="slider"></span>
                </label>
                <span>{modoManual ? "Manual Mode" : "Automatic Mode"}</span>
              </div>
              <div className="controls-grid">
                <div>
                  <div
                    style={{
                      marginBottom: "0.5rem",
                      fontWeight: "600",
                      fontSize: "0.875rem",
                    }}
                  >
                    Gate Control
                  </div>
                  <div className="controls-row" style={{ marginBottom: "0" }}>
                    <button
                      className={`btn${manualServo === 0 ? " active" : ""}`}
                      disabled={!modoManual}
                      onClick={() => setManualServo(0)}
                    >
                      Servo: {servoLabels[0]}
                    </button>
                    <button
                      className={`btn${manualServo === 1 ? " active" : ""}`}
                      disabled={!modoManual}
                      onClick={() => setManualServo(1)}
                    >
                      Servo: {servoLabels[1]}
                    </button>
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      marginBottom: "0.5rem",
                      fontWeight: "600",
                      fontSize: "0.875rem",
                    }}
                  >
                    Alerts
                  </div>
                  <div className="controls-row" style={{ marginBottom: "0" }}>
                    <button
                      className={`btn${manualLed === 0 ? " active" : ""}`}
                      disabled={!modoManual}
                      onClick={() => setManualLed(0)}
                    >
                      LED: {ledLabels[0]}
                    </button>
                    <button
                      className={`btn${manualLed === 1 ? " active" : ""}`}
                      disabled={!modoManual}
                      onClick={() => setManualLed(1)}
                    >
                      LED: {ledLabels[1]}
                    </button>
                    <button
                      className={`btn${manualLed === 2 ? " active" : ""}`}
                      disabled={!modoManual}
                      onClick={() => setManualLed(2)}
                    >
                      LED: {ledLabels[2]}
                    </button>
                    <button
                      className={`btn${manualBuzzer === 0 ? " active" : ""}`}
                      disabled={!modoManual}
                      onClick={() => setManualBuzzer(0)}
                    >
                      Buzzer: {buzzerLabels[0]}
                    </button>
                    <button
                      className={`btn${manualBuzzer === 1 ? " active" : ""}`}
                      disabled={!modoManual}
                      onClick={() => setManualBuzzer(1)}
                    >
                      Buzzer: {buzzerLabels[1]}
                    </button>
                  </div>
                </div>
              </div>
            </section>
            <section className="card auto-settings-card">
              <div className="section-title">
                Automatic Response Configuration
              </div>
              <div className="section-desc">
                Define system responses for different water level ranges
              </div>
              {[0, 1, 2, 3, 4].map((levelIdx) => {
                // Level ranges and labels
                const levelRanges = [
                  { label: "≤ 10%", desc: "Critical", color: "#e03e3e" },
                  { label: "11-15%", desc: "High Risk", color: "#f59e0b" },
                  { label: "16-20%", desc: "Caution", color: "#f59e0b" },
                  { label: "21-30%", desc: "Normal", color: "#10b981" },
                  { label: "> 30%", desc: "Safe", color: "#10b981" },
                ];
                const level = autoLevels[levelIdx];
                return (
                  <div key={levelIdx} className="auto-level-row">
                    <div className="auto-level-label">
                      <span
                        style={{
                          color: levelRanges[levelIdx].color,
                          fontWeight: "700",
                        }}
                      >
                        {levelRanges[levelIdx].label}
                      </span>{" "}
                      <span
                        style={{
                          color: "#787774",
                          fontSize: "0.875rem",
                          marginLeft: "0.5rem",
                        }}
                      >
                        {levelRanges[levelIdx].desc}
                      </span>
                    </div>
                    <div
                      className="controls-row"
                      style={{ marginTop: "0.5rem" }}
                    >
                      <button
                        className="btn"
                        disabled={!modoManual}
                        onClick={() =>
                          updateAutoLevel(
                            levelIdx,
                            "servo",
                            (level.servo + 1) % 2,
                          )
                        }
                      >
                        Gate: {servoLabels[level.servo]}
                      </button>
                      <button
                        className="btn"
                        disabled={!modoManual}
                        onClick={() =>
                          updateAutoLevel(levelIdx, "led", (level.led + 1) % 3)
                        }
                      >
                        LED: {ledLabels[level.led]}
                      </button>
                      <button
                        className="btn"
                        disabled={!modoManual}
                        onClick={() =>
                          updateAutoLevel(
                            levelIdx,
                            "buzzer",
                            (level.buzzer + 1) % 2,
                          )
                        }
                      >
                        Buzzer: {buzzerLabels[level.buzzer]}
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>
            <section className="card alarm-history-card">
              <div className="section-title">Alarm History</div>
              <div className="section-desc">Recent alarm events</div>
              <button
                className="btn"
                style={{ marginBottom: "1rem" }}
                onClick={refreshAlarmHistory}
              >
                Refresh
              </button>
              {alarmHistory.length === 0 && (
                <div style={{ color: "#888" }}>No alarm events.</div>
              )}
              {alarmHistory.map((alarm, idx) => (
                <div className="alarm-item" key={idx}>
                  <b>High Water Level Alert</b>
                  <div className="alarm-details">
                    Water Level: {alarm.level}% | Action: {alarm.action}
                  </div>
                  <div className="alarm-details">
                    {alarm.datetime}{" "}
                    <span
                      className={alarm.status === "Resolved" ? "resolved" : ""}
                    >
                      {alarm.status}
                    </span>{" "}
                    <span className="duration">Duration: {alarm.duration}</span>
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}
        {activeTab === "Settings" && (
          <div className="card" style={{ marginTop: "2rem" }}>
            Settings page (to be implemented)
          </div>
        )}
        {activeTab === "Logs" && (
          <div className="card" style={{ marginTop: "2rem" }}>
            Logs page (to be implemented)
          </div>
        )}
      </div>
    </>
  );
}

export default App;
