// Global UI Helper Reference
let uiHelpers = null;

let map;
let marker;
let currentApiData = null;
const defaultLat = -7.7956;
const defaultLng = 110.3695;

// Elements references (may be null in Detail View)
const mapContainer = document.getElementById('map');
const mapLoading = document.getElementById('map-loading');
const resultsList = document.getElementById('results-list');
const resultsSummary = document.getElementById('results-summary');
const liveWeatherCards = document.getElementById('live-weather-cards');
const liveTemp = document.getElementById('live-temp');
const liveHumidity = document.getElementById('live-humidity');
const livePrecip = document.getElementById('live-precip');
const liveCocok = document.getElementById('live-cocok');
const livePlaceholder = document.getElementById('live-weather-placeholder');
const filterSearch = document.getElementById('filter-search');
const filterGrade = document.getElementById('filter-grade');
const filterGradeValue = document.getElementById('filter-grade-value');
const filterCategory = document.getElementById('filter-category');
const filterSort = document.getElementById('filter-sort');

// Initialization Function (Called by index.ejs and detail.ejs)
window.initKoncoTani = function(ui) {
    console.log("Initializing KoncoTani Admin Script...");
    uiHelpers = ui; // Store UI helpers for use in other functions

    if (!mapContainer) {
        console.error("Map container not found. Aborting initialization.");
        if (uiHelpers && uiHelpers.displayError) uiHelpers.displayError("Komponen peta tidak ditemukan.");
        return;
    }

    initMap();
    initFilters();
};

