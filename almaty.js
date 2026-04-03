const DISTRICTS = [
  "Наурызбайский",
  "Алмалинский",
  "Алатауский",
  "Турксибский",
  "Бостандыкский",
  "Медеуский",
  "Ауэзовский",
  "Жетысуский",
];
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

const DISTRICT_FILE_NAMES = {
  Наурызбайский: "district_nauryzbaiskiy.html",
  Алмалинский: "district_almalinskiy.html",
  Алатауский: "district_alatauskiy.html",
  Турксибский: "district_turksibskiy.html",
  Бостандыкский: "district_bostandikskiy.html",
  Медеуский: "district_medeuskiy.html",
  Ауэзовский: "district_auezovskiy.html",
  Жетысуский: "district_zhetysuskiy.html",
};

const GROQ_API_KEY = "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";

let districtData = {};
let cityTimeSeries = null;
let cityMetrics = null;
let transportChart = null,
  ecoChart = null;

function generateWithPeak(hourIdx, baseMin, baseMax) {
  let peak = 1.0;
  if (hourIdx === 0 || hourIdx === 1) peak = 0.8;
  if (hourIdx === 2 || hourIdx === 3) peak = 0.9;
  if (hourIdx === 4) peak = 1.2;
  if (hourIdx === 5) peak = 1.4;
  if (hourIdx === 6) peak = 1.2;
  if (hourIdx === 7) peak = 0.9;
  if (hourIdx === 8) peak = 0.7;
  let val = baseMin + Math.random() * (baseMax - baseMin);
  val *= peak;
  return Math.round(val * 10) / 10;
}

