import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import { Nav } from '@/components/layout/nav';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'AI 绩效面谈陪练',
    template: '%s | AI 绩效面谈陪练',
  },
  description:
    '企业级 AI 绩效面谈陪练 Agent，通过 RAG 架构模拟真实面谈场景，帮助管理者提升面谈技巧。支持四步法模拟、多角色对话、实时分析评分与历史复盘。',
  keywords: [
    '绩效面谈',
    'AI 陪练',
    '管理培训',
    '面谈技巧',
    'RAG',
    '企业微信',
    '员工对话模拟',
  ],
  authors: [{ name: 'AI Training' }],
  openGraph: {
    title: 'AI 绩效面谈陪练 Agent',
    description: '通过 AI 模拟真实面谈场景，帮助管理者提升面谈技巧',
    locale: 'zh_CN',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="zh-CN">
      <body className={`antialiased min-h-screen bg-background`}>
        {isDev && <Inspector />}
        <div className="flex min-h-screen flex-col">
          <Nav />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
