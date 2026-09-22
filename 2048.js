/* -------------------------------------------------------------
   2048 NEXT-LEVEL LOGIC & CONTROLS
   High Score, WASD + Arrow Keys, Touch Gestures, Animations, Win/Loss States
   ------------------------------------------------------------- */

let board;
let score = 0;
let bestScore = 0;
const rows = 4;
const columns = 4;
let won = false;
let continuePlaying = false;

// Touch tracking for mobile swipes
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

window.onload = function() {
    loadBestScore();
    initGame();
    setupControls();
};

function loadBestScore() {
    const saved = localStorage.getItem("2048_best_score");
    if (saved) {
        bestScore = parseInt(saved, 10) || 0;
    }
    updateScoreDisplays();
}

function saveBestScore() {
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem("2048_best_score", bestScore.toString());
    }
    updateScoreDisplays();
}

function updateScoreDisplays(bumpCurrent = false) {
    const scoreEl = document.getElementById("score");
    const bestEl = document.getElementById("best-score");
    if (scoreEl) {
        scoreEl.innerText = score;
        if (bumpCurrent) {
            scoreEl.classList.remove("score-bump");
            void scoreEl.offsetWidth; // trigger reflow
            scoreEl.classList.add("score-bump");
        }
    }
    if (bestEl) {
        bestEl.innerText = bestScore;
    }
}

function initGame() {
    score = 0;
    won = false;
    continuePlaying = false;
    hideOverlay();
    updateScoreDisplays();

    const boardEl = document.getElementById("board");
    boardEl.innerHTML = "";

    board = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            let tile = document.createElement("div");
            tile.id = `${r}-${c}`;
            updateTile(tile, 0);
            boardEl.appendChild(tile);
        }
    }

    // Spawn 2 initial tiles
    setRandomTile();
    setRandomTile();
}

function updateTile(tile, num, isMerged = false) {
    tile.innerText = "";
    tile.className = "tile";

    if (num > 0) {
        tile.innerText = num.toString();
        if (num <= 4096) {
            tile.classList.add("x" + num.toString());
        } else {
            tile.classList.add("x8192");
        }

        if (isMerged) {
            tile.classList.add("merged");
        }
    }
}

function copyBoard(grid) {
    return grid.map(row => [...row]);
}

function boardsEqual(b1, b2) {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            if (b1[r][c] !== b2[r][c]) return false;
        }
    }
    return true;
}

function filterZero(row) {
    return row.filter(num => num !== 0);
}

function slide(row) {
    row = filterZero(row);
    let gainedScore = 0;
    let mergedIndices = [];

    for (let i = 0; i < row.length - 1; i++) {
        if (row[i] === row[i + 1]) {
            row[i] *= 2;
            gainedScore += row[i];
            row[i + 1] = 0;
            mergedIndices.push(i);
        }
    }

    row = filterZero(row);
    while (row.length < columns) {
        row.push(0);
    }

    return { row, gainedScore, mergedIndices };
}

function slideLeft() {
    let moved = false;
    let gainedTotal = 0;

    for (let r = 0; r < rows; r++) {
        let oldRow = [...board[r]];
        let { row, gainedScore } = slide(board[r]);
        board[r] = row;
        gainedTotal += gainedScore;

        for (let c = 0; c < columns; c++) {
            let tile = document.getElementById(`${r}-${c}`);
            updateTile(tile, board[r][c]);
            if (oldRow[c] !== board[r][c]) moved = true;
        }
    }

    handleMoveResult(moved, gainedTotal);
}

function slideRight() {
    let moved = false;
    let gainedTotal = 0;

    for (let r = 0; r < rows; r++) {
        let oldRow = [...board[r]];
        let reversed = [...board[r]].reverse();
        let { row, gainedScore } = slide(reversed);
        board[r] = row.reverse();
        gainedTotal += gainedScore;

        for (let c = 0; c < columns; c++) {
            let tile = document.getElementById(`${r}-${c}`);
            updateTile(tile, board[r][c]);
            if (oldRow[c] !== board[r][c]) moved = true;
        }
    }

    handleMoveResult(moved, gainedTotal);
}

function slideUp() {
    let moved = false;
    let gainedTotal = 0;

    for (let c = 0; c < columns; c++) {
        let col = [board[0][c], board[1][c], board[2][c], board[3][c]];
        let oldCol = [...col];
        let { row, gainedScore } = slide(col);
        gainedTotal += gainedScore;

        for (let r = 0; r < rows; r++) {
            board[r][c] = row[r];
            let tile = document.getElementById(`${r}-${c}`);
            updateTile(tile, board[r][c]);
            if (oldCol[r] !== board[r][c]) moved = true;
        }
    }

    handleMoveResult(moved, gainedTotal);
}

function slideDown() {
    let moved = false;
    let gainedTotal = 0;

    for (let c = 0; c < columns; c++) {
        let col = [board[0][c], board[1][c], board[2][c], board[3][c]];
        let oldCol = [...col];
        col.reverse();
        let { row, gainedScore } = slide(col);
        row.reverse();
        gainedTotal += gainedScore;

        for (let r = 0; r < rows; r++) {
            board[r][c] = row[r];
            let tile = document.getElementById(`${r}-${c}`);
            updateTile(tile, board[r][c]);
            if (oldCol[r] !== board[r][c]) moved = true;
        }
    }

    handleMoveResult(moved, gainedTotal);
}

