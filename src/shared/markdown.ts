import { createElement } from 'react'
import type { Options } from 'react-markdown'
import remarkGfm from 'remark-gfm'

export const markdownOptions: Partial<Options> = {
  remarkPlugins: [remarkGfm],
  components: {
    table: (props) =>
      createElement('div', { className: 'overflow-x-auto my-2' },
        createElement('table', {
          ...props,
          className: 'w-full text-sm border-collapse border border-border rounded-md',
        }),
      ),
    thead: (props) =>
      createElement('thead', {
        ...props,
        className: 'bg-muted/50',
      }),
    th: (props) =>
      createElement('th', {
        ...props,
        className: 'border border-border px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground',
      }),
    td: (props) =>
      createElement('td', {
        ...props,
        className: 'border border-border px-3 py-1.5 text-sm',
      }),
    tr: (props) =>
      createElement('tr', {
        ...props,
        className: 'even:bg-muted/30',
      }),
  },
}
