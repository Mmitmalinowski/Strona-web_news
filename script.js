
// script.js - Wersja z wieloma słowami kluczowymi, custom-select i oznaczaniem przeczytanych
// Zmiany: Customowy rozwijany select z wielokrotnym wyborem,
// możliwość dodawania wielu słów kluczowych do filtrowania,
// oznaczanie artykułów jako przeczytane z datą,
// filtrowanie po przeczytanych/nieprzeczytanych.

// Publiczne proxy CORS
const CORS_PROXY_URL = "https://api.allorigins.win/raw?url=";

// Lista źródeł RSS
const FEEDS = {
    "OKO.press": "https://oko.press/feed/",
    "PAP Nauka": "https://naukawpolsce.pl/rss.xml",
    "Dziennik Gazeta Prawna": "https://www.gazetaprawna.pl/rss.xml",
    "wMeritum.pl": "https://wmeritum.pl/feed/",
    // "Onet Wiadomości Kraj": "http://wiadomosci.onet.pl/kraj/rss.xml", // Zakomentowane, bo adres nie działał
    // "Onet Wiadomości Świat": "http://wiadomosci.onet.pl/swiat/rss.xml", // Zakomentowane, bo adres nie działał
    "Gazeta.pl Wiadomości": "http://serwisy.gazeta.pl/aliasy/rss_hp/wiadomosci.xml",
    "Polsat News Wszystkie": "https://www.polsatnews.pl/rss/wszystkie.xml",
    "Rzeczpospolita": "https://www.rp.pl/rss_main",
    "Dziennik.pl": "http://rss.dziennik.pl/Dziennik-PL/",
    "Newsweek Polska": "https://www.newsweek.pl/rss.xml",
    "Wirtualne Media": "https://www.wirtualnemedia.pl/rss/wirtualnemedia_rss.xml",
};


// Elementy DOM
const articlesContainer = document.getElementById("articlesContainer");
const loadingMessage = document.getElementById("loadingMessage");
const keywordInput = document.getElementById("keywordInput");
const addKeywordButton = document.getElementById("addKeywordButton"); 
const activeKeywordsContainer = document.getElementById("activeKeywordsContainer"); 

// Referencje DOM dla custom-select źródeł
const customSelectContainer = document.querySelector(".custom-select-container");
const selectedSourcesDisplay = document.getElementById("selectedSourcesDisplay");
const sourceOptionsDropdown = document.getElementById("sourceDropdown");

// Referencje DOM dla przycisków i checkboxów
const clearSourceFilterButton = document.getElementById("clearSourceFilterButton");
const resetFiltersButton = document.getElementById("resetFilters");
const showReadArticlesCheckbox = document.getElementById('showReadArticles');
const refreshButton = document.getElementById('refreshButton');

// Elementy DOM dla ulubionych filtrów (NOWE REFERENCJE DLA CUSTOMOWEGO SELECTA)
const saveFilterButton = document.getElementById("saveFilterButton");
const favoriteFiltersCustomSelectContainer = document.getElementById("favoriteFiltersCustomSelectContainer");
const selectedFavoriteFilterDisplay = document.getElementById("selectedFavoriteFilterDisplay");
const favoriteFiltersDropdown = document.getElementById("favoriteFiltersDropdown");


// --- Zmienne Stanu Aplikacji ---
let allArticles = [];
let favoriteFilters = JSON.parse(localStorage.getItem('favoriteFilters')) || {}; 
let currentSelectedSources = []; 
let activeKeywords = []; 
let readArticles = JSON.parse(localStorage.getItem('readArticles')) || {};


