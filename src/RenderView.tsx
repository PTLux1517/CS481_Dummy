import * as THREE from "three";
import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MarkerFileData } from "./DataTypes";

import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";

/* Axis reference */     /* THREE's relation to trial subject */
//THREE X == COBR -X     (+left/-right)
//THREE Y == COBR Z      (+up/-down)
//THREE Z == COBR Y      (+front/-back)

const THREExAxis = new THREE.Vector3(1,0,0);
const THREEyAxis = new THREE.Vector3(0,1,0);
const THREEzAxis = new THREE.Vector3(0,0,1);

const renderWidth = 800;
const renderHeight = 450;

interface Props {
	data: MarkerFileData;
	frame: number;
}


export default function RenderView(props: Props) {

	const root = useRef<HTMLDivElement|null>(null);

	const renderer = useMemo(() => {
		const rend = new THREE.WebGLRenderer({antialias: true});
		rend.setSize(renderWidth,renderHeight);
		return rend;
	}, []);

	const scene = useMemo(() => new THREE.Scene(), []);

	const camera = useMemo(() => {
		const cam = new THREE.PerspectiveCamera(70,renderWidth/renderHeight);
		cam.position.x = -2.0;
		cam.position.y = 1.5;
		cam.position.z = 0.0;
		cam.rotateOnWorldAxis(THREExAxis, -Math.PI/8);
		cam.rotateOnWorldAxis(THREEyAxis, -Math.PI/2);
		cam.rotateOnWorldAxis(THREEzAxis, 0.0);
		return cam;
	}, []);

	const animationLoop = useCallback(() => renderer.render(scene,camera), [renderer,scene,camera]);

	const cameraControls = useMemo(() => new PointerLockControls(camera,renderer.domElement), [camera,renderer]);

	const [camPosX,setCamPosX] = useState(camera.position.x);
	const [camPosY,setCamPosY] = useState(camera.position.y);
	const [camPosZ,setCamPosZ] = useState(camera.position.z);

	const [camRotX,setCamRotX] = useState(camera.rotation.x);
	const [camRotY,setCamRotY] = useState(camera.rotation.y);
	const [camRotZ,setCamRotZ] = useState(camera.rotation.z);

	const groundGrid = useMemo(() => {
		const totalWidthMeters = 30;
		const cellsAcross = 30;
		const centerLineColor = 0x220044; //dark purple
		const gridLineColor = 0x222222; //dark gray
		return new THREE.GridHelper(totalWidthMeters,cellsAcross,centerLineColor,gridLineColor);
	}, []);

	const axisHelper = useMemo(() => {
		const sizeMeters = 0.1;
		const helper = new THREE.AxesHelper(sizeMeters);
		const COBRxAxisColor = new THREE.Color('red');
		const COBRyAxisColor = new THREE.Color('green');
		const COBRzAxisColor = new THREE.Color('blue');
		helper.setColors(COBRxAxisColor,COBRzAxisColor,COBRyAxisColor); //swaps standard THREE y and z colors to emulate COBR coordinate system
		helper.scale.x *= -1; //invert x-axis to match COBR coordinate system
		return helper;
	}, []);

	/* Get a memoized array of un-positioned 3D meshes mapped from the array of marker labels */
	const markerMeshes = useMemo(() => {
		return props.data.markers.map(() => {
			const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.01,16,16),new THREE.MeshBasicMaterial());
			mesh.material.transparent = true;
			mesh.material.opacity = 0.0;
			return mesh;
		});
	}, [props.data.markers]); //only remap if marker labels array changes

	/* Position 3D meshes for the given frame (in props) */
	useEffect(() => {
		const frameData = props.data.frames[props.frame]; //select a single frame
		markerMeshes.forEach((mesh,idx) => { //for each un-positioned 3D mesh
			const pos = frameData.positions[idx]; //find the position of the matching marker (Point3D)
			if (!pos||isNaN(pos.x)||isNaN(pos.y)||isNaN(pos.z)) {
				mesh.material.opacity = 0.0; //hide markers with invalid data
				return;
			}
			/* Set position of 3D mesh to marker's position in this frame */
			mesh.position.x = -pos.x; //COBR x-axis is inverted with respect to THREE's
			mesh.position.y = pos.z; //COBR z-axis is THREE's y-axis (up direction)
			mesh.position.z = pos.y; //COBR y-axis is THREE's z-axis (forward direction)
			mesh.material.opacity = 1.0; //show markers with valid data
		});
	}, [markerMeshes,props.data,props.frame]); //recalculate positions if meshes, MarkerFileData, or frame num changes

	/* Use camera controls */
	useEffect(() => {
		const moveMeters = 0.05;
		/* Only allow flight while mouse is in visualization area */
		const mouseEnterVizAreaHandler = () => document.addEventListener('keydown', keyPressHandler, false);
		const mouseLeaveVizAreaHandler = () => document.removeEventListener('keydown', keyPressHandler, false);
		/* Flight controls (keys) */
		const keyPressHandler = (e: KeyboardEvent) => {
			switch (e.code) {
				/* Fly left */
				case "KeyA": //for right-handed mouse use
				case "Digit4": //for left-handed mouse use
				case "Numpad4":
				case "Left": //IE/Edge specific value
				case "ArrowLeft": cameraControls.moveRight(-moveMeters); break; //ambi/intuitive control
				/* Fly right */
				case "KeyD": //for right-handed mouse use
				case "Digit6": //for left-handed mouse use
				case "Numpad6":
				case "Right": //IE/Edge specific value
				case "ArrowRight": cameraControls.moveRight(moveMeters); break; //ambi/intuitive control
				/* Fly forward */
				case "KeyW": //for right-handed mouse use
				case "Digit8": //for left-handed mouse use
				case "Numpad8":
				case "Up": //IE/Edge specific value
				case "ArrowUp": cameraControls.moveForward(moveMeters); break; //ambi/intuitive control
				/* Fly backward */
				case "KeyS": //for right-handed mouse use
				case "Digit5": //for left-handed mouse use
				case "Numpad5":
				case "Down": //IE/Edge specific value
				case "ArrowDown": cameraControls.moveForward(-moveMeters); break; //ambi/intuitive control
				/* Fly down */
				case "KeyQ": //for right-handed mouse use
				case "Digit7": //for left-handed mouse use
				case "Numpad7":
				case "PageDown": camera.position.y -= moveMeters; break; //ambi/intuitive control
				/* Fly up */
				case "KeyE": //for right-handed mouse use
				case "Digit9": //for left-handed mouse use
				case "Numpad9":
				case "PageUp": camera.position.y += moveMeters; break; //ambi/intuitive control
			}
			setCamPosX(camera.position.x);
			setCamPosY(camera.position.y);
			setCamPosZ(camera.position.z);
		};
		/* Flight controls (mouse) */
		const mouseWheelHandler = (e: WheelEvent) => {
			const scaleFactor = 4;
			if (e.deltaY > 0)
				cameraControls.moveForward(-moveMeters * scaleFactor);
			else
				cameraControls.moveForward(moveMeters * scaleFactor);
			setCamPosX(camera.position.x);
			setCamPosY(camera.position.y);
			setCamPosZ(camera.position.z);
		};
		/* Look controls */
		const mouseDownHandler = (e: MouseEvent) => {if (e.button===1) cameraControls.lock();}; //capture mouse movement (to rotate view) while holding middle click
		const mouseUpHandler = (e: MouseEvent) => { //release mouse after middle click is over
			if (e.button===1) {
				cameraControls.unlock();
				setCamRotX(camera.rotation.x);
				setCamRotY(camera.rotation.y);
				setCamRotZ(camera.rotation.z);
			}
		};
		/* Add listeners */
		renderer.domElement.addEventListener('mouseenter', mouseEnterVizAreaHandler, false);
		renderer.domElement.addEventListener('mouseleave', mouseLeaveVizAreaHandler, false);
		renderer.domElement.addEventListener('wheel', mouseWheelHandler, false);
		renderer.domElement.addEventListener('mousedown', mouseDownHandler, false);
		renderer.domElement.addEventListener('mouseup', mouseUpHandler, false);
		/* Clean up old listeners if re-rendering */
		return () => {
			document.removeEventListener('keydown', keyPressHandler, false);
			renderer.domElement.removeEventListener('mouseenter', mouseEnterVizAreaHandler, false);
			renderer.domElement.removeEventListener('mouseleave', mouseLeaveVizAreaHandler, false);
			renderer.domElement.removeEventListener('wheel', mouseWheelHandler, false);
			renderer.domElement.removeEventListener('mousedown', mouseDownHandler, false);
			renderer.domElement.removeEventListener('mouseup', mouseUpHandler, false);
		};
	}, [cameraControls,camera,renderer]);

	/* Position axis helper relative to current camera position/rotation */
	useEffect(() => {
		const camDirVec = new THREE.Vector3();
		const camDirPerpVec = THREEyAxis.clone(); //will be reassigned by cross product of yAxis and camDirVec
		const dist = 1.1;
		camera.getWorldDirection(camDirVec);
		camDirPerpVec.cross(camDirVec).normalize(); //gets axis perpendicular to camera's current direction
		camDirVec.applyAxisAngle(camDirPerpVec,0.5); //put axis helper to the bottom of current camera view
		camDirVec.multiplyScalar(dist);
		camDirVec.add(camera.position);
		camDirVec.add(camDirPerpVec); //put axis helper to the left of current camera view
		axisHelper.position.set(camDirVec.x, camDirVec.y, camDirVec.z);
	}, [camPosX,camPosY,camPosZ,camRotX,camRotY,camRotZ,camera,axisHelper]);

	/* Add meshes to scene */
	useEffect(() => {
		markerMeshes.forEach(mesh => scene.add(mesh));
		return () => markerMeshes.forEach(mesh => scene.remove(mesh)); //function for clearing the scene
	}, [scene,markerMeshes]); //when the scene or array of meshes changes

	/* Add ground grid to scene */
	useEffect(() => {
		scene.add(groundGrid);
		return () => {scene.remove(groundGrid);}; //function for clearing the scene
	}, [scene,groundGrid]); //when the scene or grid changes

	/* Add axis helper to scene */
	useEffect(() => {
		scene.add(axisHelper);
		return () => {scene.remove(axisHelper);}; //function for clearing the scene
	}, [scene,axisHelper]); //when the scene or axisHelper changes

	/* Pass the current rendering function to the renderer and add the rendering to the DOM element we will return */
	useEffect(() => {
		renderer.setAnimationLoop(animationLoop);
		root.current!.appendChild(renderer.domElement);
	}, [renderer,animationLoop]);

	/* Free GPU resources when renderer is no longer needed */
	useEffect(() => () => renderer.dispose(), [renderer]);

	return <div ref={root} />;
}
