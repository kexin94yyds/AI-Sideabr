// 全局变量
let activities = [];
let currentActivity = null;

// 统计视图类型
const STATS_VIEW = {
    DAILY_DISTRIBUTION: 'daily_distribution',  // 当日所有活动分布
    ACTIVITY_DAILY: 'activity_daily',          // 特定活动的每日分布
    ACTIVITY_TOTAL: 'activity_total',          // 特定活动的累计时间
    ANNUAL_TABLE: 'annual_table'               // 年度统计表
};

// 当前统计视图类型
let currentStatsView = STATS_VIEW.DAILY_DISTRIBUTION;
// 当前选中的活动（用于活动每日统计和累计统计）
let selectedActivity = null;

// DOM 元素
const currentTimeElement = document.getElementById('current-time');
const activityNameInput = document.getElementById('activity-name');
const startButton = document.getElementById('start-btn');
const endButton = document.getElementById('end-btn');
const noActivityElement = document.getElementById('no-activity');
const activityDetailsElement = document.getElementById('activity-details');
const currentActivityNameElement = document.getElementById('current-activity-name');
const startTimeElement = document.getElementById('start-time');
const durationElement = document.getElementById('duration');
const activityListElement = document.getElementById('activity-list');
const noRecordsElement = document.getElementById('no-records');

// 统计相关DOM元素
const statsDateInput = document.getElementById('stats-date');
const showStatsButton = document.getElementById('show-stats-btn');
const timeChartCanvas = document.getElementById('time-chart');
const noStatsElement = document.getElementById('no-stats');
const statsSummaryElement = document.getElementById('stats-summary');

// 统计视图相关DOM元素
const dailyDistributionBtn = document.getElementById('daily-distribution-btn');
const activityDailyBtn = document.getElementById('activity-daily-btn');
const activityTotalBtn = document.getElementById('activity-total-btn');
const annualTableBtn = document.getElementById('annual-table-btn');
const activitySelector = document.getElementById('activity-selector');
const activitySelect = document.getElementById('activity-select');
const annualTableControls = document.getElementById('annual-table-controls');
const annualTableContainer = document.getElementById('annual-table-container');
const dateSelector = document.querySelector('.date-selector');

// 图表相关变量
let timeChart = null;

// 初始化应用
function initApp() {
    // 从本地存储加载数据
    loadData();
    
    // 设置当前时间显示
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    // 如果有正在进行的活动，更新UI并开始计时
    if (currentActivity) {
        updateCurrentActivityUI();
        startDurationTimer();
    }
    
    // 更新活动列表
    updateActivityList();
    
    // 设置统计日期默认为今天
    const today = new Date();
    statsDateInput.valueAsDate = today;
    
    // 更新活动选择器
    updateActivitySelector();
    
    // 添加事件监听器
    startButton.addEventListener('click', startActivity);
    endButton.addEventListener('click', endActivity);
    showStatsButton.addEventListener('click', showStatistics);
    
    // 添加统计视图切换事件监听器
    dailyDistributionBtn.addEventListener('click', () => updateStatsView(STATS_VIEW.DAILY_DISTRIBUTION));
    activityDailyBtn.addEventListener('click', () => {
        if (activitySelect.value) {
            updateStatsView(STATS_VIEW.ACTIVITY_DAILY, activitySelect.value);
        }
    });
    activityTotalBtn.addEventListener('click', () => updateStatsView(STATS_VIEW.ACTIVITY_TOTAL));
    annualTableBtn.addEventListener('click', () => updateStatsView(STATS_VIEW.ANNUAL_TABLE));
    activitySelect.addEventListener('change', () => {
        if (currentStatsView === STATS_VIEW.ACTIVITY_DAILY && activitySelect.value) {
            updateStatsView(STATS_VIEW.ACTIVITY_DAILY, activitySelect.value);
        }
    });
    
    // 初始显示今日统计
    showStatistics();
}

// 更新当前时间显示
function updateCurrentTime() {
    const now = new Date();
    currentTimeElement.textContent = formatDateTime(now);
}

