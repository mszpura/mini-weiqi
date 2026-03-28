import { isPassMove, type GameMove } from '../../models/game'

type MoveTreePanelProps = {
	moves: GameMove[]
	currentMoveCount: number
	onSelectMoveCount: (moveCount: number) => void
}

export const MoveTreePanel = ({ moves, currentMoveCount, onSelectMoveCount }: MoveTreePanelProps) => {
	return (
		<aside className="move-tree-panel" aria-label="Move tree">
			<div className="move-tree-list" role="list">
				<button
					className={`move-tree-item move-tree-item--start ${currentMoveCount === 0 ? 'is-active' : ''}`}
					type="button"
					onClick={() => onSelectMoveCount(0)}
					role="listitem"
					aria-label="Move 0"
				>
					<span className="move-tree-item-line" aria-hidden="true" />
					<span className="move-tree-node move-tree-node--start" aria-hidden="true" />
				</button>
				{moves.map((move, index) => {
					const moveCount = index + 1
					const isBlackMove = index % 2 === 0
					const colorClass = isBlackMove ? 'black' : 'white'

					return (
						<button
							key={moveCount}
							className={`move-tree-item ${currentMoveCount === moveCount ? 'is-active' : ''}`}
							type="button"
							onClick={() => onSelectMoveCount(moveCount)}
							role="listitem"
							aria-label={`Move ${moveCount}${isPassMove(move) ? ', pass' : ''}`}
						>
							<span className="move-tree-item-line" aria-hidden="true" />
							<span
								className={`move-tree-node ${
									isPassMove(move) ? 'move-tree-node--pass' : `move-tree-node--stone move-tree-node--${colorClass}`
								}`}
								aria-hidden="true"
							/>
						</button>
					)
				})}
			</div>
		</aside>
	)
}