function handleMoveResult(moved, gainedScore) {
    if (!moved) return;

    if (gainedScore > 0) {
        score += gainedScore;
        saveBestScore();
        updateScoreDisplays(true);
    }

    // Spawn new tile
    setRandomTile();

    // Check for 2048 Win condition
    if (!won && !continuePlaying && hasTile(2048)) {
        won = true;
        showWinOverlay();
        return;
    }

    // Check for Game Over condition
    if (isGameOver()) {
        showGameOverOverlay();
    }
}

function setRandomTile() {
    if (!hasEmptyTile()) return;

    let emptyTiles = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            if (board[r][c] === 0) {
                emptyTiles.push({ r, c });
            }
        }
    }

    if (emptyTiles.length === 0) return;

    const randomIndex = Math.floor(Math.random() * emptyTiles.length);
    const { r, c } = emptyTiles[randomIndex];
    // 90% chance for 2, 10% chance for 4
    const value = Math.random() < 0.9 ? 2 : 4;
    board[r][c] = value;

    const tile = document.getElementById(`${r}-${c}`);
    if (tile) {
        updateTile(tile, value);
        tile.classList.add("pop");
    }
}

function hasEmptyTile() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            if (board[r][c] === 0) return true;
        }
    }
    return false;
}

function hasTile(targetVal) {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            if (board[r][c] >= targetVal) return true;
        }
    }
    return false;
}

function isGameOver() {
    if (hasEmptyTile()) return false;

    // Check horizontal neighbors
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns - 1; c++) {
            if (board[r][c] === board[r][c + 1]) return false;
        }
    }

    // Check vertical neighbors
    for (let c = 0; c < columns; c++) {
        for (let r = 0; r < rows - 1; r++) {
            if (board[r][c] === board[r + 1][c]) return false;
        }
    }

    return true;
}

function showGameOverOverlay() {
    const overlay = document.getElementById("overlay");
    const title = document.getElementById("overlay-title");
    const desc = document.getElementById("overlay-desc");
    const scoreVal = document.getElementById("overlay-score");
    const keepBtn = document.getElementById("keep-playing-btn");

    title.innerText = "Game Over!";
    title.classList.remove("win");
    desc.innerText = "No moves remaining on the board.";
    scoreVal.innerText = score;
    keepBtn.classList.add("hidden");

    overlay.classList.remove("hidden");
}

function showWinOverlay() {
    const overlay = document.getElementById("overlay");
    const title = document.getElementById("overlay-title");
    const desc = document.getElementById("overlay-desc");
    const scoreVal = document.getElementById("overlay-score");
    const keepBtn = document.getElementById("keep-playing-btn");

    title.innerText = "You Win! 🎉";
    title.classList.add("win");
    desc.innerText = "Incredible! You reached the legendary 2048 tile.";
    scoreVal.innerText = score;
    keepBtn.classList.remove("hidden");

    overlay.classList.remove("hidden");
}

function hideOverlay() {
    const overlay = document.getElementById("overlay");
    if (overlay) {
        overlay.classList.add("hidden");
    }
}

function setupControls() {
    // Keyboard controls
    document.addEventListener("keydown", (e) => {
        const overlay = document.getElementById("overlay");
        const isOverlayVisible = overlay && !overlay.classList.contains("hidden");

        // Prevent window scrolling on arrow keys & space
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
            e.preventDefault();
        }

        if (isOverlayVisible && !won) return;

        switch (e.code) {
            case "ArrowLeft":
            case "KeyA":
                slideLeft();
                break;
            case "ArrowRight":
            case "KeyD":
                slideRight();
                break;
            case "ArrowUp":
            case "KeyW":
                slideUp();
                break;
            case "ArrowDown":
            case "KeyS":
                slideDown();
                break;
        }
    });

    // Touch gesture swipe support
    const boardContainer = document.querySelector(".board-container");
    if (boardContainer) {
        boardContainer.addEventListener("touchstart", (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        boardContainer.addEventListener("touchend", (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            handleSwipe();
        }, { passive: true });
    }

    // Button controls
    const restartBtn = document.getElementById("restart-btn");
    const overlayRestartBtn = document.getElementById("overlay-restart-btn");
    const keepPlayingBtn = document.getElementById("keep-playing-btn");

    if (restartBtn) restartBtn.addEventListener("click", initGame);
    if (overlayRestartBtn) overlayRestartBtn.addEventListener("click", initGame);
    if (keepPlayingBtn) {
        keepPlayingBtn.addEventListener("click", () => {
            continuePlaying = true;
            hideOverlay();
        });
    }
}

function handleSwipe() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const minSwipeDistance = 35;

    if (Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) {
        return; // Too small to be a swipe
    }

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0) {
            slideRight();
        } else {
            slideLeft();
        }
    } else {
        if (deltaY > 0) {
            slideDown();
        } else {
            slideUp();
        }
    }
}