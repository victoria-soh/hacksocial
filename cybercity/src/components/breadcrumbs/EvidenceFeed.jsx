import Panel from '../shared/Panel'

/**
 * Small, closed "feed preview" cards for each post — just enough to be
 * immediately recognizable per platform (icon, handle, avatar, engagement,
 * a short snippet). Clicking one opens it in place to reveal the full post
 * content; only an opened post becomes a draggable/selectable evidence
 * source on the case board below (see ConnectionMap's `openedIds` prop).
 * Opening is one-directional — there's nothing to hide again, matching how
 * every other reveal in this mission works.
 */
export default function EvidenceFeed({ posts, openedIds, onOpen, guidedPostId = null }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => {
        const opened = openedIds.has(post.id)
        const isGuided = !opened && post.id === guidedPostId
        return (
          <Panel
            key={post.id}
            as={opened ? 'div' : 'button'}
            onClick={opened ? undefined : () => onOpen(post.id)}
            aria-expanded={opened ? undefined : false}
            className="text-left w-full"
            style={isGuided ? { borderColor: 'var(--cc-focus)', boxShadow: '0 0 14px rgba(255, 212, 0, 0.5)' } : undefined}
          >
            {isGuided && (
              <span
                className="cc-pulse absolute -top-2 -right-2 text-[10px] font-bold px-2 py-0.5 rounded-full cc-chrome"
                style={{ background: 'var(--cc-focus)', color: '#3a2e00' }}
                aria-hidden="true"
              >
                👉 Start here
              </span>
            )}
            <div className="flex items-center gap-2 mb-1">
              <span
                aria-hidden="true"
                className="flex items-center justify-center w-7 h-7 rounded-full text-sm shrink-0"
                style={{ background: 'var(--cc-bg-alt)', border: '1px solid var(--cc-panel-border)' }}
              >
                🧑
              </span>
              <p className="text-xs text-[var(--cc-text-dim)] m-0 flex items-center gap-1">
                <span aria-hidden="true">{post.icon}</span> {post.platform} · {post.handle}
              </p>
            </div>

            {opened ? (
              <>
                <p className="font-medium my-1">{post.caption}</p>
                {post.imageDescription && <p className="text-xs text-[var(--cc-text-dim)] m-0">{post.imageDescription}</p>}
                {post.routeDescription && <p className="text-xs text-[var(--cc-text-dim)] m-0">{post.routeDescription}</p>}
              </>
            ) : (
              <p className="text-sm text-[var(--cc-text-dim)] my-1 italic">{post.preview}</p>
            )}

            {post.engagement && (
              <p className="text-xs text-[var(--cc-text-dim)] mt-2 mb-0 flex items-center gap-1">
                <span aria-hidden="true">{post.engagement.icon}</span> {post.engagement.label}
              </p>
            )}

            <p
              className="text-[11px] mt-2 mb-0 font-semibold"
              style={{ color: opened ? 'var(--cc-good)' : 'var(--cc-accent-2)' }}
            >
              {opened ? '✓ Added to case board' : 'Tap to open →'}
            </p>
          </Panel>
        )
      })}
    </div>
  )
}
