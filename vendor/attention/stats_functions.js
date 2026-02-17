// 更新活动选择器
function updateActivitySelector() {
    // 清空选择器
    activitySelect.innerHTML = '';
    
    // 获取所有不同的活动名称
    const activityNames = [...new Set(activities.map(activity => activity.activityName))];
    
    // 如果没有活动，隐藏选择器
    if (activityNames.length === 0) {
        activitySelector.classList.add('hidden');
        return;
    }
    
    // 添加活动选项
    activityNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
    });
    
    // 显示选择器（当需要时）
    if (currentStatsView === STATS_VIEW.ACTIVITY_DAILY) {
        activitySelector.classList.remove('hidden');
    }
}

// 更新统计视图
function updateStatsView(viewType, activityName = null) {
    currentStatsView = viewType;
    selectedActivity = activityName;
    
    // 更新按钮状态
    dailyDistributionBtn.classList.toggle('active', viewType === STATS_VIEW.DAILY_DISTRIBUTION);
    activityDailyBtn.classList.toggle('active', viewType === STATS_VIEW.ACTIVITY_DAILY);
    activityTotalBtn.classList.toggle('active', viewType === STATS_VIEW.ACTIVITY_TOTAL);
    
    // 显示/隐藏活动选择器
    activitySelector.classList.toggle('hidden', viewType !== STATS_VIEW.ACTIVITY_DAILY);
    
    // 显示统计数据
    showStatistics();
}

// 计算活动统计数据
function calculateActivityStats() {
    const activityStats = {};
    
    // 包括已完成的活动和当前进行中的活动
    const allActivities = [...activities];
    if (currentActivity) {
        const tempActivity = {
            ...currentActivity,
            endTime: new Date(),
            duration: calculateDuration(currentActivity.startTime, new Date())
        };
        allActivities.unshift(tempActivity);
    }
    
    // 计算每个活动的统计数据
    allActivities.forEach(activity => {
        const name = activity.activityName;
        const date = new Date(activity.startTime).toISOString().split('T')[0];
        
        if (!activityStats[name]) {
            activityStats[name] = {
                dailyStats: {},
                totalMinutes: 0,
                color: getColorForActivity(name)
            };
        }
        
        if (!activityStats[name].dailyStats[date]) {
            activityStats[name].dailyStats[date] = 0;
        }
        
        activityStats[name].dailyStats[date] += activity.duration;
        activityStats[name].totalMinutes += activity.duration;
    });
    
    return activityStats;
}
