const LudoGame = (() => {
    /** @type {{ [key: string]: string }} */
    const COLOR_HEX = {
        red: '#e63946',
        green: '#2a9d8f',
        yellow: '#f4a261',
        blue: '#0096c7'
    };

    /** @type {{ [key: string]: string }} */
    const COLOR_LABEL = {
        red: 'Red',
        green: 'Green',
        yellow: 'Yellow',
        blue: 'Blue'
    };

    /** @type {{ [key: string]: number }} */
    const START_INDEX = { red: 0, green: 13, yellow: 26, blue: 39 };
    const SAFE_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

    /** @type {{ [key: string]: number[][] }} */
    const YARD_SLOTS = {
        green: [[1.6, 1.6], [1.6, 3.4], [3.4, 1.6], [3.4, 3.4]],
        yellow: [[1.6, 10.6], [1.6, 12.4], [3.4, 10.6], [3.4, 12.4]],
        blue: [[10.6, 10.6], [10.6, 12.4], [12.4, 10.6], [12.4, 12.4]],
        red: [[10.6, 1.6], [10.6, 3.4], [12.4, 1.6], [12.4, 3.4]]
    };

    const TRACK_52 = [
        [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
        [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
        [7, 0], [6, 0],
        [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
        [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
        [0, 7], [0, 8],
        [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
        [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
        [7, 14], [8, 14],
        [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
        [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
        [14, 7], [14, 6]
    ];

    /** @type {{ [key: string]: number[][] }} */
    const STRETCH_MAP = {
        red: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
        green: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
        yellow: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
        blue: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]]
    };

    /** @type {{ [key: number]: number[] }} */
    const PIP_POSITIONS = {
        1: [4],
        2: [2, 6],
        3: [2, 4, 6],
        4: [0, 2, 6, 8],
        5: [0, 2, 4, 6, 8],
        6: [0, 2, 3, 5, 6, 8]
    };

    /**
     * @typedef {{ id: string, color: string, progress: number }} LudoToken
     */

    let phase = 'setup';
    let mode = 'bot';
    let playerCount = 4;
    /** @type {{ [key: string]: boolean }} */
    let botColors = { red: false, green: true, yellow: true, blue: true };
    /** @type {string[]} */
    let activeColors = ['red', 'green', 'yellow', 'blue'];
    let turnIndex = 0;
    /** @type {{ [key: string]: number }} */
    let perColorDice = { red: 6, green: 6, yellow: 6, blue: 6 };
    let diceRolled = false;
    let rollingAnim = false;
    let winnerColor = '';
    let statusText = 'Roll 6 to bring token out!';
    /** @type {LudoToken[]} */
    let tokens = [];
    /** @type {number | null} */
    let botTimer = null;

    function clearBotTimer() {
        if (botTimer !== null) {
            clearTimeout(botTimer);
            botTimer = null;
        }
    }

    /** @param {string} winColor */
    function renderLudoWinOverlay(winColor) {
        const hex = COLOR_HEX[winColor] || '#ffd93d';
        const label = (COLOR_LABEL[winColor] || 'PLAYER').toUpperCase();
        const colors = ['#ff4757', '#ffa502', '#2ed573', '#1e90ff', '#ff6b81', '#ffd93d'];

        const sparkles = Array.from({ length: 34 }, (_, i) => {
            const left = ((i * 29) % 96) + 2;
            const delay = ((i * 0.17) % 1.4).toFixed(2);
            const dur = (1.5 + (i % 5) * 0.32).toFixed(2);
            const col = colors[i % colors.length];
            const size = 9 + (i % 4) * 3;
            return (
                '<span style="position:fixed;top:-22px;left:' +
                left +
                '%;width:' +
                size +
                'px;height:' +
                size +
                'px;border-radius:' +
                (i % 2 === 0 ? '50%' : '3px') +
                ';background:' +
                col +
                ';box-shadow:0 0 12px ' +
                col +
                ';animation:ludoSparkDrop ' +
                dur +
                's linear ' +
                delay +
                's infinite;pointer-events:none;z-index:9998;"></span>'
            );
        }).join('');

        return (
            '<style>@keyframes ludoSparkDrop{0%{transform:translateY(-22px) rotate(0deg) scale(0.85);opacity:1;}85%{opacity:1;}100%{transform:translateY(105vh) rotate(540deg) scale(1.25);opacity:0;}}@keyframes ludoChampPop{0%{transform:scale(0.6);opacity:0;}70%{transform:scale(1.06);opacity:1;}100%{transform:scale(1);opacity:1;}}</style>' +
            sparkles +
            '<div style="position:fixed;inset:0;background:rgba(14,17,29,0.8);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:18px;z-index:9999;">' +
            '<div style="width:100%;max-width:350px;background:linear-gradient(155deg,#1d2133,#11131e);border:4px solid ' +
            hex +
            ';border-radius:24px;padding:24px 18px;text-align:center;color:#fff;box-shadow:0 0 38px ' +
            hex +
            ', 0 10px 0 #000;animation:ludoChampPop 0.4s cubic-bezier(0.22,1,0.36,1) forwards;">' +
            '<div style="font-size:3.3rem;line-height:1;margin-bottom:8px;">👑🎉</div>' +
            '<div style="font-size:1.55rem;font-weight:900;letter-spacing:0.6px;color:#ffd93d;text-shadow:0 3px 0 #000;">' +
            label +
            ' WINS LUDO!</div>' +
            '<div style="font-size:0.95rem;font-weight:700;color:#e2e8f0;margin:8px 0 18px;">All 4 tokens reached home!</div>' +
            '<button type="button" onclick="LudoGame.startMatch()" style="width:100%;padding:13px;border-radius:14px;border:3px solid #1e1e24;box-shadow:0 4px 0 #1e1e24;background:linear-gradient(90deg,#2ed573,#00b894);color:#fff;font-family:inherit;font-size:1.05rem;font-weight:800;cursor:pointer;">🎲 PLAY AGAIN</button>' +
            '</div></div>'
        );
    }

    /** @param {number} count */
    function getActiveColorsForCount(count) {
        if (count === 2) return ['red', 'yellow'];
        if (count === 3) return ['red', 'green', 'yellow'];
        return ['red', 'green', 'yellow', 'blue'];
    }

    /** @param {string} color @param {number} progress */
    function getTokenCoord(color, progress) {
        if (progress < 0 || progress >= 56) return null;
        if (progress <= 50) {
            const absIdx = (START_INDEX[color] + progress) % 52;
            return TRACK_52[absIdx];
        }
        return STRETCH_MAP[color][progress - 51];
    }

    /** @param {LudoToken} token @param {number} roll */
    function canTokenMove(token, roll) {
        if (token.progress === 56) return false;
        if (token.progress === -1) return roll === 6;
        return token.progress + roll <= 56;
    }

    /** @param {string} color @param {number} roll */
    function getMovableTokens(color, roll) {
        return tokens.filter((t) => t.color === color && canTokenMove(t, roll));
    }

    /** @param {LudoToken[]} movable @param {number} roll */
    function chooseSmartBotToken(movable, roll) {
        let bestToken = movable[0];
        let bestScore = -9999;

        for (let i = 0; i < movable.length; i++) {
            const t = movable[i];
            let score = Math.random() * 8;
            const nextProg = t.progress === -1 ? 0 : t.progress + roll;

            if (t.progress === -1 && roll === 6) score += 70;
            if (nextProg === 56) score += 120;
            if (nextProg >= 51 && t.progress < 51) score += 75;

            if (nextProg >= 0 && nextProg <= 50) {
                const absIdx = (START_INDEX[t.color] + nextProg) % 52;
                if (SAFE_INDICES.has(absIdx)) score += 45;

                if (!SAFE_INDICES.has(absIdx)) {
                    for (let j = 0; j < tokens.length; j++) {
                        const oth = tokens[j];
                        if (oth.color !== t.color && oth.progress >= 0 && oth.progress <= 50) {
                            const othAbs = (START_INDEX[oth.color] + oth.progress) % 52;
                            if (othAbs === absIdx) score += 150;
                        }
                    }
                }
            }

            score += nextProg * 0.4;
            if (score > bestScore) {
                bestScore = score;
                bestToken = t;
            }
        }
        return bestToken;
    }

    function startMatch() {
        clearBotTimer();
        activeColors = getActiveColorsForCount(playerCount);
        tokens = [];
        activeColors.forEach((color) => {
            for (let i = 0; i < 4; i++) {
                tokens.push({ id: color + '-' + i, color: color, progress: -1 });
            }
        });

        turnIndex = 0;
        perColorDice = { red: 6, green: 6, yellow: 6, blue: 6 };
        diceRolled = false;
        rollingAnim = false;
        winnerColor = '';
        phase = 'playing';

        const cur = activeColors[turnIndex];
        const isBot = mode === 'bot' && !!botColors[cur];
        statusText = COLOR_LABEL[cur] + (isBot ? ' Bot' : '') + ' — Roll Dice (Need 6 to exit yard)';
        render();
        scheduleBotIfNeeded();
    }

    function advanceTurn() {
        turnIndex = (turnIndex + 1) % activeColors.length;
        diceRolled = false;
        const cur = activeColors[turnIndex];
        const isBot = mode === 'bot' && !!botColors[cur];
        statusText = COLOR_LABEL[cur] + (isBot ? ' Bot' : '') + "'s Turn";
        render();
        scheduleBotIfNeeded();
    }

    /** @param {number} n @param {string} pipColor */
    function renderDiceFaceHtml(n, pipColor) {
        const activePips = new Set(PIP_POSITIONS[n] || PIP_POSITIONS[6]);
        let dots = '';
        for (let idx = 0; idx < 9; idx++) {
            const on = activePips.has(idx);
            const isOneCenter = n === 1 && idx === 4;
            const dotSize = isOneCenter ? '10px' : '7px';
            const fill = isOneCenter ? '#e63946' : pipColor;
            dots +=
                '<span style="display:flex;align-items:center;justify-content:center;">' +
                (on
                    ? '<span style="width:' +
                      dotSize +
                      ';height:' +
                      dotSize +
                      ';border-radius:50%;background:' +
                      fill +
                      ';box-shadow:inset 0 1px 2px rgba(0,0,0,0.45);"></span>'
                    : '') +
                '</span>';
        }
        return (
            '<div style="width:36px;height:36px;border-radius:9px;background:linear-gradient(145deg,#ffffff,#f1f3f5);border:2px solid #2b2d42;box-shadow:inset 0 1px 0 #ffffff, 0 2px 4px rgba(0,0,0,0.2);display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);padding:3px;">' +
            dots +
            '</div>'
        );
    }

    /** @param {string} clickedColor */
    function rollDiceForColor(clickedColor) {
        const cur = activeColors[turnIndex];
        if (clickedColor !== cur) return;
        if (phase !== 'playing' || diceRolled || rollingAnim) return;

        rollingAnim = true;
        if (window.SoundFX && window.SoundFX.playTone) window.SoundFX.playTone(320, 680, 0.09, 'square');

        let ticks = 0;
        const interval = setInterval(() => {
            ticks++;
            perColorDice[cur] = Math.floor(Math.random() * 6) + 1;
            const el = document.getElementById('dice-' + cur);
            if (el) el.innerHTML = renderDiceFaceHtml(perColorDice[cur], '#1e1e24');
            if (ticks >= 6) {
                clearInterval(interval);
                const finalRoll = Math.floor(Math.random() * 6) + 1;
                perColorDice[cur] = finalRoll;
                rollingAnim = false;
                diceRolled = true;
                if (window.SoundFX && window.SoundFX.playTone) window.SoundFX.playTone(620, 440, 0.08, 'triangle');
                onDiceSettled(finalRoll);
            }
        }, 55);
    }

    /** @param {number} roll */
    function onDiceSettled(roll) {
        const cur = activeColors[turnIndex];
        const movable = getMovableTokens(cur, roll);

        if (movable.length === 0) {
            statusText = COLOR_LABEL[cur] + ' rolled ' + roll + (roll !== 6 ? ' (Need 6 to come out)' : ' (No move)');
            render();
            clearBotTimer();
            botTimer = setTimeout(advanceTurn, 750);
            return;
        }

        const isBot = mode === 'bot' && !!botColors[cur];
        if (isBot) {
            statusText = COLOR_LABEL[cur] + ' Bot rolled ' + roll + '...';
            render();
            clearBotTimer();
            botTimer = setTimeout(() => {
                const chosen = chooseSmartBotToken(movable, roll);
                executeMove(chosen, roll);
            }, 500);
        } else {
            statusText = 'Rolled ' + roll + ' — Tap highlighted token!';
            render();
        }
    }

    /** @param {LudoToken} token @param {number} roll */
    function executeMove(token, roll) {
        if (phase !== 'playing' || !canTokenMove(token, roll)) return;

        if (token.progress === -1 && roll === 6) token.progress = 0;
        else token.progress += roll;

        if (window.SoundFX && window.SoundFX.click) window.SoundFX.click();

        let captured = false;
        if (token.progress >= 0 && token.progress <= 50) {
            const absIdx = (START_INDEX[token.color] + token.progress) % 52;
            if (!SAFE_INDICES.has(absIdx)) {
                tokens.forEach((other) => {
                    if (other.color !== token.color && other.progress >= 0 && other.progress <= 50) {
                        const otherAbs = (START_INDEX[other.color] + other.progress) % 52;
                        if (otherAbs === absIdx) {
                            other.progress = -1;
                            captured = true;
                        }
                    }
                });
            }
        }

        const doneCount = tokens.filter((t) => t.color === token.color && t.progress === 56).length;
        if (doneCount === 4) {
            phase = 'gameover';
            winnerColor = token.color;
            statusText = '🏆 ' + COLOR_LABEL[token.color] + ' WINS!';
            if (window.SoundFX && window.SoundFX.playTone) {
                window.SoundFX.playTone(520, 780, 0.14, 'triangle');
                setTimeout(() => window.SoundFX.playTone(780, 1040, 0.24, 'triangle'), 130);
            }
            render();
            return;
        }

        const bonus = roll === 6 || captured || token.progress === 56;
        diceRolled = false;

        if (bonus) {
            const isBot = mode === 'bot' && !!botColors[token.color];
            statusText = captured ? '💥 Cut! Bonus Roll!' : '🎲 Bonus Roll!';
            render();
            if (isBot) scheduleBotIfNeeded();
        } else {
            advanceTurn();
        }
    }

    function scheduleBotIfNeeded() {
        clearBotTimer();
        if (phase !== 'playing' || mode !== 'bot') return;
        const cur = activeColors[turnIndex];
        if (!botColors[cur]) return;
        botTimer = setTimeout(() => {
            rollDiceForColor(cur);
        }, 600);
    }

    /** @param {string} tokenId */
    function handleTokenClick(tokenId) {
        if (phase !== 'playing' || !diceRolled || rollingAnim) return;
        const cur = activeColors[turnIndex];
        if (mode === 'bot' && botColors[cur]) return;
        const token = tokens.find((t) => t.id === tokenId);
        const roll = perColorDice[cur];
        if (!token || token.color !== cur || !canTokenMove(token, roll)) return;
        executeMove(token, roll);
    }

    /** @param {number} r @param {number} c */
    function getCellBg(r, c) {
        if (c === 7 && r >= 9 && r <= 13) return COLOR_HEX.red;
        if (r === 7 && c >= 1 && c <= 5) return COLOR_HEX.green;
        if (c === 7 && r >= 1 && r <= 5) return COLOR_HEX.yellow;
        if (r === 7 && c >= 9 && c <= 13) return COLOR_HEX.blue;

        if (r === 13 && c === 6) return COLOR_HEX.red;
        if (r === 6 && c === 1) return COLOR_HEX.green;
        if (r === 1 && c === 8) return COLOR_HEX.yellow;
        if (r === 8 && c === 13) return COLOR_HEX.blue;

        return '#ffffff';
    }

    /** @param {number} r @param {number} c */
    function isStar(r, c) {
        return (
            (r === 13 && c === 6) || (r === 8 && c === 2) ||
            (r === 6 && c === 1) || (r === 2 && c === 8) ||
            (r === 1 && c === 8) || (r === 6 && c === 12) ||
            (r === 8 && c === 13) || (r === 12 && c === 6)
        );
    }

    function renderSetup() {
        const root = document.getElementById('ludo-root');
        if (!root) return;
        const previewColors = getActiveColorsForCount(playerCount);

        const checks = previewColors
            .map((c) => {
                const checked = !!botColors[c];
                return (
                    '<label style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:14px;border:2.5px solid #1e1e24;background:' +
                    (checked ? '#fff4d6' : '#f4f5f9') +
                    ';font-weight:700;cursor:pointer;">' +
                    '<span style="display:flex;align-items:center;gap:8px;font-size:1rem;"><span style="width:18px;height:18px;border-radius:50%;background:' +
                    COLOR_HEX[c] +
                    ';border:2px solid #1e1e24;display:inline-block;"></span>' +
                    COLOR_LABEL[c] +
                    '</span><span>' +
                    (checked ? '🤖 BOT' : '👤 YOU') +
                    '</span><input type="checkbox" ' +
                    (checked ? 'checked' : '') +
                    ' onchange="LudoGame.toggleBotColor(\'' +
                    c +
                    '\', this.checked)" style="width:20px;height:20px;accent-color:#ff4757;"></label>'
                );
            })
            .join('');

        root.innerHTML =
            '<div style="text-align:left;padding:6px;">' +
            '<h2 style="text-align:center;font-size:1.6rem;margin-bottom:14px;">🎲 LUDO</h2>' +
            '<div style="font-weight:700;margin-bottom:6px;">Players:</div>' +
            '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">' +
            [2, 3, 4]
                .map(
                    (cnt) =>
                        '<button type="button" onclick="LudoGame.setPlayerCount(' +
                        cnt +
                        ')" style="padding:12px;border-radius:14px;border:3px solid #1e1e24;box-shadow:0 3px 0 #1e1e24;font-family:inherit;font-size:1rem;font-weight:700;cursor:pointer;background:' +
                        (playerCount === cnt ? '#ffd93d' : '#fff') +
                        ';">' +
                        cnt +
                        'P</button>'
                )
                .join('') +
            '</div>' +
            '<div style="font-weight:700;margin-bottom:6px;">Mode:</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">' +
            '<button type="button" onclick="LudoGame.setMode(\'bot\')" style="padding:12px;border-radius:14px;border:3px solid #1e1e24;box-shadow:0 3px 0 #1e1e24;font-family:inherit;font-weight:700;cursor:pointer;background:' +
            (mode === 'bot' ? '#3742fa' : '#fff') +
            ';color:' +
            (mode === 'bot' ? '#fff' : '#1e1e24') +
            ';">🤖 Bot</button>' +
            '<button type="button" onclick="LudoGame.setMode(\'human\')" style="padding:12px;border-radius:14px;border:3px solid #1e1e24;box-shadow:0 3px 0 #1e1e24;font-family:inherit;font-weight:700;cursor:pointer;background:' +
            (mode === 'human' ? '#2ed573' : '#fff') +
            ';color:' +
            (mode === 'human' ? '#fff' : '#1e1e24') +
            ';">👥 Human</button>' +
            '</div>' +
            (mode === 'bot' ? '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">' + checks + '</div>' : '') +
            '<button type="button" onclick="LudoGame.startMatch()" style="width:100%;padding:15px;border-radius:16px;border:3px solid #1e1e24;box-shadow:0 5px 0 #1e1e24;background:#2ed573;color:#fff;font-family:inherit;font-size:1.25rem;font-weight:700;cursor:pointer;">▶ START</button>' +
            '</div>';
    }

    /** @param {string} color */
    function renderOutsideDiceDock(color) {
        const active = activeColors.includes(color);
        const cur = activeColors[turnIndex];
        const isActive = active && phase === 'playing' && cur === color;
        const isBot = mode === 'bot' && !!botColors[color];
        const canTap = isActive && !diceRolled && !rollingAnim && !isBot;
        const val = perColorDice[color] || 6;

        return (
            '<div style="display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:14px;background:' +
            (isActive ? '#fff8d6' : '#f1f3f5') +
            ';border:' +
            (isActive ? '3px solid ' + COLOR_HEX[color] : '2px solid #cbd5e1') +
            ';box-shadow:' +
            (isActive ? '0 4px 0 #1e1e24' : 'none') +
            ';opacity:' +
            (active ? '1' : '0.35') +
            ';">' +
            '<span style="width:10px;height:10px;border-radius:50%;background:' +
            COLOR_HEX[color] +
            ';border:1.5px solid #1e1e24;flex-shrink:0;"></span>' +
            '<span style="font-size:0.75rem;font-weight:700;color:#1e1e24;">' +
            COLOR_LABEL[color] +
            '</span>' +
            '<button type="button" ' +
            (canTap ? '' : 'disabled') +
            ' onclick="LudoGame.rollDiceForColor(\'' +
            color +
            '\')" style="background:none;border:none;padding:0;cursor:' +
            (canTap ? 'pointer' : 'default') +
            ';display:flex;align-items:center;justify-content:center;">' +
            '<span id="dice-' +
            color +
            '">' +
            renderDiceFaceHtml(val, '#1e1e24') +
            '</span></button>' +
            '</div>'
        );
    }

    function renderBoard() {
        const root = document.getElementById('ludo-root');
        if (!root) return;

        const cur = activeColors[turnIndex];
        const isBot = mode === 'bot' && !!botColors[cur];
        const curRoll = perColorDice[cur];
        const movableSet = new Set(
            phase === 'playing' && diceRolled && !isBot ? getMovableTokens(cur, curRoll).map((t) => t.id) : []
        );

        let cells = '';
        for (let r = 0; r < 15; r++) {
            for (let c = 0; c < 15; c++) {
                if ((r < 6 && c < 6) || (r < 6 && c > 8) || (r > 8 && c > 8) || (r > 8 && c < 6) || (r >= 6 && r <= 8 && c >= 6 && c <= 8)) {
                    continue;
                }
                const bg = getCellBg(r, c);
                const star = isStar(r, c) ? '☆' : '';
                cells +=
                    '<div style="grid-row:' +
                    (r + 1) +
                    ';grid-column:' +
                    (c + 1) +
                    ';background:' +
                    bg +
                    ';border:1px solid #333;display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;color:' +
                    (bg === '#ffffff' ? '#666' : '#fff') +
                    ';">' +
                    star +
                    '</div>';
            }
        }

        /** @param {string} rowSpan @param {string} colSpan @param {string} color */
        function yardBox(rowSpan, colSpan, color) {
            return (
                '<div style="grid-row:' +
                rowSpan +
                ';grid-column:' +
                colSpan +
                ';background:' +
                COLOR_HEX[color] +
                ';border:2px solid #1e1e24;padding:12%;display:grid;place-items:center;">' +
                '<div style="width:100%;height:100%;background:#fff;border-radius:14px;border:2px solid #1e1e24;display:grid;grid-template-columns:1fr 1fr;place-items:center;padding:8%;">' +
                '<span style="width:74%;aspect-ratio:1/1;border-radius:50%;background:rgba(0,0,0,0.06);border:2px dashed ' +
                COLOR_HEX[color] +
                ';"></span>' +
                '<span style="width:74%;aspect-ratio:1/1;border-radius:50%;background:rgba(0,0,0,0.06);border:2px dashed ' +
                COLOR_HEX[color] +
                ';"></span>' +
                '<span style="width:74%;aspect-ratio:1/1;border-radius:50%;background:rgba(0,0,0,0.06);border:2px dashed ' +
                COLOR_HEX[color] +
                ';"></span>' +
                '<span style="width:74%;aspect-ratio:1/1;border-radius:50%;background:rgba(0,0,0,0.06);border:2px dashed ' +
                COLOR_HEX[color] +
                ';"></span>' +
                '</div></div>'
            );
        }

        const yards =
            yardBox('1/7', '1/7', 'green') +
            yardBox('1/7', '10/16', 'yellow') +
            yardBox('10/16', '10/16', 'blue') +
            yardBox('10/16', '1/7', 'red') +
            '<div style="grid-row:7/10;grid-column:7/10;background:conic-gradient(from -45deg, ' +
            COLOR_HEX.yellow +
            ' 0deg 90deg, ' +
            COLOR_HEX.blue +
            ' 90deg 180deg, ' +
            COLOR_HEX.red +
            ' 180deg 270deg, ' +
            COLOR_HEX.green +
            ' 270deg 360deg);border:2px solid #1e1e24;display:grid;place-items:center;"><span style="background:#fff;padding:2px 5px;border-radius:6px;border:1.5px solid #1e1e24;font-size:0.65rem;font-weight:700;">👑</span></div>';

        /** @type {Map<string, LudoToken[]>} */
        const groups = new Map();
        /** @type {{ [key: string]: number }} */
        const yardCount = { red: 0, green: 0, yellow: 0, blue: 0 };
        /** @type {{ [key: string]: number[] }} */
        const homeCoords = { red: [8.1, 7], green: [7, 5.9], yellow: [5.9, 7], blue: [7, 8.1] };

        const placed = tokens.map((t) => {
            let r = 7;
            let c = 7;
            if (t.progress === -1) {
                const s = YARD_SLOTS[t.color][yardCount[t.color]++];
                r = s[0];
                c = s[1];
            } else if (t.progress === 56) {
                const hm = homeCoords[t.color];
                r = hm[0];
                c = hm[1];
            } else {
                const pt = getTokenCoord(t.color, t.progress);
                if (pt) {
                    r = pt[0];
                    c = pt[1];
                }
            }
            const key = r.toFixed(1) + ',' + c.toFixed(1);
            const existing = groups.get(key);
            if (existing) existing.push(t);
            else groups.set(key, [t]);
            return { t: t, r: r, c: c, key: key };
        });

        const tokensHtml = placed
            .map(({ t, r, c, key }) => {
                const grp = groups.get(key) || [t];
                const idx = grp.findIndex((x) => x.id === t.id);
                const ox = grp.length > 1 ? (idx - (grp.length - 1) / 2) * 0.2 : 0;
                const oy = grp.length > 1 ? ((idx % 2) - 0.5) * 0.14 : 0;
                const left = ((c + 0.5 + ox) / 15) * 100;
                const top = ((r + 0.5 + oy) / 15) * 100;
                const glow = movableSet.has(t.id);

                return (
                    '<button type="button" onclick="LudoGame.handleTokenClick(\'' +
                    t.id +
                    '\')" style="position:absolute;left:' +
                    left +
                    '%;top:' +
                    top +
                    '%;width:5.4%;height:5.4%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle at 32% 32%, rgba(255,255,255,0.65), ' +
                    COLOR_HEX[t.color] +
                    ' 65%);border:' +
                    (glow ? '3px solid #1e1e24' : '2px solid #fff') +
                    ';box-shadow:' +
                    (glow ? '0 0 0 3px #ffd93d, 0 3px 6px rgba(0,0,0,0.45)' : '0 2px 4px rgba(0,0,0,0.4)') +
                    ';cursor:' +
                    (glow ? 'pointer' : 'default') +
                    ';z-index:' +
                    (glow ? 30 : 15) +
                    ';padding:0;"></button>'
                );
            })
            .join('');

        const topDock =
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">' +
            renderOutsideDiceDock('green') +
            renderOutsideDiceDock('yellow') +
            '</div>';

        const bottomDock =
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;">' +
            renderOutsideDiceDock('red') +
            renderOutsideDiceDock('blue') +
            '</div>';

        const winOverlay = phase === 'gameover' ? renderLudoWinOverlay(winnerColor) : '';

        root.innerHTML =
            topDock +
            '<div style="width:100%;aspect-ratio:1/1;display:grid;grid-template-columns:repeat(15,1fr);grid-template-rows:repeat(15,1fr);position:relative;border:4px solid #1e1e24;border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 5px 0 #1e1e24;">' +
            cells +
            yards +
            tokensHtml +
            '</div>' +
            bottomDock +
            '<div style="margin-top:8px;padding:7px 12px;border-radius:14px;background:#fff;border:3px solid #1e1e24;display:flex;align-items:center;gap:8px;">' +
            '<span style="width:14px;height:14px;border-radius:50%;background:' +
            COLOR_HEX[cur] +
            ';border:2px solid #1e1e24;flex-shrink:0;"></span>' +
            '<span style="font-weight:700;font-size:0.86rem;text-align:left;flex:1;">' +
            statusText +
            '</span>' +
            '</div>' +
            '<div style="display:flex;gap:8px;margin-top:8px;"><button type="button" onclick="LudoGame.openSetup()" style="flex:1;padding:9px;border-radius:12px;border:2.5px solid #1e1e24;background:#f4f5f9;font-family:inherit;font-weight:700;cursor:pointer;">⚙ Setup</button><button type="button" onclick="LudoGame.startMatch()" style="flex:1;padding:9px;border-radius:12px;border:2.5px solid #1e1e24;background:#ffd93d;font-family:inherit;font-weight:700;cursor:pointer;">↻ Restart</button></div>' +
            winOverlay;
    }

    function render() {
        if (phase === 'setup') renderSetup();
        else renderBoard();
    }

    return {
        mount() { clearBotTimer(); phase = 'setup'; render(); },
        openSetup() { clearBotTimer(); phase = 'setup'; render(); },
        /** @param {number} c */
        setPlayerCount(c) { playerCount = c; render(); },
        /** @param {string} m */
        setMode(m) { mode = m; render(); },
        /** @param {string} c @param {boolean} v */
        toggleBotColor(c, v) { botColors[c] = v; render(); },
        startMatch,
        rollDiceForColor,
        handleTokenClick
    };
})();

window.LudoGame = LudoGame;