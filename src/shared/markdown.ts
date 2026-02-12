import type { Options } from 'react-markdown'
import remarkGfm from 'remark-gfm'

export const markdownOptions: Partial<Options> = {
  remarkPlugins: [remarkGfm],
}
