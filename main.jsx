import * as React from 'react'
import {render} from 'react-dom'
import Peer from 'peerjs'

// awful snowpack hack
const {useEffect, useRef, useState} = React

const entry = document.getElementById('main')

const randID = () => Math.random().toString(36).substr(2, 10)

function copyID(ev) {
	const rng = document.createRange()
	rng.selectNode(ev.target)
	window.getSelection().removeAllRanges()
	window.getSelection().addRange(rng)
	document.execCommand('copy')
	window.getSelection().removeAllRanges()
}

// largely broken
function useSpeech() {
	const [result, setResult] = useState('')
	const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
	const rec = new SpeechRecognition()
	rec.continuous = true

	rec.lang = 'en-US'
	rec.interimResults = true
	// bind the result handler for parsing the results

	// add a handler for results

	// hack to make sure it's continuous in firefox??
	rec.addEventListener('end', () => rec.start())
	rec.start()

	rec.addEventListener("result", ev => {
		setResult(res => [...res, ev])
	})
	return result
}

function useChat(peer) {
	const [messages, setMessages] = useState([])
	peer.on('connection', (conn) => {
		conn.on('open', () => conn.on('data', (data) => {
			const msg = JSON.parse(data)
			if (msg.type !== 'chat') return
			setMessages(msgs => {
				const tail = msgs[msgs.length - 1]
				if (tail && tail.id === `t-${msg.id}`) return msgs
				return [...msgs, {id: `t-${msg.id}`, from: 'them', text: msg.text}]
			})
		}))
	})
	return {messages, setMessages}
}


const App = () => {
	const idInit = randID()
	const id = useRef(idInit)
	const peer = useRef(new Peer(idInit))

	const [stream, setStream] = useState(null)
	const [muted, setMuted] = useState(false)
	const [partner, setPartner] = useState(null)
	const [showChat, setChat] = useState(false)
	const [sharing, setSharing] = useState(false)

	const them = useRef(null)
	const idIn = useRef(null)
	const video = useRef(null)
	const theirScreen = useRef(null)

	const {messages, setMessages} = useChat(peer.current)

	const toggleChat = () => setChat(cur => !cur)


	function sendMessage(ev) {
		if (ev.key !== 'Enter') return
		const id = randID()
		// @todo: cleanup
		partner.send(JSON.stringify({id, type: 'chat', text: ev.target.value.trim()}))
		setMessages(msgs => [...msgs, {id: `m-${id}`, from: 'me', text: ev.target.value.trim()}])
		setTimeout(() => ev.target.value = '', 10)
	}


	async function share() {
		const opts = {video: {cursor: 'always'}, audio: false}
		const capture = await navigator.mediaDevices.getDisplayMedia(opts)
		peer.current.call(idIn.current.value, capture)
	}

	function call() {
		const dial = peer.current.call(idIn.current.value, stream)
		dial.on('stream', (remote) => {
			them.current.srcObject = remote
			them.current.play()
			const conn = peer.current.connect(idIn.current.value)
			conn.on('open', () => setPartner(conn))
		})
	}

	const tryCall = ({key}) => key === "Enter" && call()


	async function mute() {
		setMuted((state) => {
			// set enabled to what we're inverting to
			stream.getAudioTracks().forEach((track) => track.enabled = state)
			return !state
		})
	}

	useEffect(() => {
		if (!stream) {
			navigator.mediaDevices
				.getUserMedia({audio: true, video: true})
				.then((s) => setStream(s))
		} else {
			video.current.srcObject = stream
			video.current.play()
			peer.current.on('call', (dial) => {
				idIn.current.value = dial.peer
				dial.answer(stream)
				dial.on('stream', (remote) => {
					// make sure we're not already streaming
					// prevents us playing the webcam doubly in the screen share box
					if (!them.current.paused && them.current.dataset.id === remote.id) return

					// if 'them' (cam) is paused, play their cam there
					if (them.current.paused) {
						them.current.dataset.id = remote.id
						them.current.srcObject = remote
						them.current.play()

					// else, we've called, so we must want to share screens
					} else {
						theirScreen.current.srcObject = remote
						theirScreen.current.play()
						setSharing(true)
					}

					const conn = peer.current.connect(dial.peer)
					conn.on('open', () => setPartner(conn))
				})
			})
		}
	}, [stream])

	return (
		<main className="p-8">
			<div>
				<p className="h-12">
					<span className="text-sm border-2 border-r-0 rounded-l px-4 py-2 bg-gray-300 whitespace-no-wrap">Your ID:</span>
					<span
						className="bg-white cursor-pointer border-2 rounded-r px-4 py-2 w-full" 
						onClick={copyID}
					>
							{id.current}
					</span>
				</p>
				<div className="flex">
					<span className="text-sm border-2 border-r-0 rounded-l px-4 py-2 bg-gray-300 whitespace-no-wrap">Partner ID:</span>
					<input 
						ref={idIn}
						onKeyUp={tryCall} 
						name="field_name" 
						className="border-2 rounded-r px-4 py-2" 
						type="text" 
						placeholder="Enter your partner's ID" 
					/>
				</div>
			</div>
			


			<div className="grid grid-cols-10 grid-rows-2 gap-8 my-4">
				<section className={`${showChat ? 'col-span-4' : 'col-span-5'} bg-white shadow`}>
						<video muted ref={video} className="us" />
					<div className="flex sm:flex-nowrap flex-wrap justify-center md:justify-between py-2 px-4">
							<button type="button" onClick={mute}>Mute (muted: {muted.toString()})</button>
							<button type="button" onClick={share}>Share screen</button>
							<button type="button" onClick={toggleChat}>{showChat ? 'hide' : 'show'} chat</button>
						</div>

					</section>

					<section className={`${showChat ? 'col-span-4' : 'col-span-5'} bg-white shadow`}>
						<h2 className="text-center py-2">Your Partner</h2>
						<video ref={them} />
					</section>

					<section className={`${showChat || 'hidden'} col-span-2 ${sharing && 'row-span-2'} flex flex-col justify-between shadow bg-white`}>
						<h2 className="py-2 text-center">Chat</h2>
						<div className="flex-1 break-words px-2">
							{messages.map(message => (
								<div className={`message ${message.from}`}>
									<div key={message.id}>
										<p>{message.text}</p>
									</div>
								</div>
							))}
						</div>
						<div class="flex border-t-2">
							<span class="text-sm px-4 py-2 bg-gray-300 whitespace-no-wrap">Chat:</span>
							<input 
								onKeyUp={sendMessage} 
								name="field_name" 
								class="px-4 py-2 w-full" 
								type="text" 
								placeholder="Send a message..." 
							/>
						</div>
					</section>

				<section className={`${showChat ? 'col-span-8' : 'col-span-10'}`}>
						<video ref={theirScreen} />
					</section>
			</div>

		</main>
	)
}

render(<App />, entry)
