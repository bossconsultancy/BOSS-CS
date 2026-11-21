'use client'

import { DeskProvider, useDesk, type DeskMode, type DeskTab } from './store'
import { AiIssueBanner, Masthead, Toast } from './Shell'
import Wire from './Wire'
import IdeaDesk from './IdeaDesk'
import NewsDesk from './NewsDesk'
import Posts from './Posts'

function Desk() {
  const { tab } = useDesk()
  return (
    <div className="relative z-10 min-h-screen">
      <Masthead />
      <AiIssueBanner />
      <main>
        {tab === 'wire' && <Wire />}
        {tab === 'link' && <NewsDesk />}
        {tab === 'idea' && <IdeaDesk />}
        {tab === 'posts' && <Posts />}
      </main>
      <Toast />
    </div>
  )
}

export default function App({ initialTab = 'wire', mode = 'news' }: { initialTab?: DeskTab; mode?: DeskMode }) {
  return (
    <DeskProvider initialTab={initialTab} mode={mode}>
      <Desk />
    </DeskProvider>
  )
}
