/* ============================================================
 * Echo
 * Github: https://github.com/sheep-realms/Echo
 * License: GNU General Public License 3.0
 * ============================================================
 */
class Echo {
    constructor($sel = '') {
        this.message            = '';
        this.messageBuffer      = [];
        this.messageList        = [];
        this.queueAdvanceScheduled = false;
        this.dbChrBuffer        = '';
        this.timer              = 0;
        this.pauseTimer         = 0;
        this.printAnimationDisabled = false;
        this.groupCount         = 0;
        this.groupStack         = [];
        this.printSpeed         = 30;
        this.printSpeedStart    = 30;
        this.printSpeedChange   = 30;
        this.state              = 'stop';
        this.typewrite          = 'none';
        this.ruby               = false;
        this.filter             = {
            HTMLFormat: true
        };
        this.event              = {
            backspace:          () => {},
            clear:              () => {},
            customData:         ( data ) => {},
            customEvent:        ( event ) => {},
            customSequence:     ( sequence ) => {},
            groupEnd:           ( event = { groupId: -1, groupNow: -1 } ) => {},
            groupStart:         ( event = { groupId: -1, groupNow: -1, data: null } ) => {},
            next:               ( message ) => {},
            print:              ( char = '' ) => {},
            printEnd:           () => {},
            printStart:         () => {},
            rubyEnd:            ( ruby = '' ) => {},
            rubyStart:          ( ruby = '' ) => {},
            send:               () => {},
            sendList:           () => {},
            skip:               ( char = '' ) => {},
            stop:               () => {},
            typewriteEnd:       () => {}
        };
        this.skipOnePrintLoopChar = /[\u2014-\u2015\u2018-\u2019\u201c-\u201d\u2e80-\u9fff\uac00-\ud7ff\uf900-\ufaff\ufe10-\ufe1f\ufe30-\ufe4f\uff01-\uff60\uffe0-\uffe7\u{17000}-\u{1b2ff}\u{20000}-\u{2fa1f}\u{30000}-\u{323af}]/u;

        if ($sel != '') {
            this.rd($sel);
        }
    }

    rd($sel) {
        if (typeof jQuery != 'undefined') { 
            this.on('print', function(chr = '') {
                $($sel).append(chr);
            });
            this.on('clear', function() {
                $($sel).text('');
            });
            this.on('printEnd', function() {
                $($sel).html($($sel).html());
            });
        } else { 
            console.error('[Echo] Rapid Deployment Error: jQuery is not loaded.');
        }
    }

    backspace() {
        // 触发退格事件
        this.event.backspace();
    }

    clear() {
        if (this.timer) clearInterval(this.timer);
        if (this.pauseTimer) clearTimeout(this.pauseTimer);
        this.timer = 0;
        this.pauseTimer = 0;
        this.message = '';
        this.messageBuffer = [];
        this.timer = 0;
        // 触发清空事件
        this.event.clear();
    }

    groupEnd(obj = {}) {
        let i = this.groupStack.shift();
        let n = this.groupStack[0];
        if (n == undefined) n = 0;
        let e = {
            groupId: i,
            groupNow: n
        }
        
        if (obj?.ruby != undefined) {
            this.ruby = false;
            this.event.rubyEnd(obj.ruby);
        }
        if (obj?.typewrite != undefined) {
            this.typewrite = 'ready';
        }
        if (this.printSpeedChange != this.printSpeedStart) this.speed();
        this.event.groupEnd(e);
        return e;
    }

    groupStart(obj) {
        this.groupCount++;
        this.groupStack.pop(this.groupCount);
        let e = {
            groupId: this.groupCount,
            groupNow: this.groupCount,
            data: obj
        }
        if (obj?.typewrite) {
            this.typewrite = 'input';
        }
        if (obj?.printSpeed) {
            this.speed(obj.printSpeed);
        }
        if (obj?.event) {
            this.event.customEvent(obj.event);
        }
        if (obj?.data) {
            this.event.customData(obj?.data);
        }
        this.event.groupStart(e);
        if (obj?.ruby != undefined) {
            this.ruby = true;
            this.event.rubyStart(obj.ruby);
        }
        return e;
    }

