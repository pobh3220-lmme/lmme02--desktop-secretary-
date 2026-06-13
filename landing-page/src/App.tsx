import React, { useState } from 'react'

// ============================================================
// Landing page for desktop-secretary
// ============================================================

const GITHUB_RELEASES = 'https://github.com/pobh3220-lmme/lmme02--desktop-secretary-/releases/latest'

export default function App() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null)

  return (
    <div style={{
      fontFamily: '-apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
      color: '#1C1C1E',
      background: 'linear-gradient(160deg, #FAFAFA 0%, #F0F4FF 50%, #F5F0FF 100%)',
      minHeight: '100vh',
    }}>
      {/* Nav */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px', maxWidth: 1120, margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 28 }}>{'🐾'}</span>
          <span style={{ fontSize: 18, fontWeight: 700 }}>{'桌面小秘书'}</span>
        </div>
        <a href={GITHUB_RELEASES} style={{
          padding: '10px 22px', borderRadius: 10,
          background: '#007AFF', color: 'white',
          textDecoration: 'none', fontSize: 14, fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,122,255,0.3)',
        }}>
          {'免费下载'}
        </a>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 900, margin: '40px auto', textAlign: 'center', padding: '0 24px' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>{'🐾'}</div>
        <h1 style={{
          fontSize: 40, fontWeight: 800, lineHeight: 1.3,
          background: 'linear-gradient(135deg, #007AFF, #AF52DE)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          {'一只可爱的桌面宠物帮你管理所有待办事项'}
        </h1>
        <p style={{ fontSize: 17, color: '#5A5A5E', lineHeight: 1.7, maxWidth: 560, margin: '20px auto 32px' }}>
          {'桌面小秘书将待办管理融入一只可爱的桌宠。悬浮宠物即可唤起面板，拖拽文件关联任务，四象限分类、子任务拆分、到期提醒，高效又治愈。'}
        </p>
        <a href={GITHUB_RELEASES} style={{
          display: 'inline-block', padding: '14px 36px', borderRadius: 12,
          background: '#007AFF', color: 'white',
          textDecoration: 'none', fontSize: 17, fontWeight: 700,
          boxShadow: '0 6px 24px rgba(0,122,255,0.35)',
        }}>
          {'⬇ 下载桌面小秘书'}
        </a>
        <p style={{ fontSize: 13, color: '#8E8E93', marginTop: 12 }}>
          {'支持 Windows 10/11 · 免费使用'}
        </p>
      </section>

      {/* Features */}
      <section style={{
        maxWidth: 900, margin: '60px auto', padding: '0 24px',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20,
      }}>
        {[
          { icon: '🐱', title: '桌面宠物', desc: '可爱的团子/云朵/小精灵三种角色，根据任务状态切换动画' },
          { icon: '📋', title: '四象限管理', desc: '重要紧急/重要不紧急/紧急不重要/不重要不紧急，输入 ! @ 自动归类' },
          { icon: '📎', title: '文件关联', desc: '拖拽文件/文件夹到待办，点击一键打开关联内容' },
          { icon: '📅', title: '截止时间', desc: '日历控件选择日期，逾期闪动提醒，快捷时间预设' },
          { icon: '✅', title: '子任务拆分', desc: '大任务拆解为子任务，独立设置截止时间和文件关联' },
          { icon: '🔒', title: '数据本地存储', desc: '所有数据存在本地，无上传，无需注册，完全离线可用' },
        ].map(f => (
          <div key={f.title} style={{
            background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)',
            borderRadius: 14, padding: 22, border: '1px solid rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>{f.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{f.title}</div>
            <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>{f.desc}</div>
          </div>
        ))}
      </section>

      {/* Usage */}
      <section style={{ maxWidth: 720, margin: '60px auto', padding: '0 24px' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', marginBottom: 32 }}>
          {'三步开始使用'}
        </h2>
        {[
          { step: '1', title: '下载安装', desc: '点击下载按钮运行安装程序，桌面出现可爱小宠物' },
          { step: '2', title: '悬浮使用', desc: '鼠标悬停宠物300ms呼出面板，输入待办回车创建' },
          { step: '3', title: '双击钉住', desc: '双击宠物将面板钉在桌面，方便持续编辑和缩放' },
        ].map(s => (
          <div key={s.step} style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'flex-start' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: '#007AFF', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700, flexShrink: 0,
            }}>{s.step}</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{s.title}</div>
              <div style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 720, margin: '60px auto', padding: '0 24px' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', marginBottom: 32 }}>
          {'常见问题'}
        </h2>
        {[
          { q: '桌面小秘书是免费的吗？', a: '完全免费，开源软件，没有付费墙或订阅。' },
          { q: '我的数据安全吗？', a: '所有数据存储在本地文件夹，不上传服务器，完全离线运行。' },
          { q: '支持哪些 Windows 版本？', a: 'Windows 10 和 Windows 11。' },
          { q: '如何卸载？', a: '通过 Windows 控制面板 → 程序和功能 → 找到桌面小秘书卸载。' },
        ].map((faq, i) => (
          <div key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '14px 0' }}>
            <button
              onClick={() => setFaqOpen(faqOpen === i ? null : i)}
              style={{
                width: '100%', textAlign: 'left', border: 'none',
                background: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: 15, fontWeight: 600, color: '#1C1C1E', padding: 0,
              }}
            >
              {faq.q}
              <span style={{ fontSize: 14, color: '#8E8E93' }}>
                {faqOpen === i ? '－' : '＋'}
              </span>
            </button>
            {faqOpen === i && (
              <div style={{ fontSize: 14, color: '#666', marginTop: 8, lineHeight: 1.6 }}>
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Footer CTA */}
      <section style={{ textAlign: 'center', padding: '60px 24px', background: 'linear-gradient(135deg, #007AFF10, #AF52DE10)' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>{'🚀'}</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{'准备好开始了吗？'}</h2>
        <p style={{ fontSize: 15, color: '#666', marginBottom: 24 }}>{'免费下载，让桌面小宠物帮你管理待办'}</p>
        <a href={GITHUB_RELEASES} style={{
          display: 'inline-block', padding: '14px 36px', borderRadius: 12,
          background: '#007AFF', color: 'white',
          textDecoration: 'none', fontSize: 17, fontWeight: 700,
          boxShadow: '0 6px 24px rgba(0,122,255,0.35)',
        }}>
          {'⬇ 立即下载'}
        </a>
      </section>

      <footer style={{ textAlign: 'center', padding: '24px', fontSize: 12, color: '#8E8E93', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
        {'桌面小秘书 · 开源项目 · MIT License'}
      </footer>
    </div>
  )
}
