import './style.css';

// Configuration
const API_KEY = '5f95886d2f3044439c265419241305'; // Valid key if active
const BASE_URL = 'https://api.weatherapi.com/v1';

const GLOBAL_CITIES = [
  { name: 'Delhi', country: 'IN', flag: '🇮🇳' },
  { name: 'Mumbai', country: 'IN', flag: '🇮🇳' },
  { name: 'New York', country: 'US', flag: '🇺🇸' },
  { name: 'Los Angeles', country: 'US', flag: '🇺🇸' },
  { name: 'London', country: 'GB', flag: '🇬🇧' },
  { name: 'Tokyo', country: 'JP', flag: '🇯🇵' },
  { name: 'Dubai', country: 'AE', flag: '🇦🇪' },
  { name: 'Paris', country: 'FR', flag: '🇫🇷' },
  { name: 'Singapore', country: 'SG', flag: '🇸🇬' },
  { name: 'Sydney', country: 'AU', flag: '🇦🇺' }
];

// --- High-Quality Demo Data (Real World Stats) ---
const DEMO_DATA = {
  location: { name: 'Delhi', country: 'India', localtime: new Date().toISOString(), lat: 28.61, lon: 77.20 },
  current: { 
    temp_c: 38, 
    condition: { text: 'Clear Sky', icon: '//cdn.weatherapi.com/weather/128x128/day/113.png' }, 
    humidity: 22, wind_kph: 15, wind_degree: 280, feelslike_c: 41, pressure_mb: 1008, uv: 9, vis_km: 10,
    air_quality: { 'us-epa-index': 4 },
    is_day: 1
  },
  forecast: {
    forecastday: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() + i * 86400000).toISOString(),
      day: { maxtemp_c: 40 - i, mintemp_c: 26 - i, condition: { text: 'Sunny', icon: '//cdn.weatherapi.com/weather/64x64/day/113.png' } },
      hour: Array.from({ length: 24 }, (_, j) => ({ time: `2026-05-13 ${j}:00`, temp_c: 28 + Math.sin(j/4)*8 }))
    }))
  }
};

// State
let currentChart = null;

// UI Elements
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const dashboard = document.getElementById('dashboard');
const globeContainer = document.getElementById('globe-container');

// --- Globe Visualization (Three.js) ---
function initGlobe() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, globeContainer.clientWidth / globeContainer.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  
  renderer.setSize(globeContainer.clientWidth, globeContainer.clientHeight);
  globeContainer.appendChild(renderer.domElement);

  // Outer Shell
  const geometry = new THREE.SphereGeometry(5, 32, 32);
  const material = new THREE.MeshPhongMaterial({
    color: 0x22d3ee,
    wireframe: true,
    transparent: true,
    opacity: 0.1,
  });
  const sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);

  // Inner Points (Simulated Satellites)
  const pointsGeo = new THREE.BufferGeometry();
  const coords = [];
  for(let i=0; i<200; i++) {
    const r = 5.2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    coords.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
  }
  pointsGeo.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
  const pointsMat = new THREE.PointsMaterial({ color: 0x22d3ee, size: 0.05 });
  const points = new THREE.Points(pointsGeo, pointsMat);
  scene.add(points);

  const light = new THREE.PointLight(0x22d3ee, 1, 100);
  light.position.set(10, 10, 10);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x111111));

  camera.position.z = 10;

  function animate() {
    requestAnimationFrame(animate);
    sphere.rotation.y += 0.002;
    points.rotation.y -= 0.001;
    renderer.render(scene, camera);
  }
  animate();
}

// --- Weather Logic ---
async function fetchWeather(query, isMain = true) {
  try {
    const response = await fetch(`${BASE_URL}/forecast.json?key=${API_KEY}&q=${query}&days=7&aqi=yes`);
    
    if (response.status === 401 || !response.ok) {
      console.warn('API Key Error. Entering Global Demo Mode.');
      if (isMain) updateMainDashboard(DEMO_DATA, true);
      return isMain ? null : DEMO_DATA;
    }

    const data = await response.json();
    if (isMain) updateMainDashboard(data, false);
    return data;
  } catch (error) {
    if (isMain) updateMainDashboard(DEMO_DATA, true);
    return null;
  }
}

function updateMainDashboard(data, isDemo = false) {
  const { current, location, forecast } = data;
  
  document.getElementById('city-name').innerHTML = `${location.name}, ${location.country}`.toUpperCase() + 
    (isDemo ? ' <span class="badge" style="background: #f59e0b;">DEMO MODE</span>' : '');
  
  document.getElementById('temp-display').textContent = `${Math.round(current.temp_c)}°`;
  document.getElementById('condition-text').textContent = `ATMOSPHERE: ${current.condition.text.toUpperCase()}`;
  document.getElementById('date-time').textContent = new Date(location.localtime).toLocaleString();
  
  const aqi = current.air_quality ? current.air_quality['us-epa-index'] : 2;
  const aqiText = ['Good', 'Moderate', 'Unhealthy', 'Poor', 'Hazardous'][aqi-1] || 'Fair';
  document.getElementById('high-low').textContent = `PEAK: ${Math.round(forecast.forecastday[0].day.maxtemp_c)}° | LOW: ${Math.round(forecast.forecastday[0].day.mintemp_c)}° | AQI: ${aqi} (${aqiText})`;

  document.getElementById('humidity').textContent = `${current.humidity}%`;
  document.getElementById('humidity-bar').style.width = `${current.humidity}%`;
  document.getElementById('wind').textContent = `${current.wind_kph} KM/H`;
  document.getElementById('feels-like').textContent = `${Math.round(current.feelslike_c)}°`;
  document.getElementById('uv-index').textContent = current.uv;
  document.getElementById('visibility').textContent = `${current.vis_km} KM`;

  document.getElementById('weather-icon').innerHTML = `<img src="https:${current.condition.icon.replace('64x64', '128x128')}" alt="SAT">`;

  renderForecast(forecast.forecastday);
  renderChart(forecast.forecastday[0].hour);
  dashboard.style.opacity = 1;
}

