import { isPassMove, type GameMove, type MoveTreeNode } from './game'

type ParsedSgfGame = {
	boardSize?: number
	handicapStones?: number
	moves: GameMove[]
	moveTree: Record<string, MoveTreeNode>
	currentMoveId: string
}

type ParseSgfResult =
	| {
			ok: true
			game: ParsedSgfGame
	  }
	| {
			ok: false
			error: string
	  }

type SgfNode = {
	text: string
	children: SgfTree[]
}

type SgfTree = {
	nodes: SgfNode[]
	preChildren: SgfTree[]
}

type ParseNodeResult =
	| {
			ok: true
			tree: SgfTree
			nextIndex: number
	  }
	| {
			ok: false
			error: string
	  }

const ROOT_MOVE_ID = 'root'

const decodeCoordinate = (value: string) => {
	if (value.length !== 2) return null
	const x = value.charCodeAt(0) - 97
	const y = value.charCodeAt(1) - 97
	if (x < 0 || y < 0) return null
	return { y, x }
}

const encodeCoordinate = (x: number, y: number) => {
	if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x > 25 || y > 25) {
		return null
	}
	return `${String.fromCharCode(97 + x)}${String.fromCharCode(97 + y)}`
}

const skipPropertyValue = (content: string, startIndex: number) => {
	let index = startIndex + 1
	while (index < content.length) {
		if (content[index] === '\\') {
			index += 2
			continue
		}
		if (content[index] === ']') {
			return index + 1
		}
		index += 1
	}
	return -1
}

const parseNodeText = (content: string, startIndex: number) => {
	let index = startIndex + 1
	const nodeStart = index
	while (index < content.length) {
		const char = content[index]
		if (char === ';' || char === '(' || char === ')') {
			break
		}
		if (char === '[') {
			const nextIndex = skipPropertyValue(content, index)
			if (nextIndex < 0) return null
			index = nextIndex
			continue
		}
		index += 1
	}
	return {
		text: content.slice(nodeStart, index),
		nextIndex: index
	}
}

const parseTree = (content: string, startIndex: number): ParseNodeResult => {
	if (content[startIndex] !== '(') {
		return { ok: false, error: 'Invalid SGF: expected "(".' }
	}

	let index = startIndex + 1
	const nodes: SgfNode[] = []
	const preChildren: SgfTree[] = []
	let lastNode: SgfNode | null = null

	while (index < content.length) {
		const char = content[index]
		if (char === ';') {
			const node = parseNodeText(content, index)
			if (!node) return { ok: false, error: 'Invalid SGF: unterminated property value.' }
			const nextNode: SgfNode = { text: node.text, children: [] }
			nodes.push(nextNode)
			lastNode = nextNode
			index = node.nextIndex
			continue
		}
		if (char === '(') {
			const childResult = parseTree(content, index)
			if (!childResult.ok) return childResult
			if (lastNode) {
				lastNode.children.push(childResult.tree)
			} else {
				preChildren.push(childResult.tree)
			}
			index = childResult.nextIndex
			continue
		}
		if (char === ')') {
			return { ok: true, tree: { nodes, preChildren }, nextIndex: index + 1 }
		}
		index += 1
	}

	return { ok: false, error: 'Invalid SGF: missing closing ")".' }
}

const parseProperties = (nodeText: string) => {
	const map = new Map<string, string[]>()
	let index = 0

	while (index < nodeText.length) {
		if (!/[A-Za-z]/.test(nodeText[index])) {
			index += 1
			continue
		}

		let key = ''
		while (index < nodeText.length && /[A-Za-z]/.test(nodeText[index])) {
			key += nodeText[index]
			index += 1
		}
		key = key.toUpperCase()

		const values: string[] = []
		while (index < nodeText.length && nodeText[index] === '[') {
			const valueStart = index + 1
			const nextIndex = skipPropertyValue(nodeText, index)
			if (nextIndex < 0) return null
			const rawValue = nodeText.slice(valueStart, nextIndex - 1).replace(/\\]/g, ']')
			values.push(rawValue)
			index = nextIndex
		}

		if (values.length > 0) {
			map.set(key, values)
		}
	}

	return map
}