// --- Funkcje Pomocnicze ---
function formatDate(isoDateString) {
    const date = new Date(isoDateString);
    return date.toLocaleString('pl-PL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function createArticleCard(article) {
    const card = document.createElement("div");
    card.classList.add("article-card");

    const isRead = readArticles[article.link];
    if (isRead) {
        card.classList.add("read");
    }

    card.innerHTML = `
        <h3>${article.title}</h3>
        <p class="source">${article.source}</p>
        <p class="pub-date">${formatDate(article.pubDate)}</p>
        <a href="${article.link}" target="_blank" rel="noopener noreferrer" data-article-link="${article.link}">Czytaj więcej</a>
        ${isRead ? `<p class="read-info">Przeczytano: ${formatDate(isRead)}</p>` : ''}
    `;

    const readMoreLink = card.querySelector('a');
    readMoreLink.addEventListener('click', (event) => {
        event.preventDefault(); 
        markArticleAsRead(article.link, card);
        setTimeout(() => {
            window.open(article.link, '_blank');
        }, 50); 
    });

    return card;
}

// Oznaczanie artykułu jako przeczytany
function markArticleAsRead(articleLink, cardElement) {
    const now = new Date().toISOString();
    readArticles[articleLink] = now;
    localStorage.setItem('readArticles', JSON.stringify(readArticles));

    cardElement.classList.add('read');
    let readInfoElement = cardElement.querySelector('.read-info');
    if (readInfoElement) {
        readInfoElement.textContent = `Przeczytano: ${formatDate(now)}`;
    } else {
        const newReadInfo = document.createElement('p');
        newReadInfo.classList.add('read-info');
        newReadInfo.textContent = `Przeczytano: ${formatDate(now)}`;
        cardElement.appendChild(newReadInfo);
    }
    applyFilters();
}

function displayArticles(articlesToDisplay) {
    articlesContainer.innerHTML = "";
    if (articlesToDisplay.length === 0) {
        articlesContainer.innerHTML = "<p>Brak artykułów do wyświetlenia. Spróbuj zmienić filtry.</p>";
    } else {
        articlesToDisplay.forEach(article => {
            articlesContainer.appendChild(createArticleCard(article));
        });
    }
}


// --- Funkcje dla SŁÓW KLUCZOWYCH ---

function addKeyword() {
    const keyword = keywordInput.value.trim();
    if (keyword && !activeKeywords.includes(keyword)) {
        activeKeywords.push(keyword);
        keywordInput.value = ''; // Wyczyść pole po dodaniu
        updateActiveKeywordsDisplay();
        applyFilters();
    }
}

function removeKeyword(keywordToRemove) {
    activeKeywords = activeKeywords.filter(keyword => keyword !== keywordToRemove);
    updateActiveKeywordsDisplay();
    applyFilters();
}

// Zmodyfikowana funkcja updateActiveKeywordsDisplay do obsługi placeholderu
function updateActiveKeywordsDisplay() {
    activeKeywordsContainer.innerHTML = ''; 

    if (activeKeywords.length === 0) {
        const placeholder = document.createElement('span');
        placeholder.classList.add('placeholder-text');
        placeholder.textContent = 'Brak aktywnych słów kluczowych.';
        activeKeywordsContainer.appendChild(placeholder);
    } else {
        activeKeywords.forEach(keyword => {
            const tag = document.createElement('div');
            tag.classList.add('keyword-tag');
            tag.innerHTML = `
                <span>${keyword}</span>
                <button class="remove-keyword" data-keyword="${keyword}">x</button>
            `;
            activeKeywordsContainer.appendChild(tag);
        });
    }
}

// Delegowanie zdarzeń dla przycisków usuwania słów kluczowych
activeKeywordsContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-keyword')) {
        const keywordToRemove = event.target.dataset.keyword;
        removeKeyword(keywordToRemove);
    }
});


// --- Funkcje dla CUSTOM-SELECT (źródła) ---

function populateSourceFilterDropdown() {
    sourceOptionsDropdown.innerHTML = ''; 

    const allOptionDiv = document.createElement('div');
    allOptionDiv.classList.add('custom-select-option');
    allOptionDiv.innerHTML = `
        <input type="checkbox" id="source-all" value="all">
        <span>Wszystkie źródła</span>
    `;
    sourceOptionsDropdown.appendChild(allOptionDiv);

    const uniqueSources = new Set(allArticles.map(article => article.source));
    Array.from(uniqueSources).sort().forEach(source => {
        const optionDiv = document.createElement('div');
        optionDiv.classList.add('custom-select-option');
        optionDiv.innerHTML = `
            <input type="checkbox" id="source-${source.replace(/\s+/g, '-')}" value="${source}">
            <span>${source}</span>
        `;
        sourceOptionsDropdown.appendChild(optionDiv);
    });

    updateSourceSelectionInDropdown();
}

