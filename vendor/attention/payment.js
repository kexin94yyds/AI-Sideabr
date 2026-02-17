// ==================== 微信支付功能 ====================

const PAYMENT_CONFIG = {
    API_URL: 'https://wechat-y-server-vjfbztievl.cn-shanghai.fcapp.run',
    PRODUCT_INFO: {
        id: 'premium_access',
        name: 'Attention Span Tracker 完整版',
        price: 99.00, // 元
        amount: 9900    // 分
    },
    DEV_MODE: false  // 生产模式：使用真实微信支付
};

let currentOrderNo = null;
let pollInterval = null;
let stopPollingFn = null;

// 免费试用配置
const FREE_TRIAL_LIMIT = 30; // 免费查看次数

// 初始化支付功能
function initPayment() {
    console.log('初始化支付功能...');
    checkPaymentStatus();
    
    // 绑定购买按钮事件
    const buyBtn = document.getElementById('premium-buy-btn');
    if (buyBtn) {
        buyBtn.addEventListener('click', handlePurchaseClick);
    }
    
    // 绑定模态框关闭事件
    const closeModalBtn = document.getElementById('payment-close-btn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closePaymentModal);
    }
    
    const closeSuccessBtn = document.getElementById('payment-success-close-btn');
    if (closeSuccessBtn) {
        closeSuccessBtn.addEventListener('click', closeSuccessModal);
    }
    
    // 点击模态框背景关闭
    const paymentModal = document.getElementById('payment-modal');
    if (paymentModal) {
        paymentModal.addEventListener('click', (e) => {
            if (e.target.id === 'payment-modal') {
                closePaymentModal();
            }
        });
    }
    
    const successModal = document.getElementById('payment-success-modal');
    if (successModal) {
        successModal.addEventListener('click', (e) => {
            if (e.target.id === 'payment-success-modal') {
                closeSuccessModal();
            }
        });
    }
}

// 检查用户是否在白名单中（从 Supabase）
async function checkWhitelist() {
    try {
        // 确保 Supabase 已初始化
        const supabase = window.supabaseClient?.getClient();
        if (!supabase) {
            console.log('⚠️ Supabase 未初始化，跳过白名单检查');
            return false;
        }
        
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user || !user.email) {
            console.log('⚠️ 用户未登录或无邮箱，跳过白名单检查');
            return false;
        }
        
        console.log('🔍 检查白名单用户:', user.email);
        
        // 查询白名单表
        const { data: whitelistUser, error: queryError } = await supabase
            .from('premium_users')
            .select('*')
            .eq('email', user.email)
            .eq('is_active', true)
            .single();
        
        if (queryError) {
            if (queryError.code === 'PGRST116') {
                // 没有找到记录，不是白名单用户
                console.log('ℹ️ 用户不在白名单中');
                return false;
            }
            console.error('❌ 白名单查询失败:', queryError);
            return false;
        }
        
        if (whitelistUser) {
            console.log('✅ 白名单用户:', whitelistUser.display_name || user.email);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('❌ 白名单检查异常:', error);
        return false;
    }
}

// 检查支付状态
async function checkPaymentStatus() {
    // 1. 先检查是否是白名单用户
    const isWhitelisted = await checkWhitelist();
    if (isWhitelisted) {
        console.log('🎁 白名单用户，自动解锁高级功能');
        localStorage.setItem('isPremiumUser', 'true');
        localStorage.setItem('premiumType', 'whitelist'); // 标记为白名单用户
        unlockPremiumFeatures();
        return;
    }
    
    // 2. 检查是否已购买
    const isPaid = localStorage.getItem('isPremiumUser') === 'true';
    const premiumType = localStorage.getItem('premiumType');
    
    console.log('检查支付状态:', isPaid ? '已付费' : '未付费', premiumType ? `(${premiumType})` : '');
    
    if (isPaid && premiumType !== 'whitelist') {
        unlockPremiumFeatures();
    } else if (!isPaid) {
        lockPremiumFeatures();
    }
}

