
const CarromGame = (() => {
    /**
     * @typedef {{ id: string, kind: string, x: number, y: number, vx: number, vy: number, r: number, pocketed: boolean }} CarromPiece
     */

    let phase = 'setup';
    let mode = 'robot';
    let activeSeat = 0;
    let viewFlipped = false;
    let baselineX = 0.5;
    let shooting = false;
    let statusText = 'Slide < > & drag striker!';

    /** @type {CarromPiece[]} */
    let pieces = [];

    let strikerX = 0.5;
    let strikerY = 0.81;
    let strikerVx = 0;
    let strikerVy = 0;
    const strikerR = 0.038;

    let isDraggingStriker = false;
    let aimDirX = 0;
    let aimDirY = -1;
    let aimPower = 0;

    let coinPocketedThisShot = false;
    let player1Score = 0;
    let player2Score = 0;
    let ownCoinPocketedThisShot = false;
    let queenPocketedThisShot = false;

    // Delayed queen cover system.
    let queenNeedsCover = false;
    let queenNeedsCoverSeat = null;

    /** @type {number | null} */
    let animFrameId = null;

    /** @type {number | null} */
    let botTimer = null;

    const POCKETS = [
        [0.075, 0.075],
        [0.925, 0.075],
        [0.925, 0.925],
        [0.075, 0.925]
    ];

    const POCKET_RADIUS = 0.056;

    function stopLoops() {
        if (animFrameId !== null) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }

        if (botTimer !== null) {
            clearTimeout(botTimer);
            botTimer = null;
        }
    }

    /** @returns {CarromPiece[]} */
    function createPieces() {
        /** @type {CarromPiece[]} */
        const list = [
            {
                id: 'queen',
                kind: 'queen',
                x: 0.5,
                y: 0.5,
                vx: 0,
                vy: 0,
                r: 0.028,
                pocketed: false
            }
        ];

        const r1 = 0.058;

        for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3;

            list.push({
                id: 'r1-' + i,
                kind: i % 2 === 0 ? 'white' : 'black',
                x: 0.5 + Math.cos(a) * r1,
                y: 0.5 + Math.sin(a) * r1,
                vx: 0,
                vy: 0,
                r: 0.028,
                pocketed: false
            });
        }

        const r2 = 0.116;

        for (let i = 0; i < 12; i++) {
            const a = (i * Math.PI) / 6;

            list.push({
                id: 'r2-' + i,
                kind: i % 2 === 0 ? 'black' : 'white',
                x: 0.5 + Math.cos(a) * r2,
                y: 0.5 + Math.sin(a) * r2,
                vx: 0,
                vy: 0,
                r: 0.028,
                pocketed: false
            });
        }

        return list;
    }

    function resetStriker() {
        strikerVx = 0;
        strikerVy = 0;
        shooting = false;
        isDraggingStriker = false;
        aimPower = 0;

        baselineX = 0.5;
        strikerX = 0.5;
        strikerY = activeSeat === 0 ? 0.81 : 0.19;
    }

    function isRobotTurn() {
        return phase === 'playing' &&
            mode === 'robot' &&
            activeSeat === 1;
    }

    function getWinnerLabel() {
        if (phase === 'gameover') {
            if (player1Score > player2Score) {
                return 'PLAYER 1';
            }

            if (player2Score > player1Score) {
                return mode === 'robot' ? 'BOT' : 'PLAYER 2';
            }

            return 'DRAW';
        }

        return activeSeat === 0
            ? 'PLAYER 1'
            : mode === 'robot'
                ? 'BOT'
                : 'PLAYER 2';
    }

    function playWinSound() {
        if (window.SoundFX && window.SoundFX.playTone) {
            window.SoundFX.playTone(523, 784, 0.14, 'triangle');

            setTimeout(() => {
                window.SoundFX.playTone(784, 1046, 0.24, 'triangle');
            }, 130);
        }
    }

    /** @param {string} title @param {string} subtitle */
    function renderWinCelebrationOverlay(title, subtitle) {
        const colors = [
            '#ff4757',
            '#ffa502',
            '#2ed573',
            '#1e90ff',
            '#ff6b81',
            '#ffd93d'
        ];

        const sparkles = Array.from({ length: 28 }, (_, i) => {
            const left = ((i * 37) % 96) + 2;
            const delay = ((i * 0.19) % 1.4).toFixed(2);
            const dur = (1.6 + (i % 5) * 0.35).toFixed(2);
            const col = colors[i % colors.length];
            const size = 8 + (i % 4) * 3;

            return (
                '<span style="position:fixed;top:-20px;left:' +
                left +
                '%;width:' +
                size +
                'px;height:' +
                size +
                'px;border-radius:' +
                (i % 2 === 0 ? '50%' : '3px') +
                ';background:' +
                col +
                ';box-shadow:0 0 10px ' +
                col +
                ';animation:carromSparkFall ' +
                dur +
                's linear ' +
                delay +
                's infinite;pointer-events:none;z-index:9998;"></span>'
            );
        }).join('');

        return (
            '<style>@keyframes carromSparkFall{0%{transform:translateY(-20px) rotate(0deg) scale(0.9);opacity:1;}85%{opacity:1;}100%{transform:translateY(105vh) rotate(540deg) scale(1.2);opacity:0;}}@keyframes winPop{0%{transform:scale(0.65);opacity:0;}70%{transform:scale(1.05);opacity:1;}100%{transform:scale(1);opacity:1;}}</style>' +
            sparkles +
            '<div style="position:fixed;inset:0;background:rgba(15,18,30,0.78);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:18px;z-index:9999;">' +
            '<div style="width:100%;max-width:350px;background:linear-gradient(155deg,#1e2235,#121420);border:4px solid #ffd93d;border-radius:24px;padding:24px 18px;text-align:center;color:#fff;box-shadow:0 0 35px rgba(255,217,61,0.55),0 10px 0 #000;animation:winPop 0.4s cubic-bezier(0.22,1,0.36,1) forwards;">' +
            '<div style="font-size:3.2rem;line-height:1;margin-bottom:8px;">🏆✨</div>' +
            '<div style="font-size:1.5rem;font-weight:900;letter-spacing:0.6px;color:#ffd93d;text-shadow:0 3px 0 #000;">' +
            title +
            '</div>' +
            '<div style="font-size:0.95rem;font-weight:700;color:#e2e8f0;margin:8px 0 18px;">' +
            subtitle +
            '</div>' +
            '<div style="display:flex;justify-content:space-around;margin-bottom:18px;font-weight:900;">' +
            '<span>⚪ ' + player1Score + '</span>' +
            '<span>⚫ ' + player2Score + '</span>' +
            '</div>' +
            '<button type="button" onclick="CarromGame.startMatch()" style="width:100%;padding:13px;border-radius:14px;border:3px solid #1e1e24;box-shadow:0 4px 0 #1e1e24;background:linear-gradient(90deg,#2ed573,#00b894);color:#fff;font-family:inherit;font-size:1.05rem;font-weight:800;cursor:pointer;">🔥 PLAY AGAIN</button>' +
            '</div></div>'
        );
    }

    function startMatch() {
        stopLoops();

        pieces = createPieces();
        activeSeat = 0;
        viewFlipped = false;
        phase = 'playing';

        player1Score = 0;
        player2Score = 0;

        coinPocketedThisShot = false;
        ownCoinPocketedThisShot = false;
        queenPocketedThisShot = false;

        queenNeedsCover = false;
        queenNeedsCoverSeat = null;

        resetStriker();

        statusText = 'Drag striker back & shoot!';

        renderGame();
        scheduleBotIfNeeded();
    }

    function scheduleBotIfNeeded() {
        if (botTimer !== null) {
            clearTimeout(botTimer);
            botTimer = null;
        }

        if (!isRobotTurn() || shooting) return;

        botTimer = setTimeout(() => {
            const active = pieces.filter((p) => !p.pocketed);

            if (active.length === 0) return;

            /** @type {{ sx: number, tx: number, ty: number } | null} */
            let bestShot = null;

            let bestScore = -9999;

            for (const coin of active) {
                for (const [px, py] of POCKETS) {
                    const toPocketX = px - coin.x;
                    const toPocketY = py - coin.y;

                    const dPocket =
                        Math.hypot(toPocketX, toPocketY) || 0.001;

                    const impactX =
                        coin.x -
                        (toPocketX / dPocket) * (strikerR + coin.r);

                    const impactY =
                        coin.y -
                        (toPocketY / dPocket) * (strikerR + coin.r);

                    const tryX = Math.max(
                        0.22,
                        Math.min(0.78, impactX)
                    );

                    const sy = 0.19;

                    const dx = impactX - tryX;
                    const dy = impactY - sy;

                    const dist = Math.hypot(dx, dy) || 0.001;

                    const align =
                        (dx / dist) * (toPocketX / dPocket) +
                        (dy / dist) * (toPocketY / dPocket);

                    const score =
                        align * 100 -
                        dPocket * 30 +
                        (coin.kind === 'queen' ? 20 : 0);

                    if (score > bestScore) {
                        bestScore = score;

                        bestShot = {
                            sx: tryX,
                            tx: impactX,
                            ty: impactY
                        };
                    }
                }
            }

            const chosen = bestShot || {
                sx: 0.5,
                tx: active[0].x,
                ty: active[0].y
            };

            strikerX = chosen.sx;
            strikerY = 0.19;
            baselineX = chosen.sx;

            drawCanvas();

            setTimeout(() => {
                launchStriker(chosen.tx, chosen.ty, 0.78);
            }, 350);

        }, 550);
    }

    /** @param {string | number} val */
    function setBaselinePosition(val) {
        if (shooting || isRobotTurn()) return;

        const raw = Number(val) / 100;
        const effective = viewFlipped ? 1 - raw : raw;

        baselineX = Math.max(0.22, Math.min(0.78, effective));
        strikerX = baselineX;
        strikerY = activeSeat === 0 ? 0.81 : 0.19;

        drawCanvas();
        updateControllerValues();
    }

    function updateControllerValues() {
        const value = Math.round(
            (viewFlipped ? 1 - baselineX : baselineX) * 100
        );

        const topSlider = document.getElementById('carromTopSlider');
        const bottomSlider = document.getElementById('carromBottomSlider');

        if (topSlider) topSlider.value = String(value);
        if (bottomSlider) bottomSlider.value = String(value);
    }

    function toggleSide() {
        if (window.SoundFX && window.SoundFX.click) {
            window.SoundFX.click();
        }

        viewFlipped = !viewFlipped;
        renderGame();
    }

    /** @param {number} tx @param {number} ty @param {number} powerRatio */
    function launchStriker(tx, ty, powerRatio) {
        const dx = tx - strikerX;
        const dy = ty - strikerY;
        const dist = Math.hypot(dx, dy) || 0.001;

        const speed =
            0.014 +
            Math.min(1, Math.max(0.15, powerRatio)) * 0.026;

        strikerVx = (dx / dist) * speed;
        strikerVy = (dy / dist) * speed;

        shooting = true;
        isDraggingStriker = false;
        aimPower = 0;

        coinPocketedThisShot = false;
        ownCoinPocketedThisShot = false;
        queenPocketedThisShot = false;

        if (window.SoundFX && window.SoundFX.playTone) {
            window.SoundFX.playTone(260, 520, 0.08, 'triangle');
        }

        stepPhysics();
    }

    function stepPhysics() {
        if (phase !== 'playing') return;

        const friction = 0.986;

        let moving = false;
        let strikerFoul = false;

        if (shooting) {
            strikerX += strikerVx;
            strikerY += strikerVy;

            strikerVx *= friction;
            strikerVy *= friction;

            if (strikerX - strikerR < 0.04) {
                strikerX = 0.04 + strikerR;
                strikerVx = Math.abs(strikerVx) * 0.86;
            } else if (strikerX + strikerR > 0.96) {
                strikerX = 0.96 - strikerR;
                strikerVx = -Math.abs(strikerVx) * 0.86;
            }

            if (strikerY - strikerR < 0.04) {
                strikerY = 0.04 + strikerR;
                strikerVy = Math.abs(strikerVy) * 0.86;
            } else if (strikerY + strikerR > 0.96) {
                strikerY = 0.96 - strikerR;
                strikerVy = -Math.abs(strikerVy) * 0.86;
            }

            for (const [px, py] of POCKETS) {
                if (
                    Math.hypot(strikerX - px, strikerY - py) <
                    POCKET_RADIUS
                ) {
                    strikerFoul = true;

                    strikerVx = 0;
                    strikerVy = 0;

                    break;
                }
            }

            if (
                Math.hypot(strikerVx, strikerVy) > 0.0004 &&
                !strikerFoul
            ) {
                moving = true;
            } else {
                strikerVx = 0;
                strikerVy = 0;
            }
        }

        for (const p of pieces) {
            if (p.pocketed) continue;

            p.x += p.vx;
            p.y += p.vy;

            p.vx *= friction;
            p.vy *= friction;

            if (p.x - p.r < 0.04) {
                p.x = 0.04 + p.r;
                p.vx = Math.abs(p.vx) * 0.86;
            } else if (p.x + p.r > 0.96) {
                p.x = 0.96 - p.r;
                p.vx = -Math.abs(p.vx) * 0.86;
            }

            if (p.y - p.r < 0.04) {
                p.y = 0.04 + p.r;
                p.vy = Math.abs(p.vy) * 0.86;
            } else if (p.y + p.r > 0.96) {
                p.y = 0.96 - p.r;
                p.vy = -Math.abs(p.vy) * 0.86;
            }

            for (const [px, py] of POCKETS) {
                if (
                    Math.hypot(p.x - px, p.y - py) <
                    POCKET_RADIUS
                ) {
                    p.pocketed = true;
                    p.vx = 0;
                    p.vy = 0;

                    coinPocketedThisShot = true;

                    // Coin points go to the player who pocketed the coin.
                    if (p.kind === 'white') {
                        if (activeSeat === 0) {
                            player1Score += 20;
                            ownCoinPocketedThisShot = true;
                        } else {
                            player2Score += 20;
                        }
                    } else if (p.kind === 'black') {
                        if (activeSeat === 1) {
                            player2Score += 10;
                            ownCoinPocketedThisShot = true;
                        } else {
                            player1Score += 10;
                        }
                    }

                    if (p.kind === 'queen') {
                        queenPocketedThisShot = true;
                    }

                    if (
                        window.SoundFX &&
                        window.SoundFX.playTone
                    ) {
                        window.SoundFX.playTone(
                            680,
                            340,
                            0.11,
                            'sine'
                        );
                    }

                    break;
                }
            }

            if (
                !p.pocketed &&
                Math.hypot(p.vx, p.vy) > 0.0004
            ) {
                moving = true;
            } else {
                p.vx = 0;
                p.vy = 0;
            }
        }

        if (!strikerFoul) {
            for (const p of pieces) {
                if (p.pocketed) continue;

                const dx = p.x - strikerX;
                const dy = p.y - strikerY;

                const dist = Math.hypot(dx, dy);
                const minD = strikerR + p.r;

                if (dist > 0 && dist < minD) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const ov = minD - dist;

                    strikerX -= nx * ov * 0.5;
                    strikerY -= ny * ov * 0.5;

                    p.x += nx * ov * 0.5;
                    p.y += ny * ov * 0.5;

                    const sep =
                        (strikerVx - p.vx) * nx +
                        (strikerVy - p.vy) * ny;

                    if (sep > 0) {
                        const imp = sep * 0.94;

                        strikerVx -= imp * nx;
                        strikerVy -= imp * ny;

                        p.vx += imp * nx;
                        p.vy += imp * ny;

                        moving = true;
                    }
                }
            }
        }

        for (let i = 0; i < pieces.length; i++) {
            const a = pieces[i];

            if (a.pocketed) continue;

            for (let j = i + 1; j < pieces.length; j++) {
                const b = pieces[j];

                if (b.pocketed) continue;

                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.hypot(dx, dy);
                const minD = a.r + b.r;

                if (dist > 0 && dist < minD) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const ov = minD - dist;

                    a.x -= nx * ov * 0.5;
                    a.y -= ny * ov * 0.5;

                    b.x += nx * ov * 0.5;
                    b.y += ny * ov * 0.5;

                    const sep =
                        (a.vx - b.vx) * nx +
                        (a.vy - b.vy) * ny;

                    if (sep > 0) {
                        const imp = sep * 0.92;

                        a.vx -= imp * nx;
                        a.vy -= imp * ny;

                        b.vx += imp * nx;
                        b.vy += imp * ny;

                        moving = true;
                    }
                }
            }
        }

        drawCanvas();

        if (moving && !strikerFoul) {
            animFrameId = requestAnimationFrame(stepPhysics);

        } else {
            animFrameId = null;
            shooting = false;

            // If the queen is pocketed, remember which player pocketed it.
            // The queen stays pocketed and never respawns.
            if (queenPocketedThisShot) {
                queenNeedsCover = true;
                queenNeedsCoverSeat = activeSeat;
                statusText = '👑 Queen pocketed! Cover it with your own coin!';
            }

            // Cover can happen in the same shot or a later shot.
            // Only the player who pocketed the queen can cover it.
            if (
                queenNeedsCover &&
                queenNeedsCoverSeat === activeSeat &&
                ownCoinPocketedThisShot
            ) {
                if (activeSeat === 0) {
                    player1Score += 50;
                } else {
                    player2Score += 50;
                }

                queenNeedsCover = false;
                queenNeedsCoverSeat = null;

                statusText = '👑 Queen covered! +50 Points!';
            } else if (
                queenNeedsCover &&
                queenNeedsCoverSeat === activeSeat &&
                !ownCoinPocketedThisShot &&
                !queenPocketedThisShot
            ) {
                statusText = 'Queen is waiting for cover! Pocket your own coin.';
            }

            const rem = pieces.filter(
                (p) => !p.pocketed
            ).length;

            if (rem === 0) {
                phase = 'gameover';

                statusText = '🏆 ' + getWinnerLabel() + ' WINS!';

                playWinSound();
                renderGame();

                return;
            }

            if (strikerFoul) {
                activeSeat = activeSeat === 0 ? 1 : 0;

                statusText =
                    'Striker Foul! Turn -> ' +
                    (
                        activeSeat === 0
                            ? 'Player 1'
                            : mode === 'robot'
                                ? 'Bot'
                                : 'Player 2'
                    );

            } else if (coinPocketedThisShot) {
                if (!queenPocketedThisShot && !ownCoinPocketedThisShot) {
                    statusText =
                        '🔥 Coin pocketed! Same player shoots again!';
                }

            } else {
                activeSeat = activeSeat === 0 ? 1 : 0;

                statusText =
                    (
                        activeSeat === 0
                            ? 'Player 1'
                            : mode === 'robot'
                                ? 'Bot'
                                : 'Player 2'
                    ) + "'s Turn";
            }

            coinPocketedThisShot = false;
            ownCoinPocketedThisShot = false;
            queenPocketedThisShot = false;

            resetStriker();

            renderGame();
            scheduleBotIfNeeded();
        }
    }

    /** @param {number} nx @param {number} ny @returns {number[]} */
    function toView(nx, ny) {
        return viewFlipped
            ? [1 - nx, 1 - ny]
            : [nx, ny];
    }

    /** @param {number} vx @param {number} vy @returns {number[]} */
    function fromView(vx, vy) {
        return viewFlipped
            ? [1 - vx, 1 - vy]
            : [vx, vy];
    }

    function bindCanvasTouch() {
        const canvas =
            /** @type {HTMLCanvasElement | null} */
            (document.getElementById('carromCanvas'));

        if (!canvas) return;

        /** @param {MouseEvent | TouchEvent} e */
        const getNormPointer = (e) => {
            const rect = canvas.getBoundingClientRect();

            const touch =
                'touches' in e && e.touches.length > 0
                    ? e.touches[0]
                    : /** @type {MouseEvent} */ (e);

            const vx =
                (touch.clientX - rect.left) / rect.width;

            const vy =
                (touch.clientY - rect.top) / rect.height;

            return fromView(vx, vy);
        };

        /** @param {MouseEvent | TouchEvent} e */
        const onStart = (e) => {
            if (
                phase !== 'playing' ||
                shooting ||
                isRobotTurn()
            ) return;

            const [nx, ny] = getNormPointer(e);

            if (
                Math.hypot(
                    nx - strikerX,
                    ny - strikerY
                ) <= 0.14
            ) {
                isDraggingStriker = true;
                aimPower = 0;
                e.preventDefault();
            }
        };

        /** @param {MouseEvent | TouchEvent} e */
        const onMove = (e) => {
            if (!isDraggingStriker) return;

            e.preventDefault();

            const [nx, ny] = getNormPointer(e);

            const pullX = strikerX - nx;
            const pullY = strikerY - ny;
            const pullDist = Math.hypot(pullX, pullY);

            if (pullDist > 0.01) {
                aimDirX = pullX / pullDist;
                aimDirY = pullY / pullDist;

                aimPower = Math.min(
                    1,
                    pullDist / 0.28
                );
            } else {
                aimPower = 0;
            }

            drawCanvas();
        };

        const onEnd = () => {
            if (!isDraggingStriker) return;

            isDraggingStriker = false;

            if (aimPower > 0.12) {
                launchStriker(
                    strikerX + aimDirX * 0.5,
                    strikerY + aimDirY * 0.5,
                    aimPower
                );
            } else {
                aimPower = 0;
                drawCanvas();
            }
        };

        canvas.addEventListener('mousedown', onStart);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);

        canvas.addEventListener(
            'touchstart',
            onStart,
            { passive: false }
        );

        canvas.addEventListener(
            'touchmove',
            onMove,
            { passive: false }
        );

        canvas.addEventListener('touchend', onEnd);
    }

    function drawCanvas() {
        const canvas =
            /** @type {HTMLCanvasElement | null} */
            (document.getElementById('carromCanvas'));

        if (!canvas || !canvas.getContext) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const size = canvas.width;

        ctx.clearRect(0, 0, size, size);

        ctx.fillStyle = '#f3d299';
        ctx.fillRect(0, 0, size, size);

        ctx.strokeStyle = '#4a2511';
        ctx.lineWidth = size * 0.03;
        ctx.strokeRect(0, 0, size, size);

        ctx.strokeStyle = '#6b3e26';
        ctx.lineWidth = 2;

        const b1 = size * 0.19;
        const b2 = size * 0.81;

        ctx.strokeRect(
            b1,
            b1,
            b2 - b1,
            b2 - b1
        );

        const ends = [
            [0.22, 0.19],
            [0.78, 0.19],
            [0.22, 0.81],
            [0.78, 0.81],
            [0.19, 0.22],
            [0.19, 0.78],
            [0.81, 0.22],
            [0.81, 0.78]
        ];

        for (const [ex, ey] of ends) {
            const [vx, vy] = toView(ex, ey);

            ctx.beginPath();
            ctx.arc(
                vx * size,
                vy * size,
                size * 0.022,
                0,
                Math.PI * 2
            );

            ctx.fillStyle = '#d62828';
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(
            size * 0.5,
            size * 0.5,
            size * 0.145,
            0,
            Math.PI * 2
        );

        ctx.strokeStyle = '#6b3e26';
        ctx.lineWidth = 2;
        ctx.stroke();

        for (const [px, py] of POCKETS) {
            const [vx, vy] = toView(px, py);

            ctx.beginPath();
            ctx.arc(
                vx * size,
                vy * size,
                POCKET_RADIUS * size,
                0,
                Math.PI * 2
            );

            ctx.fillStyle = '#18181f';
            ctx.fill();
        }

        for (const p of pieces) {
            if (p.pocketed) continue;

            const [vx, vy] = toView(p.x, p.y);

            ctx.beginPath();
            ctx.arc(
                vx * size,
                vy * size,
                p.r * size,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                p.kind === 'queen'
                    ? '#e63946'
                    : p.kind === 'white'
                        ? '#fffdf7'
                        : '#26262e';

            ctx.fill();

            ctx.lineWidth = 2;
            ctx.strokeStyle = '#18181f';
            ctx.stroke();
        }

        const [svx, svy] = toView(
            strikerX,
            strikerY
        );

        if (isDraggingStriker && aimPower > 0.05) {
            const ringR =
                (0.06 + aimPower * 0.14) * size;

            ctx.beginPath();
            ctx.arc(
                svx * size,
                svy * size,
                ringR,
                0,
                Math.PI * 2
            );

            ctx.fillStyle = 'rgba(255, 183, 3, 0.25)';
            ctx.fill();

            ctx.strokeStyle = '#ff6b00';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            const [avx, avy] = toView(
                strikerX + aimDirX * (0.14 + aimPower * 0.26),
                strikerY + aimDirY * (0.14 + aimPower * 0.26)
            );

            ctx.beginPath();
            ctx.moveTo(
                svx * size,
                svy * size
            );

            ctx.lineTo(
                avx * size,
                avy * size
            );

            ctx.strokeStyle = '#e63946';
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(
            svx * size,
            svy * size,
            strikerR * size,
            0,
            Math.PI * 2
        );

        ctx.fillStyle = '#ffb703';
        ctx.fill();

        ctx.lineWidth = 3;
        ctx.strokeStyle = '#18181f';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(
            svx * size,
            svy * size,
            strikerR * size * 0.5,
            0,
            Math.PI * 2
        );

        ctx.strokeStyle = '#18181f';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function renderSetup() {
        const root = document.getElementById('carrom-root');
        if (!root) return;

        root.innerHTML =
            '<div style="text-align:left;padding:6px;">' +
            '<h2 style="text-align:center;font-size:1.6rem;margin-bottom:14px;">🎯 CARROM</h2>' +

            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">' +

            '<button type="button" onclick="CarromGame.setMode(\'robot\')" style="padding:12px;border-radius:14px;border:3px solid #1e1e24;box-shadow:0 3px 0 #1e1e24;font-family:inherit;font-weight:700;cursor:pointer;background:' +
            (mode === 'robot' ? '#3742fa' : '#fff') +
            ';color:' +
            (mode === 'robot' ? '#fff' : '#1e1e24') +
            ';">🤖 Bot</button>' +

            '<button type="button" onclick="CarromGame.setMode(\'2p\')" style="padding:12px;border-radius:14px;border:3px solid #1e1e24;box-shadow:0 3px 0 #1e1e24;font-family:inherit;font-weight:700;cursor:pointer;background:' +
            (mode === '2p' ? '#2ed573' : '#fff') +
            ';color:' +
            (mode === '2p' ? '#fff' : '#1e1e24') +
            ';">👥 2P</button>' +

            '</div>' +

            '<button type="button" onclick="CarromGame.startMatch()" style="width:100%;padding:15px;border-radius:16px;border:3px solid #1e1e24;box-shadow:0 5px 0 #1e1e24;background:#2ed573;color:#fff;font-family:inherit;font-size:1.25rem;font-weight:700;cursor:pointer;">▶ START</button>' +
            '</div>';
    }

    /**
 * @param {1 | 2} player
 * @param {string} sliderId
 * @param {boolean} isDisabled
 * @param {boolean} isTop
 */
function makeController(player, sliderId, isDisabled, isTop) {
        const label = player === 1 ? 'PLAYER 1 CONTROL' : 'PLAYER 2 CONTROL';
        const value = Math.round(
            (viewFlipped ? 1 - baselineX : baselineX) * 100
        );

        return (
            '<div style="margin:' +
            (isTop ? '2px 0 7px' : '7px 0 2px') +
            ';padding:6px 10px;border-radius:12px;background:' +
            (player === 1 ? 'linear-gradient(90deg,#2ec4b6,#168aad)' : 'linear-gradient(90deg,#6c63ff,#4361ee)') +
            ';border:2px solid #1e1e24;box-shadow:0 3px 0 #1e1e24;display:flex;align-items:center;gap:8px;">' +

            '<span style="font-weight:900;font-size:10px;color:#fff;white-space:nowrap;">' +
            label +
            '</span>' +

            '<input id="' +
            sliderId +
            '" type="range" min="22" max="78" value="' +
            value +
            '" ' +
            (isDisabled ? 'disabled' : '') +
            ' oninput="CarromGame.setBaselinePosition(this.value)" style="width:100%;min-width:0;margin:0;accent-color:#fff;cursor:pointer;">' +

            '</div>'
        );
    }

    function renderScoreboard() {
        return (
            '<div id="carromScreenScoreboard" style="position:fixed;top:66px;right:8px;z-index:1000;width:104px;background:rgba(20,25,40,0.96);border:1.5px solid #ffd93d;border-radius:9px;padding:5px 7px;box-shadow:0 2px 8px rgba(0,0,0,0.35);pointer-events:none;">' +

            '<div style="display:flex;justify-content:space-between;align-items:center;color:#fff;font-size:9px;font-weight:900;line-height:17px;">' +
            '<span><span style="color:#2ed573;">●</span> PLAYER 1</span>' +
            '<span style="font-size:13px;color:#2ed573;">' +
            player1Score +
            '</span></div>' +

            '<div style="height:1px;background:rgba(255,255,255,0.3);margin:2px 0;"></div>' +

            '<div style="display:flex;justify-content:space-between;align-items:center;color:#fff;font-size:9px;font-weight:900;line-height:17px;">' +
            '<span><span style="color:#70a1ff;">●</span> PLAYER 2</span>' +
            '<span style="font-size:13px;color:#70a1ff;">' +
            player2Score +
            '</span></div>' +

            '</div>'
        );
    }

    function renderGame() {
        const root = document.getElementById('carrom-root');
        if (!root) return;

        const bottomDisabled =
            phase !== 'playing' ||
            shooting ||
            activeSeat !== 0;

        const topDisabled =
            phase !== 'playing' ||
            shooting ||
            activeSeat !== 1 ||
            isRobotTurn();

        const winOverlay =
            phase === 'gameover'
                ? renderWinCelebrationOverlay(
                    getWinnerLabel() + ' CHAMPION!',
                    'Final Score'
                )
                : '';

        root.innerHTML =
            renderScoreboard() +

            '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px;">' +

            '<div style="text-align:left;font-weight:700;font-size:0.86rem;">' +
            statusText +
            '</div>' +

            '<button type="button" onclick="CarromGame.toggleSide()" style="padding:6px 10px;border-radius:10px;border:2.5px solid #1e1e24;box-shadow:0 3px 0 #1e1e24;background:#ffd93d;font-family:inherit;font-size:0.78rem;font-weight:700;cursor:pointer;white-space:nowrap;">🔄 Side</button>' +

            '</div>' +

            makeController(2, 'carromTopSlider', topDisabled, true) +

            '<div style="position:relative;padding:4px;border-radius:16px;background:linear-gradient(145deg,#5c3317,#2e1709);border:3.5px solid #1e1e24;box-shadow:0 6px 0 #1e1e24;">' +

            '<canvas id="carromCanvas" width="480" height="480" style="width:100%;aspect-ratio:1/1;display:block;border-radius:10px;touch-action:none;"></canvas>' +

            '</div>' +

            makeController(1, 'carromBottomSlider', bottomDisabled, false) +

            '<div style="display:flex;gap:8px;margin-top:8px;">' +

            '<button type="button" onclick="CarromGame.openSetup()" style="flex:1;padding:9px;border-radius:12px;border:2.5px solid #1e1e24;background:#f4f5f9;font-family:inherit;font-weight:700;cursor:pointer;">⚙ Mode</button>' +

            '<button type="button" onclick="CarromGame.startMatch()" style="flex:1;padding:9px;border-radius:12px;border:2.5px solid #1e1e24;background:#ffd93d;font-family:inherit;font-weight:700;cursor:pointer;">↻ Restart</button>' +

            '</div>' +

            winOverlay;

        drawCanvas();
        bindCanvasTouch();
    }

    return {
        mount() {
            stopLoops();
            phase = 'setup';
            renderSetup();
        },

        openSetup() {
            stopLoops();
            phase = 'setup';
            renderSetup();
        },

        /** @param {string} m */
        setMode(m) {
            mode = m;
            renderSetup();
        },

        startMatch,
        setBaselinePosition,
        toggleSide
    };

})();

window.CarromGame = CarromGame;