    insertSequence(data = {}, afterSpace = 0, beforeSpace = 0) {
        const obj = {
            ...data,
            action: 'custom_sequence'
        }
        if (afterSpace > 0) this.messageBuffer.unshift(...Array(afterSpace).fill(''));
        this.messageBuffer.unshift(obj);
        if (beforeSpace > 0) this.messageBuffer.unshift(...Array(beforeSpace).fill(''));
    }

    messageSerialize(msg) {
        if (typeof msg == 'string') {
            return [...msg];
        } else if (typeof msg == 'object' && msg != null) {
            let dataBefore = {
                action: 'group_start',
                class: msg?.class,
                style: msg?.style,
                typewrite: msg?.typewrite,
                ruby: msg?.ruby,
                printSpeed: msg?.speed,
                event: msg?.event,
                data: msg?.data,
                visibility: msg?.visibility ?? msg?.['显隐']
            };

            let dataAfter = {
                action: 'group_end',
                typewrite: msg?.typewrite,
                ruby: msg?.ruby
            };

            let dataContent, data;
            if (msg?.visibility !== undefined || msg?.['显隐'] !== undefined) {
                // Visibility groups render their full text in one operation, then fade in.
                // Their text remains in normal layout flow while opacity is zero.
                dataContent = [{
                    action: 'visibility_content',
                    text: String(msg.text ?? '')
                }];
            } else if (msg?.typewrite == undefined) {
                dataContent = [...msg.text];
            } else {
                dataContent = [...msg.typewrite];
            }

            data = [dataBefore, ...dataContent, dataAfter];

            const visibilityValue = msg?.visibility ?? msg?.['显隐'];
            if (visibilityValue !== undefined) {
                data.push({
                    action: 'visibility_wait',
                    duration: Math.max(0, Number(visibilityValue) || 0)
                });
            }

            if (msg?.typewrite != undefined && msg?.visibility === undefined && msg?.['显隐'] === undefined) {
                data = [...data, msg.text];
            }

            if (msg?.pause) {
                data = [...data, {
                    action: 'pause',
                    duration: Math.max(0, Number(msg.pause) || 0)
                }];
            }
            
            return data;
        }
    }

    next() {
        if (this.messageList == undefined) return;
        let msg = this.messageList.shift();
        if (msg == undefined) return;
        // 触发打印下一条消息事件
        this.event.next(msg);
        return this.send(msg.message, msg?.data);
    }

    scheduleQueueAdvance(force = false, delay = 0) {
        if (this.queueAdvanceScheduled) return;
        this.queueAdvanceScheduled = true;
        setTimeout(() => {
            this.queueAdvanceScheduled = false;
            if (this.state === 'stop' && (force || this.messageList.length > 0)) {
                this.next();
            }
        }, Math.max(0, Number(delay) || 0));
    }

    on(eventName, action = function() {}) {
        if (typeof action != 'function') return;
        return this.event[eventName] = action;
    }

