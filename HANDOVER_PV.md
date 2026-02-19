# HANDOVER_PV.md - PV動画制作 引継ぎ資料

**最終更新**: 2026-02-19
**ステータス**: chr_05, chr_06のVEOクリップ再生成待ち（デイリー制限）

---

## 1. 全体構成

PV動画はRemotionフレームワーク（React + TypeScript）で制作。2つのプロジェクトが存在する。

| プロジェクト | 用途 | 状態 |
|-------------|------|------|
| `pv/` | 旧PV（総合PV 94秒） | 復旧完了・レンダリング済み |
| `pv2/` | 新PV（キャラ個別・SNSショート・ゲーム紹介） | クリップ差替え待ち |

---

## 2. ディレクトリ・ファイル一覧

### 動画クリップ素材

```
assets/video/
├── clips/                      # 現在の作業用クリップ（上書き済みの低品質版が混在）
│   ├── chr_01_action.mp4       # VEO 3.1 + 立ち絵直接参照（低品質）6.2MB
│   ├── chr_02_action.mp4       # VEO 3.0 Fast + 立ち絵直接参照（低品質）3.2MB
│   ├── chr_03_action.mp4       # VEO 3.0 Fast + 立ち絵直接参照 3.9MB
│   ├── chr_04_action.mp4       # VEO 3.0 Fast + 立ち絵直接参照 3.8MB
│   ├── chr_05_action.mp4       # VEO 3.0 Fast + 立ち絵直接参照 5.9MB
│   ├── chr_06_action.mp4       # VEO 3.0 Fast + 立ち絵直接参照 4.6MB
│   ├── title_clip.mp4          # VEO 3.1 テキストのみ（良好）4.7MB
│   └── ending_clip.mp4         # VEO 3.1 テキストのみ（良好）7.8MB
│
├── clips_original_veo31/       # ★復元したオリジナルVEO 3.1テキストのみ版
│   ├── chr_01_action.mp4       # 158KB（最初のテスト版、品質低い）
│   ├── chr_02_action.mp4       # 6.6MB ★良好
│   ├── chr_03_action.mp4       # 6.5MB ★良好
│   ├── chr_04_action.mp4       # 5.8MB ★良好
│   ├── chr_05_action.mp4       # 7.9MB ★良好
│   └── chr_06_action.mp4       # 9.2MB ★良好
│
├── clips_v2/                   # ★新版：Geminiアクションイラスト参照 + VEO 3.1 Fast
│   ├── chr_01_action.mp4       # 8.0MB ★完了
│   ├── chr_02_action.mp4       # 6.8MB ★完了
│   ├── chr_03_action.mp4       # 5.1MB ★完了
│   ├── chr_04_action.mp4       # 5.2MB ★完了
│   ├── chr_05_action.mp4       # ❌未生成（VEOデイリー制限）
│   └── chr_06_action.mp4       # ❌未生成（VEOデイリー制限）
│
└── pv_art/                     # Gemini生成アクションイラスト（VEO参照用1枚絵）
    ├── chr_01_action.png       # 849KB
    ├── chr_02_action.png       # 914KB
    ├── chr_03_action.png       # 930KB
    ├── chr_04_action.png       # 776KB
    ├── chr_05_action.png       # 923KB
    └── chr_06_action.png       # 911KB
```

### Remotionプロジェクト

```
pv/                             # 旧PV（触らない）
├── src/
│   ├── index.ts                # エントリポイント
│   ├── Root.tsx                # Composition定義（StellarGunnersPV 1本）
│   ├── StellarGunnersPV.tsx    # メインPVコンポジション
│   ├── data.ts                 # キャラデータ
│   └── components/
│       ├── TitleCard.tsx       # タイトル（title_clip.mp4使用）
│       ├── CharacterIntro.tsx  # キャラ紹介（chr_XX_action.mp4使用）
│       ├── EndingCard.tsx      # エンディング（ending_clip.mp4使用）
│       └── TransitionWipe.tsx  # トランジション
├── public/clips/               # ★chr_02-06はオリジナル版で復旧済み
├── out/stellar-gunners-pv.mp4  # 84MB, 94秒, 1920x1080
└── package.json

pv2/                            # 新PV
├── src/
│   ├── index.ts
│   ├── Root.tsx                # 8コンポジション定義
│   ├── data.ts                 # キャラデータ（pv/と同内容）
│   ├── CharacterPV.tsx         # キャラ個別PV（20秒）
│   ├── ShortPV.tsx             # SNSショートPV（30秒、1080x1920縦）
│   └── GameIntroPV.tsx         # ゲーム紹介PV（60秒）
├── public/
│   ├── clips/                  # ※現在は低品質版のまま→差替え必要
│   └── portraits/              # キャラポートレート画像
├── out/                        # ※現在は低品質クリップでレンダリングされたもの→再レンダリング必要
└── package.json
```

