const ChessGame = (() => {
    /**
     * @typedef {{ side: string, type: string }} ChessPiece
     * @typedef {{ fromR: number, fromC: number, toR: number, toC: number, isPromotion: boolean }} ChessMove
     */

    /** @type {{ [key: string]: string }} */
    const PIECE_LABEL = {
        k: 'KING',
        q: 'QUEEN',
        r: 'ROOK',
        b: 'BISHOP',
        n: 'KNIGHT',
        p: 'PAWN'
    };

    /** @type {{ [key: string]: number }} */
    const PIECE_VALUE = { p: 100, n: 320, b: 340, r: 500, q: 900, k: 20000 };

    let phase = 'setup';
    let mode = 'bot';
    let difficulty = 'medium'; // 'easy' | 'medium' | 'hard'
    let humanSide = 'w';
    let turn = 'w';
    let winnerSide = '';
    /** @type {(ChessPiece | null)[][]} */
    let board = [];
    /** @type {number[] | null} */
    let selected = null;
    /** @type {ChessMove[]} */
    let legalForSelected = [];
    let statusText = "White's Move";
    /** @type {number | null} */
    let botTimer = null;

    function clearBotTimer() {
        if (botTimer !== null) {
            clearTimeout(botTimer);
            botTimer = null;
        }
    }

    /** @param {string} winSide */
    function renderCheckmateCelebration(winSide) {
        const who = winSide === 'w' ? 'WHITE' : 'BLACK';
        const colors = ['#ff4757', '#ffa502', '#2ed573', '#1e90ff', '#ffd93d', '#a55eea'];

        const sparkles = Array.from({ length: 34 }, (_, i) => {
            const left = ((i * 31) % 96) + 2;
            const delay = ((i * 0.16) % 1.4).toFixed(2);
            const dur = (1.5 + (i % 5) * 0.3).toFixed(2);
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
                ';animation:chessMateSpark ' +
                dur +
                's linear ' +
                delay +
                's infinite;pointer-events:none;z-index:9998;"></span>'
            );
        }).join('');

        return (
            '<style>@keyframes chessMateSpark{0%{transform:translateY(-22px) rotate(0deg) scale(0.85);opacity:1;}85%{opacity:1;}100%{transform:translateY(105vh) rotate(540deg) scale(1.25);opacity:0;}}@keyframes mateBlast{0%{transform:scale(0.55) rotate(-4deg);opacity:0;}70%{transform:scale(1.07) rotate(1deg);opacity:1;}100%{transform:scale(1) rotate(0deg);opacity:1;}}</style>' +
            sparkles +
            '<div style="position:fixed;inset:0;background:rgba(12,14,24,0.82);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:18px;z-index:9999;">' +
            '<div style="width:100%;max-width:355px;background:linear-gradient(155deg,#241914,#121018);border:4px solid #ffd93d;border-radius:24px;padding:24px 18px;text-align:center;color:#fff;box-shadow:0 0 42px rgba(255,217,61,0.65), 0 10px 0 #000;animation:mateBlast 0.42s cubic-bezier(0.22,1,0.36,1) forwards;">' +
            '<div style="font-size:3.4rem;line-height:1;margin-bottom:8px;">♛⚡🏆</div>' +
            '<div style="font-size:1.65rem;font-weight:900;letter-spacing:1px;color:#ffd93d;text-shadow:0 3px 0 #000;">CHECKMATE!</div>' +
            '<div style="font-size:1.05rem;font-weight:800;color:#2ed573;margin-top:6px;">' +
            who +
            ' DOMINATES THE BOARD!</div>' +
            '<div style="font-size:0.88rem;font-weight:600;color:#e2e8f0;margin:6px 0 18px;">Victory sealed in style!</div>' +
            '<button type="button" onclick="ChessGame.startMatch()" style="width:100%;padding:13px;border-radius:14px;border:3px solid #1e1e24;box-shadow:0 4px 0 #1e1e24;background:linear-gradient(90deg,#ffd93d,#ffa502);color:#111;font-family:inherit;font-size:1.05rem;font-weight:900;cursor:pointer;">♟️ NEW MATCH</button>' +
            '</div></div>'
        );
    }

    /** @returns {(ChessPiece | null)[][]} */
    function createInitialBoard() {
        const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
        /** @type {(ChessPiece | null)[][]} */
        const grid = [];
        for (let r = 0; r < 8; r++) {
            /** @type {(ChessPiece | null)[]} */
            const row = [];
            for (let c = 0; c < 8; c++) {
                if (r === 0) row.push({ side: 'b', type: back[c] });
                else if (r === 1) row.push({ side: 'b', type: 'p' });
                else if (r === 6) row.push({ side: 'w', type: 'p' });
                else if (r === 7) row.push({ side: 'w', type: back[c] });
                else row.push(null);
            }
            grid.push(row);
        }
        return grid;
    }

    /** @param {number} r @param {number} c */
    function inBounds(r, c) {
        return r >= 0 && r < 8 && c >= 0 && c < 8;
    }

    /** @param {(ChessPiece | null)[][]} grid @param {string} side */
    function findKing(grid, side) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = grid[r][c];
                if (p && p.side === side && p.type === 'k') return [r, c];
            }
        }
        return null;
    }

    /** @param {(ChessPiece | null)[][]} grid @param {number} tr @param {number} tc @param {string} bySide */
    function isSquareAttacked(grid, tr, tc, bySide) {
        const pDir = bySide === 'w' ? -1 : 1;
        const pr = tr - pDir;
        if (inBounds(pr, tc - 1) && grid[pr][tc - 1]?.side === bySide && grid[pr][tc - 1]?.type === 'p') return true;
        if (inBounds(pr, tc + 1) && grid[pr][tc + 1]?.side === bySide && grid[pr][tc + 1]?.type === 'p') return true;

        const jumps = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
        for (const [dr, dc] of jumps) {
            if (inBounds(tr + dr, tc + dc) && grid[tr + dr][tc + dc]?.side === bySide && grid[tr + dr][tc + dc]?.type === 'n') return true;
        }

        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (!dr && !dc) continue;
                if (inBounds(tr + dr, tc + dc) && grid[tr + dr][tc + dc]?.side === bySide && grid[tr + dr][tc + dc]?.type === 'k') return true;
            }
        }

        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            let nr = tr + dr, nc = tc + dc;
            while (inBounds(nr, nc)) {
                const p = grid[nr][nc];
                if (p) {
                    if (p.side === bySide && (p.type === 'r' || p.type === 'q')) return true;
                    break;
                }
                nr += dr; nc += dc;
            }
        }

        for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
            let nr = tr + dr, nc = tc + dc;
            while (inBounds(nr, nc)) {
                const p = grid[nr][nc];
                if (p) {
                    if (p.side === bySide && (p.type === 'b' || p.type === 'q')) return true;
                    break;
                }
                nr += dr; nc += dc;
            }
        }
        return false;
    }

    /** @param {(ChessPiece | null)[][]} grid @param {string} side */
    function isInCheck(grid, side) {
        const kp = findKing(grid, side);
        if (!kp) return false;
        return isSquareAttacked(grid, kp[0], kp[1], side === 'w' ? 'b' : 'w');
    }

    /** @param {(ChessPiece | null)[][]} grid @param {number} r @param {number} c @returns {ChessMove[]} */
    function getPseudoMoves(grid, r, c) {
        const piece = grid[r][c];
        if (!piece) return [];
        /** @type {ChessMove[]} */
        const moves = [];
        const enemy = piece.side === 'w' ? 'b' : 'w';

        /** @param {number} tr @param {number} tc */
        const add = (tr, tc) => {
            if (!inBounds(tr, tc)) return;
            const occ = grid[tr][tc];
            const promo = piece.type === 'p' && (tr === 0 || tr === 7);
            if (!occ || occ.side === enemy) {
                moves.push({ fromR: r, fromC: c, toR: tr, toC: tc, isPromotion: promo });
            }
        };

        if (piece.type === 'p') {
            const dir = piece.side === 'w' ? -1 : 1;
            const startR = piece.side === 'w' ? 6 : 1;
            if (inBounds(r + dir, c) && !grid[r + dir][c]) {
                add(r + dir, c);
                if (r === startR && inBounds(r + dir * 2, c) && !grid[r + dir * 2][c]) add(r + dir * 2, c);
            }
            for (const dc of [-1, 1]) {
                if (inBounds(r + dir, c + dc) && grid[r + dir][c + dc]?.side === enemy) add(r + dir, c + dc);
            }
        } else if (piece.type === 'n') {
            for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) add(r + dr, c + dc);
        } else if (piece.type === 'k') {
            for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) add(r + dr, c + dc);
        } else {
            /** @type {number[][]} */
            const dirs = [];
            if (piece.type === 'r' || piece.type === 'q') dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
            if (piece.type === 'b' || piece.type === 'q') dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
            for (const [dr, dc] of dirs) {
                let nr = r + dr, nc = c + dc;
                while (inBounds(nr, nc)) {
                    const occ = grid[nr][nc];
                    if (!occ) add(nr, nc);
                    else { if (occ.side === enemy) add(nr, nc); break; }
                    nr += dr; nc += dc;
                }
            }
        }
        return moves;
    }

    /** @param {(ChessPiece | null)[][]} grid @param {ChessMove} m @returns {(ChessPiece | null)[][]} */
    function applyMove(grid, m) {
        const next = grid.map((/** @type {(ChessPiece | null)[]} */ row) =>
            row.map((/** @type {ChessPiece | null} */ cell) => (cell ? { side: cell.side, type: cell.type } : null))
        );
        const p = next[m.fromR][m.fromC];
        next[m.fromR][m.fromC] = null;
        if (p) {
            if (m.isPromotion) p.type = 'q';
            next[m.toR][m.toC] = p;
        }
        return next;
    }

    /** @param {(ChessPiece | null)[][]} grid @param {string} side @returns {ChessMove[]} */
    function getLegalMoves(grid, side) {
        /** @type {ChessMove[]} */
        const out = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (grid[r][c]?.side === side) {
                    for (const m of getPseudoMoves(grid, r, c)) {
                        if (!isInCheck(applyMove(grid, m), side)) out.push(m);
                    }
                }
            }
        }
        return out;
    }

    /** @param {(ChessPiece | null)[][]} grid @param {string} botSide */
    function evaluateBoard(grid, botSide) {
        let score = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = grid[r][c];
                if (!p) continue;
                const centerBonus = (3.5 - Math.abs(3.5 - r)) * 4 + (3.5 - Math.abs(3.5 - c)) * 4;
                const val = PIECE_VALUE[p.type] + centerBonus;
                score += p.side === botSide ? val : -val;
            }
        }
        return score;
    }

    function isBotTurn() {
        return phase === 'playing' && mode === 'bot' && turn !== humanSide;
    }

    function startMatch() {
        clearBotTimer();
        board = createInitialBoard();
        turn = 'w';
        winnerSide = '';
        selected = null;
        legalForSelected = [];
        phase = 'playing';
        statusText = mode === 'bot' ? (turn === humanSide ? 'Your Move' : 'Bot (' + difficulty.toUpperCase() + ')...') : "White's Move";
        renderBoard();
        scheduleBot();
    }

    /** @param {ChessMove} m */
    function commitMove(m) {
        if (phase !== 'playing') return;
        board = applyMove(board, m);
        selected = null;
        legalForSelected = [];
        const movedSide = turn;
        turn = turn === 'w' ? 'b' : 'w';
        if (window.SoundFX && window.SoundFX.click) window.SoundFX.click();

        const nextMoves = getLegalMoves(board, turn);
        const check = isInCheck(board, turn);

        if (nextMoves.length === 0) {
            phase = 'gameover';
            if (check) {
                winnerSide = movedSide;
                statusText = '🏆 Checkmate! ' + (movedSide === 'w' ? 'White' : 'Black') + ' Wins!';
                if (window.SoundFX && window.SoundFX.playTone) {
                    window.SoundFX.playTone(440, 880, 0.16, 'triangle');
                    setTimeout(() => window.SoundFX.playTone(880, 1174, 0.26, 'triangle'), 150);
                }
            } else {
                winnerSide = '';
                statusText = '🤝 Stalemate Draw!';
            }
            renderBoard();
            return;
        }

        const label = turn === 'w' ? 'White' : 'Black';
        statusText = (mode === 'bot' ? (turn === humanSide ? 'Your' : 'Bot (' + difficulty.toUpperCase() + ')') : label) + ' Move' + (check ? ' (Check!)' : '');
        renderBoard();
        scheduleBot();
    }

    function scheduleBot() {
        clearBotTimer();
        if (!isBotTurn()) return;
        botTimer = setTimeout(() => {
            const botSide = turn;
            const oppSide = botSide === 'w' ? 'b' : 'w';
            const myMoves = getLegalMoves(board, botSide);
            if (myMoves.length === 0) return;

            if (difficulty === 'easy') {
                const randMove = myMoves[Math.floor(Math.random() * myMoves.length)];
                commitMove(randMove);
                return;
            }

            let bestScore = -Infinity;
            /** @type {ChessMove[]} */
            let bestMoves = [];

            for (const m of myMoves) {
                const afterMy = applyMove(board, m);
                let score = evaluateBoard(afterMy, botSide);

                if (difficulty === 'hard') {
                    const oppMoves = getLegalMoves(afterMy, oppSide);
                    let worstReply = Infinity;
                    if (oppMoves.length === 0) {
                        worstReply = isInCheck(afterMy, oppSide) ? 99999 : 0;
                    } else {
                        for (const om of oppMoves) {
                            const ev = evaluateBoard(applyMove(afterMy, om), botSide);
                            if (ev < worstReply) worstReply = ev;
                        }
                    }
                    score = worstReply;
                } else {
                    score += Math.random() * 45;
                }

                if (score > bestScore) {
                    bestScore = score;
                    bestMoves = [m];
                } else if (Math.abs(score - bestScore) < 1e-6) {
                    bestMoves.push(m);
                }
            }

            const pick = bestMoves[Math.floor(Math.random() * bestMoves.length)] || myMoves[0];
            commitMove(pick);
        }, 380);
    }

    /** @param {number} r @param {number} c */
    function handleSquareClick(r, c) {
        if (phase !== 'playing' || isBotTurn()) return;
        if (selected) {
            const found = legalForSelected.find((m) => m.toR === r && m.toC === c);
            if (found) {
                commitMove(found);
                return;
            }
        }
        if (board[r][c]?.side === turn) {
            selected = [r, c];
            legalForSelected = getLegalMoves(board, turn).filter((m) => m.fromR === r && m.fromC === c);
            renderBoard();
        } else {
            selected = null;
            legalForSelected = [];
            renderBoard();
        }
    }

    /** @param {ChessPiece} p */
    function renderPieceHtml(p) {
        const isW = p.side === 'w';
        const isPawn = p.type === 'p';

        const pawnDot = isPawn
            ? '<span style="position:absolute;bottom:4px;left:5px;width:7px;height:7px;border-radius:50%;background:' +
              (isW ? '#3b5bfd' : '#ff9f1c') +
              ';border:1px solid #111;"></span>'
            : '';

        /** @type {{ [key: string]: { [key: string]: string } }} */
        const glyphMap = {
            w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
            b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
        };

        const glyph = glyphMap[p.side]?.[p.type] || '♙';

        return (
            '<div style="position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;pointer-events:none;">' +
            '<span style="font-size:clamp(1.85rem, 8.2vw, 2.9rem);line-height:1;transform:translateY(-2px);color:' +
            (isW ? '#fffdf5' : '#18181f') +
            ';text-shadow:' +
            (isW
                ? '0 2px 0 #8a7356, 0 5px 7px rgba(0,0,0,0.55)'
                : '0 2px 0 #000, 0 5px 7px rgba(0,0,0,0.7)') +
            ';">' +
            glyph +
            '</span>' +
            pawnDot +
            '</div>'
        );
    }

    function renderSetup() {
        const root = document.getElementById('chess-root');
        if (!root) return;

        const botOptions =
            mode === 'bot'
                ? '<div style="font-weight:700;margin-bottom:6px;">Bot Level:</div>' +
                  '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">' +
                  ['easy', 'medium', 'hard']
                      .map((lvl) => {
                          const active = difficulty === lvl;
                          const title = lvl === 'easy' ? 'Easy' : lvl === 'medium' ? 'Medium' : 'Expert';
                          return (
                              '<button type="button" onclick="ChessGame.setDifficulty(\'' +
                              lvl +
                              '\')" style="padding:11px 6px;border-radius:13px;border:3px solid #1e1e24;box-shadow:0 3px 0 #1e1e24;font-family:inherit;font-weight:700;cursor:pointer;background:' +
                              (active ? '#ffd93d' : '#fff') +
                              ';">' +
                              title +
                              '</button>'
                          );
                      })
                      .join('') +
                  '</div>' +
                  '<div style="font-weight:700;margin-bottom:6px;">Your Side:</div>' +
                  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">' +
                  '<button type="button" onclick="ChessGame.setHumanSide(\'w\')" style="padding:11px;border-radius:13px;border:3px solid #1e1e24;box-shadow:0 3px 0 #1e1e24;font-family:inherit;font-weight:700;cursor:pointer;background:' +
                  (humanSide === 'w' ? '#ffd93d' : '#fff') +
                  ';">♔ White</button>' +
                  '<button type="button" onclick="ChessGame.setHumanSide(\'b\')" style="padding:11px;border-radius:13px;border:3px solid #1e1e24;box-shadow:0 3px 0 #1e1e24;font-family:inherit;font-weight:700;cursor:pointer;background:' +
                  (humanSide === 'b' ? '#ffd93d' : '#fff') +
                  ';">♚ Black</button>' +
                  '</div>'
                : '';

        root.innerHTML =
            '<div style="text-align:left;padding:6px;">' +
            '<h2 style="text-align:center;font-size:1.6rem;margin-bottom:14px;">♟️ CHESS</h2>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">' +
            '<button type="button" onclick="ChessGame.setMode(\'bot\')" style="padding:12px;border-radius:14px;border:3px solid #1e1e24;box-shadow:0 3px 0 #1e1e24;font-family:inherit;font-weight:700;cursor:pointer;background:' +
            (mode === 'bot' ? '#3742fa' : '#fff') +
            ';color:' +
            (mode === 'bot' ? '#fff' : '#1e1e24') +
            ';">🤖 Bot</button>' +
            '<button type="button" onclick="ChessGame.setMode(\'human\')" style="padding:12px;border-radius:14px;border:3px solid #1e1e24;box-shadow:0 3px 0 #1e1e24;font-family:inherit;font-weight:700;cursor:pointer;background:' +
            (mode === 'human' ? '#2ed573' : '#fff') +
            ';color:' +
            (mode === 'human' ? '#fff' : '#1e1e24') +
            ';">👥 2P</button>' +
            '</div>' +
            botOptions +
            '<button type="button" onclick="ChessGame.startMatch()" style="width:100%;padding:15px;border-radius:16px;border:3px solid #1e1e24;box-shadow:0 5px 0 #1e1e24;background:#2ed573;color:#fff;font-family:inherit;font-size:1.25rem;font-weight:700;cursor:pointer;">▶ START</button>' +
            '</div>';
    }

    function renderBoard() {
        const root = document.getElementById('chess-root');
        if (!root) return;

        const flip = mode === 'bot' && humanSide === 'b';
        const targets = new Set(legalForSelected.map((m) => m.toR + ',' + m.toC));

        let sqHtml = '';
        for (let vr = 0; vr < 8; vr++) {
            for (let vc = 0; vc < 8; vc++) {
                const r = flip ? 7 - vr : vr;
                const c = flip ? 7 - vc : vc;
                const light = (r + c) % 2 === 0;
                const isSel = selected && selected[0] === r && selected[1] === c;
                const isTgt = targets.has(r + ',' + c);
                const p = board[r][c];

                const bg = isSel ? '#ffe066' : light ? '#ead7b7' : '#4a2e1b';
                const pHtml = p ? renderPieceHtml(p) : '';
                const dot = isTgt
                    ? p
                        ? '<span style="position:absolute;inset:5%;border:3px solid #2ed573;border-radius:8px;pointer-events:none;"></span>'
                        : '<span style="width:28%;height:28%;border-radius:50%;background:rgba(46,213,115,0.9);pointer-events:none;"></span>'
                    : '';

                sqHtml +=
                    '<button type="button" onclick="ChessGame.handleSquareClick(' +
                    r +
                    ',' +
                    c +
                    ')" style="position:relative;width:100%;height:100%;background:' +
                    bg +
                    ';border:none;padding:0;display:flex;align-items:center;justify-content:center;cursor:pointer;">' +
                    pHtml +
                    dot +
                    '</button>';
            }
        }

        const selName = selected && board[selected[0]][selected[1]] ? PIECE_LABEL[board[selected[0]][selected[1]]?.type || 'p'] : '';
        const mateOverlay = phase === 'gameover' && winnerSide ? renderCheckmateCelebration(winnerSide) : '';

        root.innerHTML =
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding:0 4px;">' +
            '<span style="font-weight:700;font-size:0.95rem;">' +
            statusText +
            (selName ? ' • ' + selName : '') +
            '</span>' +
            '<span style="padding:4px 10px;border-radius:10px;border:2px solid #1e1e24;font-weight:700;font-size:0.8rem;background:' +
            (turn === 'w' ? '#fff' : '#222') +
            ';color:' +
            (turn === 'w' ? '#111' : '#fff') +
            ';">' +
            (turn === 'w' ? '♔ WHITE' : '♚ BLACK') +
            '</span></div>' +
            '<div style="padding:10px 10px 16px;border-radius:16px;background:linear-gradient(180deg, #b08968 0%, #7f5539 100%);border:3.5px solid #1e1e24;box-shadow:0 8px 0 #3d2516, 0 11px 0 #1e1e24;">' +
            '<div style="width:100%;aspect-ratio:1/1;display:grid;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(8,1fr);border:3px solid #2b180c;border-radius:6px;overflow:hidden;box-shadow:inset 0 3px 8px rgba(0,0,0,0.45);">' +
            sqHtml +
            '</div></div>' +
            '<div style="display:flex;gap:8px;margin-top:10px;"><button type="button" onclick="ChessGame.openSetup()" style="flex:1;padding:9px;border-radius:12px;border:2.5px solid #1e1e24;background:#f4f5f9;font-family:inherit;font-weight:700;cursor:pointer;">⚙ Level</button><button type="button" onclick="ChessGame.startMatch()" style="flex:1;padding:9px;border-radius:12px;border:2.5px solid #1e1e24;background:#ffd93d;font-family:inherit;font-weight:700;cursor:pointer;">↻ Restart</button></div>' +
            mateOverlay;
    }

    return {
        mount() { clearBotTimer(); phase = 'setup'; renderSetup(); },
        openSetup() { clearBotTimer(); phase = 'setup'; renderSetup(); },
        /** @param {string} m */
        setMode(m) { mode = m; renderSetup(); },
        /** @param {string} lvl */
        setDifficulty(lvl) { difficulty = lvl; renderSetup(); },
        /** @param {string} s */
        setHumanSide(s) { humanSide = s; renderSetup(); },
        startMatch,
        handleSquareClick
    };
})();

window.ChessGame = ChessGame;