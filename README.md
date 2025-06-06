# MQTT Client (Unisinos)

A simple MQTT client for monitoring and controlling water level sensors, with logging and status publishing. Built with React and TypeScript.

## Features
- Connects to a public MQTT broker (HiveMQ)
- Subscribes to water level and status topics
- Publishes status updates only when changes occur
- Logs water level changes to `log_nivel.txt` only if the change is greater than 2 cm
- Manual and automatic control modes for actuators (servo, LED, buzzer)
- Displays recent water level history

## Project Structure
```
├── src/
│   ├── App.tsx           # Main React app
│   ├── useMqtt.ts        # MQTT logic and hooks
│   └── ...
├── log_nivel.txt         # Water level log
├── log_alarm.txt         # Alarm log (if used)
├── package.json
├── README.md
└── ...
```

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### Install dependencies
```sh
npm install
```

### Run the app
```sh
npm run dev
```

Open your browser at the URL shown in the terminal (usually http://localhost:5173).

## Usage
- The app will connect to the MQTT broker and listen for messages on the configured topics.
- Water level changes are displayed and logged if the change is more than 2 cm.
- Status is published to the MQTT topic only if it changes.
- You can switch between manual and automatic modes in the UI (if implemented).

## Configuration
- MQTT broker URL and topic names are set in `src/useMqtt.ts`.
- Logging is simulated in the browser (see comments in `appendNivelLog`). For real logging, integrate with a backend or Node.js environment.

## License
MIT
