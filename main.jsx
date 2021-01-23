import * as React from 'react'
import {render} from 'react-dom'
import Peer from 'peerjs'

// awful snowpack hack
const {useEffect, useRef, useState} = React

const entry = document.getElementById('main')

const randID = () => Math.random().toString(36).substr(2, 10)

// notes for when i do live chat
//	peer.current.on('connection', (dataconn) => {
//		dataconn.on('open', () => {
//			dataconn.on('data', (data) => {
//				if (data === INCOMING && !awaitingShare) {
//					setAwaiting(true)
//				}
//			})
//		})
//	})
//	conn.send(INCOMING)
//})


function useChat(peer) {
	const [messages, setMessages] = useState([])
	peer.on('connection', (conn) => {
		conn.on('open', () => conn.on('data', (data) => {
			const msg = JSON.parse(data)
			if (msg.type !== 'chat') return
			setMessages(msgs => {
				const tail = msgs[msgs.length - 1]
				if (tail && tail.id === msg.id) return msgs
				return [...msgs, {id: msg.id, from: 'them', text: msg.text}]
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

	const them = useRef(null)
	const idIn = useRef(null)
	const video = useRef(null)
	const theirScreen = useRef(null)

	const {messages, setMessages} = useChat(peer.current)

	useEffect(() => {
		console.log({partner})
		//if (!partner) return
	}, [partner])

	function sendMessage(ev) {
		if (ev.key !== 'Enter') return
		console.log('sending')
		console.log(ev.target.value)
		partner.send(JSON.stringify({id: randID(), type: 'chat', text: ev.target.value.trim()}))
		setMessages(msgs => [...msgs, {from: 'me', text: ev.target.value}])
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
					// this prevents us playing the webcam doubly in the screen share box
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
					}

					const conn = peer.current.connect(dial.peer)
					conn.on('open', () => setPartner(conn))
				})
			})
		}
	}, [stream])

	return (
		<main>
			<div>
				<h1>Shitty video client</h1>
				<p><strong>Your ID:</strong> {id.current}</p>
				<label>
					Enter partner ID
					<input type="text" ref={idIn} />
				</label>
				<button type="button" onClick={call}>Call</button>
			</div>
			<div>
				<button type="button" onClick={mute}>Mute (muted: {muted.toString()})</button>
			</div>
			<div>
				<button type="button" onClick={share}>Share screen</button>
			</div>

			<div>
				<h2>Us</h2>
				<input onKeyUp={sendMessage} />
				<video muted ref={video} />
			</div>
			<div>
				<h2>Them</h2>
				<video ref={them} />
				<span>
					{messages.map(message => {
						return (
							<div>
								<p>From: {message.from}</p>
								<p>Message: {message.text}</p>
							</div>
						)
					})}
				</span>
			</div>
			<div>
				<video ref={theirScreen} />
			</div>
		</main>
	)
}

render(<App />, entry)
