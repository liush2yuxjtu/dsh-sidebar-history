# DSH Sidebar History：DeepSeek Harness 歷史側欄外掛

目前 main 為 0.2.0。下方命令從目前原始碼產生安裝包，已發布的 Release 可能仍為較早版本。側欄支援唯讀 Markdown 預覽，切換導覽保留搜尋與捲動位置；先前回覆會與本輪進度區分，純工具訊息與中斷文字不會覆蓋有用回覆。

[English](../../README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [Español](README.es.md)

**DSH Sidebar History** 在 DeepSeek Harness 的聊天歷史側欄中顯示 TODO 進度和最新一則已儲存的 Assistant 回覆。你可以先找到未完成的工作，再開啟對應對話，無需逐一檢查聊天記錄。

這是採用 MIT 授權的獨立外掛。它使用 DSH 官方投影和側欄插槽 API，不修改上游 DSH 原始碼。

## 功能影片

[![DSH 歷史卡片顯示真實 TODO 進度和最新 Assistant 回覆](../media/live/feature-8s.gif)](../media/live/demo.mp4)

[觀看真實 API 影片，9.9 秒](../media/live/demo.mp4) · [實際瀏覽器截圖](../media/live/snapshot.png) · [API 回執](../media/live/evidence/result.json)

全新的 DSH 對話呼叫 DeepSeek 官方 API。模型讀取示範訂單輸入，呼叫原生 TODO 工具，並儲存自己的回答。側欄顯示 2/3 項任務已完成，以及該對話儲存的回覆。影片保留原始錄製位元組和實際時長。錄製中沒有 mock 端點、腳本回覆，也沒有預先寫入 Assistant 訊息或 TODO 事件。另一個真實 API 對話和重新整理後的恢復也已檢查。請參閱[媒體來源與雜湊](../media/live/provenance.json)和[媒體檢查結果](../media/live/qa.json)。

## 尋找並繼續工作

- 每張卡片顯示對話標題、更新時間、任務完成數、最多三項任務，以及兩行 Assistant 摘要。
- 優先顯示進行中和待處理任務，再顯示已完成任務。
- 搜尋對話標題和已快取的回覆。DSH 官方內容搜尋還可以尋找尚未載入的歷史。
- 使用上、下、Home、End 和 Enter 鍵操作卡片。清單只繪製可見卡片和少量緩衝區。
- 保留原生側欄收合和行動版抽屜。按 **Workspaces & archives** 可使用原有工作區、封存和對話操作。按 **History cards** 返回卡片檢視。

TODO 狀態只來自 `todo/write` 事件。新的 `turn/start` 會清空上一輪任務。摘要只使用已提交的 `assistant/message` 文字。生成期間，卡片保留上一則已提交回覆，並顯示 **Generating**。中斷輸出、推理和工具區塊不會成為摘要。空回覆、非文字訊息、載入中和載入失敗都有明確狀態。已封存的對話預設隱藏。

外掛 UI 目前支援英文和簡體中文，跟隨 DSH 的語言設定。README 文件提供上方連結所列的五種語言。

## 安裝側欄外掛

需要 Node.js `>=24.9.0` 和已安裝的 DSH Web。已驗證的目標為 DSH `0.2.2-rc.1`，上游 commit 為 `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`。宣告的 DSH 範圍為 `>=0.2.2-rc.1 <0.3.0`；範圍內的其他版本尚未個別驗證。

建立本機安裝包，並安裝至 `web` profile：

```bash
git clone https://github.com/liush2yuxjtu/dsh-sidebar-history.git
cd dsh-sidebar-history
npm pack
dsh plugin --profile web add "$PWD/dsh-sidebar-history-0.2.0.tgz"
```

開啟 DSH Web。歷史側欄會為未封存的對話顯示卡片。如果你使用其他 Web profile，請替換 `web`。`--profile` 參數必須放在 `add` 前。也可以透過 DSH 外掛管理員安裝本機包。請參閱[上游安裝指南](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/docs/user/develop/basic/publish.md)。

安裝包已包含 JavaScript 進入點，無需 bundler。執行階段相依套件由 DSH 解析。不要再安裝第二份 React。這些指令從本儲存庫安裝，不依賴 npm registry 已有發佈版本。DSH API 尚未穩定，升級前請檢查相容性。

## 遙測與隱私

維護者可以使用已有授權的 GitHub 存取權，執行 `npm run telemetry:collect`，收集儲存庫瀏覽、複製、來源網站、Star 數和 Release 附件下載數。腳本產生本機 JSON 和 Markdown 報告。無法讀取的流量 API 標記為 **BLOCKED**，不會記為零。

外掛不安裝追蹤 SDK。收集腳本不聯絡外掛使用者，也不收集聊天內容。目前尚未測量功能點擊和使用者留存。[遙測指南](../telemetry.md)列出已有指標和擬議的自願參與事件設計。

## 驗證修改

先讀 [AGENTS.md](https://github.com/liush2yuxjtu/dsh-sidebar-history/blob/main/AGENTS.md) 和[驗證清單](https://github.com/liush2yuxjtu/dsh-sidebar-history/blob/main/.agents/skills/verify/references/surfaces.md)。需要已建置的上游 checkout、凍結相依套件、Node.js `>=24.9.0` 和 Chromium。

```bash
npm run setup:hooks
npm run verify
DSH_SOURCE_ROOT=/absolute/path/to/built/deepseek-harness npm run verify:browser
npm run verify:live
npm run verify:media
npm run verify:commit
```

為後續指令設定 `DSH_SOURCE_ROOT`，或設定本機 Git 組態 `dsh.sourceRoot`。如果上游 Playwright 中沒有可用的 Chromium，請設定 `DSH_CHROMIUM_PATH`。透過 `DEEPSEEK_API_KEY` 或私有的 `DSH_PROVIDER_ENV_FILE` 提供已有授權憑證。不要將憑證寫入 Git。

`verify` 檢查單元測試和包結構。`verify:browser` 使用明確標示的受控 adapter 做迴歸測試。這兩項不能證明真實模型驗收通過。`verify:live` 透過 DSH 呼叫真實 API。Git hook 和 `verify:commit` 會匯出暫存區，並要求重新完成單元、瀏覽器、媒體和真實 API 檢查。缺少存取權限或斷言失敗時拒絕提交。執行證據保存在忽略提交的 `.runtime/` 中。

## 專案連結

- [架構與決策](https://github.com/liush2yuxjtu/dsh-sidebar-history/blob/main/docs/decisions.md)
- [驗證報告](https://github.com/liush2yuxjtu/dsh-sidebar-history/blob/main/docs/verification.md)
- [發現入口與儲存庫中繼資料](../discovery.md)
- [設計與驗收](https://chatgpt.com/space/page_7a28be26236481918ee65d88725c1d38)
- [DeepSeek Harness 上游](https://github.com/deepseek-ai/deepseek-harness)
- [MIT 授權](../../LICENSE)

可透過 GitHub 的 [`dsh-plugin`](https://github.com/topics/dsh-plugin) 和 [`dsh-plugins`](https://github.com/topics/dsh-plugins) 主題尋找相關外掛。本專案不是 DeepSeek 官方產品。
