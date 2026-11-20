const SoundFX = (() => {
    let enabled = true;
    let volume = 0.8;
    /** @type {AudioContext | null} */
    let audioCtx = null;

    function ensureContext() {
        if (!audioCtx) {
            /** @type {any} */
            const w = window;
            const Ctx = w.AudioContext || w.webkitAudioContext;
            if (Ctx) audioCtx = new Ctx();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
    }

    /**
     * @param {number} [startFreq=520]
     * @param {number} [endFreq=220]
     * @param {number} [duration=0.08]
     * @param {OscillatorType} [type='sine']
     */
    function playTone(startFreq = 520, endFreq = 220, duration = 0.08, type = 'sine') {
        if (!enabled || volume <= 0) return;
        ensureContext();
        if (!audioCtx) return;

        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);

        gain.gain.setValueAtTime(volume * 0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + duration);
    }

    function click() {
        playTone(540, 210, 0.075, 'triangle');
    }

    function back() {
        playTone(360, 160, 0.09, 'sine');
    }

    function toggle() {
        enabled = !enabled;
        const btn = document.getElementById('soundToggle');
        if (btn) {
            btn.textContent = enabled ? 'ON' : 'OFF';
            btn.classList.toggle('muted', !enabled);
        }
        if (enabled) click();
    }

    /**
     * @param {number | string} val
     */
    function setVolume(val) {
        const num = Number(val);
        volume = Math.max(0, Math.min(1, num / 100));
        const label = document.getElementById('volumeLabel');
        if (label) label.textContent = `${num}%`;
        if (enabled && num > 0) playTone(460, 260, 0.05, 'sine');
    }

    return {
        click,
        back,
        playTone,
        toggle,
        setVolume
    };
})();

/** @type {any} */ (window).SoundFX = SoundFX;