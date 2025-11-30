// ==UserScript==
// @name         Housepets Arc And Characrer Helper
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Add character and arc information to https://rickgriffinstudios.com/ panel pages and allow searching by character and arc
// @author       vainstains
// @match        https://rickgriffinstudios.com/housepets/comic/*/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

// <COMIC_DATA>
// to be replaced with generated data
const comicData = [];
// </COMIC_DATA>

    // === COMIC INFO DISPLAY FUNCTIONALITY ===

    // Create lookup maps for comic info
    const comicById = new Map();
    comicData.forEach(comic => {
        comicById.set(comic.ID, comic);
    });

    function getCurrentComicId() {
        // Extract comic ID from URL
        const urlMatch = window.location.pathname.match(/\/comic\/(\d+)/);
        return urlMatch ? urlMatch[1] : null;
    }

    function createCharacterButton(character) {
        const button = document.createElement('button');
        button.textContent = character;
        button.style.cssText = `
            display: inline-block;
            background: #e0e0e0;
            border: 1px solid #ccc;
            border-radius: 12px;
            padding: 4px 8px;
            margin: 2px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
        `;

        button.onclick = (e) => {
            e.stopPropagation();
            handleCharacterClick(character);
        };

        button.onmouseover = () => {
            button.style.background = '#d0d0d0';
            button.style.borderColor = '#999';
        };

        button.onmouseout = () => {
            button.style.background = '#e0e0e0';
            button.style.borderColor = '#ccc';
        };

        return button;
    }

    function handleCharacterClick(character) {
        // Open search popup if it's closed
        if (!document.getElementById('comic-filter-container')) {
            createFilterInterface();
        }

        // Add character to filters if it doesn't exist
        if (!selectedCharacters.includes(character)) {
            addCharacter(character);

            // Show visual feedback
            const buttons = document.querySelectorAll('#comic-meta-info button');
            buttons.forEach(btn => {
                if (btn.textContent === character) {
                    btn.style.background = '#4CAF50';
                    btn.style.color = 'white';
                    btn.style.borderColor = '#45a049';
                    setTimeout(() => {
                        btn.style.background = '#e0e0e0';
                        btn.style.color = 'black';
                        btn.style.borderColor = '#ccc';
                    }, 1000);
                }
            });
        } else {
            // Character already exists, show feedback
            const buttons = document.querySelectorAll('#comic-meta-info button');
            buttons.forEach(btn => {
                if (btn.textContent === character) {
                    btn.style.background = '#ff9800';
                    btn.style.color = 'white';
                    btn.style.borderColor = '#e68900';
                    setTimeout(() => {
                        btn.style.background = '#e0e0e0';
                        btn.style.color = 'black';
                        btn.style.borderColor = '#ccc';
                    }, 1000);
                }
            });
        }

        // Auto-search is now handled by the change listeners
    }

    function createInfoElement(comic) {
        const infoContainer = document.createElement('div');
        infoContainer.id = 'comic-meta-info';
        infoContainer.style.cssText = `
            margin: 10px 0;
            padding: 15px;
            background: #f8f8f8;
            border-radius: 8px;
            border-left: 4px solid #4CAF50;
            font-family: Arial, sans-serif;
        `;

        // Characters section
        const charactersSection = document.createElement('div');
        charactersSection.style.marginBottom = '10px';

        const charactersLabel = document.createElement('strong');
        charactersLabel.textContent = 'Characters: ';
        charactersLabel.style.color = '#333';
        charactersLabel.style.marginRight = '5px';

        const charactersContainer = document.createElement('span');
        charactersContainer.style.color = '#666';

        if (comic.Characters && comic.Characters !== 'Unknown') {
            const characters = comic.Characters.split(', ').map(char => char.trim());
            characters.forEach((character, index) => {
                const button = createCharacterButton(character);
                charactersContainer.appendChild(button);

                // Add space between buttons (except after the last one)
                if (index < characters.length - 1) {
                    charactersContainer.appendChild(document.createTextNode(' '));
                }
            });
        } else {
            charactersContainer.textContent = comic.Characters || 'Unknown';
        }

        charactersSection.appendChild(charactersLabel);
        charactersSection.appendChild(charactersContainer);

        // Arc section
        const arcSection = document.createElement('div');

        const arcLabel = document.createElement('strong');
        arcLabel.textContent = 'Arc: ';
        arcLabel.style.color = '#333';

        const arcInfo = document.createElement('span');
        if (comic.arc_name && comic.arc_name !== '??') {
            arcInfo.textContent = `${comic.arc_name} (Arc #${comic.arc_number})`;
            arcInfo.style.color = '#2196F3';
        } else {
            arcInfo.textContent = '??';
            arcInfo.style.color = '#FF9800';
        }

        arcSection.appendChild(arcLabel);
        arcSection.appendChild(arcInfo);

        infoContainer.appendChild(charactersSection);
        infoContainer.appendChild(arcSection);

        return infoContainer;
    }

    function addComicInfo() {
        const comicId = getCurrentComicId();
        if (!comicId) return;

        const comic = comicById.get(comicId);
        if (!comic) {
            // Comic not found in data, create default info
            const defaultComic = {
                Characters: 'Unknown',
                arc_name: '??',
                arc_number: '?'
            };
            insertInfoElement(createInfoElement(defaultComic));
            return;
        }

        insertInfoElement(createInfoElement(comic));
    }

    function insertInfoElement(infoElement) {
        // Try to find the blurb container
        const blurb = document.getElementById('blurb');
        if (!blurb) return;

        // Try to insert after the title but before the date
        const title = document.getElementById('page-title');
        const date = document.getElementById('post-date');
        const storyline = document.getElementById('storyline');

        if (title && date) {
            // Insert between title and date
            title.parentNode.insertBefore(infoElement, date);
        } else if (storyline) {
            // Insert before storyline
            storyline.parentNode.insertBefore(infoElement, storyline);
        } else {
            // Insert at the beginning of blurb
            blurb.insertBefore(infoElement, blurb.firstChild);
        }
    }

    // === SEARCH/FILTER FUNCTIONALITY ===

    // Extract all unique characters and arcs for search
    const allCharacters = new Set();
    const allArcs = new Set();

    comicData.forEach(comic => {
        if (comic.Characters) {
            comic.Characters.split(', ').forEach(char => allCharacters.add(char.trim()));
        }
        if (comic.arc_name && comic.arc_name !== '??') {
            allArcs.add(comic.arc_name);
        }
    });

    // Convert to sorted arrays
    const sortedCharacters = Array.from(allCharacters).sort();
    const sortedArcs = Array.from(allArcs);

    let selectedCharacters = [];
    let searchTimeout = null;

    function debouncedSearch() {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        searchTimeout = setTimeout(applyFilters, 300);
    }

    function createFilterInterface() {
        // Remove existing filter container if it exists
        const existingContainer = document.getElementById('comic-filter-container');
        if (existingContainer) {
            existingContainer.remove();
        }

        const filterContainer = document.createElement('div');
        filterContainer.id = 'comic-filter-container';
        filterContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border: 2px solid #333;
            border-radius: 10px;
            padding: 15px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 300px;
            max-height: 80vh;
            overflow-y: auto;
            font-family: Arial, sans-serif;
        `;

        // Header with toggle button
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #ddd;
        `;

        const title = document.createElement('h3');
        title.textContent = 'Search';
        title.style.margin = '0';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            background: #ff4444;
            color: white;
            border: none;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            cursor: pointer;
            font-size: 16px;
            line-height: 1;
        `;
        closeBtn.onclick = () => filterContainer.remove();

        header.appendChild(title);
        header.appendChild(closeBtn);

        // Character filter section
        const charSection = document.createElement('div');
        charSection.style.marginBottom = '15px';

        const charLabel = document.createElement('label');
        charLabel.textContent = 'Characters:';
        charLabel.style.cssText = `
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
            color: #333;
        `;

        // Mode dropdown
        const modeContainer = document.createElement('div');
        modeContainer.style.cssText = `
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            gap: 8px;
        `;

        const modeLabel = document.createElement('label');
        modeLabel.textContent = 'Mode:';
        modeLabel.style.cssText = `
            font-size: 12px;
            color: #666;
            white-space: nowrap;
        `;

        const modeSelect = document.createElement('select');
        modeSelect.id = 'character-mode';
        modeSelect.style.cssText = `
            padding: 4px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 12px;
            flex-grow: 1;
        `;

        const modeOption1 = document.createElement('option');
        modeOption1.value = 'atLeast';
        modeOption1.textContent = 'At least these characters';

        const modeOption2 = document.createElement('option');
        modeOption2.value = 'only';
        modeOption2.textContent = 'Only these characters';

        modeSelect.appendChild(modeOption1);
        modeSelect.appendChild(modeOption2);

        // Add change listener for mode
        modeSelect.addEventListener('change', () => {
            saveMode();
            debouncedSearch();
        });

        modeContainer.appendChild(modeLabel);
        modeContainer.appendChild(modeSelect);

        const charInput = document.createElement('input');
        charInput.type = 'text';
        charInput.placeholder = 'Type character names...';
        charInput.style.cssText = `
            width: 100%;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-sizing: border-box;
        `;

        // Character suggestions dropdown
        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.style.cssText = `
            max-height: 150px;
            overflow-y: auto;
            border: 1px solid #ccc;
            border-top: none;
            display: none;
            position: absolute;
            background: white;
            width: calc(100% - 30px);
            z-index: 10001;
        `;

        // Selected characters display
        const selectedCharsDiv = document.createElement('div');
        selectedCharsDiv.id = 'selected-characters';
        selectedCharsDiv.style.cssText = `
            margin-top: 8px;
            min-height: 20px;
        `;

        charInput.addEventListener('input', function() {
            const value = this.value.toLowerCase();
            suggestionsDiv.innerHTML = '';

            if (value.length > 1) {
                const matches = sortedCharacters.filter(char =>
                    char.toLowerCase().includes(value)
                );

                if (matches.length > 0) {
                    suggestionsDiv.style.display = 'block';
                    matches.forEach(char => {
                        const div = document.createElement('div');
                        div.textContent = char;
                        div.style.cssText = `
                            padding: 8px;
                            cursor: pointer;
                            border-bottom: 1px solid #eee;
                        `;
                        div.onclick = () => {
                            addCharacter(char);
                            charInput.value = '';
                            suggestionsDiv.style.display = 'none';
                            // Auto-search will trigger from addCharacter
                        };
                        div.onmouseover = () => div.style.background = '#f0f0f0';
                        div.onmouseout = () => div.style.background = 'white';
                        suggestionsDiv.appendChild(div);
                    });
                } else {
                    suggestionsDiv.style.display = 'none';
                }
            } else {
                suggestionsDiv.style.display = 'none';
            }
        });

        // Arc filter section
        const arcSection = document.createElement('div');
        arcSection.style.marginBottom = '15px';

        const arcLabel = document.createElement('label');
        arcLabel.textContent = 'Arc:';
        arcLabel.style.cssText = `
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
            color: #333;
        `;

        const arcSelect = document.createElement('select');
        arcSelect.id = 'arc-select';
        arcSelect.style.cssText = `
            width: 100%;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-sizing: border-box;
        `;

        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'All Arcs';
        arcSelect.appendChild(defaultOption);

        // Add arc options
        sortedArcs.forEach(arc => {
            const option = document.createElement('option');
            option.value = arc;
            option.textContent = arc;
            arcSelect.appendChild(option);
        });

        // Add change listener for arc
        arcSelect.addEventListener('change', debouncedSearch);

        // Results section
        const resultsDiv = document.createElement('div');
        resultsDiv.id = 'filter-results';
        resultsDiv.style.cssText = `
            margin-top: 15px;
            max-height: 300px;
            overflow-y: auto;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        `;

        // Remove the Apply button since searching is automatic now
        const autoSearchNote = document.createElement('div');
        autoSearchNote.style.cssText = `
            font-size: 11px;
            color: #666;
            text-align: center;
            margin-top: 10px;
            font-style: italic;
        `;
        autoSearchNote.textContent = 'Search updates automatically';

        // Build the interface
        charSection.appendChild(charLabel);
        charSection.appendChild(modeContainer);
        charSection.appendChild(charInput);
        charSection.appendChild(suggestionsDiv);
        charSection.appendChild(selectedCharsDiv);

        arcSection.appendChild(arcLabel);
        arcSection.appendChild(arcSelect);

        filterContainer.appendChild(header);
        filterContainer.appendChild(charSection);
        filterContainer.appendChild(arcSection);
        filterContainer.appendChild(autoSearchNote);
        filterContainer.appendChild(resultsDiv);

        document.body.appendChild(filterContainer);

        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!charInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
                suggestionsDiv.style.display = 'none';
            }
        });

        // Load saved characters and mode
        loadSavedCharacters();
        loadSavedMode();

        // Auto-apply filters immediately
        debouncedSearch();
    }

    function addCharacter(character) {
        if (!selectedCharacters.includes(character)) {
            selectedCharacters.push(character);
            updateSelectedCharactersDisplay();
            saveCharacters();
            debouncedSearch(); // Trigger auto-search
        }
    }

    function removeCharacter(character) {
        selectedCharacters = selectedCharacters.filter(c => c !== character);
        updateSelectedCharactersDisplay();
        saveCharacters();
        debouncedSearch(); // Trigger auto-search
    }

    function updateSelectedCharactersDisplay() {
        const displayDiv = document.getElementById('selected-characters');
        if (!displayDiv) return;

        displayDiv.innerHTML = '';

        selectedCharacters.forEach(char => {
            const chip = document.createElement('span');
            chip.textContent = char;
            chip.style.cssText = `
                display: inline-block;
                background: #e0e0e0;
                padding: 4px 8px;
                margin: 2px;
                border-radius: 12px;
                font-size: 12px;
                cursor: pointer;
            `;
            chip.onclick = () => removeCharacter(char);
            displayDiv.appendChild(chip);
        });
    }

    function saveCharacters() {
        GM_setValue('selectedCharacters', JSON.stringify(selectedCharacters));
    }

    function loadSavedCharacters() {
        try {
            const saved = GM_getValue('selectedCharacters', '[]');
            selectedCharacters = JSON.parse(saved);
            updateSelectedCharactersDisplay();
        } catch (e) {
            selectedCharacters = [];
        }
    }

    function saveMode() {
        const modeSelect = document.getElementById('character-mode');
        if (modeSelect) {
            GM_setValue('characterMode', modeSelect.value);
        }
    }

    function loadSavedMode() {
        try {
            const savedMode = GM_getValue('characterMode', 'atLeast');
            const modeSelect = document.getElementById('character-mode');
            if (modeSelect) {
                modeSelect.value = savedMode;
            }
        } catch (e) {
            // Use default mode
        }
    }

    function applyFilters() {
        const selectedArc = document.getElementById('arc-select');
        const modeSelect = document.getElementById('character-mode');
        const resultsDiv = document.getElementById('filter-results');

        if (!selectedArc || !resultsDiv) return;

        const arcValue = selectedArc.value;
        const mode = modeSelect ? modeSelect.value : 'atLeast';

        // Save mode for next time
        saveMode();

        // Filter comics
        const filteredComics = comicData.filter(comic => {
            // Check arc filter
            if (arcValue && comic.arc_name !== arcValue) {
                return false;
            }

            // Check character filters
            if (selectedCharacters.length > 0) {
                const comicChars = comic.Characters ? comic.Characters.split(', ').map(c => c.trim()) : [];

                if (mode === 'atLeast') {
                    // At least these characters - comic must contain ALL selected characters
                    return selectedCharacters.every(selectedChar =>
                        comicChars.includes(selectedChar)
                    );
                } else if (mode === 'only') {
                    // Only these characters - comic must contain EXACTLY the selected characters (no more, no less)
                    if (comicChars.length !== selectedCharacters.length) {
                        return false;
                    }
                    return selectedCharacters.every(selectedChar =>
                        comicChars.includes(selectedChar)
                    );
                }
            }

            return true;
        });

        // Display results
        resultsDiv.innerHTML = '';

        if (filteredComics.length === 0) {
            resultsDiv.innerHTML = '<p style="color: #666; text-align: center;">No results</p>';
            return;
        }

        const modeText = mode === 'atLeast' ? 'at least' : 'only';
        const resultsTitle = document.createElement('p');
        resultsTitle.innerHTML = `Found <strong>${filteredComics.length}</strong> comics with <strong>${modeText}</strong> the selected characters:`;
        resultsTitle.style.cssText = 'margin: 0 0 10px 0; font-size: 14px;';
        resultsDiv.appendChild(resultsTitle);

        filteredComics.forEach(comic => {
            const comicDiv = document.createElement('div');
            comicDiv.style.cssText = `
                padding: 8px;
                margin: 5px 0;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: #f9f9f9;
                cursor: pointer;
            `;

            comicDiv.innerHTML = `
                <strong>#${comic.ID}</strong>: ${comic.Title}<br>
                <small>Characters: ${comic.Characters || 'None'}</small><br>
                <small>Arc: ${comic.arc_name || '??'}</small>
            `;

            comicDiv.onclick = () => {
                window.location.href = `https://rickgriffinstudios.com/housepets/comic/${comic.ID}/#comic-page`;
            };

            comicDiv.onmouseover = () => comicDiv.style.background = '#e9e9e9';
            comicDiv.onmouseout = () => comicDiv.style.background = '#f9f9f9';

            resultsDiv.appendChild(comicDiv);
        });
    }

    function addFilterButton() {
        // Check if button already exists
        if (document.getElementById('comic-search-button')) return;

        const filterBtn = document.createElement('button');
        filterBtn.id = 'comic-search-button';
        filterBtn.textContent = 'Search...';
        filterBtn.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 20px;
            padding: 10px 15px;
            cursor: pointer;
            z-index: 9999;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            font-family: Arial, sans-serif;
            font-size: 14px;
        `;
        filterBtn.onclick = createFilterInterface;

        document.body.appendChild(filterBtn);
    }

    // === INITIALIZATION ===

    function initialize() {
        // Add comic info to current page
        addComicInfo();

        // Add search button
        addFilterButton();
    }

    // Wait for page to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // Also handle dynamic navigation (if the site uses AJAX)
    const observer = new MutationObserver(function(mutations) {
        let shouldUpdate = false;
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) { // Element node
                    if (!document.getElementById('comic-meta-info')) {
                        shouldUpdate = true;
                    }
                    if (!document.getElementById('comic-search-button')) {
                        shouldUpdate = true;
                    }
                }
            });
        });
        if (shouldUpdate) {
            setTimeout(() => {
                addComicInfo();
                addFilterButton();
            }, 100);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
