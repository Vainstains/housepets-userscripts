// ==UserScript==
// @name         Housepets URL Migrator
// @namespace    http://tampermonkey.net/
// @version      1.1.1
// @description  Converts *some* legacy Housepets comic URLs to new format. (most work but some are a lil broken)
// @author       vainstains
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

// <COMIC_DATA>
// to be replaced with generated data
const comicData = [];
// </COMIC_DATA>

    // Create lookup maps
    const legacyUrlMap = new Map();
    const arcMap = new Map();

    comicData.forEach(comic => {
        if (comic.Page_URL && comic.ID) {
            legacyUrlMap.set(comic.Page_URL, comic.ID);
        }

        if (comic.arc_name && comic.arc_name !== '??') {
            const normalizedArc = normalizeArcTitle(comic.arc_name);
            if (!arcMap.has(normalizedArc)) {
                // Store the first comic ID for this arc
                arcMap.set(normalizedArc, comic.ID);
            }
        }
    });

    // JavaScript version of normalizeArcTitle
    function normalizeArcTitle(title) {
        if (!title) {
            return "";
        }

        title = title.toLowerCase();
        title = title.replace(/[^\w\s]/g, ' ');
        title = title.replace(/\s+/g, ' ');
        const words = title.split(' ');

        return words.join('').trim();
    }

    function migrateComicUrl(legacyUrl) {
        const comicId = legacyUrlMap.get(legacyUrl);
        if (comicId) {
            return `https://rickgriffinstudios.com/housepets/comic/${comicId}/#comic-page`;
        }
        return null;
    }

    function migrateArcUrl(arcUrl) {
        // Extract arc name from URL
        const arcMatch = arcUrl.match(/\/chapter\/([^\/]+)\/?$/);
        if (!arcMatch) return null;

        const arcNameFromUrl = arcMatch[1].replace(/-/g, ' ');
        const normalizedArc = normalizeArcTitle(arcNameFromUrl);

        // Find the first comic ID for this arc
        const firstComicId = arcMap.get(normalizedArc);
        if (firstComicId) {
            return `https://rickgriffinstudios.com/housepets/comic/${firstComicId}/#comic-page`;
        }

        return null;
    }

    function migrateLink(link) {
        const originalUrl = link.href;
        let newUrl = null;
        let migrationType = '';

        // Check if it's a comic URL
        if (legacyUrlMap.has(originalUrl)) {
            newUrl = migrateComicUrl(originalUrl);
            migrationType = 'comic';
        }
        // Check if it's an arc chapter URL
        else if (originalUrl.includes('/chapter/')) {
            newUrl = migrateArcUrl(originalUrl);
            migrationType = 'arc';
        }

        if (newUrl) {
            // Store original URL in data attribute for reference
            link.setAttribute('data-original-url', originalUrl);
            link.setAttribute('data-migration-type', migrationType);
            link.href = newUrl;

            // Add visual indicator (different colors for comic vs arc migration)
            const borderColor = migrationType === 'comic' ? '#4CAF50' : '#2196F3';
            const backgroundColor = migrationType === 'comic' ? '#f8fff8' : '#f0f8ff';

            link.style.cssText = `
                border-left: 3px solid ${borderColor} !important;
                padding-left: 5px !important;
                background-color: ${backgroundColor} !important;
                transition: all 0.3s ease !important;
            `;

            // Add tooltip
            const typeText = migrationType === 'comic' ? 'comic' : 'arc chapter';
            link.title = `Migrated ${typeText} from: ${originalUrl}`;

            console.log(`Migrated ${migrationType} URL: ${originalUrl} -> ${newUrl}`);
            return true;
        }
        return false;
    }

    function migrateTextContent(node) {
        let text = node.nodeValue;
        let modified = false;

        // Migrate comic URLs in text
        legacyUrlMap.forEach((comicId, legacyUrl) => {
            if (text.includes(legacyUrl)) {
                const newUrl = `https://rickgriffinstudios.com/housepets/comic/${comicId}/#comic-page`;
                const regex = new RegExp(legacyUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                text = text.replace(regex, newUrl);
                modified = true;
            }
        });

        // Migrate arc chapter URLs in text
        const arcUrlRegex = /https?:\/\/(www\.)?housepetscomic\.com\/chapter\/[^\/\s]+\/?/g;
        const arcMatches = text.match(arcUrlRegex);
        if (arcMatches) {
            arcMatches.forEach(arcUrl => {
                const newUrl = migrateArcUrl(arcUrl);
                if (newUrl) {
                    text = text.replace(new RegExp(arcUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newUrl);
                    modified = true;
                }
            });
        }

        if (modified) {
            node.nodeValue = text;
        }

        return modified;
    }

    function migrateAllUrls() {
        let migratedCount = 0;

        // Migrate all <a> tags
        const links = document.getElementsByTagName('a');
        for (let link of links) {
            if (migrateLink(link)) {
                migratedCount++;
            }
        }

        // Migrate text content (for forum posts, comments, etc.)
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Only process text nodes that aren't inside script or style tags
                    const parent = node.parentElement;
                    if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
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

        if (migratedCount > 0) {
            console.log(`Housepets URL Migrator: Migrated ${migratedCount} URLs`);

            // Log available arcs for debugging
            console.log('Available arcs:', Array.from(arcMap.keys()));
        }
    }

    function waitForPageLoad() {
        // If document is already loaded, run immediately
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(migrateAllUrls, 100);
        } else {
            // Wait for full page load
            window.addEventListener('load', function() {
                setTimeout(migrateAllUrls, 500);
            });
        }

        // Also run after a delay to catch any dynamic content
        setTimeout(migrateAllUrls, 1000);
        setTimeout(migrateAllUrls, 3000);
    }

    // Initialize
    waitForPageLoad();

    // Watch for dynamic content changes
    const observer = new MutationObserver(function(mutations) {
        let shouldMigrate = false;
        for (let mutation of mutations) {
            if (mutation.addedNodes.length) {
                shouldMigrate = true;
                break;
            }
        }
        if (shouldMigrate) {
            setTimeout(migrateAllUrls, 100);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Watch for URL changes in SPAs
    let currentUrl = window.location.href;
    setInterval(function() {
        if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            setTimeout(migrateAllUrls, 500);
        }
    }, 1000);

})();
