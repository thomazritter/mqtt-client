# ESP32 Water Management System

A comprehensive water level monitoring and control system built with React, TypeScript, and MQTT. This application provides real-time water level monitoring, intelligent forecasting, automated control systems, and manual override capabilities for water management infrastructure.

## System Overview

The ESP32 Water Management System is designed to monitor and control water levels in reservoirs, tanks, or other water storage systems. It combines real-time sensor data with AI-powered forecasting to provide proactive water management capabilities.

### Key Components

1. **Real-time Monitoring**: Continuous water level tracking via MQTT communication
2. **AI Forecasting**: Predictive analytics for water level trends and risk assessment
3. **Automated Control**: Intelligent gate, LED, and buzzer control based on water levels
4. **Manual Override**: Complete manual control when automatic systems need to be bypassed
5. **Historical Analysis**: Comprehensive logging and trend analysis
6. **Alert System**: Multi-level alarm system with configurable responses

## Features

### Water Level Monitoring
- Real-time water level display with percentage-based readings
- Historical data visualization using interactive charts
- Trend analysis showing rising or falling water levels
- Connection status monitoring for MQTT broker connectivity
- Smart data caching for improved performance

### AI-Powered Forecasting
- 24-hour water level predictions using historical data analysis
- Weather impact assessment and seasonal trend analysis
- Risk level scoring (1-10 scale) with confidence percentages
- Proactive recommendations for preventive actions
- Action-required alerts for critical situations

### Control Systems

#### Automatic Mode
- Five configurable water level ranges with custom responses:
  - Critical (≤ 10%): Emergency protocols
  - High Risk (11-15%): High alert status
  - Caution (16-20%): Warning protocols
  - Normal (21-30%): Standard operation
  - Safe (> 30%): Minimal intervention

#### Manual Override
- Complete manual control of all system components
- Gate control (Open/Close)
- LED alerts (Off, On, Blinking, Strong Blinking)
- Buzzer control (Off, Sounding, Beeping)
- Easy toggle between automatic and manual modes

### Logging and History
- Automatic logging of water level changes (threshold: >2cm difference)
- Alarm event history with timestamps and resolution status
- Action duration tracking for maintenance planning
- Exportable log data for analysis

## Technical Architecture

### Frontend (React + TypeScript)
- **App.tsx**: Main application component with dashboard layout
- **useMqtt.ts**: MQTT communication hook with connection management
- **App.css**: Responsive design system optimized for desktop and mobile

### MQTT Communication
- Connects to HiveMQ public broker for real-time data exchange
- Subscribes to water level and system status topics
- Publishes control commands and status updates
- Automatic reconnection handling for network interruptions

### Data Management
- Local state management for real-time data
- Historical data caching with smart refresh mechanisms
- Log file integration for persistent storage
- Predictive model data processing

## Installation and Setup

### Prerequisites
- Node.js (v18 or higher)
- npm, yarn, pnpm, or bun package manager
- Modern web browser with JavaScript enabled

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd esp32-water-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   Open your browser and navigate to the URL shown in the terminal (typically http://localhost:5173)

## Configuration

### MQTT Settings
MQTT broker configuration is located in `src/useMqtt.ts`:
- Broker URL: Configurable MQTT broker endpoint
- Topic subscriptions: Water level and status topics
- Publishing topics: Control commands and system status
- Connection parameters: Keep-alive, clean session, and reconnection settings

### System Thresholds
Water level thresholds and responses can be configured in the automatic control settings:
- Critical level actions (emergency protocols)
- Warning level responses (preventive measures)
- Normal operation parameters
- Safe level minimal interventions

### Logging Configuration
- Water level change threshold: 2cm minimum difference
- Log file locations: `log_nivel.txt` and `log_alarm.txt`
- Timestamp format: ISO 8601 standard
- Data retention policies: Configurable in system settings

## User Interface

### Dashboard Layout
The main dashboard is organized into six primary sections:

1. **Water Level Monitor**: Real-time level display with historical charts
2. **AI Forecast**: Predictive analytics and recommendations
3. **Manual Controls**: Override switches and manual operation buttons
4. **Automatic Settings**: Configuration for automated responses
5. **Alarm History**: Recent alerts and their resolution status
6. **System Status**: Connection monitoring and system health

### Navigation
- **Dashboard**: Main monitoring and control interface
- **Settings**: System configuration and preferences
- **Logs**: Detailed historical data and event logs

### Responsive Design
The interface adapts to different screen sizes:
- Desktop: Three-column layout for maximum information density
- Tablet: Two-column layout with reorganized components
- Mobile: Single-column stack for optimal touch interaction

## Operational Modes

### Automatic Mode (Default)
- System monitors water levels continuously
- Automated responses based on configured thresholds
- Predictive actions based on AI forecasting
- Minimal user intervention required

### Manual Mode
- Complete user control over all system components
- Override all automatic functions
- Direct gate, LED, and buzzer control
- Emergency operation capability

## Monitoring and Alerts

### Water Level Categories
- **Critical (Red)**: Immediate action required
- **High Risk (Orange)**: Elevated monitoring needed
- **Caution (Yellow)**: Increased attention recommended
- **Normal (Green)**: Standard operation
- **Safe (Blue)**: Optimal conditions

### Alert Types
- **Visual**: LED indicators with multiple flash patterns
- **Audio**: Buzzer alerts with different sound patterns
- **System**: Automated gate control responses
- **Notifications**: Dashboard alerts and recommendations

## Data Analysis

### Historical Trends
- Water level patterns over time
- Seasonal variations and weather correlations
- System response effectiveness analysis
- Maintenance scheduling optimization

### Predictive Analytics
- Machine learning-based water level forecasting
- Risk assessment algorithms
- Weather integration for improved predictions
- Proactive maintenance recommendations

## Troubleshooting

### Common Issues

**Connection Problems**
- Check MQTT broker availability
- Verify network connectivity
- Review firewall settings
- Confirm topic subscriptions

**Data Accuracy**
- Calibrate water level sensors
- Verify MQTT message format
- Check timestamp synchronization
- Review threshold configurations

**Control Issues**
- Confirm manual/automatic mode settings
- Check actuator connections
- Verify command publishing
- Review response configurations

### Performance Optimization
- Enable data caching for improved chart performance
- Adjust refresh intervals based on requirements
- Optimize MQTT message frequency
- Configure appropriate log retention policies

## Development and Customization

### Adding New Features
1. Extend the MQTT hook for additional data sources
2. Add new dashboard components for custom visualizations
3. Implement additional control algorithms
4. Integrate with external APIs for enhanced functionality

### Styling Customization
- Modify `src/App.css` for visual changes
- Update color schemes and themes
- Adjust responsive breakpoints
- Customize component layouts

### Data Integration
- Connect to different MQTT brokers
- Integrate with databases for persistent storage
- Add export functionality for data analysis
- Implement real-time notifications

## Security Considerations

- MQTT connection security (TLS/SSL)
- Authentication and authorization
- Data encryption for sensitive information
- Network security best practices
- Regular security updates and patches

## License

MIT License - See LICENSE file for details

## Support and Documentation

For additional support, feature requests, or bug reports, please refer to the project documentation or contact the development team.