    print(that = this) {
        if (that.state == 'ready') {
            that.state = 'play';
            // 触发打印开始事件
            that.event.printStart();
        }

        // pause 和显隐等待都是序列屏障：完成当前段落后才继续消费后续内容。
        const waitAction = that.messageBuffer[0]?.action;
        if (waitAction === 'pause' || waitAction === 'visibility_wait') {
            const wait = that.messageBuffer.shift();
            const delay = Math.max(0, Number(wait.duration) || 0) * that.printSpeedStart;
            const fadeDuration = waitAction === 'visibility_wait' ? 280 : 0;
            clearInterval(that.timer);
            that.timer = 0;
            clearTimeout(that.pauseTimer);
            that.pauseTimer = setTimeout(() => {
                that.pauseTimer = 0;
                if (that.state !== 'stop' && that.state !== 'last') {
                    that.timer = setInterval(that.print, that.printAnimationDisabled ? 0 : that.printSpeedChange, that);
                }
            }, delay + fadeDuration);
            if (waitAction === 'visibility_wait' && delay === 0) {
                // groupEnd schedules opacity to 1; allow the CSS fade to finish before advancing.
            }
            return;
        }

        // 关闭逐字动画时，在同一个任务中输出到下一个 pause。
        // 浏览器因此可以直接排版完整段落，而不是逐字符改变气泡尺寸。
        if (that.printAnimationDisabled) {
            return that.printDisabledBatch(that);
        }

        // A visibility-marked rich-text group must be laid out in full before its fade-in.
        if (that.messageBuffer[0]?.action === 'visibility_content') {
            const item = that.messageBuffer.shift();
            let content = String(item.text ?? '');
            if (that.filter.HTMLFormat) {
                content = content.replace(/ /g, '&ensp;');
                content = content.replace(/</g, '&lt;');
                content = content.replace(/>/g, '&gt;');
            }
            that.event.print(content);
            return content;
        }

        let a;
        if (that.dbChrBuffer != '') {
            a = that.dbChrBuffer;
            that.dbChrBuffer = '';
        } else {
            if (typeof that.messageBuffer[0] == 'string') {
                a = that.messageBuffer.shift();
                // 中日韩字符及其他汉字文化圈字符跳过一回合
                if ((a.search(that.skipOnePrintLoopChar) != -1) && that.typewrite == 'none') {
                    that.dbChrBuffer = a;
                    return;
                }
            } else if (typeof that.messageBuffer[0] == 'object' && that.messageBuffer[0]?.action == 'custom_sequence') {
                that.event.customSequence(that.messageBuffer.shift());
            }
        }

        if (that.typewrite === 'ready') {
            that.typewrite = 'none';
            that.event.typewriteEnd();
        } else if (
            that.typewrite === 'input'
            && a === "'"
            && typeof that.messageBuffer[0] === 'string'
        ) {
            a += that.messageBuffer.shift();
        }

        if (that.messageBuffer[0] === '\\u200b') {
            a += that.messageBuffer.shift();
        }

        // 触发打印事件
        if (typeof a == 'string' && that.filter.HTMLFormat) {
            a = a.replace(/ /g, '&ensp;');
            a = a.replace(/</g, '&lt;');
            a = a.replace(/>/g, '&gt;');
        }
        that.event.print(a);

        function __checkMessageBufferNext() {
            while (
                typeof that.messageBuffer[0] == 'object'
                && that.messageBuffer[0]?.action !== 'custom_sequence'
                && that.messageBuffer[0]?.action !== 'pause'\n                && that.messageBuffer[0]?.action !== 'visibility_wait'
            ) {
                let obj = that.messageBuffer.shift();
                if (obj.action == 'group_start') {
                    that.groupStart(obj);
                } else if (obj.action == 'group_end') {
                    that.groupEnd(obj);
                }
            }
        }

        __checkMessageBufferNext();

        if (that.messageBuffer.length == 0 && that.dbChrBuffer == '') {
            clearInterval(that.timer);
            that.state = 'last';
        }

        if (that.state == 'last') {
            // 触发打印结束事件
            that.event.printEnd();
            that.state = 'stop';
        }

        return a;
    }

