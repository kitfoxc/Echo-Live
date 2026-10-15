/* Echo-Live random marquee presets. Native JSON message structures. */
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
    },
    {
        "message": [
            {
                "text": "我们所经历的每个平凡的日常，",
                "pause": 40
            },
            {
                "text": "也许就是连续发生的奇迹。"
            }
        ]
    },
    {
        "message": {
            "text": "你说话带空格。",
            "style": {
                "letterSpacing": "half-width"
            }
        }
    },
    {
        "username": "",
        "messages": [
            {
                "message": "这是一段连续的消息队列"
            },
            {
                "message": "抽取到此消息队列时"
            },
            {
                "message": "会依次展示队列中的消息"
            },
            {
                "message": "直到队列结束"
            }
        ]
    },
    {
        "username": "",
        "messages": [
            {
                "message": {
                    "text": "怎么还是那么冷冷呀~",
                    "class": "echo-text-jitter"
                }
            }
        ]
    },
    {
        "username": "",
        "message": {
            "text": "注释",
            "ruby": "zhù shì"
        }
    },
    {
        "username": "",
        "message": {
            "text": "Only my RAILGUN can shoot it.",
            "style": {
                "stretch": "condensed"
            }
        }
    },
    {
        "username": "",
        "messages": [
            {
                "message": [
                    "这里没有格式。\n",
                    {
                        "text": "这里有粗体。\n",
                        "style": {
                            "bold": true
                        }
                    },
                    {
                        "text": "这里有粗体和斜体。\n",
                        "style": {
                            "bold": true,
                            "italic": true
                        }
                    },
                    "这里没有格式。\n",
                    {
                        "text": "这里是蓝色。\n",
                        "style": {
                            "color": "#66ccff"
                        }
                    },
                    "这里是中等字号。\n",
                    {
                        "text": "大一点。",
                        "style": {
                            "size": "large"
                        }
                    },
                    {
                        "text": "再大一点。",
                        "style": {
                            "size": "extra-large"
                        }
                    },
                    {
                        "text": "小一点。",
                        "style": {
                            "size": "middle"
                        }
                    }
                ]
            }
        ]
    }
];
