// script.js - Wersja z wieloma słowami kluczowymi i custom-select
// Zmiany: Customowy rozwijany select z wielokrotnym wyborem,
// oraz możliwość dodawania wielu słów kluczowych do filtrowania.

// Publiczne proxy CORS
const CORS_PROXY_URL = "https://corsproxy.io/?";

// Lista źródeł RSS
const FEEDS = {
    "OKO.press": "https://oko.press/feed/",
    "PAP Nauka": "https://naukawpolsce.pl/rss.xml",
    "Dziennik Gazeta Prawna": "https://www.gazetaprawna.pl/rss.xml",
    "wMeritum.pl": "https://wmeritum.pl/feed/",
    "Onet Wiadomości Kraj": "http://wiadomosci.onet.pl/kraj/rss.xml",
    "Onet Wiadomości Świat": "http://wiadomosci.onet.pl/swiat/rss.xml",
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
const searchTermInput = document.getElementById("searchTerm");
const addKeywordButton = document.getElementById("addKeywordButton"); // Nowy przycisk
const activeKeywordsContainer = document.getElementById("activeKeywordsContainer"); // Nowy kontener

// Zmienione referencje DOM dla custom-select
const customSelectContainer = document.querySelector(".custom-select-container");
const selectedSourcesDisplay = document.getElementById("selectedSourcesDisplay");
const sourceOptionsDropdown = document.getElementById("sourceOptionsDropdown");

const resetFiltersButton = document.getElementById("resetFilters");

// Elementy DOM dla ulubionych filtrów
const saveFilterButton = document.getElementById("saveFilterButton");
const favoriteFiltersSelect = document.getElementById("favoriteFiltersSelect");
const deleteSelectedFilterButton = document.getElementById("deleteSelectedFilterButton");

let allArticles = [];
let favoriteFilters = JSON.parse(localStorage.getItem('favoriteFilters')) || {}; // Wczytaj ulubione filtry z localStorage
let currentSelectedSources = []; // Przechowuje aktualnie wybrane źródła w custom-select
let activeKeywords = []; // NOWA ZMIENNA: Przechowuje aktywne słowa kluczowe

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

    card.innerHTML = `
        <h3>${article.title}</h3>
        <p class="source">${article.source}</p>
        <p class="pub-date">${formatDate(article.pubDate)}</p>
        <a href="${article.link}" target="_blank" rel="noopener noreferrer">Czytaj więcej</a>
    `;
    return card;
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


// --- NOWE FUNKCJE DLA SŁÓW KLUCZOWYCH ---

function addKeyword() {
    const keyword = searchTermInput.value.trim();
    if (keyword && !activeKeywords.includes(keyword)) {
        activeKeywords.push(keyword);
        searchTermInput.value = ''; // Wyczyść pole po dodaniu
        updateActiveKeywordsDisplay();
        applyFilters();
    }
}

function removeKeyword(keywordToRemove) {
    activeKeywords = activeKeywords.filter(keyword => keyword !== keywordToRemove);
    updateActiveKeywordsDisplay();
    applyFilters();
}

function updateActiveKeywordsDisplay() {
    activeKeywordsContainer.innerHTML = ''; // Czyścimy kontener
    if (activeKeywords.length === 0) {
        activeKeywordsContainer.innerHTML = '<span style="color: #888;">Brak aktywnych słów kluczowych.</span>';
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


// --- NOWE FUNKCJE DLA CUSTOM-SELECT (bez zmian w tej sekcji) ---

function populateSourceFilterDropdown() {
    sourceOptionsDropdown.innerHTML = ''; // Czyścimy listę

    // Dodajemy opcję "Wszystkie źródła"
    const allOptionDiv = document.createElement('div');
    allOptionDiv.classList.add('custom-select-option');
    allOptionDiv.innerHTML = `
        <input type="checkbox" id="source-all" value="all">
        <span>Wszystkie źródła</span>
    `;
    sourceOptionsDropdown.appendChild(allOptionDiv);

    // Dynamicznie dodajemy unikalne źródła
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

    // Przywracamy zaznaczenie
    updateSourceSelectionInDropdown();
}

function updateSourceSelectionInDropdown() {
    const checkboxes = sourceOptionsDropdown.querySelectorAll('input[type="checkbox"]');
    
    // Obsługa opcji "Wszystkie źródła"
    const allCheckbox = sourceOptionsDropdown.querySelector('#source-all');
    if (currentSelectedSources.length === 0 || currentSelectedSources.includes('all')) {
        allCheckbox.checked = true;
        // Odznaczamy wszystkie inne, jeśli "Wszystkie źródła" jest zaznaczone
        checkboxes.forEach(cb => {
            if (cb.value !== 'all') cb.checked = false;
        });
        selectedSourcesDisplay.textContent = "Wszystkie źródła";
    } else {
        allCheckbox.checked = false;
        // Zaznaczamy odpowiednie checkboxy
        checkboxes.forEach(cb => {
            if (cb.value !== 'all') {
                cb.checked = currentSelectedSources.includes(cb.value);
            }
        });
        // Upewnij się, że tekst w displayu jest aktualny
        selectedSourcesDisplay.textContent = currentSelectedSources.join(', ') || "Wybierz źródła...";
    }
}


// Obsługa kliknięcia na element listy rozwijanej
sourceOptionsDropdown.addEventListener('change', (event) => {
    const clickedCheckbox = event.target;

    if (clickedCheckbox.id === 'source-all') {
        if (clickedCheckbox.checked) {
            currentSelectedSources = ['all']; // Jeśli "Wszystkie" zaznaczone, usuń inne
        } else {
            // Jeśli "Wszystkie" odznaczone, a to jedyne zaznaczone, ustaw na pusto
            currentSelectedSources = []; 
        }
    } else {
        if (clickedCheckbox.checked) {
            currentSelectedSources = currentSelectedSources.filter(s => s !== 'all'); // Usuń "all", jeśli wybrano inne
            currentSelectedSources.push(clickedCheckbox.value);
        } else {
            currentSelectedSources = currentSelectedSources.filter(source => source !== clickedCheckbox.value);
        }
    }
    
    // Jeśli po zmianie nie wybrano żadnych konkretnych źródeł (i nie było "all"), ustaw na "all"
    if (currentSelectedSources.length === 0 && clickedCheckbox.id !== 'source-all') {
        currentSelectedSources = ['all'];
    }

    updateSourceSelectionInDropdown();
    applyFilters();
});

// Rozwijanie/zwijanie listy po kliknięciu na pole display
selectedSourcesDisplay.addEventListener('click', () => {
    sourceOptionsDropdown.classList.toggle('show');
});

// Zwijanie listy po kliknięciu poza nią
document.addEventListener('click', (event) => {
    if (!customSelectContainer.contains(event.target)) {
        sourceOptionsDropdown.classList.remove('show');
    }
});


// --- Główna Logika Aplikacji (Zmiany do działania z CORS Proxy) ---

// Funkcja do pobierania i parsowania pojedynczego kanału RSS
async function fetchAndParseFeed(sourceName, feedUrl) {
    try {
        const response = await fetch(CORS_PROXY_URL + encodeURIComponent(feedUrl));
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} from ${feedUrl}`);
        }
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "application/xml");

        const items = xmlDoc.querySelectorAll("item, entry"); // Obsługa RSS i Atom
        const articles = [];

        items.forEach(item => {
            const title = item.querySelector("title")?.textContent || "Brak tytułu";
            let link = item.querySelector("link")?.textContent || item.querySelector("link[rel='alternate']")?.getAttribute('href') || "";
            const pubDate = item.querySelector("pubDate")?.textContent || item.querySelector("published")?.textContent || new Date().toISOString();

            // Specjalna obsługa dla Onet (i innych, które dodają stopki)
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

// Funkcja do pobierania wszystkich newsów
async function fetchAllNews() {
    loadingMessage.style.display = "block";
    articlesContainer.innerHTML = ""; // Wyczyść poprzednie artykuły
    loadingMessage.textContent = "Pobieram najnowsze newsy...";

    allArticles = []; // Resetuj listę artykułów

    const fetchPromises = Object.entries(FEEDS).map(([sourceName, url]) =>
        fetchAndParseFeed(sourceName, url)
    );

    try {
        const results = await Promise.all(fetchPromises);
        results.forEach(articles => {
            allArticles.push(...articles);
        });

        // Usuń duplikaty (na podstawie linku)
        const uniqueArticles = [];
        const seenLinks = new Set();
        allArticles.forEach(article => {
            if (!seenLinks.has(article.link)) {
                uniqueArticles.push(article);
                seenLinks.add(article.link);
            }
        });
        allArticles = uniqueArticles;


        // Sortowanie po dacie (od najnowszych)
        allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        loadingMessage.style.display = "none";

        populateSourceFilterDropdown(); // Teraz używamy nowej funkcji do zapełniania custom-select
        applyFilters(); // Zastosuj filtry po pobraniu i posortowaniu
        console.log(`Pobrano i przetworzono ${allArticles.length} unikalnych artykułów.`);

    } catch (error) {
        console.error("Błąd podczas pobierania wszystkich newsów:", error);
        loadingMessage.textContent = "Wystąpił błąd podczas ładowania newsów. Spróbuj później.";
    }
}

// Funkcja do stosowania filtrów na liście artykułów (zmodyfikowana dla wielu słów kluczowych)
function applyFilters() {
    // Słowa kluczowe są teraz w tablicy activeKeywords
    const termsToMatch = activeKeywords.map(term => term.toLowerCase());
    
    // Pobierz aktualnie wybrane źródła z globalnej zmiennej currentSelectedSources
    const selectedSources = currentSelectedSources;

    const filtered = allArticles.filter(article => {
        let matchesSearchTerm = true;
        if (termsToMatch.length > 0) {
            // Artykuł pasuje, jeśli zawiera COKOLWIEK z listy słów kluczowych
            matchesSearchTerm = termsToMatch.some(term => article.title.toLowerCase().includes(term));
        } else if (searchTermInput.value.trim() !== '') {
            // Jeśli pole input nie jest puste, ale nie dodano słowa do activeKeywords,
            // to filtruj po tym co jest w input (na wypadek, gdyby ktoś nie kliknął "Dodaj")
            matchesSearchTerm = article.title.toLowerCase().includes(searchTermInput.value.toLowerCase().trim());
        }
        
        // Jeśli wybrano "all" LUB wybrano konkretne źródła, które pasują do artykułu
        const matchesSource = selectedSources.includes("all") || selectedSources.includes(article.source);
        
        return matchesSearchTerm && matchesSource;
    });
    displayArticles(filtered);
}

function resetFilters() {
    searchTermInput.value = "";
    activeKeywords = []; // Resetuj aktywne słowa kluczowe
    updateActiveKeywordsDisplay(); // Zaktualizuj wyświetlanie
    currentSelectedSources = ['all']; // Ustawiamy "Wszystkie źródła" jako domyślne
    updateSourceSelectionInDropdown(); // Aktualizujemy wygląd custom-select
    applyFilters(); // Stosuje filtry
}

// --- NOWE FUNKCJE DLA ULUBIONYCH FILTRÓW (ZMODYFIKOWANE DLA WIELU SŁÓW KLUCZOWYCH) ---

function saveFavoriteFilters() {
    const filterName = prompt("Podaj nazwę dla tych filtrów:");
    if (filterName && filterName.trim() !== "") {
        const currentFilters = {
            // Zapisujemy activeKeywords (tablicę) zamiast searchTermInput.value
            searchTerm: [...activeKeywords], // Zapisz kopię tablicy aktywnych słów kluczowych
            sourceFilters: [...currentSelectedSources] 
        };
        favoriteFilters[filterName.trim()] = currentFilters;
        localStorage.setItem('favoriteFilters', JSON.stringify(favoriteFilters));
        populateFavoriteFiltersSelect();
        alert(`Filtry "${filterName}" zostały zapisane!`);
    } else if (filterName !== null) {
        alert("Nazwa filtru nie może być pusta.");
    }
}

function loadFavoriteFilters() {
    const selectedFilterName = favoriteFiltersSelect.value;
    if (selectedFilterName && selectedFilterName !== "") {
        const filters = favoriteFilters[selectedFilterName];
        if (filters) {
            // Wczytujemy tablicę słów kluczowych
            activeKeywords = filters.searchTerm || []; // Ustawiamy aktywne słowa kluczowe
            searchTermInput.value = ''; // Wyczyść pole input, bo słowa są w tagach
            updateActiveKeywordsDisplay(); // Zaktualizuj wyświetlanie tagów

            currentSelectedSources = filters.sourceFilters || ['all']; // Ustawiamy wybrane źródła
            
            updateSourceSelectionInDropdown(); // Aktualizujemy wygląd custom-select
            applyFilters(); // Stosuje filtry
            alert(`Filtry "${selectedFilterName}" zostały wczytane!`);
        }
    }
}

function deleteSelectedFavoriteFilter() {
    const selectedFilterName = favoriteFiltersSelect.value;
    if (selectedFilterName && selectedFilterName !== "") {
        if (confirm(`Czy na pewno chcesz usunąć filtr "${selectedFilterName}"?`)) {
            delete favoriteFilters[selectedFilterName];
            localStorage.setItem('favoriteFilters', JSON.stringify(favoriteFilters));
            populateFavoriteFiltersSelect();
            alert(`Filtr "${selectedFilterName}" został usunięty.`);
            resetFilters(); // Zresetuj filtry po usunięciu
        }
    } else {
        alert("Wybierz filtr do usunięcia.");
    }
}

function populateFavoriteFiltersSelect() {
    favoriteFiltersSelect.innerHTML = '<option value="">Wczytaj ulubione filtry</option>';
    for (const name in favoriteFilters) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        favoriteFiltersSelect.appendChild(option);
    }
}

// --- Nasłuchiwanie Zdarzeń ---

document.addEventListener("DOMContentLoaded", () => {
    fetchAllNews(); // Ładuje newsy od razu
    populateFavoriteFiltersSelect(); // Wczytuje ulubione filtry przy starcie
    currentSelectedSources = ['all']; // Domyślnie zaznacz "Wszystkie źródła"
    updateActiveKeywordsDisplay(); // Inicjalizuj wyświetlanie słów kluczowych
});

// Zmienione nasłuchiwanie dla pola wyszukiwania i nowego przycisku
searchTermInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        addKeyword(); // Dodaj słowo po naciśnięciu Enter
    }
});
addKeywordButton.addEventListener("click", addKeyword); // Dodaj słowo po kliknięciu przycisku

resetFiltersButton.addEventListener("click", resetFilters);

// Nasłuchiwanie dla ulubionych filtrów
saveFilterButton.addEventListener("click", saveFavoriteFilters);
favoriteFiltersSelect.addEventListener("change", loadFavoriteFilters);
deleteSelectedFilterButton.addEventListener("click", deleteSelectedFavoriteFilter);