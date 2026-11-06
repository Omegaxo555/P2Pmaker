# P2P Flow AI ⚡
> Herramienta de análisis y registro P2P para Binance (USDT ↔ VES), con Next.js, Neo4j opcional y Google Gemini AI.

---

## 🚀 Arquitectura y Tecnologías

- **Frontend & Backend**: Next.js (App Router), React, Tailwind CSS.
- **Gráficas de Rendimiento**: Recharts.
- **Base de Datos de Grafos**: Neo4j (`neo4j-driver`) para modelar:
  - `(User)-[:PREFIERE {peso_exito, tiempo_promedio_min}]->(BankMethod)`
  - `(Trade)-[:USO_METODO]->(BankMethod)`
  - `(User)-[:EJECUTO]->(Trade)`
  - Restricciones bancarias diarias y reputación continua.
- **Mercado**: anuncios públicos de Binance P2P (`/bapi/c2c/v2/friendly/c2c/adv/search`).
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

# Neo4j Graph Database (requerido para persistencia en producción)
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=tu_password
DEFAULT_USER_ID=usr_123
DEFAULT_USER_NAME=Trader

# Capital inicial opcional para el cálculo estimado del panel
INITIAL_CAPITAL_USDT=0
```

Sin Neo4j, la app opera en memoria temporal: las órdenes pueden perderse al reiniciar o cambiar de instancia. El panel lo indica; configura Neo4j antes de usarla en producción. El capital inicial debe corresponder al valor que quieras usar como base de cálculo.

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
- `POST /api/neo4j/trade`: Registra una orden finalizada.
- `PUT /api/neo4j/trade`: Edita una orden existente y actualiza sus vínculos en el grafo.
- `PUT /api/neo4j/method-limit`: Guarda el tope diario operativo personal para un método de pago.

La sección **Mercado y pagos** agrega los métodos vistos en los primeros 50 anuncios de compra y venta, junto con el menor mínimo y el mayor máximo publicados por esos anuncios para cada método. Son importes por anuncio, no límites universales de Binance ni límites propios del banco; pueden cambiar de una consulta a otra. La comisión se registra por orden y también puede ajustarse en la calculadora.

En **Resumen → Consumo por método registrado**, selecciona un método y escribe **Tu tope diario (VES)** para guardar el límite que quieres usar en esta app. Con Neo4j se conserva en `BankMethod.limite_diario_maximo_ves`; sin Neo4j solo se guarda en memoria del proceso. Este valor es un límite operativo personal y no consulta ni cambia el límite de tu cuenta bancaria.

---

## 🛡️ Reglas y Protocolos Integrados
1. Los rangos del mercado son dinámicos y deben confirmarse en el anuncio antes de operar.
2. El spread visible es bruto; la calculadora acepta una comisión editable para estimar el ciclo.
3. Las órdenes y pagos deben respetar las reglas de Binance y del proveedor de pago.
