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
//const conn = peer.current.connect(idIn.current.value)
//conn.on('open', () => {
//	conn.send(INCOMING)
//})


const App = () => {
	const idInit = randID()
	const id = useRef(idInit)
	const peer = useRef(new Peer(idInit))
	const [stream, setStream] = useState(null)
	const [muted, setMuted] = useState(false)

	const them = useRef(null)
	const idIn = useRef(null)
	const video = useRef(null)
	const theirScreen = useRef(null)



	async function share() {
		console.log('oi', idIn.current.value)
		const opts = {video: {cursor: 'always'}, audio: false}
		const capture = await navigator.mediaDevices.getDisplayMedia(opts)
		peer.current.call(idIn.current.value, capture)
	}

	function call() {
		const dial = peer.current.call(idIn.current.value, stream)
		dial.on('stream', (remote) => {
			try {
				them.current.srcObject = remote
				them.current.play()
			} catch (err) {
				console.warn('unable to begin playing')
			}
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
			navigator.mediaDevices.getUserMedia({audio: true, video: true}).then((s) => setStream(s))
		} else {
			video.current.srcObject = stream
			video.current.play()
			peer.current.on('call', (dial) => {
				dial.answer(stream)
				dial.on('stream', (remote) => {
					console.log(remote, dial)
					if (them.current.paused) {
						them.current.srcObject = remote
						them.current.play()
					} else {
						theirScreen.current.srcObject = remote
						theirScreen.current.play()
					}
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
				<video muted ref={video} />
			</div>
			<div>
				<video ref={them} />
			</div>
			<div>
				<video ref={theirScreen} />
			</div>
		</main>
	)
}

render(<App />, entry)