export const parseSgfContent = (content: string, fallbackBoardSize: number): ParseSgfResult => {
	const trimmed = content.trim()
	if (!trimmed) {
		return { ok: false, error: 'Selected SGF file is empty.' }
	}

	const treeStart = trimmed.indexOf('(')
	if (treeStart < 0) {
		return { ok: false, error: 'Invalid SGF: missing game tree.' }
	}

	const parsedTree = parseTree(trimmed, treeStart)
	if (!parsedTree.ok) return parsedTree

	if (parsedTree.tree.nodes.length === 0) {
		return { ok: false, error: 'Invalid SGF: no nodes found.' }
	}

	const rootProps = parseProperties(parsedTree.tree.nodes[0].text)
	if (!rootProps) {
		return { ok: false, error: 'Invalid SGF: malformed root properties.' }
	}

	const sizeValues = rootProps.get('SZ')
	const parsedBoardSize = sizeValues ? Number.parseInt(sizeValues[0], 10) : undefined
	if (
		typeof parsedBoardSize !== 'undefined' &&
		(!Number.isInteger(parsedBoardSize) || parsedBoardSize < 2 || parsedBoardSize > 19)
	) {
		return { ok: false, error: 'Unsupported board size in SGF. Supported sizes are 2 to 19.' }
	}
	const handicapValues = rootProps.get('HA')
	const parsedHandicapStones = handicapValues ? Number.parseInt(handicapValues[0], 10) : undefined
	if (
		typeof parsedHandicapStones !== 'undefined' &&
		(!Number.isInteger(parsedHandicapStones) ||
			parsedHandicapStones < 0 ||
			parsedHandicapStones > 9 ||
			parsedHandicapStones === 1)
	) {
		return { ok: false, error: 'Unsupported handicap in SGF. Supported handicap values are 0 or 2 to 9.' }
	}

	const boardSize = parsedBoardSize ?? fallbackBoardSize
	const moveTree: Record<string, MoveTreeNode> = {
		[ROOT_MOVE_ID]: { id: ROOT_MOVE_ID, parentId: null, move: null, childrenIds: [] }
	}
	let nodeCounter = 0
	let parseError: string | null = null

	const appendMove = (parentId: string, move: GameMove) => {
		nodeCounter += 1
		const nextId = `sgf-node-${nodeCounter}`
		moveTree[nextId] = {
			id: nextId,
			parentId,
			move,
			childrenIds: []
		}
		moveTree[parentId] = {
			...moveTree[parentId],
			childrenIds: [...moveTree[parentId].childrenIds, nextId]
		}
		return nextId
	}

	const parseMoveFromNode = (
		nodeText: string,
		expectedColor: 'B' | 'W'
	): { move: GameMove | null; nextColor: 'B' | 'W' } | null => {
		const props = parseProperties(nodeText)
		if (!props) {
			parseError = 'Invalid SGF: malformed node properties.'
			return null
		}

		const blackMove = props.get('B')?.[0]
		const whiteMove = props.get('W')?.[0]
		if (typeof blackMove === 'undefined' && typeof whiteMove === 'undefined') {
			return { move: null, nextColor: expectedColor }
		}
		if (typeof blackMove !== 'undefined' && typeof whiteMove !== 'undefined') {
			parseError = 'Unsupported SGF: node contains both B and W moves.'
			return null
		}

		const color: 'B' | 'W' = typeof blackMove !== 'undefined' ? 'B' : 'W'
		const value = (blackMove ?? whiteMove ?? '').trim().toLowerCase()

		if (!value || value === 'tt') {
			return { move: { type: 'pass' }, nextColor: color === 'B' ? 'W' : 'B' }
		}

		const point = decodeCoordinate(value)
		if (!point) {
			parseError = `Invalid SGF move coordinate: "${value}".`
			return null
		}
		if (point.x >= boardSize || point.y >= boardSize) {
			parseError = `SGF move "${value}" is outside board size ${boardSize}.`
			return null
		}

		return {
			move: { type: 'play', y: point.y, x: point.x },
			nextColor: color === 'B' ? 'W' : 'B'
		}
	}

	const walkTree = (
		tree: SgfTree,
		startParentId: string,
		startExpectedColor: 'B' | 'W'
	): { endParentId: string; endColor: 'B' | 'W' } => {
		let parentId = startParentId
		let expectedColor = startExpectedColor

		for (const preChild of tree.preChildren) {
			walkTree(preChild, parentId, expectedColor)
		}

		for (const node of tree.nodes) {
			const parsedMove = parseMoveFromNode(node.text, expectedColor)
			if (!parsedMove) return { endParentId: parentId, endColor: expectedColor }
			expectedColor = parsedMove.nextColor
			if (parsedMove.move) {
				parentId = appendMove(parentId, parsedMove.move)
			}
			for (const childTree of node.children) {
				walkTree(childTree, parentId, expectedColor)
			}
		}

		return { endParentId: parentId, endColor: expectedColor }
	}

	const initialColor: 'B' | 'W' = parsedHandicapStones && parsedHandicapStones > 0 ? 'W' : 'B'
	walkTree(parsedTree.tree, ROOT_MOVE_ID, initialColor)
	if (parseError) {
		return { ok: false, error: parseError }
	}

	const moves: GameMove[] = []
	let currentMoveId = ROOT_MOVE_ID
	while (true) {
		const node = moveTree[currentMoveId]
		const nextId = node?.childrenIds[0]
		if (!nextId) break
		const nextNode = moveTree[nextId]
		if (!nextNode?.move) break
		moves.push(nextNode.move)
		currentMoveId = nextId
	}

	return {
		ok: true,
		game: {
			boardSize: parsedBoardSize,
			handicapStones: parsedHandicapStones,
			moves,
			moveTree,
			currentMoveId
		}
	}
}

