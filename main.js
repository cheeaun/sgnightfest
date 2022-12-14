import './style.css';
import maplibregl from 'maplibre-gl';
import { lighten, transparentize } from 'color2k';

const apiKey = import.meta.env.VITE_ARCGIS_TOKEN;
const basemapEnum = 'a9a842b3eec14a60a913ed718d19b957';
const dataPath = './sgnightfest.geo.json?v4';

const light = (color) => lighten(color, 0.25);
const border = (color) => transparentize(lighten(color, 0.1), 0.75);

console.log(
  `%cHello there 👋. Source code here: https://github.com/cheeaun/sgnightfest`,
  'font-size: 1.5em; font-weight: bold;',
);

const category2colorMapping = {
  'Night Lights': '#ed1c25',
  Performances: '#7da193',
  'Highlight Act': '#4abfad',
  'Projection Mapping': '#01adef',
  'Experiential Programmes': '#f7931d',
  "Bbbooze O'clock Powered By Sui Gin Bars": '#a0499b',
  'Festival Villages': '#64bde1',
  Information: '#888',
  'First Aid Point': '#ed1a2d',
  Others: '#888',
};

const curatedRoutes = [
  { name: '📸 The Influencer', route: [21, 5, 7, 8, 6, 20, 22, 19] },
  { name: '🎨 The Art Appreciator', route: [4, 24, 14, 3, 16, 1, 22, 10, 15] },
  { name: '❤️ The Young at Heart', route: [20, 6, 5, 25, 9, 17, 11, 12] },
  { name: '🔍 The Heritage Lover', route: [21, 25, 3, 23, 2, 1, 18, 19, 11] },
];

function genListHTML(cat, catData) {
  const data = catData[cat];
  const { number } = data[0].properties;
  const listTag = number ? 'ol' : 'ul';
  return `
    <h2 style="color: ${
      category2colorMapping[data[0].properties.category]
    }">${cat}</h2>
    <${listTag} start="${data[0].properties.number}">
      ${data
        .map(
          ({
            geometry: { coordinates },
            properties: { name, description, category, number },
          }) => `
        <li style="color: ${category2colorMapping[category]}; ${
            !number ? 'list-style-type: disc' : ''
          }" data-coords="${coordinates}">
          <h3>${name}</h3>
          ${description ? `<p>${description.replace(/\n/g, '<br>')}</p>` : ''}
        </li>
      `,
        )
        .join('')}
    </${listTag}>
  `;
}

const $app = document.getElementById('app');

const map = new maplibregl.Map({
  container: 'map',
  style: `https://basemaps-api.arcgis.com/arcgis/rest/services/styles/${basemapEnum}?type=style&token=${apiKey}`,
  // center: [103.85028, 1.29656],
  // zoom: 14,
  bounds: [
    [103.8453614, 1.2929228],
    [103.8545795, 1.3014411],
  ],
  fitBoundsOptions: { padding: 100 },
  attributionControl: false,
  minZoom: 12,
});
map.addControl(new maplibregl.NavigationControl());

const geolocateControl = new maplibregl.GeolocateControl({
  positionOptions: {
    enableHighAccuracy: true,
  },
  trackUserLocation: true,
});
map.addControl(geolocateControl);
geolocateControl.on('trackuserlocationstart', () => {
  try {
    localStorage.setItem('trackUserLocation', true);
  } catch (e) {}
});
geolocateControl.on('trackuserlocationend', () => {
  try {
    localStorage.removeItem('trackUserLocation');
  } catch (e) {}
});

map.addControl(
  new maplibregl.AttributionControl({
    compact: true,
  }),
);

