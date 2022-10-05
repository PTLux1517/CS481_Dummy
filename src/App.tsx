import * as React from "react";
import { useEffect, useState } from "react";
import { useFilePicker } from 'use-file-picker';

import { ForceFileData, MarkerFileData } from "./DataTypes";
import { parseForceFileData, parseMarkerFileData } from "./Parser";
import RenderView from "./RenderView";

import "./App.scss";


export default function App() {

	/* Flags for clearing file name if parsing error is encountered */
	const [markerParsingError, setMarkerParsingError] = useState<boolean>(false);
	const [forceParsingError, setForceParsingError] = useState<boolean>(false);

	/* Load and parse provided marker file into markerFileData */
	const [openMarkerFileSelector, {plainFiles: [markerFile], loading: markersLoading}] = useFilePicker({accept: ['.txt','.tsv','.csv']});
	const [markerFileData, setMarkerFileData] = useState<MarkerFileData>({markers: [], frames: []});
	useEffect(() => {
		let staleRequest = false; //only async parse call from current render should set markerFileData
		if (markerFile) startAsyncMarkerParse();
		return () => {staleRequest = true;}; //clean-up function if new render is triggered while this is still processing
		async function startAsyncMarkerParse() {
			let data: MarkerFileData = {markers: [], frames: []}; //empty data to clear viz area for invalid files
			try {
				data = await parseMarkerFileData(markerFile);
				setMarkerParsingError(false);
			}
			catch (err) {
				alert(err); //all parseMarkerFileData errors are neatly formatted for alerts
				setMarkerParsingError(true);
			}
			if (staleRequest) return; //ignore stale data if newer render is triggered and clean-up function was called
			else setMarkerFileData(data);
		}
	}, [markerFile]);

	/* Load and parse provided force plate file into forceFileData */
	const [openForceFileSelector, {plainFiles: [forceFile], loading: forcesLoading}] = useFilePicker({accept: ['.txt','.tsv','.csv','.mot']});
	const [forceFileData, setForceFileData] = useState<ForceFileData>({frames: []});
	useEffect(() => {
		let staleRequest = false; //only async parse call from current render should set forceFileData
		if (forceFile) startAsyncForceParse();
		return () => {staleRequest = true;}; //clean-up function if new render is triggered while this is still processing
		async function startAsyncForceParse() {
			let data: ForceFileData = {frames: []}; //empty data to clear viz area for invalid files
			try {
				data = await parseForceFileData(forceFile);
				setForceParsingError(false);
			}
			catch (err) {
				alert(err); //all parseForceFileData errors are neatly formatted for alerts
				setForceParsingError(true);
			}
			if (staleRequest) return; //ignore stale data if newer render is triggered and clean-up function was called
			else setForceFileData(data);
		}
	}, [forceFile]);

	const advanceFrame = (increment: number) => setFrame((frame+increment)%494);

	const [frame,setFrame] = useState(0);

	/* Elements/components in the grid are organized top->bottom, left->right */
	return <div id={"app-grid"} style={(markersLoading||forcesLoading) ? {cursor: "progress"} : {cursor: "default"}}>
		{/* ---------------------------------------------- Grid Row 1 ---------------------------------------------- */}
		<div id={"file-area-flex"}>
			<div id={"marker-file-div"}>
				<input id={"marker-file-button"} className={"file-upload-button"} type={"button"} value={"Choose Marker Data File"} onClick={()=>openMarkerFileSelector()} />
				<span id={"marker-file-name"} className={"file-chosen-name"}>{markerFile && !markerParsingError ? markerFile.name : "No file chosen"}</span>
			</div>
			<div id={"force-file-div"}>
				<input id={"force-file-button"} className={"file-upload-button"} type={"button"} value={"Choose Force Plate Data File"} onClick={()=>openForceFileSelector()} />
				<span id={"force-file-name"} className={"file-chosen-name"}>{forceFile && !forceParsingError ? forceFile.name : "No file chosen"}</span>
			</div>
		</div>
		<div id={"logo"}>Movilo</div>
		<div id={"output-area-title"}>Selection Info</div>
		{/* ---------------------------------------------- Grid Row 2 ---------------------------------------------- */}
		<div id={"viz-area"}><RenderView frame={frame} data={markerFileData} /></div>
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

			LKJC Angle: 178.6°`}
		</div>
		{/* ---------------------------------------------- Grid Row 3 ---------------------------------------------- */}
		<div id={"timeline-track-area"}>
			<input id={"play-button"} type={"button"} onClick={()=>advanceFrame(15)} />
			<input id={"timeline-track"} type={"range"} min={"0"} max={"494"} value={"0"} />
		</div>
		<div id={"timeline-manual-area"}>
			<table>
				<tr>
					<td><span className={"timeline-cell label"}>Frame</span></td>
					<td><input className={"timeline-cell"} type={"text"} value={"0"} /></td>
					<td><input className={"timeline-cell"} type={"text"} value={"0"} /></td>
					<td><input className={"timeline-cell"} type={"text"} value={"494"} /></td>
				</tr>
				<tr>
					<td><span className={"timeline-cell label"}>Time</span></td>
					<td><input className={"timeline-cell"} type={"text"} value={"0.0"} disabled /></td>
					<td><input className={"timeline-cell"} type={"text"} value={"0.0"} disabled /></td>
					<td><input className={"timeline-cell"} type={"text"} value={"2.05417"} disabled /></td>
				</tr>
				<tr>
					<td><span className={"timeline-cell label"}></span></td>
					<td><span className={"timeline-cell label"}>Start</span></td>
					<td><span className={"timeline-cell label"}>Current</span></td>
					<td><span className={"timeline-cell label"}>End</span></td>
				</tr>
			</table>
		</div>
	</div>;
}


// const gridData: MarkerFileData = {
// 	markers: [
// 		{label:"000"},
// 		{label:"001"},
// 		{label:"002"},
// 		{label:"100"},
// 		{label:"101"},
// 		{label:"102"},
// 		{label:"200"},
// 		{label:"201"},
// 		{label:"202"},
// 	],
// 	frames: [{
// 		time: 0,
// 		positions: [
// 			{x:0,z:0,y:0},
// 			{x:0,z:0,y:1},
// 			{x:0,z:0,y:2},
// 			{x:1,z:0,y:0},
// 			{x:1,z:0,y:1},
// 			{x:1,z:0,y:2},
// 			{x:2,z:0,y:0},
// 			{x:2,z:0,y:1},
// 			{x:2,z:0,y:2},
// 		]
// 	}]
// }

// const tmpData: MarkerFileData = {
// 	markers: [
// 		{label: "LACR"},
// 		{label: "LASIS"},
// 		{label: "LBHD"},
// 		{label: "LDSK"},
// 		{label: "LFHD"},
// 		{label: "LFRM"},
// 		{label: "LGTR"},
// 		{label: "LHAND"},
// 		{label: "LHEEL"},
// 		{label: "LLEB"},
// 		{label: "LLEP"},
// 		{label: "LLMAL"},
// 		{label: "LLSK"},
// 		{label: "LLWRT"},
// 		{label: "LMEB"},
// 		{label: "LMEP"},
// 		{label: "LMET5"},
// 		{label: "LMMAL"},
// 		{label: "LMWRT"},
// 		{label: "LPSIS"},
// 		{label: "LPSK"},
// 		{label: "LSHO"},
// 		{label: "LTHI"},
// 		{label: "LTOE"},
// 		{label: "RACR"},
// 		{label: "RASIS"},
// 		{label: "RBHD"},
// 		{label: "RDSK"},
// 		{label: "RFHD"},
// 		{label: "RFRM"},
// 		{label: "RGTR"},
// 		{label: "RHAND"},
// 		{label: "RHEEL"},
// 		{label: "RLEB"},
// 		{label: "RLEP"},
// 		{label: "RLMAL"},
// 		{label: "RLSK"},
// 		{label: "RLWRT"},
// 		{label: "RMEB"},
// 		{label: "RMEP"},
// 		{label: "RMET5"},
// 		{label: "RMMAL"},
// 		{label: "RMWRT"},
// 		{label: "RPSIS"},
// 		{label: "RPSK"},
// 		{label: "RSHO"},
// 		{label: "RTHI"},
// 		{label: "RTOE"},
// 		{label: "MID_ASIS"},
// 		{label: "MID_PSIS"},
// 		{label: "MID_PELVIS"},
// 		{label: "MID_HJC"},
// 		{label: "F_LHIP"},
// 		{label: "F_RHIP"},
// 		{label: "LKJC"},
// 		{label: "RKJC"},
// 		{label: "LAJC"},
// 		{label: "RAJC"},
// 		{label: "LILCR"},
// 		{label: "RILCR"}
// 	],
// 	frames: [{
// 		time: 0,
// 		positions: [
// 			{x:0.04353,y:-1.36928,z:1.35853}, //LACR
// 			{x:0.07062,y:-1.31965,z:0.92865}, //LASIS
// 			{x:0.11218,y:-1.39712,z:1.46634}, //LBHD
// 			{x:0.11939,y:-1.53618,z:0.15535}, //LDSK
// 			{x:0.15364,y:-1.23728,z:1.52652}, //LFHD
// 			{x:-0.10165,y:-1.33665,z:0.98007}, //LFRM
// 			{x:0.00654,y:-1.41742,z:0.86365}, //LGTR
// 			{x:-0.09351,y:-1.1928,z:0.87744}, //LHAND
// 			{x:0.1197,y:-1.66992,z:0.08193}, //LHEEL
// 			{x:-0.08973,y:-1.37968,z:1.06905}, //LLEB
// 			{x:0.03623,y:-1.45927,z:0.47253}, //LLEP
// 			{x:0.0802,y:-1.59887,z:0.11966}, //LLMAL
// 			null, //LLSK
// 			{x:-0.05328,y:-1.21449,z:0.90552}, //LLWRT
// 			{x:-0.02519,y:-1.40287,z:1.02347}, //LMEB
// 			{x:0.17038,y:-1.48873,z:0.48763}, //LMEP
// 			{x:0.05576,y:-1.48871,z:0.06339}, //LMET5
// 			{x:0.16121,y:-1.58996,z:0.12075}, //LMMAL
// 			{x:-0.10082,y:-1.25611,z:0.87592}, //LMWRT
// 			{x:0.12387,y:-1.51729,z:0.97625}, //LPSIS
// 			{x:0.10275,y:-1.45189,z:0.39685}, //LPSK
// 			{x:0.00984,y:-1.3699,z:1.33941}, //LSHO
// 			{x:0.10283,y:-1.38769,z:0.52008}, //LTHI
// 			{x:0.13967,y:-1.46387,z:0.07161}, //LTOE
// 			{x:0.31772,y:-1.39449,z:1.35375}, //RACR
// 			{x:0.29669,y:-1.33687,z:0.93532}, //RASIS
// 			{x:0.24782,y:-1.40287,z:1.46882}, //RBHD
// 			{x:0.26767,y:-1.15861,z:0.18464}, //RDSK
// 			{x:0.25179,y:-1.25599,z:1.51819}, //RFHD
// 			{x:0.39862,y:-1.5503,z:1.02816}, //RFRM
// 			{x:0.35192,y:-1.41916,z:0.88948}, //RGTR
// 			{x:0.37097,y:-1.5462,z:0.81724}, //RHAND
// 			{x:0.26037,y:-1.25957,z:0.09143}, //RHAND
// 			{x:0.39871,y:-1.52195,z:1.08245}, //RLEB
// 			{x:0.30985,y:-1.22572,z:0.53689}, //RLEP
// 			{x:0.30526,y:-1.20265,z:0.1366}, //RLMAL
// 			{x:0.33554,y:-1.24457,z:0.44998}, //RLSK
// 			{x:0.33743,y:-1.51679,z:0.8648}, //RLWRT
// 			{x:0.31224,y:-1.5443,z:1.07604}, //RMEB
// 			{x:0.18511,y:-1.25068,z:0.5181}, //RMEP
// 			{x:0.32224,y:-1.08309,z:0.10656}, //RMET5
// 			{x:0.22541,y:-1.19056,z:0.14281}, //RMMAL
// 			{x:0.36672,y:-1.58104,z:0.86785}, //RMWRT
// 			{x:0.2276,y:-1.52105,z:0.97346}, //RPSIS
// 			{x:0.25508,y:-1.18851,z:0.45855}, //RPSK
// 			{x:0.34511,y:-1.39145,z:1.33606}, //RSHO
// 			{x:0.24608,y:-1.19763,z:0.58725}, //RTHI
// 			{x:0.24079,y:-1.07483,z:0.11637}, //RTOE
// 			{x:0.18364,y:-1.32828,z:0.932}, //MID_ASIS
// 			{x:0.17574,y:-1.51919,z:0.97486}, //MID_PSIS
// 			{x:0.17969,y:-1.42373,z:0.95343}, //MID_PELVIS
// 			{x:0.18231,y:-1.41888,z:0.87897}, //MID_HJC
// 			{x:0.08159,y:-1.41098,z:0.86891}, //F_LHIP
// 			{x:0.28303,y:-1.42678,z:0.88902}, //F_RHIP
// 			{x:0.10328,y:-1.47403,z:0.48009}, //LKJC
// 			{x:0.24749,y:-1.23828,z:0.52749}, //RKJC
// 			{x:0.12071,y:-1.59442,z:0.12018}, //LAJC
// 			{x:0.26532,y:-1.19635,z:0.13973}, //RAJC
// 			{x:0.02931,y:-1.39297,z:0.99902}, //LILCR
// 			{x:0.32123,y:-1.3977,z:0.99837} //RILCR
// 		]
// 	}]
// };

