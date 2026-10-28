// ==UserScript==
// @name         Kino.watch Skipper
// @namespace    https://github.com/vkdsk/kinowatch-skipper
// @version      1.30
// @description  Пропуск заставок и титров в плеере kino.watch (с поддержкой fallback API)
// @author       etodsk
// @match        https://*.kino.watch/*
// @icon         https://m.staticpop.net/logo.png
// @homepageURL  https://github.com/vkdsk/kinowatch-skipper
// @supportURL   https://t.me/etodsk
// @updateURL    https://kw.xlnt.ovh/kino-skipper.user.js
// @downloadURL  https://kw.xlnt.ovh/kino-skipper.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      kw.xlnt.ovh
// @connect      api.introdb.app
// @connect      api.skipdb.tv
// @connect      api.theintrodb.org
// @run-at       document-idle
// @require      https://cdnjs.cloudflare.com/ajax/libs/blueimp-md5/2.19.0/js/md5.min.js
// ==/UserScript==
(function() {
    'use strict';

    const SETTINGS = {
        get enableIntro() {
            return GM_getValue('enableIntro', true);
        },
        set enableIntro(val) {
            GM_setValue('enableIntro', Boolean(val));
        },
        get enableRecap() {
            return GM_getValue('enableRecap', false);
        },
        set enableRecap(val) {
            GM_setValue('enableRecap', Boolean(val));
        },
        get enableOutro() {
            return GM_getValue('enableOutro', true);
        },
        set enableOutro(val) {
            GM_setValue('enableOutro', Boolean(val));
        },

        get enableUndo() {
            return GM_getValue('enableUndo', true);
        },
        set enableUndo(val) {
            GM_setValue('enableUndo', Boolean(val));
        },
        get undoTimer() {
            return GM_getValue('undoTimer', 7);
        },
        set undoTimer(val) {
            GM_setValue('undoTimer', Math.min(60, Math.max(1, parseInt(val, 10) || 7)));
        },
        get enableSmartDetect() {
            return GM_getValue('enableSmartDetect', true);
        },
        set enableSmartDetect(val) {
            GM_setValue('enableSmartDetect', Boolean(val));
        },
        get enableCredits() {
            return GM_getValue('enableCredits', true);
        },
        set enableCredits(val) {
            GM_setValue('enableCredits', Boolean(val));
        },
        get autoSkipIntro() {
            return GM_getValue('autoSkipIntro', true);
        },
        set autoSkipIntro(val) {
            GM_setValue('autoSkipIntro', Boolean(val));
        },
        get autoSkipTimerIntro() {
            return GM_getValue('autoSkipTimerIntro', 5);
        },
        set autoSkipTimerIntro(val) {
            GM_setValue('autoSkipTimerIntro', Math.max(1, parseInt(val, 10) || 5));
        },
        get introHidePercent() {
            return GM_getValue('introHidePercent', 15);
        },
        set introHidePercent(val) {
            GM_setValue('introHidePercent', Math.min(100, Math.max(1, parseInt(val, 10) || 15)));
        },
        get autoSkipOutro() {
            return GM_getValue('autoSkipOutro', true);
        },
        set autoSkipOutro(val) {
            GM_setValue('autoSkipOutro', Boolean(val));
        },
        get autoSkipTimerOutro() {
            return GM_getValue('autoSkipTimerOutro', 5);
        },
        set autoSkipTimerOutro(val) {
            GM_setValue('autoSkipTimerOutro', Math.max(1, parseInt(val, 10) || 5));
        },
        get outroShowPercent() {
            return GM_getValue('outroShowPercent', 15);
        },
        set outroShowPercent(val) {
            GM_setValue('outroShowPercent', Math.min(100, Math.max(1, parseInt(val, 10) || 15)));
        }
    };

    GM_addStyle(`
        .player-bottom .kino-skip-controls {
            display: inline-flex !important;
            flex-direction: row !important;
            align-items: center !important;
            gap: 6px !important;
            /* margin-left: auto !important; */
            height: 100% !important;
            box-sizing: border-box;
            flex-shrink: 0;
        }
        /* свой контекст наложения: z-index кнопок не перекрывает шторку меню сайта */
        media-player { isolation: isolate; }
        .kino-skip-floating {
            position: absolute;
            right: max(16px, env(safe-area-inset-right, 0px));
            bottom: 16px; /* точное значение выставляет JS (layoutFloating) */
            max-width: calc(100% - 32px);
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: flex-end;
            align-items: center;
            gap: 6px;
            z-index: 2147483646;
            pointer-events: none;
            transition: bottom 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .kino-skip-floating > * { pointer-events: auto; }
        @media (max-width: 600px), (max-height: 480px) {
            .kino-skip-floating .kino-btn-expandable {
                height: 28px;
                padding: 4px 8px;
                font-size: 12px;
            }
        }
        .kino-btn-expandable {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: none;
            padding: 6px 10px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 13px;
            line-height: 1;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
            white-space: nowrap;
            overflow: hidden;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            color: #ffffff;
            height: 32px;
            box-sizing: border-box;
        }
        .kino-btn-expandable .btn-icon {
            font-size: 15px;
            display: inline-flex;
            justify-content: space-around;
            flex-direction: column;
            z-index: 1;
        }
        .kino-btn-expandable .btn-text {
            max-width: 0;
            opacity: 0;
            overflow: hidden;
            transition: max-width 0.3s ease, opacity 0.2s ease, margin-left 0.2s ease;
            margin-left: 0;
            display: inline-flex;
            z-index: 1;
        }
        .kino-btn-expandable:hover .btn-text,
        .kino-btn-expandable.force-expanded .btn-text {
            max-width: 220px;
            opacity: 1;
            margin-left: 6px;
        }
        .kino-skip-btn {
            position: relative;
            background: #26d78b;
            cursor: pointer;
            padding: 6px 12px;
        }
        .kino-skip-btn .btn-text {
            max-width: 220px !important;
            opacity: 1 !important;
            margin-left: 6px !important;
        }
        .kino-skip-progress-fill {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #26d78b 0%, #50e0a2 100%);
            border-radius: 6px;
            transition: width 0.1s linear;
            z-index: 0;
        }
        .kino-skip-btn:hover {
            transform: scale(1.03);
        }
        .kino-undo-btn {
            position: relative;
            background: #b86e00;
            padding: 6px 12px;
        }
        .kino-undo-btn .btn-text {
            max-width: 220px !important;
            opacity: 1 !important;
            margin-left: 6px !important;
        }
        .kino-undo-btn:hover {
            transform: scale(1.03);
        }
        .kino-undo-fill {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #e08a00 0%, #f0a830 100%);
            border-radius: 6px;
            z-index: 0;
        }
        .kino-cancel-autoskip-btn {
            background: #6c757d;
        }
        .kino-cancel-autoskip-btn:hover {
            background: #5a6268;
            transform: scale(1.03);
        }
        .kino-mark-intro-btn {
            background: #007bff;
        }
        .kino-mark-intro-btn:hover {
            background: #0069d9;
            transform: scale(1.03);
        }
        .kino-mark-outro-btn {
            background: #6f42c1;
        }
        .kino-mark-outro-btn:hover {
            background: #5a32a3;
            transform: scale(1.03);
        }
        .kino-btn-expandable.marking {
            background: #dc3545 !important;
            animation: pulse 1.5s infinite;
        }
        .kino-step-btn {
            background: #5c636a;
            padding: 6px 8px;
        }
        .kino-step-btn:hover {
            background: #464c52;
            transform: scale(1.05);
        }
        .kino-settings-btn {
            background: #4a4d52;
            margin-right: auto !important;
        }
        .kino-settings-btn:hover {
            background: #343a40;
            transform: scale(1.03);
        }
        .kino-report-btn {
            background: #360000;
        }
        .kino-report-btn:hover {
            background: #230000;
            transform: scale(1.03);
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.6; }
            100% { opacity: 1; }
        }
        .kino-skip-modal-overlay {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2147483647 !important;
            backdrop-filter: blur(6px);
            pointer-events: auto;
            box-sizing: border-box;
            padding: 10px;
        }
        .kino-skip-modal {
            background: #1e1e24;
            color: #fff;
            padding: 16px 18px 12px 18px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
            width: 100%;
            max-width: 420px;
            max-height: 95%;
            display: flex;
            flex-direction: column;
            font-family: system-ui, -apple-system, sans-serif;
            box-sizing: border-box;
        }
        .kino-skip-modal-body {
            overflow-y: auto;
            flex: 1 1 auto;
            padding-right: 4px;
            margin-bottom: 8px;
        }
        .kino-skip-modal-body::-webkit-scrollbar {
            width: 4px;
        }
        .kino-skip-modal-body::-webkit-scrollbar-thumb {
            background: #4a4d52;
            border-radius: 4px;
        }
        .kino-skip-modal h3 { margin: 0 0 12px 0; font-size: 18px; color: #fff; }
        .kino-skip-modal p { margin: 0 0 16px 0; font-size: 14px; color: #ccc; line-height: 1.4; }
        .kino-skip-modal .time-range { font-weight: bold; color: #00ff88; font-size: 16px; }
        .kino-settings-section-title {
            font-size: 13px;
            font-weight: bold;
            color: #26d78b;
            text-align: left;
            margin: 12px 0 6px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #343a40;
            padding-bottom: 4px;
        }
        .kino-settings-group {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
            text-align: left;
            font-size: 13px;
            gap: 10px;
        }
        .kino-settings-group label {
            color: #ddd;
            cursor: pointer;
            flex: 1;
        }
        .kino-settings-group input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: #28a745;
        }
        .kino-settings-group input[type="number"] {
            width: 60px;
            padding: 4px 6px;
            border-radius: 6px;
            border: 1px solid #4a4d52;
            background: #2b2b36;
            color: #fff;
            font-size: 13px;
            text-align: center;
        }
        .kino-skip-modal-actions {
            display: flex;
            gap: 10px;
            justify-content: center;
            padding-top: 8px;
            border-top: 1px solid #2b2b36;
            flex-shrink: 0;
        }
        .kino-modal-btn {
            padding: 8px 18px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s, transform 0.1s;
        }
        .kino-modal-btn:hover { opacity: 0.9; }
        .kino-modal-btn:active { transform: scale(0.98); }
        .kino-modal-confirm { background: #28a745; color: #fff; }
        .kino-modal-cancel { background: #4a4d52; color: #fff; }
        .kino-toast-notification {
            position: absolute;
            top: 20px;
            right: 20px;
            color: #ffffff;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
            z-index: 2147483647 !important;
            pointer-events: none;
            animation: fadeInOut 3.5s forwards;
        }
        .kino-toast-notification.success { background: rgba(40, 167, 69, 0.95); }
        .kino-toast-notification.error { background: rgba(220, 53, 69, 0.95); }
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(-10px); }
            15% { opacity: 1; transform: translateY(0); }
            85% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-10px); }
        }
    `);

    const API_URL = 'https://kw.xlnt.ovh/index.php';
    let currentMediaId = null;
    let currentUsername = null;
    let currentIntro = null;
    let currentOutro = null;
    let canSubmitIntro = false;
    let canSubmitOutro = false;
    let markStartTime = null;
    let activeMarkingType = null;
    let isAutoSkipCancelled = false;
    let renderMarkersHook = null; // выставляется в createUI

    // Вспомогательные функции отправки запросов с таймаутом
    function sendApiRequest(url, options = {}) {
        const timeoutMs = options.timeout || 15000;
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: options.method || 'GET',
                url: url,
                timeout: timeoutMs,
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json',
                    ...(options.headers || {})
                },
                data: options.body || null,
                onload: (response) => {
                    let data;
                    try {
                        data = JSON.parse(response.responseText);
                    } catch (e) {
                        data = response.responseText;
                    }
                    if (response.status >= 200 && response.status < 300) {
                        resolve(data);
                    } else {
                        let errorMsg = `Ошибка сервера (${response.status})`;
                        if (typeof data === 'object' && data && data.error) {
                            errorMsg = data.error;
                        }
                        reject({ status: response.status, message: errorMsg, data });
                    }
                },
                ontimeout: () => reject({ status: 408, message: 'Превышено время ожидания (15 с)' }),
                onerror: () => reject({ status: 0, message: 'Сетевая ошибка' })
            });
        });
    }

    // Извлечение IMDb ID из ссылок на странице
    function getImdbId() {
        const links = document.querySelectorAll('a[href*="imdb.com/title/"]');
        for (const link of links) {
            const match = link.href.match(/title\/(tt\d+)/);
            if (match && match[1]) return match[1];
        }
        return null;
    }

    // Извлечение сезона и серии из текущего URL
    function parseSeasonEpisode() {
        const match = window.location.pathname.match(/\/s(\d+)e(\d+)/i);
        if (!match) return { isMovie: false, season: null, episode: null };

        const season = parseInt(match[1], 10);
        const episode = parseInt(match[2], 10);

        if (season === 0) {
            return { isMovie: true, season: null, episode: null };
        }
        return { isMovie: false, season, episode };
    }

    // Ожидание и получение длительности видео в миллисекундах
    function getVideoDurationMs(playerElement) {
        return new Promise((resolve) => {
            const checkDuration = () => {
                const nativeVideo = playerElement.querySelector('video');
                let durSec = 0;
                if (nativeVideo && !isNaN(nativeVideo.duration) && nativeVideo.duration > 0) {
                    durSec = nativeVideo.duration;
                } else if (playerElement.duration && !isNaN(playerElement.duration) && playerElement.duration > 0) {
                    durSec = playerElement.duration;
                }

                if (durSec > 0) {
                    resolve(Math.round(durSec * 1000));
                    return true;
                }
                return false;
            };

            if (checkDuration()) return;

            const nativeVideo = playerElement.querySelector('video');
            const onLoaded = () => {
                if (checkDuration()) {
                    if (nativeVideo) nativeVideo.removeEventListener('loadedmetadata', onLoaded);
                }
            };

            if (nativeVideo) {
                nativeVideo.addEventListener('loadedmetadata', onLoaded);
            }

            // Таймаут безопасности для определения длительности (3 секунды)
            setTimeout(() => {
                checkDuration();
                if (nativeVideo) nativeVideo.removeEventListener('loadedmetadata', onLoaded);
                resolve(0);
            }, 3000);
        });
    }

    // Вспомогательный объединитель диапазонов старта и конца с учетом null
    function combineSegments(seg1, seg2) {
        if (!seg1 && !seg2) return null;
        if (seg1 && !seg2) return seg1;
        if (!seg1 && seg2) return seg2;

        const resolveMinStart = (s1, s2) => {
            if (s1 === null || s1 === undefined || s2 === null || s2 === undefined) return null;
            return Math.min(s1, s2);
        };

        const resolveMaxEnd = (e1, e2) => {
            if (e1 === null || e1 === undefined || e2 === null || e2 === undefined) return null;
            return Math.max(e1, e2);
        };

        return {
            start_ms: resolveMinStart(seg1.start_ms, seg2.start_ms),
            end_ms: resolveMaxEnd(seg1.end_ms, seg2.end_ms)
        };
    }

    // Нормализация временного диапазона в секунды
    function toSecondsSegment(segMs, totalDurationMs = 0) {
        if (!segMs) return null;

        let start = segMs.start_ms;
        let end = segMs.end_ms;

        // Если начало null -> это начало видео (0)
        if (start === null || start === undefined) {
            start = 0;
        }

        // Если конец null -> подставляем длительность или Infinity
        if (end === null || end === undefined) {
            end = totalDurationMs > 0 ? totalDurationMs : Infinity;
        }

        if (start === null || end === null || start >= end) {
            return null;
        }

        return {
            start_time: start / 1000,
            end_time: end === Infinity ? Infinity : end / 1000
        };
    }

    function resolveSegmentsFromData(rawIntro, rawRecap, rawOutro, rawCredits, rawPostCredits, rawPreview, durationMs, apiSource) {
        const isValidSeg = (s) => s && (typeof s.start_ms === 'number' || s.start_ms === null) && (typeof s.end_ms === 'number' || s.end_ms === null);

        const useIntro = SETTINGS.enableIntro && isValidSeg(rawIntro) ? rawIntro : null;
        const useRecap = SETTINGS.enableRecap && isValidSeg(rawRecap) ? rawRecap : null;
        const introSeg = combineSegments(useIntro, useRecap);

        const useOutro = SETTINGS.enableOutro && isValidSeg(rawOutro) ? rawOutro : null;
        const useCredits = SETTINGS.enableCredits && isValidSeg(rawCredits) ? rawCredits : null;
        const usePostCredits = SETTINGS.enableCredits && isValidSeg(rawPostCredits) ? rawPostCredits : null;
        const usePreview = SETTINGS.enableOutro && isValidSeg(rawPreview) ? rawPreview : null;

        const creditsCombined = combineSegments(useCredits, usePostCredits);
        const outroCombined = combineSegments(useOutro, usePreview);
        const outroSeg = combineSegments(outroCombined, creditsCombined);

        const intro = toSecondsSegment(introSeg, durationMs);
        const credits = toSecondsSegment(outroSeg, durationMs);

        if (intro) intro.api_source = apiSource;
        if (credits) credits.api_source = apiSource;

        return { intro, credits };
    }
    
    // 1. Запрос к "kw.xlnt.ovh"
    async function fetchFromKwApi(mediaId) {
        let requestUrl = `${API_URL}?media_id=${encodeURIComponent(mediaId)}`;
        if (currentUsername) {
            requestUrl += `&username=${encodeURIComponent(currentUsername)}`;
        }
        const data = await sendApiRequest(requestUrl, { timeout: 15000 });

        let intro = SETTINGS.enableIntro && data.intro ? data.intro : null;
        let outro = SETTINGS.enableCredits && data.outro ? data.outro : null;

        if (intro) intro.api_source = 'kw.xlnt.ovh';
        if (outro) outro.api_source = 'kw.xlnt.ovh';

        return {
            available: true,
            can_submit_intro: Boolean(data.can_submit_intro),
            can_submit_outro: Boolean(data.can_submit_outro),
            intro: intro,
            credits: outro
        };
    }

    // 2. Запрос к "introdb"
    async function fetchFromIntroDb(imdbId, seInfo, durationMs) {
        let url = `https://api.introdb.app/segments?imdb_id=${encodeURIComponent(imdbId)}`;
        if (seInfo.isMovie) {
            url += `&is_movie=true`;
        } else {
            url += `&season=${seInfo.season}&episode=${seInfo.episode}`;
        }

        const data = await sendApiRequest(url, { timeout: 15000 });

        return resolveSegmentsFromData(
            data.intro,
            data.recap,
            data.outro,
            null,
            data.post_credits,
            null,
            durationMs,
            'introdb'
        );
    }

    // 3. Запрос к "skipdb"
    async function fetchFromSkipDb(imdbId, seInfo, durationMs) {
        let url = `https://api.skipdb.tv/api/segments?imdb_id=${encodeURIComponent(imdbId)}`;
        if (seInfo.isMovie) {
            if (durationMs > 0) url += `&duration=${durationMs}`;
        } else {
            url += `&season=${seInfo.season}&episode=${seInfo.episode}`;
            if (durationMs > 0) url += `&duration=${durationMs}`;
        }

        const data = await sendApiRequest(url, { timeout: 15000 });
        const segs = data.segments || {};

        return resolveSegmentsFromData(
            segs.intro,
            segs.recap,
            segs.outro,
            null,
            null,
            segs.preview,
            durationMs,
            'skipdb'
        );
    }

    // 4. Запрос к "theintrodb"
    async function fetchFromTheIntroDb(imdbId, seInfo, durationMs) {
        let url = `https://api.theintrodb.org/v4/media?imdb_id=${encodeURIComponent(imdbId)}`;
        if (seInfo.isMovie) {
            if (durationMs > 0) url += `&duration_ms=${durationMs}`;
        } else {
            url += `&season=${seInfo.season}&episode=${seInfo.episode}`;
            if (durationMs > 0) url += `&duration_ms=${durationMs}`;
        }

        const data = await sendApiRequest(url, { timeout: 15000 });

        const getFirstValid = (arr) => (Array.isArray(arr) && arr.length > 0 ? arr[0] : null);

        return resolveSegmentsFromData(
            getFirstValid(data.intro),
            getFirstValid(data.recap),
            null,
            getFirstValid(data.credits),
            null,
            getFirstValid(data.preview),
            durationMs,
            'theintrodb'
        );
    }

    function showToast(playerElement, message, type = 'success') {
        if (!playerElement) return;
        const toast = document.createElement('div');
        toast.className = `kino-toast-notification ${type}`;
        toast.innerText = message;
        playerElement.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    }

    function formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }

        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function getCurrentVideoTime(playerElement) {
        const nativeVideo = playerElement.querySelector('video');
        if (nativeVideo && !isNaN(nativeVideo.currentTime) && nativeVideo.currentTime > 0) {
            return nativeVideo.currentTime;
        }
        if (playerElement.state && typeof playerElement.state.currentTime === 'number') {
            return playerElement.state.currentTime;
        }
        if (typeof playerElement.currentTime === 'number' && !isNaN(playerElement.currentTime)) {
            return playerElement.currentTime;
        }
        return 0;
    }

    function getActiveMediaId() {
        const activeThumbnail = document.querySelector('.episode-thumbnail.active');
        if (activeThumbnail && activeThumbnail.dataset.id) return activeThumbnail.dataset.id;
        const activeInput = document.querySelector('.episode-thumbnail.active .marktime-checkbox');
        if (activeInput && activeInput.dataset.id) return activeInput.dataset.id;
        try {
            const scripts = document.querySelectorAll('script');
            for (const script of scripts) {
                if (script.textContent.includes('PLAYER_PLAYLIST')) {
                    const match = script.textContent.match(/"media_id":\s*(\d+)/);
                    if (match && match[1]) return match[1];
                }
            }
        } catch (e) {
            console.error('[Kino Skip] Ошибка получения media_id:', e);
        }
        return null;
    }

    function getWatchlistUsername() {
        const watchlistLink = document.querySelector('a[href^="/watchlist/"]');
        if (!watchlistLink) return null;
        const href = watchlistLink.getAttribute('href');
        const match = href.match(/\/watchlist\/([^/?#]+)/);
        return match ? md5(match[1]) : null;
    }


    // ---------------------------------------------------------------
    // Умное определение заставки/титров по субтитрам (запасной вариант,
    // когда ни одна база сегмент не отдала). Субтитры скачиваются напрямую
    // из <track src="...m3u8"> (HLS-сегменты WebVTT с абсолютными таймкодами).
    // ---------------------------------------------------------------
    const SMART = { INTRO_LIMIT: 360, INTRO_MIN: 15, INTRO_MAX: 150, CREDITS_MIN_GAP: 30, CREDITS_ZONE: 600 };
    const SMART_CACHE_KEY = 'smartDetectCache';
    const SMART_CACHE_TTL = 30 * 24 * 3600 * 1000;
    let smartToken = 0;

    // cues: [{start, end}], duration в секундах. Возвращает { intro, credits } (секунды) или null-поля.
    // SMART-FIND-START
    function findSegmentsByCues(cues, duration) {
        cues = cues.slice().sort((a, b) => a.start - b.start);
        const out = { intro: null, credits: null };
        if (cues.length < 5) return out;

        // (а) первая реплика через 15–150 с: всё до неё заставка
        let longest = 0;
        if (cues[0].start >= SMART.INTRO_MIN && cues[0].start <= SMART.INTRO_MAX) {
            longest = cues[0].start;
            out.intro = { start_time: 0, end_time: Math.round(cues[0].start) };
        }
        // (б) самая длинная пауза 15–150 с в первых 6 минутах
        for (let i = 0; i < cues.length - 1; i++) {
            if (cues[i].end > SMART.INTRO_LIMIT) break;
            const gs = cues[i].end;
            const ge = cues[i + 1].start;
            const gap = ge - gs;
            if (gap >= SMART.INTRO_MIN && gap <= SMART.INTRO_MAX && gap > longest) {
                longest = gap;
                out.intro = { start_time: Math.round(gs), end_time: Math.round(ge) };
            }
        }

        // (в) титры: только для серий длиннее 10 минут и только если субтитры
        // загружены почти до конца (иначе «тишина» — это просто не загруженная часть)
        if (duration > 600) {
            const last = cues[cues.length - 1];
            const coverageOk = last.end >= duration - SMART.CREDITS_ZONE;
            if (coverageOk) {
                const tail = duration - last.end;
                let best = null;
                let bestLen = 0;
                if (tail >= SMART.CREDITS_MIN_GAP && tail <= SMART.CREDITS_ZONE) {
                    best = { start_time: Math.round(last.end), end_time: Math.round(duration) };
                    bestLen = tail;
                }
                const from = duration - SMART.CREDITS_ZONE;
                for (let j = 0; j < cues.length - 1; j++) {
                    if (cues[j].end < from) continue;
                    const len = cues[j + 1].start - cues[j].end;
                    if (len >= SMART.CREDITS_MIN_GAP && len > bestLen) {
                        bestLen = len;
                        best = { start_time: Math.round(cues[j].end), end_time: Math.round(cues[j + 1].start) };
                    }
                }
                out.credits = best;
            }
        }
        return out;
    }
    // SMART-FIND-END

    // SMART-LOAD-START
    function fetchText(url, timeout = 15000) {
        return fetch(url)
            .then((r) => {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.text();
            })
            .catch(() => new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url,
                    timeout,
                    onload: (r) => (r.status >= 200 && r.status < 300 ? resolve(r.responseText) : reject(new Error('HTTP ' + r.status))),
                    onerror: () => reject(new Error('network')),
                    ontimeout: () => reject(new Error('timeout'))
                });
            }));
    }

    function parseVttTime(str) {
        const parts = str.trim().split(':');
        if (parts.length === 3) return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
        return parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
    }

    function parseVttCues(text) {
        const cues = [];
        const re = /(\d{1,2}:\d{2}(?::\d{2})?\.\d{3})\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?\.\d{3})/g;
        let m;
        while ((m = re.exec(text)) !== null) {
            const s = parseVttTime(m[1]);
            const e = parseVttTime(m[2]);
            if (e > s) cues.push({ start: s, end: e });
        }
        return cues;
    }

    // Скачивает дорожку субтитров. Из плейлиста берутся только сегменты, перекрывающие
    // начало серии (поиск заставки) и последние 10 минут (поиск титров).
    async function loadSubtitleCues(playerElement, durationHint) {
        const video = playerElement.querySelector('video');
        if (!video) return null;
        const els = Array.from(video.querySelectorAll('track[src]'))
            .filter((el) => !el.kind || /subtitles|captions/i.test(el.kind));
        if (!els.length) return null;
        const ru = els.find((el) => /рус|russian|^ru/i.test(`${el.label || ''} ${el.srclang || ''}`));
        const el = ru || els[0];
        const url = new URL(el.getAttribute('src'), location.href).href;

        const body = await fetchText(url);
        if (/^\s*WEBVTT/.test(body)) return { cues: parseVttCues(body) };

        const segs = [];
        let t = 0;
        let dur = 0;
        for (const raw of body.split('\n')) {
            const line = raw.trim();
            if (line.startsWith('#EXTINF:')) {
                dur = parseFloat(line.slice(8)) || 0;
            } else if (line && !line.startsWith('#')) {
                segs.push({ url: new URL(line, url).href, start: t, end: t + dur });
                t += dur;
                dur = 0;
            }
        }
        if (!segs.length) return null;

        const duration = durationHint > 0 ? durationHint : t;
        let wanted = segs;
        if (t > 0) {
            wanted = segs.filter((s) => s.start < SMART.INTRO_LIMIT + 60 || s.end > duration - SMART.CREDITS_ZONE - 60);
        }
        wanted = wanted.slice(0, 300);

        const cues = [];
        for (let i = 0; i < wanted.length; i += 5) {
            const chunk = wanted.slice(i, i + 5);
            const results = await Promise.all(chunk.map((s) => fetchText(s.url).then(parseVttCues).catch(() => [])));
            results.forEach((r) => cues.push(...r));
        }
        cues.sort((a, b) => a.start - b.start || a.end - b.end);
        return cues.length ? { cues } : null;
    }
    // SMART-LOAD-END

    // запасной путь: реплики, которые плеер уже загрузил сам (могут быть неполными)
    function collectSubtitleCues(playerElement) {
        const lists = [];
        try { if (playerElement.textTracks) lists.push(playerElement.textTracks); } catch (e) { /* ignore */ }
        const video = playerElement.querySelector('video');
        try { if (video && video.textTracks) lists.push(video.textTracks); } catch (e) { /* ignore */ }

        let best = null;
        for (const list of lists) {
            let tracks = [];
            try {
                tracks = typeof list.toArray === 'function' ? list.toArray() : Array.from(list);
            } catch (e) { continue; }
            for (const track of tracks) {
                if (track.kind && track.kind !== 'subtitles' && track.kind !== 'captions') continue;
                let cues;
                try { cues = Array.from(track.cues || []); } catch (e) { continue; }
                if (cues.length > 5 && (!best || cues.length > best.length)) best = cues;
            }
        }
        return best ? best.map((c) => ({ start: c.startTime, end: c.endTime })) : null;
    }

    const smartKey = (type) => (type === 'outro' ? 'credits' : 'intro');

    function smartCacheGet(mediaId) {
        const all = GM_getValue(SMART_CACHE_KEY, {}) || {};
        const r = all[mediaId];
        if (!r || Date.now() - r.ts > SMART_CACHE_TTL) return null;
        return r;
    }

    function smartCacheSet(mediaId, intro, credits) {
        const all = GM_getValue(SMART_CACHE_KEY, {}) || {};
        const now = Date.now();
        Object.keys(all).forEach((k) => { if (now - all[k].ts > SMART_CACHE_TTL) delete all[k]; });
        const prev = all[mediaId] || {};
        all[mediaId] = {
            intro: intro || prev.intro || null,
            credits: credits || prev.credits || null,
            rejected: prev.rejected || {},
            ts: now
        };
        GM_setValue(SMART_CACHE_KEY, all);
    }

    // пользователь нажал «Вернуться»: сегмент забываем и больше не предлагаем
    function smartCacheReject(mediaId, type) {
        const all = GM_getValue(SMART_CACHE_KEY, {}) || {};
        const key = smartKey(type);
        const prev = all[mediaId] || {};
        all[mediaId] = {
            intro: prev.intro || null,
            credits: prev.credits || null,
            rejected: { ...(prev.rejected || {}), [key]: true },
            ts: Date.now()
        };
        all[mediaId][key] = null;
        GM_setValue(SMART_CACHE_KEY, all);
    }

    function applySmartSegments(mediaId, intro, credits, playerElement) {
        if (mediaId !== currentMediaId) return;
        if (intro && !currentIntro) currentIntro = { ...intro, api_source: 'subs' };
        if (credits && !currentOutro) currentOutro = { ...credits, api_source: 'subs' };
        updateMarkBtnsVisibility(playerElement);
    }

    // Отправка в базу сегмента, определённого по субтитрам и не отклонённого пользователем
    async function submitSmartSegment(type, seg, mediaId, playerElement) {
        const isOutro = type === 'outro';
        if (mediaId !== currentMediaId) return;
        if (!(isOutro ? canSubmitOutro : canSubmitIntro)) return;
        const length = seg.end_time - seg.start_time;
        const maxDuration = isOutro ? 900 : 300;
        if (!isFinite(length) || length < 10 || length > maxDuration) return;
        if (!currentUsername) currentUsername = getWatchlistUsername();
        if (!currentUsername) return;

        if (isOutro) canSubmitOutro = false;
        else canSubmitIntro = false;

        try {
            const payload = {
                media_id: String(mediaId),
                page_url: window.location.href,
                username: String(currentUsername),
                start_time: Number(seg.start_time.toFixed(2)),
                end_time: Number(seg.end_time.toFixed(2))
            };
            if (isOutro) payload.outro = true;
            await sendApiRequest(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            console.log('[Kino Skip] Не удалось отправить сегмент из субтитров:', err);
        }
        updateMarkBtnsVisibility(playerElement);
    }

    function startSmartDetect(mediaId, playerElement) {
        const token = ++smartToken;
        const deadline = Date.now() + 10 * 60 * 1000;
        let fetchFailed = false;

        const cached = smartCacheGet(mediaId);
        const rejected = (cached && cached.rejected) || {};
        if (cached) {
            applySmartSegments(
                mediaId,
                rejected.intro ? null : cached.intro,
                rejected.credits ? null : cached.credits,
                playerElement
            );
        }

        const needIntro = () => !currentIntro && SETTINGS.enableIntro && !rejected.intro;
        const needCredits = () => !currentOutro && SETTINGS.enableCredits && !rejected.credits;

        const poll = async () => {
            if (token !== smartToken || mediaId !== currentMediaId || !SETTINGS.enableSmartDetect) return;
            if (Date.now() > deadline || (!needIntro() && !needCredits())) return;

            const durationMs = await getVideoDurationMs(playerElement);
            if (token !== smartToken || mediaId !== currentMediaId) return;
            if (!durationMs) { setTimeout(poll, 5000); return; }
            const duration = durationMs / 1000;

            let cues = null;
            let complete = false;
            if (!fetchFailed) {
                try {
                    const res = await loadSubtitleCues(playerElement, duration);
                    if (res) { cues = res.cues; complete = true; }
                } catch (e) {
                    fetchFailed = true;
                    console.log('[Kino Skip] Не удалось скачать субтитры:', e);
                }
            }
            if (!cues) cues = collectSubtitleCues(playerElement);
            if (token !== smartToken || mediaId !== currentMediaId) return;

            if (cues) {
                const found = findSegmentsByCues(cues, duration);
                const intro = needIntro() ? found.intro : null;
                const credits = needCredits() ? found.credits : null;
                if (intro || credits) {
                    applySmartSegments(mediaId, intro, credits, playerElement);
                    smartCacheSet(mediaId, intro, credits);
                }
                if (complete) return; // дорожка скачана целиком, повторять незачем
            }
            setTimeout(poll, 5000);
        };
        setTimeout(poll, 3000);
    }

    // Цепочка получение сегментов
    async function fetchSegments(mediaId, playerElement) {
        isAutoSkipCancelled = false;
        if (!currentUsername) {
            currentUsername = getWatchlistUsername();
        }

        let foundIntro = null;
        let foundCredits = null;
        let isKwAvailable = false;

        // Step 1: kw.xlnt.ovh
        try {
            const kwRes = await fetchFromKwApi(mediaId);
            isKwAvailable = true;
            canSubmitIntro = kwRes.can_submit_intro;
            canSubmitOutro = kwRes.can_submit_outro;

            if (kwRes.intro) foundIntro = kwRes.intro;
            if (kwRes.credits) foundCredits = kwRes.credits;
        } catch (err) {
            isKwAvailable = false;
            canSubmitIntro = false;
            canSubmitOutro = false;
        }

        // Если оба сегмента получены от собственного API, не опрашиваем сторонние
        if (foundIntro && foundCredits) {
            currentIntro = foundIntro;
            currentOutro = foundCredits;
            updateMarkBtnsVisibility(playerElement);
            return;
        }

        // Проверяем данные для сторонних API
        const imdbId = getImdbId();
        if (imdbId) {
            const seInfo = parseSeasonEpisode();
            const durationMs = await getVideoDurationMs(playerElement);

            // Step 2: introdb
            if (!foundIntro || !foundCredits) {
                try {
                    const res = await fetchFromIntroDb(imdbId, seInfo, durationMs);
                    if (!foundIntro && res.intro) foundIntro = res.intro;
                    if (!foundCredits && res.credits) foundCredits = res.credits;
                } catch (e) { /* Игнорируем ошибку */ }
            }

            // Step 3: skipdb
            if (!foundIntro || !foundCredits) {
                try {
                    const res = await fetchFromSkipDb(imdbId, seInfo, durationMs);
                    if (!foundIntro && res.intro) foundIntro = res.intro;
                    if (!foundCredits && res.credits) foundCredits = res.credits;
                } catch (e) { /* Игнорируем ошибку */ }
            }

            // Step 4: theintrodb
            if (!foundIntro || !foundCredits) {
                try {
                    const res = await fetchFromTheIntroDb(imdbId, seInfo, durationMs);
                    if (!foundIntro && res.intro) foundIntro = res.intro;
                    if (!foundCredits && res.credits) foundCredits = res.credits;
                } catch (e) { /* Игнорируем ошибку */ }
            }
        }

        currentIntro = foundIntro;
        currentOutro = foundCredits;

        // Кнопку отправки заставки/титров показываем ТОЛЬКО если собственный API доступен И сегмент НЕ найден
        if (!isKwAvailable || currentIntro !== null) {
            canSubmitIntro = false;
        }
        if (!isKwAvailable || currentOutro !== null) {
            canSubmitOutro = false;
        }

        // базы ничего не дали: пробуем определить по субтитрам
        if ((!currentIntro || !currentOutro) && SETTINGS.enableSmartDetect) {
            startSmartDetect(mediaId, playerElement);
        }

        updateMarkBtnsVisibility(playerElement);
    }

    function updateMarkBtnsVisibility(playerElement) {
        if (!playerElement) return;
        if (renderMarkersHook) renderMarkersHook();
        const markIntroBtn = playerElement.querySelector('.kino-mark-intro-btn');
        const markOutroBtn = playerElement.querySelector('.kino-mark-outro-btn');
        const stepBackBtn = playerElement.querySelector('.kino-step-btn-back');
        const stepForwardBtn = playerElement.querySelector('.kino-step-btn-forward');
        if (!markIntroBtn || !markOutroBtn) return;

        if (activeMarkingType !== null) {
            if (activeMarkingType === 'outro') {
                if (stepBackBtn) stepBackBtn.style.display = 'none';
                if (stepForwardBtn) stepForwardBtn.style.display = 'none';
            } else if (activeMarkingType === 'intro') {
                if (stepBackBtn) stepBackBtn.style.display = 'inline-flex';
                if (stepForwardBtn) stepForwardBtn.style.display = 'inline-flex';
            }
            return;
        }

        const nativeVideo = playerElement.querySelector('video');
        const duration = (nativeVideo && !isNaN(nativeVideo.duration)) ? nativeVideo.duration : (playerElement.duration || 0);
        const currentTime = getCurrentVideoTime(playerElement);

        let isIntroBtnVisible = false;
        let isOutroBtnVisible = false;

        if (canSubmitIntro) {
            if (duration === 0) {
                isIntroBtnVisible = true;
            } else {
                const currentPercent = (currentTime / duration) * 100;
                if (currentPercent <= SETTINGS.introHidePercent) {
                    isIntroBtnVisible = true;
                }
            }
        }

        if (canSubmitOutro && duration > 0) {
            const currentPercent = (currentTime / duration) * 100;
            if (currentPercent >= (100 - SETTINGS.outroShowPercent)) {
                isOutroBtnVisible = true;
            }
        }

        markIntroBtn.style.display = isIntroBtnVisible ? 'inline-flex' : 'none';
        markOutroBtn.style.display = isOutroBtnVisible ? 'inline-flex' : 'none';

        if (isOutroBtnVisible) {
            if (stepBackBtn) stepBackBtn.style.display = 'inline-flex';
            if (stepForwardBtn) stepForwardBtn.style.display = 'inline-flex';
        } else {
            if (stepBackBtn) stepBackBtn.style.display = 'none';
            if (stepForwardBtn) stepForwardBtn.style.display = 'none';
        }
    }

    function seekTo(playerElement, seconds) {
        const targetTime = Math.max(0, seconds);
        const nativeVideo = playerElement.querySelector('video');
        if (nativeVideo) nativeVideo.currentTime = targetTime;
        else playerElement.currentTime = targetTime;
    }

    function showReportModal(playerElement, startTime, endTime, isOutro, onSubmit) {
        if (document.querySelector('.kino-skip-modal-overlay')) return;

        const overlay = document.createElement('div');
        overlay.className = 'kino-skip-modal-overlay';

        const formattedStart = formatTime(startTime);
        const formattedEnd = formatTime(endTime);
        const labelText = isOutro ? 'титры' : 'заставку';

        overlay.innerHTML = `
            <div class="kino-skip-modal">
                <h3>Отправить жалобу</h3>
                <p>Жалоба на ${labelText}: <span class="time-range">${formattedStart} — ${formattedEnd}</span></p>
                <div class="kino-skip-modal-actions">
                    <button class="kino-modal-btn kino-modal-confirm">Отправить жалобу</button>
                    <button class="kino-modal-btn kino-modal-cancel">Отмена</button>
                </div>
            </div>
        `;

        ['click', 'pointerdown', 'mousedown', 'mouseup', 'keydown'].forEach((evt) => {
            overlay.addEventListener(evt, (e) => e.stopPropagation());
        });

        overlay.querySelector('.kino-modal-confirm').addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            overlay.remove();
            await onSubmit();
        });

        overlay.querySelector('.kino-modal-cancel').addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            overlay.remove();
        });

        playerElement.appendChild(overlay);
    }

    function showConfirmationModal(playerElement, startTime, endTime, isOutro, onConfirm) {
        if (document.querySelector('.kino-skip-modal-overlay')) return;
        const overlay = document.createElement('div');
        overlay.className = 'kino-skip-modal-overlay';
        const duration = (endTime - startTime).toFixed(1);
        const totalSeconds = parseFloat(duration);

        let durationText;

        if (totalSeconds >= 60) {
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = (totalSeconds % 60).toFixed(1);

            if (hours > 0) {
                durationText = `(${hours} ч ${minutes} мин ${seconds} сек)`;
            } else {
                durationText = `(${minutes} мин ${seconds} сек)`;
            }
        } else {
            durationText = `(${duration} сек)`;
        }
        const formattedStart = formatTime(startTime);
        const formattedEnd = formatTime(endTime);
        const labelText = isOutro ? 'титры' : 'заставку';
        overlay.innerHTML = `
            <div class="kino-skip-modal">
                <h3>Сохранить ${labelText}?</h3>
                <p>Интервал: <span class="time-range">${formattedStart} — ${formattedEnd}</span> ${durationText}</p>
                <div class="kino-skip-modal-actions">
                    <button class="kino-modal-btn kino-modal-confirm">Отправить</button>
                    <button class="kino-modal-btn kino-modal-cancel">Отмена</button>
                </div>
            </div>
        `;
        ['click', 'pointerdown', 'mousedown', 'mouseup', 'keydown'].forEach((evt) => {
            overlay.addEventListener(evt, (e) => e.stopPropagation());
        });
        overlay.querySelector('.kino-modal-confirm').addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            overlay.remove();
            await onConfirm();
        });
        overlay.querySelector('.kino-modal-cancel').addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            overlay.remove();
        });
        playerElement.appendChild(overlay);
    }

    function showSettingsModal(playerElement) {
        if (document.querySelector('.kino-skip-modal-overlay')) return;
        const overlay = document.createElement('div');
        overlay.className = 'kino-skip-modal-overlay';
        overlay.innerHTML = `
            <div class="kino-skip-modal">
                <h3>Настройки Kino.watch Skipper</h3>

                <div class="kino-skip-modal-body">
                    <div class="kino-settings-section-title">Заставка (Intro)</div>
                    <div class="kino-settings-group">
                        <label for="kino-auto-skip-intro-toggle">Автопропуск заставки:</label>
                        <input type="checkbox" id="kino-auto-skip-intro-toggle" ${SETTINGS.autoSkipIntro ? 'checked' : ''}>
                    </div>
                    <div class="kino-settings-group">
                        <label for="kino-enable-intro-toggle">Пропускать Intro (Заставку):</label>
                        <input type="checkbox" id="kino-enable-intro-toggle" ${SETTINGS.enableIntro ? 'checked' : ''}>
                    </div>
                    <div class="kino-settings-group">
                        <label for="kino-enable-recap-toggle">Пропускать Recap (Ранее в сериале):</label>
                        <input type="checkbox" id="kino-enable-recap-toggle" ${SETTINGS.enableRecap ? 'checked' : ''}>
                    </div>
                    <div class="kino-settings-group">
                        <label for="kino-timer-intro-input">Таймер автопропуска (сек):</label>
                        <input type="number" id="kino-timer-intro-input" min="1" max="30" value="${SETTINGS.autoSkipTimerIntro}">
                    </div>
                    <div class="kino-settings-group">
                        <label for="kino-intro-percent-input">Показывать кнопку обрезки первые (%):</label>
                        <input type="number" id="kino-intro-percent-input" min="1" max="100" value="${SETTINGS.introHidePercent}">
                    </div>

                    <div class="kino-settings-section-title">Титры (Outro)</div>
                    <div class="kino-settings-group">
                        <label for="kino-auto-skip-outro-toggle">Автопропуск титров:</label>
                        <input type="checkbox" id="kino-auto-skip-outro-toggle" ${SETTINGS.autoSkipOutro ? 'checked' : ''}>
                    </div>
                    <div class="kino-settings-group">
                        <label for="kino-enable-outro-toggle">Пропускать Outro (Анонс/Начальные титры):</label>
                        <input type="checkbox" id="kino-enable-outro-toggle" ${SETTINGS.enableOutro ? 'checked' : ''}>
                    </div>
                    <div class="kino-settings-group">
                        <label for="kino-enable-credits-toggle">Пропускать Credits (Титры):</label>
                        <input type="checkbox" id="kino-enable-credits-toggle" ${SETTINGS.enableCredits ? 'checked' : ''}>
                    </div>
                    <div class="kino-settings-group">
                        <label for="kino-timer-outro-input">Таймер автопропуска (сек):</label>
                        <input type="number" id="kino-timer-outro-input" min="1" max="30" value="${SETTINGS.autoSkipTimerOutro}">
                    </div>
                    <div class="kino-settings-group">
                        <label for="kino-outro-percent-input">Показывать кнопку обрезки последние (%):</label>
                        <input type="number" id="kino-outro-percent-input" min="1" max="100" value="${SETTINGS.outroShowPercent}">
                    </div>

                    <div class="kino-settings-section-title">Возврат после пропуска</div>
                    <div class="kino-settings-group">
                        <label for="kino-undo-toggle">Показывать кнопку «Вернуться»:</label>
                        <input type="checkbox" id="kino-undo-toggle" ${SETTINGS.enableUndo ? 'checked' : ''}>
                    </div>
                    <div class="kino-settings-group">
                        <label for="kino-undo-timer-input">Сколько секунд показывать кнопку:</label>
                        <input type="number" id="kino-undo-timer-input" min="1" max="60" value="${SETTINGS.undoTimer}">
                    </div>

                    <div class="kino-settings-section-title">Запасной режим</div>
                    <div class="kino-settings-group">
                        <label for="kino-smart-detect-toggle">Определять по субтитрам, если базы пусты:</label>
                        <input type="checkbox" id="kino-smart-detect-toggle" ${SETTINGS.enableSmartDetect ? 'checked' : ''}>
                    </div>
                </div>

                <div class="kino-skip-modal-actions">
                    <button class="kino-modal-btn kino-modal-confirm">Сохранить</button>
                    <button class="kino-modal-btn kino-modal-cancel">Отмена</button>
                </div>
            </div>
        `;
        ['click', 'pointerdown', 'mousedown', 'mouseup', 'keydown', 'dblclick'].forEach((evt) => {
            overlay.addEventListener(evt, (e) => e.stopPropagation());
        });
        const autoSkipIntroInput = overlay.querySelector('#kino-auto-skip-intro-toggle');
        const timerIntroInput = overlay.querySelector('#kino-timer-intro-input');
        const enableIntroInput = overlay.querySelector('#kino-enable-intro-toggle');
        const enableRecapInput = overlay.querySelector('#kino-enable-recap-toggle');
        const introPercentInput = overlay.querySelector('#kino-intro-percent-input');
        const autoSkipOutroInput = overlay.querySelector('#kino-auto-skip-outro-toggle');
        const timerOutroInput = overlay.querySelector('#kino-timer-outro-input');
        const enableOutroInput = overlay.querySelector('#kino-enable-outro-toggle');
        const enableCreditsInput = overlay.querySelector('#kino-enable-credits-toggle');
        const outroPercentInput = overlay.querySelector('#kino-outro-percent-input');
        const smartDetectInput = overlay.querySelector('#kino-smart-detect-toggle');
        const undoInput = overlay.querySelector('#kino-undo-toggle');
        const undoTimerInput = overlay.querySelector('#kino-undo-timer-input');
        overlay.querySelector('.kino-modal-confirm').addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();

            SETTINGS.autoSkipIntro = autoSkipIntroInput.checked;
            SETTINGS.autoSkipTimerIntro = timerIntroInput.value;
            SETTINGS.enableIntro = enableIntroInput.checked;
            SETTINGS.enableRecap = enableRecapInput.checked;
            SETTINGS.introHidePercent = introPercentInput.value;
            SETTINGS.autoSkipOutro = autoSkipOutroInput.checked;
            SETTINGS.autoSkipTimerOutro = timerOutroInput.value;
            SETTINGS.enableOutro = enableOutroInput.checked;
            SETTINGS.enableCredits = enableCreditsInput.checked;
            SETTINGS.outroShowPercent = outroPercentInput.value;
            SETTINGS.enableSmartDetect = smartDetectInput.checked;
            SETTINGS.enableUndo = undoInput.checked;
            SETTINGS.undoTimer = undoTimerInput.value;
            updateMarkBtnsVisibility(playerElement);
            showToast(playerElement, 'Настройки сохранены!', 'success');
            overlay.remove();
        });
        overlay.querySelector('.kino-modal-cancel').addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            overlay.remove();
        });
        playerElement.appendChild(overlay);
    }

    function createUI(playerElement) {
        const playerBottom = playerElement.querySelector('.player-bottom');
        if (!playerBottom) return;
        if (playerBottom.querySelector('.kino-skip-controls')) return;
        if (playerElement.querySelector('.kino-skip-floating')) return;

        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'kino-skip-controls';

        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'kino-btn-expandable kino-settings-btn';
        settingsBtn.innerHTML = `<span class="btn-icon">⚙</span><span class="btn-text">Настройки</span>`;

        // 1. Создаем кнопку "Жалоба"
        const reportBtn = document.createElement('button');
        reportBtn.className = 'kino-btn-expandable kino-report-btn';
        reportBtn.style.display = 'none'; // Показывается только когда активен сегмент
        reportBtn.innerHTML = `<span class="btn-icon">⚠</span><span class="btn-text">Жалоба</span>`;

        const stepBackBtn = document.createElement('button');
        stepBackBtn.className = 'kino-btn-expandable kino-step-btn kino-step-btn-back';
        stepBackBtn.style.display = 'none';
        stepBackBtn.title = 'Назад на 1 сек';
        stepBackBtn.innerHTML = `<span class="btn-icon">-1s</span>`;

        const markIntroBtn = document.createElement('button');
        markIntroBtn.className = 'kino-btn-expandable kino-mark-intro-btn';
        markIntroBtn.style.display = 'none';
        markIntroBtn.innerHTML = `<span class="btn-icon">✂</span><span class="btn-text">Обрезать заставку</span>`;

        const markOutroBtn = document.createElement('button');
        markOutroBtn.className = 'kino-btn-expandable kino-mark-outro-btn';
        markOutroBtn.style.display = 'none';
        markOutroBtn.innerHTML = `<span class="btn-icon">✂</span><span class="btn-text">Обрезать титры</span>`;

        const stepForwardBtn = document.createElement('button');
        stepForwardBtn.className = 'kino-btn-expandable kino-step-btn kino-step-btn-forward';
        stepForwardBtn.style.display = 'none';
        stepForwardBtn.title = 'Вперед на 1 сек';
        stepForwardBtn.innerHTML = `<span class="btn-icon">+1s</span>`;

        const skipBtn = document.createElement('button');
        skipBtn.className = 'kino-btn-expandable kino-skip-btn';
        skipBtn.style.display = 'none';
        skipBtn.innerHTML = `
            <div class="kino-skip-progress-fill"></div>
            <span class="btn-icon">⏭</span>
            <span class="btn-text" id="kino-skip-btn-label">Пропустить заставку</span>
        `;

        const cancelAutoSkipBtn = document.createElement('button');
        cancelAutoSkipBtn.className = 'kino-btn-expandable kino-cancel-autoskip-btn';
        cancelAutoSkipBtn.style.display = 'none';
        cancelAutoSkipBtn.innerHTML = `<span class="btn-icon">✘</span><span class="btn-text">Отменить пропуск</span>`;

        // 2. Вставляем reportBtn сразу после settingsBtn
        controlsContainer.appendChild(settingsBtn);
        controlsContainer.appendChild(stepBackBtn);
        controlsContainer.appendChild(markIntroBtn);
        controlsContainer.appendChild(markOutroBtn);
        controlsContainer.appendChild(stepForwardBtn);
        const undoBtn = document.createElement('button');
        undoBtn.className = 'kino-btn-expandable kino-undo-btn';
        undoBtn.style.display = 'none';
        undoBtn.innerHTML = `
            <div class="kino-undo-fill"></div>
            <span class="btn-icon">↶</span>
            <span class="btn-text">Вернуться</span>
        `;
        const undoFill = undoBtn.querySelector('.kino-undo-fill');

        playerBottom.prepend(controlsContainer);

        // Кнопки пропуска живут вне панели управления и видны всегда
        const floating = document.createElement('div');
        floating.className = 'kino-skip-floating';
        ['pointerup', 'pointerdown', 'dblclick'].forEach((evt) => {
            floating.addEventListener(evt, (e) => e.stopPropagation());
        });
        floating.appendChild(reportBtn);
        floating.appendChild(cancelAutoSkipBtn);
        floating.appendChild(skipBtn);
        floating.appendChild(undoBtn);
        playerElement.appendChild(floating);

        // Адаптивное положение: над панелью, пока она видна, и вниз, когда она скрыта
        const isShown = (el) => {
            let opacity = 1;
            for (let n = el; n && n !== playerElement; n = n.parentElement) {
                const cs = getComputedStyle(n);
                if (cs.display === 'none' || cs.visibility === 'hidden') return false;
                opacity *= parseFloat(cs.opacity);
            }
            return opacity > 0.5;
        };

        // Окрашивание сегментов (заставка/титры) на полосе прогресса
        const segMarkers = {};
        const renderSegmentMarkers = () => {
            const track = playerElement.querySelector('.vds-slider-track-container .track');
            const parent = track && track.parentElement;
            const nativeVideo = playerElement.querySelector('video');
            let dur = nativeVideo && isFinite(nativeVideo.duration) ? nativeVideo.duration : 0;
            if (!dur && isFinite(playerElement.duration)) dur = playerElement.duration;

            ['intro', 'outro'].forEach((type) => {
                const seg = type === 'intro' ? currentIntro : currentOutro;
                let el = segMarkers[type];
                const tw = track ? track.offsetWidth : 0;
                if (!parent || !seg || !(dur > 0) || !(tw > 0)) {
                    if (el && el.style.display !== 'none') el.style.display = 'none';
                    return;
                }
                const start = Math.max(0, seg.start_time);
                const end = Math.min(dur, isFinite(seg.end_time) ? seg.end_time : dur);
                if (!(end > start)) {
                    if (el && el.style.display !== 'none') el.style.display = 'none';
                    return;
                }
                if (!el || !el.isConnected) {
                    el = document.createElement('div');
                    el.className = 'kino-seg-marker';
                    segMarkers[type] = el;
                    parent.appendChild(el);
                }
                const left = track.offsetLeft + (start / dur) * tw;
                const width = ((end - start) / dur) * tw;
                const key = [left.toFixed(1), width.toFixed(1), track.offsetTop, track.offsetHeight].join('|');
                if (el.dataset.key === key && el.style.display === 'block') return;
                el.dataset.key = key;
                el.style.cssText = [
                    'position:absolute',
                    `left:${left}px`,
                    `width:${width}px`,
                    `top:${track.offsetTop}px`,
                    `height:${track.offsetHeight}px`,
                    'background:rgba(224,138,0,0.9)',
                    `border-radius:${getComputedStyle(track).borderRadius || '0'}`,
                    'pointer-events:none',
                    'z-index:2',
                    'display:block'
                ].join(';');
            });
        };
        renderMarkersHook = renderSegmentMarkers;

        const markBtns = [markIntroBtn, markOutroBtn, stepBackBtn, stepForwardBtn];
        const isMarkRowBusy = () => markBtns.some((b) => b.style.display && b.style.display !== 'none');

        const layoutFloating = () => {
            renderSegmentMarkers();
            const pRect = playerElement.getBoundingClientRect();
            const bRect = playerBottom.getBoundingClientRect();
            const shown = isShown(playerBottom) && bRect.height > 0 && bRect.top < pRect.bottom - 1;
            let offset = 16;
            if (shown) {
                const cRect = controlsContainer.getBoundingClientRect();
                const fHeight = floating.offsetHeight || 32;
                if (cRect.height > 0 && isMarkRowBusy()) {
                    // в ряду настроек показаны кнопки обрезки или ±1s: встаём над ними
                    offset = Math.max(16, pRect.bottom - cRect.top + 8);
                } else if (cRect.height > 0) {
                    // центр плавающей группы совпадает с центром ряда кнопки настроек
                    const centerFromBottom = pRect.bottom - (cRect.top + cRect.height / 2);
                    offset = Math.max(16, centerFromBottom - fHeight / 2);
                } else {
                    offset = Math.max(16, pRect.bottom - bRect.top + 8);
                }
            }
            floating.style.bottom = `${Math.round(offset)}px`;
        };

        // после события подстраиваемся ещё ~0.6 с, пока идут анимации плеера
        let kickUntil = 0;
        let kicking = false;
        const kickLayout = () => {
            kickUntil = performance.now() + 600;
            if (kicking) return;
            kicking = true;
            const step = () => {
                layoutFloating();
                if (performance.now() < kickUntil) requestAnimationFrame(step);
                else kicking = false;
            };
            requestAnimationFrame(step);
        };

        ['pointerdown', 'pointerup', 'pointermove', 'touchstart', 'keydown', 'transitionend', 'fullscreenchange', 'webkitfullscreenchange']
            .forEach((evt) => playerElement.addEventListener(evt, kickLayout, { passive: true }));
        window.addEventListener('resize', kickLayout);
        window.addEventListener('orientationchange', kickLayout);
        document.addEventListener('fullscreenchange', kickLayout);

        const attrObserver = new MutationObserver(kickLayout);
        [playerElement, playerBottom, playerBottom.parentElement].forEach((el) => {
            if (el) attrObserver.observe(el, { attributes: true });
        });
        // кнопки обрезки/±1s появляются и исчезают: пересчитать положение группы
        let lastMarkRowBusy = null;
        const markRowObserver = new MutationObserver(() => {
            const busy = isMarkRowBusy();
            if (busy !== lastMarkRowBusy) {
                lastMarkRowBusy = busy;
                kickLayout();
            }
        });
        markRowObserver.observe(controlsContainer, { attributes: true, subtree: true, attributeFilter: ['style'] });
        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(kickLayout);
            ro.observe(playerElement);
            ro.observe(playerBottom);
        }
        kickLayout();

        const progressFill = skipBtn.querySelector('.kino-skip-progress-fill');
        let currentActiveSkipSegment = null;

        // --- окно «Вернуться» после пропуска ---
        let undoState = null; // { type, seg, fromTime, mediaId, at, timer }

        const hideUndoUi = () => {
            undoBtn.style.display = 'none';
            undoFill.style.transition = 'none';
            undoFill.style.width = '0%';
        };

        // Окно закрылось без возврата: сегмент подтверждён, сегменты из субтитров уходят в базу
        const finalizeUndoWindow = () => {
            const st = undoState;
            if (!st) return;
            clearTimeout(st.timer);
            undoState = null;
            hideUndoUi();
            if (st.seg.api_source === 'subs' && !st.seg.rejected) {
                submitSmartSegment(st.type, st.seg, st.mediaId, playerElement);
            }
        };

        // Пользователь вернулся (кнопкой или перемоткой): сегмент не подтверждён, в базу не пишем
        const rejectUndoWindow = (doSeek) => {
            const st = undoState;
            if (!st) return;
            clearTimeout(st.timer);
            undoState = null;
            hideUndoUi();
            if (st.seg.api_source === 'subs') {
                st.seg.rejected = true;
                smartCacheReject(st.mediaId, st.type);
            }
            isAutoSkipCancelled = true; // не пропускать этот сегмент повторно автоматически
            if (doSeek) seekTo(playerElement, st.fromTime);
        };

        const discardUndoWindow = () => {
            if (!undoState) return;
            clearTimeout(undoState.timer);
            undoState = null;
            hideUndoUi();
        };

        const beginUndoWindow = (type, seg, fromTime) => {
            if (undoState) finalizeUndoWindow();
            const ms = SETTINGS.undoTimer * 1000;
            undoState = {
                type,
                seg,
                fromTime,
                mediaId: currentMediaId,
                at: performance.now(),
                timer: setTimeout(finalizeUndoWindow, ms)
            };
            if (SETTINGS.enableUndo) {
                undoBtn.style.display = 'inline-flex';
                undoFill.style.transition = 'none';
                undoFill.style.width = '100%';
                void undoFill.offsetWidth;
                undoFill.style.transition = `width ${ms}ms linear`;
                undoFill.style.width = '0%';
            }
        };

        const executeSkip = () => {
            const type = currentActiveSkipSegment;
            const seg = type === 'intro' ? currentIntro : type === 'outro' ? currentOutro : null;
            if (seg) {
                const fromTime = getCurrentVideoTime(playerElement);
                seekTo(playerElement, seg.end_time);
                beginUndoWindow(type, seg, fromTime);
            }
            skipBtn.style.display = 'none';
            cancelAutoSkipBtn.style.display = 'none';
            reportBtn.style.display = 'none';
        };

        undoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            rejectUndoWindow(true);
        });

        const resetMarkingState = () => {
            markStartTime = null;
            activeMarkingType = null;
            markIntroBtn.querySelector('.btn-text').innerText = 'Обрезать заставку';
            markIntroBtn.classList.remove('marking', 'force-expanded');
            markOutroBtn.querySelector('.btn-text').innerText = 'Обрезать титры';
            markOutroBtn.classList.remove('marking', 'force-expanded');
            settingsBtn.style.display = 'inline-flex';
            updateMarkBtnsVisibility(playerElement);
        };

        const handleMarkClick = (type) => {
            const currentTime = getCurrentVideoTime(playerElement);
            const targetBtn = type === 'intro' ? markIntroBtn : markOutroBtn;
            const otherBtn = type === 'intro' ? markOutroBtn : markIntroBtn;
            const btnTextSpan = targetBtn.querySelector('.btn-text');

            if (activeMarkingType === null) {
                activeMarkingType = type;
                markStartTime = currentTime;
                btnTextSpan.innerText = `Конец (${formatTime(markStartTime)})`;
                targetBtn.classList.add('marking', 'force-expanded');
                otherBtn.style.display = 'none';
                settingsBtn.style.display = 'none';
                reportBtn.style.display = 'none';
                updateMarkBtnsVisibility(playerElement);
            } else {
                const markEndTime = currentTime;
                const duration = markEndTime - markStartTime;
                const isOutro = activeMarkingType === 'outro';
                const labelText = isOutro ? 'Титры' : 'Заставка';
                const maxDuration = isOutro ? 900 : 300;
                const maxMinsText = isOutro ? '15 минут' : '5 минут';

                if (markEndTime > markStartTime && duration >= 10 && duration <= maxDuration) {
                    if (!currentMediaId) currentMediaId = getActiveMediaId();
                    if (!currentUsername) currentUsername = getWatchlistUsername();
                    const startToSave = markStartTime;
                    const endToSave = markEndTime;
                    const currentPageUrl = window.location.href;

                    showConfirmationModal(playerElement, startToSave, endToSave, isOutro, async () => {
                        try {
                            const payload = {
                                media_id: String(currentMediaId),
                                page_url: currentPageUrl,
                                username: String(currentUsername),
                                start_time: Number(startToSave.toFixed(2)),
                                end_time: Number(endToSave.toFixed(2))
                            };
                            if (isOutro) {
                                payload.outro = true;
                            }
                            const res = await sendApiRequest(API_URL, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(payload)
                            });
                            showToast(playerElement, res.message || 'Ваша отметка принята!', 'success');
                            if (isOutro) canSubmitOutro = false;
                            else canSubmitIntro = false;
                            updateMarkBtnsVisibility(playerElement);
                        } catch (err) {
                            showToast(playerElement, err.message, 'error');
                            if (isOutro) canSubmitOutro = false;
                            else canSubmitIntro = false;
                            updateMarkBtnsVisibility(playerElement);
                        }
                    });
                } else if (duration < 10) {
                    showToast(playerElement, `${labelText} не может быть короче 10 секунд!`, 'error');
                } else if (duration > maxDuration) {
                    showToast(playerElement, `${labelText} не может быть длиннее ${maxMinsText}!`, 'error');
                } else {
                    showToast(playerElement, 'Некорректный интервал!', 'error');
                }
                resetMarkingState();
            }
        };

        const stepTime = (delta) => {
            const currentTime = getCurrentVideoTime(playerElement);
            seekTo(playerElement, currentTime + delta);
        };

        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            showSettingsModal(playerElement);
        });

        // 3. Обработчик клика на кнопку «Жалоба»
        reportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (!currentActiveSkipSegment) return;

            const isOutro = currentActiveSkipSegment === 'outro';
            const activeSegment = isOutro ? currentOutro : currentIntro;
            if (!activeSegment) return;

            showReportModal(
                playerElement,
                activeSegment.start_time,
                activeSegment.end_time,
                isOutro,
                async () => {
                    try {
                        if (!currentMediaId) currentMediaId = getActiveMediaId();
                        const res = await sendApiRequest(API_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'report',
                                media_id: String(currentMediaId),
                                page_url: window.location.href,
                                type: isOutro ? 'outro' : 'intro',
                                start_time: Number(activeSegment.start_time),
                                end_time: Number(activeSegment.end_time),
                                api_source: activeSegment.api_source || 'kw.xlnt.ovh'
                            })
                        });
                        showToast(playerElement, res.message || 'Жалоба успешно отправлена!', 'success');
                    } catch (err) {
                        showToast(playerElement, err.message || 'Ошибка при отправке жалобы', 'error');
                    }
                }
            );
        });

        stepBackBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            stepTime(-1);
        });

        stepForwardBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            stepTime(1);
        });

        skipBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            executeSkip();
        });

        cancelAutoSkipBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            isAutoSkipCancelled = true;
            cancelAutoSkipBtn.style.display = 'none';
            if (progressFill) progressFill.style.width = '0%';
        });

        markIntroBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            handleMarkClick('intro');
        });

        markOutroBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            handleMarkClick('outro');
        });

        let lastTick = 0;
        const timeHandler = () => {
            const now = performance.now();
            if (now - lastTick < 50) return; // отсекаем дубль от двух источников событий
            lastTick = now;
            layoutFloating();
            if (undoState) {
                if (undoState.mediaId !== currentMediaId) {
                    discardUndoWindow();
                } else if (now - undoState.at > 1500) {
                    // ручная перемотка обратно в сегмент тоже считается возвратом
                    const ct = getCurrentVideoTime(playerElement);
                    if (ct >= undoState.seg.start_time && ct < undoState.seg.end_time - 1) {
                        rejectUndoWindow(false);
                    }
                }
            }
            updateMarkBtnsVisibility(playerElement);
            const currentTime = getCurrentVideoTime(playerElement);
            const isInIntro = currentIntro && currentTime >= currentIntro.start_time && currentTime < currentIntro.end_time;
            const isInOutro = currentOutro && currentTime >= currentOutro.start_time && currentTime < currentOutro.end_time;

            if (isInIntro || isInOutro) {
                currentActiveSkipSegment = isInIntro ? 'intro' : 'outro';

                // Кнопка "Жалоба" в сегменте (для сегментов, найденных по субтитрам, не нужна)
                const segForReport = isInIntro ? currentIntro : currentOutro;
                const reportDisplay = segForReport.api_source === 'subs' ? 'none' : 'inline-flex';
                if (reportBtn.style.display !== reportDisplay) {
                    reportBtn.style.display = reportDisplay;
                }

                const skipLabel = playerElement.querySelector('#kino-skip-btn-label');
                if (skipLabel) {
                    skipLabel.innerText = isInIntro ? 'Пропустить заставку' : 'Пропустить титры';
                }
                if (skipBtn.style.display !== 'inline-flex') {
                    skipBtn.style.display = 'inline-flex';
                }
                const activeSegment = isInIntro ? currentIntro : currentOutro;
                const elapsedSegmentTime = currentTime - activeSegment.start_time;

                const isAutoSkipEnabled = isInIntro ? SETTINGS.autoSkipIntro : SETTINGS.autoSkipOutro;
                const timerLimit = isInIntro ? SETTINGS.autoSkipTimerIntro : SETTINGS.autoSkipTimerOutro;

                if (isAutoSkipEnabled && !isAutoSkipCancelled) {
                    const percentage = Math.min(Math.max((elapsedSegmentTime / timerLimit) * 100, 0), 100);
                    if (progressFill) progressFill.style.width = `${percentage}%`;
                    if (cancelAutoSkipBtn.style.display !== 'inline-flex') {
                        cancelAutoSkipBtn.style.display = 'inline-flex';
                    }
                    if (elapsedSegmentTime >= timerLimit) {
                        executeSkip();
                    }
                } else {
                    if (progressFill) progressFill.style.width = '0%';
                    if (cancelAutoSkipBtn.style.display !== 'none') {
                        cancelAutoSkipBtn.style.display = 'none';
                    }
                }
            } else {
                currentActiveSkipSegment = null;
                // Скрываем кнопку "Жалоба" за пределами сегментов
                if (reportBtn.style.display !== 'none') reportBtn.style.display = 'none';
                if (skipBtn.style.display !== 'none') skipBtn.style.display = 'none';
                if (cancelAutoSkipBtn.style.display !== 'none') cancelAutoSkipBtn.style.display = 'none';
                if (progressFill) progressFill.style.width = '0%';
                isAutoSkipCancelled = false;
            }
        };

        playerElement.addEventListener('time-update', timeHandler);
        const nativeVideo = playerElement.querySelector('video');
        if (nativeVideo) nativeVideo.addEventListener('timeupdate', timeHandler);
    }

    function init() {
        const player = document.querySelector('media-player');
        if (!player) return;
        const newMediaId = getActiveMediaId();
        if (newMediaId && newMediaId !== currentMediaId) {
            currentMediaId = newMediaId;
            currentIntro = null;
            currentOutro = null;
            canSubmitIntro = false;
            canSubmitOutro = false;
            fetchSegments(currentMediaId, player);
        }
        createUI(player);
    }

    let initScheduled = false;
    const observer = new MutationObserver(() => {
        if (initScheduled) return;
        initScheduled = true;
        requestAnimationFrame(() => {
            initScheduled = false;
            init();
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    init();
})();