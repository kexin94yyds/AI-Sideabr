// 更新饼图
function updatePieChart(statsData) {
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

// 更新条形图
function updateBarChart(labels, data, backgroundColor, activityName) {
    // 如果已有图表，销毁它
    if (timeChart) {
        timeChart.destroy();
    }
    
    // 创建新图表
    timeChart = new Chart(timeChartCanvas, {
        type: 'bar',
        data: {
            labels: labels.map(date => {
                // 将YYYY-MM-DD格式转换为更友好的显示格式
                const d = new Date(date);
                return `${d.getMonth() + 1}月${d.getDate()}日`;
            }),
            datasets: [{
                label: activityName,
                data: data,
                backgroundColor: backgroundColor,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + ' 分钟';
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw || 0;
                            return `${activityName}: ${formatDuration(value)}`;
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

// 更新活动每日统计摘要
function updateActivityDailySummary(activityName, dailyData, totalMinutes) {
    // 清空摘要区域
    statsSummaryElement.innerHTML = '';
    
    // 添加总时间
    const totalElement = document.createElement('div');
    totalElement.className = 'stats-total';
    totalElement.textContent = `${activityName} 总计: ${formatDuration(totalMinutes)}`;
    statsSummaryElement.appendChild(totalElement);
    
    // 添加每日详情
    const dates = Object.keys(dailyData).sort().reverse(); // 最近日期优先
    
    dates.forEach(date => {
        const minutes = dailyData[date];
        const percentage = Math.round((minutes / totalMinutes) * 100);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'stats-summary-item';
        
        const dateElement = document.createElement('div');
        dateElement.textContent = formatDate(date);
        
        const detailElement = document.createElement('div');
        detailElement.textContent = `${formatDuration(minutes)} (${percentage}%)`;
        
        itemElement.appendChild(dateElement);
        itemElement.appendChild(detailElement);
        
        statsSummaryElement.appendChild(itemElement);
    });
}

// 更新活动累计统计摘要
function updateActivityTotalSummary(activityStats) {
    // 清空摘要区域
    statsSummaryElement.innerHTML = '';
    
    // 计算总时间
    const totalMinutes = Object.values(activityStats).reduce((sum, stats) => sum + stats.totalMinutes, 0);
    
    // 添加总时间
    const totalElement = document.createElement('div');
    totalElement.className = 'stats-total';
    totalElement.textContent = `所有活动总计: ${formatDuration(totalMinutes)}`;
    statsSummaryElement.appendChild(totalElement);
    
    // 按总时间降序排序活动
    const sortedActivities = Object.entries(activityStats)
        .sort((a, b) => b[1].totalMinutes - a[1].totalMinutes);
    
    // 添加各活动详情
    sortedActivities.forEach(([name, stats]) => {
        const percentage = Math.round((stats.totalMinutes / totalMinutes) * 100);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'stats-summary-item';
        
        const nameElement = document.createElement('div');
        nameElement.className = 'stats-summary-item-name';
        
        const colorIndicator = document.createElement('span');
        colorIndicator.className = 'color-indicator';
        colorIndicator.style.backgroundColor = stats.color;
        
        nameElement.appendChild(colorIndicator);
        nameElement.appendChild(document.createTextNode(name));
        
        const detailElement = document.createElement('div');
        detailElement.textContent = `${formatDuration(stats.totalMinutes)} (${percentage}%)`;
        
        itemElement.appendChild(nameElement);
        itemElement.appendChild(detailElement);
        
        statsSummaryElement.appendChild(itemElement);
    });
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}
