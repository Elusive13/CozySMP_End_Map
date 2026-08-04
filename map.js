const API_URL = "https://script.google.com/macros/s/AKfycbxI60XeVZ80s8ks37wgtvaevFTHQmJS37lgvgWhkShmO6iZMK3BY6hT03_NZuX8TYgm/exec";


let currentMarker = null;


// Create the map
const map = L.map('map', {
  crs: L.CRS.Simple,
  minZoom: 0,
  maxZoom: 3,
  zoomControl: true
});

// Each tile is 512×512 pixels
const tileSize = 512;



// Your original grid coordinates
const original = [
  [-1, -1], [-1, 0], [-1, 1],
  [ 0, -1], [ 0, 0], [ 0, 1],
  [ 1, -1], [ 1, 0], [ 1, 1]
];

original.forEach(([x, y]) => {
  const X = x + 1;      // shift -1..1 → 0..2
  const Y = y + 1;      // shift -1..1 → 0..2

  // Swap top and bottom rows
  const swappedY = 2 - Y;

  const imageUrl = `tiles/${x},${y}.png`;

  const bounds = [
    [swappedY * tileSize, X * tileSize],
    [(swappedY + 1) * tileSize, (X + 1) * tileSize]
  ];

  L.imageOverlay(imageUrl, bounds).addTo(map);
});


// Total map size
const width = 3 * tileSize;
const height = 3 * tileSize;


// Start centered and zoomed out
map.setView([950, 780], 0);

map.setMaxBounds([[300, 300], [10250, 1250]]);

// Simple search
document.getElementById("search").addEventListener("input", function(e) {
  const query = e.target.value.toLowerCase();

  markers.eachLayer(marker => {
    const text = marker.getPopup().getContent().toLowerCase();
    marker.setOpacity(text.includes(query) ? 1 : 0.2);
  });
});

const markers = L.layerGroup().addTo(map);

function groupOptions(selected) {
  const groups = [
    "None",
    "Community",
    "Greenery",
    "Mob Drops",
    "Books",
    "Special",
    "Mall",
    "Blocks",
    "Items",
    "Assorted"
  ];

  return groups
    .map(g => `<option ${g === selected ? "selected" : ""}>${g}</option>`)
    .join("");
}


map.on("click", function (e) {
  openShopForm(e.latlng);
});

function openShopForm(latlng) {
  const formHtml = `
    <div style="width: 240px;">
      <label>Name:</label><br>
      <input id="shopName" type="text"><br><br>

	<label>Description:</label><br>
	<textarea id="shopDescription" rows="2" style="width: 100%;"></textarea><br><br>


      <label>Group 1:</label><br>
      <select id="shopGroup1">
        <option>Community</option>
        <option>Greenery</option>
        <option>Mob Drops</option>
        <option>Books</option>
        <option>Special</option>
        <option>Mall</option>
        <option>Blocks</option>
        <option>Items</option>
        <option>Assorted</option>
      </select><br><br>

      <label>Group 2:</label><br>
      <select id="shopGroup2">
        <option>None</option>
        <option>Community</option>
        <option>Greenery</option>
        <option>Mob Drops</option>
        <option>Books</option>
        <option>Special</option>
        <option>Mall</option>
        <option>Blocks</option>
        <option>Items</option>
        <option>Assorted</option>
      </select><br><br>

      <label>Inventory:</label><br>
      <textarea id="shopInventory" rows="4" style="width: 100%;"></textarea><br><br>

      <label>
        <input id="shopStocked" type="checkbox">
        Stocked
      </label><br><br>

      <button onclick="saveShop(${latlng.lat}, ${latlng.lng})">
        Add Shop
      </button>
    </div>
  `;

  L.popup()
    .setLatLng(latlng)
    .setContent(formHtml)
    .openOn(map);
}

// Icon colors and sizes
const groupStyles = {
  Community: { color: "blue", size: 18 },
  Mall: { color: "pink", size: 18 },
  Special: { color: "gold", size: 18 },

  // All other groups → small light grey
  default: { color: "#d0d0d0", size: 10 }
};

// Create an icon based on group
function makeGroupIcon(group) {
  const style = groupStyles[group] || groupStyles.default;

  return L.divIcon({
    className: "shop-marker",
    html: `
      <div style="
        width: ${style.size}px;
        height: ${style.size}px;
        background: ${style.color};
        border-radius: 50%;
        border: 2px solid white;
      "></div>
    `,
    iconSize: [style.size, style.size],
    iconAnchor: [style.size / 2, style.size / 2]
  });
}


