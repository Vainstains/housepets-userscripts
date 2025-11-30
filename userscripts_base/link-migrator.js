// ==UserScript==
// @name         Housepets URL Migrator
// @namespace    http://tampermonkey.net/
// @version      1.4.0
// @description  Converts *some* legacy Housepets comic URLs to new format. (most work but some are a lil broken)
// @author       vainstains
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const comicData = []; // Your comic data here

    // Create lookup maps
    const legacyUrlMap = new Map();
    const arcMap = new Map();

    comicData.forEach(comic => {
        if (comic.Page_URL && comic.ID) {
            legacyUrlMap.set(comic.Page_URL, comic.ID);
            // Also add http version to avoid regex processing
            legacyUrlMap.set(comic.Page_URL.replace(/^https:/, 'http:'), comic.ID);
        }

        if (comic.arc_name && comic.arc_name !== '??') {
            const normalizedArc = normalizeArcTitle(comic.arc_name);
            if (!arcMap.has(normalizedArc)) {
                arcMap.set(normalizedArc, comic.ID);
            }
        }
    });

    function normalizeArcTitle(title) {
        if (!title) return "";
        return title.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .split(' ')
            .join('')
            .trim();
    }

    // Pre-compiled regex patterns
    const arcUrlRegex = /https?:\/\/(www\.)?housepetscomic\.com\/chapter\/[^\/\s]+\/?/g;

    function migrateComicUrl(legacyUrl) {
        const normalizedUrl = legacyUrl.replace(/^http:/, 'https:');
        const comicId = legacyUrlMap.get(normalizedUrl) || legacyUrlMap.get(legacyUrl);
        return comicId ? `https://rickgriffinstudios.com/housepets/comic/${comicId}/#comic-page` : null;
    }

    function migrateArcUrl(arcUrl) {
        const arcMatch = arcUrl.match(/\/chapter\/([^\/]+)\/?$/);
        if (!arcMatch) return null;

        const arcNameFromUrl = arcMatch[1].replace(/-/g, ' ');
        const normalizedArc = normalizeArcTitle(arcNameFromUrl);
        return arcMap.get(normalizedArc) || null;
    }

    function migrateLink(link) {
        // Skip if already migrated
        if (link.hasAttribute('data-migrated')) return false;

        const originalUrl = link.href;
        let newUrl = null;
        let migrationType = '';

        // Direct map lookup - much faster than regex
        newUrl = migrateComicUrl(originalUrl);
        if (newUrl) {
            migrationType = 'comic';
        } else if (originalUrl.includes('/chapter/')) {
            newUrl = migrateArcUrl(originalUrl);
            if (newUrl) {
                newUrl = `https://rickgriffinstudios.com/housepets/comic/${newUrl}/#comic-page`;
                migrationType = 'arc';
            }
        }

        if (newUrl) {
            link.setAttribute('data-original-url', originalUrl);
            link.setAttribute('data-migration-type', migrationType);
            link.setAttribute('data-migrated', 'true');
            link.href = newUrl;

            const borderColor = migrationType === 'comic' ? '#4CAF50' : '#2196F3';
            link.style.cssText = `
                border-left: 3px solid ${borderColor} !important;
                padding-left: 5px !important;
                background-color: ${migrationType === 'comic' ? '#f8fff8' : '#f0f8ff'} !important;
            `;

            link.title = `Migrated ${migrationType} from: ${originalUrl}`;
            return true;
        }

        return false;
    }

    // Much more efficient text processing
    function migrateTextContent(node) {
        const text = node.nodeValue;
        
        // Only process nodes that actually contain housepets URLs
        if (!text.includes('housepetscomic.com')) return false;

        let newText = text;
        let modified = false;

        // Process arc URLs first (less common)
        newText = newText.replace(arcUrlRegex, match => {
            const newUrl = migrateArcUrl(match);
            if (newUrl) {
                modified = true;
                return `https://rickgriffinstudios.com/housepets/comic/${newUrl}/#comic-page`;
            }
            return match;
        });

        // Process comic URLs using the map
        legacyUrlMap.forEach((comicId, legacyUrl) => {
            if (newText.includes(legacyUrl)) {
                const newUrl = `https://rickgriffinstudios.com/housepets/comic/${comicId}/#comic-page`;
                newText = newText.split(legacyUrl).join(newUrl);
                modified = true;
            }
        });

        if (modified) {
            node.nodeValue = newText;
        }

        return modified;
    }

    function migrateAllUrls() {
        let migratedCount = 0;

        // Process links first
        const links = document.getElementsByTagName('a');
        for (let link of links) {
            if (migrateLink(link)) {
                migratedCount++;
            }
        }

        // Only process text nodes if we're on a page that likely contains housepets URLs
        if (document.body.innerText.includes('housepetscomic.com')) {
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: function(node) {
                        const parent = node.parentElement;
                        if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' || parent.tagName === 'A')) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        // Only process nodes that contain housepets URLs
                        return node.nodeValue.includes('housepetscomic.com') ? 
                               NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                    }
                },
                false
            );

            let textNode;
            while (textNode = walker.nextNode()) {
                if (migrateTextContent(textNode)) {
                    migratedCount++;
                }
            }
        }

        if (migratedCount > 0) {
            console.log(`Housepets URL Migrator: Migrated ${migratedCount} URLs`);
        }
    }

    // Debounced execution
    let migrationTimeout;
    function scheduleMigration(delay = 100) {
        clearTimeout(migrationTimeout);
        migrationTimeout = setTimeout(migrateAllUrls, delay);
    }

    function init() {
        // Run once after load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => scheduleMigration(500));
        } else {
            scheduleMigration(500);
        }

        // Less aggressive mutation observer
        const observer = new MutationObserver((mutations) => {
            let hasNewLinks = false;
            for (let mutation of mutations) {
                for (let node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'A' || node.querySelector('a')) {
                            hasNewLinks = true;
                            break;
                        }
                    }
                }
                if (hasNewLinks) break;
            }
            if (hasNewLinks) {
                scheduleMigration(300);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    init();
})();