// 开始新活动
function startActivity() {
    const activityName = activityNameInput.value.trim();
    
    if (!activityName) {
        alert('请输入活动名称');
        return;
    }
    
    // 查找最近的同名活动记录
    const lastActivity = findLastActivityByName(activityName);
    let continuedFrom = null;
    let isPartOfSeries = false;
    
    if (lastActivity) {
        continuedFrom = lastActivity.id;
        isPartOfSeries = true;
    }
    
    // 如果有正在进行的活动，先结束它
    if (currentActivity) {
        endActivity();
    }
    
    // 创建新活动
    const now = new Date();
    currentActivity = {
        id: generateId(),
        activityName: activityName,
        startTime: now,
        endTime: null,
        duration: 0,
        continuedFrom: continuedFrom,
        isPartOfSeries: isPartOfSeries
    };
    
    // 更新UI
    updateCurrentActivityUI();
    startDurationTimer();
    
    // 清空输入框
    activityNameInput.value = '';
    
    // 保存数据
    saveData();
}

// 查找最近的同名活动
function findLastActivityByName(name) {
    return activities.find(activity => activity.activityName === name);
}

// 结束当前活动
function endActivity() {
    if (!currentActivity) return;
    
    // 设置结束时间和持续时间
    const now = new Date();
    currentActivity.endTime = now;
    currentActivity.duration = calculateDuration(currentActivity.startTime, now);
    
    // 添加到活动列表
    activities.unshift(currentActivity);
    
    // 清除当前活动
    currentActivity = null;
    
    // 更新UI
    updateCurrentActivityUI();
    updateActivityList();
    
    // 保存数据
    saveData();
}

// 更新当前活动UI
function updateCurrentActivityUI() {
    if (currentActivity) {
        noActivityElement.classList.add('hidden');
        activityDetailsElement.classList.remove('hidden');
        
        currentActivityNameElement.textContent = currentActivity.activityName;
        startTimeElement.textContent = formatDateTime(currentActivity.startTime);
        updateDurationDisplay();
    } else {
        noActivityElement.classList.remove('hidden');
        activityDetailsElement.classList.add('hidden');
    }
}

// 开始持续时间计时器
function startDurationTimer() {
    // 清除可能存在的旧计时器
    if (window.durationTimer) {
        clearInterval(window.durationTimer);
    }
    
    // 设置新计时器，每秒更新一次
    window.durationTimer = setInterval(updateDurationDisplay, 1000);
}

// 更新持续时间显示
function updateDurationDisplay() {
    if (!currentActivity) {
        if (window.durationTimer) {
            clearInterval(window.durationTimer);
        }
        return;
    }
    
    const now = new Date();
    const duration = calculateDuration(currentActivity.startTime, now);
    durationElement.textContent = formatDuration(duration);
}

// 更新活动列表
function updateActivityList() {
    // 如果没有活动记录，显示提示信息
    if (activities.length === 0) {
        noRecordsElement.classList.remove('hidden');
        return;
    }
    
    // 隐藏提示信息
    noRecordsElement.classList.add('hidden');
    
    // 清空列表
    while (activityListElement.firstChild && activityListElement.firstChild !== noRecordsElement) {
        activityListElement.removeChild(activityListElement.firstChild);
    }
    
    // 添加活动记录
    activities.forEach(activity => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.style.borderLeftColor = getColorForActivity(activity.activityName);
        
        // 如果是连续活动，添加标记
        if (activity.isPartOfSeries) {
            activityItem.classList.add('continued-activity');
        }
        
        const header = document.createElement('div');
        header.className = 'activity-item-header';
        
        const name = document.createElement('div');
        name.className = 'activity-item-name';
        name.textContent = activity.activityName;
        
        const duration = document.createElement('div');
        duration.className = 'activity-item-duration';
        duration.textContent = formatDuration(activity.duration);
        
        header.appendChild(name);
        header.appendChild(duration);
        
        const time = document.createElement('div');
        time.className = 'activity-item-time';
        
        const startTime = document.createElement('div');
        startTime.textContent = `开始: ${formatDateTime(activity.startTime)}`;
        
        const endTime = document.createElement('div');
        endTime.textContent = `结束: ${formatDateTime(activity.endTime)}`;
        
        time.appendChild(startTime);
        time.appendChild(endTime);
        
        activityItem.appendChild(header);
        activityItem.appendChild(time);
        
        activityListElement.appendChild(activityItem);
    });
    
    // 更新活动选择器
    updateActivitySelector();
}

// 保存数据到本地存储
function saveData() {
    const data = {
        activities: activities,
        currentActivity: currentActivity
    };
    
    localStorage.setItem('timeTrackerData', JSON.stringify(data));
}