### ツールスクリプト

```
tools/
├── generate_images.py          # Gemini画像生成（pvartタスク追加済み）
└── generate_pv_clips.py        # VEO動画クリップ生成
```

---

## 3. スクリプト使い方

### generate_images.py（Gemini画像生成）

```bash
python tools/generate_images.py pvart       # PV用アクションイラスト生成（6枚）
python tools/generate_images.py keyvisual   # キービジュアル＋タイトルロゴ生成
python tools/generate_images.py portraits   # 全ポートレート生成
```

### generate_pv_clips.py（VEO動画生成）

```bash
# 基本（全キャラ、デフォルトモデル）
python tools/generate_pv_clips.py

# モデル指定 + 出力先指定 + キャラ指定
python tools/generate_pv_clips.py --model 3.1-fast --output-dir assets/video/clips_v2 chr_05 chr_06

# 利用可能モデル: 3.1, 3.1-fast, 3.0, 3.0-fast
# 参照画像の優先順位: pv_art/ > portraits/（自動判定）
# 既存ファイルがあればSKIPされる
```

### Remotionレンダリング

```bash
# 旧PV
cd pv && npx remotion render src/index.ts StellarGunnersPV out/stellar-gunners-pv.mp4

# 新PV - キャラ個別
cd pv2 && npx remotion render src/index.ts CharPV-chr-01 out/chr_01_pv.mp4

# 新PV - 全キャラ一括
cd pv2 && npm run render:all-chars

# 新PV - SNSショート / ゲーム紹介
cd pv2 && npx remotion render src/index.ts ShortPV out/short_pv.mp4
cd pv2 && npx remotion render src/index.ts GameIntroPV out/game_intro_pv.mp4

# Remotion Studio（ブラウザプレビュー）
cd pv2 && npx remotion studio src/index.ts
# → http://localhost:3000
```

---

## 4. VEOオペレーションID一覧（復元用）

Googleサーバーにデータが残っている間は、オペレーションIDから動画を再ダウンロード可能。

### 復元コマンド例
```bash
API_KEY="AIzaSyA6B3awYqaozaBpMcgnEaKL8lEE93c9_IE"
OP_ID="y759qcrwy89n"  # chr_02オリジナル
URI=$(curl -s "https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview/operations/$OP_ID" \
  -H "x-goog-api-key: $API_KEY" | python -c "import sys,json; print(json.load(sys.stdin)['response']['generateVideoResponse']['generatedSamples'][0]['video']['uri'])")
REDIRECT=$(curl -s -D - "${URI}&key=${API_KEY}" -o /dev/null | grep -i location: | tr -d '\r' | sed 's/location: //i')
curl -L -s "$REDIRECT" -o output.mp4
```

### オリジナル版 (VEO 3.1 テキストのみ、画像参照なし)
| クリップ | モデル | オペレーションID |
|---------|--------|-----------------|
| chr_01（テスト版）| veo-3.1-generate-preview | `x5cnsh6b085f` |
| chr_02 | veo-3.1-generate-preview | `y759qcrwy89n` |
| chr_03 | veo-3.1-generate-preview | `0325kmkzz8d0` |
| chr_04 | veo-3.1-generate-preview | `suhzsw79zgvs` |
| chr_05 | veo-3.1-generate-preview | `iuw6ccn1h7wg` |
| chr_06 | veo-3.1-generate-preview | `xpnpx42xurpj` |
| title | veo-3.1-generate-preview | `fovs12e52llb` |
| ending | veo-3.1-generate-preview | `fovs12e52llb` |

