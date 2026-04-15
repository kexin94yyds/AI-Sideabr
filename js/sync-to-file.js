// 数据同步脚本 - 将浏览器扩展数据导出到 sync/*.json 文件
// 可以在扩展的开发者工具 Console 中运行此脚本

(async function syncExtensionData() {
  const HISTORY_KEY = 'aiLinkHistory';
  const FAVORITES_KEY = 'aiFavoriteLinks';
  
  console.log('🔄 开始同步扩展数据到 sync/ 目录...');

  try {
    // 1. 读取 History 数据 (优先从 IndexedDB)
    let historyData = [];
    if (window.HistoryDB) {
      console.log('📚 从 IndexedDB 读取 History...');
      await window.HistoryDB.migrateFromStorageIfAny();
      historyData = await window.HistoryDB.getAll();
    } else {
      // 降级到 chrome.storage.local
      console.log('📦 从 chrome.storage.local 读取 History...');
      const res = await chrome.storage.local.get([HISTORY_KEY]);
      historyData = Array.isArray(res[HISTORY_KEY]) ? res[HISTORY_KEY] : [];
    }

    // 2. 读取 Favorites 数据
    console.log('⭐ 从 chrome.storage.local 读取 Favorites...');
    const favRes = await chrome.storage.local.get([FAVORITES_KEY]);
    const favoritesData = Array.isArray(favRes[FAVORITES_KEY]) ? favRes[FAVORITES_KEY] : [];

    // 3. 数据格式化（确保符合应用要求）
    const formatEntry = (entry) => ({
      url: String(entry.url || ''),
      provider: String(entry.provider || ''),
      title: String(entry.title || ''),
      time: Number(entry.time || Date.now())
    });

    const formattedHistory = historyData.map(formatEntry);
    const formattedFavorites = favoritesData.map(formatEntry);

    // 4. 生成 JSON 字符串
    const historyJson = JSON.stringify(formattedHistory, null, 2);
    const favoritesJson = JSON.stringify(formattedFavorites, null, 2);

    console.log(`✅ History: ${formattedHistory.length} 条记录`);
    console.log(`✅ Favorites: ${formattedFavorites.length} 条记录`);

    // 5. 创建下载链接
    const downloadJson = (filename, jsonString) => {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    };

    // 下载两个文件
    downloadJson('history.json', historyJson);
    setTimeout(() => downloadJson('favorites.json', favoritesJson), 500);

    console.log('✨ 数据导出完成！请将下载的文件放到 sync/ 目录');
    console.log('   📁 目标路径: <repo>/sync/');
    
    // 返回数据供查看
    return {
      history: formattedHistory,
      favorites: formattedFavorites,
      stats: {
        historyCount: formattedHistory.length,
        favoritesCount: formattedFavorites.length
      }
    };

  } catch (error) {
    console.error('❌ 同步失败:', error);
    throw error;
  }
})();
