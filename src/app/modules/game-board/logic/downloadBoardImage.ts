type DownloadBoardImageParams = {
	boardElement: HTMLDivElement
	boardSize: number
	moveNumber: number
}

type RenderBoardImageParams = {
	boardElement: HTMLDivElement
	captionLines?: string[]
	captionPlacement?: 'bottom' | 'right'
}

export const renderBoardImageBlob = async ({
	boardElement,
	captionLines = [],
	captionPlacement = 'bottom'
}: RenderBoardImageParams) => {
	const boardSvg = boardElement.querySelector('svg')
	if (!(boardSvg instanceof SVGSVGElement)) {
		throw new Error('Board SVG is not available.')
	}

	const styledSvg = boardSvg.cloneNode(true)
	if (!(styledSvg instanceof SVGSVGElement)) {
		throw new Error('Failed to clone board SVG.')
	}
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
	const image = await new Promise<HTMLImageElement>((resolve, reject) => {
		const nextImage = new Image()
		nextImage.onload = () => resolve(nextImage)
		nextImage.onerror = () => reject(new Error('Failed to generate board image.'))
		nextImage.src = objectUrl
	})

	try {
		const width = boardSvg.viewBox.baseVal.width || boardSvg.clientWidth
		const height = boardSvg.viewBox.baseVal.height || boardSvg.clientHeight
		const safeCaptionLines = captionLines.map((line) => line.trim()).filter(Boolean)
		const hasCaption = safeCaptionLines.length > 0
		const captionHeight = hasCaption && captionPlacement === 'bottom' ? 16 + safeCaptionLines.length * 20 : 0
		const captionPanelWidth = hasCaption && captionPlacement === 'right' ? Math.max(280, Math.floor(width * 0.42)) : 0
		const canvas = document.createElement('canvas')
		canvas.width = Math.max(1, Math.floor(width + captionPanelWidth))
		canvas.height = Math.max(1, Math.floor(height + captionHeight))
		const context = canvas.getContext('2d')
		if (!context) {
			throw new Error('Failed to create image context.')
		}
		const boardStyles = window.getComputedStyle(boardElement)
		context.fillStyle = boardStyles.backgroundColor || '#d2a96f'
		context.fillRect(0, 0, canvas.width, Math.floor(height))
		context.drawImage(image, 0, 0, Math.floor(width), Math.floor(height))

		if (hasCaption) {
			const drawWrappedText = ({
				text,
				x,
				y,
				maxWidth,
				lineHeight,
				font,
				color
			}: {
				text: string
				x: number
				y: number
				maxWidth: number
				lineHeight: number
				font: string
				color: string
			}) => {
				context.font = font
				context.fillStyle = color
				const words = text.split(/\s+/).filter(Boolean)
				if (words.length === 0) return y
				let currentLine = words[0] ?? ''
				let cursorY = y

				for (let index = 1; index < words.length; index += 1) {
					const candidate = `${currentLine} ${words[index]}`
					if (context.measureText(candidate).width <= maxWidth) {
						currentLine = candidate
						continue
					}
					context.fillText(currentLine, x, cursorY)
					currentLine = words[index] ?? ''
					cursorY += lineHeight
				}

				context.fillText(currentLine, x, cursorY)
				return cursorY + lineHeight
			}

			context.textAlign = 'left'
			context.textBaseline = 'top'

			if (captionPlacement === 'right') {
				const panelX = Math.floor(width)
				const gradient = context.createLinearGradient(panelX, 0, canvas.width, canvas.height)
				gradient.addColorStop(0, '#171318')
				gradient.addColorStop(0.65, '#241b14')
				gradient.addColorStop(1, '#312116')
				context.fillStyle = gradient
				context.fillRect(panelX, 0, captionPanelWidth, canvas.height)

				context.fillStyle = '#f2c48a'
				context.fillRect(panelX, 0, 3, canvas.height)

				const contentX = panelX + 20
				const contentWidth = captionPanelWidth - 40
				let cursorY = 20

				context.fillStyle = '#f8f1e5'
				context.font = '700 24px "Inter", "Segoe UI", sans-serif'
				context.fillText('Mini Weiqi', contentX, cursorY)
				cursorY += 34

				context.fillStyle = '#cbb9a3'
				context.font = '500 13px "Inter", "Segoe UI", sans-serif'
				context.fillText('GAME SUMMARY', contentX, cursorY)
				cursorY += 24

				context.fillStyle = 'rgba(248, 241, 229, 0.2)'
				context.fillRect(contentX, cursorY, contentWidth, 1)
				cursorY += 16

				safeCaptionLines.forEach((line) => {
					const [labelRaw, ...restParts] = line.split(':')
					const hasLabel = restParts.length > 0
					if (hasLabel) {
						const valueText = restParts.join(':').trim()
						context.fillStyle = '#b9a68c'
						context.font = '600 12px "Inter", "Segoe UI", sans-serif'
						context.fillText(labelRaw.trim().toUpperCase(), contentX, cursorY)
						cursorY += 18
						cursorY = drawWrappedText({
							text: valueText,
							x: contentX,
							y: cursorY,
							maxWidth: contentWidth,
							lineHeight: 22,
							font: '600 18px "Inter", "Segoe UI", sans-serif',
							color: '#f8f1e5'
						})
						cursorY += 8
						return
					}

					cursorY = drawWrappedText({
						text: line,
						x: contentX,
						y: cursorY,
						maxWidth: contentWidth,
						lineHeight: 22,
						font: '600 18px "Inter", "Segoe UI", sans-serif',
						color: '#f8f1e5'
					})
					cursorY += 8
				})
			} else {
				context.fillStyle = '#1f1812'
				context.fillRect(0, Math.floor(height), canvas.width, captionHeight)
				context.fillStyle = '#f8f1e5'
				context.font = '600 18px "Inter", "Segoe UI", sans-serif'
				const textStartX = 16
				const textStartY = Math.floor(height) + 10
				safeCaptionLines.forEach((line, index) => {
					context.fillText(line, textStartX, textStartY + index * 28)
				})
			}
		}

		const pngBlob = await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob((blob) => {
				if (!blob) {
					reject(new Error('Failed to encode board image.'))
					return
				}
				resolve(blob)
			}, 'image/png')
		})
		return pngBlob
	} finally {
		URL.revokeObjectURL(objectUrl)
	}
}

export const downloadBoardImage = async ({ boardElement, boardSize, moveNumber }: DownloadBoardImageParams) => {
	const pngBlob = await renderBoardImageBlob({ boardElement })
	const downloadLink = document.createElement('a')
	const fileUrl = URL.createObjectURL(pngBlob)
	downloadLink.href = fileUrl
	downloadLink.download = `mini-weiqi-board-${boardSize}x${boardSize}-move-${moveNumber}.png`
	downloadLink.click()
	URL.revokeObjectURL(fileUrl)
}