function generateTimeSeriesForDistrict() {
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
    let sp = speedBase + (Math.random() - 0.5) * 6;
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

function generateAllDistrictData() {
  for (let d of DISTRICTS) {
    districtData[d] = {
      current: generateCurrentMetrics(),
      timeSeries: generateTimeSeriesForDistrict(),
    };
  }
}

function calculateCityTimeSeries() {
  let sumCong = new Array(TIME_LABELS.length).fill(0);
  let sumSpeed = new Array(TIME_LABELS.length).fill(0);
  let sumAqi = new Array(TIME_LABELS.length).fill(0);
  let sumPm25 = new Array(TIME_LABELS.length).fill(0);

  for (let d of DISTRICTS) {
    const ts = districtData[d].timeSeries;
    for (let i = 0; i < TIME_LABELS.length; i++) {
      sumCong[i] += ts.congestion[i];
      sumSpeed[i] += ts.speed[i];
      sumAqi[i] += ts.aqi[i];
      sumPm25[i] += ts.pm25[i];
    }
  }
  const count = DISTRICTS.length;
  return {
    congestion: sumCong.map((v) => Math.round(v / count)),
    speed: sumSpeed.map((v) => Math.round((v / count) * 10) / 10),
    aqi: sumAqi.map((v) => Math.round(v / count)),
    pm25: sumPm25.map((v) => Math.round((v / count) * 10) / 10),
  };
}

function calculateCityMetrics() {
  const sum = {
    congestion: 0,
    speed: 0,
    cars: 0,
    trafficIndex: 0,
    publicLoad: 0,
    aqi: 0,
    pm25: 0,
    pm10: 0,
    no2: 0,
    co2: 0,
    noise: 0,
  };
  for (let d of DISTRICTS) {
    const m = districtData[d].current;
    for (let key in sum) sum[key] += m[key];
  }
  const count = DISTRICTS.length;
  let redCount = 0,
    yellowCount = 0;
  for (let d of DISTRICTS) {
    const m = districtData[d].current;
    if (m.congestion > 75 || m.aqi > 85) redCount++;
    else if (m.congestion > 65 || m.aqi > 60) yellowCount++;
  }
  let cityPriority = "low";
  if (redCount > 2) cityPriority = "high";
  else if (yellowCount > 3) cityPriority = "medium";

  return {
    congestion: Math.round(sum.congestion / count),
    speed: Math.round((sum.speed / count) * 10) / 10,
    cars: Math.round((sum.cars / count) * 10) / 10,
    trafficIndex: Math.round((sum.trafficIndex / count) * 10) / 10,
    publicLoad: Math.round(sum.publicLoad / count),
    aqi: Math.round(sum.aqi / count),
    pm25: Math.round((sum.pm25 / count) * 10) / 10,
    pm10: Math.round((sum.pm10 / count) * 10) / 10,
    no2: Math.round((sum.no2 / count) * 10) / 10,
    co2: Math.round(sum.co2 / count),
    noise: Math.round((sum.noise / count) * 10) / 10,
    priority: cityPriority,
  };
}

function refreshData() {
  generateAllDistrictData();
  cityTimeSeries = calculateCityTimeSeries();
  cityMetrics = calculateCityMetrics();
}

function getPriorityText(priority) {
  if (priority === "high") return "Высокий";
  if (priority === "medium") return "Средний";
  return "Низкий";
}

function getPriorityClass(priority) {
  if (priority === "high") return "priority-high";
  if (priority === "medium") return "priority-medium";
  return "priority-low";
}

function getIndicatorColor(value, greenMax, yellowMin, inverse = false) {
  if (inverse) {
    if (value >= greenMax) return "#2e7d32";
    if (value >= yellowMin) return "#ed6c02";
    return "#d32f2f";
  } else {
    if (value <= greenMax) return "#2e7d32";
    if (value <= yellowMin) return "#ed6c02";
    return "#d32f2f";
  }
}

function renderKPI() {
  const m = cityMetrics;
  const kpiGrid = document.getElementById("kpiGrid");
  if (!kpiGrid) return;
  kpiGrid.innerHTML = `
        <div class="kpi-item"><div class="label"><span class="indicator" style="background:${getIndicatorColor(m.congestion, 65, 75)}"></span> Средняя загруженность</div><div class="value">${m.congestion}%</div></div>
        <div class="kpi-item"><div class="label"><span class="indicator" style="background:${getIndicatorColor(m.speed, 35, 25, true)}"></span> Средняя скорость</div><div class="value">${m.speed} км/ч</div></div>
        <div class="kpi-item"><div class="label"><span class="indicator" style="background:${getIndicatorColor(m.cars, 10, 12)}"></span> Среднее число машин (тыс)</div><div class="value">${m.cars}</div></div>
        <div class="kpi-item"><div class="label"><span class="indicator" style="background:${getIndicatorColor(m.trafficIndex, 5, 7)}"></span> Средний пробочный индекс</div><div class="value">${m.trafficIndex}/10</div></div>
        <div class="kpi-item"><div class="label"><span class="indicator" style="background:${getIndicatorColor(m.publicLoad, 75, 85)}"></span> Средняя нагрузка на транспорт</div><div class="value">${m.publicLoad}%</div></div>
        <div class="kpi-item"><div class="label"><span class="indicator" style="background:${getIndicatorColor(m.aqi, 60, 85)}"></span> Средний AQI</div><div class="value">${m.aqi}</div></div>
        <div class="kpi-item"><div class="label"><span class="indicator" style="background:${getIndicatorColor(m.pm25, 25, 35)}"></span> Средний PM2.5</div><div class="value">${m.pm25} мкг/м³</div></div>
        <div class="kpi-item"><div class="label"><span class="indicator" style="background:${getIndicatorColor(m.pm10, 40, 50)}"></span> Средний PM10</div><div class="value">${m.pm10} мкг/м³</div></div>
        <div class="kpi-item"><div class="label"><span class="indicator" style="background:${getIndicatorColor(m.no2, 30, 40)}"></span> Средний NO₂</div><div class="value">${m.no2} мкг/м³</div></div>
        <div class="kpi-item"><div class="label"><span class="indicator" style="background:${getIndicatorColor(m.co2, 450, 500)}"></span> Средний CO₂</div><div class="value">${Math.round(m.co2)} ppm</div></div>
        <div class="kpi-item"><div class="label"><span class="indicator" style="background:${getIndicatorColor(m.noise, 60, 70)}"></span> Средний уровень шума</div><div class="value">${m.noise} дБ</div></div>
    `;
}

function renderDistrictsGrid() {
  const grid = document.getElementById("districtsGrid");
  if (!grid) return;

  grid.innerHTML = DISTRICTS.map((d) => {
    const m = districtData[d].current;
    let priority = "low";
    if (m.congestion > 75 || m.aqi > 85) priority = "high";
    else if (m.congestion > 65 || m.aqi > 60) priority = "medium";
    const priorityClass = getPriorityClass(priority);
    const priorityText = getPriorityText(priority);
    let borderColor =
      priority === "high"
        ? "#d32f2f"
        : priority === "medium"
          ? "#ed6c02"
          : "#2e7d32";

    return `
            <div class="district-card" style="border-left-color: ${borderColor};" data-district="${d}">
                <div class="card-title">${d}</div>
                <div class="stat-row"><span class="stat-label"> Загруженность:</span><span class="stat-value">${m.congestion}%</span></div>
                <div class="stat-row"><span class="stat-label"> Скорость:</span><span class="stat-value">${m.speed} км/ч</span></div>
                <div class="stat-row"><span class="stat-label"> AQI:</span><span class="stat-value">${m.aqi}</span></div>
                <div class="stat-row"><span class="stat-label"> Приоритет:</span><span class="priority-badge ${priorityClass}">${priorityText}</span></div>
            </div>
        `;
  }).join("");

  document.querySelectorAll(".district-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      const districtName = card.getAttribute("data-district");
      if (districtName && DISTRICT_FILE_NAMES[districtName]) {
        window.location.href = DISTRICT_FILE_NAMES[districtName];
      }
    });
  });
}

