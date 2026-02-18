# CLAUDE.md - Stellar Gunners 開発ガイド

## プロジェクト概要

Stellar Gunners（ステラガンナーズ）は、ガール・カフェ・ガンのバトル・装備・強化システムを2Dトップダウンに落とし込んだ弾幕シューティングRPGのブラウザゲームです。

## 技術スタック

- **フレームワーク**: Phaser 3.80+ (CDN読み込み、ビルドツール不使用)
- **言語**: JavaScript (ES6+)
- **データ**: JSON (assets/data/)
- **保存**: localStorage
- **サーバー**: 不要（静的ファイルのみ）

## ディレクトリ構成

```
stellar-gunners/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── main.js                    # Phaser設定・起動
│   ├── constants.js               # ゲーム定数
│   ├── scenes/
│   │   ├── BootScene.js           # 最小アセット読込
│   │   ├── PreloadScene.js        # 全アセット読込
│   │   ├── TitleScene.js          # タイトル画面
│   │   ├── MenuScene.js           # メインメニュー
│   │   ├── FormationScene.js      # 編成画面
│   │   ├── ScenarioScene.js       # シナリオ再生（ノベルパート）
│   │   ├── GameScene.js           # メインバトル
│   │   ├── UIScene.js             # バトルHUD（並列起動）
│   │   ├── ResultScene.js         # リザルト画面
│   │   ├── GalleryScene.js        # 回想ギャラリー
│   │   ├── EnhanceScene.js        # 強化画面
│   │   └── ShopScene.js           # ショップ画面
│   ├── objects/
│   │   ├── Player.js              # プレイヤーキャラクラス（スプライトアニメ対応）
│   │   ├── Enemy.js               # 敵基底クラス（スプライトアニメ対応）
│   │   ├── Boss.js                # ボスクラス（Enemyを継承）
│   │   ├── Bullet.js              # 弾クラス
│   │   ├── BulletPool.js          # 弾オブジェクトプール
│   │   ├── EnemyPool.js           # 敵オブジェクトプール
│   │   ├── HealthBar.js           # HPバークラス
│   │   └── Obstacle.js            # 障害物クラス（壁・バリケード・柱・箱）
│   ├── systems/
│   │   ├── DamageSystem.js        # ダメージ計算（属性相性含む）
│   │   ├── ShieldSystem.js        # シールド管理
│   │   ├── BreakSystem.js         # ブレイクゲージ管理
│   │   ├── SkillSystem.js         # スキル発動・クールダウン
│   │   ├── WaveManager.js         # エリアベースウェーブ管理
│   │   ├── DropSystem.js          # ドロップ報酬生成
│   │   ├── SaveManager.js         # localStorage保存/読込
│   │   ├── EquipmentSystem.js     # 装備・強化計算
│   │   ├── ObstacleManager.js     # 障害物配置・管理
│   │   └── ScenarioManager.js     # シナリオ再生・スキップ・既読管理
│   ├── ui/
│   │   ├── SkillButton.js         # スキルボタンUI
│   │   ├── PartyHUD.js            # パーティHP/Shield表示
│   │   ├── BossHUD.js             # ボスHP/ブレイク表示
│   │   ├── TextWindow.js          # シナリオ用テキストウィンドウ
│   │   └── BackLog.js             # シナリオ用バックログ
│   └── events/
│       └── EventsCenter.js        # シーン間通信
├── assets/
│   ├── images/
│   │   ├── characters/            # キャラスプライトシート
│   │   ├── portraits/             # キャラ立ち絵（シナリオ用）
│   │   ├── enemies/               # 敵スプライトシート
│   │   ├── bullets/               # 弾スプライト
│   │   ├── effects/               # エフェクト
│   │   ├── ui/                    # UIアセット
│   │   ├── tilesets/              # タイルセット
│   │   ├── backgrounds/           # 背景画像（バトル用＋シナリオ用）
│   │   └── thumbnails/            # ギャラリーサムネイル
│   ├── audio/
│   │   ├── bgm/
│   │   └── sfx/
│   └── data/
│       ├── characters.json
│       ├── weapons.json
│       ├── modules.json
│       ├── enemies.json
│       ├── stages.json
│       ├── scenarios.json         # シナリオテキストデータ
│       ├── scenario_gallery.json  # ギャラリー定義データ
│       ├── weapon_parts.json
│       ├── drop_tables.json
│       └── progression.json
└── docs/
    └── game_spec.md               # 仕様書
```