// 从本地存储加载数据
function loadData() {
    const dataString = localStorage.getItem('timeTrackerData');
    
    if (!dataString) return;
    
    try {
        const data = JSON.parse(dataString);
        
        // 恢复日期对象
        activities = data.activities.map(activity => ({
            ...activity,
            startTime: new Date(activity.startTime),
            endTime: activity.endTime ? new Date(activity.endTime) : null
        }));
        
        if (data.currentActivity) {
            currentActivity = {
                ...data.currentActivity,
                startTime: new Date(data.currentActivity.startTime),
                endTime: data.currentActivity.endTime ? new Date(data.currentActivity.endTime) : null
            };
        }
    } catch (error) {
        console.error('加载数据失败:', error);
        activities = [];
        currentActivity = null;
    }
}

// 工具函数

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 计算持续时间（分钟）
function calculateDuration(startTime, endTime) {
    return Math.floor((endTime - startTime) / (1000 * 60));
}

// 格式化日期时间
function formatDateTime(date) {
    if (!date) return '';
    
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    
    return new Date(date).toLocaleString('zh-CN', options);
}

// 格式化持续时间
function formatDuration(minutes) {
    if (minutes < 60) {
        return `${minutes} 分钟`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
        return `${hours} 小时`;
    }
    
    return `${hours} 小时 ${remainingMinutes} 分钟`;
}

// 根据活动名称生成颜色
function getColorForActivity(activityName) {
    // 简单的哈希函数生成颜色
    let hash = 0;
    for (let i = 0; i < activityName.length; i++) {
        hash = activityName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
        '#3498db', // 蓝色
        '#2ecc71', // 绿色
        '#e74c3c', // 红色
        '#f39c12', // 橙色
        '#9b59b6', // 紫色
        '#1abc9c', // 青色
        '#d35400', // 深橙色
        '#2c3e50'  // 深蓝色
    ];
    
    return colors[Math.abs(hash) % colors.length];
}

// 显示统计数据
function showStatistics() {
    const selectedDate = statsDateInput.valueAsDate;
    if (!selectedDate) return;
    
    // 根据当前视图类型显示不同的统计数据
    switch (currentStatsView) {
        case STATS_VIEW.DAILY_DISTRIBUTION:
            showDailyDistribution(selectedDate);
            break;
        case STATS_VIEW.ACTIVITY_DAILY:
            if (selectedActivity) {
                showActivityDailyStats(selectedActivity);
            }
            break;
        case STATS_VIEW.ACTIVITY_TOTAL:
            showActivityTotalStats();
            break;
        case STATS_VIEW.ANNUAL_TABLE:
            // 年度统计表由专门的函数处理
            break;
    }
}

// 显示当日活动分布
function showDailyDistribution(selectedDate) {
    // 格式化日期为YYYY-MM-DD格式，用于比较
    const dateString = selectedDate.toISOString().split('T')[0];
    
    // 获取所选日期的活动
    const dailyActivities = getDailyActivities(dateString);
    
    // 如果没有活动记录，显示提示信息
    if (dailyActivities.length === 0) {
        noStatsElement.classList.remove('hidden');
        statsSummaryElement.innerHTML = '';
        
        // 清除现有图表
        if (timeChart) {
            timeChart.destroy();
            timeChart = null;
        }
        
        return;
    }
    
    // 隐藏提示信息
    noStatsElement.classList.add('hidden');
    
    // 处理数据
    const statsData = processStatsData(dailyActivities);
    
    // 更新图表 - 饼图
    updatePieChart(statsData);
    
    // 更新统计摘要
    updateStatsSummary(statsData);
}

// 显示特定活动的每日统计
function showActivityDailyStats(activityName) {
    const activityStats = calculateActivityStats();
    
    if (!activityStats[activityName]) {
        noStatsElement.classList.remove('hidden');
        statsSummaryElement.innerHTML = '';
        
        // 清除现有图表
        if (timeChart) {
            timeChart.destroy();
            timeChart = null;
        }
        
        return;
    }
    
    // 隐藏提示信息
    noStatsElement.classList.add('hidden');
    
    const dailyData = activityStats[activityName].dailyStats;
    const labels = Object.keys(dailyData).sort();
    const data = labels.map(date => dailyData[date]);
    const backgroundColor = Array(labels.length).fill(activityStats[activityName].color);
    
    // 更新图表 - 条形图
    updateBarChart(labels, data, backgroundColor, activityName);
    
    // 更新统计摘要
    updateActivityDailySummary(activityName, dailyData, activityStats[activityName].totalMinutes);
}

