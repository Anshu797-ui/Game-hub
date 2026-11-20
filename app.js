/** @typedef {'screen-home' | 'screen-select' | 'screen-ludo' | 'screen-chess' | 'screen-carrom'} ScreenId */

const AppRouter = (() => {
    /** @type {ScreenId[]} */
    const stack = ['screen-home'];

    /**
     * @param {ScreenId} screenId
     */
    function syncTopBar(screenId) {
        const topBar = document.getElementById('topBar');
        if (!topBar) return;

        // First page ('screen-home') has NO top bar; all other screens show Back + Settings
        if (screenId === 'screen-home') {
            topBar.classList.remove('visible');
        } else {
            topBar.classList.add('visible');
        }
    }

    /**
     * @param {ScreenId} screenId
     * @param {boolean} [onMountGame=true]
     */
    function renderScreen(screenId, onMountGame = true) {
        document.querySelectorAll('.screen').forEach((el) => {
            el.classList.remove('active');
        });

        const target = document.getElementById(screenId);
        if (target) {
            target.classList.add('active');
        }

        syncTopBar(screenId);

        if (onMountGame) {
            /** @type {any} */
            const w = window;
            if (screenId === 'screen-ludo' && w.LudoGame?.mount) {
                w.LudoGame.mount();
            } else if (screenId === 'screen-chess' && w.ChessGame?.mount) {
                w.ChessGame.mount();
            } else if (screenId === 'screen-carrom' && w.CarromGame?.mount) {
                w.CarromGame.mount();
            }
        }
    }

    /**
     * @param {ScreenId} screenId
     */
    function navigate(screenId) {
        /** @type {any} */
        const w = window;
        w.SoundFX?.click?.();

        const current = stack[stack.length - 1];
        if (current !== screenId) {
            stack.push(screenId);
            history.pushState({ screen: screenId, depth: stack.length }, '', `#${screenId}`);
        }
        renderScreen(screenId, true);
    }

    function goBack() {
        /** @type {any} */
        const w = window;
        w.SoundFX?.back?.();

        const modal = document.getElementById('settingsModal');
        if (modal && modal.classList.contains('open')) {
            closeSettings();
            return;
        }

        if (stack.length > 1) {
            history.back();
        }
    }

    function openSettings() {
        /** @type {any} */
        const w = window;
        w.SoundFX?.click?.();

        const modal = document.getElementById('settingsModal');
        if (modal) modal.classList.add('open');
    }

    function closeSettings() {
        /** @type {any} */
        const w = window;
        w.SoundFX?.click?.();

        const modal = document.getElementById('settingsModal');
        if (modal) modal.classList.remove('open');
    }

    // Handles phone/browser Back & history pop events cleanly
    window.addEventListener('popstate', () => {
        const modal = document.getElementById('settingsModal');
        if (modal && modal.classList.contains('open')) {
            modal.classList.remove('open');
            history.pushState({ screen: stack[stack.length - 1] }, '', `#${stack[stack.length - 1]}`);
            return;
        }

        if (stack.length > 1) {
            stack.pop();
            const prevScreen = stack[stack.length - 1];
            renderScreen(prevScreen, true);
        } else {
            renderScreen('screen-home', false);
        }
    });

    function init() {
        history.replaceState({ screen: 'screen-home', depth: 1 }, '', '#screen-home');
        renderScreen('screen-home', false);
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        navigate,
        goBack,
        openSettings,
        closeSettings
    };
})();

/** @type {any} */ (window).AppRouter = AppRouter;