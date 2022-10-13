import * as React from "react";
import { ChangeEvent, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFilePicker } from "use-file-picker";

import { ForceFileData, MarkerFileData } from "./DataTypes";
import { parseForceFileData, parseMarkerFileData } from "./Parser";
import RenderView from "./RenderView";
import ErrorPopup from "./ErrorPopup";
import { PlayIcon, PauseIcon } from "./icons";
import useStateRef from "./useStateRef";

import "./App.scss";

const MILLI_PER = 1000;


export default function App() {

	// ---------------------------------------------- Uploading & Parsing ----------------------------------------------

	/* File upload hooks */
	const [openMarkerFileSelector, {plainFiles: [markerFile], loading: markersLoading}] = useFilePicker({accept: ['.txt','.tsv','.csv']});
	const [openForceFileSelector, {plainFiles: [forceFile], loading: forcesLoading}] = useFilePicker({accept: ['.txt','.tsv','.csv','.mot']});

	/* Loaded data */
	const [markerFileData, setMarkerFileData] = useState<MarkerFileData>({markers: [], frames: []});
	const [forceFileData, setForceFileData] = useState<ForceFileData>({frames: []});

	/* Flags for clearing file name if parsing error is encountered */
	const [markerParsingError, setMarkerParsingError] = useState<boolean>(false);
	const [forceParsingError, setForceParsingError] = useState<boolean>(false);

	/* Most recent error, for displaying in error popup */
	const [error, setError] = useState<Error|null>(null);

	/* Parse provided markerFile into markerFileData */
	useEffect(() => {
		/* Only async parse call from current render should set markerFileData */
		let staleRequest = false;
		/* Call parseMarkerFileData inside anonymous wrapper function to handle returned Promise or Error */
		if (markerFile) (async () => {
			try {
				const data = await parseMarkerFileData(markerFile);
				if (!staleRequest) {
					setError(null);
					setMarkerParsingError(false);
					setMarkerFileData(data);
				}
			}
			catch (err) {
				if (!staleRequest && err instanceof Error) {
					setError(err);
					setMarkerParsingError(true);
				}
			}
		})();
		/* Clean-up function for cases where new render is triggered while this is still processing */
		return () => {staleRequest = true};
	}, [markerFile]);

	/* Parse provided forceFile into forceFileData */
	useEffect(() => {
		/* Only async parse call from current render should set forceFileData */
		let staleRequest = false;
		/* Call parseForceFileData inside anonymous wrapper function to handle returned Promise or Error */
		if (forceFile) (async () => {
			try {
				const data = await parseForceFileData(forceFile);
				if (!staleRequest) {
					setError(null);
					setForceParsingError(false);
					setForceFileData(data);
				}
			}
			catch (err) {
				if (!staleRequest && err instanceof Error) {
					setError(err);
					setForceParsingError(true);
				}
			}
		})();
		/* Clean-up function if new render is triggered while this is still processing */
		return () => {staleRequest = true};
	}, [forceFile]);

	// --------------------------------------- Animation & Animation Control Data --------------------------------------

	/* Start, current, and end frames from data */
	const frameStart = 0;
	const [frame, setFrame] = useState(0);
	const [frameEnd, setEnd] = useState(0);

	/* User-selected start and end frames (for cropping) */
	const [frameCropStart, setCropStart] = useState(0);
	const [frameCropEnd, setCropEnd] = useState(0);

	/* Current frame reference for use in dependency arrays where we don't want to trigger on every frame change */
	const frameRef = useStateRef(frame);

	/* Flags for playback */
	const [playing, setPlaying] = useState(false);
	const [loopPlayback, setLoopPlayback] = useState(true);

	const interFrameTimeRef = useRef(0);
	const lastTimeRef = useRef<DOMHighResTimeStamp|null>(null);

	const animationRef = useRef<number>();

	const timeStep = useMemo(() => {
		if (markerFileData.frames.length<2) return null;
		return markerFileData.frames[1].time * MILLI_PER;
	}, [markerFileData]);

	const animationLoop = useCallback((currentTime: DOMHighResTimeStamp) => { //called at rate of user's display's refresh rate
		if (!timeStep) return;
		/* When paused, pretend no time has elapsed */
		const elapsedTime = (lastTimeRef.current!==null) ? currentTime-lastTimeRef.current : 0;
		/* When playing, before next repaint, increment frame by the correct amount for the elapsed time since last paint */
		for (interFrameTimeRef.current += elapsedTime; interFrameTimeRef.current > timeStep; interFrameTimeRef.current -= timeStep) {
			setFrame(current => {
				if (current+1<=frameCropEnd) return current+1;
				else if (loopPlayback) return frameCropStart;
				else {setPlaying(false); return current;}
			});
		}
		/* Store time for getting elapsed time in next loop */
		lastTimeRef.current = currentTime;
		/* Loop forever */
		animationRef.current = requestAnimationFrame(animationLoop);
	}, [loopPlayback, timeStep, frameCropStart, frameCropEnd]);

	/* Start animation loop on play */
	useEffect(() => {
		if (playing) animationRef.current = requestAnimationFrame(animationLoop); //enter animation loop
		else lastTimeRef.current = null; //clear time on pause so animation won't skip ahead on next play
		return () => cancelAnimationFrame(animationRef.current!);
	}, [animationLoop, playing]);

	// const animLoop = useCallback(async () => {
	// 	if (!timeStep) return;
	// 	if (!playing) lastTimeRef.current = null;
	// 	const currentTime = performance.now();
	// 	const elapsedTime = (lastTimeRef.current!==null) ? currentTime-lastTimeRef.current : 0;
	// 	/* When playing, before next repaint, increment frame by the correct amount for the elapsed time since last paint */
	// 	for (interFrameTimeRef.current += elapsedTime; interFrameTimeRef.current > timeStep; interFrameTimeRef.current -= timeStep) {
	// 		setFrame(current => {
	// 			if (current+1<=frameCropEnd) return current+1;
	// 			else if (loopPlayback) return frameCropStart;
	// 			else {setPlaying(false); return current;}
	// 		});
	// 	}
	// 	/* Store time for getting elapsed time in next loop */
	// 	lastTimeRef.current = currentTime;
	// 	/* Loop forever at given frame rate */
	// 	await new Promise(res => setTimeout(() => {animLoop(); return res;}, 1000/60));
	// 	// return () => cancelAnimationFrame(animationRef.current!);
	// }, [playing, loopPlayback, timeStep, frameCropStart, frameCropEnd]);

	// useEffect(() => {
	// 	if (playing) animLoop();
	// }, [frame, playing, animLoop]);

	/* Set end frame from newly-parsed data for animation controls */
	useEffect(() => {
		const end = markerFileData.frames.length-2;
		if (end > 0) {
			setEnd(end);
			setCropEnd(end);
		}
	}, [markerFileData]);

	// ---------------------------------------------------- Metadata ---------------------------------------------------

	const [selectedMarkers, setSelectedMarkers] = useState<number[]>([]);

	// ---------------------------------------------------- Controls ---------------------------------------------------

	/* Play button (on click) */
	const togglePlaying = useCallback(() => setPlaying(current => {
		/* Handle start from pause on last frame, if encountered */
		if (frameRef.current>=frameCropEnd) setFrame(frameCropStart);
		/* Invert current playing status */
		return !current;
	}), [frameRef, frameCropStart, frameCropEnd]);

	/* Play button loop checkbox (on change) */
	const toggleLooping = useCallback(({target: {checked}}: ChangeEvent<HTMLInputElement>) => setLoopPlayback(checked), []);

	/* Timeline track thumb (on change) */
	const timelineTrackSeek = useCallback(({target: {value}}: ChangeEvent<HTMLInputElement>) => {
		const thumbVal = parseInt(value);
		if (frameCropStart<=thumbVal && thumbVal<=frameCropEnd) setFrame(thumbVal);
		else if (thumbVal<frameCropStart && frameRef.current-1>=frameCropStart) setFrame(frameRef.current-1);
		else if (thumbVal>frameCropEnd && frameRef.current+1<=frameCropEnd) setFrame(frameRef.current+1);
	}, [frameRef, frameCropStart, frameCropEnd]);

	/* Timeline track (on context menu) */
	const timelineTrackResetCrop = useCallback((e: MouseEvent<HTMLInputElement>) => {
		e.preventDefault();
		if (e.button==2) {
			setCropStart(frameStart);
			setCropEnd(frameEnd);
		}
	}, [frameEnd]);

	/* Timeline text start frame cell (on change) */
	const timelineTextCropStart = useCallback(({target: {value}}: ChangeEvent<HTMLInputElement>) => {
		const inputVal = parseInt(value);
		if (frameStart<=inputVal && inputVal<frameCropEnd) {
			setCropStart(inputVal);
			if (inputVal>frameRef.current)
				setFrame(inputVal);
		}
	}, [frameRef, frameStart, frameCropEnd]);

	/* Timeline text current frame cell (on change) */
	const timelineTextCurrentFrameSeek = useCallback(({target: {value}}: ChangeEvent<HTMLInputElement>) => {
		const inputVal = parseInt(value);
		if (frameCropStart<=inputVal && inputVal<=frameCropEnd)
			setFrame(inputVal);
	}, [frameCropStart, frameCropEnd]);

	/* Timeline text end frame cell (on change) */
	const timelineTextCropEnd = useCallback(({target: {value}}: ChangeEvent<HTMLInputElement>) => {
		const inputVal = parseInt(value);
		if (frameCropStart<inputVal && inputVal<=frameEnd) {
			setCropEnd(inputVal);
			if (inputVal<frameRef.current)
				setFrame(inputVal);
		}
	}, [frameRef, frameCropStart, frameEnd]);

	// ---------------------------------------------------- App JSX ----------------------------------------------------

	/* Elements/components in the grid are organized top->bottom, left->right */
	return <>
		<div id={"app-grid"} style={(markersLoading||forcesLoading) ? {cursor: "progress"} : {cursor: "default"}}>
			{/* ---------------------------------------------- Grid Row 1 ---------------------------------------------- */}
			<div id={"file-area-flex"}>
				<div id={"marker-file-div"}>
					<input id={"marker-file-button"} className={"file-upload-button"} type={"button"} value={"Choose Marker Data File"} onClick={openMarkerFileSelector} />
					<span id={"marker-file-name"} className={"file-chosen-name"}>{markerFile && !markerParsingError ? markerFile.name : "No file chosen"}</span>
				</div>
				<div id={"force-file-div"}>
					<input id={"force-file-button"} className={"file-upload-button"} type={"button"} value={"Choose Force Plate Data File"} onClick={openForceFileSelector} />
					<span id={"force-file-name"} className={"file-chosen-name"}>{forceFile && !forceParsingError ? forceFile.name : "No file chosen"}</span>
				</div>
			</div>
			<div id={"logo"}>Movilo</div>
			<div id={"output-area-title"}>Selection Info</div>
			{/* ---------------------------------------------- Grid Row 2 ---------------------------------------------- */}
			<div id={"viz-area"}>
				<RenderView frame={frame} markerData={markerFileData} forceData={forceFileData}
					selectedMarkers={selectedMarkers} updateSelectedMarkers={setSelectedMarkers}
				/>
			</div>
			<div id={"popup-area"}><ErrorPopup error={error} /></div>
			<div id={"output-area"}>
				{`Label: LASIS
				x: 0.07062
				y: -1.31965
				z: 0.92865
	
				Label: LKJC
				x: 0.10328
				y: -1.47403
				z: 0.48009
	
				Label: LAJC
				x: 0.12071
				y: -1.59442
				z: 0.12018
	
				LKJC Angle: 178.6°
				`}
			</div>
			{/* ---------------------------------------------- Grid Row 3 ---------------------------------------------- */}
			<div id={"timeline-track-area"}>
				<div id="timeline-track-flex">
					<button id={"play-button"} onClick={togglePlaying}>{playing ? <PauseIcon /> : <PlayIcon />}</button>
					<input id={"timeline-track"} type={"range"}
						value={frame} min={frameStart} max={frameEnd}
						onChange={timelineTrackSeek}
						onContextMenu={timelineTrackResetCrop}
					/>
				</div>
			</div>
			<div id={"timeline-manual-area"}>
				<table>
					<tr>
						<td><span className={"timeline-cell label"}>Frame</span></td>
						{/* Start frame */}
						<td><input className={"timeline-cell"} type={"number"}
							value={frameCropStart} min={frameStart} max={frameCropEnd-1}
							onChange={timelineTextCropStart}
						/></td>
						{/* Current frame */}
						<td><input className={"timeline-cell"} type={"number"}
							value={frame} min={frameCropStart} max={frameCropEnd}
							onChange={timelineTextCurrentFrameSeek}
						/></td>
						{/* End frame */}
						<td><input className={"timeline-cell"} type={"number"}
							value={frameCropEnd} min={frameCropStart+1} max={frameEnd}
							onChange={timelineTextCropEnd}
						/></td>
					</tr>
					<tr>
						<td><span className={"timeline-cell label"}>Time</span></td>
						{/* Start time */}
						<td><input className={"timeline-cell"} type={"number"} disabled
							value={frameEnd>0 ? markerFileData.frames[frameCropStart].time : 0}
						/></td>
						{/* Current time */}
						<td><input className={"timeline-cell"} type={"number"} disabled
							value={frameEnd>0 ? markerFileData.frames[frame].time : 0}
						/></td>
						{/* End time */}
						<td><input className={"timeline-cell"} type={"number"} disabled
							value={frameEnd>0 ? markerFileData.frames[frameCropEnd].time : 0}
						/></td>
					</tr>
					<tr>
						<td><span className={"timeline-cell label"}></span></td>
						<td><span className={"timeline-cell label"}>Start</span></td>
						<td><span className={"timeline-cell label"}>Current</span></td>
						<td><span className={"timeline-cell label"}>End</span></td>
					</tr>
				</table>
			</div>
			{/* ---------------------------------------------- Grid Row 4 ---------------------------------------------- */}
			<div id={"timeline-track-under-area"}>
				<label id={"play-button-loop-checkbox-label"}>Loop:
					<input id={"play-button-loop-checkbox"} type={"checkbox"}
						checked={loopPlayback}
						onChange={toggleLooping}
					/>
				</label>
			</div>
		</div>
		{/* --------------------------------------------- Beneath App grid --------------------------------------------- */}
		<div id={"sdp-logo-area"}>
			<div id={"sdp-flex"}>
				{/* eslint-disable-next-line @typescript-eslint/no-var-requires */}
				<img id={"sdp-logo"} src={require('../assets/images/sdp-logo-3.png').default} alt="senior design project logo" />
				<div id={"sdp-info"}>
					{`This website was created for a Boise State University
					Computer Science Senior Design Project by
					
					Colin Reeder
					Connor Jackson
					Cory Tomlinson
					Javier Trejo
					William Kenny
					
					For information about sponsoring a project, go to
					`}
					<a href={"https://www.boisestate.edu/coen-cs/community/cs481-senior-design-project/"}>
						https://www.boisestate.edu/coen-cs/community/cs481-senior-design-project/
					</a>
				</div>
			</div>
		</div>
	</>;
}
