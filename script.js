const GROQ_API_KEY = "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";

const DISTRICT_NAME = "Алатауский";
const TIME_LABELS = [
  "08:00",
  "10:00",
  "12:00",
  "14:00",
  "16:00",
  "18:00",
  "20:00",
  "22:00",
  "00:00",
];

let currentMetrics = null;
let timeSeries = null;
let transportChart = null;
let ecoChart = null;

function generateWithPeak(hourIdx, baseMin, baseMax) {
  let peakMultiplier = 1.0;
  if (hourIdx === 0 || hourIdx === 1) peakMultiplier = 0.8;
  if (hourIdx === 2 || hourIdx === 3) peakMultiplier = 0.9;
  if (hourIdx === 4) peakMultiplier = 1.2;
  if (hourIdx === 5) peakMultiplier = 1.4;
  if (hourIdx === 6) peakMultiplier = 1.2;
  if (hourIdx === 7) peakMultiplier = 0.9;
  if (hourIdx === 8) peakMultiplier = 0.7;
  let value = baseMin + Math.random() * (baseMax - baseMin);
  value *= peakMultiplier;
  return Math.round(value * 10) / 10;
}

function generateTimeSeries() {
  let congestion = [],
    speed = [],
    aqi = [],
    pm25 = [];
  for (let i = 0; i < TIME_LABELS.length; i++) {
    let cong = generateWithPeak(i, 35, 65);
    cong = Math.min(95, cong);
    congestion.push(Math.round(cong));

    let speedBase = 55 - (congestion[i] - 35) * 0.4;
    speedBase = Math.max(18, Math.min(65, speedBase));
    let speedVar = (Math.random() - 0.5) * 6;
    let sp = speedBase + speedVar;
    speed.push(Math.round(sp * 10) / 10);

    let aq = generateWithPeak(i, 30, 60);
    aq = Math.min(120, aq);
    aqi.push(Math.round(aq));

    let pm = generateWithPeak(i, 10, 25);
    pm = Math.min(55, pm);
    pm25.push(Math.round(pm * 10) / 10);
  }
  return { congestion, speed, aqi, pm25 };
}

function generateCurrentMetrics() {
  const congestion = Math.floor(Math.random() * 100);
  let speed = 0;
  if (congestion < 35) speed = 45 + Math.random() * 25;
  else if (congestion < 65) speed = 30 + Math.random() * 20;
  else if (congestion < 75) speed = 20 + Math.random() * 12;
  else speed = 10 + Math.random() * 14;
  speed = Math.round(speed * 10) / 10;
  const cars = +(5 + Math.random() * 10).toFixed(1);
  const trafficIndex = +(1 + Math.random() * 9).toFixed(1);
  const publicLoad = Math.floor(40 + Math.random() * 55);
  const aqi = Math.floor(30 + Math.random() * 90);
  const pm25 = +(10 + Math.random() * 45).toFixed(1);
  const pm10 = +(20 + Math.random() * 55).toFixed(1);
  const no2 = +(10 + Math.random() * 45).toFixed(1);
  const co2 = 380 + Math.random() * 200;
  const noise = 45 + Math.random() * 40;
  return {
    congestion,
    speed,
    cars,
    trafficIndex,
    publicLoad,
    aqi,
    pm25,
    pm10,
    no2,
    co2,
    noise,
  };
}

function generateAllData() {
  currentMetrics = generateCurrentMetrics();
  timeSeries = generateTimeSeries();
}

function buildPromptForAI() {
  const m = currentMetrics;
  const ts = timeSeries;

  const maxCongestion = Math.max(...ts.congestion);
  const peakHourIndex = ts.congestion.indexOf(maxCongestion);
  const peakHour = TIME_LABELS[peakHourIndex];
  const morningAvg = (
    ts.congestion.slice(0, 3).reduce((a, b) => a + b, 0) / 3
  ).toFixed(0);
  const eveningAvg = (
    ts.congestion.slice(5, 7).reduce((a, b) => a + b, 0) / 2
  ).toFixed(0);

  return `Analyze district "${DISTRICT_NAME}" data and give mayor advice in RUSSIAN language.

CURRENT METRICS:
- Congestion: ${m.congestion}% (normal 35-65%, critical >75%)
- Speed: ${m.speed} km/h (normal 35-60, critical <25)
- Cars: ${m.cars}k (normal 5-10)
- Traffic index: ${m.trafficIndex}/10 (normal 2-5)
- Public load: ${m.publicLoad}% (normal 50-75)
- AQI: ${m.aqi} (normal 30-60, dangerous >85)
- PM2.5: ${m.pm25} (normal 10-25)
- PM10: ${m.pm10} (normal 20-40)
- NO2: ${m.no2} (normal 10-30)
- CO2: ${Math.round(m.co2)} ppm (normal 380-450)
- Noise: ${Math.round(m.noise)} dB (normal 50-60)

HOURLY DYNAMICS:
- Peak congestion: ${peakHour} (${maxCongestion}%)
- Morning avg (08:00-12:00): ${morningAvg}%
- Evening avg (18:00-20:00): ${eveningAvg}%

Answer in RUSSIAN language with this structure:

Ты должен давать ответ только на русском

🚨 Уровень приоритета: [Высокий/Средний/Низкий]

⚠️ Главная проблема:
[2-3 points]

💡 Рекомендации для руководства:
[3-5 specific points]

🔮 Прогноз на ближайшие два часа:
[Brief forecast]`;
}

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 3000;

