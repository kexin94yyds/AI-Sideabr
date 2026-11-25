// ToBooks account link + Pro: every tunable in ONE place.
//
// UNDECIDED (owner has not decided as of 2026-11-25) — placeholders, nothing here picks an answer:
//   1. Pricing                  → `pricing`. priceLabel null = show no price, only the link to ToBooks.
//                                  The server can send a label later (entitlement.offer) without a new release.
//   2. Lifetime vs subscription → `billingModel` is only a display fallback; the server's
//                                  entitlement.billing_model wins. "undecided" shows neutral wording.
//   3. Grace for legacy users   → decided and computed on the server (reason "legacy_grace"). The plugin only
//                                  displays it. `legacyGraceNote` is the text shown when it applies.
// Also undecided: which features are Pro (`features`). The one Pro entry is a placeholder switch, not a feature.
(function (root) {
  'use strict';

  var config = {
    // Where the link lives. Only these two paths plus /api/ext-* are ever requested, and only after the
    // user agreed on the consent screen.
    apiBase: 'https://tobooks.xin',
    linkPagePath: '/ext-link.html',

    clientKind: 'chrome',
    scopes: ['entitlement:read'],

    pollIntervalMs: 3000,
    linkTimeoutMs: 10 * 60 * 1000,
    requestTimeoutMs: 15000,

    // Fallbacks until the server sends its own numbers (entitlement.recheck_after_s / grace_s).
    recheckAfterS: 86400,
    graceS: 14 * 86400,

    // ---- Placeholder 1: pricing
    pricing: {
      priceLabel: null,
      purchaseUrl: 'https://tobooks.xin/?from=ai-sidebar'
    },

    // ---- Placeholder 2: lifetime vs subscription ('undecided' | 'lifetime' | 'subscription')
    billingModel: 'undecided',

    // ---- Placeholder 3: legacy-user grace (server decides who and until when)
    legacyGraceNote: {
      zh: '老用户过渡期内可使用 Pro',
      en: 'Pro is available during the transition period for existing users'
    },

    // Feature switches shown in the account panel. tier: 'free' is always available; 'pro' needs an active
    // membership. Existing features must stay 'free'. `placeholder: true` = nothing is wired to it yet.
    features: [
      { id: 'core', tier: 'free', zh: '全部现有功能（侧边栏、历史、收藏、导出、并行窗口）', en: 'Everything the extension does today (side panel, history, favorites, export, parallel window)' },
      { id: 'proPlaceholder', tier: 'pro', placeholder: true, zh: 'Pro 功能（待定，占位开关）', en: 'Pro feature (to be decided, placeholder switch)' }
    ]
  };

  root.TB_PRO_CONFIG = config;
  if (typeof module !== 'undefined' && module.exports) module.exports = config;
})(typeof globalThis !== 'undefined' ? globalThis : this);