// 检查试用次数
function checkTrialUsage() {
    const trialCount = parseInt(localStorage.getItem('trialViewCount') || '0');
    return trialCount < FREE_TRIAL_LIMIT;
}

// 增加试用次数
function incrementTrialUsage() {
    const trialCount = parseInt(localStorage.getItem('trialViewCount') || '0');
    localStorage.setItem('trialViewCount', (trialCount + 1).toString());
    console.log(`试用次数：${trialCount + 1}/${FREE_TRIAL_LIMIT}`);
}

// 获取剩余试用次数
function getRemainingTrials() {
    const trialCount = parseInt(localStorage.getItem('trialViewCount') || '0');
    return Math.max(0, FREE_TRIAL_LIMIT - trialCount);
}

// 显示试用提示
function showTrialNotification(message) {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'trial-notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #4A90E2;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// 处理试用点击
function handleTrialClick(event) {
    const isPaid = localStorage.getItem('isPremiumUser') === 'true';
    
    if (isPaid) {
        return; // 已付费用户直接通过
    }
    
    const hasTrials = checkTrialUsage();
    
    if (hasTrials) {
        // 还有试用次数
        incrementTrialUsage();
        const remaining = getRemainingTrials();
        showTrialNotification(`💡 还剩 ${remaining} 次免费查看机会`);
        
        if (remaining === 0) {
            // 试用次数用完，锁定功能
            setTimeout(() => {
                lockPremiumFeatures();
                showTrialNotification('🔒 试用次数已用完，请购买完整版');
            }, 1000);
        }
    } else {
        // 没有试用次数了
        event.preventDefault();
        event.stopPropagation();
        lockPremiumFeatures();
        showTrialNotification('🔒 试用次数已用完，请购买完整版');
    }
}

// 添加试用点击监听
function addTrialClickListeners() {
    // 监听所有统计按钮，但排除购买按钮
    const statsButtons = document.querySelectorAll('.statistics button, .statistics .btn, #show-stats-btn, button[onclick*="showStats"]');
    
    statsButtons.forEach(button => {
        // 排除购买按钮
        if (button.id === 'premium-buy-btn') {
            return;
        }
        button.addEventListener('click', handleTrialClick, true);
    });
    
    console.log(`已添加 ${statsButtons.length} 个试用点击监听器`);
}

// 锁定高级功能
function lockPremiumFeatures() {
    console.log('锁定高级功能');
    
    const remainingTrials = getRemainingTrials();
    
    // 更新购买提示文字
    const lockMessage = document.querySelector('.premium-lock-message');
    if (lockMessage) {
        const messageText = lockMessage.querySelector('p');
        if (remainingTrials > 0) {
            messageText.textContent = `剩余 ${remainingTrials} 次免费查看机会，试用后解锁所有功能`;
            lockMessage.style.display = 'none'; // 有试用次数时先隐藏
        } else {
            messageText.textContent = '试用次数已用完，购买后永久使用所有高级功能';
            lockMessage.style.display = 'block';
        }
    }
    
    // 绑定购买按钮事件（动态绑定，因为按钮可能是后来显示的）
    const buyBtn = document.getElementById('premium-buy-btn');
    if (buyBtn) {
        // 移除旧的事件监听器（如果有）
        buyBtn.removeEventListener('click', handlePurchaseClick);
        // 添加新的事件监听器
        buyBtn.addEventListener('click', handlePurchaseClick);
        console.log('✅ 购买按钮事件已绑定');
    }
    
    // 锁定统计功能
    const statsSection = document.querySelector('.statistics');
    if (statsSection) {
        if (remainingTrials > 0) {
            statsSection.classList.remove('premium-locked');
        } else {
            statsSection.classList.add('premium-locked');
        }
    }
    
    // 锁定活动记录
    const timelineSection = document.querySelector('.timeline');
    if (timelineSection) {
        if (remainingTrials > 0) {
            timelineSection.classList.remove('premium-locked');
        } else {
            timelineSection.classList.add('premium-locked');
        }
    }
    
    // 监听统计按钮点击
    addTrialClickListeners();
}

// 解锁高级功能
function unlockPremiumFeatures() {
    console.log('解锁高级功能');
    
    // 隐藏购买遮罩
    const lockMessage = document.querySelector('.premium-lock-message');
    if (lockMessage) {
        lockMessage.style.display = 'none';
    }
    
    // 解锁统计功能
    const statsSection = document.querySelector('.statistics');
    if (statsSection) {
        statsSection.classList.remove('premium-locked');
    }
    
    // 解锁活动记录
    const timelineSection = document.querySelector('.timeline');
    if (timelineSection) {
        timelineSection.classList.remove('premium-locked');
    }
}

// 处理购买按钮点击
async function handlePurchaseClick() {
    console.log('点击购买按钮');
    await createPaymentOrder();
}

// 创建支付订单
async function createPaymentOrder() {
    try {
        console.log('正在创建支付订单...');
        
        const response = await fetch(`${PAYMENT_CONFIG.API_URL}/api/create-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                videoId: PAYMENT_CONFIG.PRODUCT_INFO.id,
                videoTitle: PAYMENT_CONFIG.PRODUCT_INFO.name,
                amount: PAYMENT_CONFIG.PRODUCT_INFO.amount
            })
        });
        
        const result = await response.json();
        console.log('支付订单创建结果:', result);
        
        // API返回的字段名是 code_url (下划线格式)
        if (result.success && result.code_url) {
            currentOrderNo = result.orderNo;
            showPaymentModal(result.code_url, result.orderNo);
            startPaymentPolling(result.orderNo);
        } else {
            alert('支付订单创建失败: ' + (result.message || '未知错误'));
        }
        
    } catch (error) {
        console.error('创建支付订单失败:', error);
        alert('网络错误，请确保支付服务器已启动\n\n运行命令: cd /Users/apple/Downloads/nativePaySDK && node payment-server.js');
    }
}

// 显示支付模态框
function showPaymentModal(codeUrl, orderNo) {
    console.log('显示支付模态框');
    
    const modal = document.getElementById('payment-modal');
    const qrcodeElement = document.getElementById('payment-qrcode');
    
    if (!modal || !qrcodeElement) {
        console.error('找不到支付模态框元素');
        return;
    }
    
    // 清空之前的二维码
    qrcodeElement.innerHTML = '';
    
    // 显示订单信息
    const orderNoElement = document.getElementById('payment-order-no');
    if (orderNoElement) {
        orderNoElement.textContent = orderNo;
    }
    
    // 开发模式：显示模拟支付按钮
    if (PAYMENT_CONFIG.DEV_MODE) {
        qrcodeElement.innerHTML = `
            <div style="text-align: center;">
                <div style="padding: 30px; background: #f0f9ff; border-radius: 12px; margin-bottom: 20px;">
                    <div style="font-size: 48px; margin-bottom: 15px;">🧪</div>
                    <h3 style="color: #0369a1; margin-bottom: 10px;">开发测试模式</h3>
                    <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
                        由于微信商户号未开通Native支付权限<br/>
                        当前使用模拟支付模式进行测试
                    </p>
                    <button id="mock-pay-btn" style="
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        padding: 12px 32px;
                        font-size: 16px;
                        font-weight: 600;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">
                        点击模拟支付成功
                    </button>
                </div>
                <p style="color: #999; font-size: 12px;">
                    提示：真实环境需要在微信商户平台开通Native支付权限
                </p>
            </div>
        `;
        
        // 绑定模拟支付按钮
        const mockPayBtn = document.getElementById('mock-pay-btn');
        if (mockPayBtn) {
            mockPayBtn.addEventListener('click', () => mockPayment(orderNo));
            mockPayBtn.addEventListener('mouseenter', function() {
                this.style.transform = 'scale(1.05)';
            });
            mockPayBtn.addEventListener('mouseleave', function() {
                this.style.transform = 'scale(1)';
            });
        }
    } else {
        // 生产模式：生成真实二维码
        try {
            if (typeof QRCode !== 'undefined') {
                new QRCode(qrcodeElement, {
                    text: codeUrl,
                    width: 200,
                    height: 200,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
                console.log('✅ 二维码生成成功');
            } else {
                throw new Error('QRCode库未加载');
            }
        } catch (error) {
            console.error('❌ 二维码生成失败:', error);
            // 降级方案：使用在线API
            qrcodeElement.innerHTML = `
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(codeUrl)}" 
                     alt="支付二维码" style="width: 200px; height: 200px; border-radius: 8px;">
            `;
        }
    }
    
    // 显示模态框
    modal.classList.add('active');
}

// 模拟支付
async function mockPayment(orderNo) {
    console.log('🧪 执行模拟支付:', orderNo);
    
    try {
        const response = await fetch(`${PAYMENT_CONFIG.API_URL}/api/mock-payment/${orderNo}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        console.log('模拟支付结果:', result);
        
        if (result.success) {
            // 等待一下，模拟真实支付的延迟
            setTimeout(() => {
                console.log('🎉 模拟支付成功，等待轮询检测...');
            }, 500);
        }
    } catch (error) {
        console.error('模拟支付失败:', error);
        alert('模拟支付失败: ' + error.message);
    }
}

// 关闭支付模态框
function closePaymentModal() {
    console.log('关闭支付模态框');
    
    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    
    // 停止轮询
    if (stopPollingFn) {
        try { stopPollingFn(); } catch (_) {}
        stopPollingFn = null;
    }
}

// 开始轮询支付状态
function startPaymentPolling(orderNo) {
    console.log('开始轮询支付状态，订单号:', orderNo);

    // 自适应轮询：立即检查 -> 前10次每1s -> 接着20次每2s -> 之后每3s；5分钟超时
    let attempt = 0;
    let stopped = false;
    const startTs = Date.now();
    const MAX_MS = 5 * 60 * 1000;

    const finishSuccess = () => {
        console.log('✅ 支付成功！');
        stopped = true;
        if (pollInterval) { clearTimeout(pollInterval); pollInterval = null; }

        // 保存支付状态
        localStorage.setItem('isPremiumUser', 'true');
        localStorage.setItem('premiumType', 'paid');
        localStorage.setItem('premiumOrderNo', orderNo);
        localStorage.setItem('premiumActivatedAt', new Date().toISOString());

        // 关闭支付模态框并立刻解锁功能，提升体感速度
        closePaymentModal();
        unlockPremiumFeatures();
        // 成功提示分离，不阻塞解锁
        showSuccessModal();
    };

    const check = async () => {
        if (stopped) return;
        if (Date.now() - startTs > MAX_MS) {
            console.log('轮询超时，停止检查');
            stopped = true;
            return;
        }
        try {
            const response = await fetch(`${PAYMENT_CONFIG.API_URL}/api/payment-status/${orderNo}`);
            const result = await response.json();
            console.log('支付状态查询结果:', result);
            if (result.success && result.status === 'success') {
                finishSuccess();
                return;
            }
        } catch (error) {
            console.error('查询支付状态失败:', error);
        }
        attempt++;
        const next = attempt < 10 ? 1000 : attempt < 30 ? 2000 : 3000;
        pollInterval = setTimeout(check, next);
    };

    // 立即触发第一次检查，避免固定3秒等待
    check();

    // 提供停止函数，关闭模态框时调用
    stopPollingFn = () => { stopped = true; if (pollInterval) { clearTimeout(pollInterval); pollInterval = null; } };
}

// 显示成功模态框
function showSuccessModal() {
    console.log('显示支付成功模态框');
    
    const modal = document.getElementById('payment-success-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

// 关闭成功模态框
function closeSuccessModal() {
    console.log('关闭支付成功模态框');
    
    const modal = document.getElementById('payment-success-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// 页面加载时初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPayment);
} else {
    initPayment();
}
