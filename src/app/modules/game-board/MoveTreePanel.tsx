import { isPassMove, type MoveTreeNode } from '../../models/game'

type MoveTreePanelProps = {
	moveTree: Record<string, MoveTreeNode>
	currentMoveId: string
	currentMoveCount: number
	onSelectMoveCount: (moveCount: number, moveId?: string) => void
	isEmbedded?: boolean
}

const ROOT_MOVE_ID = 'root'

const getNodeDepth = (moveTree: Record<string, MoveTreeNode>, nodeId: string) => {
	let depth = 0
	let cursor: string | null = nodeId
	while (cursor) {
		const node = moveTree[cursor]
		if (!node || !node.parentId) break
		depth += 1
		cursor = node.parentId
	}
	return depth
}

export const MoveTreePanel = ({
	moveTree,
	currentMoveId,
	currentMoveCount,
	onSelectMoveCount,
	isEmbedded = false
}: MoveTreePanelProps) => {
	const rootNode = moveTree[ROOT_MOVE_ID]
	const leafPaths: string[][] = []
	const collectPaths = (nodeId: string, path: string[]) => {
		const node = moveTree[nodeId]
		if (!node) return
		const nextPath = [...path, nodeId]
		if (node.childrenIds.length === 0) {
			leafPaths.push(nextPath)
			return
		}
		node.childrenIds.forEach((childId) => collectPaths(childId, nextPath))
	}
	;(rootNode?.childrenIds ?? []).forEach((childId) => collectPaths(childId, [ROOT_MOVE_ID]))
	const branchPaths = leafPaths.length > 0 ? leafPaths : [[ROOT_MOVE_ID]]

	return (
		<div className={`move-tree-panel ${isEmbedded ? 'move-tree-panel--embedded' : ''}`} aria-label="Moves Tree">
			{isEmbedded ? null : <div className="move-tree-title">Moves Tree</div>}
			<div className="move-tree-branches">
				{branchPaths.map((path) => (
					<div key={path.join('>')} className="move-tree-list" role="list">
						{path.map((nodeId, index) => {
							const node = moveTree[nodeId]
							if (!node) return null
							const depth = getNodeDepth(moveTree, nodeId)
							const isStart = nodeId === ROOT_MOVE_ID
							const isLast = index === path.length - 1
							const isActive = isStart ? currentMoveCount === 0 : currentMoveId === nodeId && currentMoveCount === depth
							const isBlackMove = depth % 2 === 1
							const colorClass = isBlackMove ? 'black' : 'white'
							return (
								<button
									key={nodeId}
									className={`move-tree-item ${isStart ? 'move-tree-item--start' : ''} ${isActive ? 'is-active' : ''}`}
									type="button"
									onClick={() => onSelectMoveCount(depth, nodeId)}
									role="listitem"
									aria-label={`Move ${depth}${node.move && isPassMove(node.move) ? ', pass' : ''}`}
								>
									<span
										className={`move-tree-item-line ${isStart ? 'move-tree-item-line--start' : ''} ${
											isLast ? 'move-tree-item-line--last' : ''
										}`}
										aria-hidden="true"
									/>
									<span
										className={`move-tree-node ${
											isStart
												? 'move-tree-node--start'
												: node.move && isPassMove(node.move)
													? 'move-tree-node--pass'
													: `move-tree-node--stone move-tree-node--${colorClass}`
										}`}
										aria-hidden="true"
									/>
								</button>
							)
						})}
					</div>
				))}
			</div>
		</div>
	)
}