## コーディング規約

### シーンの書き方

```javascript
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    // 必ずinit()でステートをリセット（再起動対策）
    init(data) {
        this.stageId = data.stageId;
        this.partyData = data.party;
        this.isPaused = false;
        this.waveIndex = 0;
    }

    preload() { }

    create() {
        // UIシーンを並列起動
        this.scene.launch('UIScene', { party: this.partyData });

        // シャットダウン時のクリーンアップ
        this.events.once('shutdown', this.cleanup, this);
    }

    update(time, delta) {
        if (this.isPaused) return;
        // deltaTimeベースで物理計算
    }

    cleanup() {
        // イベントリスナー解除、タイマー停止
    }
}
```

### オブジェクトプール（必須）

弾と敵は必ずオブジェクトプールを使用。毎フレームのnew/destroyは禁止。

```javascript
// 弾プール - 事前に200個生成
this.playerBullets = new BulletPool(this, 'bullet_player', 200);
this.enemyBullets = new BulletPool(this, 'bullet_enemy', 300);

// 敵プール - 事前に30個生成
this.enemies = new EnemyPool(this, 30);
```

### シーン間通信

```javascript
// EventsCenter.js
import Phaser from 'phaser';
const eventsCenter = new Phaser.Events.EventEmitter();

// 定義済みイベント名
const GameEvents = {
    DAMAGE_DEALT: 'damage-dealt',
    SHIELD_CHANGED: 'shield-changed',
    HP_CHANGED: 'hp-changed',
    BREAK_CHANGED: 'break-changed',
    SKILL_USED: 'skill-used',
    WAVE_CLEARED: 'wave-cleared',
    STAGE_CLEARED: 'stage-cleared',
    GAME_OVER: 'game-over',
    SCORE_UPDATED: 'score-updated',
    CHAR_SWITCHED: 'char-switched',
    SCENARIO_LINE: 'scenario-line',
    SCENARIO_COMPLETE: 'scenario-complete',
    GALLERY_UNLOCKED: 'gallery-unlocked'
};
```

## 重要な設計ルール

### 1. ダメージ計算式

```
最終ダメージ = (ATK × スキル倍率 + 武器ダメージ補正) 
             × 属性相性倍率 
             × (1 - DEF / (DEF + 200))
             × 会心倍率（会心時のみ）
             × ランダム変動(0.95〜1.05)

属性相性倍率:
  有利 = 1.3
  不利 = 0.7
  同属性/無関係 = 1.0

会心判定:
  乱数 < CritRate → ダメージ × (CritDmg / 100)
```

### 2. シールド→HPの順番

```
function applyDamage(party, damage) {
    // 1. シールドから先に削る
    if (party.shield > 0) {
        const absorbed = Math.min(party.shield, damage);
        party.shield -= absorbed;
        damage -= absorbed;
    }
    // 2. 残りダメージをアクティブキャラのHPから
    if (damage > 0) {
        activeChar.hp -= damage;
        if (activeChar.hp <= 0) {
            // キャラ戦闘不能→次のキャラに切替
        }
    }
}
```

### 3. 属性判定マップ

```javascript
const ATTRIBUTE_CHART = {
    bio:       { strongVs: 'psychic',  weakVs: 'machine' },
    psychic:   { strongVs: 'machine',  weakVs: 'bio' },
    machine:   { strongVs: 'bio',      weakVs: 'psychic' },
    corrosion: { strongVs: 'immunity', weakVs: 'immunity' },
    immunity:  { strongVs: 'corrosion', weakVs: 'corrosion' }
};
```

