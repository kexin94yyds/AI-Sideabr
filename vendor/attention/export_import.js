// 导入导出功能模块
document.addEventListener('DOMContentLoaded', function() {
    // DOM 元素
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importModal = document.getElementById('import-modal');
    const importFile = document.getElementById('import-file');
    const cancelImportBtn = document.getElementById('cancel-import');
    const confirmImportBtn = document.getElementById('confirm-import');
    const closeModalBtn = document.querySelector('.close-modal');
    const importMessage = document.getElementById('import-message');

    // 导出数据功能
    function exportData() {
        try {
            // 获取当前数据
            const data = {
                activities: activities || [],
                currentActivity: currentActivity || null,
                exportDate: new Date().toISOString(),
                version: '1.0',
                appName: 'Attention-Span-Tracker'
            };

            // 转换为JSON字符串
            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            // 创建下载链接
            const link = document.createElement('a');
            const fileName = `attention-span-data-${new Date().toISOString().split('T')[0]}.json`;
            link.href = URL.createObjectURL(dataBlob);
            link.download = fileName;
            
            // 触发下载
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 清理URL对象
            URL.revokeObjectURL(link.href);
            
            console.log('数据导出成功:', fileName);
        } catch (error) {
            console.error('数据导出失败:', error);
            alert('数据导出失败，请重试');
        }
    }

    // 显示导入模态框
    function showImportModal() {
        importModal.classList.remove('hidden');
        importMessage.textContent = '';
        importMessage.className = 'import-message';
        importFile.value = '';
    }

    // 隐藏导入模态框
    function hideImportModal() {
        importModal.classList.add('hidden');
        importFile.value = '';
        importMessage.textContent = '';
        importMessage.className = 'import-message';
    }

    // 导入数据功能
    function importData() {
        const file = importFile.files[0];
        if (!file) {
            showMessage('请选择一个文件', 'error');
            return;
        }

        if (!file.name.endsWith('.json')) {
            showMessage('请选择JSON格式的文件', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // 验证数据格式
                if (!importedData.activities || !Array.isArray(importedData.activities)) {
                    showMessage('数据格式不正确：缺少activities数组', 'error');
                    return;
                }

                // 验证活动数据结构
                for (let activity of importedData.activities) {
                    if (!activity.id || !activity.activityName || !activity.startTime) {
                        showMessage('数据格式不正确：活动记录缺少必要字段', 'error');
                        return;
                    }
                }

                const importMode = document.querySelector('input[name="import-mode"]:checked').value;
                let importCount = 0;
                
                if (importMode === 'replace') {
                    // 替换模式：完全替换当前数据
                    activities = [...importedData.activities];
                    currentActivity = importedData.currentActivity || null;
                    importCount = importedData.activities.length;
                } else {
                    // 合并模式：添加新的活动记录
                    const existingIds = new Set(activities.map(a => a.id));
                    const newActivities = importedData.activities.filter(a => !existingIds.has(a.id));
                    activities = [...activities, ...newActivities];
                    importCount = newActivities.length;
                    
                    // 如果当前没有活动且导入数据有当前活动，则使用导入的当前活动
                    if (importedData.currentActivity && !currentActivity) {
                        currentActivity = importedData.currentActivity;
                    }
                }

                // 保存数据到localStorage和Supabase
                saveData().then(() => {
                    // 更新UI
                    if (typeof updateActivityList === 'function') {
                        updateActivityList();
                    }
                    if (typeof updateCurrentActivityUI === 'function') {
                        updateCurrentActivityUI();
                    }
                    if (typeof updateActivitySelector === 'function') {
                        updateActivitySelector();
                    }
                    
                    showMessage(`成功导入 ${importCount} 条记录`, 'success');
                }).catch((error) => {
                    console.error('保存导入数据失败:', error);
                    showMessage(`导入 ${importCount} 条记录到本地成功，但云端同步失败`, 'warning');
                });
                
                // 延迟关闭模态框
                setTimeout(() => {
                    hideImportModal();
                }, 2000);
                
            } catch (error) {
                console.error('导入数据解析错误:', error);
                showMessage('文件解析失败，请检查文件格式是否正确', 'error');
            }
        };

        reader.onerror = function() {
            showMessage('文件读取失败，请重试', 'error');
        };

        reader.readAsText(file, 'UTF-8');
    }

    // 显示消息
    function showMessage(message, type) {
        importMessage.textContent = message;
        importMessage.className = `import-message ${type}`;
    }

    // 事件监听器
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }
    
    if (importBtn) {
        importBtn.addEventListener('click', showImportModal);
    }
    
    if (cancelImportBtn) {
        cancelImportBtn.addEventListener('click', hideImportModal);
    }
    
    if (confirmImportBtn) {
        confirmImportBtn.addEventListener('click', importData);
    }
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', hideImportModal);
    }

    // 点击模态框外部关闭
    if (importModal) {
        importModal.addEventListener('click', function(e) {
            if (e.target === importModal) {
                hideImportModal();
            }
        });
    }

    // ESC键关闭模态框
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !importModal.classList.contains('hidden')) {
            hideImportModal();
        }
    });

    console.log('导入导出功能已加载');
}); 