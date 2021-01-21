import * as React from 'react'
import {render} from 'react-dom'
import Peer from 'peerjs'

const {useEffect, useRef, useState} = React

const entry = document.getElementById('main')

const randID = () => Math.random().toString(36).substr(2, 10)

const App = () => {
	const idInit = randID()
	const id = useRef(idInit)
	const peer = useRef(new Peer(idInit))
	const [stream, setStream] = useState(null)

	const video = useRef(null)
	const them = useRef(null)
	const idIn = useRef(null)

	function call() {
		const dial = peer.current.call(idIn.current.value, stream)
		dial.on('stream', (remote) => {
			them.current.srcObject = remote
			them.current.play()
		})
	}

	useEffect(() => {
		if (!stream) {
			navigator.mediaDevices.getUserMedia({video: true}).then((s) => setStream(s))
		} else {
			video.current.srcObject = stream
			video.current.play()
			peer.current.on('call', (dial) => {
				dial.answer(stream) // Answer the call with an A/V stream.
				dial.on('stream', (remote) => {
					them.current.srcObject = remote
					them.current.play()
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
				<video ref={video} />
			</div>
			<div>
				<video ref={them} />
			</div>
		</main>
	)
}

render(<App />, entry)
