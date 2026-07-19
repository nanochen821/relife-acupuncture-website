# ReLife Health Articles

這個資料夾存放 ReLife 網站的健康文章原始內容。

網站文章採用 Markdown 格式，一篇文章對應一個 `.md` 檔案，避免診所人員直接編輯複雜的 JSON、HTML 或 JavaScript。

---

## 資料夾結構

```text
content/articles/
├── drafts/
│   └── 尚未公開或仍在確認的文章
│
├── published/
│   └── 已經確認並允許公開的文章
│
└── README.md
```

目前新增文章時，應先放在：

```text
content/articles/drafts/
```

確認內容、圖片、隱私與醫療用詞後，再由網站管理者移到：

```text
content/articles/published/
```

## 新增文章

每篇文章建立一個獨立的 Markdown 檔案。

檔名請使用簡單的英文小寫文字，並以連字號分隔：

```text
sleep-and-daily-health.md
stress-and-skin.md
listening-to-the-body.md
```

檔名將來會由網站系統用來產生文章網址。

請勿使用：

* 空格
* 中文檔名
* 大寫英文
* 特殊符號
* 括號

## 文章格式

每篇文章只需要填寫：

* 標題
* 日期
* 分類
* 簡短摘要
* 正文
* 需要顯示的圖片

範例：

```markdown
---
title: Listening to the Body’s Oldest Stories
date: 2026-05-19
category: Stories from the Treatment Room
summary: A reflection on careful listening and mind-body health.
---

Patients often arrive with more than one concern.

Physical discomfort may exist alongside poor sleep,
emotional strain, fatigue, or tension.

## Listening beyond the immediate symptom

A careful conversation gives patients space to explain
how their symptoms affect everyday life.

![A quiet treatment room](../../assets/images/articles/treatment-room.jpg)

## Why individual experiences matter

Every patient brings an individual health history.

Treatment plans and individual responses may vary.
```

## 可使用的文字格式

### 一般段落

直接輸入文字，段落之間留一行空白：

```markdown
This is the first paragraph.

This is the second paragraph.
```

### 小標題

使用兩個井字號：

```markdown
## Sleep and everyday health
```

較小的標題使用三個井字號：

```markdown
### Daily routines
```

### 清單

```markdown
- Sleep schedule
- Daily movement
- Stress management
```

### 圖片

先將圖片放進：

```text
assets/images/articles/
```

文章中使用：

```markdown
![圖片說明](../../assets/images/articles/image-name.jpg)
```

圖片檔名請使用：

```text
treatment-room.jpg
sleep-health.jpg
stress-and-skin.jpg
```

請勿使用空格或中文圖片檔名。

## 文章分類

目前建議使用以下分類：

* Acupuncture & TCM
* Pain & Mobility
* Chronic Health
* Allergy & Immune
* Sleep & Stress
* Mind-Body Health
* Stories from the Treatment Room
* Clinic News

請盡量使用既有分類，避免同一類文章出現多種不同名稱。

## 不需要手動填寫的資料

文章作者不需要處理以下技術資料：

* `id`
* `slug`
* `readingTime`
* `published: true / false`
* `featured: true / false`
* article URL
* HTML structure
* JSON content blocks

這些資料應由網站程式自動產生。

文章作者只需要專注在：

* 標題
* 日期
* 分類
* 摘要
* 圖片
* 正文
* 患者隱私與醫療內容

## 患者隱私

文章不得包含可辨識患者身分的資料，例如：

* 患者完整姓名
* 電話
* 電子郵件
* 地址
* 出生日期
* 未經同意的照片
* 可以組合辨識患者身分的細節

涉及患者經驗時，應先取得診所確認與必要同意。

## 醫療用詞

避免使用保證療效的文字，例如：

* `guaranteed cure`
* `works for everyone`
* `permanent recovery`
* `100% effective`

較適合的表達方式：

* `individual experiences vary`
* `may be considered as supportive care`
* `results cannot be guaranteed`
* `consult an appropriate healthcare professional`

## 未來後台方向

<!--
FUTURE CMS / ADMIN DIRECTION

目前文章使用 Markdown 檔案管理，適合網站開發與初期內容整理。

未來應加入診所專用的內容管理後台，讓診所人員不需要操作 VS Code、Markdown、Git、JSON 或網站原始碼。

預期使用流程：

1. 診所人員進入管理頁面
2. 使用帳號與密碼登入
3. 點擊「新增文章」
4. 輸入標題、日期、分類與摘要
5. 使用類似 Word 的編輯器輸入正文
6. 上傳或插入圖片
7. 儲存草稿
8. 預覽文章
9. 點擊發布

後台應自動處理：

- Markdown 或 HTML 產生
- 文章網址 slug
- 圖片檔案名稱與上傳
- 閱讀時間
- 草稿與發布狀態
- 發布日期格式
- 文章清單
- 搜尋與分類
- 權限與登入驗證

未來可評估：

- Decap CMS
- TinaCMS
- Sanity
- Contentful
- WordPress headless CMS
- 自訂後台與資料庫

在後台完成以前，請勿要求診所人員直接編輯 `data/articles.json` 或 JavaScript。
-->

這個檔案不會出現在公開網站，只是留給網站維護者與未來接手的人閱讀。
