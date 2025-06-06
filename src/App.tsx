import './App.css';
import { useMqtt } from './useMqtt';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';

// @ts-ignore
import logAlarmRaw from '../log_alarm.txt?raw';

function App() {
  const {
    nivel, status, nivelHistory,
    modoManual, setModoManual,
    manualServo, setManualServo,
    manualLed, setManualLed,
    manualBuzzer, setManualBuzzer,
    refreshNivelHistory
  } = useMqtt();
  const [activeTab, setActiveTab] = useState('Dashboard');

  // Automatic control settings for each level (servo, led, buzzer)
  const [autoLevels, setAutoLevels] = useState([
    { servo: 0, led: 3, buzzer: 2 }, // <= 10
    { servo: 1, led: 2, buzzer: 1 }, // 11-15
    { servo: 1, led: 1, buzzer: 0 }, // 16-20
    { servo: 1, led: 0, buzzer: 0 }, // 21-30
    { servo: 1, led: 0, buzzer: 0 }, // > 30
  ]);

  // Alarm log state
  const [alarmHistory, setAlarmHistory] = useState<any[]>([]);

  // Helper labels for display
  const servoLabels = ['Aberto', 'Fechado'];
  const ledLabels = ['Desligado', 'Ligado', 'Piscante', 'Piscante Forte'];
  const buzzerLabels = ['Desligado', 'Tocando', 'Apitando'];

  // Handler to update a specific level's setting
  function updateAutoLevel(levelIdx: number, key: 'servo'|'led'|'buzzer', nextValue: number) {
    setAutoLevels(levels => levels.map((l, i) =>
      i === levelIdx ? { ...l, [key]: nextValue } : l
    ));
  }

  // Helper to parse alarm log
  function parseLogAlarm(logText: string) {
    // Example line: 2025-06-05 18:00:00 High Water Level: 85.2% | Action: Gate Opened | Duration: 45 min | Resolved
    return logText.split('\n')
      .filter(line => line && !line.startsWith('#'))
      .map(line => {
        // Split by | and extract fields
        const [datetime, rest] = line.split(' ', 2);
        const [time, ...restArr] = rest ? rest.split(' ') : ['',''];
        const restStr = restArr.join(' ');
        // Try to extract fields
        const match = restStr.match(/High Water Level: ([\d.]+)% \| Action: ([^|]+) \| Duration: ([^|]+) \| (Resolved|Active)/);
        if (match) {
          return {
            datetime: `${datetime} ${time}`,
            level: match[1],
            action: match[2],
            duration: match[3],
            status: match[4]
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
    <div className="main-bg">
      <nav className="navbar">
        <div className="navbar-title">ESP32 Water Management System</div>
        <div className="navbar-tabs">
          <button className={activeTab === 'Dashboard' ? 'active' : ''} onClick={() => setActiveTab('Dashboard')}>Dashboard</button>
          <button className={activeTab === 'Settings' ? 'active' : ''} onClick={() => setActiveTab('Settings')}>Settings</button>
          <button className={activeTab === 'Logs' ? 'active' : ''} onClick={() => setActiveTab('Logs')}>Logs</button>
        </div>
      </nav>
      {activeTab === 'Dashboard' && (
        <div className="dashboard-grid">
          <section className="card water-level-card">
            <div className="section-title">
              <span role="img" aria-label="water">💧</span> Water Level Monitor
            </div>
            <div className="section-desc">Current and historical water levels</div>
            <button className="btn" style={{marginBottom: '1rem'}} onClick={refreshNivelHistory}>Refresh</button>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={nivelHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="time" minTickGap={30} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Line type="monotone" dataKey="value" stroke="#007bff" dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="current-label">Current: {nivel !== null ? `${nivel}%` : 'Loading...'}</div>
          </section>
          <section className="card controls-card">
            <div className="section-title">Manual Controls</div>
            <div className="section-desc">Control gate and alarm manually</div>
            <div className="controls-row">
              <label className="switch">
                <input type="checkbox" checked={modoManual} onChange={() => setModoManual(!modoManual)} />
                <span className="slider"></span>
              </label>
              <span>Automatic Mode</span>
            </div>
            <div className="controls-row">
              <button className={`btn${manualServo === 0 ? ' active' : ''}`} disabled={!modoManual} onClick={() => setManualServo(0)}>Open</button>
              <button className={`btn${manualServo === 1 ? ' active' : ''}`} disabled={!modoManual} onClick={() => setManualServo(1)}>Close</button>
            </div>
            <div className="controls-row">
              <button className={`btn${manualLed === 1 ? ' active' : ''}`} disabled={!modoManual} onClick={() => setManualLed((manualLed + 1) % 4)}>
                LED: {manualLed}
              </button>
              <button className={`btn${manualBuzzer === 1 ? ' active' : ''}`} disabled={!modoManual} onClick={() => setManualBuzzer((manualBuzzer + 1) % 3)}>
                Buzzer: {manualBuzzer}
              </button>
            </div>
          </section>
          <section className="card auto-settings-card">
            <div className="section-title">Automatic Control Settings</div>
            <div className="section-desc">Configure automatic responses for each level</div>
            {[0, 1, 2, 3, 4].map((levelIdx) => {
              // Level ranges and labels
              const levelRanges = [
                { label: '<= 10', desc: 'Crítico' },
                { label: '11 - 15', desc: 'Alto' },
                { label: '16 - 20', desc: 'Atenção' },
                { label: '21 - 30', desc: 'Normal' },
                { label: '> 30', desc: 'Seguro' }
              ];
              const level = autoLevels[levelIdx];
              return (
                <div key={levelIdx} className="auto-level-row">
                  <div className="auto-level-label">
                    <b>Nível {levelIdx + 1}</b> <span>({levelRanges[levelIdx].label})</span> <span style={{color:'#888', fontSize:'0.95em'}}> {levelRanges[levelIdx].desc}</span>
                  </div>
                  <div className="controls-row">
                    <button className="btn" onClick={() => updateAutoLevel(levelIdx, 'servo', (level.servo + 1) % 2)}>
                      Servo: {servoLabels[level.servo]}
                    </button>
                    <button className="btn" onClick={() => updateAutoLevel(levelIdx, 'led', (level.led + 1) % 4)}>
                      LED: {ledLabels[level.led]}
                    </button>
                    <button className="btn" onClick={() => updateAutoLevel(levelIdx, 'buzzer', (level.buzzer + 1) % 3)}>
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
            <button className="btn" style={{marginBottom: '1rem'}} onClick={refreshAlarmHistory}>Refresh</button>
            {alarmHistory.length === 0 && <div style={{color:'#888'}}>No alarm events.</div>}
            {alarmHistory.map((alarm, idx) => (
              <div className="alarm-item" key={idx}>
                <span role="img" aria-label="alarm">🔔</span> <b>High Water Level</b>
                <div className="alarm-details">Water Level: {alarm.level}% | Action: {alarm.action}</div>
                <div className="alarm-details">{alarm.datetime} <span className={alarm.status === 'Resolved' ? 'resolved' : ''}>{alarm.status}</span> <span className="duration">Duration: {alarm.duration}</span></div>
              </div>
            ))}
          </section>
        </div>
      )}
      {activeTab === 'Settings' && (
        <div className="card" style={{marginTop: '2rem'}}>Settings page (to be implemented)</div>
      )}
      {activeTab === 'Logs' && (
        <div className="card" style={{marginTop: '2rem'}}>Logs page (to be implemented)</div>
      )}
    </div>
  );
}

export default App;
