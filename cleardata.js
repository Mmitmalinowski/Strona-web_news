// clearData.js - Funkcja do czyszczenia danych Local Storage

// Potrzebujemy dostępu do niektórych elementów i funkcji z głównego skryptu,
// więc musimy je przekazać lub założyć, że są globalne (co jest mniej zalecane, ale działa w prostych przypadkach).
// Dla uproszczenia, w tym przykładzie, będziemy polegać na tym, że poniższe elementy są globalnie dostępne.

// Jeżeli chcesz być bardziej modularny, musiałbyś przekazać te elementy
// jako argumenty do funkcji clearAllLocalStorageData, lub użyć modułów ES6.
// Dla tego prostego przypadku, gdzie skrypty są ładowane sekwencyjnie,
// możemy założyć, że te zmienne są już zdefiniowane w script.js.

// Elementy DOM, które będą potrzebne do zaktualizowania UI
// const favoriteFiltersSelect = document.getElementById("favoriteFiltersSelect"); // Będzie potrzebne, ale już jest w script.js
// const showReadArticlesCheckbox = document.getElementById('showReadArticles'); // Będzie potrzebne, ale już jest w script.js

// Funkcje z script.js, które będą potrzebne do odświeżenia UI
// function populateFavoriteFiltersSelect() { /* ... */ } // Będzie potrzebne, ale już jest w script.js
// function updateSourceSelectionInDropdown() { /* ... */ } // Będzie potrzebne, ale już jest w script.js
// function updateActiveKeywordsDisplay() { /* ... */ } // Będzie potrzebne, ale już jest w script.js
// function fetchAllNews() { /* ... */ } // Będzie potrzebne, ale już jest w script.js
// function applyFilters() { /* ... */ } // Alternatywa dla fetchAllNews, jeśli nie chcesz ponownie pobierać wszystkiego

function clearAllLocalStorageData() {
    if (confirm("Czy na pewno chcesz usunąć wszystkie zapisane filtry i oznaczenia przeczytanych artykułów? Tej operacji nie można cofnąć.")) {
        localStorage.removeItem('favoriteFilters');
        localStorage.removeItem('readArticles');
        
        // Zresetuj zmienne globalne w pamięci aplikacji (zakładając, że są globalne w script.js)
        // Dostęp do tych zmiennych jest możliwy, jeśli ten skrypt jest ładowany po script.js
        if (typeof favoriteFilters !== 'undefined') favoriteFilters = {};
        if (typeof readArticles !== 'undefined') readArticles = {};
        // allArticles = []; // Ta linia jest zbędna, bo fetchAllNews i tak nadpisze
        if (typeof currentSelectedSources !== 'undefined') currentSelectedSources = ['all'];
        if (typeof activeKeywords !== 'undefined') activeKeywords = [];

        // Zaktualizuj UI - wywołujemy funkcje zdefiniowane w script.js
        if (typeof populateFavoriteFiltersSelect === 'function') populateFavoriteFiltersSelect();
        if (typeof updateSourceSelectionInDropdown === 'function') updateSourceSelectionInDropdown();
        if (typeof updateActiveKeywordsDisplay === 'function') updateActiveKeywordsDisplay();
        if (typeof showReadArticlesCheckbox !== 'undefined') showReadArticlesCheckbox.checked = false;

        // Ponowne pobranie newsów, aby odświeżyć widok z czystymi danymi
        if (typeof fetchAllNews === 'function') {
            fetchAllNews(); 
        } else if (typeof applyFilters === 'function') {
            applyFilters(); // Jeśli wolisz tylko przefiltrować istniejące, zamiast pobierać od nowa
        }

        alert("Wszystkie zapisane dane zostały usunięte!");
    }
}