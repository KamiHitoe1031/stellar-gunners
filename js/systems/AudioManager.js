/**
 * AudioManager - Handles BGM and SFX playback
 * Uses Phaser's sound manager. Falls back gracefully when audio files are missing.
 */
class AudioManager {
    static _currentBGM = null;
    static _currentBGMKey = null;
    static _bgmVolume = 0.5;
    static _sfxVolume = 0.7;
    static _scene = null;

    static init(scene) {
        this._scene = scene;
        const save = SaveManager.load();
        this._bgmVolume = save.settings?.bgmVolume ?? 0.5;
        this._sfxVolume = save.settings?.sfxVolume ?? 0.7;
    }

    static playBGM(key) {
        if (!this._scene || !this._scene.sound) return;
        if (this._currentBGMKey === key) return;

        this.stopBGM();

        if (!this._scene.cache.audio.exists(key)) {
            return;
        }

        try {
            this._currentBGM = this._scene.sound.add(key, {
                loop: true,
                volume: this._bgmVolume
            });
            this._currentBGM.play();
            this._currentBGMKey = key;
        } catch (e) {
            console.warn('BGM play failed:', key, e);
        }
    }

    static stopBGM() {
        if (this._currentBGM) {
            this._currentBGM.stop();
            this._currentBGM.destroy();
            this._currentBGM = null;
            this._currentBGMKey = null;
        }
    }

    static playSFX(key) {
        if (!this._scene || !this._scene.sound) return;
        if (!this._scene.cache.audio.exists(key)) return;

        try {
            this._scene.sound.play(key, { volume: this._sfxVolume });
        } catch (e) {
            // SFX playback failed silently
        }
    }

    static setBGMVolume(vol) {
        this._bgmVolume = Math.max(0, Math.min(1, vol));
        if (this._currentBGM) {
            this._currentBGM.setVolume(this._bgmVolume);
        }
        this._saveSettings();
    }

    static setSFXVolume(vol) {
        this._sfxVolume = Math.max(0, Math.min(1, vol));
        this._saveSettings();
    }

    static _saveSettings() {
        const save = SaveManager.load();
        if (!save.settings) save.settings = {};
        save.settings.bgmVolume = this._bgmVolume;
        save.settings.sfxVolume = this._sfxVolume;
        SaveManager.save(save);
    }

    static getBGMVolume() { return this._bgmVolume; }
    static getSFXVolume() { return this._sfxVolume; }
}
