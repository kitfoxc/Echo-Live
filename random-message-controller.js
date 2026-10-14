/* Echo-Live random marquee message controller. */
(function () {
    'use strict';

    const STORAGE_KEY = 'echolive.randomMessages.v1';
    const $ = (selector) => document.querySelector(selector);
    const listEl = $('#random-message-list');
    const statusEl = $('#random-message-status');
    const countdownEl = $('#random-message-countdown');
    const lastEl = $('#random-message-last');
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
    function presets() {
        return listEl.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
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
        if (!all.length) throw new Error('消息库为空，请至少添加一条消息。');
        if (!bag.length) {
            bag = shuffle(all);
            if (bag.length > 1 && bag[0] === lastMessage) [bag[0], bag[1]] = [bag[1], bag[0]];
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
        // 空用户名让随机消息默认不显示说话人。
        elb.sendData({ username: '', messages: [{ message }] });
        lastMessage = message;
        if (lastEl) lastEl.textContent = message;
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
        const base = Math.max(5, Number($('#random-message-interval').value) || 180) * 1000;
        const jitter = Math.max(0, Math.min(100, Number($('#random-message-jitter').value) || 0)) / 100;
        const randomFactor = 1 + (Math.random() * 2 - 1) * jitter;
        const perChar = Math.max(0, Number($('#random-message-char-delay').value) || 0);
        return Math.max(1000, Math.round(base * randomFactor + [...message].length * perChar));
    }
    function clearSchedule() {
        clearTimeout(timer);
        clearInterval(countdownTimer);
        timer = 0;
        countdownTimer = 0;
        dueAt = 0;
        if (countdownEl) countdownEl.textContent = '已暂停';
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
    function start() {
        if (active) return;
        active = true;
        paused = false;
        setStatus('自动发送已启动。');
        scheduleNext();
    }
    function stop() {
        active = false;
        paused = false;
        clearSchedule();
        clearTimeout(resumeTimer);
        if (countdownEl) countdownEl.textContent = '未启动';
        setStatus('自动发送已停止。');
    }
    function pauseForManualInput() {
        if (!active) return;
        paused = true;
        clearSchedule();
        clearTimeout(resumeTimer);
        setStatus('检测到手动输入，自动发送已暂停。');
        const seconds = Math.max(1, Number($('#random-message-pause-delay').value) || 5);
        resumeTimer = setTimeout(() => {
            if (!active) return;
            paused = false;
            setStatus('手动输入结束，自动发送已恢复。');
            scheduleNext();
        }, seconds * 1000);
    }

    $('#random-message-save').addEventListener('click', () => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(presets()));
            bag = [];
            setStatus('消息库已保存到当前浏览器。');
        } catch (_) {
            setStatus('保存失败：浏览器可能禁止了本地存储。');
        }
    });
    $('#random-message-send').addEventListener('click', sendRandom);
    $('#random-message-start').addEventListener('click', start);
    $('#random-message-stop').addEventListener('click', stop);
    listEl.addEventListener('input', () => { bag = []; });

    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const messages = saved ? JSON.parse(saved) : window.EchoLiveRandomMessages;
        listEl.value = Array.isArray(messages) ? messages.join('\n') : '';
    } catch (_) {
        listEl.value = (window.EchoLiveRandomMessages || []).join('\n');
    }

    // 仅监听主编辑器的输入区域，不监听随机消息设置区，避免配置操作误暂停。
    document.addEventListener('focusin', (event) => {
        if (event.target && (event.target.matches('#output-content') || event.target.matches('#commander-input'))) {
            pauseForManualInput();
        }
    });
    document.addEventListener('input', (event) => {
        if (event.target && (event.target.matches('#output-content') || event.target.matches('#commander-input'))) {
            pauseForManualInput();
        }
    });
    window.addEventListener('beforeunload', () => {
        clearSchedule();
        clearTimeout(resumeTimer);
    });
    setStatus('消息库已载入，共 ' + presets().length + ' 条。');
})();