function initMap() {
    map = L.map('map').setView([defaultLat, defaultLng], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    if (marker) marker.remove();
    marker = L.marker([defaultLat, defaultLng]).addTo(map)
             .bindPopup(`Lokasi Default:<br>Lat: ${defaultLat.toFixed(4)}, Lng: ${defaultLng.toFixed(4)}`).openPopup();

    if (uiHelpers && uiHelpers.addMapMarker) {
        // Optional: Sync map marker logic if provided
    }

    console.log("Triggering analysis for default location...");
    triggerAnalysisForLocation(defaultLat, defaultLng);

    map.on('click', onMapClick);
}

function initFilters() {
    // Only attach listeners if elements exist (List View)
    if (filterSearch) filterSearch.addEventListener('input', () => runComparison(currentApiData));
    if (filterCategory) filterCategory.addEventListener('change', () => runComparison(currentApiData));
    if (filterSort) filterSort.addEventListener('change', () => runComparison(currentApiData));
    if (filterGrade) {
        if (filterGradeValue) filterGradeValue.textContent = `${filterGrade.value}%`;
        filterGrade.addEventListener('input', (e) => {
             if (filterGradeValue) filterGradeValue.textContent = `${e.target.value}%`;
        });
        filterGrade.addEventListener('change', () => runComparison(currentApiData));
    }
}

function onMapClick(e) {
    const { lat, lng } = e.latlng;
    console.log("Map clicked by user at:", lat, lng);
    triggerAnalysisForLocation(lat, lng);
}

async function triggerAnalysisForLocation(lat, lng) {
    // UI Update - Loading State
    if (uiHelpers && uiHelpers.showLoadingState) {
        uiHelpers.showLoadingState();
    } else {
        // Fallback Default UI
        if (mapLoading) mapLoading.style.display = 'block';
        if (resultsSummary) resultsSummary.textContent = 'Mengambil data dari API eksternal...';
        if (liveWeatherCards) liveWeatherCards.style.display = 'none';
        if (livePlaceholder) livePlaceholder.style.display = 'grid';
    }

    if (marker) marker.remove();
    marker = L.marker([lat, lng]).addTo(map)
             .bindPopup(`Lokasi Terpilih:<br>Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`).openPopup();

    try {
        const weatherApiData = await fetchWeatherData(lat, lng);
        const soilApiData = await fetchSoilData(lat, lng);
        currentApiData = {
            current: { ...weatherApiData.current, ...soilApiData.current },
            units: { ...weatherApiData.units, ...soilApiData.units }
        };

        // UI Update - Live Cards
        if (uiHelpers && uiHelpers.updateLiveCards) {
             uiHelpers.updateLiveCards(currentApiData.current, currentApiData.units);
        } else {
             updateLiveCardsUI(currentApiData.current, currentApiData.units);
        }
        
        runComparison(currentApiData);

    } catch (error) {
        console.error('Gagal mengambil data API:', error);
        if (uiHelpers && uiHelpers.displayError) {
            uiHelpers.displayError(`Gagal memuat data API: ${error.message}`);
        } else {
            displayErrorUI(`Gagal memuat data API: ${error.message}`);
        }
    } finally {
        if (uiHelpers && uiHelpers.hideLoadingState) {
            uiHelpers.hideLoadingState();
        } else {
            if (mapLoading) mapLoading.style.display = 'none';
        }
    }
}

async function fetchWeatherData(lat, lng) {
    const weatherVars = [
        'temperature_2m', 'relative_humidity_2m', 'precipitation', 'wind_speed_10m',
        'shortwave_radiation', 'evapotranspiration'
    ].join(',');
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=${weatherVars}`;
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error('API Cuaca (Open-Meteo) gagal merespon.');
    return await response.json();
}

async function fetchSoilData(lat, lng) {
    // console.warn("Fetch SoilGrids data not implemented yet. Returning dummy data.");
    return {
        current: {
            'soil_temperature_0_to_7cm': 25.5, 'soil_moisture_0_to_7cm': 0.3, 'phh2o': 6.5, 'soc': 2.1
        }, units: {
            'soil_temperature_0_to_7cm': '°C', 'soil_moisture_0_to_7cm': 'm³/m³', 'phh2o': 'pH', 'soc': '%'
        }
    };
}

// === Default UI Helpers (Fallback for List View) ===
function updateLiveCardsUI(current, units) {
    if (livePlaceholder) livePlaceholder.style.display = 'none';
    if (liveWeatherCards) liveWeatherCards.style.display = 'grid';
    if (liveTemp) liveTemp.textContent = `${current.temperature_2m ?? 'N/A'}${units?.temperature_2m || '°C'}`;
    if (liveHumidity) liveHumidity.textContent = `${current.relative_humidity_2m ?? 'N/A'}${units?.relative_humidity_2m || '%'}`;
    if (livePrecip) livePrecip.textContent = `${current.precipitation ?? 'N/A'} ${units?.precipitation || 'mm'}`;
}

function displayErrorUI(errorMessage) {
     if(resultsSummary) resultsSummary.textContent = `Error: ${errorMessage}`;
     if(resultsList) resultsList.innerHTML = `<p class="col-span-full text-red-500 text-center py-6">${errorMessage}</p>`;
     if(livePlaceholder) livePlaceholder.style.display = 'grid';
     if(liveWeatherCards) liveWeatherCards.style.display = 'none';
}

function displayInitialStateUI(message = 'Pilih lokasi di peta untuk melihat hasil kecocokan produk pertanian.') {
    // Only run if resultsList exists (List View)
    if(resultsList) {
        const initialMsgDiv = document.getElementById('initial-message');
         if (!initialMsgDiv) {
             resultsList.innerHTML = `
                <div id="initial-message" class="col-span-full text-center py-8 text-gray-500 text-sm">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /> <path vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span class="mt-2 block">${message}</span>
                </div>`;
         } else {
             initialMsgDiv.style.display = 'block';
             const span = initialMsgDiv.querySelector('span.mt-2');
             if (span) span.textContent = message;
             resultsList.querySelectorAll('.product-card').forEach(card => card.remove());
         }
    }
    if(resultsSummary) resultsSummary.textContent = 'Pilih lokasi di peta.';
    if(liveWeatherCards) liveWeatherCards.style.display = 'none';
    if(livePlaceholder) livePlaceholder.style.display = 'grid';
}

const parameterApiMapping = {
    'Suhu Rata-rata': ['temperature_2m', '°C'], 'Kelembaban Relatif': ['relative_humidity_2m', '%'], 'Curah Hujan': ['precipitation', 'mm'], 'Kecepatan Angin': ['wind_speed_10m', 'm/s'], 'Radiasi Matahari': ['shortwave_radiation', 'MJ/m²/day'], 'Evapotranspirasi': ['evapotranspiration', 'mm/day'], 'Suhu Tanah (0-7cm)': ['soil_temperature_0_to_7cm', '°C'], 'Kelembaban Tanah (0-7cm)': ['soil_moisture_0_to_7cm', 'm³/m³'], 'pH Tanah': ['phh2o', 'pH'], 'Kandungan Organik': ['soc', '%']
};

function runComparison(apiData) {
    if (!apiData || !apiData.current) {
        if (uiHelpers && uiHelpers.displayInitialState) {
            uiHelpers.displayInitialState('Pilih lokasi di peta untuk melihat kecocokan.');
        } else {
            displayInitialStateUI('Pilih lokasi di peta untuk melihat kecocokan.');
        }
        return;
    }
    
    // Get filter values either via UI helpers or direct DOM fallback
    let searchTerm = '', filterCategoryVal = 'Semua', filterSortVal = 'nama', passingGrade = 0;

    if (uiHelpers && uiHelpers.getFilterValues) {
        const filters = uiHelpers.getFilterValues();
        searchTerm = filters.search;
        filterCategoryVal = filters.category;
        filterSortVal = filters.sort;
        passingGrade = filters.grade;
    } else {
         searchTerm = filterSearch ? filterSearch.value.toLowerCase() : '';
         filterCategoryVal = filterCategory ? filterCategory.value : 'Semua';
         filterSortVal = filterSort ? filterSort.value : 'nama';
         passingGrade = filterGrade ? parseInt(filterGrade.value, 10) : 0;
    }

    let productsToCompare = typeof allProductsData !== 'undefined' ? allProductsData : [];
    
    let calculatedProducts = productsToCompare.map(product => {
        // Fix: Check correct Sequelize alias (ID_GroupParameter_groupparameter) first
        const params = product.ID_GroupParameter_groupparameter?.parameters || product.groupparameter?.parameters;
        let score = 0; let validParamCount = 0; let paramDetails = []; let scorePercent = 0;
        
        if (params && params.length > 0) {
            paramDetails = params.map(param => {
                const mapping = parameterApiMapping[param.Nama];
                const apiCode = mapping ? mapping[0] : null; 
                const unit = mapping ? mapping[1] : (param.Unit || 'N/A');
                
                const actualValue = apiCode ? apiData.current[apiCode] : undefined;
                let isCocok = false; let readableActual = 'N/A';
                
                if (apiCode) validParamCount++;
                
                if (actualValue !== undefined && actualValue !== null) { 
                    readableActual = actualValue; 
                    if (actualValue >= param.Minimal && actualValue <= param.Maksimal) { 
                        score++; isCocok = true; 
                    } 
                } else if (mapping) { 
                    readableActual = 'API N/A'; 
                } else { 
                    readableActual = 'DB N/A'; 
                }
                return { ...param, Unit: unit, actualValue: readableActual, isCocok };
            });
            scorePercent = validParamCount > 0 ? (score / validParamCount) * 100 : 0;
        } else { 
            validParamCount = 0; 
        }
        return { ...product, score, paramCount: validParamCount, scorePercent, paramDetails };
    });

    // Filter Logic
    calculatedProducts = calculatedProducts.map(p => {
        let isVisible = true;
        if (filterCategoryVal !== 'Semua' && p.Kategori !== filterCategoryVal) { isVisible = false; }
        if (searchTerm && !p.Nama.toLowerCase().includes(searchTerm)) { isVisible = false; }
        if (p.paramCount > 0 && p.scorePercent < passingGrade) { isVisible = false; }
        return { ...p, isVisible };
    });

    // Sorting Logic
    calculatedProducts.sort((a, b) => {
        if (filterSortVal === 'cocok') { 
            if (a.paramCount === 0 && b.paramCount > 0) return 1; 
            if (a.paramCount > 0 && b.paramCount === 0) return -1; 
            return b.scorePercent - a.scorePercent; 
        }
        return a.Nama.localeCompare(b.Nama);
    });

    if (uiHelpers && uiHelpers.displayResults) {
        uiHelpers.displayResults(calculatedProducts, passingGrade, productsToCompare.length);
    } else {
        renderResultsUI(calculatedProducts);
    }
}

function renderResultsUI(products) {
    if (!resultsList) return; // Guard for Detail View

    const visibleProducts = products.filter(p => p.isVisible);
    const passingGradeValue = filterGrade ? parseInt(filterGrade.value, 10) : 0;
    const cocokCount = visibleProducts.filter(p => p.paramCount > 0 && p.scorePercent >= passingGradeValue).length;

    if (liveCocok) liveCocok.textContent = `${cocokCount} Produk`;
    if (resultsSummary) resultsSummary.textContent = `Menampilkan ${visibleProducts.length} dari ${products.length} produk (Min. Kecocokan: ${passingGradeValue}%)`;

    resultsList.innerHTML = '';

    if (visibleProducts.length === 0) {
        if (resultsList) resultsList.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-500 text-sm"><svg class="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span class="mt-2 block">Tidak ada produk cocok...</span></div>`;
        return;
    }

    visibleProducts.forEach(product => {
        resultsList.innerHTML += createCardHTML(product, true);
    });
    console.log("[DEBUG] renderResults finished (rebuild mode)");
}