const handicapPlacementsByBoardSize: Record<number, Record<number, Array<{ y: number; x: number }>>> = {
	19: {
		0: [],
		2: [
			{ y: 3, x: 15 },
			{ y: 15, x: 3 }
		],
		3: [
			{ y: 3, x: 15 },
			{ y: 15, x: 3 },
			{ y: 15, x: 15 }
		],
		4: [
			{ y: 3, x: 15 },
			{ y: 15, x: 3 },
			{ y: 15, x: 15 },
			{ y: 3, x: 3 }
		],
		5: [
			{ y: 3, x: 15 },
			{ y: 15, x: 3 },
			{ y: 15, x: 15 },
			{ y: 3, x: 3 },
			{ y: 9, x: 9 }
		],
		6: [
			{ y: 3, x: 15 },
			{ y: 15, x: 3 },
			{ y: 15, x: 15 },
			{ y: 3, x: 3 },
			{ y: 9, x: 3 },
			{ y: 9, x: 15 }
		],
		7: [
			{ y: 3, x: 15 },
			{ y: 15, x: 3 },
			{ y: 15, x: 15 },
			{ y: 3, x: 3 },
			{ y: 9, x: 3 },
			{ y: 9, x: 15 },
			{ y: 9, x: 9 }
		],
		8: [
			{ y: 3, x: 15 },
			{ y: 15, x: 3 },
			{ y: 15, x: 15 },
			{ y: 3, x: 3 },
			{ y: 9, x: 3 },
			{ y: 9, x: 15 },
			{ y: 3, x: 9 },
			{ y: 15, x: 9 }
		],
		9: [
			{ y: 3, x: 15 },
			{ y: 15, x: 3 },
			{ y: 15, x: 15 },
			{ y: 3, x: 3 },
			{ y: 9, x: 3 },
			{ y: 9, x: 15 },
			{ y: 3, x: 9 },
			{ y: 15, x: 9 },
			{ y: 9, x: 9 }
		]
	},
	13: {
		0: [],
		2: [
			{ y: 3, x: 9 },
			{ y: 9, x: 3 }
		],
		3: [
			{ y: 3, x: 9 },
			{ y: 9, x: 3 },
			{ y: 9, x: 9 }
		],
		4: [
			{ y: 3, x: 9 },
			{ y: 9, x: 3 },
			{ y: 9, x: 9 },
			{ y: 3, x: 3 }
		],
		5: [
			{ y: 3, x: 9 },
			{ y: 9, x: 3 },
			{ y: 9, x: 9 },
			{ y: 3, x: 3 },
			{ y: 6, x: 6 }
		],
		6: [
			{ y: 3, x: 9 },
			{ y: 9, x: 3 },
			{ y: 9, x: 9 },
			{ y: 3, x: 3 },
			{ y: 6, x: 3 },
			{ y: 6, x: 9 }
		],
		7: [
			{ y: 3, x: 9 },
			{ y: 9, x: 3 },
			{ y: 9, x: 9 },
			{ y: 3, x: 3 },
			{ y: 6, x: 3 },
			{ y: 6, x: 9 },
			{ y: 6, x: 6 }
		],
		8: [
			{ y: 3, x: 9 },
			{ y: 9, x: 3 },
			{ y: 9, x: 9 },
			{ y: 3, x: 3 },
			{ y: 6, x: 3 },
			{ y: 6, x: 9 },
			{ y: 3, x: 6 },
			{ y: 9, x: 6 }
		],
		9: [
			{ y: 3, x: 9 },
			{ y: 9, x: 3 },
			{ y: 9, x: 9 },
			{ y: 3, x: 3 },
			{ y: 6, x: 3 },
			{ y: 6, x: 9 },
			{ y: 3, x: 6 },
			{ y: 9, x: 6 },
			{ y: 6, x: 6 }
		]
	},
	9: {
		0: [],
		2: [
			{ y: 2, x: 6 },
			{ y: 6, x: 2 }
		],
		3: [
			{ y: 2, x: 6 },
			{ y: 6, x: 2 },
			{ y: 6, x: 6 }
		],
		4: [
			{ y: 2, x: 6 },
			{ y: 6, x: 2 },
			{ y: 6, x: 6 },
			{ y: 2, x: 2 }
		],
		5: [
			{ y: 2, x: 6 },
			{ y: 6, x: 2 },
			{ y: 6, x: 6 },
			{ y: 2, x: 2 },
			{ y: 4, x: 4 }
		],
		6: [
			{ y: 2, x: 6 },
			{ y: 6, x: 2 },
			{ y: 6, x: 6 },
			{ y: 2, x: 2 },
			{ y: 4, x: 2 },
			{ y: 4, x: 6 }
		],
		7: [
			{ y: 2, x: 6 },
			{ y: 6, x: 2 },
			{ y: 6, x: 6 },
			{ y: 2, x: 2 },
			{ y: 4, x: 2 },
			{ y: 4, x: 6 },
			{ y: 4, x: 4 }
		],
		8: [
			{ y: 2, x: 6 },
			{ y: 6, x: 2 },
			{ y: 6, x: 6 },
			{ y: 2, x: 2 },
			{ y: 4, x: 2 },
			{ y: 4, x: 6 },
			{ y: 2, x: 4 },
			{ y: 6, x: 4 }
		],
		9: [
			{ y: 2, x: 6 },
			{ y: 6, x: 2 },
			{ y: 6, x: 6 },
			{ y: 2, x: 2 },
			{ y: 4, x: 2 },
			{ y: 4, x: 6 },
			{ y: 2, x: 4 },
			{ y: 6, x: 4 },
			{ y: 4, x: 4 }
		]
	}
}

