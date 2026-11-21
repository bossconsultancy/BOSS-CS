import { CategoryId, PostType } from './brand'

export interface Source {
  title: string
  url: string
}

/** A post idea grounded in current, sourced information. */
export interface Idea {
  id: string
  department: CategoryId
  kind: 'news' | 'deadline' | 'seasonal' | 'evergreen'
  topic: string // short newsy headline of what's happening
  summary: string // the verified facts, with dates
  whyNow: string // why this matters to BOSS clients this week
  angle: string // what the BOSS post should say
  headline: string // suggested on-image headline
  postType: PostType
  date: string // publication / effective date as found, or ''
  sources: Source[]
  verified: boolean // true when backed by at least one grounded web source
  details?: string // key text read from the article itself
}

export interface DiscoverResult {
  department: CategoryId
  ideas: Idea[]
  error?: string
}