// === 9. Helper: Create Card HTML (Add Detail Button) ===
function createCardHTML(product, isVisible) {
    let isCocok = false; let statusText = 'N/A'; let statusClass = 'status-na';
    const passingGradeValue = filterGrade ? parseInt(filterGrade.value, 10) : 0;
    if (product.paramCount > 0 && currentApiData) { isCocok = product.scorePercent >= passingGradeValue; statusText = isCocok ? 'Cocok' : 'Tidak Cocok'; statusClass = isCocok ? 'status-cocok' : 'status-tidak-cocok'; }
    else if (!currentApiData) { statusText = 'Pilih Lokasi'; } else { statusText = 'Parameter N/A'; }
    const formattedPrice = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(product.Harga || 0);
    const discountPercent = product.Diskon ? (product.Diskon * 100).toFixed(1) + '%' : null;
    const originalPrice = (product.Diskon && product.Harga > 0) ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(product.Harga / (1 - product.Diskon)) : null;
    let paramsHTML = `<li class="text-xs text-gray-400 italic py-3 text-center">Pilih lokasi di peta.</li>`;
    if (currentApiData && currentApiData.current) {
        if (product.paramDetails && product.paramDetails.length > 0) {
            const mappedParams = product.paramDetails.filter(param => parameterApiMapping[param.Nama]);
            if (mappedParams.length > 0) {
                paramsHTML = mappedParams.map(param => {
                    const paramStatusClass = param.isCocok ? 'param-cocok' : 'param-tidak-cocok';
                    const actualText = param.actualValue;
                    const unitText = param.Unit || 'N/A';
                    return `
                    <li class="param-item">
                        <span class="param-name" title="${param.Nama}">${param.Nama} (${unitText})</span>
                        <span class="param-optimal-range">Opt: ${param.Minimal}–${param.Maksimal}</span>
                        <span class="param-actual-value ${paramStatusClass}">${actualText}</span>
                    </li>`;
                }).join('');
            } else {
                 paramsHTML = `<li class="text-xs text-gray-400 italic py-3 text-center">Parameter optimal produk ini tidak tercocokkan.</li>`;
            }
        } else {
            paramsHTML = `<li class="text-xs text-gray-400 italic py-3 text-center">Produk ini tidak memiliki parameter optimal.</li>`;
        }
    }

    const scoreText = product.paramCount > 0 && currentApiData ? `Kecocokan: <strong>${product.score}/${product.paramCount}</strong> (${product.scorePercent.toFixed(1)}%)` : `Kecocokan: <strong>N/A</strong>`;
    const firstPhoto = product.photos && product.photos.length > 0 ? product.photos[0].Foto : null;
    const imageHTML = firstPhoto ? `<img src="/images/produk/${firstPhoto}" alt="${product.Nama}" class="product-image block">` : `<div class="product-image-placeholder">[ Tidak Ada Foto ]</div>`;

    return `
        <div class="product-card bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col h-full" data-product-id="${product.ID_Product}">
            ${imageHTML}
            <div class="p-4 flex flex-col flex-grow">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 product-name leading-tight">${product.Nama}</h3>
                        <p class="text-xs text-gray-500 product-category">${product.Kategori || 'Tanpa Kategori'}</p>
                    </div>
                    <span class="status-badge ${statusClass} mt-1 flex-shrink-0 ml-2">${statusText}</span>
                </div>
                <div class="text-sm mb-2">
                    <span class="text-lg font-semibold text-blue-700">${formattedPrice}</span>
                    ${discountPercent ? `<span class="ml-2 text-xs bg-red-100 text-red-700 font-medium px-1.5 py-0.5 rounded">${discountPercent} OFF</span>` : ''}
                    ${originalPrice ? `<span class="ml-2 text-xs text-gray-400 line-through">${originalPrice}</span>` : ''}
                </div>
                <p class="text-xs text-gray-600 description-full mb-2 min-h-[30px] flex-grow">
                    ${product.Deskripsi ? (product.Deskripsi.length > 100 ? product.Deskripsi.substring(0, 100) + '...' : product.Deskripsi) : 'Tidak ada deskripsi.'}
                </p>
                <p class="text-sm text-gray-600 product-score mb-3">${scoreText}</p>
                <details class="product-details text-sm mb-3">
                    <summary class="cursor-pointer text-blue-600 hover:text-blue-800 font-medium text-xs">Detail Parameter</summary>
                    <div class="parameter-list-scroll">
                        <ul class="product-params">${paramsHTML}</ul>
                    </div>
                </details>
         
                <div class="mt-auto pt-3 border-t border-gray-100 flex justify-end space-x-2">
                    
                     <a href="/admin/produk/${product.ID_Product}" class="bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-medium py-1 px-2.5 rounded border border-blue-200 hover:border-blue-300"> Detail </a>
                     <a href="/admin/produk/${product.ID_Product}/edit" class="bg-gray-100 hover:bg-yellow-100 text-gray-700 hover:text-yellow-800 text-xs font-medium py-1 px-2.5 rounded border border-gray-200 hover:border-yellow-200"> Edit </a>
                     <form action="/admin/produk/${product.ID_Product}/delete" method="POST" onsubmit="return confirm('Hapus produk ${product.Nama}?');"><button type="submit" class="bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-red-800 text-xs font-medium py-1 px-2.5 rounded border border-gray-200 hover:border-red-200"> Hapus </button></form>
                </div>
            </div>
        </div>`;
}

function resetCardsToInitialState() {
     if (resultsList) {
        const initialMsgDiv = document.getElementById('initial-message');
         if (!initialMsgDiv) {
             resultsList.innerHTML = `<div id="initial-message" class="col-span-full text-center py-8 text-gray-500 text-sm"><svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /> <path vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg><span class="mt-2 block">Pilih lokasi di peta...</span></div>`;
         } else {
             initialMsgDiv.style.display = 'block';
             resultsList.querySelectorAll('.product-card').forEach(card => card.remove());
         }
     }
      if(resultsSummary) resultsSummary.textContent = `Pilih lokasi di peta.`;
      if(liveWeatherCards) liveWeatherCards.style.display = 'none';
      if(livePlaceholder) livePlaceholder.style.display = 'grid';
 }