// 显示所有活动的累计统计
function showActivityTotalStats() {
    const activityStats = calculateActivityStats();
    const activityNames = Object.keys(activityStats);
    
    if (activityNames.length === 0) {
        noStatsElement.classList.remove('hidden');
        statsSummaryElement.innerHTML = '';
        
        // 清除现有图表
        if (timeChart) {
            timeChart.destroy();
            timeChart = null;
        }
        
        return;
    }
    
    // 隐藏提示信息
    noStatsElement.classList.add('hidden');
    
    const labels = activityNames;
    const data = labels.map(name => activityStats[name].totalMinutes);
    const backgroundColor = labels.map(name => activityStats[name].color);
    
    // 更新图表 - 饼图
    updatePieChart({
        items: labels.map((name, index) => ({
            name: name,
            totalMinutes: data[index],
            color: backgroundColor[index],
            percentage: Math.round((data[index] / data.reduce((a, b) => a + b, 0)) * 100)
        })),
        totalMinutes: data.reduce((a, b) => a + b, 0)
    });
    
    // 更新统计摘要
    updateActivityTotalSummary(activityStats);
}

// 获取指定日期的活动记录
function getDailyActivities(dateString) {
    // 包括已完成的活动和当前进行中的活动
    const allActivities = [...activities];
    if (currentActivity) {
        // 为当前活动创建临时结束时间以计算持续时间
        const tempActivity = {
            ...currentActivity,
            endTime: new Date(),
            duration: calculateDuration(currentActivity.startTime, new Date())
        };
        allActivities.unshift(tempActivity);
    }
    
    // 筛选指定日期的活动
    return allActivities.filter(activity => {
        const activityDate = new Date(activity.startTime).toISOString().split('T')[0];
        return activityDate === dateString;
    });
}

// 处理统计数据
function processStatsData(activities) {
    // 按活动名称分组并计算总时间
    const activityGroups = {};
    
    activities.forEach(activity => {
        const name = activity.activityName;
        if (!activityGroups[name]) {
            activityGroups[name] = {
                name: name,
                totalMinutes: 0,
                color: getColorForActivity(name)
            };
        }
        
        activityGroups[name].totalMinutes += activity.duration;
    });
    
    // 转换为数组并计算百分比
    const result = Object.values(activityGroups);
    const totalMinutes = result.reduce((sum, item) => sum + item.totalMinutes, 0);
    
    result.forEach(item => {
        item.percentage = Math.round((item.totalMinutes / totalMinutes) * 100);
    });
    
    // 按时间降序排序
    result.sort((a, b) => b.totalMinutes - a.totalMinutes);
    
    return {
        items: result,
        totalMinutes: totalMinutes
    };
}

// 更新图表
function updateChart(statsData) {
    // 准备图表数据
    const labels = statsData.items.map(item => item.name);
    const data = statsData.items.map(item => item.totalMinutes);
    const backgroundColor = statsData.items.map(item => item.color);
    
    // 如果已有图表，销毁它
    if (timeChart) {
        timeChart.destroy();
    }
    
    // 创建新图表
    timeChart = new Chart(timeChartCanvas, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColor,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: {
                            size: 14
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const percentage = Math.round((value / statsData.totalMinutes) * 100);
                            return `${label}: ${formatDuration(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// 更新统计摘要
function updateStatsSummary(statsData) {
    // 清空摘要区域
    statsSummaryElement.innerHTML = '';
    
    // 添加总时间
    const totalElement = document.createElement('div');
    totalElement.className = 'stats-total';
    totalElement.textContent = `总计: ${formatDuration(statsData.totalMinutes)}`;
    statsSummaryElement.appendChild(totalElement);
    
    // 添加各活动详情
    statsData.items.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'stats-summary-item';
        
        const nameElement = document.createElement('div');
        nameElement.className = 'stats-summary-item-name';
        
        const colorIndicator = document.createElement('span');
        colorIndicator.className = 'color-indicator';
        colorIndicator.style.backgroundColor = item.color;
        
        nameElement.appendChild(colorIndicator);
        nameElement.appendChild(document.createTextNode(item.name));
        
        const detailElement = document.createElement('div');
        detailElement.textContent = `${formatDuration(item.totalMinutes)} (${item.percentage}%)`;
        
        itemElement.appendChild(nameElement);
        itemElement.appendChild(detailElement);
        
        statsSummaryElement.appendChild(itemElement);
    });
}

// 初始化应用
document.addEventListener('DOMContentLoaded', initApp);