function saveShop(lat, lng) {
  const name = document.getElementById("shopName").value;
  const description = document.getElementById("shopDescription").value;
  const group1 = document.getElementById("shopGroup1").value;
  const group2 = document.getElementById("shopGroup2").value;
  const inventory = document.getElementById("shopInventory").value;
  const stocked = document.getElementById("shopStocked").checked;

  const icon = makeGroupIcon(group1);

  const marker = L.marker([lat, lng], { icon }).addTo(markers);

  marker.shopData = { 
    name,
    description,
    group1,
    group2,
    inventory,
    stocked
  };

  marker.bindPopup(makePopup(marker));
  marker.on("click", () => openEditForm(marker));

  // SAVE TO GOOGLE SHEET
fetch(API_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    action: "add",
    name,
    description,
    group1,
    group2,
    inventory,
    stocked,
    lat,
    lng
  })
});


  map.closePopup();
}




function openEditForm(marker) {
  currentMarker = marker;

  const data = marker.shopData;

  const formHtml = `
    <div style="width: 240px;">
      <label>Name:</label><br>
      <input id="editName" type="text" value="${data.name}"><br><br>

      <label>Description:</label><br>
      <textarea id="editDescription" rows="2" style="width: 100%;">${data.description}</textarea><br><br>

      <label>Group 1:</label><br>
      <select id="editGroup1">
        ${groupOptions(data.group1)}
      </select><br><br>

      <label>Group 2:</label><br>
      <select id="editGroup2">
        ${groupOptions(data.group2)}
      </select><br><br>

      <label>Inventory:</label><br>
      <textarea id="editInventory" rows="4" style="width: 100%;">${data.inventory}</textarea><br><br>

      <label>
        <input id="editStocked" type="checkbox" ${data.stocked ? "checked" : ""}>
        Stocked
      </label><br><br>

      <button onclick="saveEdit()">Save</button>
      <button onclick="deleteShop()" style="margin-left: 10px; color: red;">Delete</button>
    </div>
  `;

  L.popup()
    .setLatLng(marker.getLatLng())
    .setContent(formHtml)
    .openOn(map);
}



function makePopup(marker) {
  const d = marker.shopData;

  return `
    <b>${d.name}</b><br>
    <i>${d.description}</i><br><br>
    Groups: ${d.group1}${d.group2 !== "None" ? ", " + d.group2 : ""}<br>
    Stocked: ${d.stocked ? "Yes" : "No"}<br><br>
    <b>Inventory:</b><br>
    <pre style="white-space: pre-wrap;">${d.inventory}</pre>
  `;
}


function saveEdit() {
  if (!currentMarker) return;

  const d = currentMarker.shopData;

  d.name = document.getElementById("editName").value;
  d.description = document.getElementById("editDescription").value;
  d.group1 = document.getElementById("editGroup1").value;
  d.group2 = document.getElementById("editGroup2").value;
  d.inventory = document.getElementById("editInventory").value;
  d.stocked = document.getElementById("editStocked").checked;

  currentMarker.setIcon(makeGroupIcon(d.group1));
  currentMarker.bindPopup(makePopup(currentMarker));

  const lat = currentMarker.getLatLng().lat;
  const lng = currentMarker.getLatLng().lng;

  // UPDATE GOOGLE SHEET
fetch(API_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    action: "edit",
    ...d,
    lat,
    lng
  })
});


  map.closePopup();
  currentMarker = null;
}




function deleteShop() {
  if (!currentMarker) return;

  const lat = currentMarker.getLatLng().lat;
  const lng = currentMarker.getLatLng().lng;

  markers.removeLayer(currentMarker);

  // DELETE FROM GOOGLE SHEET
fetch(API_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    action: "delete",
    lat,
    lng
  })
});


  map.closePopup();
  currentMarker = null;
}


function loadShops() {
  fetch(API_URL)
    .then(r => r.json())
    .then(data => {
      data.forEach(row => {
        const icon = makeGroupIcon(row.group1);

        const marker = L.marker([Number(row.lat), Number(row.lng)], { icon }).addTo(markers);

        marker.shopData = {
          name: row.name,
          description: row.description,
          group1: row.group1,
          group2: row.group2,
          inventory: row.inventory,
          stocked: row.stocked === "true"
        };

        marker.bindPopup(makePopup(marker));
        marker.on("click", () => openEditForm(marker));
      });
    });
}

loadShops();


marker.on("click", () => openEditForm(marker));
