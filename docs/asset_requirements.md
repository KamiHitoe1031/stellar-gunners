# Stellar Gunners - アセット要件一覧

## キャラクター一覧 (6名)

| ID | 名前 | 属性 | タイプ | 武器 | テーマカラー |
|----|------|------|--------|------|-------------|
| chr_01 | レイナ・ヴォルト | bio(赤) | DPS | assault_rifle | #CC3333 crimson |
| chr_02 | セレナ・リーフ | psychic(紫) | Medic | pistol | #9966CC lavender |
| chr_03 | カイラ・アーク | machine(青) | Tank | shotgun | #3388CC blue |
| chr_04 | ノワール・シェイド | corrosion(暗紫) | Breaker | sniper_rifle | #6633AA dark purple |
| chr_05 | リリス・ブレイズ | immunity(黄) | Support | launcher | #FFAA33 orange-gold |
| chr_06 | ミラ・フロスト | machine(青) | DPS | sniper_rifle | #88CCEE ice blue |

---

## A. シナリオ立ち絵 (portraits/)
ノベルパート用。全身立ち絵、透過背景。800×1200px推奨。

### 表情差分一覧 (シナリオデータから抽出)

| キャラ | 必要表情 |
|--------|---------|
| レイナ | confident, serious, battle, surprised, calm |
| セレナ | calm, worried |
| カイラ | excited, confident, worried, amazed, exhausted |
| ノワール | cool |
| リリス | cheerful, wink |
| ミラ | focused, cold |

**合計: 16枚の立ち絵**

### 生成戦略
1. 各キャラのベース立ち絵（neutral）を生成
2. 表情差分は同じプロンプトベースで表情指示のみ変更
3. 背景: solid magenta (#FF00FF) で生成→後処理で透過

---

## B. ゲームスプライト (characters/)
トップダウンシューティング用。SD/チビ体型。

### スプライトシート構成 (各キャラ 4×4 = 16フレーム)

| Row | 内容 | フレーム数 |
|-----|------|-----------|
| Row 1 | Idle (正面) | 4F (Ping-Pong) |
| Row 2 | 歩行 (下方向) | 4F |
| Row 3 | 歩行 (横方向) | 4F |
| Row 4 | 被弾・死亡 | 4F |

- セルサイズ: 128×128px
- キャンバス: 512×512px
- 6キャラ × 1シート = **6枚**

---

## C. 敵スプライト (enemies/)
トップダウンビュー。赤/暗色系。

| ID | 名前 | サイズ | 備考 |
|----|------|--------|------|
| enemy_drone_01 | 偵察ドローン | 24×24 | 浮遊メカ |
| enemy_soldier_01 | 虚晶兵 | 32×32 | 人型 |
| enemy_mech_01 | 突撃メカ | 40×40 | 四足 |
| enemy_elite_01 | エリートスナイパー | 36×36 | 人型・重装 |
| enemy_turret_01 | 固定砲台 | 32×32 | 設置型 |
| enemy_healer_01 | 修復ユニット | 28×28 | 浮遊 |
| enemy_drone_02 | 重装ドローン | 28×28 | 浮遊メカ |
| enemy_soldier_02 | 重装虚晶兵 | 36×36 | 人型・重装 |
| enemy_mech_02 | 砲撃メカ | 44×44 | 四足大型 |
| boss_xr07 | XR-07 | 64×64 | ボス |
| boss_void_core | 虚晶核コア | 56×56 | ボス |
| boss_mech_king | メカキング | 72×72 | ボス |

- 2×2スプライトシート (idle 4F) or 静止画
- **12枚**

---

## D. UI アセット (ui/)

| アセット | サイズ | 枚数 | 備考 |
|---------|--------|------|------|
| キャラ顔アイコン | 64×64 | 6 | HUD・メニュー用 |
| 属性アイコン | 32×32 | 5 | bio/psychic/machine/corrosion/immunity |
| 武器アイコン | 48×48 | 5 | pistol/AR/shotgun/sniper/launcher |
| スキルアイコン | 48×48 | 12 | 各キャラskill1/skill2 |

---

## E. 背景画像 (backgrounds/)

### シナリオ背景 (800×600)
| Key | 説明 |
|-----|------|
| bg_city_ruin | 都市廃墟（昼） |
| bg_city_ruin_deep | 都市廃墟深部（暗い） |
| bg_city_lab | 旧研究所内部 |

### バトルフィールド (1200×900)
| Key | 説明 |
|-----|------|
| bg_battle_city | 都市廃墟フィールド |
| bg_battle_lab | 研究所フィールド |

---

## 生成優先度

1. **最優先**: キャラ立ち絵ベース6枚 (シナリオに必須)
2. **高**: 表情差分10枚
3. **高**: ゲームスプライト6枚
4. **中**: 背景5枚
5. **中**: 敵スプライト12枚
6. **低**: UIアイコン類

**合計: 約55枚の画像生成が必要**
