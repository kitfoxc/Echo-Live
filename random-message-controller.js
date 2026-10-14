/* Echo-Live random marquee message controller.
 * Presets are intentionally loaded only from message.js.
 */
(function () {
    'use strict';

    const $ = (selector) => document.querySelector(selector);
    const listEl = $('#random-message-list');
    const statusEl = $('#random-message-status');
    const countdownEl = $('#random-message-countdown');
    const lastEl = $('#random-message-last');
    const inputHintEl = $('#random-message-input-hint');
    if (!listEl || !statusEl) return;

    let timer = 0;
    let countdownTimer = 0;
    let resumeTimer = 0;
    let active = false;
    let paused = false;
    let dueAt = 0;
    let bag = [];
    let lastMessage = '';

    function setStatus(message) { statusEl.textContent = message; }
    function setInputHint(message) { if (inputHintEl) inputHintEl.textContent = '输入提示：' + message; }
    // Rich-text messages may be strings, Echo paragraph objects, or arrays of
    // formatted segments returned by EchoLiveTools.formattingCodeToMessage().
    // Keep the original structure for sendData(); only flatten it for previews
    // and timing calculations.
    function messageText(message) {
        if (typeof message === 'string') return message;
        if (Array.isArray(message)) return message.map(messageText).join('');
        if (message && typeof message === 'object') {
            if (typeof message.text === 'string') return message.text;
            if (typeof message.typewrite === 'string') return message.typewrite;
        }
        return '';
    }
    function normalizePreset(message) {
        if (typeof message === 'string') return message.trim() ? message : null;
        if (Array.isArray(message) || (message && typeof message === 'object')) {
            return messageText(message).trim() ? message : null;
        }
        return null;
    }
    function presets() {
        return Array.isArray(window.EchoLiveRandomMessages)
            ? window.EchoLiveRandomMessages.map(normalizePreset).filter(message => message !== null)
            : [];
    }
    function renderPresets() {
        const count = presets().length;
        listEl.textContent = '';
        const summary = document.createElement('p');
        summary.className = 'random-message-count';
        summary.textContent = count > 0
            ? '已从 message.js 加载 ' + count + ' 条消息。'
            : 'message.js 中尚未配置消息（0 条）。';
        listEl.appendChild(summary);
        if (!all.length) {
            const empty = document.createElement('p');
            empty.className = 'random-message-empty';
            empty.textContent = 'message.js 中尚未配置消息。';
            listEl.appendChild(empty);
            return;
        }
        const list = document.createElement('ol');
        list.className = 'random-message-items';
        all.forEach(message => {
            const item = document.createElement('li');
            item.textContent = messageText(message);
            list.appendChild(item);
        });
        listEl.appendChild(list);
    }
    function shuffle(items) {
        const a = items.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
    function nextMessage() {
        const all = presets();
        if (!all.length) throw new Error('消息库为空，请在 message.js 中至少配置一条消息。');
        if (!bag.length) {
            bag = shuffle(all);
            if (bag.length > 1 && messageText(bag[0]) === lastMessage) [bag[0], bag[1]] = [bag[1], bag[0]];
        }
        return bag.pop();
    }
    function sendMessage(message) {
        if (typeof config !== 'undefined' && !config.echolive.broadcast.enable) {
            setStatus('未发送：请先在配置中启用 Echo-Live 广播。');
            return false;
        }
        if (typeof elb === 'undefined' || !elb || typeof elb.sendData !== 'function') {
            setStatus('编辑器广播尚未初始化，请稍后重试。');
            return false;
        }
        let payload = message;
        // 自动消息支持 Echo-Live 快速格式化代码（例如 @b粗体@b）。
        // 如果解析器不可用，则保留原文，避免随机消息发送失败。
        if (typeof EchoLiveTools !== 'undefined' && typeof EchoLiveTools.formattingCodeToMessage === 'function') {
            try {
                payload = EchoLiveTools.formattingCodeToMessage(message);
            } catch (error) {
                console.warn('[Echo-Live Random Messages] Formatting code parse failed; sending raw text.', error);
                payload = message;
            }
        }
        elb.sendData({ username: '', messages: [{ message: payload }] });
        lastMessage = message;
        if (lastEl) lastEl.textContent = message;
        elb.sendData({ username: '', messages: [{ message }] });
        lastMessage = messageText(message);
        if (lastEl) lastEl.textContent = lastMessage;
        return true;
    }
    function sendRandom() {
        try {
            const message = nextMessage();
            if (sendMessage(message)) {
                setStatus('已发送随机消息。');
                if (active && !paused) scheduleNext();
            }
        } catch (error) {
            setStatus(error.message || String(error));
        }
    }
    function delayForMessage(message) {
        const text = messageText(message);
        const base = Math.max(5, Number($('#random-message-interval').value) || 180) * 1000;
        const jitterValue = Number($('#random-message-jitter').value);
        const jitter = Math.max(0, Math.min(100, Number.isFinite(jitterValue) ? jitterValue : 20)) / 100;
        const charValue = Number($('#random-message-char-delay').value);
        const perChar = Math.max(0, Number.isFinite(charValue) ? charValue : 35);
        const randomFactor = 1 + (Math.random() * 2 - 1) * jitter;
        return Math.max(1000, Math.round(base * randomFactor + [...text].length * perChar));
    }
    function clearSchedule() {
        clearTimeout(timer);
        clearInterval(countdownTimer);
        timer = 0;
        countdownTimer = 0;
        dueAt = 0;
        if (countdownEl) countdownEl.textContent = paused ? '已暂停' : '未安排';
    }
    function scheduleNext() {
        clearSchedule();
        if (!active || paused) return;
        let scheduledMessage;
        try {
            scheduledMessage = nextMessage();
        } catch (error) {
            setStatus(error.message || String(error));
            return;
        }
        const delay = delayForMessage(scheduledMessage);
        dueAt = Date.now() + delay;
        if (countdownEl) countdownEl.textContent = Math.ceil(delay / 1000) + ' 秒';
        countdownTimer = setInterval(() => {
            const left = Math.max(0, dueAt - Date.now());
            if (countdownEl) countdownEl.textContent = Math.ceil(left / 1000) + ' 秒';
        }, 250);
        timer = setTimeout(() => {
            timer = 0;
            clearInterval(countdownTimer);
            countdownTimer = 0;
            if (!active || paused) return;
            if (sendMessage(scheduledMessage)) setStatus('已发送随机消息。');
            scheduleNext();
        }, delay);
    }
    function promptVisible() {
        const panel = $('#commander-input-panel');
        return !!panel && !panel.classList.contains('hide') && panel.getClientRects().length > 0;
    }
    function manualInputActive() {
        const focused = document.activeElement;
        return promptVisible()
            || (focused && (focused.matches('#output-content') || focused.matches('#commander-input')));
    }
    function pauseForManualInput() {
        if (!active) return;
        paused = true;
        clearSchedule();
        clearTimeout(resumeTimer);
        if (countdownEl) countdownEl.textContent = '已暂停';
        setStatus('检测到编辑器输入提示/手动输入，自动发送已暂停。');
        setInputHint('正在输入，自动发送已暂停');
        const secondsValue = Number($('#random-message-pause-delay').value);
        const seconds = Math.max(1, Number.isFinite(secondsValue) && secondsValue > 0 ? secondsValue : 5);
        resumeTimer = setTimeout(() => {
            if (!active) return;
            // 以输入提示面板和当前焦点为准；仍处于输入状态时继续暂停。
            if (manualInputActive()) {
                pauseForManualInput();
                return;
            }
            paused = false;
            setStatus('输入提示已关闭，自动发送已恢复。');
            setInputHint('当前空闲，自动发送已恢复');
            scheduleNext();
        }, seconds * 1000);
    }
    function refreshInputState() {
        if (manualInputActive()) {
            setInputHint('正在输入');
            pauseForManualInput();
        } else {
            setInputHint('当前空闲');
        }
        if (!manualInputActive() && active && paused) {
            clearTimeout(resumeTimer);
            const secondsValue = Number($('#random-message-pause-delay').value);
            const seconds = Math.max(1, Number.isFinite(secondsValue) && secondsValue > 0 ? secondsValue : 5);
            resumeTimer = setTimeout(() => {
                if (!active) return;
                if (manualInputActive()) return;
                paused = false;
                setStatus('输入提示已关闭，自动发送已恢复。');
                setInputHint('当前空闲，自动发送已恢复');
                scheduleNext();
            }, seconds * 1000);
        }
    }

    $('#random-message-send').addEventListener('click', sendRandom);
    $('#random-message-start').addEventListener('click', () => {
        if (active) return;
        active = true;
        paused = false;
        setStatus('自动发送已启动。');
        refreshInputState();
        if (!paused) scheduleNext();
    });
    $('#random-message-stop').addEventListener('click', () => {
        active = false;
        paused = false;
        clearSchedule();
        clearTimeout(resumeTimer);
        if (countdownEl) countdownEl.textContent = '未启动';
        setStatus('自动发送已停止。');
    });

    renderPresets();
    document.addEventListener('focusin', refreshInputState);
    document.addEventListener('focusout', () => setTimeout(refreshInputState, 0));
    document.addEventListener('input', refreshInputState);
    document.addEventListener('keydown', refreshInputState);
    document.addEventListener('keyup', refreshInputState);
    const promptPanel = $('#commander-input-panel');
    if (promptPanel && typeof MutationObserver !== 'undefined') {
        new MutationObserver(refreshInputState).observe(promptPanel, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
    }
    window.addEventListener('beforeunload', () => {
        clearSchedule();
        clearTimeout(resumeTimer);
    });
    setStatus('已从 message.js 载入 ' + presets().length + ' 条消息。');
})();