### 4. 武器種ごとの射撃パラメータ

```javascript
const WEAPON_CONFIGS = {
    pistol:         { range: 250, fireRate: 5.0,  magazineSize: 12, reloadTime: 1200, spreadAngle: 3 },
    assault_rifle:  { range: 300, fireRate: 6.0,  magazineSize: 30, reloadTime: 1800, spreadAngle: 5 },
    shotgun:        { range: 150, fireRate: 1.2,  magazineSize: 6,  reloadTime: 2000, spreadAngle: 25, pelletsPerShot: 5 },
    sniper_rifle:   { range: 450, fireRate: 0.8,  magazineSize: 5,  reloadTime: 2500, spreadAngle: 0, piercing: true },
    launcher:       { range: 280, fireRate: 0.6,  magazineSize: 3,  reloadTime: 3000, spreadAngle: 0, explosionRadius: 60 }
};
```

### 5. 保存データ構造

```javascript
const SAVE_KEY = 'stellar_gunners_save';

const defaultSaveData = {
    version: 2,
    player: {
        name: 'Commander',
        level: 1,
        exp: 0,
        stamina: 120,
        lastStaminaRefill: Date.now(),
        credits: 1000,
        gems: 0
    },
    characters: {
        // "chr_01_normal": { level: 1, exp: 0, breakthroughCount: 0, awakening: 0 }
    },
    weapons: {
        // インベントリ配列
    },
    modules: {
        // インベントリ配列
    },
    equipment: {
        // "chr_01_normal": { weaponId: null, modules: [null, null, null, null], subChars: [null, null, null] }
    },
    progress: {
        currentChapter: 1,
        clearedStages: {},  // "stage_1_1": { stars: 3, bestTime: 120 }
        staminaSpent: 0
    },
    inventory: {
        // アイテムID: 個数
    },
    readScenarios: {
        // "scenario_1_1": [1, 2, 3, 4, 5, 6, 7]  // 既読seqNoの配列
    },
    gallery: {
        unlockedIds: []  // アンロック済みギャラリーID
    },
    settings: {
        bgmVolume: 0.5,
        sfxVolume: 0.7,
        skipMode: 'all'  // 'all' | 'read_only'
    }
};
```

### 6. シナリオシステムの実装

#### ScenarioScene の基本構造

```javascript
class ScenarioScene extends Phaser.Scene {
    constructor() {
        super('ScenarioScene');
    }

    init(data) {
        this.scenarioId = data.scenarioId;       // 再生するシナリオID
        this.onComplete = data.onComplete || {};  // 完了後の遷移先 { scene: 'GameScene', data: {...} }
        this.isGalleryMode = data.isGallery || false; // ギャラリーからの再生か
        this.currentIndex = 0;
        this.isAutoMode = false;
        this.isSkipping = false;
        this.textComplete = false;
        this.backLog = [];
    }

    create() {
        // scenariosデータからscenarioIdに一致する行をseqNo順で取得
        const allScenarios = this.cache.json.get('scenarios');
        this.scenarioData = allScenarios
            .filter(s => s.scenarioId === this.scenarioId)
            .sort((a, b) => a.seqNo - b.seqNo);

        if (this.scenarioData.length === 0) {
            this.completeScenario();
            return;
        }

        this.createUI();
        this.showLine(0);
    }

    showLine(index) {
        const line = this.scenarioData[index];
        // 背景変更（bgKeyが空でなければ）
        // BGM変更（bgmKeyが空でなければ）
        // SE再生（sfxKeyが空でなければ）
        // エフェクト実行（effectが空でなければ）
        // 立ち絵表示（speakerSpriteKey + expression）
        // テキスト表示（1文字ずつタイプライター表示、30ms/文字）
        // バックログに追加
        // 既読フラグ保存（SaveManager.markAsRead）
    }

    advanceLine() {
        if (!this.textComplete) { /* テキスト全表示 */ return; }
        this.currentIndex++;
        if (this.currentIndex >= this.scenarioData.length) {
            this.completeScenario();
        } else {
            this.showLine(this.currentIndex);
        }
    }

    skipAll() {
        this.completeScenario(); // 全スキップ: 即遷移
    }

    skipRead() {
        // 既読スキップ: 既読seqNoは50msで高速送り、未読で停止
    }

    completeScenario() {
        if (this.isGalleryMode) {
            this.scene.start('GalleryScene');
        } else {
            this.scene.start(this.onComplete.scene, this.onComplete.data);
        }
    }
}
```

