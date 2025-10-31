// ...existing code...

// TRENDING SWIPER INIT
const swiper = new Swiper('.trending-swiper', {
    slidesPerView: 'auto',
    spaceBetween: 4,
    loop: true,
    freeMode: {
        enabled: true,
        momentum: true,
        momentumRatio: 0.8,
        sticky: false,
    },
    autoplay: {
        delay: 2500,
        disableOnInteraction: false,
    }
});

// Map UI coin keys to CoinGecko API ids
const coinIdMap = {
    pi: 'pi-network',
    bitcoin: 'bitcoin',
    ethereum: 'ethereum',
    binancecoin: 'binancecoin',
    coredao: 'coredao',
    // add more mappings here: uiKey: 'coingecko-id'
};

// Fetch and update prices for all elements with data-coin
async function updateCryptoPrices() {
    try {
        const elems = Array.from(document.querySelectorAll('[data-coin]'));
        if (!elems.length) return;

        // Map each element's data-coin to the API id (fallback to the value itself)
        const ids = elems
            .map(el => (coinIdMap[el.dataset.coin] || el.dataset.coin || '').trim())
            .filter(Boolean);

        if (!ids.length) return;
        const uniqueIds = [...new Set(ids)].join(',');

        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(uniqueIds)}&vs_currencies=usd&include_24h_change=true`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Price API error: ${res.status}`);
        const data = await res.json();

        elems.forEach(el => {
            const apiId = coinIdMap[el.dataset.coin] || el.dataset.coin;
            const entry = data[apiId];
            if (entry && typeof entry.usd !== 'undefined') {
                // format with 2-8 decimals depending on magnitude
                const value = Number(entry.usd);
                const decimals = value < 1 ? 6 : (value < 10 ? 4 : 2);
                el.textContent = `$${value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

                el.classList.remove('price-error', 'price-loading');
            } else {
                // API returned no data for this id
                el.textContent = '--';
                el.classList.add('price-error');
            }
        });
    } catch (err) {
        console.error('Error fetching prices:', err);
        // mark all as error so user sees failure
        document.querySelectorAll('[data-coin]').forEach(el => {
            el.textContent = '--';
            el.classList.add('price-error');
        });
    }
}

// Initial update + periodic refresh
updateCryptoPrices();
setInterval(updateCryptoPrices, 30000);

// NOTE: Binance WebSocket below is commented out because Binance symbols (e.g. BTCUSDT) differ from CoinGecko IDs.
// If you want real-time WS updates, map your UI elements to exchange symbols and open the correct stream.
/*
const ws = new WebSocket('wss://stream.binance.com:9443/ws');

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.e === 'trade') {
        // data.s is symbol like 'BTCUSDT' — map these to your elements via data-symbol (not data-coin)
        updatePriceElement(data.s, data.p);
    }
};

function updatePriceElement(symbol, price) {
    const element = document.querySelector(`[data-symbol="${symbol}"]`);
    if (element) {
        element.textContent = `$${parseFloat(price).toLocaleString()}`;
    }
}
*/

// ...existing code...