map.on('load', () => {
  const layers = map.getStyle().layers;
  console.log({ layers });

  map.addSource('data', {
    type: 'geojson',
    data: dataPath,
  });

  map.addLayer({
    id: 'points',
    type: 'circle',
    source: 'data',
    layout: {
      'circle-sort-key': ['coalesce', ['get', 'zindex'], 0],
    },
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        13,
        4,
        16,
        ['case', ['==', ['get', 'zindex'], -1], 10, 12],
      ],
      'circle-color': [
        'case',
        ...Object.entries(category2colorMapping)
          .map(([category, color]) => [
            ['==', ['get', 'category'], category],
            color,
          ])
          .flat(),
        '#ccc',
      ],
      'circle-stroke-color': [
        'case',
        ...Object.entries(category2colorMapping)
          .map(([category, color]) => [
            ['==', ['get', 'category'], category],
            border(color),
          ])
          .flat(),
        '#ccc',
      ],
      'circle-stroke-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        13,
        1,
        16,
        16,
      ],
      'circle-opacity': ['case', ['==', ['get', 'zindex'], -1], 0.45, 1],
    },
  });

  map.addLayer({
    id: 'points-number',
    type: 'symbol',
    source: 'data',
    minzoom: 14,
    layout: {
      'symbol-sort-key': ['coalesce', ['get', 'zindex'], 0],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
      'text-field': [
        'case',
        ['==', ['get', 'category'], 'Festival Villages'],
        '@',
        ['==', ['get', 'category'], 'Information'],
        'i',
        ['==', ['get', 'category'], 'First Aid Point'],
        '+',
        ['has', 'number'],
        ['get', 'number'],
        '●',
      ],
      'text-font': ['Noto Sans Bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 14, 9, 16, 12],
    },
    paint: {
      'text-color': '#fff',
      'text-halo-color': '#000',
      'text-halo-width': 0.5,
    },
  });

  map.addLayer({
    id: 'points-label',
    type: 'symbol',
    source: 'data',
    minzoom: 16,
    layout: {
      'text-field': [
        'format',
        ['get', 'name'],
        { 'font-scale': 1 },
        ['concat', '\n', ['get', 'description']],
        { 'font-scale': 0.8 },
      ],
      'text-font': ['Noto Sans Bold'],
      'text-size': 12,
      'text-variable-anchor': ['left', 'right', 'top'],
      'text-radial-offset': 1.3,
      'text-justify': 'auto',
      'symbol-sort-key': ['coalesce', ['get', 'zindex'], 0],
    },
    paint: {
      'text-halo-color': '#000',
      'text-halo-width': 1,
      'text-color': [
        'case',
        ...Object.entries(category2colorMapping)
          .map(([category, color]) => [
            ['==', ['get', 'category'], category],
            light(color),
          ])
          .flat(),
      ].concat(['#ccc']),
    },
  });

  try {
    if (localStorage.getItem('trackUserLocation')) {
      geolocateControl.trigger();
    }
  } catch (e) {}

  fetch(dataPath)
    .then((res) => res.json())
    .then((data) => {
      const bounds = new maplibregl.LngLatBounds();

      // Group data in categories
      const catData = {};
      data.features.forEach((feature) => {
        const { category } = feature.properties;
        if (!catData[category]) {
          catData[category] = [];
        }
        catData[category].push(feature);
        bounds.extend(feature.geometry.coordinates);
      });
      console.log({ catData, bounds: bounds.toArray() });

      $app.innerHTML = `
        <button type="button" id="close-menu">×</button>
        ${genListHTML('Night Lights', catData)}
        ${genListHTML('Performances', catData)}
        ${genListHTML('Highlight Act', catData)}
        ${genListHTML('Projection Mapping', catData)}
        ${genListHTML('Experiential Programmes', catData)}
        ${genListHTML("Bbbooze O'clock Powered By Sui Gin Bars", catData)}
        ${genListHTML('Festival Villages', catData)}
        ${genListHTML('Others', catData)}
        <a href="https://www.nightfestival.gov.sg/whats-on" target="_blank" class="more">More details and events listed on the official Singapore Night Festival site!</a>
        <hr>
        <h2>Curated walk routes</h2>
        ${curatedRoutes
          .map(
            ({ name, route }) => `
          <dl>
          <dt>${name}</dt>
          <dd>${route
            .map((number) => {
              const numberData = data.features.find(
                (feature) => feature.properties.number === number,
              );
              const {
                geometry: { coordinates },
                properties: { name, category },
              } = numberData;
              const color = category2colorMapping[category];
              return `
                <button type="button" data-coords="${coordinates}" style="background-color: ${color}" title="${name}">${number}</button>
              `;
            })
            .join(' → ')}</dd>
          </dl>
        `,
          )
          .join('')}
        <footer>
          <p>Warning: Data here may not be accurate, scraped from the <a href="https://www.nightfestival.gov.sg/-/media/Snf2022/SNF2022FestivalMap.pdf" target="_blank">Map PDF</a>. Latest accurate info from <a href="https://www.nightfestival.gov.sg/" target="_blank">nightfestival.gov.sg</a>. <a href="https://t.me/cheeaun" target="_blank">Feedback</a> welcomed.</p>
          </footer>
      `;

      document.getElementById('close-menu').addEventListener('click', (e) => {
        e.preventDefault();
        $app.classList.add('closed');
      });

      map.on('movestart', (e) => {
        // Ignore map move triggered from geolocation
        if (e.geolocateSource) return;
        $app.classList.add('closed');
      });
      map.on('mousedown', () => {
        $app.classList.add('closed');
      });

      $app.addEventListener('click', (e) => {
        const $target = e.target;
        if ($target.tagName === 'LI' || $target.tagName === 'BUTTON') {
          const dataCoords = $target.dataset.coords;
          if (!dataCoords) return;
          const coords = dataCoords.split(',');
          map.flyTo({
            center: coords,
            zoom: 18,
          });
        }
      });
    });

  document.getElementsByTagName('h1')[0].addEventListener('click', (e) => {
    e.preventDefault();
    $app.classList.toggle('closed');
  });
});