#### テキストウィンドウ (ui/TextWindow.js)

```javascript
class TextWindow {
    constructor(scene) {
        this.scene = scene;
        this.bg = scene.add.rectangle(400, 520, 760, 160, 0x000000, 0.75)
            .setScrollFactor(0).setDepth(100);
        this.nameText = scene.add.text(60, 450, '', {
            fontSize: '20px', fontFamily: 'Arial', color: '#FFD700'
        }).setScrollFactor(0).setDepth(101);
        this.bodyText = scene.add.text(60, 480, '', {
            fontSize: '16px', fontFamily: 'Arial', color: '#FFFFFF',
            wordWrap: { width: 680 }, lineSpacing: 6
        }).setScrollFactor(0).setDepth(101);
    }

    showText(speaker, text, onComplete) {
        this.nameText.setText(speaker || '');
        this.bodyText.setText('');
        let i = 0;
        this.typeTimer = this.scene.time.addEvent({
            delay: 30, callback: () => {
                this.bodyText.setText(text.substring(0, ++i));
                if (i >= text.length) { this.typeTimer.remove(); onComplete(); }
            }, loop: true
        });
    }

    showAllText(text) {
        if (this.typeTimer) this.typeTimer.remove();
        this.bodyText.setText(text);
    }
}
```

#### ステージ→シナリオ→バトルの遷移フロー

```javascript
// ステージ選択時
startStage(stageData, partyData) {
    if (stageData.scenarioId && stageData.scenarioId !== '') {
        this.scene.start('ScenarioScene', {
            scenarioId: stageData.scenarioId,
            onComplete: { scene: 'GameScene', data: { stageId: stageData.id, party: partyData } }
        });
    } else {
        this.scene.start('GameScene', { stageId: stageData.id, party: partyData });
    }
}
```

#### 既読管理（SaveManager に追加）

```javascript
markAsRead(scenarioId, seqNo) {
    const save = this.load();
    if (!save.readScenarios) save.readScenarios = {};
    if (!save.readScenarios[scenarioId]) save.readScenarios[scenarioId] = [];
    if (!save.readScenarios[scenarioId].includes(seqNo)) {
        save.readScenarios[scenarioId].push(seqNo);
    }
    this.save(save);
}

isRead(scenarioId, seqNo) {
    const save = this.load();
    return save.readScenarios?.[scenarioId]?.includes(seqNo) || false;
}
```

#### ギャラリーのアンロック（GalleryScene）

```javascript
// ステージクリア時にギャラリーアンロック
unlockGallery(stageId) {
    const gallery = this.cache.json.get('scenario_gallery');
    const save = SaveManager.load();
    gallery.forEach(entry => {
        if (entry.unlockCondition === stageId + '_clear') {
            if (!save.gallery.unlockedIds.includes(entry.galleryId)) {
                save.gallery.unlockedIds.push(entry.galleryId);
            }
        }
    });
    SaveManager.save(save);
}
```

## マスターデータ管理

### マスターデータExcelの構成

マスターデータは `stellar_gunners_masterdata.xlsx` で管理する。

