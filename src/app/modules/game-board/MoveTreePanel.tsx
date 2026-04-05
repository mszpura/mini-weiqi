import { isPassMove, type MoveTreeNode } from '../../models/game'
import type { CSSProperties } from 'react'

type MoveTreePanelProps = {
	moveTree: Record<string, MoveTreeNode>
	currentMoveId: string
	currentMoveCount: number
	onSelectMoveCount: (moveCount: number, moveId?: string) => void
	isEmbedded?: boolean
}

const ROOT_MOVE_ID = 'root'

type RenderNode = {
	id: string
	depth: number
	row: number
}

const CELL_SIZE = 24
const NODE_SIZE = 14
const NODE_OFFSET = (CELL_SIZE - NODE_SIZE) / 2

export const MoveTreePanel = ({
	moveTree,
	currentMoveId,
	currentMoveCount,
	onSelectMoveCount,
	isEmbedded = false
}: MoveTreePanelProps) => {
	const renderNodes: RenderNode[] = []
	const rootNode = moveTree[ROOT_MOVE_ID]
	let nextVariationRow = 2

	const visitNode = (nodeId: string, depth: number, row: number) => {
		const node = moveTree[nodeId]
		if (!node) return

		renderNodes.push({ id: nodeId, depth, row })
		const [mainChildId, ...variationChildIds] = node.childrenIds
		if (mainChildId && moveTree[mainChildId]) {
			visitNode(mainChildId, depth + 1, row)
		}
		for (const childId of variationChildIds) {
			if (!moveTree[childId]) continue
			const variationRow = nextVariationRow
			nextVariationRow += 1
			visitNode(childId, depth + 1, variationRow)
		}
	}

	if (rootNode) {
		visitNode(ROOT_MOVE_ID, 0, 1)
	}

	const renderNodeById = new Map<string, RenderNode>(renderNodes.map((node) => [node.id, node]))
	const maxDepth = renderNodes.reduce((value, node) => Math.max(value, node.depth), 0)
	const maxRow = renderNodes.reduce((value, node) => Math.max(value, node.row), 1)
	const canvasWidth = Math.max(CELL_SIZE, (maxDepth + 1) * CELL_SIZE)
	const canvasHeight = Math.max(CELL_SIZE, maxRow * CELL_SIZE)

	return (
		<div className={`move-tree-panel ${isEmbedded ? 'move-tree-panel--embedded' : ''}`} aria-label="Moves Tree">
			{isEmbedded ? null : <div className="move-tree-title">Moves Tree</div>}
			<div className="move-tree-branches">
				<div className="move-tree-canvas" role="list" style={{ width: canvasWidth, height: canvasHeight }}>
					<svg className="move-tree-edges" width={canvasWidth} height={canvasHeight} aria-hidden="true">
						{renderNodes.map(({ id, depth, row }) => {
							const node = moveTree[id]
							if (!node?.parentId) return null
							const parentRenderNode = renderNodeById.get(node.parentId)
							if (!parentRenderNode) return null
							const parentX = parentRenderNode.depth * CELL_SIZE + CELL_SIZE / 2
							const parentY = (parentRenderNode.row - 1) * CELL_SIZE + CELL_SIZE / 2
							const childX = depth * CELL_SIZE + CELL_SIZE / 2
							const childY = (row - 1) * CELL_SIZE + CELL_SIZE / 2

							return (
								<g key={`edge-${id}`}>
									<line className="move-tree-edge-line" x1={parentX} y1={parentY} x2={childX} y2={parentY} />
									<line className="move-tree-edge-line" x1={childX} y1={parentY} x2={childX} y2={childY} />
								</g>
							)
						})}
					</svg>
					{renderNodes.map(({ id, depth, row }) => {
						const node = moveTree[id]
						if (!node) return null
						const isStart = id === ROOT_MOVE_ID
						const isActive = isStart ? currentMoveCount === 0 : currentMoveId === id && currentMoveCount === depth
						const isBlackMove = depth % 2 === 1
						const colorClass = isBlackMove ? 'black' : 'white'

						return (
							<button
								key={id}
								className={`move-tree-item ${isStart ? 'move-tree-item--start' : ''} ${isActive ? 'is-active' : ''}`}
								type="button"
								onClick={() => onSelectMoveCount(depth, id)}
								role="listitem"
								aria-label={`Move ${depth}${node.move && isPassMove(node.move) ? ', pass' : ''}`}
								style={
									{
										left: depth * CELL_SIZE + NODE_OFFSET,
										top: (row - 1) * CELL_SIZE + NODE_OFFSET
									} as CSSProperties
								}
							>
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
			</div>
		</div>
	)
}
