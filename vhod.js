const DISTRICTS = [
  {
    name: "Наурызбайский",
    img: "https://informburo.kz/storage/photos/217/main/PCj04saMsJqreL9KQ9GbG1OXnMEPv6711Rx0cA0O.jpg",
  },
  {
    name: "Алмалинский",
    img: "https://pohcdn.com/sites/default/files/styles/paragraph__hero_banner__hb_image__1880bp/public/hero_banner/Park_named_after_28_Panfilov_guardsmen.jpg",
  },
  {
    name: "Алатауский",
    img: "https://ticketon.kz/files/media/ledovyj-dvorec-almaty-arena-malaya-arena2.jpg",
  },
  {
    name: "Турксибский",
    img: "https://avatars.mds.yandex.net/get-altay/14761495/2a0000019ad01e10aedd2d84ee8114b16261/XXXL",
  },
  {
    name: "Бостандыкский",
    img: "https://sxodim.com/uploads/posts/2023/06/02/optimized/7c5e87252a89aa14f87f4c3b4af2d4ad_1400x790-q-85.jpg",
  },
  {
    name: "Медеуский",
    img: "https://guideservice.kz/wp-content/uploads/2025/04/medeu-scaled-e1642653334143.jpg",
  },
  {
    name: "Ауэзовский",
    img: "https://sxodim.com/uploads/posts/2023/05/22/optimized/551648211a889083f91620d73066c56b_1400x790-q-85.jpg",
  },
  {
    name: "Жетысуский",
    img: "https://someplace.kz/images/barakholka-almaty-samyj-podrobnyj-aktualnyj-obzor-bazarov.jpg",
  },
];

let currentData = {};

let sortBy = "priority";
let sortOrder = "desc";

function generateMetrics() {
  const congestion = Math.floor(Math.random() * 100);
  const aqi = Math.floor(30 + Math.random() * 90);
  let priority = "low";
  if (congestion > 75 || aqi > 85) priority = "high";
  else if (congestion > 65 || aqi > 60) priority = "medium";

  return { congestion, aqi, priority };
}

function refreshAllData() {
  for (let d of DISTRICTS) {
    currentData[d.name] = generateMetrics();
  }
}

function getPriorityClass(priority) {
  if (priority === "high") return "priority-high";
  if (priority === "medium") return "priority-medium";
  return "priority-low";
}

function getPriorityText(priority) {
  if (priority === "high") return "Высокий";
  if (priority === "medium") return "Средний";
  return "Низкий";
}

function getSortedDistricts() {
  const districtsCopy = [...DISTRICTS];
  districtsCopy.sort((a, b) => {
    let valA, valB;
    const dataA = currentData[a.name];
    const dataB = currentData[b.name];

    if (sortBy === "priority") {
      const order = { high: 3, medium: 2, low: 1 };
      valA = order[dataA.priority];
      valB = order[dataB.priority];
    } else if (sortBy === "congestion") {
      valA = dataA.congestion;
      valB = dataB.congestion;
    } else if (sortBy === "aqi") {
      valA = dataA.aqi;
      valB = dataB.aqi;
    } else {
      valA = a.name;
      valB = b.name;
      if (sortOrder === "asc") return valA.localeCompare(valB);
      else return valB.localeCompare(valA);
    }

    if (sortOrder === "desc") return valB - valA;
    return valA - valB;
  });
  return districtsCopy;
}

function renderCards() {
  const grid = document.getElementById("cardsGrid");
  if (!grid) return;

  const sortedDistricts = getSortedDistricts();

  grid.innerHTML = sortedDistricts
    .map((district) => {
      const data = currentData[district.name];
      const priorityClass = getPriorityClass(data.priority);
      const priorityText = getPriorityText(data.priority);

      return `
            <div class="district-card" data-district="${district.name}">
                <img src="${district.img}" alt="${district.name}" class="card-image">
                <div class="card-title">${district.name}</div>
                <div class="card-stats">
                    <div class="stat-row">
                        <span class="stat-label"> Загруженность</span>
                        <span class="stat-value">${data.congestion}%</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label"> AQI</span>
                        <span class="stat-value">${data.aqi}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label"> Приоритет</span>
                        <span class="priority-badge ${priorityClass}">${priorityText}</span>
                    </div>
                </div>
            </div>
        `;
    })
    .join("");

  document.querySelectorAll(".district-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      const districtName = card.getAttribute("data-district");
      if (districtName) {
        const fileName = getDistrictFileName(districtName);
        window.location.href = fileName;
      }
    });
  });
}

function getDistrictFileName(districtName) {
  const map = {
    Наурызбайский: "district_nauryzbaiskiy.html",
    Алмалинский: "district_almalinskiy.html",
    Алатауский: "district_alatauskiy.html",
    Турксибский: "district_turksibskiy.html",
    Бостандыкский: "district_bostandikskiy.html",
    Медеуский: "district_medeuskiy.html",
    Ауэзовский: "district_auezovskiy.html",
    Жетысуский: "district_zhetysuskiy.html",
  };
  return map[districtName] || "vhod.html";
}

function refreshDashboard() {
  refreshAllData();
  renderCards();
}

function setSortBy(value) {
  sortBy = value;
  renderCards();
}

function toggleSortOrder() {
  sortOrder = sortOrder === "desc" ? "asc" : "desc";
  const btn = document.getElementById("sortOrderBtn");
  if (btn) {
    btn.innerHTML = sortOrder === "desc" ? "▼ По убыванию" : "▲ По возрастанию";
  }
  renderCards();
}

function init() {
  refreshAllData();
  renderCards();

  const refreshBtn = document.getElementById("refreshDashboardBtn");
  if (refreshBtn) refreshBtn.addEventListener("click", refreshDashboard);

  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => setSortBy(e.target.value));
  }

  const sortOrderBtn = document.getElementById("sortOrderBtn");
  if (sortOrderBtn) sortOrderBtn.addEventListener("click", toggleSortOrder);

  const logo = document.getElementById("logoPlace");
  if (logo)
    logo.addEventListener("click", () => {
      window.location.href = "vhod.html";
    });
}

const cityStatsBtn = document.getElementById("cityStatsBtn");
if (cityStatsBtn) {
  cityStatsBtn.addEventListener("click", () => {
    window.location.href = "almaty.html";
  });
}

init();