| シート名 | エクスポート先 | 内容 |
|---------|-------------|------|
| characters | characters.json | キャラ全データ（ステータス、スキル、成長値） |
| weapons | weapons.json | 武器（ATK、サブ属性、武器スキル） |
| modules | modules.json | モジュール（主効果、付加属性） |
| enemies | enemies.json | 敵（ステータス、攻撃パターン、報酬） |
| stages | stages.json | ステージ（ウェーブ構成、ドロップ、シナリオID） |
| progression | progression.json | レベル進行（必要XP、電力ボーナス） |
| weapon_parts | weapon_parts.json | 武器部品（スロット、品質、サブ属性範囲） |
| scenarios | scenarios.json | シナリオテキスト（話者、セリフ、演出） |
| scenario_gallery | scenario_gallery.json | ギャラリー定義（アンロック条件） |
| drop_tables | drop_tables.json | ドロップテーブル（アイテム確率） |
| enum_definitions | **エクスポート不要** | 列挙型の参照用（属性、タイプ等） |

### Excel → JSON 変換スクリプト（export_masterdata.py）

Claude Codeが作成すべきスクリプト:

```python
import json, sys
import openpyxl

SKIP_SHEETS = ['enum_definitions']

def excel_to_json(xlsx_path, output_dir, target_sheets=None):
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    
    for sheet_name in wb.sheetnames:
        if sheet_name in SKIP_SHEETS:
            continue
        if target_sheets and sheet_name not in target_sheets:
            continue
        
        ws = wb[sheet_name]
        headers = [cell.value for cell in ws[1]]
        data = []
        
        for row in ws.iter_rows(min_row=2, values_only=True):
            if row[0] is None:  # ID列が空→スキップ
                continue
            obj = {}
            for header, value in zip(headers, row):
                if value is None:
                    obj[header] = ''
                elif isinstance(value, float) and value == int(value):
                    obj[header] = int(value)
                else:
                    obj[header] = value
            data.append(obj)
        
        output_path = f'{output_dir}/{sheet_name}.json'
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f'{sheet_name}: {len(data)} rows → {output_path}')

if __name__ == '__main__':
    xlsx = sys.argv[1]
    outdir = sys.argv[2]
    sheets = sys.argv[3].split(',') if len(sys.argv) > 3 else None
    excel_to_json(xlsx, outdir, sheets)
```

**変換ルール:**
- ID列（1列目）が空の行はスキップ
- 小数点.0で終わる数値はintに変換
- 空セルは空文字列 `""` に変換（undefinedにしない）
- enum_definitionsシートはスキップ（参照専用）
- 出力先は `assets/data/`

### データ整合性バリデーション（validate_masterdata.py）

Claude Codeが作成すべきスクリプト:

```python
def validate(data_dir):
    errors = []
    # 1. stages.wave内の敵IDがenemies.jsonに存在するか
    # 2. stages.scenarioIdがscenarios.jsonに存在するか（空でない場合）
    # 3. scenarios.speakerSpriteKeyがcharacters.jsonに存在するか（空でない場合）
    # 4. scenario_gallery.scenarioIdがscenarios.jsonに存在するか
    # 5. enemies.dropTableのIDがdrop_tables.jsonに存在するか
    # 6. 全シートのID列に重複がないか
    # 7. characters.weaponTypeがenumの有効値か
    return errors
```

### マスターデータ更新ワークフロー

```
1. ユーザーがExcelでデータ編集 → アップロード
2. Claude Code: python export_masterdata.py masterdata.xlsx assets/data/
3. Claude Code: python validate_masterdata.py assets/data/
4. エラーがあれば修正してやり直し
5. ゲーム再起動でJSONを再読み込み
```

## マルチエリアシステム

### 概要
ステージは複数のエリアで構成され、各エリアには独自の背景テーマ、障害物レイアウト、敵ウェーブがある。

### stages.json のエリア形式
```json
{
  "id": "stage_1_1",
  "areas": [
    {
      "bgTheme": "city",
      "layout": "sparse",
      "areaName": "市街地外縁",
      "waves": ["enemy_drone_01:3,enemy_soldier_01:2", "enemy_soldier_01:4"]
    },
    {
      "bgTheme": "city_interior",
      "layout": "moderate",
      "areaName": "ビル内部",
      "waves": ["enemy_elite_01:1,enemy_soldier_01:3"]
    }
  ]
}
```

