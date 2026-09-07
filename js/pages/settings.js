/* =====================================================================
 * pages/settings.js — 设置（资料 / 账号 / 数据）
 * ===================================================================== */

(function () {
  const UI = window.UI;
  const Store = window.Store;
  const AI = window.AI;

  window.Router.register('/settings', {
    title: '设置',
    render: function () {
      const u = Store.user();
      const isDemo = Store.isDemo();
      return `
        <div class="page-header"><div><h1>设置</h1></div></div>

        <section class="card">
          <div class="section-head"><h2>👤 个人资料</h2></div>
          <div class="form-stack">
            ${UI.field('昵称', `<input type="text" id="st-name" value="${UI.esc(u.display_name || '')}" />`)}
            ${UI.field('个人简介', `<textarea id="st-bio" rows="3">${UI.esc(u.bio || '')}</textarea>`)}
            <button class="btn btn-primary" id="st-save">保存资料</button>
          </div>
        </section>

        <section class="card">
          <div class="section-head"><h2>🔐 账号</h2></div>
          <div id="auth-box">${authBox(isDemo, u)}</div>
        </section>

        ${isDemo ? `
        <section class="card">
          <div class="section-head"><h2>🧪 演示数据</h2></div>
          <p class="hint">当前处于演示模式，数据保存在浏览器本地，不会上传到云端。</p>
          <button class="btn btn-danger" id="st-reset">重置演示数据</button>
        </section>` : ''}

        <section class="card">
          <div class="section-head"><h2>🤖 AI 分析</h2></div>
          <p class="hint">浏览器直连 OpenAI 兼容接口（如 DeepSeek）。密钥仅保存在本地浏览器。</p>
          <div class="form-stack">
            ${UI.field('接口地址', `<input type="text" id="ai-base" placeholder="https://api.deepseek.com" />`)}
            ${UI.field('模型名', `<input type="text" id="ai-model" placeholder="deepseek-chat" />`)}
            ${UI.field('API Key', `<input type="password" id="ai-key" placeholder="sk-..." autocomplete="off" />`)}
            <div style="display:flex;gap:8px;">
              <button class="btn btn-primary" id="ai-save">保存配置</button>
              <button class="btn" id="ai-test">测试连接</button>
            </div>
            <p class="hint" id="ai-status"></p>
          </div>
        </section>

        <section class="card">
          <div class="section-head"><h2>📄 导出</h2></div>
          <p class="hint">把最重要的经历汇总成一页纸简历。</p>
          <a class="btn btn-primary" href="#/resume">生成简历 / 下载 PDF</a>
        </section>

        <section class="card">
          <div class="section-head"><h2>ℹ️ 关于</h2></div>
          <p class="hint">人生档案馆 · Personal Growth Archive<br>
          文件是人生经历的证据，能力由真实行为不断积累。</p>
        </section>`;
    },
    mount: function () {
      const saveBtn = document.getElementById('st-save');
      if (saveBtn) saveBtn.onclick = async () => {
        try {
          await Store.updateProfile({
            display_name: document.getElementById('st-name').value.trim(),
            bio: document.getElementById('st-bio').value.trim(),
          });
          UI.toast('资料已保存'); window.Router.go();
        } catch (e) { UI.toast('保存失败：' + e.message); }
      };

      // 认证表单切换
      document.getElementById('auth-box').addEventListener('click', e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const mode = btn.dataset.action; // 'show-login' / 'show-register' / 'logout'
        if (mode === 'logout') {
          Store.signOut().then(() => { UI.toast('已退出登录'); window.Router.go(); });
          return;
        }
        document.getElementById('auth-box').innerHTML = authForm(mode === 'show-register');
        bindAuthForm(mode === 'show-register');
      });

      const resetBtn = document.getElementById('st-reset');
      if (resetBtn) resetBtn.onclick = () => {
        UI.confirm('确定重置演示数据？所有本地改动将丢失。', () => {
          Store._resetDemo(); UI.toast('已重置'); window.Router.go();
        }, { danger: true, okLabel: '重置' });
      };

      // AI 配置
      const cfg = AI.config.get();
      const aiBase = document.getElementById('ai-base');
      const aiModel = document.getElementById('ai-model');
      const aiKey = document.getElementById('ai-key');
      if (aiBase) { aiBase.value = cfg.baseUrl || ''; aiModel.value = cfg.model || ''; aiKey.value = cfg.apiKey || ''; }
      const aiSave = document.getElementById('ai-save');
      if (aiSave) aiSave.onclick = () => {
        AI.config.set({ baseUrl: aiBase.value.trim(), model: aiModel.value.trim(), apiKey: aiKey.value.trim() });
        UI.toast('AI 配置已保存');
      };
      const aiTest = document.getElementById('ai-test');
      if (aiTest) aiTest.onclick = async () => {
        AI.config.set({ baseUrl: aiBase.value.trim(), model: aiModel.value.trim(), apiKey: aiKey.value.trim() });
        const status = document.getElementById('ai-status');
        status.textContent = '测试中…';
        try { status.textContent = '✅ ' + (await AI.test()); }
        catch (e) { status.textContent = '❌ ' + e.message; }
      };
    },
  });

  function authBox(isDemo, u) {
    if (!isDemo) {
      return `<div class="auth-status">
        <p>已登录：<b>${UI.esc(u.email || '')}</b></p>
        <button class="btn btn-danger" data-action="logout">退出登录</button>
      </div>`;
    }
    const configured = window.SB.configured;
    if (!configured) {
      return `<p class="hint">未配置 Supabase。填写 js/config.js 中的密钥后，即可登录使用云端数据。</p>`;
    }
    return `<p class="hint">登录后，你的数据将保存到云端，可在多设备同步。</p>
      <button class="btn btn-primary" data-action="show-login">登录</button>
      <button class="btn" data-action="show-register">注册</button>`;
  }

  function authForm(isRegister) {
    return `<div class="form-stack">
      ${isRegister ? UI.field('昵称', `<input type="text" id="auth-name" />`) : ''}
      ${UI.field('邮箱', `<input type="email" id="auth-email" />`)}
      ${UI.field('密码', `<input type="password" id="auth-password" />`)}
      <button class="btn btn-primary" data-auth="submit">${isRegister ? '注册' : '登录'}</button>
      <button class="btn" data-action="${isRegister ? 'show-login' : 'show-register'}">${isRegister ? '已有账号，去登录' : '没有账号，去注册'}</button>
    </div>`;
  }

  function bindAuthForm(isRegister) {
    document.getElementById('auth-box').addEventListener('click', async e => {
      const btn = e.target.closest('[data-auth="submit"]');
      if (!btn) return;
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;
      if (!email || !password) { UI.toast('请填写邮箱和密码'); return; }
      try {
        if (isRegister) {
          const name = document.getElementById('auth-name') ? document.getElementById('auth-name').value.trim() : '';
          await Store.signUp(email, password, name);
          UI.toast('注册成功，请查收验证邮件（或直接登录）');
        } else {
          await Store.signIn(email, password);
          UI.toast('登录成功');
        }
        window.Router.go();
      } catch (err) { UI.toast('操作失败：' + err.message); }
    });
  }
})();