    printDisabledBatch(that = this) {
        let lastOutput;
        let safety = 0;

        while (that.messageBuffer.length > 0 && safety++ < 100000) {
            const next = that.messageBuffer[0];

            if (next && typeof next === 'object') {
                if (next.action === 'pause' || next.action === 'visibility_wait') break;
                that.messageBuffer.shift();
                if (next.action === 'custom_sequence') {
                    that.event.customSequence(next);
                } else if (next.action === 'group_start') {
                    that.groupStart(next);
                } else if (next.action === 'group_end') {
                    that.groupEnd(next);
                } else if (next.action === 'visibility_content') {
                    let content = String(next.text ?? '');
                    if (that.filter.HTMLFormat) {
                        content = content.replace(/ /g, '&ensp;');
                        content = content.replace(/</g, '&lt;');
                        content = content.replace(/>/g, '&gt;');
                    }
                    that.event.print(content);
                    lastOutput = content;
                }
                continue;
            }

            let a = that.messageBuffer.shift();
            if (typeof a !== 'string') continue;

            if (that.typewrite === 'ready') {
                that.typewrite = 'none';
                that.event.typewriteEnd();
            } else if (
                that.typewrite === 'input'
                && a === "'"
                && typeof that.messageBuffer[0] === 'string'
            ) {
                a += that.messageBuffer.shift();
            }

            if (that.messageBuffer[0] === '\\u200b') {
                a += that.messageBuffer.shift();
            }

            if (that.filter.HTMLFormat) {
                a = a.replace(/ /g, '&ensp;');
                a = a.replace(/</g, '&lt;');
                a = a.replace(/>/g, '&gt;');
            }

            that.event.print(a);
            lastOutput = a;
        }

        if (that.messageBuffer.length === 0) {
            clearInterval(that.timer);
            that.timer = 0;
            that.state = 'last';
        }

        if (that.state === 'last') {
            that.event.printEnd();
            that.state = 'stop';
        }

        return lastOutput;
    }

    send(text, data = {}) {
        this.clear();
        // 触发发送事件
        this.event.send();
        this.message = text;
        if (typeof this.message == 'string') {
            this.messageBuffer = [...text];
        } else if (typeof this.message == 'object' && this.message != null) {
            if (Array.isArray(this.message)) {
                this.message.forEach(e => {
                    this.messageBuffer = [...this.messageBuffer, ...this.messageSerialize(e)]
                });
            } else {
                this.messageBuffer = this.messageSerialize(this.message);
            }
        }

        if (data?.printSpeed) {
            this.printSpeedStart = data.printSpeed;
            this.printSpeedChange = data.printSpeed;
        } else {
            this.printSpeedStart = this.printSpeed;
            this.printSpeedChange = this.printSpeed;
        }
        if (data?.customData) this.event.customData(data.customData);
        this.state = 'ready';
        // 关闭逐字显示时仍按打印速度推进队列。live.js 会暂时隐藏正在输出的段落，
        // 并在段落结束时一次性显示，从而保留 pause 的时间间隔。
        this.timer = setInterval(this.print, this.printAnimationDisabled ? 0 : this.printSpeedStart, this);
        return this.message;
    }

    sendList(messageList) {
        if (!Array.isArray(messageList)) return;
        // 新批次追加到待播队列末尾，不能覆盖正在等待播放的消息。
        this.messageList = this.messageList.concat(messageList);
        this.event.sendList();
        // 仅在播放器空闲时启动队列；正在播放时由 printEnd 统一推进。
        if (this.state === 'stop' && this.messageBuffer.length === 0) {
            this.scheduleQueueAdvance();
        }
        return this.messageList;
    }

    skip() {
        clearInterval(this.timer);
        clearTimeout(this.pauseTimer);
        this.timer = 0;
        this.pauseTimer = 0;
        let txt = this.dbChrBuffer + this.messageBuffer.join('');
        this.messageBuffer = [];
        // 触发跳过事件
        this.event.skip(txt);
        // 触发打印事件
        this.event.print(txt);
        // 触发打印结束事件
        this.event.printEnd();
        this.state = 'stop';
        return txt;
    }

    speed(value = undefined) {
        if (this.state == 'stop') return;
        if (value != undefined) {
            this.printSpeedChange = value;
        } else {
            this.printSpeedChange = this.printSpeedStart;
        }
        clearInterval(this.timer);
        this.timer = setInterval(this.print, this.printAnimationDisabled ? 0 : this.printSpeedChange, this);
        return this.printSpeedChange;
    }

    stop() {
        clearInterval(this.timer);
        clearTimeout(this.pauseTimer);
        this.timer = 0;
        this.pauseTimer = 0;
        this.state = 'stop';
        this.messageBuffer = [];
        this.dbChrBuffer = '';
        this.groupCount = 0;
        this.groupStack = [];
        this.event.stop();
    }

    typewriteEnd() {
        // 触发打字结束事件
        this.event.typewriteEnd();
    }
}