### エリア遷移フロー
1. 全ウェーブクリア → `AREA_CLEARED` イベント
2. 2秒後にポータル出現（緑色パルス+EXITテキスト）
3. プレイヤー接触 or 8秒タイムアウトで遷移
4. カメラフェードアウト → 敵/弾リセット → 背景/障害物切替 → フェードイン
5. 最終エリアクリアで `STAGE_CLEARED`

### 背景テーマ
`city`, `city_interior`, `city_ruins`, `lab`, `lab_corridor`, `underground`, `boss_arena`

### 障害物レイアウト
`open`(0個), `sparse`(4個), `moderate`(8個), `corridor`(12個), `pillars`(6個), `arena`(4個), `bunker`(10個)

## 障害物システム

### 障害物タイプ（constants.js: OBSTACLE_TYPES）
| タイプ | サイズ | 破壊可能 | HP |
|--------|--------|----------|-----|
| wall | 64x16 | No | - |
| barricade | 48x12 | Yes | 300 |
| pillar | 24x24 | No | - |
| crate | 32x32 | Yes | 150 |

### 物理コリジョン
- プレイヤー/敵: 障害物と衝突（通過不可）
- 弾: 障害物に当たると消滅（piercing弾は通過）
- 破壊可能障害物: 弾ダメージでHP減少→0で破壊

## スプライトアニメーション

### キャラクター（13フレーム スプライトシート）
| フレーム | 状態 | 説明 |
|---------|------|------|
| 0-2 | idle | ゆっくり上下ボブ |
| 3-6 | walk | 脚交互動作 |
| 7-8 | fire | 腕伸ばし→戻り+マズルフラッシュ |
| 9 | hit | 赤オーバーレイ+横ずれ |
| 10-12 | death | 段階的フェードアウト |

### 敵（8フレーム スプライトシート）
| フレーム | 状態 | 説明 |
|---------|------|------|
| 0-1 | idle | 微動ボブ |
| 2-4 | walk | 移動アニメ |
| 5 | hit | 赤フラッシュ |
| 6-7 | death | フェード+沈み |

### アニメFPS（constants.js: ANIM_FPS）
idle:4, walk:8, fire:12, hit:10, death:6

## 実装上の注意

### やるべきこと
- **変数初期化はinit()で**（constructorではリスタート時にリセットされない）
- **アセットはpreload()で読み込み**、create()以降で使用
- **物理ボディはthis.physics.add.sprite()**を使う
- **弾・敵はオブジェクトプール必須**（getFirstDead(false)でリサイクル）
- **シーン間通信はEventEmitter**（直接参照を避ける）
- **数値はconstants.jsで一元管理**
- **ゲームデータはJSONファイルから読み込み**（ハードコード禁止）
- **タッチボタンにはsetScrollFactor(0)**でカメラ固定
- **開発時はdebug: true**で当たり判定を可視化
- **deltaTimeベース**でフレームレート非依存にする

### やってはいけないこと
- 毎フレームでnew/destroyを使う（GC問題）
- preload()以外でのload呼び出し（load.start()なしで）
- 物理ボディなしのスプライトでsetVelocity()
- シーンのコンストラクタに状態を持つ（init()を使う）
- テキストのフォントサイズをpx指定以外で書く
- file://でテスト（CORS問題→ローカルサーバー必須）

## Phase 1 MVP チェックリスト

