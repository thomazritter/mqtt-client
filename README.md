# Sistema de Gerenciamento de Água ESP32

Este sistema monitora e controla o nível de água em reservatórios usando React, TypeScript e MQTT. Ele oferece monitoramento em tempo real, previsão inteligente, controle automático e manual, além de histórico de eventos e alarmes.

## Funcionalidades

- **Monitoramento em tempo real:** Exibe o nível de água atual e histórico em gráficos.
- **Previsão com IA:** Mostra previsão do nível de água para as próximas 24h, considerando tendências e clima.
- **Controle automático:** Respostas automáticas configuráveis para diferentes faixas de nível de água (abrir/fechar comporta, LED, buzzer).
- **Modo manual:** Permite controle direto dos atuadores pelo usuário.
- **Histórico e alarmes:** Registra eventos de alarme e mudanças de status em arquivos de log.
- **Interface amigável:** Dashboard moderno, fácil de usar e responsivo.

## Como usar

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
3. Acesse no navegador o endereço exibido no terminal (ex: http://localhost:5173)

## Estrutura dos arquivos principais

- `src/App.tsx`: Interface principal do dashboard.
- `src/useMqtt.ts`: Lógica de comunicação MQTT e controle dos atuadores.
- `src/log_nivel.txt`: Log de níveis de água.
- `src/log_status.txt`: Log de mudanças de status dos atuadores.
- `src/log_alarm.txt`: Log de alarmes.

## Configuração

- O sistema usa o broker público HiveMQ para MQTT.
- A chave da API do clima Tomorrow.io deve ser definida no arquivo `.env`.

## Modos de operação

- **Automático:** O sistema reage sozinho conforme as faixas de nível configuradas.
- **Manual:** O usuário pode acionar/desligar comporta, LED e buzzer manualmente.

## Observações

- Os arquivos de log são atualizados automaticamente a cada evento relevante.
- O sistema é compatível com desktop e dispositivos móveis.

---
Desenvolvido para monitoramento e automação de reservatórios de água com ESP32.