function updateSourceSelectionInDropdown() {
    const checkboxes = sourceOptionsDropdown.querySelectorAll('input[type="checkbox"]');
    
    const allCheckbox = sourceOptionsDropdown.querySelector('#source-all');
    if (currentSelectedSources.length === 0 || currentSelectedSources.includes('all')) {
        allCheckbox.checked = true;
        checkboxes.forEach(cb => {
            if (cb.value !== 'all') cb.checked = false;
        });
        selectedSourcesDisplay.textContent = "Wszystkie źródła";
    } else {
        allCheckbox.checked = false;
        checkboxes.forEach(cb => {
            if (cb.value !== 'all') {
                cb.checked = currentSelectedSources.includes(cb.value);
            }
        });
        selectedSourcesDisplay.textContent = currentSelectedSources.join(', ') || "Wybierz źródła...";
    }
}


sourceOptionsDropdown.addEventListener('change', (event) => {
    const clickedCheckbox = event.target;

    if (clickedCheckbox.id === 'source-all') {
        if (clickedCheckbox.checked) {
            currentSelectedSources = ['all']; 
        } else {
            currentSelectedSources = []; 
        }
    } else {
        if (clickedCheckbox.checked) {
            currentSelectedSources = currentSelectedSources.filter(s => s !== 'all'); 
            currentSelectedSources.push(clickedCheckbox.value);
        } else {
            currentSelectedSources = currentSelectedSources.filter(source => source !== clickedCheckbox.value);
        }
    }
    
    if (currentSelectedSources.length === 0 && clickedCheckbox.id !== 'source-all') {
        currentSelectedSources = ['all'];
    }

    updateSourceSelectionInDropdown();
    applyFilters();
});

selectedSourcesDisplay.addEventListener('click', () => {
    sourceOptionsDropdown.classList.toggle('show');
});

document.addEventListener('click', (event) => {
    if (!customSelectContainer.contains(event.target)) {
        sourceOptionsDropdown.classList.remove('show');
    }
});

// Funkcja do czyszczenia tylko filtra źródeł
function clearSourceFilter() {
    currentSelectedSources = ['all'];
    updateSourceSelectionInDropdown();
    applyFilters();
}


// --- Główna Logika Aplikacji ---