### 立ち絵直接参照版（低品質、紫背景問題あり）
| クリップ | モデル | オペレーションID |
|---------|--------|-----------------|
| chr_01 | veo-3.1-generate-preview | `gjaz01d300cu` |

### VEO 3.0 Fast + 立ち絵直接参照版（低品質）
| クリップ | モデル | オペレーションID |
|---------|--------|-----------------|
| chr_03 | veo-3.0-fast-generate-001 | `m3imc9ca7xy1` |
| chr_04 | veo-3.0-fast-generate-001 | `yhsags0590tc` |
| chr_05 | veo-3.0-fast-generate-001 | `b3n3g08vegww` |
| chr_06 | veo-3.0-fast-generate-001 | `eipx6hxp1l9o` |

### 新版 (VEO 3.1 Fast + Geminiアクションイラスト参照)
| クリップ | モデル | オペレーションID |
|---------|--------|-----------------|
| chr_01 | veo-3.1-fast-generate-preview | `hcuaxkyy1fjr` |
| chr_02 | veo-3.1-fast-generate-preview | `09eezpsujipm` |
| chr_03 | veo-3.1-fast-generate-preview | `kfvrfdex8v8p` |
| chr_04 | veo-3.1-fast-generate-preview | `ubyni4w3re0k` |
| chr_05 | ❌未生成 | — |
| chr_06 | ❌未生成 | — |

---

## 5. 残タスク（優先順）

### 必須
1. **chr_05, chr_06のVEOクリップ生成**（デイリー制限リセット後）
   ```bash
   python tools/generate_pv_clips.py --model 3.1-fast --output-dir assets/video/clips_v2 chr_05 chr_06
   ```

2. **pv2/のクリップをclips_v2版に差替え**
   ```bash
   cp assets/video/clips_v2/chr_*_action.mp4 pv2/public/clips/
   ```

3. **pv2の全コンポジション再レンダリング**
   ```bash
   cd pv2 && npm run render:all
   ```

### 任意
4. VEO 3.1（通常版）でクリップを再生成して品質比較
5. title_clip, ending_clipもアクションイラスト風に再生成
6. 旧PVのchr_01を高品質版に差替え（現在は3.0 Fast版使用中）

---

## 6. VEO API 注意事項

- **デイリー制限**: 全VEOモデル共通でクォータが存在。1日あたり約10〜15リクエスト程度
- **偶数秒のみ**: `durationSeconds` は 4, 6, 8 のみ（奇数は400エラー）
- **personGeneration不可**: VEO 3.1では `personGeneration: "allow"` パラメータ非対応
- **ダウンロードにAPI key必須**: 動画DL URIに `&key=API_KEY` を付与、リダイレクト先にも追従が必要
- **API Studio表示**: VEO 3.1 Previewの利用がダッシュボード上で「veo-3.0」として表示される可能性あり（料金体系が同一のため）
- **オペレーション結果保持**: 生成済み動画はオペレーションIDでGoogleサーバーから再ダウンロード可能（保持期間不明）

---

## 7. 動画制作フロー（正しい手順）

```
1. Gemini Image Generation で立ち絵を参照してアクションイラスト（1枚絵）を生成
   → assets/video/pv_art/chr_XX_action.png
   → python tools/generate_images.py pvart

2. VEOでアクションイラストを参照画像として動画クリップを生成
   → assets/video/clips_v2/chr_XX_action.mp4
   → python tools/generate_pv_clips.py --model 3.1-fast --output-dir assets/video/clips_v2

3. クリップをRemotionプロジェクトのpublic/clips/にコピー
   → cp assets/video/clips_v2/*.mp4 pv2/public/clips/

4. Remotionでレンダリング
   → cd pv2 && npm run render:all

※ 素材を再生成する場合は必ず別名または別ディレクトリに出力し、元ファイルを上書きしない
```

---

## 8. API Key

`LOCAL_SECRETS.md` に記載（git管理外）
