# HANDOVER.md - Stellar Gunners 引継ぎ資料

**最終更新**: 2026-02-18
**最新コミット**: `e38b490` (master)
**バージョン**: v0.2.0

---

## 1. プロジェクト概要

Stellar Gunners（ステラガンナーズ）は、2Dトップダウン弾幕シューティングRPGのブラウザゲーム。
Phaser 3.80+ (CDN)、ビルドツール不使用、静的ファイルのみで動作。

- **キャラクター**: 6人（レイナ、セレナ、カイラ、ノワール、リリス、ミラ）
- **属性**: bio, psychic, machine, corrosion, immunity（5属性相性）
- **コアループ**: ステージ選択 → シナリオ → バトル → リザルト → 強化

---

## 2. ファイル構成

### シーン（16個）
| シーン | 役割 |
|--------|------|
| BootScene | 最小アセット読込 |
| PreloadScene | 全アセット読込・プロシージャルテクスチャ生成・アニメーション登録 |
| TitleScene | タイトル画面（KV + ロゴ） |
| MenuScene | メインメニュー（8ボタン） |
| FormationScene | パーティ編成・ステージ選択 |
| ScenarioScene | ノベルパート再生 |
| GameScene | メインバトル（マルチエリア・ウェーブ制） |
| UIScene | バトルHUD（並列起動） |
| ResultScene | リザルト画面（星評価・報酬） |
| EnhanceScene | 強化（レベル/突破/覚醒/モジュール/シンクロ 5タブ） |
| ShopScene | ショップ（武器・素材購入） |
| TransformPotScene | 量子変換炉（装備分解・再構成） |
| GalleryScene | 回想ギャラリー（3カテゴリ） |
| RulesScene | ルール説明（8ページ） |
| CharacterGuideScene | キャラクター紹介（6キャラ詳細） |
| SettingsScene | 設定（音量・スキップモード） |

### システム（12個）
| システム | 役割 |
|---------|------|
| SaveManager | localStorage保存/読込・既読管理 |
| EquipmentSystem | 装備・ステータス計算（レベル/突破/覚醒/武器/モジュール/シンクロ/パーツ） |
| DamageSystem | ダメージ計算（属性相性・会心・状態異常判定） |
| ShieldSystem | シールド→HP二重耐久管理 |
| BreakSystem | ブレイクゲージ管理 |
| SkillSystem | スキル発動・CD管理・ULTゲージ |
| WaveManager | ウェーブ管理・マルチエリア遷移 |
| DropSystem | ドロップ報酬生成 |
| AudioManager | BGM/SFX管理（音量制御） |
| EffectSystem | 視覚エフェクト（ヒット・爆発・弾道等） |
| ObstacleManager | 障害物生成・配置 |
| TransformPotSystem | 量子変換（装備分解/再構成） |

### オブジェクト（8個）
Player, Enemy, Boss, Bullet, BulletPool, EnemyPool, HealthBar, Obstacle

### UI（6個）
TextWindow, BackLog, PartyHUD, BossHUD, SkillButton, UltButton

### ツール（5個）
| スクリプト | 用途 |
|-----------|------|
| generate_images.py | Gemini APIでキャラ画像・KV・ロゴ生成 |
| process_images.py | AI生成画像を48x48ゲーム用に加工 |
| process_spritesheets.py | 4x4スプライトシートをマゼンタ除去→16フレーム透過ストリップに変換 |
| generate_audio.py | Python wave/structでプレースホルダWAV生成 |
| validate_masterdata.py | JSONマスターデータ整合性チェック |

---

## 3. 直近セッションの変更履歴

### コミット e38b490: TextWindowクラッシュ修正
- `showAllText()`後にタイプライタータイマーコールバックがnull参照でクラッシュする問題を修正

### コミット b7653f5: AI生成キャラスプライト反映・バトルバグ修正
- **スプライトシート**: AI生成4x4グリッド(1024x1024)をPythonで加工 → 透過16フレームストリップ(1024x64, 64x64/frame)
- **アニメーション**: 16フレームレイアウト対応（idle:0-3, walk:4-7, fire:8-10, hit:12, death:13-15）
- **弾丸サイズ拡大**: 半径 5→8(味方), 5→7(敵), 7→10(ボス)
- **ポータル判定修正**: physics bodyのoffset二重シフトバグ修正
- **キャラ切替修正**: 切替時に前キャラ位置を引き継ぎ、追従速度0.05→0.15
- **ショップ武器アイコン**: 武器種別アイコン(PI/AR/SG/SR/RL)生成・表示
- **Player初期化修正**: animState初期値''でアニメーション確実起動