async function getAIAdvice() {
  const container = document.getElementById("aiAdviceContainer");

  // Проверяем API ключ
  if (!GROQ_API_KEY || GROQ_API_KEY === "") {
    container.innerHTML = `
            <div class="ai-advice-content">
                <div class="advice-header" style="color: #d32f2f;">Подключи апи кей</div>
                <div style="padding: 16px;">Подключи апи кей</div>
            </div>
        `;
    return;
  }

  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;

  if (timeSinceLast < MIN_REQUEST_INTERVAL && lastRequestTime !== 0) {
    const waitSeconds = Math.ceil(
      (MIN_REQUEST_INTERVAL - timeSinceLast) / 1000,
    );
    container.innerHTML = `
            <div class="ai-advice-content">
                <div class="advice-header" style="color: #ed6c02;">⏳ Please wait ${waitSeconds} seconds</div>
                <div style="padding: 16px;">Groq free limit: 30 requests per minute.</div>
            </div>
        `;
    return;
  }

  lastRequestTime = now;

  container.innerHTML = `
        <div class="ai-advice-content">
            <div class="advice-header">🤖 Анализ данных...</div>
            <div style="text-align: center; padding: 40px;">
                <div class="loading-spinner"></div>
                <p style="margin-top: 16px;">Ожидание совета ИИ...</p>
            </div>
        </div>
    `;

  const prompt = buildPromptForAI();

  const requestBody = {
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "You are an expert urban management advisor for the mayor of Almaty. Answer in Russian language, be specific and actionable.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 1200,
  };

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (response.status === 429) {
      container.innerHTML = `
                <div class="ai-advice-content">
                    <div class="advice-header" style="color: #ed6c02;">⏳ Rate limit exceeded</div>
                    <div style="padding: 16px;">Groq free limit: 30 requests per minute. Please wait 1-2 minutes.</div>
                </div>
            `;
      return;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
      );
    }

    const data = await response.json();
    let aiResponse = "Unable to get response";

    if (data.choices && data.choices[0] && data.choices[0].message) {
      aiResponse = data.choices[0].message.content;
    } else {
      throw new Error("Unexpected API response format");
    }

    const formattedResponse = aiResponse
      .replace(/\n/g, "<br>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "• $1");

    container.innerHTML = `
            <div class="ai-advice-content">
                <div class="advice-header">
                    🎙️ ИИ-помощник для Акимата
                    <span style="font-size: 0.7rem; background: #f55036; color: white; padding: 2px 8px; border-radius: 20px;">Llama 3.3 70B</span>
                </div>
                <div style="line-height: 1.7; font-size: 0.95rem;">
                    ${formattedResponse}
                </div>
                <div style="margin-top: 16px; font-size: 0.7rem; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px;">
                    🤖 Generated by Groq AI • ${new Date().toLocaleString()}
                </div>
            </div>
        `;

    container.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    console.error("Groq API error:", error);
    container.innerHTML = `
            <div class="ai-advice-content">
                <div class="advice-header" style="color: #d32f2f;">⚠️ Groq API Error</div>
                <div style="padding: 16px;">
                    <p><strong>Error:</strong> ${error.message}</p>
                    <p style="margin-top: 16px;">Possible solutions:</p>
                    <ul style="margin-left: 20px;">
                        <li>Check your API key in script.js (must start with "gsk_")</li>
                        <li>Check your internet connection</li>
                        <li>Try again in a few seconds</li>
                    </ul>
                    <p style="margin-top: 16px;">
                        <a href="https://console.groq.com/keys" target="_blank" style="color: #f55036;">
                            Manage Groq API Keys →
                        </a>
                    </p>
                </div>
            </div>
        `;
  }
}

