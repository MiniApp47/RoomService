document.addEventListener("DOMContentLoaded", function () {
 const tg = window.Telegram?.WebApp || {
  ready() {}, expand() {}, setHeaderColor() {}, setBackgroundColor() {},
  HapticFeedback: { impactOccurred() {}, selectionChanged() {}, notificationOccurred() {} },
  initDataUnsafe: { user: null },
  sendData() {}, showAlert(msg) { alert(msg); }
 };
 tg.ready();
 tg.expand();
 try { tg.setHeaderColor("#09090a"); tg.setBackgroundColor("#09090a"); } catch(e) {}

 const loader = document.getElementById("page-loader");
 setTimeout(() => loader?.classList.add("hide"), 1250);

  // ===========================================================
  // CONFIGURATION ROOM SERVICE — TOUT EST DANS CE script.js
  // ===========================================================
  // Remplace les chaînes vides par les liens OFFICIELS de Room Service.
  // Un lien vide ne sera pas affiché dans la mini-app.
  const ROOM_SERVICE_CONFIG = {
    telegram: "",   // Exemple : https://t.me/votre_compte_officiel
    channel: "",    // Canal Telegram officiel
    instagram: "",  // Instagram officiel
    snapchat: ""    // Snapchat officiel
  };

   // ===========================================================
   // COLLECTIONS ROOM SERVICE
   // Les catégories restent visibles même lorsque leurs produits sont vides.
   // gammes : "classic" ou "premium".
   // Pour HASH : gamme imposée par la sous-catégorie.
   // Pour WEED : préciser gamme sur chaque produit, car les deux
   //             sous-catégories peuvent exister dans les deux gammes.
   // ===========================================================
   const appData = [
    {
     id: 'HASH',
     name: 'Hash',
     type: 'Hash',
     image: 'CategHash.png',
     directToProducts: false,
     farms: [
      { id: 'MOUSSEUX', name: 'Mousseux', gamme: 'classic', symbol: '🧽', products: [] },
      { id: 'FILTRE', name: 'Filtré', gamme: 'classic', symbol: '🔎', products: [] },
      { id: 'FROZEN', name: 'Frozen', gamme: 'premium', symbol: '🧊', products: [] },
      { id: 'OLIVE_FROZEN', name: 'Olive Frozen', gamme: 'premium', symbol: '🫒', products: [] },
      { id: 'STATIC_DOUBLE_STATIC', name: 'Static / Double Static', gamme: 'premium', symbol: '🔮', products: [] }
     ]
    },
    {
     id: 'WEED',
     name: 'Weed',
     type: 'Weed',
     image: 'CategWeed.png',
     directToProducts: false,
     farms: [
      // Pas de gamme imposée pour la Weed : Classic ou Premium
      // se choisit au niveau de chaque fiche produit.
      { id: 'HOLLANDAISE_COFFEE', name: 'Hollandaise Coffee', gamme: 'classic', symbol: '🇳🇱', products: [] },
      { id: 'CALI_USA', name: 'Cali USA', gamme: 'premium', symbol: '🇺🇸', products: [] }
     ]
    },
    {
     id: 'NEIGE',
     name: 'Neige',
     type: 'Neige',
     image: 'CategNeige.png',
     directToProducts: false,
     farms: [
      // Pas de gamme imposée pour la Weed : Classic ou Premium
      // se choisit au niveau de chaque fiche produit.
      { id: 'SURINAMAISE', name: 'Surinamaise', gamme: 'classic', symbol: '🇸🇷', products: [] },
      { id: 'BOLIVIENNE', name: 'Bolivienne', gamme: 'premium', symbol: '🇧🇴', products: [] },
     ]
    }
   ];

 // Contacts : affichés uniquement si les liens officiels sont renseignés ci-dessus.
 const officialContacts = [
  { key: "telegram", name: "Telegram", icon: "icon-telegram" },
  { key: "instagram", name: "Instagram", icon: "icon-instagram" },
  { key: "channel", name: "Canal Telegram", icon: "icon-telegram" },
  { key: "snapchat", name: "Snapchat", icon: "ic-star" }
 ];
 const linksDiv = document.getElementById("official-contact-links");
 if (linksDiv) {
  const validContacts = officialContacts.map(c => ({...c, url: String(ROOM_SERVICE_CONFIG?.[c.key] || "").trim()}))
    .filter(c => /^https:\/\//i.test(c.url));
  linksDiv.innerHTML = validContacts.map(c => `<a class="contact-link" href="${escapeURL(c.url)}" target="_blank" rel="noopener noreferrer"><span class="contact-icon"><svg width="22" height="22"><use href="#${c.icon}"/></svg></span><div><b>${c.name}</b><span>Compte officiel</span></div></a>`).join("");
  const waiting = document.getElementById("contact-awaiting");
  if (waiting) waiting.hidden = validContacts.length > 0;
 }
 function escapeURL(url) { return url.replace(/"/g, "%22").replace(/</g, "%3C").replace(/>/g, "%3E"); }

 let allProducts = [];
 appData.forEach((category) => {
  category.farms.forEach((farm) => {
   farm.products.forEach((product) => {
    product.category = category;
    product.farmName = farm.name;
    product.farmId = farm.id;
    product.gamme = String(farm.gamme || product.gamme || "classic").toLowerCase() === "premium" ? "premium" : "classic";
    allProducts.push(product);
   });
  });
 });

 let favorites = new Set();
 let cart = [];
 let currentProd = null;
 let currTarif = null;
 let currVar = null;
 let currQty = 1;
 let checkoutMode = "Livraison";
 let currentCategory = null;
 let currentGamme = 'classic';
 let selectedSubtype = 'ALL';
 window.lastListPage = "home";

 const contactUrl = String(ROOM_SERVICE_CONFIG?.telegram || "").replace(/\/$/, "");

 function money(n) {
  return Number(n || 0).toFixed(2).replace(".00", "") + "€";
 }

 function firstPrice(product) {
  const prices = (product.tarifs || []).map(t => Number(t.price)).filter(n => !Number.isNaN(n));
  return prices.length ? Math.min(...prices) : 0;
 }

 function mediaCount(product) {
  if (product.videos && product.videos.length) return product.videos.length;
  if (product.video) return 1;
  return product.image ? 1 : 0;
 }

 function hasVideo(product) {
  return Boolean((product.videos && product.videos.length) || product.video);
 }

 function productImage(product) {
  return product.image && String(product.image).trim() !== "" ? product.image : "RoomServiceLogo.jpg";
 }

 function safeText(value, fallback = "-") {
  return value && String(value).trim() !== "" ? value : fallback;
 }

 function shortText(value, max = 46) {
  const txt = safeText(value, "");
  return txt.length > max ? txt.slice(0, max - 1) + "…" : txt;
 }

 function haptic(type = "light") {
  try { tg.HapticFeedback?.impactOccurred(type); } catch(e) {}
 }

 function productMatches(product, query) {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  const haystack = [product.name, product.farm, product.farmName, product.type, product.category?.name, product.description, product.gamme === 'premium' ? 'gamme premium' : 'gamme classic']
   .join(" ").toLowerCase();
  return haystack.includes(q);
 }

 function setStats() {
  const cats = appData.filter(c => c.farms.some(f => f.products.length)).length;
  if (document.getElementById("stat-products")) document.getElementById("stat-products").innerText = allProducts.length;
  if (document.getElementById("stat-cats")) document.getElementById("stat-cats").innerText = cats;
  document.getElementById("new-count").innerText = `${Math.min(6, allProducts.length)} articles`;
 }

 window.navigate = function(pageId) {
  const normalized = pageId.replace("page-", "");
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const page = document.getElementById("page-" + normalized);
  if (page) page.classList.add("active");
  window.scrollTo(0, 0);

  document.querySelectorAll(".nav-item-float").forEach(i => i.classList.remove("active"));
  const nav = document.querySelector(`.nav-btn[data-target="page-${normalized}"]`);
  if (nav) nav.classList.add("active");
  else if (["cat-list", "product"].includes(normalized)) document.querySelector('.nav-btn[data-target="page-home"]')?.classList.add("active");
  else if (normalized === "checkout") document.querySelector('.nav-btn[data-target="page-cart"]')?.classList.add("active");

  if (normalized === "cart") renderCart();
  if (normalized === "favorites") renderFavorites();
  if (normalized === "checkout") renderCheckout();
 };

 function createCategoryCard(category) {
  const total = category.farms.reduce((sum, farm) => sum + farm.products.length, 0);
  return `
   <div class="cat-card" onclick="openCategory('${category.id}')">
    <span class="open-badge">›</span>
    <img src="${category.image || 'RoomServiceLogo.jpg'}" alt="${category.name}">
    <div class="title">${category.name}</div>
    <div class="meta">2 gammes · ${category.farms.length} sous-catégories</div>
   </div>`;
 }

 function favoriteIconHTML(active) {
  return `<svg aria-hidden="true"><use href="#${active ? 'ic-heart' : 'ic-heart-outline'}"></use></svg>`;
 }

 function syncProductFavoriteButton() {
  const btn = document.getElementById("p-like");
  if (!btn || !currentProd) return;
  const active = favorites.has(currentProd.id);
  btn.innerHTML = favoriteIconHTML(active);
  btn.classList.toggle("active", active);
 }

 function createCardHTML(product, isLarge = false) {
  const from = firstPrice(product);
  const count = mediaCount(product);
  const isFav = favorites.has(product.id);
  const badge = safeText(product.farmName || product.type || product.category?.name, "Premium");
  const safeId = encodeURIComponent(product.id);
  return `
   <div class="prod-card ${isLarge ? 'large' : ''}" onclick="openProduct(decodeURIComponent('${safeId}'))">
    <div class="prod-img-wrap">
     <img src="${productImage(product)}" alt="${product.name}">
     <div class="media-chip">${hasVideo(product) ? '▶ ' + count + ' média' : 'IMAGE'}</div>
     <button class="fav-chip ${isFav ? 'active' : ''}" aria-label="Favori" onclick="event.stopPropagation(); toggleFavorite(decodeURIComponent('${safeId}'))">${favoriteIconHTML(isFav)}</button>
    </div>
    <div class="prod-info">
     <div class="prod-label-row"><div class="prod-badge">${shortText(badge, 30)}</div><span class="prod-gamme-pill ${product.gamme === 'premium' ? 'is-premium' : ''}">Gamme ${product.gamme === 'premium' ? 'Premium' : 'Classic'}</span></div>
     <div class="prod-title">${product.name}</div>
     <div class="prod-farm">Collection : ${shortText(product.farm || product.farmName, 42)}</div>
     <div class="prod-card-bottom">
      <div class="from-price"><span>À partir de</span><b>${money(from)}</b></div>
      <div class="details-pill">Détails</div>
     </div>
    </div>
   </div>`;
 }

 function renderHome(products = allProducts) {
  const catContainer = document.getElementById("cat-scroll");
  catContainer.innerHTML = appData.map(createCategoryCard).join("");
  const catalogEmpty = document.getElementById("catalogue-empty");
  const catalogSection = document.getElementById("catalogue-section");
  if (catalogEmpty) catalogEmpty.hidden = appData.length > 0;
  if (catalogSection) catalogSection.hidden = appData.length === 0;

  const filtered = products;
  document.getElementById("recent-scroll").innerHTML = filtered.slice(0, 6).map(p => createCardHTML(p, true)).join("");
  document.getElementById("trend-grid").innerHTML = filtered.slice(0, 12).map(p => createCardHTML(p, false)).join("") || emptyState("Aucun article trouvé");
  setStats();
 }

 function emptyState(text) {
  return `<div class="empty-state" style="grid-column:1/-1">${text}</div>`;
 }

 document.getElementById("home-search")?.addEventListener("input", (e) => {
  const q = e.target.value;
  const results = allProducts.filter(p => productMatches(p, q));
  renderHome(results);
 });

 // La gamme est le premier niveau, puis on choisit une sous-catégorie.
 function farmsForCurrentGamme() {
  if (!currentCategory) return [];
  return currentCategory.farms.filter(f => !f.gamme || f.gamme === currentGamme);
 }

 function productsInFarmAndGamme(farm) {
  return (farm.products || []).filter(p => p.gamme === currentGamme);
 }

 function updateGammeUI() {
  const switcher = document.getElementById('gamme-switch');
  if (switcher) switcher.querySelectorAll('[data-gamme]').forEach(btn => {
   const active = btn.dataset.gamme === currentGamme;
   btn.classList.toggle('active', active);
   btn.setAttribute('aria-pressed', String(active));
  });
  const title = document.getElementById('gamme-selected-label');
  if (title) title.textContent = currentGamme === 'premium' ? 'Gamme Premium' : 'Gamme Classic';
  const copy = document.getElementById('gamme-selected-desc');
  if (copy) copy.textContent = currentGamme === 'premium' ? 'La sélection prestige de Room Service.' : 'Les essentiels de la collection Room Service.';

  const select = document.getElementById('cat-type-select');
  const farms = farmsForCurrentGamme();
  if (select) {
   select.innerHTML = '<option value="ALL">Toutes les sous-catégories</option>' +
    farms.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
   select.value = farms.some(f => f.id === selectedSubtype) ? selectedSubtype : 'ALL';
   selectedSubtype = select.value;
  }
 }

 window.switchGamme = function(gamme) {
  if (!['classic', 'premium'].includes(gamme)) return;
  currentGamme = gamme;
  selectedSubtype = 'ALL';
  updateGammeUI();
  renderCategoryProducts();
  haptic();
 };

 window.selectSubtype = function(id) {
  const available = farmsForCurrentGamme();
  if (id !== 'ALL' && !available.some(f => f.id === id)) return;
  selectedSubtype = selectedSubtype === id ? 'ALL' : id;
  const select = document.getElementById('cat-type-select');
  if (select) select.value = selectedSubtype;
  renderCategoryProducts();
  haptic();
 };

 window.openCategory = function(catId) {
  currentCategory = appData.find(c => c.id === catId);
  if (!currentCategory) return;
  currentGamme = 'classic';
  selectedSubtype = 'ALL';
  window.lastListPage = 'cat-list';

  document.getElementById('cat-list-title').innerText = currentCategory.name;
  document.getElementById('cat-banner-img').src = currentCategory.image || 'RoomServiceLogo.jpg';
  document.getElementById('cat-banner-bg').src = currentCategory.image || 'RoomServiceLogo.jpg';
  document.getElementById('cat-search').value = '';
  updateGammeUI();
  renderCategoryProducts();
  navigate('cat-list');
 };

 function renderCategoryProducts() {
  if (!currentCategory) return;
  const farms = farmsForCurrentGamme();
  const selectedFarm = selectedSubtype;
  const query = document.getElementById('cat-search')?.value || '';
  const categoryNav = document.getElementById('subcategory-list');
  if (categoryNav) {
   categoryNav.innerHTML = farms.map(f => {
    const count = productsInFarmAndGamme(f).length;
    const active = selectedFarm === f.id;
    return `<button type="button" class="subtype-card${active ? ' active' : ''}" aria-pressed="${active}" onclick="selectSubtype('${f.id}')">
      <span class="subtype-symbol">${f.symbol || '✦'}</span>
      <span class="subtype-name">${f.name}</span>
      <span class="subtype-count">${count} article${count > 1 ? 's' : ''}</span>
     </button>`;
   }).join('');
  }

  const products = farms
   .filter(farm => selectedFarm === 'ALL' || farm.id === selectedFarm)
   .flatMap(farm => productsInFarmAndGamme(farm))
   .filter(p => productMatches(p, query));

  const count = document.getElementById('gamme-products-count');
  if (count) count.textContent = `${products.length} article${products.length > 1 ? 's' : ''}`;
  const grid = document.getElementById('cat-list-grid');
  grid.innerHTML = products.map(p => createCardHTML(p, false)).join('') ||
    `<div class="empty-state collection-awaiting" style="grid-column:1/-1">
      <span class="awaiting-symbol">♛</span>
      <strong>${selectedFarm === 'ALL' ? 'Collection à venir' : 'Pièces à venir'}</strong>
      <span>Les articles de la ${currentGamme === 'premium' ? 'Gamme Premium' : 'Gamme Classic'} seront bientôt présentés.</span>
     </div>`;
 }

 document.getElementById('cat-type-select')?.addEventListener('change', e => {
  selectedSubtype = e.target.value;
  renderCategoryProducts();
  haptic();
 });
 document.getElementById('cat-search')?.addEventListener('input', renderCategoryProducts);

 function productVideoControlsHTML() {
  return `
   <div class="product-video-controls">
    <button type="button" id="video-play-pause">⏸</button>
    <button type="button" id="video-back-10">↺ 10s</button>
    <button type="button" id="video-fullscreen">⛶</button>
   </div>`;
 }

 function showProductVideoControls() {
  const layer = document.getElementById("product-video-controls-layer");
  if (!layer) return;
  layer.innerHTML = productVideoControlsHTML();
  bindProductVideoControls();
 }

 function hideProductVideoControls() {
  const layer = document.getElementById("product-video-controls-layer");
  if (layer) layer.innerHTML = "";
 }

 function getActiveProductVideo() {
  const mediaZone = document.getElementById("prod-media");
  const videos = Array.from(mediaZone.querySelectorAll("video"));
  if (!videos.length) return null;
  if (videos.length === 1) return videos[0];
  const center = mediaZone.scrollLeft + mediaZone.clientWidth / 2;
  return videos.reduce((best, video) => {
   const slide = video.closest(".multi-video-slide");
   const slideCenter = slide.offsetLeft + slide.clientWidth / 2;
   const distance = Math.abs(slideCenter - center);
   return distance < best.distance ? { video, distance } : best;
  }, { video: videos[0], distance: Infinity }).video;
 }

 function bindProductVideoControls() {
  const playPauseBtn = document.getElementById("video-play-pause");
  const backBtn = document.getElementById("video-back-10");
  const fullscreenBtn = document.getElementById("video-fullscreen");
  if (!playPauseBtn || !backBtn || !fullscreenBtn) return;

  playPauseBtn.onclick = () => {
   const video = getActiveProductVideo();
   if (!video) return;
   if (video.paused) { video.play(); playPauseBtn.innerText = "⏸"; }
   else { video.pause(); playPauseBtn.innerText = "▶"; }
   haptic();
  };
  backBtn.onclick = () => { const v = getActiveProductVideo(); if (v) v.currentTime = Math.max(0, v.currentTime - 10); haptic(); };
  fullscreenBtn.onclick = () => {
   const v = getActiveProductVideo(); if (!v) return;
   if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
   else if (v.requestFullscreen) v.requestFullscreen();
   else if (v.webkitRequestFullscreen) v.webkitRequestFullscreen();
   haptic();
  };
 }

 window.openProduct = function(id) {
  currentProd = allProducts.find(p => p.id === id);
  if (!currentProd) return;
  currQty = 1;
  currTarif = currentProd.tarifs?.[0] || { weight: "-", price: 0 };
  currVar = currentProd.jars ? currentProd.jars[0].name : null;
  window.lastListPage = document.getElementById("page-cat-list").classList.contains("active") ? "cat-list" : "home";

  const mediaZone = document.getElementById("prod-media");
  mediaZone.className = "prod-media-zone";
  if (currentProd.videos && currentProd.videos.length > 0) {
   mediaZone.classList.add("multiple-media");
   let html = currentProd.videos.map(v => `<div class="multi-video-slide"><video autoplay loop muted playsinline controls><source src="${v}" type="video/mp4"></video></div>`).join("");
   if (currentProd.videos.length > 1) html += `<div class="swipe-hint">Swipe ➜</div>`;
   mediaZone.innerHTML = html;
   showProductVideoControls();
  } else if (currentProd.video) {
   mediaZone.innerHTML = `<video autoplay loop muted playsinline controls><source src="${currentProd.video}" type="video/mp4"></video>`;
   showProductVideoControls();
  } else {
   mediaZone.innerHTML = `<img src="${productImage(currentProd)}" alt="${currentProd.name}">`;
   hideProductVideoControls();
  }

  document.getElementById("p-type").innerText = safeText(currentProd.type, "Collection");
  const gammeChip = document.getElementById('p-gamme');
  if (gammeChip) {
   gammeChip.textContent = currentProd.gamme === 'premium' ? 'Gamme Premium' : 'Gamme Classic';
   gammeChip.classList.toggle('is-premium', currentProd.gamme === 'premium');
  }
  document.getElementById("p-name").innerText = currentProd.name;
  document.getElementById("p-farm").innerText = "Collection : " + safeText(currentProd.farm || currentProd.farmName, "Non renseignée");
  document.getElementById("p-subtype").innerText = safeText(currentProd.farmName, "-");
  document.getElementById("p-from").innerText = money(firstPrice(currentProd));
  document.getElementById("p-media-count").innerText = `${mediaCount(currentProd)} média${mediaCount(currentProd) > 1 ? 's' : ''}`;
  document.getElementById("p-format-count").innerText = `${currentProd.tarifs?.length || 0} format${(currentProd.tarifs?.length || 0) > 1 ? 's' : ''}`;
  document.getElementById("p-desc").innerHTML = currentProd.description ? currentProd.description.split("\\n").join("<br>") : "Fiche catalogue avec visuel, farm, formats disponibles et médias associés.";
  syncProductFavoriteButton();

  const vZone = document.getElementById("variants-zone");
  const vScroll = document.getElementById("p-variants");
  if (currentProd.jars && currentProd.jars.length) {
   vZone.style.display = "block";
   vScroll.innerHTML = currentProd.jars.map((j, i) => `<div class="tarif-pill var-btn ${i === 0 ? 'active' : ''}" data-val="${j.name}"><span class="w">${j.emoji || '•'}</span><span class="p">${j.name}</span></div>`).join("");
   document.querySelectorAll(".var-btn").forEach(btn => btn.onclick = e => {
    document.querySelectorAll(".var-btn").forEach(x => x.classList.remove("active"));
    e.currentTarget.classList.add("active"); currVar = e.currentTarget.dataset.val; haptic();
   });
  } else vZone.style.display = "none";

  const tScroll = document.getElementById("p-tarifs");
  tScroll.innerHTML = (currentProd.tarifs || []).map((t, i) => `<div class="tarif-pill tar-btn ${i === 0 ? 'active' : ''}" data-idx="${i}"><span class="w">${t.weight}</span><span class="p">${money(t.price)}</span></div>`).join("");
  document.querySelectorAll(".tar-btn").forEach(btn => btn.onclick = e => {
   document.querySelectorAll(".tar-btn").forEach(x => x.classList.remove("active"));
   e.currentTarget.classList.add("active"); currTarif = currentProd.tarifs[e.currentTarget.dataset.idx]; updateProdTotal(); haptic();
  });

  renderSimilarProducts();
  updateProdTotal();
  navigate("product");
 };

 function renderSimilarProducts() {
  const similar = allProducts
   .filter(p => p.id !== currentProd.id && (p.category?.id === currentProd.category?.id || p.farmName === currentProd.farmName))
   .slice(0, 8);
  document.getElementById("p-similar").innerHTML = similar.map(p => createCardHTML(p, false)).join("") || `<div class="tiny">Aucun produit similaire.</div>`;
 }

 function updateProdTotal() {
  document.getElementById("p-qty").innerText = currQty;
  document.getElementById("p-total").innerText = money((currTarif?.price || 0) * currQty);
 }
 document.getElementById("p-minus").onclick = () => { if (currQty > 1) { currQty--; updateProdTotal(); haptic(); } };
 document.getElementById("p-plus").onclick = () => { currQty++; updateProdTotal(); haptic(); };
 document.getElementById("p-like").onclick = () => toggleFavorite(currentProd.id);

 window.toggleFavorite = function(id) {
  if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
  syncProductFavoriteButton();
  renderHome();
  renderCategoryProducts();
  renderFavorites();
  haptic("medium");
 };

 document.getElementById("p-add").onclick = () => {
  if (!currentProd || !currTarif) return;
  const cartId = `${currentProd.id}-${currTarif.weight}-${currVar || 'def'}`;
  const found = cart.find(i => i.id === cartId);
  let name = currentProd.name + (currVar ? ` (${currVar})` : "");
  if (found) { found.qty += currQty; found.tot = found.qty * found.price; }
  else cart.push({ id: cartId, productId: currentProd.id, name, img: productImage(currentProd), farm: currentProd.farm || currentProd.farmName, weight: currTarif.weight, price: currTarif.price, qty: currQty, tot: currTarif.price * currQty });
  updateBadge(); document.getElementById("success-modal").style.display = "flex"; haptic("heavy");
 };

 function updateBadge() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const badge = document.getElementById("nav-badge");
  badge.innerText = count;
  badge.style.display = count ? "flex" : "none";
 }

 function renderCart() {
  const list = document.getElementById("cart-list");
  if (!cart.length) {
   list.innerHTML = emptyState("Ta sélection est vide.");
   document.getElementById("cart-recap-text").innerText = "Total (0)";
   document.getElementById("cart-total-display").innerText = "0€";
   return;
  }
  list.innerHTML = cart.map((i, index) => `
   <div class="cart-item">
    <img src="${i.img}" alt="${i.name}">
    <div style="flex:1;min-width:0">
     <div style="font-weight:1000;line-height:1.2">${i.name}</div>
     <div class="tiny">Collection : ${shortText(i.farm, 34)}</div>
     <div class="tiny">${i.weight} · x${i.qty} · ${money(i.tot)}</div>
    </div>
    <button class="cart-trash" onclick="removeCartItem(${index})">×</button>
   </div>`).join("");
  const total = cart.reduce((s, i) => s + i.tot, 0);
  document.getElementById("cart-recap-text").innerText = `Total (${cart.reduce((s,i)=>s+i.qty,0)})`;
  document.getElementById("cart-total-display").innerText = money(total);
 }

 window.removeCartItem = function(index) { cart.splice(index, 1); renderCart(); updateBadge(); haptic(); };

 function renderFavorites() {
  const favs = allProducts.filter(p => favorites.has(p.id));
  document.getElementById("fav-grid").innerHTML = favs.map(p => createCardHTML(p, false)).join("") || emptyState("Aucun favori pour le moment.");
 }

 document.querySelectorAll(".mode-btn").forEach(btn => btn.addEventListener("click", e => {
  document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
  e.currentTarget.classList.add("active");
  checkoutMode = e.currentTarget.dataset.m;
  haptic();
 }));

 function renderCheckout() {
  const items = document.getElementById("checkout-items");
  if (!cart.length) { items.innerHTML = "Aucun produit dans la sélection."; document.getElementById("checkout-total").innerText = "Total indicatif : 0€"; return; }
  items.innerHTML = cart.map(i => `• ${i.name} — ${i.weight} x${i.qty} — ${money(i.tot)}`).join("<br>");
  document.getElementById("checkout-total").innerText = "Total indicatif : " + money(cart.reduce((s,i)=>s+i.tot,0));
 }

 document.getElementById("send-request-btn")?.addEventListener("click", () => {
  const note = document.getElementById("address-field").value.trim();
  const lines = cart.map(i => `- ${i.name} | ${i.weight} x${i.qty} | ${money(i.tot)}`).join("\n");
  const total = money(cart.reduce((s,i)=>s+i.tot,0));
  const msg = `Salut, je voudrais des infos sur ma sélection catalogue.\n\nMode : ${checkoutMode}\n${lines}\n\nTotal indicatif : ${total}${note ? "\n\nNote : " + note : ""}`;
  if (!contactUrl) { try { tg.showAlert("Le contact Telegram officiel n'est pas encore configuré."); } catch(e) {} return; }
  window.open(contactUrl + "?text=" + encodeURIComponent(msg), "_blank");
 });

 document.querySelectorAll(".nav-btn").forEach(btn => btn.addEventListener("click", () => {
  const page = btn.dataset.target.replace("page-", "");
  navigate(page);
  haptic();
 }));

 const user = tg.initDataUnsafe?.user;
 if (user) {
  document.getElementById("prof-pseudo").innerText = user.username ? `@${user.username}` : (user.first_name || "Membre");
  document.getElementById("prof-id").innerText = user.id || "-";
  if (user.photo_url) document.getElementById("prof-img").src = user.photo_url;
 }

 renderHome();
 updateBadge();
});
