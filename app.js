/**
 * 關鍵行動週打卡 & 習慣記錄 App (FocusHabit)
 * 完整前端邏輯：習慣增減、週打卡看板、專注碼表結算、閱讀歷程統計、每日亮點隨筆、LocalStorage 同步
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. 預設資料種子 (Default Data Seed - 取自 Google 試算表真實資料，過濾運動項目)
  // =========================================================================
  const DEFAULT_HABITS = [
    { id: 'h_en_news', name: '🔠 英文-看一篇新聞or文章', emoji: '🔠', target: 3, category: '語言學習', timerEnabled: true, paused: false },
    { id: 'h_en_quiz', name: '🔡 英文-請AI出題(ChatGPT)', emoji: '🔡', target: 2, category: '語言學習', timerEnabled: true, paused: false },
    { id: 'h_en_chat', name: '🔤 英文-跟AI對話(ChatGPT)', emoji: '🔤', target: 1, category: '語言學習', timerEnabled: true, paused: false },
    { id: 'h_ip_study', name: '⚖️ 學習智財 or 法律 or 科學知識 or something', emoji: '⚖️', target: 3, category: '專業研習', timerEnabled: true, paused: false },
    { id: 'h_reading', name: '📖 看書 or 聽書 or podcast筆記', emoji: '📖', target: 3, category: '閱讀吸收', timerEnabled: true, paused: false },
    { id: 'h_scooter', name: '🛵 騎機車', emoji: '🛵', target: 1, category: '生活日常', timerEnabled: false, paused: false },
    { id: 'h_highlights', name: '📝 其他值得記錄的事情', emoji: '📝', target: 2, category: '生活日常', timerEnabled: false, paused: false },
    // 暫時休息 (對應試算表備用習慣)
    { id: 'h_pod_note', name: '📖 Podcast筆記(暫時休息)', emoji: '📖', target: 2, category: '閱讀吸收', timerEnabled: true, paused: true },
    { id: 'h_jp_words', name: '⛩️ 日本語單字N5N4', emoji: '⛩️', target: 3, category: '語言學習', timerEnabled: true, paused: true },
    { id: 'h_jp_gogogo', name: '🏯 日本語GOGOGO一課', emoji: '🏯', target: 1, category: '語言學習', timerEnabled: true, paused: true },
  ];

  // 預設常用閱讀/研讀書名標籤
  const DEFAULT_SUBJECTS = ['《原子習慣》', '《快思慢想》', '《被討厭的勇氣》', '專利法與審查基準', '民法總則', '科技新知與AI文章'];

  // 試算表歷史備註彩蛋範例 (若為對應週次自動呈現)
  const SAMPLE_DAILY_NOTES = {
    // 範例：讓使用者打開時能看到熟悉的心情亮點
    'default': {
      0: '買聯合文學、逛逛書店',
      1: '複習專利實務與工作流',
      2: '閱讀《原子習慣》第3章',
      3: 'AI 出題英文閱讀理解全對 🎉',
      4: '跟朋友聚餐、路易莎喝咖啡',
      5: '',
      6: ''
    }
  };

  // =========================================================================
  // 2. 狀態管理 (App State & Storage Keys)
  // =========================================================================
  const STORAGE_KEYS = {
    HABITS: 'focushabit_habits_v1',
    CHECKINS: 'focushabit_checkins_v1',
    DAILY_NOTES: 'focushabit_dailynotes_v1',
    SESSIONS: 'focushabit_sessions_v1',
    SUBJECTS: 'focushabit_subjects_v1',
    ACTIVE_TIMER: 'focushabit_activetimer_v1',
    THEME: 'focushabit_theme_v1'
  };

  const state = {
    currentWeekStart: null, // Date object (週日 00:00:00)
    currentView: 'board',   // 'board' | 'timer' | 'logs' | 'manage'
    habits: [],
    checkins: {},           // { [weekKey]: { [habitId]: [bool, bool, bool, bool, bool, bool, bool] } }
    dailyNotes: {},         // { [weekKey]: { [dayIdx]: string } }
    sessions: [],           // array of { id, habitId, habitName, subject, notes, startTime, endTime, durationSeconds, dateStr, weekKey, dayOfWeek }
    recentSubjects: [],
    theme: 'light',
    expandedHabitIds: new Set(),
    timer: {
      isRunning: false,
      isPaused: false,
      habitId: '',
      habitName: '',
      subject: '',
      startTime: null,      // timestamp ms
      lastResumeTime: null, // timestamp ms
      accumulatedMs: 0,
      timerInterval: null
    }
  };

  // =========================================================================
  // 3. 日期工具函式 (Date Utilities - 週日~週六 模式)
  // =========================================================================
  
  /**
   * 取得指定日期所在的該週「週日」零時零分 (對齊試算表週期)
   */
  function getSundayOfWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0 is Sunday, 1 is Monday ...
    d.setDate(d.getDate() - day);
    return d;
  }

  /**
   * 將 Date 格式化為 YYYY-MM-DD
   */
  function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * 格式化為 M/D (週幾)
   */
  function formatMonthDay(date) {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${m}/${d}`;
  }

  /**
   * 格式化秒數為 HH:MM:SS
   */
  function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  /**
   * 格式化時間 (HH:mm)
   */
  function formatClockTime(timestamp) {
    const d = new Date(timestamp);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  // =========================================================================
  // 4. 資料持久化與初始化 (Storage & Init)
  // =========================================================================
  function loadState() {
    try {
      const storedHabits = localStorage.getItem(STORAGE_KEYS.HABITS);
      state.habits = storedHabits ? JSON.parse(storedHabits) : JSON.parse(JSON.stringify(DEFAULT_HABITS));

      const storedCheckins = localStorage.getItem(STORAGE_KEYS.CHECKINS);
      state.checkins = storedCheckins ? JSON.parse(storedCheckins) : {};

      const storedNotes = localStorage.getItem(STORAGE_KEYS.DAILY_NOTES);
      state.dailyNotes = storedNotes ? JSON.parse(storedNotes) : {};

      const storedSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      state.sessions = storedSessions ? JSON.parse(storedSessions) : [];

      const storedSubjects = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
      state.recentSubjects = storedSubjects ? JSON.parse(storedSubjects) : [...DEFAULT_SUBJECTS];

      const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
      state.theme = storedTheme || 'light';

      // 檢查是否有進行中的背景計時器
      const storedTimer = localStorage.getItem(STORAGE_KEYS.ACTIVE_TIMER);
      if (storedTimer) {
        const t = JSON.parse(storedTimer);
        state.timer.isRunning = t.isRunning;
        state.timer.isPaused = t.isPaused;
        state.timer.habitId = t.habitId;
        state.timer.habitName = t.habitName;
        state.timer.subject = t.subject || '';
        state.timer.startTime = t.startTime;
        state.timer.lastResumeTime = t.lastResumeTime;
        state.timer.accumulatedMs = t.accumulatedMs || 0;
      }
    } catch (e) {
      console.error('Failed to load local storage state:', e);
      state.habits = JSON.parse(JSON.stringify(DEFAULT_HABITS));
    }

    // 初始化當前週為「今天」所在的該週
    state.currentWeekStart = getSundayOfWeek(new Date());
  }

  function saveHabits() {
    localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(state.habits));
  }

  function saveCheckins() {
    localStorage.setItem(STORAGE_KEYS.CHECKINS, JSON.stringify(state.checkins));
  }

  function saveDailyNotes() {
    localStorage.setItem(STORAGE_KEYS.DAILY_NOTES, JSON.stringify(state.dailyNotes));
  }

  function saveSessions() {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(state.sessions));
  }

  function saveRecentSubjects() {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(state.recentSubjects));
  }

  function saveActiveTimer() {
    if (state.timer.isRunning || state.timer.isPaused) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TIMER, JSON.stringify({
        isRunning: state.timer.isRunning,
        isPaused: state.timer.isPaused,
        habitId: state.timer.habitId,
        habitName: state.timer.habitName,
        subject: state.timer.subject,
        startTime: state.timer.startTime,
        lastResumeTime: state.timer.lastResumeTime,
        accumulatedMs: state.timer.accumulatedMs
      }));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_TIMER);
    }
  }

  function saveTheme() {
    localStorage.setItem(STORAGE_KEYS.THEME, state.theme);
    document.body.setAttribute('data-theme', state.theme);
    const iconEl = document.getElementById('themeIcon');
    if (iconEl) {
      iconEl.textContent = state.theme === 'dark' ? '☀️' : '🌙';
    }
  }

  // =========================================================================
  // 5. 核心渲染器 (UI Renderers)
  // =========================================================================

  /**
   * 渲染週次標題與日期範圍
   */
  function renderWeekNavigator() {
    const sunday = state.currentWeekStart;
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);

    const weekTitleEl = document.getElementById('weekTitle');
    const weekRangeEl = document.getElementById('weekRange');
    
    // 檢查是否為當週
    const nowSunday = getSundayOfWeek(new Date());
    const isCurrentWeek = sunday.getTime() === nowSunday.getTime();

    if (weekTitleEl) {
      weekTitleEl.textContent = isCurrentWeek ? '本週打卡' : `${sunday.getFullYear()} 年第 ${getWeekNumber(sunday)} 週`;
    }
    if (weekRangeEl) {
      weekRangeEl.textContent = `${formatDateKey(sunday)} (週日) ~ ${formatDateKey(saturday)} (週六)`;
    }
  }

  /**
   * 取得週數
   */
  function getWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  }

  /**
   * 渲染兩層式週打卡看板 (第一層：項目與進度總覽 / 第二層：點開展開當週 7 天陣列打卡格)
   */
  function renderHabitTable() {
    const container = document.getElementById('habitCardsContainer');
    const countBadge = document.getElementById('boardHabitsCount');
    if (!container) return;

    container.innerHTML = '';
    const weekKey = formatDateKey(state.currentWeekStart);

    // 確保本週有打卡儲存物件
    if (!state.checkins[weekKey]) {
      state.checkins[weekKey] = {};
    }

    const activeHabits = state.habits.filter(h => !h.paused);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDayIdx = today.getDay(); // 0 is Sunday, 1 is Monday ...

    // 當週日期範圍
    const sunday = state.currentWeekStart;
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    const weekRangeText = `${formatMonthDay(sunday)} (週日) ~ ${formatMonthDay(saturday)} (週六)`;

    // 預設第一次若無任何展開，展開第一個習慣以便初次檢視
    if (state.expandedHabitIds.size === 0 && activeHabits.length > 0) {
      state.expandedHabitIds.add(activeHabits[0].id);
    }

    if (countBadge) {
      countBadge.textContent = `共 ${activeHabits.length} 個進行中習慣`;
    }

    let totalTarget = 0;
    let totalCompleted = 0;
    let achievedHabits = 0;

    if (activeHabits.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="background:var(--bg-card);border:1px dashed var(--border-color);border-radius:var(--radius-lg);padding:40px 20px;">
          🌱 目前沒有進行中的習慣項目，點擊右上角「➕ 新增習慣」或到習慣管理開啟！
        </div>
      `;
      updateSummaryCards(0, 0, 0);
      return;
    }

    const dayNames = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

    activeHabits.forEach(habit => {
      // 確保打卡陣列存在 (7天)
      if (!state.checkins[weekKey][habit.id]) {
        state.checkins[weekKey][habit.id] = [false, false, false, false, false, false, false];
      }
      const daysCheck = state.checkins[weekKey][habit.id];

      // 計算本週完成次數
      const completedCount = daysCheck.filter(Boolean).length;
      const targetCount = habit.target || 1;
      const progressPercent = Math.min(Math.round((completedCount / targetCount) * 100), 100);
      const isAchieved = completedCount >= targetCount;

      totalTarget += targetCount;
      totalCompleted += completedCount;
      if (isAchieved) achievedHabits++;

      // 檢查本週各天是否有關聯的計時紀錄
      const weekSessions = state.sessions.filter(s => s.weekKey === weekKey && s.habitId === habit.id);

      // 今日是否已打卡 (第一層快捷按鈕使用)
      const isTodayChecked = !!daysCheck[todayDayIdx];
      const isExpanded = state.expandedHabitIds.has(habit.id);

      // 生成第二層的 7 天陣列 HTML
      let daysMatrixHtml = '';
      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const isChecked = !!daysCheck[dayIdx];
        const dayDate = new Date(state.currentWeekStart);
        dayDate.setDate(state.currentWeekStart.getDate() + dayIdx);
        const isDayToday = dayDate.getTime() === today.getTime();

        // 該天計時時長
        const daySessions = weekSessions.filter(s => s.dayOfWeek === dayIdx);
        const daySecs = daySessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
        let sessionBadgeHtml = '';
        if (daySecs > 0) {
          const mins = Math.round(daySecs / 60);
          const durationStr = mins >= 60 ? `${(daySecs / 3600).toFixed(1)}h` : `${mins}m`;
          sessionBadgeHtml = `<div class="day-session-badge" title="本日累計投入 ${durationStr}">⏱️ ${durationStr}</div>`;
        } else {
          sessionBadgeHtml = '<div class="day-session-placeholder"></div>';
        }

        daysMatrixHtml += `
          <div class="day-cell-card ${isDayToday ? 'is-today' : ''} ${isChecked ? 'is-checked' : ''}">
            <div class="day-cell-header">
              <span class="day-cell-name">${dayNames[dayIdx]}</span>
              <span class="day-cell-date">${formatMonthDay(dayDate)}</span>
              ${isDayToday ? '<span class="today-badge">今日</span>' : ''}
            </div>
            <button 
              class="day-matrix-btn ${isChecked ? 'checked' : ''} ${daySecs > 0 ? 'has-timer' : ''}"
              data-action="toggle-check"
              data-habit-id="${habit.id}"
              data-day="${dayIdx}"
              title="${dayNames[dayIdx]} (${formatMonthDay(dayDate)}) - 點擊切換打卡"
              aria-label="打卡 ${habit.name} ${dayNames[dayIdx]}"
            >
              ${isChecked ? '✓' : ''}
            </button>
            ${sessionBadgeHtml}
          </div>
        `;
      }

      // 構建整個卡片 (第一層 + 第二層)
      const card = document.createElement('div');
      card.className = `habit-card ${isExpanded ? 'expanded' : ''}`;
      card.dataset.habitId = habit.id;

      card.innerHTML = `
        <!-- 第一層：習慣項目總覽 (點擊整行可展開/收合) -->
        <div class="habit-card-header" data-action="toggle-expand" data-habit-id="${habit.id}">
          <div class="habit-card-left">
            <span class="habit-emoji">${habit.emoji || '🎯'}</span>
            <div class="habit-card-info">
              <div class="habit-card-title-row">
                <span class="habit-name">${escapeHtml(habit.name)}</span>
                <span class="badge badge-category">${escapeHtml(habit.category || '習慣')}</span>
                ${habit.timerEnabled ? '<span class="badge badge-primary">⏱️ 碼表</span>' : ''}
              </div>
              <div class="habit-card-sub">
                <span>每週目標: <strong>${targetCount} 次</strong></span>
                <span class="dot-sep">·</span>
                <span>已完成: <strong class="${isAchieved ? 'text-accent' : ''}">${completedCount} 次</strong></span>
                ${isAchieved ? '<span class="badge badge-success">已達標 🎉</span>' : ''}
              </div>
            </div>
          </div>

          <div class="habit-card-middle">
            <div class="habit-progress-wrap">
              <div class="progress-info-row">
                <span class="progress-rate-text ${isAchieved ? 'achieved' : ''}">${progressPercent}%</span>
                <span class="progress-count-text">${completedCount}/${targetCount}</span>
              </div>
              <div class="progress-track-sm">
                <div class="progress-bar-sm ${isAchieved ? 'achieved' : ''}" style="width: ${progressPercent}%;"></div>
              </div>
            </div>
          </div>

          <div class="habit-card-right">
            <!-- 今日快速打卡按鈕 (免展開直接打卡今日) -->
            <button 
              class="today-quick-check-btn ${isTodayChecked ? 'checked' : ''}" 
              data-action="today-check" 
              data-habit-id="${habit.id}" 
              data-day="${todayDayIdx}"
              title="快速為今日 (${formatMonthDay(today)}) 打卡"
            >
              <span class="quick-check-circle">${isTodayChecked ? '✓' : ''}</span>
              <span class="quick-check-text">${isTodayChecked ? '今日已打卡' : '今日打卡'}</span>
            </button>

            <!-- 展開/收合切換鈕 -->
            <button class="expand-toggle-btn" data-action="toggle-expand" data-habit-id="${habit.id}" title="展開/收合 7 天打卡格">
              <span>${isExpanded ? '收合' : '展開 7 天'}</span>
              <span class="expand-arrow">▼</span>
            </button>
          </div>
        </div>

        <!-- 第二層：點開展開的當週 7 天陣列日曆抽屜 (免左右滑動) -->
        <div class="habit-card-body ${isExpanded ? 'open' : ''}">
          <div class="weekly-matrix-panel">
            <div class="matrix-title-bar">
              <span class="matrix-title">📅 當週 7 天打卡進度 (${weekRangeText})</span>
              <div class="matrix-actions">
                ${habit.timerEnabled ? `
                  <button class="btn btn-sm btn-outline btn-timer" data-action="quick-timer" data-habit-id="${habit.id}" title="開啟此習慣專注碼表">
                    ⏱️ 開始計時
                  </button>
                ` : ''}
                <button class="btn btn-sm btn-outline" data-action="edit-habit" data-habit-id="${habit.id}" title="編輯目標與名稱">
                  ✏️ 編輯
                </button>
                <button class="btn btn-sm btn-outline" data-action="pause-habit" data-habit-id="${habit.id}" title="暫時休息此習慣">
                  ⏸️ 休息
                </button>
              </div>
            </div>

            <!-- 7 天陣列排布 -->
            <div class="week-days-array">
              ${daysMatrixHtml}
            </div>
          </div>
        </div>
      `;

      container.appendChild(card);
    });

    // 更新頂部總結儀表板
    updateSummaryCards(totalCompleted, totalTarget, achievedHabits);
  }

  /**
   * 更新頂部儀表板統計
   */
  function updateSummaryCards(completed, target, achievedHabitsCount) {
    const rateEl = document.getElementById('overallRate');
    const barEl = document.getElementById('overallProgressBar');
    const countEl = document.getElementById('overallCount');
    const achievedEl = document.getElementById('achievedHabitsCount');
    const focusTimeEl = document.getElementById('weekFocusTime');
    const sessionCountEl = document.getElementById('weekSessionCount');

    const percent = target > 0 ? Math.round((completed / target) * 100) : 0;

    if (rateEl) rateEl.textContent = `${percent}%`;
    if (barEl) {
      barEl.style.width = `${Math.min(percent, 100)}%`;
      if (percent >= 100) {
        barEl.classList.add('achieved');
      } else {
        barEl.classList.remove('achieved');
      }
    }
    if (countEl) countEl.textContent = `${completed} / ${target}`;
    if (achievedEl) achievedEl.textContent = `已達成 ${achievedHabitsCount} 個習慣目標`;

    // 本週專注時間統計
    const weekKey = formatDateKey(state.currentWeekStart);
    const weekSessions = state.sessions.filter(s => s.weekKey === weekKey);
    const totalSeconds = weekSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
    const hours = (totalSeconds / 3600).toFixed(1);
    const mins = Math.round(totalSeconds / 60);

    if (focusTimeEl) {
      focusTimeEl.textContent = hours >= 1 ? `${hours} 小時` : `${mins} 分鐘`;
    }
    if (sessionCountEl) {
      sessionCountEl.textContent = `共 ${weekSessions.length} 次計時紀錄`;
    }
  }

  /**
   * 渲染每日生活亮點隨筆 (Daily Notes Grid)
   */
  function renderDailyNotes() {
    const gridEl = document.getElementById('dailyNotesGrid');
    if (!gridEl) return;

    gridEl.innerHTML = '';
    const weekKey = formatDateKey(state.currentWeekStart);

    // 確保本週有隨筆物件
    if (!state.dailyNotes[weekKey]) {
      // 若為第一週且無紀錄，載入預設友善範例
      state.dailyNotes[weekKey] = SAMPLE_DAILY_NOTES[weekKey] || { 0: '', 1: '', 2: '', 3: '', 4: '', 5: '', 6: '' };
    }

    const dayNames = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const dayDate = new Date(state.currentWeekStart);
      dayDate.setDate(state.currentWeekStart.getDate() + dayIdx);
      const isToday = dayDate.getTime() === today.getTime();
      const noteContent = state.dailyNotes[weekKey][dayIdx] || '';

      const card = document.createElement('div');
      card.className = `daily-note-card ${isToday ? 'is-today' : ''}`;
      card.innerHTML = `
        <div class="daily-note-header">
          <span>${dayNames[dayIdx]} (${formatMonthDay(dayDate)})</span>
          ${isToday ? '<span class="badge badge-primary">今日</span>' : ''}
        </div>
        <textarea 
          class="daily-note-textarea" 
          data-day="${dayIdx}"
          placeholder="今天有什麼好事或特別收穫..."
        >${escapeHtml(noteContent)}</textarea>
      `;
      gridEl.appendChild(card);
    }
  }

  /**
   * 渲染碼表介面與習慣下拉選單
   */
  function renderTimerView() {
    const selectEl = document.getElementById('timerHabitSelect');
    if (!selectEl) return;

    const activeHabits = state.habits.filter(h => !h.paused);
    selectEl.innerHTML = '';

    if (activeHabits.length === 0) {
      selectEl.innerHTML = '<option value="">請先新增習慣</option>';
      return;
    }

    // 優先選取支援碼表的習慣，預設選取閱讀
    let selectedId = state.timer.habitId;
    if (!selectedId) {
      const readingHabit = activeHabits.find(h => h.name.includes('看書') || h.timerEnabled) || activeHabits[0];
      selectedId = readingHabit ? readingHabit.id : activeHabits[0].id;
      state.timer.habitId = selectedId;
    }

    activeHabits.forEach(h => {
      const option = document.createElement('option');
      option.value = h.id;
      option.textContent = `${h.emoji || '⏱️'} ${h.name}`;
      if (h.id === selectedId) option.selected = true;
      selectEl.appendChild(option);
    });

    // 渲染常用書名快捷標籤
    renderRecentSubjectTags();

    // 渲染今日專注紀錄清單
    renderTodaySessionsList();
  }

  function renderRecentSubjectTags() {
    const container = document.getElementById('recentSubjectsTags');
    if (!container) return;

    container.innerHTML = '';
    state.recentSubjects.slice(0, 8).forEach(sub => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'quick-tag-chip';
      chip.textContent = sub;
      chip.addEventListener('click', () => {
        const input = document.getElementById('timerSubjectInput');
        if (input) {
          input.value = sub;
          state.timer.subject = sub;
          saveActiveTimer();
        }
      });
      container.appendChild(chip);
    });
  }

  /**
   * 渲染今天專注結算清單
   */
  function renderTodaySessionsList() {
    const listEl = document.getElementById('todaySessionsList');
    const badgeEl = document.getElementById('todayTotalTimeBadge');
    if (!listEl) return;

    const todayStr = formatDateKey(new Date());
    const todaySessions = state.sessions.filter(s => s.dateStr === todayStr);

    let totalSecs = 0;
    listEl.innerHTML = '';

    if (todaySessions.length === 0) {
      listEl.innerHTML = '<div class="empty-state">今天還沒有結算的計時紀錄，開始專注看書吧！</div>';
      if (badgeEl) badgeEl.textContent = '今日總計 0m';
      return;
    }

    todaySessions.forEach(s => {
      totalSecs += s.durationSeconds;
      const item = document.createElement('div');
      item.className = 'session-item-card';
      item.innerHTML = `
        <div class="session-item-header">
          <span class="session-item-habit">${escapeHtml(s.habitName)}</span>
          <span class="session-item-duration">${formatDuration(s.durationSeconds)}</span>
        </div>
        <div class="session-item-sub">
          📖 <strong>${escapeHtml(s.subject || '無特別標註')}</strong> · ${formatClockTime(s.startTime)} ~ ${formatClockTime(s.endTime)}
        </div>
        ${s.notes ? `<div class="session-item-notes">📝 ${escapeHtml(s.notes)}</div>` : ''}
      `;
      listEl.appendChild(item);
    });

    const mins = Math.round(totalSecs / 60);
    if (badgeEl) {
      badgeEl.textContent = mins >= 60 ? `今日總計 ${(totalSecs / 3600).toFixed(1)}h` : `今日總計 ${mins}m`;
    }
  }

  /**
   * 渲染專注與閱讀歷程紀錄 (Logs View)
   */
  function renderLogsView() {
    const listEl = document.getElementById('sessionLogsList');
    const totalTimeEl = document.getElementById('totalFocusTimeStat');
    const totalCountEl = document.getElementById('totalSessionCountStat');
    const totalBooksEl = document.getElementById('totalUniqueBooksStat');
    const filterSelect = document.getElementById('logHabitFilter');
    const searchInput = document.getElementById('logSearchInput');

    if (!listEl) return;

    // 更新篩選選單
    if (filterSelect && filterSelect.options.length <= 1) {
      filterSelect.innerHTML = '<option value="ALL">全部習慣項目</option>';
      state.habits.forEach(h => {
        const opt = document.createElement('option');
        opt.value = h.id;
        opt.textContent = `${h.emoji} ${h.name}`;
        filterSelect.appendChild(opt);
      });
    }

    // 總體統計
    const totalSecs = state.sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
    const totalHours = (totalSecs / 3600).toFixed(1);
    const uniqueBooks = new Set(state.sessions.map(s => s.subject).filter(Boolean));

    if (totalTimeEl) totalTimeEl.textContent = `${totalHours} 小時`;
    if (totalCountEl) totalCountEl.textContent = `${state.sessions.length} 次`;
    if (totalBooksEl) totalBooksEl.textContent = `${uniqueBooks.size} 本/主題`;

    // 篩選與過濾
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const filterHabit = filterSelect ? filterSelect.value : 'ALL';

    const filtered = state.sessions.filter(s => {
      if (filterHabit !== 'ALL' && s.habitId !== filterHabit) return false;
      if (query) {
        const inSubject = (s.subject || '').toLowerCase().includes(query);
        const inNotes = (s.notes || '').toLowerCase().includes(query);
        const inHabit = (s.habitName || '').toLowerCase().includes(query);
        return inSubject || inNotes || inHabit;
      }
      return true;
    });

    listEl.innerHTML = '';
    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="empty-state">尚無符合條件的歷程紀錄</div>';
      return;
    }

    // 由新到舊排序
    filtered.sort((a, b) => b.startTime - a.startTime);

    filtered.forEach(s => {
      const row = document.createElement('div');
      row.className = 'log-entry-row';
      const dateDisplay = new Date(s.startTime).toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short'
      });

      row.innerHTML = `
        <div class="log-entry-left">
          <span class="habit-emoji">📖</span>
          <div class="log-entry-details">
            <span class="log-entry-subject">${escapeHtml(s.subject || '一般專注')}</span>
            <div class="log-entry-meta">
              <span class="badge badge-accent">${escapeHtml(s.habitName)}</span>
              <span>📅 ${dateDisplay} (${formatClockTime(s.startTime)} ~ ${formatClockTime(s.endTime)})</span>
            </div>
            ${s.notes ? `<div class="session-item-notes" style="margin-top:6px;">📝 ${escapeHtml(s.notes)}</div>` : ''}
          </div>
        </div>
        <div class="log-entry-right">
          <span class="log-entry-duration">${formatDuration(s.durationSeconds)}</span>
          <button class="row-action-btn" data-action="delete-session" data-session-id="${s.id}" title="刪除此紀錄">
            🗑️
          </button>
        </div>
      `;
      listEl.appendChild(row);
    });
  }

  /**
   * 渲染習慣庫管理介面 (Manage View)
   */
  function renderManageView() {
    const activeList = document.getElementById('activeHabitsList');
    const pausedList = document.getElementById('pausedHabitsList');
    const activeCountEl = document.getElementById('activeHabitCount');
    const pausedCountEl = document.getElementById('pausedHabitCount');

    if (!activeList || !pausedList) return;

    activeList.innerHTML = '';
    pausedList.innerHTML = '';

    const activeHabits = state.habits.filter(h => !h.paused);
    const pausedHabits = state.habits.filter(h => h.paused);

    if (activeCountEl) activeCountEl.textContent = activeHabits.length;
    if (pausedCountEl) pausedCountEl.textContent = pausedHabits.length;

    // 進行中的習慣
    if (activeHabits.length === 0) {
      activeList.innerHTML = '<div class="empty-state">尚無進行中的習慣</div>';
    } else {
      activeHabits.forEach(h => {
        activeList.appendChild(createHabitManageCard(h, false));
      });
    }

    // 暫時休息的習慣
    if (pausedHabits.length === 0) {
      pausedList.innerHTML = '<div class="empty-state">尚無暫時休息的習慣</div>';
    } else {
      pausedHabits.forEach(h => {
        pausedList.appendChild(createHabitManageCard(h, true));
      });
    }
  }

  function createHabitManageCard(habit, isPaused) {
    const card = document.createElement('div');
    card.className = 'habit-manage-card';
    card.innerHTML = `
      <div class="habit-manage-info">
        <span class="habit-emoji">${habit.emoji || '🎯'}</span>
        <div class="habit-manage-details">
          <h4>${escapeHtml(habit.name)}</h4>
          <div class="habit-manage-sub">
            <span class="badge badge-accent">${escapeHtml(habit.category || '習慣')}</span>
            <span>每週目標: <strong>${habit.target} 次</strong></span>
            ${habit.timerEnabled ? '<span class="badge badge-primary">⏱️ 碼表</span>' : ''}
          </div>
        </div>
      </div>
      <div class="habit-manage-actions">
        <button class="btn btn-sm btn-outline" data-action="edit-habit" data-habit-id="${habit.id}">✏️ 編輯</button>
        <button class="btn btn-sm btn-outline" data-action="toggle-pause" data-habit-id="${habit.id}">
          ${isPaused ? '▶️ 恢復' : '⏸️ 休息'}
        </button>
        <button class="btn btn-sm btn-danger" data-action="delete-habit" data-habit-id="${habit.id}">🗑️</button>
      </div>
    `;
    return card;
  }

  // =========================================================================
  // 6. 碼表專注計時器邏輯 (Stopwatch Logic)
  // =========================================================================

  /**
   * 計算當前碼表總累積毫秒數
   */
  function getTimerTotalMs() {
    if (!state.timer.startTime) return 0;
    let total = state.timer.accumulatedMs;
    if (state.timer.isRunning && !state.timer.isPaused) {
      total += (Date.now() - state.timer.lastResumeTime);
    }
    return total;
  }

  /**
   * 更新碼表刻度顯示
   */
  function updateTimerDisplay() {
    const totalMs = getTimerTotalMs();
    const totalSeconds = Math.floor(totalMs / 1000);
    const formatted = formatDuration(totalSeconds);

    const digitsEl = document.getElementById('timerDigits');
    const stickyDigitsEl = document.getElementById('stickyTimerDigits');
    if (digitsEl) digitsEl.textContent = formatted;
    if (stickyDigitsEl) stickyDigitsEl.textContent = formatted;

    // 狀態徽章
    const statusBadge = document.getElementById('timerStatusBadge');
    const displayBox = document.getElementById('timerDisplayBox');

    if (state.timer.isRunning) {
      if (statusBadge) {
        statusBadge.textContent = '⏱️ 計時專注中...';
        statusBadge.style.color = 'var(--success)';
      }
      if (displayBox) {
        displayBox.className = 'timer-display-box running';
      }
    } else if (state.timer.isPaused) {
      if (statusBadge) {
        statusBadge.textContent = '⏸️ 已暫停';
        statusBadge.style.color = 'var(--warning)';
      }
      if (displayBox) {
        displayBox.className = 'timer-display-box paused';
      }
    } else {
      if (statusBadge) {
        statusBadge.textContent = '準備就緒';
        statusBadge.style.color = 'var(--text-muted)';
      }
      if (displayBox) {
        displayBox.className = 'timer-display-box';
      }
    }
  }

  /**
   * 更新碼表控制按鈕狀態
   */
  function updateTimerControlsUI() {
    const startBtn = document.getElementById('timerStartBtn');
    const pauseBtn = document.getElementById('timerPauseBtn');
    const resumeBtn = document.getElementById('timerResumeBtn');
    const settleBtn = document.getElementById('timerSettleBtn');
    const resetBtn = document.getElementById('timerResetBtn');

    const stickyBar = document.getElementById('stickyTimerBar');
    const stickyTitle = document.getElementById('stickyTimerTitle');
    const stickySub = document.getElementById('stickyTimerSubject');
    const timerBadge = document.getElementById('timerBadge');

    if (state.timer.isRunning) {
      startBtn.classList.add('hidden');
      pauseBtn.classList.remove('hidden');
      resumeBtn.classList.add('hidden');
      settleBtn.disabled = false;
      resetBtn.disabled = false;

      // 頂部吸頂列
      if (stickyBar) stickyBar.classList.remove('hidden');
      if (timerBadge) timerBadge.classList.remove('hidden');
      if (stickyTitle) stickyTitle.textContent = state.timer.habitName || '專注習慣';
      if (stickySub) stickySub.textContent = state.timer.subject ? `《${state.timer.subject}》` : '';
    } else if (state.timer.isPaused) {
      startBtn.classList.add('hidden');
      pauseBtn.classList.add('hidden');
      resumeBtn.classList.remove('hidden');
      settleBtn.disabled = false;
      resetBtn.disabled = false;

      if (stickyBar) stickyBar.classList.remove('hidden');
      if (timerBadge) timerBadge.classList.remove('hidden');
    } else {
      startBtn.classList.remove('hidden');
      pauseBtn.classList.add('hidden');
      resumeBtn.classList.add('hidden');
      settleBtn.disabled = true;
      resetBtn.disabled = true;

      if (stickyBar) stickyBar.classList.add('hidden');
      if (timerBadge) timerBadge.classList.add('hidden');
    }
  }

  /**
   * 啟動計時器
   */
  function startTimer() {
    const habitSelect = document.getElementById('timerHabitSelect');
    const subjectInput = document.getElementById('timerSubjectInput');

    const habitId = habitSelect ? habitSelect.value : '';
    const habit = state.habits.find(h => h.id === habitId);
    const subject = subjectInput ? subjectInput.value.trim() : '';

    if (!habit) {
      showToast('⚠️ 請先選擇習慣項目');
      return;
    }

    const now = Date.now();
    state.timer.isRunning = true;
    state.timer.isPaused = false;
    state.timer.habitId = habit.id;
    state.timer.habitName = habit.name;
    state.timer.subject = subject;
    state.timer.startTime = now;
    state.timer.lastResumeTime = now;
    state.timer.accumulatedMs = 0;

    clearInterval(state.timer.timerInterval);
    state.timer.timerInterval = setInterval(updateTimerDisplay, 500);

    saveActiveTimer();
    updateTimerControlsUI();
    updateTimerDisplay();
    showToast(`⏱️ 開始計時：${habit.name}`);
  }

  /**
   * 暫停計時器
   */
  function pauseTimer() {
    if (!state.timer.isRunning || state.timer.isPaused) return;

    const now = Date.now();
    state.timer.accumulatedMs += (now - state.timer.lastResumeTime);
    state.timer.isRunning = false;
    state.timer.isPaused = true;

    clearInterval(state.timer.timerInterval);
    saveActiveTimer();
    updateTimerControlsUI();
    updateTimerDisplay();
    showToast('⏸️ 碼表已暫停');
  }

  /**
   * 繼續計時器
   */
  function resumeTimer() {
    if (!state.timer.isPaused) return;

    state.timer.isRunning = true;
    state.timer.isPaused = false;
    state.timer.lastResumeTime = Date.now();

    clearInterval(state.timer.timerInterval);
    state.timer.timerInterval = setInterval(updateTimerDisplay, 500);

    saveActiveTimer();
    updateTimerControlsUI();
    updateTimerDisplay();
    showToast('▶️ 繼續計時');
  }

  /**
   * 重設計時器
   */
  function resetTimer() {
    if (confirm('確定要取消本次計時嗎？未結算的時長將不會被保存。')) {
      clearInterval(state.timer.timerInterval);
      state.timer.isRunning = false;
      state.timer.isPaused = false;
      state.timer.startTime = null;
      state.timer.lastResumeTime = null;
      state.timer.accumulatedMs = 0;
      saveActiveTimer();
      updateTimerControlsUI();
      updateTimerDisplay();
      showToast('🔄 碼表已重設');
    }
  }

  /**
   * 開啟結算確認彈窗 (Settle Modal)
   */
  function openSettleModal() {
    const totalMs = getTimerTotalMs();
    const totalSeconds = Math.max(Math.floor(totalMs / 1000), 1);

    // 若正在計時中，先暫停它
    if (state.timer.isRunning) {
      pauseTimer();
    }

    const durationDisplay = document.getElementById('settleDurationDisplay');
    const timeSpanDisplay = document.getElementById('settleTimeSpanDisplay');
    const habitNameInput = document.getElementById('settleHabitName');
    const subjectInput = document.getElementById('settleSubject');
    const notesInput = document.getElementById('settleNotes');

    const startT = state.timer.startTime || Date.now();
    const endT = Date.now();

    if (durationDisplay) durationDisplay.textContent = formatDuration(totalSeconds);
    if (timeSpanDisplay) timeSpanDisplay.textContent = `${formatClockTime(startT)} ~ ${formatClockTime(endT)}`;
    if (habitNameInput) habitNameInput.value = state.timer.habitName || '';
    if (subjectInput) subjectInput.value = state.timer.subject || '';
    if (notesInput) notesInput.value = '';

    openModal('settleModal');
  }

  /**
   * 確認結算並儲存
   */
  function handleSettleSubmit(e) {
    e.preventDefault();

    const subjectInput = document.getElementById('settleSubject');
    const notesInput = document.getElementById('settleNotes');
    const syncCheck = document.getElementById('settleSyncCheck');

    const subject = subjectInput ? subjectInput.value.trim() : '';
    const notes = notesInput ? notesInput.value.trim() : '';
    const shouldSync = syncCheck ? syncCheck.checked : true;

    const totalMs = getTimerTotalMs();
    const durationSeconds = Math.max(Math.floor(totalMs / 1000), 1);
    const now = new Date();

    const newSession = {
      id: 'sess_' + Date.now(),
      habitId: state.timer.habitId,
      habitName: state.timer.habitName,
      subject: subject || '閱讀學習',
      notes: notes,
      startTime: state.timer.startTime || Date.now() - totalMs,
      endTime: Date.now(),
      durationSeconds: durationSeconds,
      dateStr: formatDateKey(now),
      weekKey: formatDateKey(getSundayOfWeek(now)),
      dayOfWeek: now.getDay()
    };

    // 儲存至歷程
    state.sessions.unshift(newSession);
    saveSessions();

    // 更新歷史書名標籤
    if (subject && !state.recentSubjects.includes(subject)) {
      state.recentSubjects.unshift(subject);
      if (state.recentSubjects.length > 15) state.recentSubjects.pop();
      saveRecentSubjects();
    }

    // 若勾選同步打卡
    if (shouldSync) {
      const weekKey = newSession.weekKey;
      const dayIdx = newSession.dayOfWeek;
      if (!state.checkins[weekKey]) state.checkins[weekKey] = {};
      if (!state.checkins[weekKey][newSession.habitId]) {
        state.checkins[weekKey][newSession.habitId] = [false, false, false, false, false, false, false];
      }
      state.checkins[weekKey][newSession.habitId][dayIdx] = true;
      saveCheckins();
    }

    // 重設計時器
    clearInterval(state.timer.timerInterval);
    state.timer.isRunning = false;
    state.timer.isPaused = false;
    state.timer.startTime = null;
    state.timer.lastResumeTime = null;
    state.timer.accumulatedMs = 0;
    saveActiveTimer();

    closeModal('settleModal');
    updateTimerControlsUI();
    updateTimerDisplay();

    // 重新渲染視圖
    renderHabitTable();
    renderTodaySessionsList();
    renderLogsView();

    const mins = Math.round(durationSeconds / 60);
    showToast(`🎉 結算成功！投入 ${mins} 分鐘，已同步今日打卡紀錄！`);
  }

  // =========================================================================
  // 7. 打卡互動與習慣管理 (Checkin & Habit CRUD)
  // =========================================================================

  /**
   * 切換打卡勾選
   */
  function toggleCheckin(habitId, dayIdx) {
    const weekKey = formatDateKey(state.currentWeekStart);
    if (!state.checkins[weekKey]) state.checkins[weekKey] = {};
    if (!state.checkins[weekKey][habitId]) {
      state.checkins[weekKey][habitId] = [false, false, false, false, false, false, false];
    }

    const currentVal = !!state.checkins[weekKey][habitId][dayIdx];
    state.checkins[weekKey][habitId][dayIdx] = !currentVal;
    saveCheckins();
    renderHabitTable();

    const habit = state.habits.find(h => h.id === habitId);
    if (!currentVal) {
      showToast(`✅ 完成打卡：${habit ? habit.name : ''}`);
    }
  }

  /**
   * 開啟新增習慣彈窗
   */
  function openAddHabitModal() {
    const modalTitle = document.getElementById('habitModalTitle');
    const formId = document.getElementById('habitFormId');
    const emojiInput = document.getElementById('habitFormEmoji');
    const nameInput = document.getElementById('habitFormName');
    const targetInput = document.getElementById('habitFormTarget');
    const catInput = document.getElementById('habitFormCategory');
    const timerCheck = document.getElementById('habitFormTimerEnabled');

    if (modalTitle) modalTitle.textContent = '新增自訂習慣';
    if (formId) formId.value = '';
    if (emojiInput) emojiInput.value = '📖';
    if (nameInput) nameInput.value = '';
    if (targetInput) targetInput.value = '3';
    if (catInput) catInput.value = '閱讀吸收';
    if (timerCheck) timerCheck.checked = true;

    openModal('habitModal');
  }

  /**
   * 開啟編輯習慣彈窗
   */
  function openEditHabitModal(habitId) {
    const habit = state.habits.find(h => h.id === habitId);
    if (!habit) return;

    const modalTitle = document.getElementById('habitModalTitle');
    const formId = document.getElementById('habitFormId');
    const emojiInput = document.getElementById('habitFormEmoji');
    const nameInput = document.getElementById('habitFormName');
    const targetInput = document.getElementById('habitFormTarget');
    const catInput = document.getElementById('habitFormCategory');
    const timerCheck = document.getElementById('habitFormTimerEnabled');

    if (modalTitle) modalTitle.textContent = '編輯習慣設定';
    if (formId) formId.value = habit.id;
    if (emojiInput) emojiInput.value = habit.emoji || '🎯';
    if (nameInput) nameInput.value = habit.name;
    if (targetInput) targetInput.value = habit.target;
    if (catInput) catInput.value = habit.category || '閱讀吸收';
    if (timerCheck) timerCheck.checked = !!habit.timerEnabled;

    openModal('habitModal');
  }

  /**
   * 儲存習慣表單 (新增或更新)
   */
  function handleHabitFormSubmit(e) {
    e.preventDefault();

    const formId = document.getElementById('habitFormId').value;
    const emoji = document.getElementById('habitFormEmoji').value.trim() || '🎯';
    const name = document.getElementById('habitFormName').value.trim();
    const target = parseInt(document.getElementById('habitFormTarget').value, 10) || 1;
    const category = document.getElementById('habitFormCategory').value;
    const timerEnabled = document.getElementById('habitFormTimerEnabled').checked;

    if (!name) {
      showToast('⚠️ 請輸入習慣名稱');
      return;
    }

    if (formId) {
      // 編輯現有習慣
      const habit = state.habits.find(h => h.id === formId);
      if (habit) {
        habit.emoji = emoji;
        habit.name = name;
        habit.target = target;
        habit.category = category;
        habit.timerEnabled = timerEnabled;
      }
      showToast(`✏️ 已更新習慣：${name}`);
    } else {
      // 新增習慣
      const newHabit = {
        id: 'h_' + Date.now(),
        emoji: emoji,
        name: name,
        target: target,
        category: category,
        timerEnabled: timerEnabled,
        paused: false
      };
      state.habits.push(newHabit);
      showToast(`🌱 已成功新增習慣：${name}`);
    }

    saveHabits();
    closeModal('habitModal');
    renderHabitTable();
    renderTimerView();
    renderManageView();
  }

  /**
   * 切換暫時休息 (封存) 狀態
   */
  function togglePauseHabit(habitId) {
    const habit = state.habits.find(h => h.id === habitId);
    if (!habit) return;

    habit.paused = !habit.paused;
    saveHabits();
    renderHabitTable();
    renderTimerView();
    renderManageView();

    showToast(habit.paused ? `⏸️ 已將「${habit.name}」移至暫時休息` : `▶️ 已恢復「${habit.name}」`);
  }

  /**
   * 刪除習慣
   */
  function deleteHabit(habitId) {
    const habit = state.habits.find(h => h.id === habitId);
    if (!habit) return;

    if (confirm(`確定要刪除習慣「${habit.name}」嗎？歷史打卡資料將會被移除。`)) {
      state.habits = state.habits.filter(h => h.id !== habitId);
      saveHabits();
      renderHabitTable();
      renderTimerView();
      renderManageView();
      showToast(`🗑️ 已刪除習慣：${habit.name}`);
    }
  }

  /**
   * 刪除專注紀錄
   */
  function deleteSession(sessionId) {
    if (confirm('確定要刪除此筆計時結算紀錄嗎？')) {
      state.sessions = state.sessions.filter(s => s.id !== sessionId);
      saveSessions();
      renderLogsView();
      renderTodaySessionsList();
      renderHabitTable();
      showToast('🗑️ 已刪除計時紀錄');
    }
  }

  // =========================================================================
  // 8. 視圖導航與彈窗工具 (View Navigation & Modal Helpers)
  // =========================================================================

  function switchView(viewName) {
    state.currentView = viewName;
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.view === viewName);
    });
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const targetSection = document.getElementById('view' + capitalize(viewName));
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // 切換時更新該頁面內容
    if (viewName === 'board') renderHabitTable();
    if (viewName === 'timer') renderTimerView();
    if (viewName === 'logs') renderLogsView();
    if (viewName === 'manage') renderManageView();
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('hidden');
  }

  function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('hidden');
  }

  function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  function escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
  }

  // =========================================================================
  // 9. 資料備份與還原 (Backup, Export, Import)
  // =========================================================================

  function exportBackupJson() {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      habits: state.habits,
      checkins: state.checkins,
      dailyNotes: state.dailyNotes,
      sessions: state.sessions,
      recentSubjects: state.recentSubjects
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focushabit-backup-${formatDateKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📥 備份檔案已成功下載！');
  }

  function importBackupJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result);
        if (data.habits && Array.isArray(data.habits)) {
          state.habits = data.habits;
          state.checkins = data.checkins || {};
          state.dailyNotes = data.dailyNotes || {};
          state.sessions = data.sessions || [];
          state.recentSubjects = data.recentSubjects || DEFAULT_SUBJECTS;

          saveHabits();
          saveCheckins();
          saveDailyNotes();
          saveSessions();
          saveRecentSubjects();

          renderHabitTable();
          renderDailyNotes();
          renderTimerView();
          renderLogsView();
          renderManageView();

          closeModal('backupModal');
          showToast('✅ 備份資料已成功還原！');
        } else {
          alert('匯入的 JSON 格式不正確。');
        }
      } catch (err) {
        alert('解析備份檔案失敗：' + err.message);
      }
    };
    reader.readAsText(file);
  }

  function resetToDefaults() {
    if (confirm('確定要還原回 Google 試算表原始預設習慣嗎？這會重設自訂習慣清單。')) {
      state.habits = JSON.parse(JSON.stringify(DEFAULT_HABITS));
      saveHabits();
      renderHabitTable();
      renderTimerView();
      renderManageView();
      closeModal('backupModal');
      showToast('🔄 已還原為試算表原始習慣！');
    }
  }

  // =========================================================================
  // 10. 事件監聽綁定 (Event Listeners)
  // =========================================================================

  function bindEvents() {
    // 頂部導覽頁籤切換
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => switchView(tab.dataset.view));
    });

    // 週次切換
    document.getElementById('prevWeekBtn').addEventListener('click', () => {
      state.currentWeekStart.setDate(state.currentWeekStart.getDate() - 7);
      renderWeekNavigator();
      renderHabitTable();
      renderDailyNotes();
    });

    document.getElementById('nextWeekBtn').addEventListener('click', () => {
      state.currentWeekStart.setDate(state.currentWeekStart.getDate() + 7);
      renderWeekNavigator();
      renderHabitTable();
      renderDailyNotes();
    });

    document.getElementById('todayBtn').addEventListener('click', () => {
      state.currentWeekStart = getSundayOfWeek(new Date());
      renderWeekNavigator();
      renderHabitTable();
      renderDailyNotes();
    });

    // 兩層式習慣看板事件委派 (今日快打、7天矩陣打卡、展開收合、碼表、編輯、休息)
    const boardContainer = document.getElementById('habitCardsContainer');
    if (boardContainer) {
      boardContainer.addEventListener('click', (e) => {
        // 1. 今日快速打卡按鈕 (第一層)
        const todayBtn = e.target.closest('[data-action="today-check"]');
        if (todayBtn) {
          e.stopPropagation();
          const habitId = todayBtn.dataset.habitId;
          const dayIdx = parseInt(todayBtn.dataset.day, 10);
          toggleCheckin(habitId, dayIdx);
          return;
        }

        // 2. 7 天陣列日曆打卡按鈕 (第二層)
        const matrixBtn = e.target.closest('[data-action="toggle-check"]');
        if (matrixBtn) {
          e.stopPropagation();
          const habitId = matrixBtn.dataset.habitId;
          const dayIdx = parseInt(matrixBtn.dataset.day, 10);
          toggleCheckin(habitId, dayIdx);
          return;
        }

        // 3. 快捷啟動碼表
        const timerBtn = e.target.closest('[data-action="quick-timer"]');
        if (timerBtn) {
          e.stopPropagation();
          const habitId = timerBtn.dataset.habitId;
          switchView('timer');
          const selectEl = document.getElementById('timerHabitSelect');
          if (selectEl) selectEl.value = habitId;
          return;
        }

        // 4. 編輯習慣
        const editBtn = e.target.closest('[data-action="edit-habit"]');
        if (editBtn) {
          e.stopPropagation();
          openEditHabitModal(editBtn.dataset.habitId);
          return;
        }

        // 5. 休息/封存習慣
        const pauseBtn = e.target.closest('[data-action="pause-habit"]');
        if (pauseBtn) {
          e.stopPropagation();
          togglePauseHabit(pauseBtn.dataset.habitId);
          return;
        }

        // 6. 點擊第一層標題列或展開鈕切換展開/收合
        const expandTarget = e.target.closest('[data-action="toggle-expand"]');
        if (expandTarget) {
          const habitId = expandTarget.dataset.habitId;
          if (state.expandedHabitIds.has(habitId)) {
            state.expandedHabitIds.delete(habitId);
          } else {
            state.expandedHabitIds.add(habitId);
          }
          renderHabitTable();
          return;
        }
      });
    }

    // 全部展開與全部收合
    const expandAllBtn = document.getElementById('expandAllBtn');
    if (expandAllBtn) {
      expandAllBtn.addEventListener('click', () => {
        state.habits.filter(h => !h.paused).forEach(h => state.expandedHabitIds.add(h.id));
        renderHabitTable();
      });
    }

    const collapseAllBtn = document.getElementById('collapseAllBtn');
    if (collapseAllBtn) {
      collapseAllBtn.addEventListener('click', () => {
        state.expandedHabitIds.clear();
        renderHabitTable();
      });
    }

    // 每日隨筆輸入保存 (委派監聽 change / blur)
    const notesGrid = document.getElementById('dailyNotesGrid');
    if (notesGrid) {
      notesGrid.addEventListener('change', (e) => {
        if (e.target.classList.contains('daily-note-textarea')) {
          const dayIdx = parseInt(e.target.dataset.day, 10);
          const weekKey = formatDateKey(state.currentWeekStart);
          if (!state.dailyNotes[weekKey]) state.dailyNotes[weekKey] = {};
          state.dailyNotes[weekKey][dayIdx] = e.target.value.trim();
          saveDailyNotes();
          showToast('💾 隨筆記事已即時保存');
        }
      });
    }

    // 碼表控制按鈕
    document.getElementById('timerStartBtn').addEventListener('click', startTimer);
    document.getElementById('timerPauseBtn').addEventListener('click', pauseTimer);
    document.getElementById('timerResumeBtn').addEventListener('click', resumeTimer);
    document.getElementById('timerSettleBtn').addEventListener('click', openSettleModal);
    document.getElementById('timerResetBtn').addEventListener('click', resetTimer);

    // 吸頂計時列控制
    document.getElementById('stickyPauseBtn').addEventListener('click', () => {
      if (state.timer.isRunning) pauseTimer();
      else if (state.timer.isPaused) resumeTimer();
    });
    document.getElementById('stickyFinishBtn').addEventListener('click', openSettleModal);

    // 結算表單提交
    document.getElementById('settleForm').addEventListener('submit', handleSettleSubmit);

    // 新增/編輯習慣按鈕與表單
    document.getElementById('addHabitBtn').addEventListener('click', openAddHabitModal);
    document.getElementById('manageAddBtn').addEventListener('click', openAddHabitModal);
    document.getElementById('habitForm').addEventListener('submit', handleHabitFormSubmit);

    // 習慣 Emoji 選取器小晶片
    document.querySelectorAll('.emoji-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const input = document.getElementById('habitFormEmoji');
        if (input) input.value = chip.dataset.emoji;
      });
    });

    // 習慣管理清單委派事件 (編輯、休息/恢復、刪除)
    const manageSection = document.getElementById('viewManage');
    if (manageSection) {
      manageSection.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const habitId = btn.dataset.habitId;

        if (action === 'edit-habit') openEditHabitModal(habitId);
        else if (action === 'toggle-pause') togglePauseHabit(habitId);
        else if (action === 'delete-habit') deleteHabit(habitId);
      });
    }

    // 歷程紀錄清單委派事件 (刪除紀錄)
    const logsList = document.getElementById('sessionLogsList');
    if (logsList) {
      logsList.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action="delete-session"]');
        if (btn) deleteSession(btn.dataset.sessionId);
      });
    }

    // 歷程搜尋與篩選
    const logSearchInput = document.getElementById('logSearchInput');
    const logHabitFilter = document.getElementById('logHabitFilter');
    if (logSearchInput) logSearchInput.addEventListener('input', renderLogsView);
    if (logHabitFilter) logHabitFilter.addEventListener('change', renderLogsView);

    // 深淺色主題切換
    document.getElementById('themeToggleBtn').addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      saveTheme();
    });

    // 備份與還原按鈕
    document.getElementById('backupModalBtn').addEventListener('click', () => openModal('backupModal'));
    document.getElementById('exportJsonBtn').addEventListener('click', exportBackupJson);
    document.getElementById('triggerImportBtn').addEventListener('click', () => {
      document.getElementById('importJsonInput').click();
    });
    document.getElementById('importJsonInput').addEventListener('change', (e) => {
      importBackupJson(e.target.files[0]);
    });
    document.getElementById('resetDefaultsBtn').addEventListener('click', resetToDefaults);

    // 通用彈窗關閉按鈕
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(btn.dataset.close));
    });

    // 點擊彈窗遮罩關閉
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.add('hidden');
      });
    });
  }

  // =========================================================================
  // 11. 應用程式啟動 (App Bootstrap)
  // =========================================================================
  function init() {
    loadState();
    saveTheme();

    renderWeekNavigator();
    renderHabitTable();
    renderDailyNotes();
    renderTimerView();
    renderLogsView();
    renderManageView();

    bindEvents();

    // 若有背景執行中的計時器，恢復間隔更新
    if (state.timer.isRunning) {
      state.timer.timerInterval = setInterval(updateTimerDisplay, 500);
      updateTimerControlsUI();
      updateTimerDisplay();
    } else if (state.timer.isPaused) {
      updateTimerControlsUI();
      updateTimerDisplay();
    }
  }

  // DOM 載入後啟動
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
