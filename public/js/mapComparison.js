// public/js/mapComparison.js

// Variabel Global untuk menyimpan status
let map;
let marker;
let currentParamGroupId = null;
const mapContainer = document.getElementById('map');
const comparisonSection = document.getElementById('comparison-section');
const comparisonTitle = document.getElementById('comparison-title');
const resultsContainer = document.getElementById('results-container');
const resultsTableBody = document.getElementById('results-table-body');
const locationCoords = document.getElementById('location-coords');
const loadingSpinner = document.getElementById('loading-spinner');

// 1. Inisialisasi Peta
function initializeMap() {
    // Hanya inisialisasi jika peta belum ada
    if (!map) {
        // Koordinat awal (misal: Yogyakarta)
        map = L.map('map').setView([-7.7956, 110.3695], 10);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Tambahkan event listener saat peta di-klik
        map.on('click', onMapClick);
    }
}

// 2. Event Listener untuk tombol "Cek Peta" di tabel
document.querySelectorAll('.btn-cek-lokasi').forEach(button => {
    button.addEventListener('click', () => {
        // Ambil data dari tombol
        const paramId = button.getAttribute('data-param-id');
        const namaProduk = button.getAttribute('data-produk-nama');
        
        // Simpan ID parameter grup saat ini
        currentParamGroupId = paramId;

        // Tampilkan section peta
        comparisonTitle.innerText = `Perbandingan Parameter: ${namaProduk}`;
        comparisonSection.style.display = 'block';
        
        // Inisialisasi peta (jika belum)
        initializeMap();
        
        // Reset tampilan hasil
        resultsContainer.style.display = 'none';
        if(marker) marker.remove();
        
        // Scroll ke peta
        comparisonSection.scrollIntoView({ behavior: 'smooth' });
        
        // Bug fix untuk Leaflet (peta tidak me-render penuh)
        setTimeout(() => map.invalidateSize(), 100);
    });
});

// 3. Fungsi saat Peta di-klik
async function onMapClick(e) {
    const { lat, lng } = e.latlng;

    // Tampilkan marker
    if (marker) marker.remove();
    marker = L.marker([lat, lng]).addTo(map);

    // Tampilkan container hasil & loading
    resultsContainer.style.display = 'block';
    loadingSpinner.style.display = 'block';
    resultsTableBody.innerHTML = ''; // Kosongkan tabel
    locationCoords.innerText = `Lokasi Dipilih: Lat: ${lat.toFixed(4)}, Long: ${lng.toFixed(4)}`;

    try {
        // 4. Panggil kedua API secara bersamaan
        const [optimalData, actualData] = await Promise.all([
            fetchOptimalData(currentParamGroupId),
            fetchActualData(lat, lng)
        ]);

        // 5. Setelah data didapat, bandingkan
        renderComparison(optimalData, actualData);

    } catch (error) {
        console.error('Gagal mengambil data:', error);
        resultsTableBody.innerHTML = `<tr><td colspan="5" class="text-red-500">Gagal mengambil data: ${error.message}</td></tr>`;
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

// 4. Fetch (A): Mengambil data OPTIMAL dari API Backend kita
async function fetchOptimalData(paramGroupId) {
    const response = await fetch(`/api/parameter/${paramGroupId}`);
    if (!response.ok) {
        throw new Error(`Server DB merespon: ${response.statusText}`);
    }
    return await response.json();
}

// 5. Fetch (B): Mengambil data AKTUAL dari API Open-Meteo
async function fetchActualData(lat, lng) {
    // Parameter cuaca yang kita inginkan (sesuai contoh Anda)
    // T2M = Suhu, RH2M = Kelembaban, PRECTOTCORR = Curah Hujan, WS2M = Kec. Angin
    // (Catatan: SoilGrids adalah API terpisah dan lebih kompleks)
    const variables = 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m';
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=${variables}`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
        throw new Error('API Open-Meteo gagal merespon.');
    }
    const data = await response.json();
    return data.current; // Hanya ambil data 'current'
}

// 6. Render Hasil Perbandingan
function renderComparison(optimalDataList, actualData) {
    // Kosongkan tabel
    resultsTableBody.innerHTML = '';
    
    // Data mapping (MANUAL)
    // Ini adalah bagian terlemah. Idealnya, tabel 'parameter' Anda
    // punya kolom 'ParameterCode' (cth: 'T2M', 'RH2M')
    // agar bisa dicocokkan otomatis.
    
    // Untuk DEMO, kita cocokkan manual berdasarkan NAMA
    const paramMapping = {
        'Suhu Rata-rata': 'temperature_2m',
        'Kelembaban Relatif': 'relative_humidity_2m',
        'Curah Hujan': 'precipitation',
        'Kecepatan Angin': 'wind_speed_10m'
    };

    optimalDataList.forEach(optimal => {
        const paramName = optimal.Nama;
        const apiCode = paramMapping[paramName];
        const actualValue = apiCode ? actualData[apiCode] : null;
        const optimalMin = optimal.Minimal;
        const optimalMax = optimal.Maksimal;
        
        let status = '...';
        let statusClass = 'text-gray-500';

        if (actualValue === null) {
            status = 'Data API tidak ditemukan';
        } else if (actualValue >= optimalMin && actualValue <= optimalMax) {
            status = '✅ Cocok';
            statusClass = 'text-green-600 font-semibold';
        } else {
            status = '❌ Tidak Cocok';
            statusClass = 'text-red-600 font-semibold';
        }

        const row = `
            <tr class="border-b">
                <td class="py-2 px-3">${paramName}</td>
                <td class="py-2 px-3">${actualData.units[apiCode] || 'N/A'}</td>
                <td class="py-2 px-3">${actualValue !== null ? actualValue : 'N/A'}</td>
                <td class="py-2 px-3">${optimalMin} - ${optimalMax}</td>
                <td class="py-2 px-3 ${statusClass}">${status}</td>
            </tr>
        `;
        resultsTableBody.innerHTML += row;
    });

    // Tambahkan data parameter tanah (Placeholder)
    resultsTableBody.innerHTML += `
        <tr class="border-b bg-gray-50">
            <td class="py-2 px-3 italic">pH Tanah</td>
            <td class="py-2 px-3 italic">(phh2o)</td>
            <td class="py-2 px-3 italic">(Data API SoilGrids)</td>
            <td class="py-2 px-3 italic">...</td>
            <td class="py-2 px-3 text-gray-400">Belum Terhubung</td>
        </tr>
    `;
}