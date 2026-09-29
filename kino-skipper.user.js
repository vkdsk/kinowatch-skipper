// ==UserScript==
// @name         Kino.watch Skipper
// @namespace    https://github.com/vkdsk/kinowatch-skipper
// @version      1.19.5
// @description  Пропуск заставок и титров в плеере kino.watch
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
// @run-at       document-idle
// @require      https://cdnjs.cloudflare.com/ajax/libs/blueimp-md5/2.19.0/js/md5.min.js
// ==/UserScript==
(function() {
    'use strict';
    const SETTINGS = {
        get autoSkipIntro() {
            return GM_getValue('autoSkipIntro', true);
        },
        set autoSkipIntro(val) {
            GM_setValue('autoSkipIntro', Boolean(val));
        },
        get autoSkipTimerIntro() {
            return GM_getValue('autoSkipTimerIntro', 7);
        },
        set autoSkipTimerIntro(val) {
            GM_setValue('autoSkipTimerIntro', Math.max(1, parseInt(val, 10) || 7));
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
            return GM_getValue('autoSkipTimerOutro', 7);
        },
        set autoSkipTimerOutro(val) {
            GM_setValue('autoSkipTimerOutro', Math.max(1, parseInt(val, 10) || 7));
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
            margin-left: auto !important;
            height: 100% !important;
            box-sizing: border-box;
            flex-shrink: 0;
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
        }
        .kino-settings-btn:hover {
            background: #343a40;
            transform: scale(1.03);
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.6; }
            100% { opacity: 1; }
        }
        .kino-skip-modal-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2147483647 !important;
            backdrop-filter: blur(6px);
            pointer-events: auto;
            box-sizing: border-box;
        }
        .kino-skip-modal {
            background: #1e1e24;
            color: #fff;
            padding: 20px 24px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
            max-width: 440px;
            width: 92%;
            text-align: center;
            font-family: system-ui, -apple-system, sans-serif;
            z-index: 2147483647 !important;
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
        .kino-skip-modal-actions { display: flex; gap: 12px; justify-content: center; margin-top: 16px; }
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
    function showToast(playerElement, message, type = 'success') {
        if (!playerElement) return;
        const toast = document.createElement('div');
        toast.className = `kino-toast-notification ${type}`;
        toast.innerText = message;
        playerElement.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    }
    function sendApiRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: options.method || 'GET',
                url: url,
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
                onerror: () => reject({ status: 0, message: 'Сетевая ошибка' })
            });
        });
    }
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
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
    async function fetchSegments(mediaId, playerElement) {
        isAutoSkipCancelled = false;
        if (!currentUsername) {
            currentUsername = getWatchlistUsername();
        }
        try {
            let requestUrl = `${API_URL}?media_id=${encodeURIComponent(mediaId)}`;
            if (currentUsername) {
                requestUrl += `&username=${encodeURIComponent(currentUsername)}`;
            }
            const data = await sendApiRequest(requestUrl);
            canSubmitIntro = Boolean(data.can_submit_intro);
            canSubmitOutro = Boolean(data.can_submit_outro);
            currentIntro = data.intro || null;
            currentOutro = data.outro || null;
        } catch (err) {
            currentIntro = null;
            currentOutro = null;
            canSubmitIntro = false;
            canSubmitOutro = false;
        }
        updateMarkBtnsVisibility(playerElement);
    }
    function updateMarkBtnsVisibility(playerElement) {
        if (!playerElement) return;
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
    function showConfirmationModal(playerElement, startTime, endTime, isOutro, onConfirm) {
        if (document.querySelector('.kino-skip-modal-overlay')) return;
        const overlay = document.createElement('div');
        overlay.className = 'kino-skip-modal-overlay';
        const duration = (endTime - startTime).toFixed(1);
        const formattedStart = formatTime(startTime);
        const formattedEnd = formatTime(endTime);
        const labelText = isOutro ? 'титры' : 'заставку';
        overlay.innerHTML = `
            <div class="kino-skip-modal">
                <h3>Сохранить ${labelText}?</h3>
                <p>Интервал: <span class="time-range">${formattedStart} — ${formattedEnd}</span> (${duration} сек)</p>
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
        document.body.appendChild(overlay);
    }
    function showSettingsModal(playerElement) {
        if (document.querySelector('.kino-skip-modal-overlay')) return;
        const overlay = document.createElement('div');
        overlay.className = 'kino-skip-modal-overlay';
        overlay.innerHTML = `
            <div class="kino-skip-modal">
                <h3>Настройки Kino.watch Skipper</h3>
                
                <div class="kino-settings-section-title">Заставка (Intro)</div>
                <div class="kino-settings-group">
                    <label for="kino-auto-skip-intro-toggle">Автопропуск заставки:</label>
                    <input type="checkbox" id="kino-auto-skip-intro-toggle" ${SETTINGS.autoSkipIntro ? 'checked' : ''}>
                </div>
                <div class="kino-settings-group">
                    <label for="kino-timer-intro-input">Таймер автопропуска (сек):</label>
                    <input type="number" id="kino-timer-intro-input" min="1" max="30" value="${SETTINGS.autoSkipTimerIntro}">
                </div>
                <div class="kino-settings-group">
                    <label for="kino-intro-percent-input">Показывать кнопку «Обрезать заставку» первые (%):</label>
                    <input type="number" id="kino-intro-percent-input" min="1" max="100" value="${SETTINGS.introHidePercent}">
                </div>
                <div class="kino-settings-section-title">Титры (Outro)</div>
                <div class="kino-settings-group">
                    <label for="kino-auto-skip-outro-toggle">Автопропуск титров:</label>
                    <input type="checkbox" id="kino-auto-skip-outro-toggle" ${SETTINGS.autoSkipOutro ? 'checked' : ''}>
                </div>
                <div class="kino-settings-group">
                    <label for="kino-timer-outro-input">Таймер автопропуска (сек):</label>
                    <input type="number" id="kino-timer-outro-input" min="1" max="30" value="${SETTINGS.autoSkipTimerOutro}">
                </div>
                <div class="kino-settings-group">
                    <label for="kino-outro-percent-input">Показывать кнопку «Обрезать титры» последние (%):</label>
                    <input type="number" id="kino-outro-percent-input" min="1" max="100" value="${SETTINGS.outroShowPercent}">
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
        const introPercentInput = overlay.querySelector('#kino-intro-percent-input');
        const autoSkipOutroInput = overlay.querySelector('#kino-auto-skip-outro-toggle');
        const timerOutroInput = overlay.querySelector('#kino-timer-outro-input');
        const outroPercentInput = overlay.querySelector('#kino-outro-percent-input');
        overlay.querySelector('.kino-modal-confirm').addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            SETTINGS.autoSkipIntro = autoSkipIntroInput.checked;
            SETTINGS.autoSkipTimerIntro = timerIntroInput.value;
            SETTINGS.introHidePercent = introPercentInput.value;
            SETTINGS.autoSkipOutro = autoSkipOutroInput.checked;
            SETTINGS.autoSkipTimerOutro = timerOutroInput.value;
            SETTINGS.outroShowPercent = outroPercentInput.value;
            updateMarkBtnsVisibility(playerElement);
            showToast(playerElement, 'Настройки сохранены!', 'success');
            overlay.remove();
        });
        overlay.querySelector('.kino-modal-cancel').addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            overlay.remove();
        });
        document.body.appendChild(overlay);
    }
    function createUI(playerElement) {
        const playerBottom = playerElement.querySelector('.player-bottom');
        if (!playerBottom) return;
        if (playerBottom.querySelector('.kino-skip-controls')) return;
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'kino-skip-controls';
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'kino-btn-expandable kino-settings-btn';
        settingsBtn.innerHTML = `<span class="btn-icon">⚙</span><span class="btn-text">Настройки</span>`;
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
        controlsContainer.appendChild(settingsBtn);
        controlsContainer.appendChild(stepBackBtn);
        controlsContainer.appendChild(markIntroBtn);
        controlsContainer.appendChild(markOutroBtn);
        controlsContainer.appendChild(stepForwardBtn);
        controlsContainer.appendChild(cancelAutoSkipBtn);
        controlsContainer.appendChild(skipBtn);
        playerBottom.prepend(controlsContainer);
        const progressFill = skipBtn.querySelector('.kino-skip-progress-fill');
        let currentActiveSkipSegment = null; // 'intro' или 'outro'
        const executeSkip = () => {
            if (currentActiveSkipSegment === 'intro' && currentIntro) {
                seekTo(playerElement, currentIntro.end_time);
            } else if (currentActiveSkipSegment === 'outro' && currentOutro) {
                seekTo(playerElement, currentOutro.end_time);
            }
            skipBtn.style.display = 'none';
            cancelAutoSkipBtn.style.display = 'none';
        };
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
        const timeHandler = () => {
            updateMarkBtnsVisibility(playerElement);
            const currentTime = getCurrentVideoTime(playerElement);
            const isInIntro = currentIntro && currentTime >= currentIntro.start_time && currentTime < currentIntro.end_time;
            const isInOutro = currentOutro && currentTime >= currentOutro.start_time && currentTime < currentOutro.end_time;
            if (isInIntro || isInOutro) {
                currentActiveSkipSegment = isInIntro ? 'intro' : 'outro';
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
            canSubmitIntro = false;
            canSubmitOutro = false;
            fetchSegments(currentMediaId, player);
        }
        createUI(player);
    }
    const observer = new MutationObserver(() => init());
    observer.observe(document.body, { childList: true, subtree: true });
    init();
})();