async function fetchAndParseFeed(sourceName, feedUrl) {
    try {
        const response = await fetch(CORS_PROXY_URL + encodeURIComponent(feedUrl));
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} from ${feedUrl}`);
        }
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "application/xml");

        const items = xmlDoc.querySelectorAll("item, entry"); 
        const articles = [];

        items.forEach(item => {
            const title = item.querySelector("title")?.textContent || "Brak tytułu";
            let link = item.querySelector("link")?.textContent || item.querySelector("link[rel='alternate']")?.getAttribute('href') || "";
            const pubDate = item.querySelector("pubDate")?.textContent || item.querySelector("published")?.textContent || new Date().toISOString();

            let cleanedTitle = title.replace(/Artykuł <a [^>]*>.*?<\/a> pochodzi z serwisu <a [^>]*>.*?<\/a>\.$/i, '')
                                     .replace(/Artykuł (.*?) pochodzi z serwisu (.*?)\.$/i, '$1')
                                     .trim();

            articles.push({
                title: cleanedTitle,
                link: link,
                source: sourceName,
                pubDate: pubDate
            });
        });
        return articles;
    } catch (error) {
        console.error(`Błąd podczas pobierania lub parsowania RSS z ${sourceName}:`, error);
        return [];
    }
}

async function fetchAllNews() {
    loadingMessage.style.display = "block";
    articlesContainer.innerHTML = ""; 
    loadingMessage.textContent = "Pobieram najnowsze newsy...";

    allArticles = []; 

    const fetchPromises = Object.entries(FEEDS).map(([sourceName, url]) =>
        fetchAndParseFeed(sourceName, url)
    );

    try {
        const results = await Promise.all(fetchPromises);
        results.forEach(articles => {
            allArticles.push(...articles);
        });

        const uniqueArticles = [];
        const seenLinks = new Set();
        allArticles.forEach(article => {
            if (!seenLinks.has(article.link)) {
                uniqueArticles.push(article);
                seenLinks.add(article.link);
            }
        });
        allArticles = uniqueArticles;

        allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        loadingMessage.style.display = "none";

        populateSourceFilterDropdown(); 
        applyFilters(); 
        console.log(`Pobrano i przetworzono ${allArticles.length} unikalnych artykułów.`);

    } catch (error) {
        console.error("Błąd podczas pobierania wszystkich newsów:", error);
        loadingMessage.textContent = "Wystąpił błąd podczas ładowania newsów. Spróbuj później.";
    }
}

function applyFilters() {
    const termsToMatch = activeKeywords.map(term => term.toLowerCase());
    const selectedSources = currentSelectedSources;
    const showRead = showReadArticlesCheckbox.checked; // Czy checkbox "Pokaż tylko przeczytane" jest zaznaczony

    const filtered = allArticles.filter(article => {
        // 1. Sprawdź zgodność ze słowami kluczowymi
        let matchesSearchTerm = true;
        if (termsToMatch.length > 0) {
            matchesSearchTerm = termsToMatch.some(term => article.title.toLowerCase().includes(term));
        } else if (keywordInput.value.trim() !== '') {
            matchesSearchTerm = article.title.toLowerCase().includes(keywordInput.value.toLowerCase().trim());
        }
        
        // 2. Sprawdź zgodność ze źródłami
        const matchesSource = selectedSources.includes("all") || selectedSources.includes(article.source);
        
        // 3. Sprawdź status "przeczytano"
        const isArticleRead = readArticles[article.link];

        // Nowa logika filtrowania:
        // Jeśli "Pokaż tylko przeczytane" jest zaznaczone, pokaż tylko artykuły, które są przeczytane
        if (showRead) {
            return matchesSearchTerm && matchesSource && isArticleRead;
        } 
        // Jeśli "Pokaż tylko przeczytane" NIE jest zaznaczone, pokaż WSZYSTKIE artykuły (przeczytane i nieprzeczytane),
        // które pasują do pozostałych filtrów.
        else {
            return matchesSearchTerm && matchesSource; // Zmieniono z '!isArticleRead' na samo 'true' (lub pominięcie sprawdzenia)
        }
    });
    displayArticles(filtered);
}

function resetFilters() {
    keywordInput.value = "";
    activeKeywords = []; 
    updateActiveKeywordsDisplay(); 
    currentSelectedSources = ['all']; 
    updateSourceSelectionInDropdown(); 
    showReadArticlesCheckbox.checked = false; 
    selectedFavoriteFilterDisplay.textContent = "Wczytaj ulubione filtry"; // Resetuj wyświetlanie ulubionego filtra
    applyFilters(); 
}

// --- Funkcje dla ULUBIONYCH FILTRÓW (NOWY CUSTOMOWY SELECT) ---

function saveFavoriteFilters() {
    const filterName = prompt("Podaj nazwę dla tych filtrów:");
    if (filterName && filterName.trim() !== "") {
        const currentFilters = {
            searchTerm: [...activeKeywords], 
            sourceFilters: [...currentSelectedSources],
            showRead: showReadArticlesCheckbox.checked
        };
        favoriteFilters[filterName.trim()] = currentFilters;
        localStorage.setItem('favoriteFilters', JSON.stringify(favoriteFilters));
        populateFavoriteFiltersSelect();
        alert(`Filtry "${filterName}" zostały zapisane!`);
    } else if (filterName !== null) {
        alert("Nazwa filtru nie może być pusta.");
    }
}

function populateFavoriteFiltersSelect() {
    favoriteFiltersDropdown.innerHTML = ''; // Czyścimy zawartość dropdowna

    // Domyślna opcja "Wczytaj ulubione filtry" (wyświetlana w selectedFavoriteFilterDisplay)
    // selectedFavoriteFilterDisplay.textContent jest aktualizowany w loadFavoriteFilters/resetFilters
    // Tutaj nie ustawiamy jego treści, aby nie nadpisywać aktywnego filtru

    for (const name in favoriteFilters) {
        const optionDiv = document.createElement('div');
        optionDiv.classList.add('favorite-filters-option');
        // Nazwa filtru, która będzie służyć do wczytywania
        optionDiv.innerHTML = `
            <span class="filter-name" data-filter-name="${name}">${name}</span>
            <button class="delete-filter-x" data-filter-name="${name}">x</button>
        `;
        favoriteFiltersDropdown.appendChild(optionDiv);
    }
}

function loadFavoriteFilters(filterName) {
    if (filterName && filterName !== "") {
        const filters = favoriteFilters[filterName];
        if (filters) {
            activeKeywords = filters.searchTerm || []; 
            keywordInput.value = ''; 
            updateActiveKeywordsDisplay(); 

            currentSelectedSources = filters.sourceFilters || ['all']; 
            updateSourceSelectionInDropdown(); 
            showReadArticlesCheckbox.checked = filters.showRead || false; 
            applyFilters(); 
            selectedFavoriteFilterDisplay.textContent = filterName; // Wyświetl nazwę załadowanego filtru
            favoriteFiltersDropdown.classList.remove('show'); // Zamknij dropdown
            alert(`Filtry "${filterName}" zostały wczytane!`);
        }
    } else {
        // Obsługa wyboru "Brak wybranego filtru" lub po prostu reset
        resetFilters();
        selectedFavoriteFilterDisplay.textContent = "Wczytaj ulubione filtry";
        favoriteFiltersDropdown.classList.remove('show');
    }
}

function deleteFavoriteFilter(filterName) {
    if (filterName && filterName !== "") {
        if (confirm(`Czy na pewno chcesz usunąć filtr "${filterName}"?`)) {
            delete favoriteFilters[filterName];
            localStorage.setItem('favoriteFilters', JSON.stringify(favoriteFilters));
            populateFavoriteFiltersSelect(); // Odśwież listę ulubionych filtrów

            // Jeśli usunięto aktualnie załadowany filtr, zresetuj interfejs
            if (selectedFavoriteFilterDisplay.textContent === filterName) {
                resetFilters();
                selectedFavoriteFilterDisplay.textContent = "Wczytaj ulubione filtry";
            }
            favoriteFiltersDropdown.classList.remove('show'); // Zamknij dropdown
            alert(`Filtr "${filterName}" został usunięty.`);
        }
    }
}


// --- Inicjalizacja i Nasłuchiwanie Zdarzeń ---

document.addEventListener("DOMContentLoaded", () => {
    fetchAllNews(); 
    populateFavoriteFiltersSelect(); 
    currentSelectedSources = ['all']; 
    updateActiveKeywordsDisplay(); 
});

keywordInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        addKeyword(); 
    }
});
addKeywordButton.addEventListener("click", addKeyword); 

clearSourceFilterButton.addEventListener('click', clearSourceFilter); 
resetFiltersButton.addEventListener("click", resetFilters);

saveFilterButton.addEventListener("click", saveFavoriteFilters);

// Nowe event listenery dla customowego selecta ulubionych filtrów
selectedFavoriteFilterDisplay.addEventListener('click', () => {
    favoriteFiltersDropdown.classList.toggle('show');
});

// Delegowanie zdarzeń dla opcji w dropdownie ulubionych filtrów
favoriteFiltersDropdown.addEventListener('click', (event) => {
    if (event.target.classList.contains('filter-name')) {
        const filterName = event.target.dataset.filterName;
        loadFavoriteFilters(filterName);
    } else if (event.target.classList.contains('delete-filter-x')) {
        const filterName = event.target.dataset.filterName;
        deleteFavoriteFilter(filterName);
    }
});

// Zamknij dropdown ulubionych filtrów po kliknięciu poza nim
document.addEventListener('click', (event) => {
    // Sprawdź, czy kliknięcie nie było wewnątrz kontenera ulubionych filtrów
    // i upewnij się, że nie kliknięto na sam element selectedFavoriteFilterDisplay,
    // ponieważ jego kliknięcie powinno tylko przełączać widoczność dropdowna, nie zamykać go od razu.
    if (!favoriteFiltersCustomSelectContainer.contains(event.target) && event.target !== selectedFavoriteFilterDisplay) {
        favoriteFiltersDropdown.classList.remove('show');
    }
});


refreshButton.addEventListener('click', fetchAllNews); 
showReadArticlesCheckbox.addEventListener('change', applyFilters);