const getHandicapPlacements = (boardSize: number, handicapStones: number) => {
	const byBoardSize = handicapPlacementsByBoardSize[boardSize]
	if (!byBoardSize) return null
	return byBoardSize[handicapStones] ?? null
}

const SGF_RULESET = 'Japanese'
const SGF_KOMI = '6.5'

export const serializeSgfContent = (boardSize: number, moves: GameMove[], handicapStones = 0) => {
	const safeBoardSize = Number.isInteger(boardSize) && boardSize >= 2 && boardSize <= 19 ? boardSize : 19
	const safeHandicapStones =
		Number.isInteger(handicapStones) && (handicapStones === 0 || (handicapStones >= 2 && handicapStones <= 9))
			? handicapStones
			: 0
	const handicapPlacements = getHandicapPlacements(safeBoardSize, safeHandicapStones)
	if (safeHandicapStones > 0 && !handicapPlacements) {
		throw new Error('Cannot export SGF: handicap is only supported on 9x9, 13x13, and 19x19 boards.')
	}
	const abProperty =
		safeHandicapStones > 0
			? `AB${(handicapPlacements ?? [])
					.map((point) => {
						const coordinate = encodeCoordinate(point.x, point.y)
						if (!coordinate) {
							throw new Error('Cannot export SGF: invalid handicap placement.')
						}
						return `[${coordinate}]`
					})
					.join('')}`
			: ''
	const haProperty = safeHandicapStones > 0 ? `HA[${safeHandicapStones}]` : ''
	const firstMoveColor: 'B' | 'W' = safeHandicapStones > 0 ? 'W' : 'B'
	const sgfMoves = moves
		.map((move, moveIndex) => {
			const key = moveIndex % 2 === 0 ? firstMoveColor : firstMoveColor === 'B' ? 'W' : 'B'
			if ('type' in move && move.type === 'pass') {
				return `;${key}[]`
			}
			const coordinate = encodeCoordinate(move.x, move.y)
			if (!coordinate || move.x >= safeBoardSize || move.y >= safeBoardSize) {
				throw new Error('Cannot export SGF: move coordinate is outside board size.')
			}
			return `;${key}[${coordinate}]`
		})
		.join('')

	return `(;GM[1]FF[4]CA[UTF-8]SZ[${safeBoardSize}]RU[${SGF_RULESET}]KM[${SGF_KOMI}]${haProperty}${abProperty}${sgfMoves})`
}

