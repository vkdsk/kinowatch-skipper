// ==UserScript==
// @name         Kino.watch Skipper
// @namespace    https://github.com/vkdsk/kinowatch-skipper
// @version      1.19.1
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

    // --- Настройки (с хранением через GM_getValue / GM_setValue) ---
    const SETTINGS = {
        get autoSkip() {
            return GM_getValue('autoSkip', true);
        },
        set autoSkip(val) {
            GM_setValue('autoSkip', Boolean(val));
        },
        get autoSkipTimer() {
            return GM_getValue('autoSkipTimer', 7);
        },
        set autoSkipTimer(val) {
            GM_setValue('autoSkipTimer', Math.max(1, parseInt(val, 10) || 7));
        }
    };

    // --- Стили ---
    GM_addStyle(`
        /* Контейнер для кнопок внутри .player-bottom */
        .player-bottom .kino-skip-controls {
            display: inline-flex !important;
            flex-direction: row !important;
            align-items: center !important;
            gap: 6px !important;
            margin-left: auto !important; /* Прижимает блок к правому краю */
            height: 100% !important;
            box-sizing: border-box;
            flex-shrink: 0;
        }

        /* Общие стили для кнопок */
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

        /* Разворачивание текста для свернутых кнопок */
        .kino-btn-expandable:hover .btn-text,
        .kino-btn-expandable.force-expanded .btn-text {
            max-width: 220px;
            opacity: 1;
            margin-left: 6px;
        }

        /* Кнопка пропуска заставки - ВСЕГДА РАЗВЕРНУТА */
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

        /* Слой заполнения прогресса */
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

        /* Стили для кнопки отмены автопропуска */
        .kino-cancel-autoskip-btn {
            background: #6c757d;
        }
        .kino-cancel-autoskip-btn:hover {
            background: #5a6268;
            transform: scale(1.03);
        }

        /* Стили для кнопки отметки */
        .kino-mark-btn {
            background: #007bff;
        }
        .kino-mark-btn:hover {
            background: #0069d9;
            transform: scale(1.03);
        }

        .kino-mark-btn.marking {
            background: #dc3545;
            animation: pulse 1.5s infinite;
        }

        /* Стили для кнопок тонкой перемотки */
        .kino-step-btn {
            background: #5c636a;
            padding: 6px 8px;
        }
        .kino-step-btn:hover {
            background: #464c52;
            transform: scale(1.05);
        }

        /* Стили для кнопки настроек */
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
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2147483647 !important;
            backdrop-filter: blur(6px);
            pointer-events: auto;
        }

        .kino-skip-modal {
            background: #1e1e24;
            color: #fff;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
            max-width: 380px;
            width: 90%;
            text-align: center;
            font-family: system-ui, -apple-system, sans-serif;
            z-index: 2147483647 !important;
        }

        .kino-skip-modal h3 { margin: 0 0 12px 0; font-size: 18px; color: #fff; }
        .kino-skip-modal p { margin: 0 0 18px 0; font-size: 14px; color: #ccc; line-height: 1.4; }
        .kino-skip-modal .time-range { font-weight: bold; color: #00ff88; font-size: 16px; }

        .kino-skip-modal-actions { display: flex; gap: 12px; justify-content: center; margin-top: 16px; }

        .kino-modal-btn {
            padding: 10px 20px;
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

        /* Элементы формы настроек */
        .kino-settings-group {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 14px;
            text-align: left;
            font-size: 14px;
        }
        .kino-settings-group label {
            color: #ddd;
            cursor: pointer;
        }
        .kino-settings-group input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: #28a745;
        }
        .kino-settings-group input[type="number"] {
            width: 70px;
            padding: 6px 8px;
            border-radius: 6px;
            border: 1px solid #4a4d52;
            background: #2b2b36;
            color: #fff;
            font-size: 14px;
            text-align: center;
        }

        /* Уведомления (Toasts) */
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

        .kino-toast-notification.success {
            background: rgba(40, 167, 69, 0.95);
        }

        .kino-toast-notification.error {
            background: rgba(220, 53, 69, 0.95);
        }

        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(-10px); }
            15% { opacity: 1; transform: translateY(0); }
            85% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-10px); }
        }
    `);

    // --- Логика ---
    const API_URL = 'https://kw.xlnt.ovh/index.php';

    let currentMediaId = null;
    let currentUsername = null;
    let currentIntro = null;
    let canSubmit = false;
    let markStartTime = null;
    let isAutoSkipCancelled = false; // Флаг отмены автопропуска пользователем

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

    async function fetchIntro(mediaId, playerElement) {
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

            canSubmit = Boolean(data.can_submit);

            if (data.start_time !== undefined && data.end_time !== undefined) {
                currentIntro = data;
            } else {
                currentIntro = null;
            }
        } catch (err) {
            currentIntro = null;
            if (err.data && typeof err.data === 'object' && err.data.can_submit !== undefined) {
                canSubmit = Boolean(err.data.can_submit);
            } else {
                canSubmit = false;
            }
        }

        updateMarkBtnVisibility(playerElement);
    }

    function updateMarkBtnVisibility(playerElement) {
        if (!playerElement) return;
        const markBtn = playerElement.querySelector('.kino-mark-btn');
        if (markBtn) {
            markBtn.style.display = canSubmit ? 'inline-flex' : 'none';
        }
    }

    function seekTo(playerElement, seconds) {
        const targetTime = Math.max(0, seconds);
        const nativeVideo = playerElement.querySelector('video');
        if (nativeVideo) nativeVideo.currentTime = targetTime;
        else playerElement.currentTime = targetTime;
    }

    function showConfirmationModal(playerElement, startTime, endTime, onConfirm) {
        if (document.querySelector('.kino-skip-modal-overlay')) return;

        const overlay = document.createElement('div');
        overlay.className = 'kino-skip-modal-overlay';

        const duration = (endTime - startTime).toFixed(1);
        const formattedStart = formatTime(startTime);
        const formattedEnd = formatTime(endTime);

        overlay.innerHTML = `
            <div class="kino-skip-modal">
                <h3>Сохранить заставку?</h3>
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

        playerElement.appendChild(overlay);
    }

    function showSettingsModal(playerElement) {
        if (document.querySelector('.kino-skip-modal-overlay')) return;

        const overlay = document.createElement('div');
        overlay.className = 'kino-skip-modal-overlay';

        overlay.innerHTML = `
            <div class="kino-skip-modal">
                <h3>Настройки пропуска</h3>
                
                <div class="kino-settings-group">
                    <label for="kino-auto-skip-toggle">Автоматический пропуск:</label>
                    <input type="checkbox" id="kino-auto-skip-toggle" ${SETTINGS.autoSkip ? 'checked' : ''}>
                </div>

                <div class="kino-settings-group">
                    <label for="kino-timer-input">Таймер пропуска (сек):</label>
                    <input type="number" id="kino-timer-input" min="1" max="30" value="${SETTINGS.autoSkipTimer}">
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

        const autoSkipInput = overlay.querySelector('#kino-auto-skip-toggle');
        const timerInput = overlay.querySelector('#kino-timer-input');

        ['dblclick', 'click', 'mousedown'].forEach((evt) => {
            timerInput.addEventListener(evt, (e) => {
                e.stopPropagation();
            });
        });

        overlay.querySelector('.kino-modal-confirm').addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();

            SETTINGS.autoSkip = autoSkipInput.checked;
            SETTINGS.autoSkipTimer = timerInput.value;

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

        // Если контейнер кнопок уже вставлен, выходим
        if (playerBottom.querySelector('.kino-skip-controls')) return;

        // Общий контейнер для выравнивания в одну строку справа
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'kino-skip-controls';

        // Кнопка настройки
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'kino-btn-expandable kino-settings-btn';
        settingsBtn.innerHTML = `<span class="btn-icon">⚙</span><span class="btn-text">Настройки</span>`;

        // Кнопка перемотки -1 сек
        const stepBackBtn = document.createElement('button');
        stepBackBtn.className = 'kino-btn-expandable kino-step-btn';
        stepBackBtn.style.display = 'none';
        stepBackBtn.title = 'Назад на 1 сек';
        stepBackBtn.innerHTML = `<span class="btn-icon">-1s</span>`;

        // Кнопка отметки заставки
        const markBtn = document.createElement('button');
        markBtn.className = 'kino-btn-expandable kino-mark-btn';
        markBtn.style.display = canSubmit ? 'inline-flex' : 'none';
        markBtn.innerHTML = `<span class="btn-icon">✂</span><span class="btn-text">Ообрезать заставку</span>`;

        // Кнопка перемотки +1 сек
        const stepForwardBtn = document.createElement('button');
        stepForwardBtn.className = 'kino-btn-expandable kino-step-btn';
        stepForwardBtn.style.display = 'none';
        stepForwardBtn.title = 'Вперед на 1 сек';
        stepForwardBtn.innerHTML = `<span class="btn-icon">+1s</span>`;

        // Кнопка пропуска заставки
        const skipBtn = document.createElement('button');
        skipBtn.className = 'kino-btn-expandable kino-skip-btn';
        skipBtn.style.display = 'none';
        skipBtn.innerHTML = `
            <div class="kino-skip-progress-fill"></div>
            <span class="btn-icon">⏭</span>
            <span class="btn-text">Пропустить заставку</span>
        `;

        // Кнопка отмены автопропуска
        const cancelAutoSkipBtn = document.createElement('button');
        cancelAutoSkipBtn.className = 'kino-btn-expandable kino-cancel-autoskip-btn';
        cancelAutoSkipBtn.style.display = 'none';
        cancelAutoSkipBtn.innerHTML = `<span class="btn-icon">✘</span><span class="btn-text">Отменить пропуск</span>`;

        // Добавляем кнопки внутрь контейнера
        controlsContainer.appendChild(settingsBtn);
        controlsContainer.appendChild(stepBackBtn);
        controlsContainer.appendChild(markBtn);
        controlsContainer.appendChild(stepForwardBtn);
        controlsContainer.appendChild(cancelAutoSkipBtn);
        controlsContainer.appendChild(skipBtn);

        // Вставляем контейнер В НАЧАЛО .player-bottom
        playerBottom.prepend(controlsContainer);

        const progressFill = skipBtn.querySelector('.kino-skip-progress-fill');

        const executeSkip = () => {
            if (currentIntro) {
                seekTo(playerElement, currentIntro.end_time);
                skipBtn.style.display = 'none';
                cancelAutoSkipBtn.style.display = 'none';
            }
        };

        const resetMarkingState = () => {
            markStartTime = null;
            const markTextSpan = markBtn.querySelector('.btn-text');
            markTextSpan.innerText = 'Ообрезать заставку';
            markBtn.classList.remove('marking', 'force-expanded');
            
            // Восстанавливаем кнопки: показываем настройки, скрываем перемотку
            settingsBtn.style.display = 'inline-flex';
            stepBackBtn.style.display = 'none';
            stepForwardBtn.style.display = 'none';
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

        markBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();

            const currentTime = getCurrentVideoTime(playerElement);
            const markTextSpan = markBtn.querySelector('.btn-text');

            if (markStartTime === null) {
                // Старт обрезки
                markStartTime = currentTime;
                markTextSpan.innerText = `Конец (старт: ${formatTime(markStartTime)})`;
                markBtn.classList.add('marking', 'force-expanded');

                // Переключаем кнопки UI
                settingsBtn.style.display = 'none';
                stepBackBtn.style.display = 'inline-flex';
                stepForwardBtn.style.display = 'inline-flex';
            } else {
                // Завершение обрезки
                const markEndTime = currentTime;
                const duration = markEndTime - markStartTime;

                if (markEndTime > markStartTime && duration >= 10 && duration <= 300) {
                    if (!currentMediaId) currentMediaId = getActiveMediaId();
                    if (!currentUsername) currentUsername = getWatchlistUsername();

                    const startToSave = markStartTime;
                    const endToSave = markEndTime;
                    const currentPageUrl = window.location.href;

                    showConfirmationModal(playerElement, startToSave, endToSave, async () => {
                        try {
                            const res = await sendApiRequest(API_URL, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    media_id: String(currentMediaId),
                                    page_url: currentPageUrl,
                                    username: String(currentUsername),
                                    start_time: Number(startToSave.toFixed(2)),
                                    end_time: Number(endToSave.toFixed(2))
                                })
                            });

                            showToast(playerElement, res.message || 'Ваша отметка принята!', 'success');

                            canSubmit = false;
                            updateMarkBtnVisibility(playerElement);

                        } catch (err) {
                            showToast(playerElement, err.message, 'error');
                            canSubmit = false;
                            updateMarkBtnVisibility(playerElement);
                        }
                    });

                } else if (duration < 10) {
                    showToast(playerElement, 'Заставка не может быть короче 10 секунд!', 'error');
                } else if (duration > 300) {
                    showToast(playerElement, 'Заставка не может быть длиннее 5 минут!', 'error');
                } else {
                    showToast(playerElement, 'Некорректный интервал!', 'error');
                }

                resetMarkingState();
            }
        });

        const timeHandler = () => {
            const currentTime = getCurrentVideoTime(playerElement);
            const isInIntro = currentIntro && currentTime >= currentIntro.start_time && currentTime < currentIntro.end_time;

            if (isInIntro) {
                if (skipBtn.style.display !== 'inline-flex') {
                    skipBtn.style.display = 'inline-flex';
                }

                const elapsedIntroTime = currentTime - currentIntro.start_time;
                const isAutoSkipEnabled = SETTINGS.autoSkip;
                const timerLimit = SETTINGS.autoSkipTimer;

                if (isAutoSkipEnabled && !isAutoSkipCancelled) {
                    const percentage = Math.min(Math.max((elapsedIntroTime / timerLimit) * 100, 0), 100);
                    if (progressFill) {
                        progressFill.style.width = `${percentage}%`;
                    }

                    if (cancelAutoSkipBtn.style.display !== 'inline-flex') {
                        cancelAutoSkipBtn.style.display = 'inline-flex';
                    }

                    if (elapsedIntroTime >= timerLimit) {
                        executeSkip();
                    }
                } else {
                    if (progressFill) {
                        progressFill.style.width = '0%';
                    }
                    if (cancelAutoSkipBtn.style.display !== 'none') {
                        cancelAutoSkipBtn.style.display = 'none';
                    }
                }
            } else {
                if (skipBtn.style.display !== 'none') {
                    skipBtn.style.display = 'none';
                }
                if (cancelAutoSkipBtn.style.display !== 'none') {
                    cancelAutoSkipBtn.style.display = 'none';
                }
                if (progressFill) {
                    progressFill.style.width = '0%';
                }
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
            canSubmit = false;
            fetchIntro(currentMediaId, player);
        }

        createUI(player);
    }

    const observer = new MutationObserver(() => init());
    observer.observe(document.body, { childList: true, subtree: true });

    init();
})();