### コミット 14458eb: タイトルロゴ透過・KVアスペクト比修正
- title_logo.png: RGB→RGBA（暗背景アルファマスク除去、透過率73%）
- KV表示: `setDisplaySize`→`Math.max(scaleX,scaleY)`カバーモード（16:9→4:3歪み解消）

### コミット fe03e42: ルール/キャラ紹介ページ・KV・音声・その他機能追加
- **RulesScene**: 8ページチュートリアル（基本操作・属性相性・戦闘システム等）
- **CharacterGuideScene**: 6キャラ紹介（立ち絵・ステータスバー・スキル詳細）
- **TitleScene改修**: AI生成キービジュアル+タイトルロゴ表示
- **MenuScene**: 「ルール」「キャラ図鑑」ボタン追加（計8ボタン）
- **BGM/SE音声**: 6BGM + 10SFXをPythonで生成、各シーンに統合
- **既読スキップ**: ScenarioSceneにskipRead()実装（50ms高速送り）
- **ギャラリー拡充**: character/eventカテゴリタブ追加 + 動的サムネイル生成
- **状態異常HUD**: UISceneに毒/火傷/スタン/減速表示 + 色ティント
- **シンクロシステム**: EnhanceScene UI + EquipmentSystemボーナス計算(10%/15%)
- **validate_masterdata.py**: ID重複・参照整合性・enum値チェック

---

## 4. アーキテクチャ上の重要ポイント

### スプライトシートパイプライン
```
assets/images/characters/chr_0X_sprites.png  (AI生成 1024x1024 4x4グリッド, マゼンタ背景)
  ↓ tools/process_spritesheets.py
assets/images/game/spritesheets/chr_0X_normal.png  (1024x64 16フレーム, 透過PNG)
  ↓ PreloadScene.js this.load.spritesheet()
Phaser spritesheet (frameWidth:64, frameHeight:64)
  ↓ registerAnimations()
5 animations: idle(0-3), walk(4-7), fire(8-10), hit(12), death(13-15)
```

AI生成スプライトが読み込めなかった場合、`genCharSprite()`によるプロシージャル48x48スプライト（13フレーム）にフォールバック。

### ステータス計算フロー（EquipmentSystem.getCharBattleStats）
```
基本ステータス（level × growth）
  → 限界突破ボーナス（+5%/段階）
  → 覚醒ボーナス（+10%/段階）
  → タイプボーナス（dps:ATK+15%, tank:DEF/Shield+20%）
  → 武器（mainAtk + サブステータス）
  → モジュール（主効果 + 副効果×3）
  → シンクロ（サブキャラ基礎ステの10%、同属性15%）
  → 武器パーツ（%ベースボーナス）
```

### マルチエリアバトルフロー
```
GameScene.create() → loadArea(0)
  → WaveManager: ウェーブ開始 → 敵スポーン
  → 全敵撃破 → WAVE_CLEARED
  → エリア内全ウェーブクリア → AREA_CLEARED → ポータル表示
  → プレイヤーがポータルに到達 → transitionToNextArea()
  → フェードアウト → loadArea(n+1) → フェードイン → 次エリアウェーブ開始
  → 最終エリアクリア → STAGE_CLEARED → ResultScene
```

### 保存データ（localStorage key: `stellar_gunners_save`）
```javascript
{
  version: 2,
  player: { name, level, exp, stamina, credits, gems, lastStaminaRefill },
  characters: { "chr_01_normal": { level, exp, breakthroughCount, awakening } },
  weapons: { "instanceId": { weaponDefId, level, acquiredAt } },
  modules: { "instanceId": { moduleDefId, level } },
  equipment: { "chr_01_normal": { weaponId, modules: [4slots], subChars: [3slots] } },
  weaponParts: { "weaponInstanceId": { barrel, magazine, scope, stock } },
  ownedParts: [],
  progress: { currentChapter, clearedStages: { stageId: { stars, bestTime } } },
  inventory: { itemId: count },
  readScenarios: { scenarioId: [seqNo, ...] },
  gallery: { unlockedIds: [] },
  settings: { bgmVolume, sfxVolume, skipMode }
}
```

