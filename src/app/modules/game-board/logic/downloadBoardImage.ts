type DownloadBoardImageParams = {
	boardElement: HTMLDivElement
	boardSize: number
	moveNumber: number
}

export const downloadBoardImage = ({ boardElement, boardSize, moveNumber }: DownloadBoardImageParams) => {
	const boardSvg = boardElement.querySelector('svg')
	if (!(boardSvg instanceof SVGSVGElement)) return

	const styledSvg = boardSvg.cloneNode(true)
	if (!(styledSvg instanceof SVGSVGElement)) return
	const sourceNodes = boardSvg.querySelectorAll('*')
	const targetNodes = styledSvg.querySelectorAll('*')
	const styleProperties = [
		'fill',
		'fill-opacity',
		'stroke',
		'stroke-opacity',
		'stroke-width',
		'opacity',
		'filter',
		'font-family',
		'font-size',
		'font-weight',
		'letter-spacing',
		'text-anchor',
		'dominant-baseline',
		'paint-order'
	]

	for (let index = 0; index < sourceNodes.length; index += 1) {
		const sourceNode = sourceNodes[index]
		const targetNode = targetNodes[index]
		if (!sourceNode || !targetNode) continue
		const computedStyle = window.getComputedStyle(sourceNode)
		for (const property of styleProperties) {
			const value = computedStyle.getPropertyValue(property)
			if (!value) continue
			targetNode.style.setProperty(property, value)
		}
	}
	const intersectionNodes = styledSvg.querySelectorAll('.intersection')
	intersectionNodes.forEach((intersectionNode) => {
		const stoneNode = intersectionNode.querySelector('.stone')
		if (!(stoneNode instanceof SVGElement)) return
		const markerNodes = intersectionNode.querySelectorAll('.marker, .ko-marker, .territory-marker')
		markerNodes.forEach((markerNode) => {
			if (!(markerNode instanceof SVGElement)) return
			markerNode.style.setProperty('visibility', 'hidden')
			markerNode.style.setProperty('display', 'none')
			markerNode.style.setProperty('opacity', '0')
		})
		if (intersectionNode.classList.contains('empty')) {
			stoneNode.style.setProperty('opacity', '0')
			return
		}
		if (intersectionNode.classList.contains('black')) {
			stoneNode.style.setProperty('fill', '#000')
			stoneNode.style.setProperty('stroke', '#000')
			stoneNode.style.setProperty('opacity', '1')
			return
		}
		if (intersectionNode.classList.contains('white')) {
			stoneNode.style.setProperty('fill', '#fff')
			stoneNode.style.setProperty('stroke', '#676767')
			stoneNode.style.setProperty('opacity', '1')
		}
	})

	const serializedSvg = new XMLSerializer().serializeToString(styledSvg)
	const svgBlob = new Blob([serializedSvg], { type: 'image/svg+xml;charset=utf-8' })
	const objectUrl = URL.createObjectURL(svgBlob)
	const image = new Image()
	image.onload = () => {
		const width = boardSvg.viewBox.baseVal.width || boardSvg.clientWidth
		const height = boardSvg.viewBox.baseVal.height || boardSvg.clientHeight
		const canvas = document.createElement('canvas')
		canvas.width = Math.max(1, Math.floor(width))
		canvas.height = Math.max(1, Math.floor(height))
		const context = canvas.getContext('2d')
		if (!context) {
			URL.revokeObjectURL(objectUrl)
			return
		}
		const boardStyles = window.getComputedStyle(boardElement)
		context.fillStyle = boardStyles.backgroundColor || '#d2a96f'
		context.fillRect(0, 0, canvas.width, canvas.height)
		context.drawImage(image, 0, 0, canvas.width, canvas.height)
		const pngDataUrl = canvas.toDataURL('image/png')
		const downloadLink = document.createElement('a')
		downloadLink.href = pngDataUrl
		downloadLink.download = `mini-weiqi-board-${boardSize}x${boardSize}-move-${moveNumber}.png`
		downloadLink.click()
		URL.revokeObjectURL(objectUrl)
	}
	image.onerror = () => {
		URL.revokeObjectURL(objectUrl)
		window.alert('Failed to generate board image.')
	}
	image.src = objectUrl
}
