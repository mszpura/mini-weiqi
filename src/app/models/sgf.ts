import type { GameMove } from './game'

type ParsedSgfGame = {
	boardSize?: number
	moves: GameMove[]
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

type SgfTree = {
	nodes: string[]
	children: SgfTree[]
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
	const nodes: string[] = []
	const children: SgfTree[] = []

	while (index < content.length) {
		const char = content[index]
		if (char === ';') {
			const node = parseNodeText(content, index)
			if (!node) return { ok: false, error: 'Invalid SGF: unterminated property value.' }
			nodes.push(node.text)
			index = node.nextIndex
			continue
		}
		if (char === '(') {
			const childResult = parseTree(content, index)
			if (!childResult.ok) return childResult
			children.push(childResult.tree)
			index = childResult.nextIndex
			continue
		}
		if (char === ')') {
			return { ok: true, tree: { nodes, children }, nextIndex: index + 1 }
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

	const mainLineNodes = [...parsedTree.tree.nodes]
	let current = parsedTree.tree
	while (current.children.length > 0) {
		current = current.children[0]
		mainLineNodes.push(...current.nodes)
	}

	if (mainLineNodes.length === 0) {
		return { ok: false, error: 'Invalid SGF: no nodes found.' }
	}

	const rootProps = parseProperties(mainLineNodes[0])
	if (!rootProps) {
		return { ok: false, error: 'Invalid SGF: malformed root properties.' }
	}

	const sizeValues = rootProps.get('SZ')
	const parsedBoardSize = sizeValues ? Number.parseInt(sizeValues[0], 10) : undefined
	if (typeof parsedBoardSize !== 'undefined' && (!Number.isInteger(parsedBoardSize) || parsedBoardSize < 2 || parsedBoardSize > 19)) {
		return { ok: false, error: 'Unsupported board size in SGF. Supported sizes are 2 to 19.' }
	}

	const boardSize = parsedBoardSize ?? fallbackBoardSize
	const moves: GameMove[] = []
	let expectedColor: 'B' | 'W' = 'B'

	for (const nodeText of mainLineNodes) {
		const props = parseProperties(nodeText)
		if (!props) return { ok: false, error: 'Invalid SGF: malformed node properties.' }

		const blackMove = props.get('B')?.[0]
		const whiteMove = props.get('W')?.[0]
		if (typeof blackMove === 'undefined' && typeof whiteMove === 'undefined') {
			continue
		}
		if (typeof blackMove !== 'undefined' && typeof whiteMove !== 'undefined') {
			return { ok: false, error: 'Unsupported SGF: node contains both B and W moves.' }
		}

		const color: 'B' | 'W' = typeof blackMove !== 'undefined' ? 'B' : 'W'
		const value = (blackMove ?? whiteMove ?? '').trim().toLowerCase()

		if (color !== expectedColor) {
			return { ok: false, error: 'Unsupported SGF sequence: only alternating Black/White moves are supported.' }
		}

		if (!value || value === 'tt') {
			moves.push({ type: 'pass' })
			expectedColor = expectedColor === 'B' ? 'W' : 'B'
			continue
		}

		const point = decodeCoordinate(value)
		if (!point) {
			return { ok: false, error: `Invalid SGF move coordinate: "${value}".` }
		}
		if (point.x >= boardSize || point.y >= boardSize) {
			return { ok: false, error: `SGF move "${value}" is outside board size ${boardSize}.` }
		}

		moves.push({ type: 'play', y: point.y, x: point.x })
		expectedColor = expectedColor === 'B' ? 'W' : 'B'
	}

	return {
		ok: true,
		game: {
			boardSize: parsedBoardSize,
			moves
		}
	}
}

export const serializeSgfContent = (boardSize: number, moves: GameMove[]) => {
	const safeBoardSize = Number.isInteger(boardSize) && boardSize >= 2 && boardSize <= 19 ? boardSize : 19
	const sgfMoves = moves
		.map((move, moveIndex) => {
			const key = moveIndex % 2 === 0 ? 'B' : 'W'
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

	return `(;GM[1]FF[4]CA[UTF-8]SZ[${safeBoardSize}]${sgfMoves})`
}