```
Phase 1 実装順序:

□ 1. index.html + main.js + 基本シーン構造
□ 2. BootScene + PreloadScene（プレースホルダアセット読み込み）
□ 3. TitleScene（クリックで開始）
□ 4. GameScene基盤:
   □ 4a. プレイヤー移動（WASD/矢印キー）
   □ 4b. オートエイム射撃（最寄り敵へ自動発射）
   □ 4c. 弾オブジェクトプール
□ 5. 敵システム:
   □ 5a. 敵オブジェクトプール
   □ 5b. 敵AI（プレイヤー追尾＋射撃）
   □ 5c. 敵の弾幕パターン
□ 6. ダメージシステム:
   □ 6a. シールド→HP二重耐久
   □ 6b. 属性相性ダメージ計算
   □ 6c. 敵撃破→XP/クレジットドロップ
□ 7. UIScene:
   □ 7a. パーティHP/Shield表示
   □ 7b. ミニマップ or 矢印ナビ
□ 8. ウェーブシステム:
   □ 8a. WaveManager（JSONからウェーブデータ読み込み）
   □ 8b. ウェーブ間インターバル
   □ 8c. ウェーブクリア判定
□ 9. スキル:
   □ 9a. スキル1/2のクールダウン管理
   □ 9b. スキル発動エフェクト
□ 10. ボス戦:
    □ 10a. ボスHP/ブレイクゲージ
    □ 10b. フェーズ切替（HP50%以下で攻撃パターン変化）
    □ 10c. ブレイク状態（行動停止＋被ダメ増加）
□ 11. ResultScene（クリア/失敗、星評価、報酬表示）
□ 12. ステージ選択→バトル→リザルト→メニューの基本ループ完成
□ 13. export_masterdata.py 作成（Excel→JSON変換）
□ 14. validate_masterdata.py 作成（データ整合性チェック）
```

## Phase 2 チェックリスト

```
Phase 2 実装順序:

□ 15. 武器装備＋メイン/サブ属性反映
□ 16. 武器レベルアップ・限界突破
□ 17. モジュール装備＋属性ボーナス
□ 18. キャラレベルアップ・限界突破
□ 19. サブキャラスロット
□ 20. ショップ（素材・武器購入）
□ 21. localStorage保存/読み込み
□ 22. ScenarioScene:
    □ 22a. テキストウィンドウ（タイプライター表示）
    □ 22b. 立ち絵表示＋表情切替
    □ 22c. 背景切替＋BGM切替
    □ 22d. 演出エフェクト（フェードイン/アウト、画面揺れ）
□ 23. スキップ機能:
    □ 23a. 全スキップ（即バトルへ遷移）
    □ 23b. 既読スキップ（既読は高速送り、未読で停止）
    □ 23c. AUTOモード（3秒間隔で自動送り）
□ 24. バックログ（過去のセリフ一覧スクロール表示）
□ 25. 既読管理（localStorageに scenarioId + seqNo を保存）
```

## Phase 3 チェックリスト

```
Phase 3 実装順序:

□ 26. 武器改造（部品システム）
□ 27. モジュール再演算
□ 28. 覚醒・シンクロ
□ 29. 必殺技（ULT）
□ 30. 緊急回避（i-frame）
□ 31. 状態異常エフェクト
□ 32. タッチ操作最適化
□ 33. BGM・SE
□ 34. GalleryScene:
    □ 34a. カテゴリタブ（メインストーリー/キャラ/イベント）
    □ 34b. サムネイル表示＋ロック/アンロック
    □ 34c. タップでシナリオ再生（isGalleryMode = true）
    □ 34d. ステージクリア時のアンロック処理
```

## アセットのプレースホルダ

MVP開発初期はPhaser.Graphicsで仮アセットを生成：

```javascript
// 仮プレイヤー（青い四角）
this.player = this.add.rectangle(400, 300, 32, 32, 0x4488ff);
this.physics.add.existing(this.player);

// 仮敵（赤い四角）
const enemy = this.add.rectangle(x, y, 24, 24, 0xff4444);
this.physics.add.existing(enemy);

// 仮弾（黄色い丸）
const bullet = this.add.circle(x, y, 4, 0xffff00);
this.physics.add.existing(bullet);
```

**アセットが完成したら差し替えるだけでOK。ゲームロジックは変更不要になるよう設計すること。**

## 参考リンク

- Phaser公式ドキュメント: https://docs.phaser.io
- Phaser公式Examples: https://phaser.io/examples/v3.85.0
- RexRainbowプラグイン: https://rexrainbow.github.io/phaser3-rex-notes/
- 仮想ジョイスティック: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/virtualjoystick/
