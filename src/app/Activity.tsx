import { useEffect, useRef } from 'react'
import { Game } from 'tenuki'

export const Activity = () => {
	const boardRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const boardElement = boardRef.current
		if (!boardElement) return

		boardElement.innerHTML = ''
		new Game({
			element: boardElement,
			boardSize: 19,
		})

		return () => {
			boardElement.innerHTML = ''
		}
	}, [])

	return (
		<div>
			<br />
			<div
				ref={boardRef}
				className="tenuki-board"
				data-include-coordinates="true"
				style={{ width: 552, height: 552, margin: '0 auto' }}
			/>
		</div>
	)
}
