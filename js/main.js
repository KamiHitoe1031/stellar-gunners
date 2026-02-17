const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    input: {
        activePointers: 3
    },
    scene: [
        BootScene,
        PreloadScene,
        TitleScene,
        MenuScene,
        FormationScene,
        GameScene,
        UIScene,
        ResultScene,
        ScenarioScene,
        GalleryScene,
        EnhanceScene,
        ShopScene,
        TransformPotScene
    ]
};

const game = new Phaser.Game(config);
