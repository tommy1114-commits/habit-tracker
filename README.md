# 關鍵行動週打卡 & 習慣記錄 App (FocusHabit)

專為自主學習、閱讀專注與習慣養成設計的週進度打卡 Web App。支援自訂習慣項目、碼表專注計時（讀書/研讀結算記錄）、每日生活亮點隨筆與達成率統計。

相容手機與電腦瀏覽器，可直接免費託管於 **GitHub Pages**。

---

## ✨ 核心特色

1. **週進度打卡看板**
   - 參照「週日~週六」週期設計，自動計算當週目標達成率與總進度條。
   - 支援上一週、本週、歷史週次自由切換回顧。
   - 每日打卡一鍵切換，具備達成高亮與微動畫反饋。

2. **自訂增減習慣項目**
   - 自由新增、編輯、暫時休息（封存）或刪除習慣。
   - 可自訂 Emoji 圖示、每週目標次數（1~7次）、分類標籤（語言學習、閱讀、專業法律、生活日常等）。
   - 預設已內建您的專屬學習習慣（已過濾運動健身項目）：
     - 🔠 英文-看一篇新聞or文章 (3次/週)
     - 🔡 英文-請AI出題(ChatGPT) (2次/週)
     - 🔤 英文-跟AI對話(ChatGPT) (1次/週)
     - ⚖️ 學習智財 or 法律 or 科學知識 (3次/週)
     - 📖 看書 or 聽書 or podcast筆記 (3次/週)
     - 🛵 騎機車 (1次/週)
     - 📝 其他值得記錄的事情 (2次/週)

3. **碼表專注計時器（看書/研讀結算）**
   - 專門支援看書、學習等需要計時的習慣。
   - 支援「開始計時」、「暫停」、「繼續」、「結算」。
   - 結算時可紀錄「看哪本書」、「研讀章節/筆記心得」，並自動將今日打卡完成次數 +1！
   - 背景防中斷：關閉分頁或刷新網頁碼表依舊精準計時。
   - 內建歷史閱讀專注清單與累計時長統計。

4. **兩層式週打卡看板（手機排版最佳化）**
   - 第一層：習慣名稱、每週目標、當週完成度與今日快速打卡鍵。
   - 第二層：點開展開當週 7 天陣列日曆抽屜，清楚對齊週日到週六，免橫向左右滑動。

5. **跨裝置雲端同步（手機與電腦紀錄雙向同步）**
   - **Google Apps Script 雲端同步**：100% 免費、個人 Google 帳號保管、打卡計時結束自動雙向同步。
   - **一鍵同步代碼移轉**：免任何設定，一鍵複製代碼傳至手機即刻還原。

6. **純前端、離線可用、自動即時儲存**
   - 本機紀錄自動即時寫入 LocalStorage，打卡與看書結束皆無須手動按存檔。
   - 提供 JSON 一鍵備份與匯入還原功能。
   - 100% 靜態網頁架構，無須 Node.js 編譯，零伺服器維護成本。

---

## ☁️ 手機與電腦跨裝置同步設定指南

> **為什麼電腦和手機的紀錄一開始沒有同步？**  
> 瀏覽器出於隱私沙盒機制，手機與電腦各自獨立儲存 LocalStorage。為了在不花錢租用資料庫的前提下實現跨裝置即時同步，我們提供了極簡的 Google Apps Script 免費同步方案！

### 1 分鐘啟用 Google 雲端雙向同步：
1. 開啟 [Google Apps Script 儀表板](https://script.google.com/home/start)（需登入 Google 帳號）。
2. 點擊左上角「**新專案**」。
3. 刪除預設程式碼，將專案資料夾中 `gas/Code.gs` 的內容（或在 App 點擊 ☁️ 圖示內的一鍵複製代碼）貼上。
4. 點擊右上角「**部署 ➔ 新增部署**」：
   - 種類選取「**網頁應用程式 (Web app)**」。
   - 執行身分選「**我**」。
   - 誰可以存取選「**所有人 (Anyone)**」。
5. 點擊「**部署**」並複製產生的網頁應用程式網址（結尾為 `/exec`）。
6. 在電腦與手機打開本打卡 App，點擊右上角 **☁️ 雲端同步** 圖示，將網址貼入並點擊「**儲存並立即同步**」。
7. 大功告成！未來只要在任一裝置打卡或結算專注時間，兩邊皆會自動同步！

---

## 🚀 如何在 GitHub 上託管 (免費啟用 GitHub Pages)

### 方法一：直接在 GitHub 網頁上傳（最簡單，免裝 Git）

1. 登入 [GitHub](https://github.com/) 並點選右上角的 **「+」 ➔ 「New repository」**。
2. Repository name 輸入例如 `habit-tracker` 或 `focus-habit`。
3. 勾選 **Public**（公開），然後點擊 **「Create repository」**。
4. 在新倉庫頁面中，點擊 **「uploading an existing file」**。
5. 將本資料夾（`habit-tracker`）中的所有檔案（`index.html`、`style.css`、`app.js`、`README.md` 等）拖曳上傳，並點擊下方 **「Commit changes」**。
6. 開啟 GitHub 倉庫的 **「Settings」 ➔ 「Pages」**：
   - 在 **Build and deployment** 下方的 **Branch** 選擇 `main`（或 `master`），資料夾選擇 `/(root)`。
   - 點擊 **Save**。
7. 約等待 1~2 分鐘後重新整理頁面，即可看到專屬網址（例如：`https://<你的帳號>.github.io/habit-tracker/`）！

### 方法二：使用 Git 指令推送

若您的電腦已安裝 Git：

```bash
cd habit-tracker
git init
git add .
git commit -m "Initial commit: Habit Tracker with Stopwatch and Weekly Progress"
git branch -M main
git remote add origin https://github.com/<你的GitHub帳號>/<你的儲存庫名稱>.git
git push -u origin main
```

接著依照上述步驟在 GitHub Settings ➔ Pages 開啟 GitHub Pages 即可。

---

## 💻 本地電腦預覽方法

### 方式 1：使用內建 PowerShell 伺服器
1. 在本資料夾按右鍵選擇「在 PowerShell 中開啟」或終端機。
2. 執行：
   ```powershell
   .\start-server.ps1
   ```
3. 系統將自動在瀏覽器中開啟 `http://localhost:8080`。

### 方式 2：直接雙擊開啟
- 直接用瀏覽器（Chrome, Edge, Safari, Opera）開啟 `index.html` 即可直接使用！
