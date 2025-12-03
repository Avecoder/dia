import React, { useRef, useCallback, useState } from 'react'
import { ReactInfiniteCanvas } from 'react-infinite-canvas'
import { useGesture } from 'react-use-gesture'
import './DiagramCanvas.css'

const DiagramCanvas = ({ data, relevantElements }) => {
  const containerRef = useRef(null)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const [selectedNode, setSelectedNode] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [hoveredEdgeId, setHoveredEdgeId] = useState(null)
  const [nodesPositions, setNodesPositions] = useState(() => {
    // Инициализируем позиции из data
    const positions = new Map()
    if (data?.nodes) {
      data.nodes.forEach(node => {
        positions.set(node.id, { x: node.x, y: node.y })
      })
    }
    return positions
  })
  
  // Обновляем позиции при изменении данных
  React.useEffect(() => {
    if (data?.nodes) {
      setNodesPositions(prev => {
        const next = new Map(prev)
        data.nodes.forEach(node => {
          // Обновляем только если позиция еще не была изменена пользователем
          if (!next.has(node.id)) {
            next.set(node.id, { x: node.x, y: node.y })
          }
        })
        return next
      })
    }
  }, [data])

  const handleNodeClick = useCallback((node, event) => {
    event.stopPropagation()
    event.preventDefault()
    console.log('Node clicked:', node.id, node)
    console.log('Node description:', node.description) // для отладки
    // Всегда показываем плашку при клике на узел
    setSelectedNode(node)
    setTooltipPosition({
      x: node.x + 80,
      y: node.y - 20,
    })
  }, [])

  const getNodeCategory = useCallback((node) => {
    // Если категория указана явно, используем её
    if (node.category) {
      return node.category
    }
    
    const { id, label } = node
    // Клиенты
    if (id.startsWith('client')) {
      return 'client'
    }
    // Хранилища (Map, Object)
    if (id.includes('Storage') || id.includes('Map') || id.includes('List') || id.includes('Peers')) {
      return 'storage'
    }
    // Серверы
    if (id.includes('server') || id.includes('Server')) {
      return 'server'
    }
    // Обработчики (handle*)
    if (id.startsWith('handle')) {
      return 'handler'
    }
    // Утилиты (parse, routes, send, broadcast)
    if (id === 'parse' || id === 'routes' || id === 'sendMessage' || id === 'broadcast') {
      return 'utility'
    }
    // Системные (heartbeat, logger, telegram)
    if (id.includes('Heartbeat') || id.includes('logger') || id.includes('telegram') || id.includes('Exception')) {
      return 'system'
    }
    // Управление пользователями
    if (id.includes('userManagement') || id.includes('users/index')) {
      return 'management'
    }
    // По умолчанию
    return 'default'
  }, [])

  // Определяем, является ли элемент релевантным
  const isNodeRelevant = useCallback((nodeId) => {
    if (!relevantElements) return true
    return relevantElements.nodes?.includes(nodeId) || false
  }, [relevantElements])

  const isEdgeRelevant = useCallback((from, to) => {
    if (!relevantElements) return true
    const edgeKey = `${from}-${to}`
    return relevantElements.edges?.includes(edgeKey) || false
  }, [relevantElements])

  const NodeComponent = React.memo(({ node, spacingScale, transform, nodesPositions, setNodesPositions, selectedNode, handleNodeClick, getNodeCategory, isRelevant }) => {
    const { label, type, id } = node
    const category = getNodeCategory(node)
    const isSelected = selectedNode?.id === id
    const nodeRef = useRef(null)
    
    // Используем позицию из состояния, если есть, иначе из исходных данных
    const nodePosition = nodesPositions.get(id) || { x: node.x, y: node.y }
    const [nodePos, setNodePos] = useState({ x: nodePosition.x, y: nodePosition.y })
    
    // Обновляем позицию при изменении в nodesPositions
    React.useEffect(() => {
      const pos = nodesPositions.get(id)
      if (pos) {
        setNodePos(pos)
      }
    }, [nodesPositions, id])
    
    const x = nodePos.x
    const y = nodePos.y
    
    // Используем useGesture для перетаскивания узла
    const bind = useGesture({
      onDrag: ({ offset: [dx, dy], first, event }) => {
        if (first) {
          event?.stopPropagation()
        }
        const newX = nodePos.x + dx / (transform.scale * spacingScale)
        const newY = nodePos.y + dy / (transform.scale * spacingScale)
        setNodePos({ x: newX, y: newY })
        setNodesPositions(prev => {
          const next = new Map(prev)
          next.set(id, { x: newX, y: newY })
          return next
        })
      },
      onClick: (e) => {
        e.stopPropagation()
        handleNodeClick(node, e)
      },
    }, {
      drag: {
        filterTaps: true,
        threshold: 5,
      }
    })

    if (type === 'circle') {
      const size = category === 'client' ? 70 : 60
      return (
        <div
          key={id}
          data-node-id={id}
          {...bind()}
          className={`diagram-node diagram-node-circle diagram-node-${category} ${isSelected ? 'selected' : ''} ${!isRelevant ? 'dimmed' : ''}`}
          style={{
            left: (x - size / 2) * spacingScale,
            top: (y - size / 2) * spacingScale,
            position: 'absolute',
            width: size,
            height: size,
            zIndex: 100,
            cursor: 'grab',
            opacity: isRelevant ? 1 : 0.2,
            transition: 'opacity 0.3s ease',
          }}
        >
          <span className="node-label">{label || id}</span>
        </div>
      )
    } else if (type === 'diamond') {
      // Ромб для условий/решений
      const size = 80
      return (
        <div
          key={id}
          data-node-id={id}
          {...bind()}
          className={`diagram-node diagram-node-diamond diagram-node-${category} ${isSelected ? 'selected' : ''} ${!isRelevant ? 'dimmed' : ''}`}
          style={{
            left: (x - size / 2) * spacingScale,
            top: (y - size / 2) * spacingScale,
            position: 'absolute',
            width: size,
            height: size,
            zIndex: 100,
            cursor: 'grab',
            opacity: isRelevant ? 1 : 0.2,
            transition: 'opacity 0.3s ease',
          }}
        >
          <span className="node-label">{label || id}</span>
        </div>
      )
    } else if (type === 'hexagon') {
      // Шестиугольник для процессов
      const size = 70
      return (
        <div
          key={id}
          data-node-id={id}
          {...bind()}
          className={`diagram-node diagram-node-hexagon diagram-node-${category} ${isSelected ? 'selected' : ''} ${!isRelevant ? 'dimmed' : ''}`}
          style={{
            left: (x - size / 2) * spacingScale,
            top: (y - size / 2) * spacingScale,
            position: 'absolute',
            width: size,
            height: size,
            zIndex: 100,
            cursor: 'grab',
            opacity: isRelevant ? 1 : 0.2,
            transition: 'opacity 0.3s ease',
          }}
        >
          <span className="node-label">{label || id}</span>
        </div>
      )
    } else {
      // Прямоугольник по умолчанию
      // Разные размеры для разных категорий
      const width = category === 'server' ? 180 : category === 'handler' ? 160 : category === 'utility' ? 140 : 130
      const height = category === 'server' ? 70 : category === 'handler' ? 50 : 50
      
      return (
        <div
          key={id}
          data-node-id={id}
          {...bind()}
          className={`diagram-node diagram-node-rectangle diagram-node-${category} ${isSelected ? 'selected' : ''} ${!isRelevant ? 'dimmed' : ''}`}
          style={{
            left: (x - width / 2) * spacingScale,
            top: (y - height / 2) * spacingScale,
            position: 'absolute',
            width,
            height,
            zIndex: 100,
            cursor: 'grab',
            opacity: isRelevant ? 1 : 0.2,
            transition: 'opacity 0.3s ease',
          }}
        >
          <span className="node-label">{label || id}</span>
        </div>
      )
    }
  })
  
  const renderNode = useCallback((node) => {
    const isRelevant = isNodeRelevant(node.id)
    return (
      <NodeComponent
        key={node.id}
        node={node}
        spacingScale={1.5}
        transform={transform}
        nodesPositions={nodesPositions}
        setNodesPositions={setNodesPositions}
        selectedNode={selectedNode}
        handleNodeClick={handleNodeClick}
        getNodeCategory={getNodeCategory}
        isRelevant={isRelevant}
      />
    )
  }, [transform, nodesPositions, selectedNode, handleNodeClick, getNodeCategory, isNodeRelevant])


  useGesture(
    {
      onDrag: ({ offset: [x, y], target, first, touches }) => {
        // Не обрабатываем drag если кликнули на узел
        if (first && target?.closest('.diagram-node')) {
          return false
        }
        // Не обрабатываем drag если это touch и началось на узле
        if (first && touches > 0 && target?.closest('.diagram-node')) {
          return false
        }
        setTransform(prev => ({ ...prev, x, y }))
      },
      onPinch: ({ offset: [scale] }) => {
        setTransform(prev => ({ ...prev, scale: 1 + scale * 0.01 }))
      },
    },
    {
      target: containerRef,
      eventOptions: { passive: false },
      drag: {
        filterTaps: true,
        threshold: 5,
      },
    }
  )
  

  const handleCanvasClick = useCallback((e) => {
    // Закрываем плашку только если кликнули не на узел и не на саму плашку
    if (!e.target.closest('.diagram-node') && !e.target.closest('.node-description-tooltip')) {
      setSelectedNode(null)
    }
  }, [])

  if (!data || !data.nodes) {
    return <div className="diagram-container">Нет данных для отображения</div>
  }

  // Обработчик в capture фазе для перехвата кликов на узлах
  const handleContentMouseDown = useCallback((e) => {
    const nodeElement = e.target.closest('.diagram-node')
    if (nodeElement) {
      const nodeId = nodeElement.getAttribute('data-node-id')
      if (nodeId) {
        const node = data.nodes.find(n => n.id === nodeId)
        if (node) {
          e.stopPropagation()
          handleNodeClick(node, e)
        }
      }
    }
  }, [data, handleNodeClick])

  // Позиция плашки - левый верхний угол
  const getTooltipStyle = () => {
    return {
      left: '20px',
      top: '20px',
    }
  }

  // Масштаб для увеличения расстояний между блоками
  const spacingScale = 1.5

  // Вычисляем bounding box для всех узлов
  const getBoundingBox = () => {
    if (!data.nodes || data.nodes.length === 0) {
      return { minX: 0, minY: 0, maxX: 2000, maxY: 2000 }
    }
    const xs = data.nodes.map(n => n.x)
    const ys = data.nodes.map(n => n.y)
    const padding = 200
    return {
      minX: Math.min(...xs) - padding,
      minY: Math.min(...ys) - padding,
      maxX: Math.max(...xs) + padding,
      maxY: Math.max(...ys) + padding,
    }
  }
  
  const bbox = getBoundingBox()
  const svgWidth = (bbox.maxX - bbox.minX) * spacingScale
  const svgHeight = (bbox.maxY - bbox.minY) * spacingScale

  return (
    <div className="diagram-container" ref={containerRef} onClick={handleCanvasClick}>
      <ReactInfiniteCanvas
        minZoom={0.1}
        maxZoom={3}
        panOnScroll={true}
        scrollBarConfig={{ renderScrollBar: true }}
      >
        <div
          className="diagram-content"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
            position: 'relative',
            width: '100%',
            height: '100%',
          }}
          onMouseDownCapture={handleContentMouseDown}
        >
          {/* Рисуем edges сначала */}
          {data.edges && data.edges.length > 0 && (
            <svg
              style={{
                position: 'absolute',
                left: bbox.minX * spacingScale,
                top: bbox.minY * spacingScale,
                width: svgWidth,
                height: svgHeight,
                pointerEvents: 'none',
                zIndex: 1,
                overflow: 'visible',
              }}
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="12"
                  markerHeight="12"
                  refX="11"
                  refY="4"
                  orient="auto"
                  markerUnits="userSpaceOnUse"
                >
                  <path d="M 0 0 L 12 4 L 0 8 Z" fill="#666" stroke="none" />
                </marker>
                {/* Фильтр для подсветки */}
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              {(() => {
                // Улучшенный алгоритм для идеальных линий без пересечений
                const edgeOffsets = new Map()
                const edgeGroups = new Map()
                const spacingScale = 1.5
                
                // Функция для получения размеров узла
                const getNodeDimensions = (node) => {
                  const category = getNodeCategory(node)
                  if (node.type === 'circle') {
                    const size = category === 'client' ? 70 : 60
                    return { width: size, height: size }
                  } else if (node.type === 'diamond') {
                    const size = 80
                    return { width: size, height: size }
                  } else if (node.type === 'hexagon') {
                    const size = 70
                    return { width: size, height: size }
                  } else {
                    const width = category === 'server' ? 180 : category === 'handler' ? 160 : category === 'utility' ? 140 : 130
                    const height = category === 'server' ? 70 : category === 'handler' ? 50 : 50
                    return { width, height }
                  }
                }
                
                // Собираем все рёбра с их метаданными
                const edgesWithMeta = data.edges.map((edge, index) => {
                  const fromNodeData = data.nodes.find(n => n.id === edge.from)
                  const toNodeData = data.nodes.find(n => n.id === edge.to)
                  if (!fromNodeData || !toNodeData) return null
                  
                  // Используем актуальные позиции из состояния
                  const fromNodePos = nodesPositions.get(edge.from) || { x: fromNodeData.x, y: fromNodeData.y }
                  const toNodePos = nodesPositions.get(edge.to) || { x: toNodeData.x, y: toNodeData.y }
                  
                  const fromNode = { ...fromNodeData, x: fromNodePos.x, y: fromNodePos.y }
                  const toNode = { ...toNodeData, x: toNodePos.x, y: toNodePos.y }
                  
                  const fromDim = getNodeDimensions(fromNode)
                  const toDim = getNodeDimensions(toNode)
                  
                  const fromCenterX = fromNode.x
                  const fromCenterY = fromNode.y
                  const toCenterX = toNode.x
                  const toCenterY = toNode.y
                  
                  const dx = toCenterX - fromCenterX
                  const dy = toCenterY - fromCenterY
                  const absDx = Math.abs(dx)
                  const absDy = Math.abs(dy)
                  
                  // Определяем основное направление
                  const isHorizontal = absDx > absDy
                  
                  return {
                    edge,
                    index,
                    fromNode,
                    toNode,
                    fromDim,
                    toDim,
                    dx,
                    dy,
                    absDx,
                    absDy,
                    direction: isHorizontal ? 'horizontal' : 'vertical',
                    isHorizontal
                  }
                }).filter(Boolean)
                
                // Улучшенная группировка: группируем параллельные линии от одного узла
                // Используем пространственную группировку для лучшего распределения
                edgesWithMeta.forEach((item) => {
                  // Группируем линии, которые идут в одном направлении от одного узла
                  let groupKey
                  
                  if (item.isHorizontal) {
                    // Для горизонтальных: группируем по исходному узлу, направлению и примерной высоте
                    const direction = item.dx > 0 ? 'r' : 'l'
                    // Используем более грубую группировку по высоте для объединения близких линий
                    const yBucket = Math.round(item.fromNode.y / 100) * 100
                    groupKey = `h-${item.edge.from}-${direction}-${yBucket}`
                  } else {
                    // Для вертикальных: группируем по исходному узлу, направлению и примерной ширине
                    const direction = item.dy > 0 ? 'd' : 'u'
                    // Используем более грубую группировку по ширине для объединения близких линий
                    const xBucket = Math.round(item.fromNode.x / 100) * 100
                    groupKey = `v-${item.edge.from}-${direction}-${xBucket}`
                  }
                  
                  if (!edgeGroups.has(groupKey)) {
                    edgeGroups.set(groupKey, [])
                  }
                  edgeGroups.get(groupKey).push(item)
                })
                
                // Генерируем цвета для разных групп узлов
                const colorPalette = [
                  '#3b82f6', // синий
                  '#10b981', // зеленый
                  '#f59e0b', // оранжевый
                  '#ef4444', // красный
                  '#8b5cf6', // фиолетовый
                  '#06b6d4', // циан
                  '#ec4899', // розовый
                  '#84cc16', // лайм
                  '#6366f1', // индиго
                  '#14b8a6', // бирюзовый
                ]
                
                const nodeColorMap = new Map()
                let colorIndex = 0
                edgeGroups.forEach((group, groupKey) => {
                  const fromId = groupKey.split('-')[1]
                  if (!nodeColorMap.has(fromId)) {
                    nodeColorMap.set(fromId, colorPalette[colorIndex % colorPalette.length])
                    colorIndex++
                  }
                })
                
                // Улучшенное назначение смещений с учетом всех параллельных линий
                edgeGroups.forEach((group) => {
                  if (group.length === 0) return
                  
                  const isHorizontal = group[0].isHorizontal
                  
                  // Сортируем линии для правильного распределения
                  group.sort((a, b) => {
                    if (isHorizontal) {
                      // Для горизонтальных: сортируем по Y целевого узла, затем по X
                      const diffY = a.toNode.y - b.toNode.y
                      if (Math.abs(diffY) > 20) return diffY
                      // Если Y близки, сортируем по X для более предсказуемого порядка
                      return a.toNode.x - b.toNode.x
                    } else {
                      // Для вертикальных: сортируем по X целевого узла, затем по Y
                      const diffX = a.toNode.x - b.toNode.x
                      if (Math.abs(diffX) > 20) return diffX
                      // Если X близки, сортируем по Y для более предсказуемого порядка
                      return a.toNode.y - b.toNode.y
                    }
                  })
                  
                  // Увеличиваем расстояние между параллельными линиями для лучшей читаемости
                  // Используем адаптивное расстояние в зависимости от количества линий
                  const baseSpacing = 180
                  const minSpacing = group.length > 3 ? baseSpacing * 0.9 : baseSpacing
                  
                  group.forEach((item, groupIndex) => {
                    // Центрируем смещения вокруг нуля для симметричного распределения
                    const offset = (groupIndex - (group.length - 1) / 2) * minSpacing
                    
                    edgeOffsets.set(`${item.edge.from}-${item.edge.to}`, {
                      offset,
                      direction: item.direction,
                      dx: item.dx,
                      dy: item.dy,
                      absDx: item.absDx,
                      absDy: item.absDy,
                      isHorizontal: item.isHorizontal
                    })
                  })
                })
                
                // Разделяем edges на обычные и hovered для правильного z-index
                const normalEdges = edgesWithMeta.filter(item => {
                  const id = `${item.edge.from}-${item.edge.to}`
                  return id !== hoveredEdgeId
                })
                const hoveredEdge = edgesWithMeta.find(item => {
                  const id = `${item.edge.from}-${item.edge.to}`
                  return id === hoveredEdgeId
                })
                
                // Рендерим сначала обычные edges, потом hovered (чтобы он был поверх)
                const edgesToRender = hoveredEdge ? [...normalEdges, hoveredEdge] : normalEdges
                
                return edgesToRender.map((item) => {
                  const { edge, fromNode, toNode, fromDim, toDim } = item
                  const edgeId = `${edge.from}-${edge.to}`
                  const isHovered = edgeId === hoveredEdgeId
                  const isEdgeRel = isEdgeRelevant(edge.from, edge.to)
                  
                  // Определяем, является ли связь между клиентом и сервером
                  const isClientToServer = fromNode.id.startsWith('client-') && toNode.id.startsWith('server-')
                  const isServerToClient = fromNode.id.startsWith('server-') && toNode.id.startsWith('client-')
                  const isClientServerConnection = isClientToServer || isServerToClient
                  
                  // Получаем цвет для линии на основе исходного узла
                  const lineColor = nodeColorMap.get(edge.from) || '#888'
                  
                  // Получаем предвычисленное смещение
                  const offsetKey = `${edge.from}-${edge.to}`
                  const offsetData = edgeOffsets.get(offsetKey) || { 
                    offset: 0, 
                    direction: item.direction, 
                    dx: item.dx, 
                    dy: item.dy, 
                    absDx: item.absDx, 
                    absDy: item.absDy,
                    isHorizontal: item.isHorizontal
                  }
                  const baseOffset = offsetData.offset
                  const absDx = offsetData.absDx
                  const absDy = offsetData.absDy
                  const dx = offsetData.dx
                  const dy = offsetData.dy
                  const isHorizontal = offsetData.isHorizontal

                // В renderNode узлы позиционируются как:
                // left: (x - width/2) * spacingScale
                // top: (y - height/2) * spacingScale
                // Это абсолютные координаты левого верхнего угла узла
                
                // Вычисляем абсолютные координаты границ узлов (как в renderNode)
                const fromLeftAbs = (fromNode.x - fromDim.width / 2) * spacingScale
                const fromRightAbs = fromLeftAbs + fromDim.width
                const fromTopAbs = (fromNode.y - fromDim.height / 2) * spacingScale
                const fromBottomAbs = fromTopAbs + fromDim.height

                const toLeftAbs = (toNode.x - toDim.width / 2) * spacingScale
                const toRightAbs = toLeftAbs + toDim.width
                const toTopAbs = (toNode.y - toDim.height / 2) * spacingScale
                const toBottomAbs = toTopAbs + toDim.height

                // Центры узлов
                const fromCenterXAbs = (fromLeftAbs + fromRightAbs) / 2
                const fromCenterYAbs = (fromTopAbs + fromBottomAbs) / 2
                const toCenterXAbs = (toLeftAbs + toRightAbs) / 2
                const toCenterYAbs = (toTopAbs + toBottomAbs) / 2

                // Точки выхода/входа на границах (абсолютные координаты)
                let fromExitXAbs, fromExitYAbs, toEnterXAbs, toEnterYAbs

                if (isHorizontal) {
                  // Горизонтальное направление
                  fromExitXAbs = dx > 0 ? fromRightAbs : fromLeftAbs
                  fromExitYAbs = fromCenterYAbs
                  toEnterXAbs = dx > 0 ? toLeftAbs : toRightAbs
                  toEnterYAbs = toCenterYAbs
                } else {
                  // Вертикальное направление
                  fromExitXAbs = fromCenterXAbs
                  fromExitYAbs = dy > 0 ? fromBottomAbs : fromTopAbs
                  toEnterXAbs = toCenterXAbs
                  toEnterYAbs = dy > 0 ? toTopAbs : toBottomAbs
                }

                // SVG позиционируется в (bbox.minX * spacingScale, bbox.minY * spacingScale)
                // Координаты внутри SVG должны быть относительно позиции SVG
                // Т.е. абсолютные координаты минус смещение SVG
                const svgOffsetX = bbox.minX * spacingScale
                const svgOffsetY = bbox.minY * spacingScale

                const fromExitX = fromExitXAbs - svgOffsetX
                const fromExitY = fromExitYAbs - svgOffsetY
                const toEnterX = toEnterXAbs - svgOffsetX
                const toEnterY = toEnterYAbs - svgOffsetY

                  // Улучшенная ортогональная маршрутизация с умными изгибами
                  let finalPath, midX, midY

                  if (isHorizontal) {
                    // Горизонтальное направление: более интуитивный путь
                    const verticalOffset = baseOffset
                    const distance = Math.abs(toEnterX - fromExitX)
                    
                    // Умная точка изгиба: если расстояние большое, изгибаем раньше
                    const bendRatio = distance > 300 ? 0.3 : 0.4
                    const bendPoint = fromExitX + (dx > 0 ? distance * bendRatio : -distance * bendRatio)
                    
                    // Для параллельных линий создаем более плавный путь
                    if (Math.abs(verticalOffset) < 25) {
                      // Простой L-образный путь для близких линий
                      finalPath = `M ${fromExitX} ${fromExitY} L ${bendPoint} ${fromExitY} L ${bendPoint} ${toEnterY} L ${toEnterX} ${toEnterY}`
                      midX = bendPoint
                      midY = (fromExitY + toEnterY) / 2
                    } else {
                      // Для параллельных линий: выходим -> изгибаем -> идем параллельно -> входим
                      const parallelY = fromExitY + verticalOffset
                      const finalBendX = toEnterX
                      
                      // Плавный путь с двумя изгибами
                      finalPath = `M ${fromExitX} ${fromExitY} L ${bendPoint} ${fromExitY} L ${bendPoint} ${parallelY} L ${finalBendX} ${parallelY} L ${finalBendX} ${toEnterY}`
                      midX = bendPoint
                      midY = parallelY
                    }
                  } else {
                    // Вертикальное направление: более интуитивный путь
                    const horizontalOffset = baseOffset
                    const distance = Math.abs(toEnterY - fromExitY)
                    
                    // Умная точка изгиба
                    const bendRatio = distance > 300 ? 0.3 : 0.4
                    const bendPoint = fromExitY + (dy > 0 ? distance * bendRatio : -distance * bendRatio)
                    
                    // Для параллельных линий создаем более плавный путь
                    if (Math.abs(horizontalOffset) < 25) {
                      // Простой L-образный путь для близких линий
                      finalPath = `M ${fromExitX} ${fromExitY} L ${fromExitX} ${bendPoint} L ${toEnterX} ${bendPoint} L ${toEnterX} ${toEnterY}`
                      midX = (fromExitX + toEnterX) / 2
                      midY = bendPoint
                    } else {
                      // Для параллельных линий: выходим -> изгибаем -> идем параллельно -> входим
                      const parallelX = fromExitX + horizontalOffset
                      const finalBendY = toEnterY
                      
                      // Плавный путь с двумя изгибами
                      finalPath = `M ${fromExitX} ${fromExitY} L ${fromExitX} ${bendPoint} L ${parallelX} ${bendPoint} L ${parallelX} ${finalBendY} L ${toEnterX} ${finalBendY}`
                      midX = parallelX
                      midY = bendPoint
                    }
                  }

                  // Позиционирование метки - более умное размещение
                  const isVertical = !isHorizontal
                  let labelX, labelY
                  
                  if (isVertical) {
                    // Для вертикальных линий размещаем метку справа или слева
                    labelX = midX + (baseOffset > 0 ? 20 : -20)
                    labelY = midY
                  } else {
                    // Для горизонтальных линий размещаем метку сверху или снизу
                    labelX = midX
                    labelY = midY + (baseOffset > 0 ? -25 : 25)
                  }

                  return (
                    <g 
                      key={edgeId}
                      className="edge-group"
                      data-edge-id={edgeId}
                      style={{ 
                        cursor: 'pointer',
                        zIndex: isHovered ? 1000 : 1
                      }}
                    >
                      {/* Тень/обводка для лучшей видимости */}
                      <path
                        d={finalPath}
                        fill="none"
                        stroke={isHovered ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.1)"}
                        strokeWidth={isHovered ? "6" : "4"}
                        strokeDasharray={isClientServerConnection ? "8,4" : "none"}
                        strokeOpacity={isHovered ? "0.5" : (isEdgeRel ? "0.3" : "0.1")}
                        markerEnd="none"
                        style={{ pointerEvents: 'none' }}
                      />
                      {/* Основная линия */}
                      <path
                        d={finalPath}
                        fill="none"
                        stroke={isClientServerConnection ? lineColor : lineColor}
                        strokeWidth="2.5"
                        strokeDasharray={isClientServerConnection ? "8,4" : "none"}
                        strokeOpacity="0.9"
                        markerEnd="url(#arrowhead)"
                        markerStart="none"
                        style={{ 
                          pointerEvents: 'stroke',
                          filter: isHovered ? 'url(#glow) brightness(1.3)' : 'url(#glow)',
                          transition: 'all 0.2s ease',
                          strokeWidth: isHovered ? '4' : '2.5',
                          strokeOpacity: isHovered ? '1' : (isEdgeRel ? '0.9' : '0.15')
                        }}
                        onMouseEnter={(e) => {
                          setHoveredEdgeId(edgeId)
                        }}
                        onMouseLeave={(e) => {
                          setHoveredEdgeId(null)
                        }}
                      />
                      {edge.label && (
                        <g>
                          {/* Фон для текста с лучшей видимостью */}
                          <rect
                            x={labelX - (edge.label.length * 4 + 10)}
                            y={labelY - 12}
                            width={(edge.label.length * 8 + 20)}
                            height={24}
                            fill={lineColor}
                            fillOpacity="0.15"
                            stroke={lineColor}
                            strokeWidth="1.5"
                            strokeOpacity="0.6"
                            rx="6"
                            style={{ pointerEvents: 'none' }}
                          />
                          <rect
                            x={labelX - (edge.label.length * 4 + 10)}
                            y={labelY - 12}
                            width={(edge.label.length * 8 + 20)}
                            height={24}
                            fill="rgba(255, 255, 255, 0.95)"
                            stroke={lineColor}
                            strokeWidth="1"
                            strokeOpacity="0.4"
                            rx="6"
                            style={{ pointerEvents: 'none' }}
                          />
                          <text
                            x={labelX}
                            y={labelY}
                            fill={lineColor}
                            fontSize="11"
                            fontWeight="700"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            style={{ 
                              pointerEvents: 'none', 
                              userSelect: 'none',
                              textShadow: '0 1px 2px rgba(255, 255, 255, 0.8)'
                            }}
                          >
                            {edge.label}
                          </text>
                        </g>
                      )}
                    </g>
                  )
                })
              })()}
            </svg>
          )}
          {/* Рисуем nodes */}
          {data.nodes.map(node => {
            const isRelevant = isNodeRelevant(node.id)
            return (
              <NodeComponent
                key={node.id}
                node={node}
                spacingScale={1.5}
                transform={transform}
                nodesPositions={nodesPositions}
                setNodesPositions={setNodesPositions}
                selectedNode={selectedNode}
                handleNodeClick={handleNodeClick}
                getNodeCategory={getNodeCategory}
                isRelevant={isRelevant}
              />
            )
          })}
        </div>
      </ReactInfiniteCanvas>
      
      {/* Плашка с описанием - вне canvas для правильного позиционирования */}
      {selectedNode && (
        <div
          className="node-description-tooltip"
          style={{
            ...getTooltipStyle(),
            position: 'absolute',
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="tooltip-header">
            <span className="tooltip-title">{selectedNode.label || selectedNode.id}</span>
            <button
              className="tooltip-close"
              onClick={() => setSelectedNode(null)}
            >
              ×
            </button>
          </div>
          <div className="tooltip-content">
            {selectedNode.description ? (
              selectedNode.description
            ) : (
              <span style={{ color: '#999', fontStyle: 'italic' }}>Нет описания</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default DiagramCanvas

