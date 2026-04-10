import React, { useRef } from 'react'

const ChatForm = ({ chatHistory, setChatHistory, generateBotResponse }) => {
  const inputRef = useRef()

  const handleFormSubmit = (e) => {
    e.preventDefault()

    const userMessage = inputRef.current.value.trim()
    if (!userMessage) return

    inputRef.current.value = ''

    const nextHistory = [...chatHistory, { role: 'user', text: userMessage }]
    setChatHistory([...nextHistory, { role: 'model', text: 'Thinking...' }])
    generateBotResponse(nextHistory)
  }
  return (
    <form action='#' className='chat-form' onSubmit={handleFormSubmit}>
      <input
        ref={inputRef}
        type='text'
        placeholder='Message...'
        className='message-input'
        required
      />
      <button className='material-symbols-rounded'>arrow_upward</button>
    </form>
  )
}

export default ChatForm