function renderForecast(days) {
  const container = document.getElementById('weekly-forecast');
  container.innerHTML = days.map(day => `
    <div class="glass-card fade-in" style="padding: 1.5rem; flex-direction: column; align-items: center; gap: 0.75rem;">
      <span style="font-size: 0.8rem; font-weight: 800; color: var(--text-secondary);">${new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</span>
      <img src="https:${day.day.condition.icon}" width="45" alt="icon">
      <div style="font-size: 1.4rem; font-weight: 700; font-family: 'JetBrains Mono';">
        ${Math.round(day.day.maxtemp_c)}°
      </div>
      <div style="font-size: 0.9rem; opacity: 0.6; font-weight: 600;">
        ${Math.round(day.day.mintemp_c)}°
      </div>
      <div style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent-cyan);">
        ${day.day.condition.text}
      </div>
    </div>
  `).join('');
}


function renderChart(hourly) {
  const ctx = document.getElementById('temp-chart').getContext('2d');
  if (currentChart) currentChart.destroy();
  
  const labels = hourly.filter((_, i) => i % 2 === 0).map(h => h.time.split(' ')[1]);
  const temps = hourly.filter((_, i) => i % 2 === 0).map(h => h.temp_c);

  currentChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'THERMAL',
        data: temps,
        borderColor: '#22d3ee',
        borderWidth: 2,
        pointRadius: 0,
        backgroundColor: 'rgba(34, 211, 238, 0.05)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono' } } },
        x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono' } } }
      }
    }
  });
}

// --- Global Network Section ---
async function initGlobalNetwork() {
  const container = document.getElementById('global-cities');
  container.innerHTML = '';

  for (const city of GLOBAL_CITIES) {
    // For demo/speed, we use demo data if API fails
    const data = await fetchWeather(city.name, false);
    const displayData = data || { ...DEMO_DATA, location: { name: city.name } };
    
    const card = document.createElement('div');
    card.className = 'glass-card city-live-card fade-in';
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
        <span style="font-size: 0.7rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase;">Node: ${city.country}</span>
        <span class="flag">${city.flag}</span>
      </div>
      <h4 style="font-size: 1.4rem; font-weight: 800; margin-bottom: 0.5rem;">${city.name.toUpperCase()}</h4>
      <div style="display: flex; align-items: flex-end; gap: 0.5rem;">
        <div class="live-temp" style="line-height: 1;">${Math.round(displayData.current.temp_c)}°</div>
        <img src="https:${displayData.current.condition.icon}" width="40" alt="icon" style="margin-bottom: -5px;">
      </div>
      <p style="font-size: 0.65rem; color: var(--accent-cyan); font-weight: 700; text-transform: uppercase; margin-top: 1rem; letter-spacing: 0.05em;">
        ${displayData.current.condition.text}
      </p>
    `;

    card.onclick = () => fetchWeather(city.name);
    container.appendChild(card);
  }
}

function initRankings() {
  const hotList = document.getElementById('hot-cities-list');
  const aqiList = document.getElementById('aqi-cities-list');
  
  const hot = [{n:'Kuwait City', t:45}, {n:'Basra, IQ', t:44}, {n:'Delhi, IN', t:39}, {n:'Phoenix, US', t:41}];
  const aqi = [{n:'Delhi, IN', v:182}, {n:'Lahore, PK', v:175}, {n:'Beijing, CN', v:142}, {n:'Jakarta, ID', v:110}];

  hotList.innerHTML = hot.map(c => `<li><span>${c.n}</span> <span style="color: #f59e0b; font-family: 'JetBrains Mono';">${c.t}°C</span></li>`).join('');
  aqiList.innerHTML = aqi.map(c => `<li><span>${c.n}</span> <span style="color: #ef4444; font-family: 'JetBrains Mono';">${c.v} AQI</span></li>`).join('');
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();
  
  // UTC Clock
  setInterval(() => {
    const el = document.getElementById('live-clock');
    if (el) el.textContent = new Date().toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' }) + ' UTC';
  }, 1000);

  initGlobe();
  initRankings();
  initGlobalNetwork();

  // Typing Effect
  const typingText = document.getElementById('typing-text');
  const text = "INTELLIGENCE";
  let idx = 0;
  function type() {
    if (idx < text.length) {
      typingText.textContent += text.charAt(idx++);
      setTimeout(type, 150);
    }
  }
  typingText.textContent = "";
  type();

  searchBtn.onclick = () => fetchWeather(cityInput.value);
  cityInput.onkeypress = (e) => { if (e.key === 'Enter') fetchWeather(cityInput.value); };
  locationBtn.onclick = () => {
    navigator.geolocation.getCurrentPosition(pos => fetchWeather(`${pos.coords.latitude},${pos.coords.longitude}`));
  };

  fetchWeather('Delhi');
});
