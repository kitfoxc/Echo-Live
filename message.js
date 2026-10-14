/*
 * Echo-Live random marquee presets.
 * Message payloads use Echo-Live native JSON-style structures; no quick-format
 * codes are parsed. A preset may be a string, a paragraph object, a paragraph
 * array, or a named queue object with a "messages" array.
 *
 * Single rich message:
 *   { "text": "Hello", "style": { "bold": true, "color": "#66CCFF" } }
 *
 * Multi-paragraph message (one bubble/message):
 *   [ { "text": "First paragraph" }, { "text": " second paragraph" } ]
 *
 * Ordered queue (several messages sent in sequence):
 *   { "name": "Welcome queue", "messages": [
 *       { "message": "First message" },
 *       { "message": [ { "text": "Bold", "style": { "bold": true } } ] }
 *   ] }
 *
 * Echo-Live paragraph fields such as class, style, data, typewrite, ruby,
 * pause, speed, event and custom data are passed through without conversion.
 */
window.EchoLiveRandomMessages = [
    "欢迎来到直播间！",
    {
        "name": "欢迎消息（富文本）",
        "text": "感谢你的关注与支持！",
        "style": {
            "bold": true,
            "color": "#66CCFF"
        }
    },
    [
        {
            "text": "今天也请多多关照。",
            "style": {
                "bold": true
            }
        },
        {
            "text": " 祝大家心情愉快！",
            "style": {
                "italic": true
            }
        }
    ],
    {
        "name": "欢迎队列示例",
        "messages": [
            {
                "message": "欢迎来到直播间！"
            },
            {
                "message": [
                    {
                        "text": "感谢大家的陪伴。",
                        "style": {
                            "bold": true,
                            "color": "#66CCFF"
                        }
                    }
                ]
            }
        ]
    }
];