---

## 5. 既知の課題・未対応項目

### 高優先度
- [ ] **敵スプライトシート**: 敵もAI生成スプライトに置き換え（現在プロシージャル8フレーム）
- [ ] **音声アセット**: 現在プレースホルダWAV。本番BGM/SFXに差し替え必要
- [ ] **タッチ操作最適化**: 仮想ジョイスティック・スキルボタン配置の改善
- [ ] **AudioContextエラー**: ブラウザAutoplay制限対応（ユーザージェスチャー後にresume必要）

### 中優先度
- [ ] **モジュール再演算**: レベルアップ後のステータス再計算検証
- [ ] **ステージ追加**: stages.jsonにChapter 2以降のステージデータ
- [ ] **シナリオ追加**: scenarios.jsonにChapter 2以降のシナリオテキスト
- [ ] **ドロップバランス**: drop_tables.jsonの報酬調整

### 低優先度
- [ ] **Sprite Sheet高品質化**: AI生成プロンプト改善で一貫性のある高品質スプライト
- [ ] **PWA対応**: Service Worker + manifest.json
- [ ] **パフォーマンス最適化**: 大量弾幕時のfps測定・チューニング

---

## 6. 開発環境セットアップ

```bash
# 起動（ビルド不要、静的サーバーのみ）
cd Galcafe
npx http-server -p 8080 -c-1

# ブラウザで http://localhost:8080 を開く

# マスターデータ検証
python tools/validate_masterdata.py

# スプライトシート加工（AI画像変更時のみ）
python tools/process_spritesheets.py

# プレースホルダ音声生成
python tools/generate_audio.py

# AI画像生成（Gemini API Key必要 → LOCAL_SECRETS.md参照）
python tools/generate_images.py [portraits|sprites|keyvisual]
```

### テスト
```bash
# Puppeteerテスト（要 npm install puppeteer）
node test_browser.js        # テクスチャ・アニメーション確認
node test_new_scenes.js     # RulesScene・CharacterGuideScene確認
node test_gameplay.js       # バトルフロー確認
node test_area_transition.js # マルチエリア遷移確認
```

---

## 7. コミット履歴（全16コミット）

```
e38b490 Fix TextWindow crash when typeTimer callback fires after showAllText
b7653f5 Use AI-generated character sprites, fix battle bugs, add shop weapon icons
14458eb Fix title logo transparency and key visual aspect ratio
fe03e42 Add rules/character guide pages, KV title, audio, synchro, and polish features
e39f7e5 Disable audio file loading to eliminate 404 console errors
cdd92a6 Revamp result screen UI, enable inactive party auto-fire, fix image transparency
f4a0783 Add visual effects system and enhanced placeholder textures
a485524 Add Phase 3: ULT, dodge, status effects, passives, weapon parts, awakening, audio, settings
699175d Add equipment system, enhanced upgrades, and touch controls
ddd5035 Add Phase 2 scenes: Enhance, Shop, Scenario, Gallery
4605026 Fix game freeze on battle start: correct physics body initialization order
72365d2 Add debug logging to GameScene.create() to diagnose freeze
3be78e8 Remove magenta/pink backgrounds from all game images
334ba37 Add AI-generated art assets + Cloudflare deploy config
7163410 Add Transform Pot system + fix skill bugs
3dd74a7 Initial commit: Stellar Gunners Phase 1 MVP
```

---

## 8. 統計

- **総JS行数**: ~11,000行
- **シーン数**: 16
- **マスターデータ**: 10 JSONファイル
- **キャラクター**: 6人（全員スプライトシート・ポートレート・アイコン完備）
- **敵種**: ドローン・兵士・エリート・ヒーラー・メカ・タレット + ボス1体
- **音声**: 6 BGM + 10 SFX（プレースホルダWAV）
- **Phase 1**: 完了（基本バトル・ウェーブ・ボス戦・リザルト）
- **Phase 2**: 完了（装備・強化・ショップ・シナリオ・ギャラリー）
- **Phase 3**: 完了（ULT・回避・状態異常・パッシブ・武器パーツ・覚醒・音声・設定）
- **追加機能**: ルール説明・キャラ図鑑・KV/ロゴ・シンクロ・マルチエリア
