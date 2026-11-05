# P2P Flow AI ⚡
> Asistente Inteligente de Arbitraje P2P en Binance (USDT ↔ VES) con Memoria de Grafo Neo4j, Next.js (App Router) y Google Gemini AI.

---

## 🚀 Arquitectura y Tecnologías

- **Frontend & Backend**: Next.js 14+ (App Router), React 18, Tailwind CSS (Tema Dark Binance).
- **Gráficas de Rendimiento**: Recharts.
- **Base de Datos de Grafos**: Neo4j (`neo4j-driver`) para modelar:
  - `(User)-[:PREFIERE {peso_exito, tiempo_promedio_min}]->(BankMethod)`
  - `(Trade)-[:USO_METODO]->(BankMethod)`
  - `(User)-[:EJECUTO]->(Trade)`
  - Restricciones bancarias diarias y reputación continua.
- **Motor de Datos**: Binance P2P Unofficial Public API (`/bapi/c2c/v2/friendly/c2c/adv/search`).
- **Motor de Aprendizaje Continuo (RL/Memory)**: Google Gemini 2.0 Flash con System Prompt Maestro estructurado con doble salida (Narrativa Táctica + Bloque JSON normalizado para componentes React).

---

## 🛠️ Configuración e Inicialización

### 1. Variables de Entorno
Copia el archivo `.env.example` a `.env.local`:
```bash
cp .env.example .env.local
```

Configura tus credenciales:
```env
# Gemini API Key (Obligatorio para el Asistente AI)
GEMINI_API_KEY=tu_gemini_api_key

# Neo4j Graph Database (Opcional: Si no está activo usa fallback mock funcional)
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=tu_password
```

### 2. Instalación de Dependencias
```bash
npm install
```

### 3. Ejecutar en Modo Desarrollo
```bash
npm run dev
```
Abre en tu navegador [http://localhost:3000](http://localhost:3000) (redirige automáticamente a `/dashboard`).

---

## 📊 Endpoints API Implementados

- `POST /api/p2p-assistant`: Endpoint principal que compila libro de Binance en vivo + estado del grafo en Neo4j y consulta a Gemini retornando narrativa y JSON estructurado.
- `GET /api/binance/orderbook`: Consulta en tiempo real las órdenes de compra y venta para USDT/VES calculando el spread y precio medio.
- `GET /api/neo4j/user`: Retorna el perfil del usuario, métodos bancarios asociados y límites diarios disponibles.
- `POST /api/neo4j/trade`: Registra un trade finalizado y retroalimenta el peso de éxito del método de pago en el grafo.

---

## 🛡️ Reglas y Protocolos Integrados
1. **Comisión Maker Binance P2P**: 0.25% por orden.
2. **Fórmula Tasa Compra Máxima**: `Tasa_Venta_Actual / (1 + Margen_Deseado + 0.0025)`.
3. **Protocolo Titular a Titular**: Advertencia activa anti-triangulación en todas las recomendaciones.