const getMoveColorForDepth = (depth: number, handicapStones: number): 'B' | 'W' => {
	const firstMoveColor: 'B' | 'W' = handicapStones > 0 ? 'W' : 'B'
	if (depth % 2 === 1) return firstMoveColor
	return firstMoveColor === 'B' ? 'W' : 'B'
}

const serializeMoveNode = (move: GameMove, color: 'B' | 'W', boardSize: number) => {
	if (isPassMove(move)) {
		return `;${color}[]`
	}
	const coordinate = encodeCoordinate(move.x, move.y)
	if (!coordinate || move.x >= boardSize || move.y >= boardSize) {
		throw new Error('Cannot export SGF: move coordinate is outside board size.')
	}
	return `;${color}[${coordinate}]`
}

const serializeMoveTreeLine = (
	moveTree: Record<string, MoveTreeNode>,
	startNodeId: string,
	startDepth: number,
	boardSize: number,
	handicapStones: number
) => {
	let currentId: string | null = startNodeId
	let depth = startDepth
	let output = ''

	while (currentId) {
		const node = moveTree[currentId]
		if (!node || !node.move) {
			throw new Error('Cannot export SGF: move tree is invalid.')
		}

		output += serializeMoveNode(node.move, getMoveColorForDepth(depth, handicapStones), boardSize)

		const [mainChildId, ...variationChildIds] = node.childrenIds
		if (variationChildIds.length > 0) {
			output += variationChildIds
				.map((variationId) => `(${serializeMoveTreeLine(moveTree, variationId, depth + 1, boardSize, handicapStones)})`)
				.join('')
		}

		currentId = mainChildId ?? null
		depth += 1
	}

	return output
}

export const serializeSgfTreeContent = (
	boardSize: number,
	moveTree: Record<string, MoveTreeNode>,
	rootMoveId: string,
	handicapStones = 0
) => {
	const safeBoardSize = Number.isInteger(boardSize) && boardSize >= 2 && boardSize <= 19 ? boardSize : 19
	const safeHandicapStones =
		Number.isInteger(handicapStones) && (handicapStones === 0 || (handicapStones >= 2 && handicapStones <= 9))
			? handicapStones
			: 0
	const handicapPlacements = getHandicapPlacements(safeBoardSize, safeHandicapStones)
	if (safeHandicapStones > 0 && !handicapPlacements) {
		throw new Error('Cannot export SGF: handicap is only supported on 9x9, 13x13, and 19x19 boards.')
	}
	const abProperty =
		safeHandicapStones > 0
			? `AB${(handicapPlacements ?? [])
					.map((point) => {
						const coordinate = encodeCoordinate(point.x, point.y)
						if (!coordinate) {
							throw new Error('Cannot export SGF: invalid handicap placement.')
						}
						return `[${coordinate}]`
					})
					.join('')}`
			: ''
	const haProperty = safeHandicapStones > 0 ? `HA[${safeHandicapStones}]` : ''
	const rootNode = moveTree[rootMoveId]
	if (!rootNode || rootNode.move) {
		throw new Error('Cannot export SGF: move tree root is invalid.')
	}
	const [mainChildId, ...variationRootIds] = rootNode.childrenIds
	const mainLine = mainChildId ? serializeMoveTreeLine(moveTree, mainChildId, 1, safeBoardSize, safeHandicapStones) : ''
	const variations = variationRootIds
		.map((variationId) => `(${serializeMoveTreeLine(moveTree, variationId, 1, safeBoardSize, safeHandicapStones)})`)
		.join('')

	return `(;GM[1]FF[4]CA[UTF-8]SZ[${safeBoardSize}]RU[${SGF_RULESET}]KM[${SGF_KOMI}]${haProperty}${abProperty}${mainLine}${variations})`
}
