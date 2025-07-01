// script.js

// Lista źródeł RSS
const FEEDS = {
    "OKO.press": "https://oko.press/feed/",
    "PAP Nauka": "https://naukawpolsce.pl/rss.xml",
    "Dziennik Gazeta Prawna": "https://www.gazetaprawna.pl/rss.xml",
    // Polityka - usunięto, ponieważ adres RSS zwraca 404
    "wMeritum.pl": "https://wmeritum.pl/feed/",
};

// Publiczny proxy CORS do omijania ograniczeń przeglądarek
// corsproxy.io zwraca czysty XML, nie JSON, dlatego zmieniamy sposób parsowania odpowiedzi
const CORS_PROXY_URL = "https://corsproxy.io/?"; 

// Elementy DOM (Document Object Model) - odwołania do elementów HTML
const articlesContainer = document.getElementById("articlesContainer");
const loadingMessage = document.getElementById("loadingMessage");
const refreshButton = document.getElementById("refreshButton");
const searchTermInput = document.getElementById("searchTerm");
const sourceFilterSelect = document.getElementById("sourceFilter");
const resetFiltersButton = document.getElementById("resetFilters");

let allArticles = []; // Globalna zmienna do przechowywania wszystkich pobranych artykułów

// --- Funkcje Pomocnicze ---

// Funkcja do formatowania daty
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

// Funkcja do tworzenia karty artykułu HTML
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

// Funkcja do wyświetlania artykułów w kontenerze
function displayArticles(articlesToDisplay) {
    articlesContainer.innerHTML = ""; // Czyść istniejące artykuły
    if (articlesToDisplay.length === 0) {
        articlesContainer.innerHTML = "<p>Brak artykułów do wyświetlenia. Spróbuj zmienić filtry lub odświeżyć.</p>";
    } else {
        articlesToDisplay.forEach(article => {
            articlesContainer.appendChild(createArticleCard(article));
        });
    }
}

// Funkcja do aktualizowania opcji w rozwijanej liście źródeł
function updateSourceFilterOptions() {
    sourceFilterSelect.innerHTML = '<option value="all">Wszystkie źródła</option>'; 
    const uniqueSources = new Set(allArticles.map(article => article.source));
    Array.from(uniqueSources).sort().forEach(source => {
        const option = document.createElement("option");
        option.value = source;
        option.textContent = source;
        sourceFilterSelect.appendChild(option);
    });
}

// --- Główna Logika Aplikacji ---

// Funkcja do pobierania i parsowania pojedynczego kanału RSS/Atom
async function fetchAndParseFeed(sourceName, feedUrl) {
    try {
        console.log(`Pobieram RSS z: ${sourceName} (${feedUrl})`);
        loadingMessage.textContent = `Pobieram newsy z ${sourceName}...`;

        const response = await fetch(`${CORS_PROXY_URL}${encodeURIComponent(feedUrl)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Ważna zmiana: Odczytujemy odpowiedź jako tekst, a nie JSON
        const rawXmlContent = await response.text(); 
        
        // Logowanie zawartości XML dla celów debugowania
        console.log(`Zawartość XML dla ${sourceName}:`, rawXmlContent.substring(0, 500)); 

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(rawXmlContent, "application/xml");

        // Sprawdzamy, czy kanał jest w formacie RSS (<item>) czy Atom (<entry>)
        let items = xmlDoc.querySelectorAll("item");
        if (items.length === 0) { 
            items = xmlDoc.querySelectorAll("entry");
        }
        
        const articles = [];

        items.forEach(item => {
            let title = item.querySelector("title")?.textContent || "Brak tytułu";
            let link = item.querySelector("link[href]")?.getAttribute("href") || 
                       item.querySelector("link")?.textContent || ""; 
            
            let pubDate = item.querySelector("pubDate")?.textContent || 
                          item.querySelector("published")?.textContent || 
                          item.querySelector("updated")?.textContent || 
                          new Date().toISOString(); 

            if (!link && item.querySelector("guid")?.textContent?.startsWith('http')) {
                link = item.querySelector("guid").textContent;
            }

            if (!link || !link.startsWith('http')) {
                console.warn(`Pominięto artykuł z ${sourceName} z powodu nieprawidłowego lub brakującego linku:`, title, link);
                return; 
            }

            title = title.replace(/Artykuł <a [^>]*>.*?<\/a> pochodzi z serwisu <a [^>]*>.*?<\/a>\.$/i, '')
                         .replace(/Artykuł (.*?) pochodzi z serwisu (.*?)\.$/i, '$1') 
                         .trim();

            articles.push({
                title: title,
                link: link,
                source: sourceName,
                pubDate: pubDate
            });
        });
        console.log(`Pobrano ${articles.length} artykułów z ${sourceName}.`);
        return articles;

    } catch (error) {
        console.error(`Błąd podczas pobierania lub parsowania RSS z ${sourceName}:`, error);
        return []; 
    }
}

// Funkcja do pobierania wszystkich newsów ze zdefiniowanych źródeł
async function fetchAllNews() {
    refreshButton.disabled = true; 
    loadingMessage.style.display = "block"; 
    articlesContainer.innerHTML = ""; 
    loadingMessage.textContent = "Pobieram newsy...";

    const fetchedArticles = [];
    for (const sourceName in FEEDS) {
        const url = FEEDS[sourceName];
        const articlesFromFeed = await fetchAndParseFeed(sourceName, url);
        fetchedArticles.push(...articlesFromFeed);
    }

    allArticles = fetchedArticles.sort((a, b) => {
        const dateA = new Date(a.pubDate);
        const dateB = new Date(b.pubDate);
        return dateB - dateA; 
    });

    loadingMessage.style.display = "none"; 
    refreshButton.disabled = false; 

    updateSourceFilterOptions(); 
    applyFilters(); 
}

// Funkcja do stosowania filtrów na liście artykułów
function applyFilters() {
    const searchTerm = searchTermInput.value.toLowerCase();
    const selectedSource = sourceFilterSelect.value;

    const filtered = allArticles.filter(article => {
        const titleMatch = article.title.toLowerCase().includes(searchTerm);
        const sourceMatch = (selectedSource === "all" || article.source === selectedSource);
        return titleMatch && sourceMatch;
    });

    displayArticles(filtered);
}

// Funkcja do resetowania wszystkich filtrów do wartości domyślnych
function resetFilters() {
    searchTermInput.value = "";
    sourceFilterSelect.value = "all";
    applyFilters();
}

// --- Nasłuchiwanie Zdarzeń (Event Listeners) ---

document.addEventListener("DOMContentLoaded", fetchAllNews);
refreshButton.addEventListener("click", fetchAllNews);
searchTermInput.addEventListener("input", applyFilters);
sourceFilterSelect.addEventListener("change", applyFilters);
resetFiltersButton.addEventListener("click", resetFilters);