function renderCharts() {
  const ctx1 = document.getElementById("transportChart");
  const ctx2 = document.getElementById("ecoChart");
  if (!ctx1 || !ctx2) return;
  if (transportChart) transportChart.destroy();
  if (ecoChart) ecoChart.destroy();

  transportChart = new Chart(ctx1, {
    type: "line",
    data: {
      labels: TIME_LABELS,
      datasets: [
        {
          label: "Средняя загруженность (%)",
          data: cityTimeSeries.congestion,
          borderColor: "#ed6c02",
          backgroundColor: "rgba(237,108,2,0.1)",
          tension: 0.3,
          fill: true,
          yAxisID: "y",
        },
        {
          label: "Средняя скорость (км/ч)",
          data: cityTimeSeries.speed,
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
      scales: {
        y: {
          title: { display: true, text: "Загруженность (%)" },
          min: 0,
          max: 100,
        },
        y1: {
          position: "right",
          title: { text: "Скорость (км/ч)" },
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
          label: "Средний AQI",
          data: cityTimeSeries.aqi,
          borderColor: "#d32f2f",
          backgroundColor: "rgba(211,47,47,0.1)",
          tension: 0.3,
          fill: true,
        },
        {
          label: "Средний PM2.5 (мкг/м³)",
          data: cityTimeSeries.pm25,
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
        y: { title: { display: true, text: "Значения" }, min: 0, max: 150 },
      },
    },
  });
}

function buildPromptForAI() {
  const m = cityMetrics;

  let districtsReport = [];
  let criticalDistricts = [];
  let warningDistricts = [];
  let normalDistricts = [];

  for (let d of DISTRICTS) {
    const data = districtData[d].current;
    let status = "normal";
    let issues = [];

    if (data.congestion > 75) {
      status = "critical";
      issues.push(`🚦 загруженность ${data.congestion}%`);
      criticalDistricts.push(d);
    } else if (data.congestion > 65) {
      if (status === "normal") status = "warning";
      issues.push(`🚦 загруженность ${data.congestion}%`);
      warningDistricts.push(d);
    }

    if (data.speed < 25) {
      status = "critical";
      issues.push(`📈 скорость ${data.speed} км/ч`);
      if (!criticalDistricts.includes(d)) criticalDistricts.push(d);
    } else if (data.speed < 35) {
      if (status === "normal") status = "warning";
      issues.push(`📈 скорость ${data.speed} км/ч`);
      if (!warningDistricts.includes(d) && status !== "critical")
        warningDistricts.push(d);
    }

    if (data.aqi > 85) {
      status = "critical";
      issues.push(`🌫️ AQI ${data.aqi}`);
      if (!criticalDistricts.includes(d)) criticalDistricts.push(d);
    } else if (data.aqi > 60) {
      if (status === "normal") status = "warning";
      issues.push(`🌫️ AQI ${data.aqi}`);
      if (!warningDistricts.includes(d) && status !== "critical")
        warningDistricts.push(d);
    }

    if (data.pm25 > 35) {
      status = "critical";
      issues.push(`🧪 PM2.5 ${data.pm25}`);
    } else if (data.pm25 > 25) {
      if (status === "normal") status = "warning";
      issues.push(`🧪 PM2.5 ${data.pm25}`);
    }

    if (data.noise > 70) {
      issues.push(`🔊 шум ${Math.round(data.noise)} дБ`);
    } else if (data.noise > 60) {
      if (status === "normal") status = "warning";
      issues.push(`🔊 шум ${Math.round(data.noise)} дБ`);
    }

    if (data.trafficIndex > 7) {
      issues.push(`📊 пробочный индекс ${data.trafficIndex}/10`);
    } else if (data.trafficIndex > 5) {
      if (status === "normal") status = "warning";
      issues.push(`📊 пробочный индекс ${data.trafficIndex}/10`);
    }

    if (issues.length === 0) {
      normalDistricts.push(d);
    }

    const statusEmoji =
      status === "critical" ? "🔴" : status === "warning" ? "🟡" : "🟢";
    districtsReport.push(
      `${statusEmoji} **${d}**: ${issues.length > 0 ? issues.join(", ") : "✅ все показатели в норме"}`,
    );
  }

  const peakCongestion = Math.max(...cityTimeSeries.congestion);
  const peakHourIndex = cityTimeSeries.congestion.indexOf(peakCongestion);
  const peakHour = TIME_LABELS[peakHourIndex];
  const morningAvg = (
    cityTimeSeries.congestion.slice(0, 3).reduce((a, b) => a + b, 0) / 3
  ).toFixed(0);
  const eveningAvg = (
    cityTimeSeries.congestion.slice(5, 7).reduce((a, b) => a + b, 0) / 2
  ).toFixed(0);

  let cityStatus = "🟢 СТАБИЛЬНАЯ";
  let urgency = "ПЛАНОВЫЙ МОНИТОРИНГ";

  if (criticalDistricts.length >= 3) {
    cityStatus = "🔴 КРИТИЧЕСКАЯ";
    urgency = "НЕОБХОДИМО СРОЧНОЕ ВМЕШАТЕЛЬСТВО";
  } else if (criticalDistricts.length > 0) {
    cityStatus = "🟡 НАПРЯЖЁННАЯ";
    urgency = "ТРЕБУЕТ ВНИМАНИЯ РУКОВОДСТВА";
  } else if (warningDistricts.length > 3) {
    cityStatus = "🟡 НАПРЯЖЁННАЯ";
    urgency = "ТРЕБУЕТ МОНИТОРИНГА";
  }

  return `Ты — ИИ-советник мэра города Алматы. Проанализируй данные по всем 8 районам и дай рекомендации на РУССКОМ языке.

## 📊 ОБЩАЯ СИТУАЦИЯ ПО ГОРОДУ:
Статус: ${cityStatus}
Уровень срочности: ${urgency}

### Средние показатели по городу:
| Показатель | Значение | Норма |
|------------|----------|-------|
| Загруженность дорог | ${m.congestion}% | 35-65% |
| Скорость потока | ${m.speed} км/ч | 35-60 км/ч |
| AQI (качество воздуха) | ${m.aqi} | 30-60 |
| Количество машин | ${m.cars} тыс | 5-10 тыс |
| Пробочный индекс | ${m.trafficIndex}/10 | 2-5 |
| PM2.5 | ${m.pm25} мкг/м³ | 10-25 |
| PM10 | ${m.pm10} мкг/м³ | 20-40 |
| NO₂ | ${m.no2} мкг/м³ | 10-30 |
| CO₂ | ${Math.round(m.co2)} ppm | 380-450 |
| Уровень шума | ${m.noise} дБ | 50-60 |

## ⏰ ДИНАМИКА ПО ЧАСАМ:
- Пиковая загруженность: **${peakHour}** (${peakCongestion}%)
- Средняя загруженность утром (08:00-12:00): ${morningAvg}%
- Средняя загруженность вечером (18:00-20:00): ${eveningAvg}%

## 🏘️ ДЕТАЛЬНЫЙ АНАЛИЗ ПО РАЙОНАМ:

${districtsReport.join("\n")}

## 🔴 РАЙОНЫ, ТРЕБУЮЩИЕ СРОЧНОГО ВМЕШАТЕЛЬСТВА (${criticalDistricts.length} шт):
${criticalDistricts.length > 0 ? criticalDistricts.map((d) => `- ${d}`).join("\n") : "✅ Нет критических районов"}

## 🟡 РАЙОНЫ, ТРЕБУЮЩИЕ ВНИМАНИЯ (${warningDistricts.length} шт):
${warningDistricts.length > 0 ? warningDistricts.map((d) => `- ${d}`).join("\n") : "✅ Нет районов с предупреждениями"}

## 🟢 РАЙОНЫ В НОРМЕ (${normalDistricts.length} шт):
${normalDistricts.length > 0 ? normalDistricts.map((d) => `- ${d}`).join("\n") : "⚠️ Нет районов в норме"}

---

## ОТВЕТЬ НА РУССКОМ ЯЗЫКЕ ПО СЛЕДУЮЩЕЙ СТРУКТУРЕ:

🏙️ **ОБЩАЯ ОЦЕНКА СИТУАЦИИ В ГОРОДЕ**
[2-3 предложения о текущем состоянии, включая средние показатели]

🚨 **УРОВЕНЬ ПРИОРИТЕТА:** [ВЫСОКИЙ / СРЕДНИЙ / НИЗКИЙ]

⚠️ **КРИТИЧЕСКИЕ ЗОНЫ И ПРОБЛЕМЫ:**
[Перечисли районы из списка критических и их конкретные проблемы, дай по каждому краткую рекомендацию]

📊 **РАЙОНЫ, ТРЕБУЮЩИЕ ВНИМАНИЯ:**
[Перечисли районы из списка предупреждений и что именно требует внимания]

✅ **РАЙОНЫ В НОРМЕ:**
[Перечисли районы, где показатели в порядке, чтобы отметить успехи]

💡 **РЕКОМЕНДАЦИИ ДЛЯ МЭРА:**
[4-6 конкретных действий по приоритетам:
- Общегородские меры (на основе средних показателей)
- Меры для критических районов
- Экологические рекомендации
- Транспортные рекомендации]

🔮 **ПРОГНОЗ НА БЛИЖАЙШИЕ 2 ЧАСА:**
[На основе пиковых нагрузок и текущей динамики]

🏆 **ЧТО УДАЛОСЬ УЛУЧШИТЬ:**
[Отметь позитивные тенденции, если есть районы в норме]

---

Будь конкретным, профессиональным и ориентированным на действия. Используй эмодзи для наглядности. Пиши на РУССКОМ языке.`;
}

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 3000;

async function getAIAdvice() {
  const container = document.getElementById("aiAdviceContainer");
  if (!GROQ_API_KEY || GROQ_API_KEY === "") {
    container.innerHTML = `<div class="ai-advice-content"><div class="advice-header" style="color: #d32f2f;">⚠️ API Key не настроен</div><div>Вставьте GROQ_API_KEY в almaty.js</div></div>`;
    return;
  }

  const now = Date.now();
  if (now - lastRequestTime < MIN_REQUEST_INTERVAL && lastRequestTime !== 0) {
    const waitSeconds = Math.ceil(
      (MIN_REQUEST_INTERVAL - (now - lastRequestTime)) / 1000,
    );
    container.innerHTML = `<div class="ai-advice-content"><div class="advice-header" style="color: #ed6c02;">⏳ Подождите ${waitSeconds} сек</div><div>Для избежания лимитов Groq (30 запросов/мин).</div></div>`;
    return;
  }
  lastRequestTime = now;

  container.innerHTML = `<div class="ai-advice-content"><div class="advice-header">🤖 Анализ данных 8 районов...</div><div style="text-align:center;padding:40px;"><div class="loading-spinner"></div><p>ИИ анализирует ситуацию в городе...</p></div></div>`;

  const prompt = buildPromptForAI();
  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "Ты — эксперт по городскому управлению. Отвечай только на русском языке, будь конкретным и давай actionable рекомендации.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      },
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    let aiResponse = data.choices[0]?.message?.content || "Нет ответа от API";
    const formattedResponse = aiResponse
      .replace(/\n/g, "<br>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    container.innerHTML = `<div class="ai-advice-content"><div class="advice-header">🎙️ ИИ-помощник для Акимата</div><div style="line-height:1.7;">${formattedResponse}</div><div style="margin-top:16px;font-size:0.7rem;color:#64748b;">🤖 Groq AI (Llama 3.3 70B) • ${new Date().toLocaleString()}</div></div>`;
    container.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    console.error("Groq API error:", error);
    container.innerHTML = `<div class="ai-advice-content"><div class="advice-header" style="color:#d32f2f;">⚠️ Ошибка API</div><div>${error.message}<br><br>Проверьте интернет и API ключ.</div></div>`;
  }
}

function refreshAll() {
  refreshData();
  renderKPI();
  renderDistrictsGrid();
  renderCharts();
  document.getElementById("aiAdviceContainer").innerHTML =
    `<div class="ai-placeholder">Данные по всем 8 районам обновлены. Нажмите кнопку для нового анализа.</div>`;
}

function init() {
  refreshData();
  renderKPI();
  renderDistrictsGrid();
  renderCharts();
  document
    .getElementById("refreshDataBtn")
    ?.addEventListener("click", refreshAll);
  document
    .getElementById("aiAdviceBtn")
    ?.addEventListener("click", getAIAdvice);
  document.getElementById("backBtn")?.addEventListener("click", () => {
    window.location.href = "vhod.html";
  });
  document.getElementById("logoPlace")?.addEventListener("click", () => {
    window.location.href = "vhod.html";
  });
}

init();