function renderKPI() {
  const m = currentMetrics;
  const kpiGrid = document.getElementById("kpiGrid");
  if (!kpiGrid) return;

  const getColor = (val, greenMax, yellowMin) => {
    if (val <= greenMax) return "#2e7d32";
    if (val <= yellowMin) return "#ed6c02";
    return "#d32f2f";
  };

  const getColorInverse = (val, greenMin, yellowMin) => {
    if (val >= greenMin) return "#2e7d32";
    if (val >= yellowMin) return "#ed6c02";
    return "#d32f2f";
  };

  const items = [
    {
      label: "Пробки",
      value: `${m.congestion}%`,
      color: getColor(m.congestion, 65, 75),
    },
    {
      label: "Скорость потока",
      value: `${m.speed} km/h`,
      color: getColorInverse(m.speed, 35, 25),
    },
    { label: "Машины(тыс)", value: m.cars, color: getColor(m.cars, 10, 12) },
    {
      label: "Пробочный индекс",
      value: `${m.trafficIndex}/10`,
      color: getColor(m.trafficIndex, 5, 7),
    },
    {
      label: "Общественная нагрузка",
      value: `${m.publicLoad}%`,
      color: getColor(m.publicLoad, 75, 85),
    },
    { label: "AQI", value: m.aqi, color: getColor(m.aqi, 60, 85) },
    {
      label: "PM2.5",
      value: `${m.pm25} µg/m³`,
      color: getColor(m.pm25, 25, 35),
    },
    {
      label: "PM10",
      value: `${m.pm10} µg/m³`,
      color: getColor(m.pm10, 40, 50),
    },
    { label: "NO₂", value: `${m.no2} µg/m³`, color: getColor(m.no2, 30, 40) },
    {
      label: "CO₂",
      value: `${Math.round(m.co2)} ppm`,
      color: getColor(m.co2, 450, 500),
    },
    {
      label: "Шум (Дб)",
      value: `${Math.round(m.noise)} dB`,
      color: getColor(m.noise, 60, 70),
    },
  ];

  kpiGrid.innerHTML = items
    .map(
      (item) => `
        <div class="kpi-item">
            <div class="label">
                <span class="indicator" style="background: ${item.color}"></span>
                ${item.label}
            </div>
            <div class="value">${item.value}</div>
        </div>
    `,
    )
    .join("");
}

function destroyCharts() {
  if (transportChart) {
    transportChart.destroy();
    transportChart = null;
  }
  if (ecoChart) {
    ecoChart.destroy();
    ecoChart = null;
  }
}

function renderCharts() {
  const ctx1 = document.getElementById("transportChart");
  const ctx2 = document.getElementById("ecoChart");
  if (!ctx1 || !ctx2) return;

  destroyCharts();

  transportChart = new Chart(ctx1, {
    type: "line",
    data: {
      labels: TIME_LABELS,
      datasets: [
        {
          label: "Пробки (%)",
          data: timeSeries.congestion,
          borderColor: "#ed6c02",
          backgroundColor: "rgba(237,108,2,0.1)",
          tension: 0.3,
          fill: true,
          yAxisID: "y",
        },
        {
          label: "Скорость потока (km/h)",
          data: timeSeries.speed,
          borderColor: "#2e7d32",
          backgroundColor: "rgba(46,125,50,0.1)",
          tension: 0.3,
          fill: true,
          yAxisID: "y1",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: { mode: "index", intersect: false },
      scales: {
        y: {
          title: { display: true, text: "Congestion (%)" },
          min: 0,
          max: 100,
        },
        y1: {
          position: "right",
          title: { text: "Speed (km/h)" },
          min: 0,
          max: 80,
          grid: { drawOnChartArea: false },
        },
      },
    },
  });

  ecoChart = new Chart(ctx2, {
    type: "line",
    data: {
      labels: TIME_LABELS,
      datasets: [
        {
          label: "AQI",
          data: timeSeries.aqi,
          borderColor: "#d32f2f",
          backgroundColor: "rgba(211,47,47,0.1)",
          tension: 0.3,
          fill: true,
        },
        {
          label: "PM2.5 (µg/m³)",
          data: timeSeries.pm25,
          borderColor: "#1565c0",
          backgroundColor: "rgba(21,101,192,0.1)",
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: { title: { display: true, text: "Values" }, min: 0, max: 150 },
      },
    },
  });
}

function refreshAll() {
  generateAllData();
  renderKPI();
  renderCharts();
  const container = document.getElementById("aiAdviceContainer");
  if (container) {
    container.innerHTML = `<div class="ai-placeholder">Data updated. Click "Get AI Advice" for new analysis.</div>`;
  }
}

function addStyles() {
  const style = document.createElement("style");
  style.textContent = `
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e2e8f0;
            border-top: 3px solid #f55036;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        code {
            background: #f1f5f9;
            padding: 2px 6px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 0.85rem;
        }
        .ai-advice-content a {
            color: #f55036;
            text-decoration: none;
        }
        .ai-advice-content a:hover {
            text-decoration: underline;
        }
    `;
  document.head.appendChild(style);
}

function init() {
  addStyles();
  generateAllData();
  renderKPI();
  renderCharts();

  document
    .getElementById("refreshDataBtn")
    ?.addEventListener("click", refreshAll);
  document
    .getElementById("aiAdviceBtn")
    ?.addEventListener("click", getAIAdvice);
}

const logo = document.getElementById("logoPlace");
if (logo)
  logo.addEventListener("click", () => {
    window.location.href = "vhod.html";
  });

init();
