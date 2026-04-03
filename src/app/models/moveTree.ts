import type { GameMove, MoveTreeNode } from './game'

export const ROOT_MOVE_ID = 'root'

export const createEmptyMoveTree = (): Record<string, MoveTreeNode> => ({
	[ROOT_MOVE_ID]: {
		id: ROOT_MOVE_ID,
		parentId: null,
		move: null,
		childrenIds: []
	}
})

export const createMoveNodeId = () =>
	typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
		? crypto.randomUUID()
		: `move-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

export const getLineageNodeIds = (moveTree: Record<string, MoveTreeNode>, nodeId: string): string[] => {
	const lineage: string[] = []
	let cursor: string | null = nodeId
	while (cursor) {
		const node: MoveTreeNode | undefined = moveTree[cursor]
		if (!node) break
		lineage.push(node.id)
		cursor = node.parentId
	}
	return lineage.reverse()
}

export const getMovesFromNodeId = (moveTree: Record<string, MoveTreeNode>, nodeId: string): GameMove[] =>
	getLineageNodeIds(moveTree, nodeId)
		.map((id) => moveTree[id])
		.filter((node): node is MoveTreeNode => Boolean(node && node.move))
		.map((node) => node.move as GameMove)

export const getNodeDepth = (moveTree: Record<string, MoveTreeNode>, nodeId: string) =>
	Math.max(0, getLineageNodeIds(moveTree, nodeId).length - 1)

export const getMainLineNodeAtDepth = (moveTree: Record<string, MoveTreeNode>, depth: number) => {
	let cursor = ROOT_MOVE_ID
	let remaining = Math.max(0, depth)
	while (remaining > 0) {
		const nextId = moveTree[cursor]?.childrenIds[0]
		if (!nextId) break
		cursor = nextId
		remaining -= 1
	}
	return cursor
}

export const getMainLineLeafFromNode = (moveTree: Record<string, MoveTreeNode>, startNodeId: string) => {
	let cursor = startNodeId
	while (true) {
		const nextId = moveTree[cursor]?.childrenIds[0]
		if (!nextId) return cursor
		cursor = nextId
	}
}
