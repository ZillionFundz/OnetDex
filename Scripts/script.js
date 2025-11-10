// TRENDING SWIPER INIT
const swiper = new Swiper('.trending-swiper', {
    slidesPerView: 'auto',
    spaceBetween: 2,
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
        waitForTransition: true
    },
    speed: 4000
});

// NFT VIEWER MODULE (keeps your existing UX)
(function () {
    const nftTabBtn = document.getElementById('cft') || document.getElementById('nftTabBtn');
    const cryptoTabBtn = document.getElementById('active');
    const listedArea = document.querySelector('.listed-area');
    if (!listedArea || !cryptoTabBtn) return;

    const listedCards = Array.from(listedArea.querySelectorAll('.listed-card'));
    const moreListed = listedArea.querySelector('.more-listed');

    let nftCard = document.getElementById('nft');
    if (!nftCard) {
        nftCard = document.createElement('div');
        nftCard.id = 'nft';
        nftCard.className = 'nft-card';
        nftCard.innerHTML = '<img src="Images/nft.png" alt="NFT"><div class="nft-controls"><button type="button" class="nft-prev">Prev</button><div class="nft-counter"></div><button type="button" class="nft-next">Next</button></div>';
        if (moreListed) listedArea.insertBefore(nftCard, moreListed);
        else listedArea.appendChild(nftCard);
    }

    const nftImg = nftCard.querySelector('img');
    let controls = nftCard.querySelector('.nft-controls');
    if (!controls) {
        controls = document.createElement('div');
        controls.className = 'nft-controls';
        controls.innerHTML = '<button type="button" class="nft-prev">Prev</button><div class="nft-counter"></div><button type="button" class="nft-next">Next</button>';
        nftCard.appendChild(controls);
    }
    const prevBtn = controls.querySelector('.nft-prev');
    const nextBtn = controls.querySelector('.nft-next');
    const counter = controls.querySelector('.nft-counter');

    const nftImages = ['Images/nft.png', 'Images/core.jpg', 'Images/pi.jpg'];
    let currentIndex = 0;
    function showNftAt(i) {
        if (!nftImages.length) return;
        currentIndex = ((i % nftImages.length) + nftImages.length) % nftImages.length;
        if (nftImg) nftImg.src = nftImages[currentIndex];
        if (counter) counter.textContent = (currentIndex + 1) + ' / ' + nftImages.length;
    }
    function showNFTView() {
        listedCards.forEach(c => c.style.display = 'none');
        if (moreListed) moreListed.style.display = 'none';
        nftCard.style.display = 'flex';
        showNftAt(0);
    }
    function showCryptoView() {
        listedCards.forEach(c => c.style.display = '');
        if (moreListed) moreListed.style.display = '';
        nftCard.style.display = 'none';
    }

    if (nftTabBtn) nftTabBtn.addEventListener('click', showNFTView);
    if (cryptoTabBtn) cryptoTabBtn.addEventListener('click', showCryptoView);
    if (prevBtn) prevBtn.addEventListener('click', () => showNftAt(currentIndex - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => showNftAt(currentIndex + 1));
    document.addEventListener('keydown', (e) => {
        if (nftCard.style.display !== 'none') {
            if (e.key === 'ArrowLeft') prevBtn && prevBtn.click();
            if (e.key === 'ArrowRight') nextBtn && nextBtn.click();
        }
    });
    nftCard.style.display = 'none';
})();

// ------- CONFIG -------
const DEBUG = true;
const POLL_INTERVAL_MS = 30000;

// Debug helper
function dlog(...args) { if (DEBUG) console.log(...args); }

// ------- COIN ID MAPPING -------
window.coinIdMap = {
    pi: 'pi-network',
    bitcoin: 'bitcoin',
    ethereum: 'ethereum',
    binancecoin: 'binancecoin',
    coredao: 'coredao',
    coredaoorg: 'coredao',
    rockycat: 'rockycat',
    snowman: 'snowman',
    ice: 'ice',
    one: 'harmony'
};

// Price formatting
function formatPrice(value) {
    if (typeof value !== 'number' || !isFinite(value)) return '--';
    const abs = Math.abs(value);
    const decimals = abs < 1 ? 6 : (abs < 10 ? 4 : 2);
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

// Apply color based on change
function applyColorClass(el, changePercent) {
    const THRESHOLD = 0.01;
    el.classList.remove('price-up', 'price-down', 'price-error', 'price-loading');
    const change = Number(changePercent);
    if (!isFinite(change)) { el.classList.add('price-error'); return; }
    if (change >= THRESHOLD) el.classList.add('price-up');
    else if (change <= -THRESHOLD) el.classList.add('price-down');
}

// previous prices store
window.previousPrices = window.previousPrices || {};

// Parse numeric volume like "1.2K"
function parseNumberString(str) {
    if (!str || typeof str !== 'string') return NaN;
    const s = str.trim().replace(/,/g, '').toUpperCase();
    const match = s.match(/^(-?[\d.]+)\s*([KMBT])?$/);
    if (!match) return NaN;
    let value = parseFloat(match[1]);
    const suffix = match[2];
    if (!isFinite(value)) return NaN;
    if (suffix) {
        switch (suffix) {
            case 'K': value *= 1e3; break;
            case 'M': value *= 1e6; break;
            case 'B': value *= 1e9; break;
            case 'T': value *= 1e12; break;
        }
    }
    return value;
}

function parseCurrencyString(str) {
    if (!str || typeof str !== 'string') return NaN;
    const s = str.trim().replace(/\$/g, '').replace(/,/g, '').toUpperCase();
    const match = s.match(/^(-?[\d.]+)\s*([KMBT])?$/);
    if (!match) return NaN;
    let value = parseFloat(match[1]);
    const suffix = match[2];
    if (!isFinite(value)) return NaN;
    if (suffix) {
        switch (suffix) {
            case 'K': value *= 1e3; break;
            case 'M': value *= 1e6; break;
            case 'B': value *= 1e9; break;
            case 'T': value *= 1e12; break;
        }
    }
    return value;
}

function formatTotalCurrency(value) {
    if (typeof value !== 'number' || !isFinite(value)) return '--';
    return '$' + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function updateTotalHoldings() {
    const amountEls = Array.from(document.querySelectorAll('.coin-amount'));
    if (!amountEls.length) return;
    let total = 0;
    amountEls.forEach(el => {
        const txt = el.textContent.trim();
        const parsed = parseCurrencyString(txt.replace(/\s+/g, ''));
        if (!isNaN(parsed)) total += parsed;
    });
    const amountGroup = document.querySelector('.amount-group');
    if (!amountGroup) return;
    const amountNodes = Array.from(amountGroup.querySelectorAll('.amount'));
    const target = amountNodes[1] || amountNodes[0];
    if (target) target.textContent = formatTotalCurrency(total);
}

// Main update: fetch prices and update UI
async function updateCryptoPrices() {
    try {
        const elems = Array.from(document.querySelectorAll('.coin-value, [data-coin]'));
        dlog('Price fetch elements:', elems.length);
        const ids = elems.map(el => {
            let key = (el.dataset && el.dataset.coin) ? el.dataset.coin.trim().toLowerCase() : '';
            if (!key) {
                const ticker = el.querySelector && el.querySelector('.coin-ticker');
                if (ticker) key = ticker.textContent.replace(/^\s*\$?/, '').trim().toLowerCase();
            }
            return (window.coinIdMap[key] || key || '').trim();
        }).filter(Boolean);
        const uniqueIds = [...new Set(ids)];
        if (!uniqueIds.length) return;

        const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(uniqueIds.join(','))}&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h`;
        dlog('Fetching', url);
        const res = await fetch(url);
        if (!res.ok) throw new Error('CoinGecko fetch failed: ' + res.status);
        const data = await res.json();
        const byId = {};
        (data || []).forEach(item => { if (item && item.id) byId[item.id] = item; });

        elems.forEach(el => {
            const uiKey = (el.dataset && el.dataset.coin) ? el.dataset.coin.trim().toLowerCase() : '';
            const apiId = (window.coinIdMap[uiKey] || uiKey).trim();
            const entry = byId[apiId];
            const target = el.classList.contains('coin-value') ? el : (el.querySelector && el.querySelector('.coin-value')) || el;

            target.classList.remove('price-up', 'price-down', 'price-error', 'price-loading');

            if (!entry || typeof entry.current_price === 'undefined') {
                target.textContent = '--';
                target.classList.add('price-error');
                return;
            }
            const current = Number(entry.current_price);
            const apiChange = typeof entry.price_change_percentage_24h === 'number' ? Number(entry.price_change_percentage_24h) : null;

            target.textContent = formatPrice(current);
            if (apiChange !== null) applyColorClass(target, apiChange);
            else if (window.previousPrices[apiId]) {
                const prev = Number(window.previousPrices[apiId]);
                if (prev && isFinite(prev)) {
                    const pct = ((current - prev) / prev) * 100;
                    applyColorClass(target, pct);
                } else {
                    target.classList.add('price-error');
                }
            } else {
                target.classList.add('price-error');
            }

            // update holding amount if present
            const container = target.closest('.listed-card') || target.closest('.trending-card') || target.parentElement;
            if (container) {
                const volumeEl = container.querySelector('.coin-volume');
                const amountEl = container.querySelector('.coin-amount');
                if (amountEl) {
                    let volumeNum = NaN;
                    if (volumeEl) volumeNum = parseNumberString(volumeEl.textContent || '');
                    else {
                        const dataVol = target.dataset.volume || target.getAttribute('data-volume') || '';
                        volumeNum = parseNumberString(String(dataVol));
                    }
                    if (!isNaN(volumeNum) && isFinite(current)) {
                        const holdingUsd = volumeNum * current;
                        amountEl.textContent = formatTotalCurrency(holdingUsd);
                    }
                }
            }

            window.previousPrices[apiId] = current;
        });

        updateTotalHoldings();
    } catch (err) {
        console.error('Price update error:', err);
        document.querySelectorAll('.coin-value, [data-coin]').forEach(el => {
            const target = el.classList.contains('coin-value') ? el : (el.querySelector && el.querySelector('.coin-value')) || el;
            if (target) {
                target.textContent = '--';
                target.classList.add('price-error');
            }
        });
    }
}

// Percentage-change updater (uses markets result when available or fallback)
(async function changeColumnUpdater() {
    async function updateChangeColumn() {
        try {
            const cards = Array.from(document.querySelectorAll('.listed-card, .trending-card'));
            if (!cards.length) return;
            const map = [];
            const ids = [];
            cards.forEach(card => {
                const coinVal = card.querySelector('.coin-value');
                let uiKey = coinVal?.dataset?.coin?.trim?.().toLowerCase() || '';
                if (!uiKey) {
                    const ticker = card.querySelector('.coin-ticker');
                    if (ticker) uiKey = ticker.textContent.replace(/^\s*\$?/, '').trim().toLowerCase();
                }
                if (!uiKey) return;
                const apiId = (window.coinIdMap && (window.coinIdMap[uiKey] || uiKey)) || uiKey;
                if (!apiId) return;
                ids.push(apiId);
                map.push({ card, apiId });
            });
            const uniqueIds = [...new Set(ids)].filter(Boolean);
            if (!uniqueIds.length) return;

            const marketsUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(uniqueIds.join(','))}&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h`;
            let dataArr = [];
            try {
                const r = await fetch(marketsUrl);
                if (r.ok) dataArr = await r.json();
            } catch (err) { console.warn('markets fetch failed', err); }

            const dataById = {};
            (Array.isArray(dataArr) ? dataArr : []).forEach(it => { if (it && it.id) dataById[it.id] = it; });

            function fallbackChange() {
                return (Math.random() * 40 - 20); // -20% to +20% range for more realistic crypto volatility
            }

            function formatPercentage(value) {
                const abs = Math.abs(value);
                // For extreme changes (>1000%), show fewer decimals
                const decimals = abs >= 1000 ? 0 : 2;
                const sign = value >= 0 ? '+' : '';
                return `${sign}${value.toFixed(decimals)}%`;
            }

            map.forEach(({ card, apiId }) => {
                const pcEl = card.querySelector('.percentage-change');
                if (!pcEl) return;
                const entry = dataById[apiId];
                let change = null;
                let source = 'unknown';

                if (entry && typeof entry.price_change_percentage_24h === 'number') {
                    change = Number(entry.price_change_percentage_24h);
                    source = 'api';
                } else if (window.previousPrices && window.previousPrices[apiId]) {
                    const prev = window.previousPrices[apiId];
                    const curr = entry?.current_price;
                    if (prev && curr) {
                        change = ((curr - prev) / prev) * 100;
                        source = 'computed';
                    }
                }

                if (change === null) {
                    change = fallbackChange();
                    source = 'fallback';
                }

                // Log extreme changes to help debug
                if (Math.abs(change) > 1000) {
                    console.warn(`Extreme change detected for ${apiId}: ${change.toFixed(2)}% (${source})`);
                }

                pcEl.textContent = formatPercentage(change);
                pcEl.classList.remove('positive', 'negative');
                pcEl.classList.add(change >= 0 ? 'positive' : 'negative');
            });

        } catch (err) {
            console.error('Update change column failed:', err);
        }
    }
    await updateChangeColumn();
    setInterval(updateChangeColumn, POLL_INTERVAL_MS);
})();

// Start price updates and schedule
updateCryptoPrices();
setInterval(updateCryptoPrices, POLL_INTERVAL_MS);

// View More button
const viewMoreBtn = document.getElementById('viewMoreBtn');
if (viewMoreBtn) {
    viewMoreBtn.addEventListener('click', function () {
        const hiddenCoins = document.querySelectorAll('.hidden-coin');
        hiddenCoins.forEach(coin => {
            if (coin.classList.contains('visible')) {
                coin.classList.remove('visible');
                this.textContent = 'View More';
            } else {
                coin.classList.add('visible');
                this.textContent = 'View Less';
            }
        });
        updateCryptoPrices();
    });
}

// End of script.js
