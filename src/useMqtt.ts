import { useEffect, useRef, useState } from 'react';
import mqtt from 'mqtt';
// @ts-ignore
import logNivelRaw from '../log_nivel.txt?raw';

const BROKER_URL = 'wss://broker.hivemq.com:8884/mqtt';
const TOPICO_NIVEL = 'topic_sensor_uni';
const TOPICO_STATUS = 'topic_status_uni';

function parseLogNivel(logText: string) {
  // Parse lines like: YYYY-MM-DD HH:MM:SS <nivel>
  return logText.split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const [date, time, value] = line.split(' ');
      return {
        time: `${date} ${time}`,
        value: Number(value)
      };
    });
}

function elaborarStatus(nivel: number) {
  let servo = 1, led = 0, buzzer = 0;
  if (nivel <= 10) {
    servo = 0; led = 3; buzzer = 2;
  } else if (nivel <= 15) {
    servo = 1; led = 2; buzzer = 1;
  } else if (nivel <= 20) {
    servo = 1; led = 1; buzzer = 0;
  } else if (nivel <= 30) {
    servo = 1; led = 0; buzzer = 0;
  } else {
    servo = 1; led = 0; buzzer = 0;
  }
  return { servo, led, buzzer };
}

export function useMqtt() {
  const clientRef = useRef<any>(null);
  const [nivel, setNivel] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('');
  const [nivelHistory, setNivelHistory] = useState<{time: string, value: number}[]>([]);
  // Track last values
  const ultimoNivel = useRef<number | null>(null);
  const ultimoServo = useRef<number | null>(null);
  const ultimoLed = useRef<number | null>(null);
  const ultimoBuzzer = useRef<number | null>(null);
  // Manual mode state
  const [modoManual, setModoManual] = useState(false);
  const [manualServo, setManualServo] = useState(1);
  const [manualLed, setManualLed] = useState(0);
  const [manualBuzzer, setManualBuzzer] = useState(0);
  // Track last published status
  const lastPublishedStatus = useRef<string | null>(null);
  // Track last logged nivel
  const lastLoggedNivel = useRef<number | null>(null);

  // Helper to append to log_nivel.txt (browser: simulate, node: real append)
  function appendNivelLog(value: number) {
    const now = new Date();
    const line = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${now.toTimeString().slice(0,8)} ${value.toFixed(1)}\n`;
    // In browser, you can't write to file system directly. In Node, use fs.appendFileSync.
    // Here, you may want to send this to a backend or use an API.
    // For now, just log to console as a placeholder.
    console.log('[LOG_NIVEL]', line.trim());
  }

  useEffect(() => {
    const client = mqtt.connect(BROKER_URL);
    clientRef.current = client;

    client.on('connect', () => {
      client.subscribe([TOPICO_NIVEL, TOPICO_STATUS]);
    });

    client.on('message', (topic, message) => {
      if (topic === TOPICO_NIVEL && !modoManual) {
        const value = Number(message.toString());
        setNivel(value);
        setNivelHistory((prev) => [...prev.slice(-49), { time: new Date().toLocaleTimeString(), value }]);
        // Only log if changed by more than 2cm
        if (lastLoggedNivel.current === null || Math.abs(value - lastLoggedNivel.current) > 2) {
          appendNivelLog(value);
          lastLoggedNivel.current = value;
        }
        const { servo, led, buzzer } = elaborarStatus(value);
        const statusStr = `servo:${servo},led:${led},buzzer:${buzzer},modo:auto`;
        // Only publish if status changed
        if (lastPublishedStatus.current !== statusStr) {
          client.publish(TOPICO_STATUS, statusStr);
          lastPublishedStatus.current = statusStr;
        }
        ultimoNivel.current = value;
        ultimoServo.current = servo;
        ultimoLed.current = led;
        ultimoBuzzer.current = buzzer;
      } else if (modoManual) {
        // Always send manual status if changed
        const statusStr = `servo:${manualServo},led:${manualLed},buzzer:${manualBuzzer},modo:manual`;
        if (lastPublishedStatus.current !== statusStr) {
          client.publish(TOPICO_STATUS, statusStr);
          lastPublishedStatus.current = statusStr;
        }
      }
      if (topic === TOPICO_STATUS) {
        setStatus(message.toString());
      }
    });

    return () => {
      client.end();
    };
  }, [modoManual, manualServo, manualLed, manualBuzzer]);

  // Remove auto-loading of log file on mount
  // Add a function to refresh history on demand
  function refreshNivelHistory() {
    const allHistory = parseLogNivel(logNivelRaw);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    setNivelHistory(
      allHistory.filter(entry => {
        const entryDate = new Date(entry.time);
        return entryDate >= oneWeekAgo;
      })
    );
  }

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
    client: clientRef.current
  };
}
