import React, { useState, useEffect } from 'react'
import DiagramCanvas from './components/DiagramCanvas'
import './App.css'

function App() {
  const [diagramData, setDiagramData] = useState(null)
  const [selectedFile, setSelectedFile] = useState('example-data.json')
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [question, setQuestion] = useState('')
  const [relevantElements, setRelevantElements] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState('')

  // Предустановленные запросы для быстрого доступа
  const presetQueries = [
    { value: '', label: '-- Выберите запрос --' },
    { value: 'клиент сервер связь', label: '🔗 Связь клиент ↔ сервер (WebSocket)' },
    { value: 'клиент бэкенд взаимодействие', label: '🔄 Взаимодействие клиент ↔ бэкенд' },
    { value: 'WebSocket сообщения', label: '📨 WebSocket сообщения (OFFER, ANSWER, ICE)' },
    { value: 'дефолт созвон', label: '📞 Дефолт созвон (инициация звонка)' },
    { value: 'ICE кандидаты', label: '🔗 ICE кандидаты (сетевые соединения)' },
    { value: 'обработка ошибок', label: '⚠️ Обработка ошибок' },
    { value: 'медиа потоки', label: '🎥 Медиа потоки (камера, микрофон)' },
    { value: 'переподключение', label: '🔄 Переподключение WebSocket' },
    { value: 'принятие звонка', label: '✅ Принятие входящего звонка' },
    { value: 'отклонение звонка', label: '❌ Отклонение звонка' },
    { value: 'heartbeat ping', label: '💓 Heartbeat и PING' },
    { value: 'WebRTC соединение', label: '🌐 WebRTC соединение' },
    { value: 'мониторинг сети', label: '📊 Мониторинг сети и диагностика' },
    { value: 'обновление медиа', label: '🎬 Обновление медиа (камера/микрофон)' },
    { value: 'пересогласование', label: '🔄 Пересогласование (negotiation)' },
    { value: 'удаленные потоки', label: '📡 Удаленные потоки (remoteStreamsId)' },
    { value: 'завершение звонка', label: '🔚 Завершение звонка' },
    { value: 'создание offer', label: '📤 Создание и отправка OFFER' },
    { value: 'создание answer', label: '📥 Создание и отправка ANSWER' },
    { value: 'обновление offer', label: '🔄 Обновление OFFER (UPDATE_OFFER)' },
    { value: 'обновление answer', label: '🔄 Обновление ANSWER (UPDATE_ANSWER)' },
    { value: 'обновление ICE', label: '🔗 Обновление ICE (updateIce)' },
    { value: 'проверка устройств', label: '🔍 Проверка медиа устройств' },
    { value: 'активный звонок', label: '📞 Активный звонок (обмен медиа)' },
    { value: 'архитектура системы', label: '🏗️ Архитектура системы (общая схема)' },
    { value: 'поток данных', label: '🌊 Поток данных между компонентами' },
  ]

  const availableFiles = [
    { value: 'example-data.json', label: 'Server (example-data.json)' },
    { value: 'client-data.json', label: 'Client (client-data.json)' },
    { value: 'full-system-data.json', label: 'Full System (full-system-data.json)' },
  ]

  const loadJsonFile = (filename) => {
    fetch(`/${filename}`)
      .then(response => response.json())
      .then(data => {
        setDiagramData(data)
        setSelectedFile(filename)
      })
      .catch(error => {
        console.error(`Ошибка загрузки ${filename}:`, error)
        alert(`Ошибка загрузки файла ${filename}`)
      })
  }

  useEffect(() => {
    // Загружаем данные по умолчанию только при первой загрузке
    if (!diagramData) {
      loadJsonFile(selectedFile)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLoadJson = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result)
          setDiagramData(data)
          setSelectedFile('custom')
        } catch (error) {
          console.error('Ошибка парсинга JSON:', error)
          alert('Ошибка загрузки JSON файла')
        }
      }
      reader.readAsText(file)
    }
  }

  const handleFileSelect = (event) => {
    const filename = event.target.value
    if (filename && filename !== 'custom') {
      loadJsonFile(filename)
      setRelevantElements(null) // Сбрасываем результаты при смене файла
    }
  }

  // Локальный поиск без API
  const performLocalSearch = (query) => {
    if (!query || !diagramData) {
      alert('Пожалуйста, введите вопрос')
      return
    }

    setIsLoading(true)
    setRelevantElements(null)

    // Локальный поиск по ключевым словам с улучшенной логикой
    const queryLower = query.toLowerCase()
    const relevantNodes = new Set()
    const relevantEdges = new Set()
    
    // Ключевые слова для поиска связей
    const connectionKeywords = ['клиент', 'сервер', 'бэкенд', 'backend', 'websocket', 'связь', 'взаимодействие', 'сообщения', 'поток данных', 'архитектура']
    const isConnectionQuery = connectionKeywords.some(keyword => queryLower.includes(keyword))
    
    // Ищем узлы по ключевым словам
    diagramData.nodes.forEach(node => {
      const searchText = `${node.label || ''} ${node.description || ''} ${node.id || ''} ${node.category || ''}`.toLowerCase()
      const queryWords = queryLower.split(' ').filter(word => word.length > 2)
      
      if (queryWords.some(word => searchText.includes(word))) {
        relevantNodes.add(node.id)
      }
      
      // Для запросов о связях находим клиенты и серверы
      if (isConnectionQuery) {
        if (node.id.includes('client') || node.id.includes('server') || 
            node.label?.toLowerCase().includes('client') || node.label?.toLowerCase().includes('server') ||
            node.label?.toLowerCase().includes('websocket') || node.description?.toLowerCase().includes('websocket')) {
          relevantNodes.add(node.id)
        }
      }
    })
    
    // Ищем связи напрямую по меткам
    diagramData.edges.forEach(edge => {
      const edgeLabel = (edge.label || '').toLowerCase()
      const queryWords = queryLower.split(' ').filter(word => word.length > 2)
      
      if (queryWords.some(word => edgeLabel.includes(word))) {
        relevantEdges.add(`${edge.from}-${edge.to}`)
        // Добавляем связанные узлы
        relevantNodes.add(edge.from)
        relevantNodes.add(edge.to)
      }
    })
    
    // Для запросов о связях находим все связи между клиентами и серверами
    if (isConnectionQuery) {
      diagramData.edges.forEach(edge => {
        const fromNode = diagramData.nodes.find(n => n.id === edge.from)
        const toNode = diagramData.nodes.find(n => n.id === edge.to)
        
        const fromIsClient = fromNode?.id.includes('client') || fromNode?.label?.toLowerCase().includes('client')
        const toIsServer = toNode?.id.includes('server') || toNode?.label?.toLowerCase().includes('server') || 
                          toNode?.label?.toLowerCase().includes('websocket')
        const fromIsServer = fromNode?.id.includes('server') || fromNode?.label?.toLowerCase().includes('server') ||
                            fromNode?.label?.toLowerCase().includes('websocket')
        const toIsClient = toNode?.id.includes('client') || toNode?.label?.toLowerCase().includes('client')
        
        if ((fromIsClient && toIsServer) || (fromIsServer && toIsClient) ||
            edge.label?.toLowerCase().includes('websocket') || 
            edge.label?.toLowerCase().includes('message') ||
            edge.label?.toLowerCase().includes('ping')) {
          relevantEdges.add(`${edge.from}-${edge.to}`)
          relevantNodes.add(edge.from)
          relevantNodes.add(edge.to)
        }
      })
    }
    
    // Находим все связи, связанные с найденными узлами (расширяем контекст)
    const nodeArray = Array.from(relevantNodes)
    diagramData.edges.forEach(edge => {
      if (nodeArray.includes(edge.from) || nodeArray.includes(edge.to)) {
        relevantEdges.add(`${edge.from}-${edge.to}`)
        relevantNodes.add(edge.from)
        relevantNodes.add(edge.to)
      }
    })
    
    setIsLoading(false)
    
    const nodesArray = Array.from(relevantNodes)
    const edgesArray = Array.from(relevantEdges)
    
    if (nodesArray.length > 0 || edgesArray.length > 0) {
      setRelevantElements({
        nodes: nodesArray,
        edges: edgesArray
      })
    } else {
      alert('Локальный поиск не нашел релевантных элементов. Попробуйте другие ключевые слова.')
    }
  }

  const askGPT = async () => {
    if (!openaiApiKey || !question || !diagramData) {
      alert('Пожалуйста, введите API ключ и вопрос')
      return
    }

    setIsLoading(true)
    setRelevantElements(null)

    try {
      // Формируем описание диаграммы для отправки в GPT
      const diagramDescription = {
        nodes: diagramData.nodes.map(node => ({
          id: node.id,
          label: node.label,
          description: node.description || '',
          type: node.type,
          category: node.category || ''
        })),
        edges: diagramData.edges.map(edge => ({
          from: edge.from,
          to: edge.to,
          label: edge.label || ''
        }))
      }

      // Вызываем OpenAI GPT API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Ты анализируешь диаграмму системы. Тебе будет предоставлена структура диаграммы с узлами (nodes) и связями (edges). 
              Каждый узел имеет: id, label, description, type, category.
              Каждая связь имеет: from, to, label.
              
              Когда тебе задают вопрос о диаграмме, ты должен вернуть JSON массив с id релевантных узлов и связей в формате:
              {
                "nodes": ["node_id1", "node_id2", ...],
                "edges": ["from-to", "from-to", ...]
              }
              
              Верни ТОЛЬКО JSON, без дополнительного текста.`
            },
            {
              role: 'user',
              content: `Диаграмма системы:\n${JSON.stringify(diagramDescription, null, 2)}\n\nВопрос: ${question}\n\nВерни JSON с релевантными элементами.`
            }
          ],
          temperature: 0.3
        })
      })

      if (!response.ok) {
        let errorMessage = `Ошибка API: ${response.status} ${response.statusText}`
        
        // Пытаемся получить детали ошибки из ответа
        let errorData = null
        try {
          errorData = await response.json()
          if (errorData.error) {
            const error = errorData.error
            
            // Специальные сообщения для разных ошибок
            if (error.code === 'insufficient_quota' || error.type === 'insufficient_quota') {
              errorMessage = 'Недостаточно квоты: Превышен лимит использования OpenAI API. Проверьте баланс и план на https://platform.openai.com/account/billing'
            } else if (response.status === 401 || error.code === 'invalid_api_key') {
              errorMessage = 'Ошибка авторизации: Неверный API ключ. Проверьте правильность ключа OpenAI.'
            } else if (response.status === 402) {
              errorMessage = 'Ошибка оплаты: Недостаточно средств на счету OpenAI или требуется подписка. Проверьте баланс на https://platform.openai.com'
            } else if (response.status === 429 || error.code === 'rate_limit_exceeded') {
              errorMessage = 'Превышен лимит запросов. Подождите немного и попробуйте снова.'
            } else if (response.status === 500) {
              errorMessage = 'Внутренняя ошибка сервера OpenAI. Попробуйте позже.'
            } else if (error.message) {
              errorMessage = `Ошибка: ${error.message}`
            }
          }
        } catch (e) {
          // Игнорируем ошибку парсинга, используем стандартное сообщение
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      const content = data.choices[0].message.content.trim()
      
      // Парсим JSON из ответа (может быть обернут в markdown код блоки)
      let jsonContent = content
      
      // Убираем markdown код блоки если есть
      if (content.includes('```')) {
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
        if (codeBlockMatch) {
          jsonContent = codeBlockMatch[1].trim()
        } else {
          jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        }
      }
      
      // Пытаемся найти JSON объект в тексте
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonContent = jsonMatch[0]
      }
      
      try {
        const relevant = JSON.parse(jsonContent)
        // Валидируем структуру
        if (relevant && (relevant.nodes || relevant.edges)) {
          setRelevantElements({
            nodes: relevant.nodes || [],
            edges: relevant.edges || []
          })
        } else {
          throw new Error('Неверный формат ответа от API')
        }
      } catch (parseError) {
        console.error('Ошибка парсинга JSON:', parseError)
        console.error('Содержимое ответа:', jsonContent)
        alert('Ошибка парсинга ответа от OpenAI. Проверьте консоль для деталей.')
      }
    } catch (error) {
      console.error('Ошибка при запросе к OpenAI:', error)
      
      // Автоматически используем локальный поиск при ошибках API
      console.log('Переключаемся на локальный поиск...')
      
      // Показываем уведомление с деталями
      const errorDetails = error.message
      const isQuotaError = errorDetails.includes('квот') || errorDetails.includes('quota') || errorDetails.includes('insufficient')
      
      if (isQuotaError) {
        alert(
          `❌ Превышен лимит OpenAI API\n\n` +
          `Возможные причины:\n` +
          `• Закончились бесплатные кредиты ($5 при регистрации)\n` +
          `• Превышен месячный лимит\n` +
          `• Не настроен способ оплаты\n\n` +
          `Проверьте баланс: https://platform.openai.com/account/billing\n\n` +
          `✅ Автоматически используется локальный поиск (работает без API)`
        )
      }
      
      // Всегда используем локальный поиск как fallback
      performLocalSearch(question)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app">
      <div className="toolbar">
        <select
          value={selectedFile}
          onChange={handleFileSelect}
          className="file-select"
        >
          {availableFiles.map(file => (
            <option key={file.value} value={file.value}>
              {file.label}
            </option>
          ))}
          <option value="custom">Загрузить свой JSON...</option>
        </select>
        <input
          type="file"
          accept=".json"
          onChange={handleLoadJson}
          className="file-input"
          id="file-input"
          style={{ display: 'none' }}
        />
        <label htmlFor="file-input" className="file-input-label">
          Выбрать файл
        </label>
        <div className="legend">
          <div className="legend-item">
            <div className="legend-circle"></div>
            <span>Состояния, события, сущности</span>
          </div>
          <div className="legend-item">
            <div className="legend-rectangle"></div>
            <span>Функции, модули, обработчики</span>
          </div>
          <div className="legend-item">
            <div className="legend-diamond"></div>
            <span>Условия, решения</span>
          </div>
          <div className="legend-item">
            <div className="legend-hexagon"></div>
            <span>Процессы</span>
          </div>
          <div className="legend-item">
            <div className="legend-line-dashed"></div>
            <span>Клиент ↔ Сервер</span>
          </div>
          <div className="legend-item">
            <div className="legend-line-solid"></div>
            <span>Внутренние связи</span>
          </div>
        </div>
      </div>
      {diagramData && (
        <DiagramCanvas 
          data={diagramData} 
          relevantElements={relevantElements}
        />
      )}
      
      {/* OpenAI GPT AI панель */}
      <div className="deepseek-panel">
        <div className="deepseek-header">
          <h3>🤖 OpenAI GPT</h3>
          <button 
            className="deepseek-close"
            onClick={() => {
              setRelevantElements(null)
              setQuestion('')
            }}
          >
            ×
          </button>
        </div>
        <div className="deepseek-content">
          <input
            type="password"
            placeholder="OpenAI API Key"
            value={openaiApiKey}
            onChange={(e) => setOpenaiApiKey(e.target.value)}
            className="deepseek-input"
          />
          <select
            value={selectedPreset}
            onChange={(e) => {
              const preset = e.target.value
              setSelectedPreset(preset)
              if (preset) {
                setQuestion(preset)
              }
            }}
            className="deepseek-input"
            style={{ cursor: 'pointer' }}
          >
            {presetQueries.map(preset => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Или введите свой вопрос..."
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value)
              if (e.target.value !== selectedPreset) {
                setSelectedPreset('')
              }
            }}
            onKeyPress={(e) => e.key === 'Enter' && (openaiApiKey ? askGPT() : performLocalSearch(question))}
            className="deepseek-input"
            disabled={isLoading}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={askGPT}
              disabled={isLoading || !openaiApiKey || !question}
              className="deepseek-button"
              style={{ flex: 1 }}
            >
              {isLoading ? 'Анализирую...' : 'Спросить GPT'}
            </button>
            <button
              onClick={() => performLocalSearch(question)}
              disabled={isLoading || !question}
              className="deepseek-button"
              style={{ 
                flex: 1,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              }}
              title="Локальный поиск без API (работает всегда)"
            >
              {isLoading ? 'Ищу...' : 'Локальный поиск'}
            </button>
          </div>
          {relevantElements && (
            <div className="deepseek-results">
              <p>Найдено релевантных элементов:</p>
              <p>Узлов: {relevantElements.nodes?.length || 0}</p>
              <p>Связей: {relevantElements.edges?.length || 0}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App

