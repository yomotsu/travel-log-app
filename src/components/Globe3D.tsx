"use client";
import { Fragment, useState, useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { useTexture, CameraControls } from "@react-three/drei";
import {
	Vector3,
	Quaternion,
	Matrix4,
	MeshBasicMaterial,
	BufferGeometry,
	Float32BufferAttribute,
	type Object3D,
	type MeshPhysicalMaterial,
} from "three";
import { MeshLine, MeshLineMaterial } from "three.meshline";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { LatLng } from "../types/trip";

type Position = [ number, number, number ];

// 東京の球面座標
const TOKYO_LAT_LNG: LatLng = [ 35.6895, 139.6917 ];

function wait( ms: number ) {

	return new Promise( ( resolve ) => setTimeout( resolve, ms ) );

}

// 球体 ↔ 平面アニメーション用メッシュ
function EarthMorph( { progress }: { progress: number } ) {

	// 頂点生成（緯度経度グリッド）
	const segments = 64;
	const vertices: number[] = [];

	for ( let i = 0; i <= segments; i ++ ) {

		const lat = 90 - (180 * i) / segments;
		const yFlat = (i / segments) - 0.5; // Y: -0.5～0.5（下→上）

		for ( let j = 0; j <= segments; j ++ ) {
			const lng = -180 + ( 360 * j ) / segments;
			const xFlat = ( j / segments ) * 2 - 1; // X: -1～1
			// 球面座標
			const [ sx, sy, sz ] = latLngToSphereCoords( lat, lng, 1 );
			// 平面座標（均一分布）
			const mx = xFlat;
			const my = yFlat;
			const mz = 0;
			// 補間
			const x = sx * progress + mx * ( 1 - progress );
			const y = sy * progress + my * ( 1 - progress );
			const z = sz * progress + mz * ( 1 - progress );
			vertices.push( x, y, z );
		}
	}

	// インデックス生成
	const indices: number[] = [];
	for ( let i = 0; i < segments; i ++ ) {
		for ( let j = 0; j < segments; j ++ ) {
			const a = i * ( segments + 1 ) + j;
			const b = a + 1;
			const c = a + ( segments + 1 );
			const d = c + 1;
			indices.push( a, b, c );
			indices.push( b, d, c );
		}
	}

	// UV生成
	const uvs: number[] = [];
	for ( let i = 0; i <= segments; i ++ ) {
		for ( let j = 0; j <= segments; j ++ ) {
			uvs.push( j / segments, i / segments );
		}
	}
	// 地球テクスチャ
	const [ colorMap ] = useTexture( [ '/earth_color.jpg' ] );

	// BufferGeometry生成
	const geometry = new BufferGeometry();
	geometry.setAttribute( 'position', new Float32BufferAttribute( vertices, 3 ) );
	geometry.setAttribute( 'uv', new Float32BufferAttribute( uvs, 2 ) );
	geometry.setIndex( indices );
	geometry.computeVertexNormals();

	return (
		<mesh geometry={ geometry }>
			<meshBasicMaterial map={ colorMap } />
		</mesh>
	);
}

// カメラ位置用: 緯度経度をthree.js標準の球面座標系（Y軸上、Z軸奥、上下反転なし）に変換
// 緯度・経度・半径からthree.jsのSpherical座標（xyz座標）を返す
function getSphericalPositionFromLatLng(lat: number, lng: number, radius = 1): Position {
	const phi = (90 - lat) * (Math.PI / 180);
	const theta = -lng * (Math.PI / 180);
	const x = radius * Math.sin(phi) * Math.cos(theta);
	const y = radius * Math.cos(phi); // Y軸反転なし
	const z = radius * Math.sin(phi) * Math.sin(theta);
	return [x, y, z];
}

// 球面上の最短円弧（大円弧）を分割して座標配列を返す
// 緯度経度で受け取り、緯度経度リストを返す大円弧関数
function getGreatCircleLatLngs(
	start: LatLng,
	end: LatLng,
	segments?: number
): LatLng[] {
	// 球面座標に変換
	const radius = 1;
	const startVec = new Vector3(...latLngToSphereCoords(start[0], start[1], radius)).normalize();
	const endVec = new Vector3(...latLngToSphereCoords(end[0], end[1], radius)).normalize();
	const angle = startVec.angleTo(endVec);
	// segments: 指定がなければ従来通り
	const segCount = segments !== undefined ? segments : Math.max(10, Math.ceil(angle * 50));
	const result: [number, number][] = [];
	for (let i = 0; i <= segCount; i++) {
		const t = i / segCount;
		// 球面線形補間 (slerp)
		const axis = new Vector3().crossVectors(startVec, endVec).normalize();
		const quaternion = new Quaternion().setFromAxisAngle(axis, angle * t);
		const pt = startVec.clone().applyQuaternion(quaternion).normalize().multiplyScalar(radius);
		// 球面座標→緯度経度に逆変換
		const r = pt.length();
		const lat = 90 - (Math.acos(-pt.y / r) * 180 / Math.PI);
		const lng = -(Math.atan2(pt.z, pt.x) * 180 / Math.PI);
		result.push([lat, lng]);
	}
	return result;
}

// 緯度・経度を球面座標に変換
function latLngToSphereCoords(lat: number, lng: number, radius = 1): Position {
	const phi = (90 - lat) * (Math.PI / 180);
	const theta = -lng * (Math.PI / 180);
	const x = radius * Math.sin(phi) * Math.cos(theta);
	const y = -radius * Math.cos(phi); // Y軸反転で上下修正
	const z = radius * Math.sin(phi) * Math.sin(theta);
	return [x, y, z];
}

// 緯度経度→equirectangular座標変換（2D地図用）
function latLngToEquirectangular(lat: number, lng: number, radius = 1): Position {
	const topIsNorth = false;
	const u = (lng + 180) / 360;
	const v = topIsNorth ? (90 - lat) / 180 : (lat + 90) / 180;
	const x = u * 2 - 1;
	const y = v - 0.5;
	return [x * radius, y * radius, 0];
}

// 軌道描画コンポーネント
// 球体用: 大円弧
// 線の長さを計算するユーティリティ

function FlightArc({ from, to }: { from: LatLng; to: LatLng }) {
	// from, to: [lat, lng]
	const fixY = ([x, y, z]: Position): Position => [x, -y, z];
	// 分割数を固定
	const ARC_SEGMENTS = 128;
	// 大円弧の分割点（固定数で計算）
	const arcLatLngs = useMemo(() => getGreatCircleLatLngs(from, to, ARC_SEGMENTS), [from, to]);
	// 頂点数を固定し、arcLatLngsから座標を生成
	const pointsArr: Position[] = useMemo(() => {
		// 球面座標配列
		const spherePoints = arcLatLngs.map(([lat, lng]) => latLngToSphereCoords(lat, lng, 1));
		// 累積距離配列
		const accumDist: number[] = [0];
		for (let i = 1; i < spherePoints.length; i++) {
			const prev = spherePoints[i - 1];
			const curr = spherePoints[i];
			const dx = curr[0] - prev[0];
			const dy = curr[1] - prev[1];
			const dz = curr[2] - prev[2];
			accumDist.push(accumDist[i - 1] + Math.sqrt(dx * dx + dy * dy + dz * dz));
		}
		// 高度イージング: 最初/最後の0.1ユニットのみ
		const arr: Position[] = [];
		const totalDist = accumDist[accumDist.length - 1];
		for (let i = 0; i < arcLatLngs.length; i++) {
			let radius = 1.02;
			if (accumDist[i] < 0.1) {
				// 序盤: 0～0.02にイーズ
				const t = accumDist[i] / 0.1;
				radius = 1 + .02 * t;
			} else if (totalDist - accumDist[i] < 0.1) {
				// 終盤: 0.02～0.01にイーズ
				const t = (totalDist - accumDist[i]) / 0.1;
				radius = 1 + .02 * t;
			}
			arr.push(fixY(latLngToSphereCoords(arcLatLngs[i][0], arcLatLngs[i][1], radius)));
		}
		return arr;
	}, [arcLatLngs]);
	const points = useMemo(() => pointsArr.flat(), [pointsArr]);

	// MeshLine/MeshLineMaterialをrefで管理
	const meshLineOuter = useRef<MeshLine | null>(null);
	const materialOuter = useRef<MeshLineMaterial | null>(null);
	const meshLineInner = useRef<MeshLine | null>(null);
	const materialInner = useRef<MeshLineMaterial | null>(null);

	// Outer
	useEffect(() => {
		if (meshLineOuter.current) meshLineOuter.current.geometry.dispose();
		if (materialOuter.current) materialOuter.current.dispose();
		const line = new MeshLine();
		line.setPoints(points);
		const mat = new MeshLineMaterial({ color: '#222', lineWidth: 0.007, sizeAttenuation: false, depthTest: false });
		meshLineOuter.current = line;
		materialOuter.current = mat;
		return () => {
			line.geometry.dispose();
			mat.dispose();
		};
	}, [points]);

	// Inner
	useEffect(() => {
		if (meshLineInner.current) meshLineInner.current.geometry.dispose();
		if (materialInner.current) materialInner.current.dispose();
		const line = new MeshLine();
		line.setPoints(points);
		const mat = new MeshLineMaterial({ color: '#ffff00', lineWidth: 0.005, sizeAttenuation: false });
		meshLineInner.current = line;
		materialInner.current = mat;
		return () => {
			line.geometry.dispose();
			mat.dispose();
		};
	}, [points]);

	// --- B787アニメーション制御 ---
	const totalDistance = useMemo(() => getTotalDistance(pointsArr), [pointsArr]);
	const speed = 0.2; // 1単位あたり5秒（例: 0.2単位/秒）
	const duration = totalDistance / speed;
	const [progress, setProgress] = useState(0);
	useFrame((state, delta) => {
		setProgress((prev) => {
			const next = prev + delta / duration;
			return next >= 1 ? 0 : next;
		});
	});
	// 滑らかな補間位置・向き
	const seg = progress * (pointsArr.length - 1); // FYI: ARC_SEGMENTS === pointsArr.length - 1
	const idx = Math.floor(seg);
	const t = seg - idx;
	const curr = pointsArr[idx];
	const next = pointsArr[Math.min(idx + 1, pointsArr.length - 1)];
	// 位置補間（線形）
	const pos: Position = [
		curr[0] + (next[0] - curr[0]) * t,
		curr[1] + (next[1] - curr[1]) * t,
		curr[2] + (next[2] - curr[2]) * t,
	];

	// 進行方向ベクトル（補間位置→次点）
	const dirVec = new Vector3(next[0] - curr[0], next[1] - curr[1], next[2] - curr[2]).normalize();
	// 地表方向ベクトル（補間位置→中心）
	const downVec = new Vector3(pos[0], pos[1], pos[2]).normalize();
	// 進行方向（Z-）・地表側（Y+）に合わせた回転行列
	const quaternion = (() => {
		const forward = dirVec;
		const up = downVec;
		const right = new Vector3().crossVectors(up, forward).normalize();
		const m = new Matrix4();
		m.makeBasis(right, up, forward);
		const q = new Quaternion().setFromRotationMatrix(m);
		return q;
	})();

	if (!meshLineOuter.current || !materialOuter.current || !meshLineInner.current || !materialInner.current) return null;

	return (
		<>
			<mesh>
				<bufferGeometry attach="geometry" {...meshLineOuter.current.geometry} />
				<primitive object={materialOuter.current} attach="material" />
			</mesh>
			<mesh>
				<bufferGeometry attach="geometry" {...meshLineInner.current.geometry} />
				<primitive object={materialInner.current} attach="material" />
			</mesh>
			{/* 軌道上にb787を表示 */}
			<B787 position={pos} quaternion={quaternion} />
		</>
	);
}

// 平面用: 直線
function FlightLine({ from, to }: { from: LatLng; to: LatLng }) {
	// from, to: [lat, lng]
	// 1. 球面上の大円弧緯度経度群を取得（分割数固定）
	const LINE_SEGMENTS = 128;
	const arcLatLngs = useMemo(() => getGreatCircleLatLngs(from, to, LINE_SEGMENTS), [from, to]);
	// 2. wrap判定: 経度が-180/180をまたぐ場合は分割
	const polylines: Position[][] = useMemo(() => {
		const lines: Position[][] = [];
		let currentLine: Position[] = [];
		for (let i = 0; i < arcLatLngs.length; i++) {
			const [lat, lng] = arcLatLngs[i];
			const pt = latLngToEquirectangular(lat, lng, 1);
			if (i > 0) {
				const prevLng = arcLatLngs[i - 1][1];
				// wrap判定: 経度差が180度以上なら分割
				if (Math.abs(lng - prevLng) > 180) {
					lines.push(currentLine);
					currentLine = [];
				}
			}
			currentLine.push(pt);
		}
		if (currentLine.length > 1) lines.push(currentLine);
		return lines;
	}, [arcLatLngs]);

	// 球体と違い、平面地図では世界一周する場合、地図の端で線が切れて2本必要となる。
	// 0と1に分けて管理する
	const lineMeshLineOuter0 = useRef<MeshLine | null>(null);
	const lineMaterialOuter0 = useRef<MeshLineMaterial | null>(null);
	const lineMeshLineInner0 = useRef<MeshLine | null>(null);
	const lineMaterialInner0 = useRef<MeshLineMaterial | null>(null);
	const lineMeshLineOuter1 = useRef<MeshLine | null>(null);
	const lineMaterialOuter1 = useRef<MeshLineMaterial | null>(null);
	const lineMeshLineInner1 = useRef<MeshLine | null>(null);
	const lineMaterialInner1 = useRef<MeshLineMaterial | null>(null);

	useEffect(() => {
		// 生成前に前回分をdispose
		[
			lineMeshLineOuter0,
			lineMaterialOuter0,
			lineMeshLineInner0,
			lineMaterialInner0,
			lineMeshLineOuter1,
			lineMaterialOuter1,
			lineMeshLineInner1,
			lineMaterialInner1
		].forEach(ref => {
			if (ref.current) {
				if ('geometry' in ref.current) ref.current.geometry.dispose();
				if ('dispose' in ref.current) ref.current.dispose();
			}
		});

		if (polylines.length > 0) {
			const points = polylines[0].flat();
			const meshLineOuter = new MeshLine();
			meshLineOuter.setPoints(points);
			const materialOuter = new MeshLineMaterial({ color: '#222', lineWidth: 0.007, sizeAttenuation: false, depthTest: false });
			const meshLineInner = new MeshLine();
			meshLineInner.setPoints(points);
			const materialInner = new MeshLineMaterial({ color: '#ffff00', lineWidth: 0.005, sizeAttenuation: false });
			lineMeshLineOuter0.current = meshLineOuter;
			lineMaterialOuter0.current = materialOuter;
			lineMeshLineInner0.current = meshLineInner;
			lineMaterialInner0.current = materialInner;
		}
		if (polylines.length > 1) {
			const points = polylines[1].flat();
			const meshLineOuter = new MeshLine();
			meshLineOuter.setPoints(points);
			const materialOuter = new MeshLineMaterial({ color: '#222', lineWidth: 0.007, sizeAttenuation: false, depthTest: false });
			const meshLineInner = new MeshLine();
			meshLineInner.setPoints(points);
			const materialInner = new MeshLineMaterial({ color: '#ffff00', lineWidth: 0.005, sizeAttenuation: false });
			lineMeshLineOuter1.current = meshLineOuter;
			lineMaterialOuter1.current = materialOuter;
			lineMeshLineInner1.current = meshLineInner;
			lineMaterialInner1.current = materialInner;
		}
		return () => {
			[
				lineMeshLineOuter0,
				lineMaterialOuter0,
				lineMeshLineInner0,
				lineMaterialInner0,
				lineMeshLineOuter1,
				lineMaterialOuter1,
				lineMeshLineInner1,
				lineMaterialInner1
			].forEach(ref => {
				if (ref.current) {
					if ('geometry' in ref.current) ref.current.geometry.dispose();
					if ('dispose' in ref.current) ref.current.dispose();
				}
			});
		};
	}, [polylines]);

	// --- B787アニメーション制御（直線上） ---
	// すべてのpolylinesを連結した座標列と、各polylineの開始インデックスを作成
	const polylineStartIdxs = useMemo(() => {
		const idxs: number[] = [];
		let acc = 0;
		for (const line of polylines) {
			idxs.push(acc);
			acc += line.length;
		}
		return idxs;
	}, [polylines]);
	const allPointsArr: Position[] = useMemo(() => polylines.flat(), [polylines]);
	// 線の長さに応じてdurationを決定（速度: 1単位/秒）
	const totalDistance = useMemo(() => getTotalDistance(allPointsArr), [allPointsArr]);
	const speed = 0.2; // 1単位あたり5秒（例: 0.2単位/秒）
	const duration = totalDistance / speed;
	const [progress, setProgress] = useState(0);
	useFrame((state, delta) => {
		setProgress((prev) => {
			const next = prev + delta / duration;
			return next >= 1 ? 0 : next;
		});
	});
	// 滑らかな補間位置・向き（wrap部分はジャンプ）
	const seg = progress * (allPointsArr.length - 1);
	const idx = Math.floor(seg);
	let t = seg - idx;
	// wrap部分判定: polylineの開始インデックスに該当したらジャンプ
	const isWrapJump = polylineStartIdxs.includes(idx + 1);
	let curr = allPointsArr[idx];
	const next = allPointsArr[Math.min(idx + 1, allPointsArr.length - 1)];
	let pos: Position;
	if (isWrapJump) {
		// wrap部分はジャンプ
		pos = next;
		t = 0;
		curr = next;
	} else {
		// 位置補間（線形）
		pos = [
			curr[0] + (next[0] - curr[0]) * t,
			curr[1] + (next[1] - curr[1]) * t,
			curr[2] + (next[2] - curr[2]) * t,
		];
	}
	// 進行方向ベクトル（補間位置→次点）
	const dirVec = new Vector3(next[0] - curr[0], next[1] - curr[1], next[2] - curr[2]).normalize();
	// 地表方向ベクトル（補間位置→中心）
	const downVec = new Vector3(0, 0, 1); // 平面なのでZ+が地表方向
	// 進行方向（Z-）・地表側（Y+）に合わせた回転行列
	const quaternion = ( () => {
		const forward = dirVec;
		const up = downVec;
		const right = new Vector3().crossVectors(up, forward).normalize();
		const m = new Matrix4();
		m.makeBasis(right, up, forward);
		const q = new Quaternion().setFromRotationMatrix(m);
		return q;
	} )();

	if ((polylines.length > 2) ||
		(polylines.length > 0 && (!lineMeshLineOuter0.current || !lineMaterialOuter0.current || !lineMeshLineInner0.current || !lineMaterialInner0.current)) ||
		(polylines.length > 1 && (!lineMeshLineOuter1.current || !lineMaterialOuter1.current || !lineMeshLineInner1.current || !lineMaterialInner1.current))
	) return null;

	// 3. 各polylineを描画
	return (
		<>
			{polylines.length > 0 && (
				<Fragment key={0}>
					<mesh>
						<bufferGeometry attach="geometry" {...lineMeshLineOuter0.current!.geometry} />
						<primitive object={lineMaterialOuter0.current!} attach="material" />
					</mesh>
					<mesh>
						<bufferGeometry attach="geometry" {...lineMeshLineInner0.current!.geometry} />
						<primitive object={lineMaterialInner0.current!} attach="material" />
					</mesh>
				</Fragment>
			)}
			{polylines.length > 1 && (
				<Fragment key={1}>
					<mesh>
						<bufferGeometry attach="geometry" {...lineMeshLineOuter1.current!.geometry} />
						<primitive object={lineMaterialOuter1.current!} attach="material" />
					</mesh>
					<mesh>
						<bufferGeometry attach="geometry" {...lineMeshLineInner1.current!.geometry} />
						<primitive object={lineMaterialInner1.current!} attach="material" />
					</mesh>
				</Fragment>
			)}
			{/* 直線上にb787を表示 */}
			<B787 position={pos} quaternion={quaternion} />
		</>
	);
}

interface Globe3DProps {
	dest?: LatLng;
};

export const Globe3D = ( { dest }: Globe3DProps ) => {

	const cameraControlsRef = useRef<CameraControls>(null);
	// カメラ位置: 地球の中心から東京方向の延長線上
	const cameraPos = getSphericalPositionFromLatLng( ...TOKYO_LAT_LNG, 2 );
	const [ isSphere, setIsSphere ] = useState( true );
	const [ progress, setProgress ] = useState( 1 ); // 1:球体, 0:平面

	// isSphereに応じて、progressをアニメーションで変更
	// AI サジェスト。useEffect の中で高頻度に state 書き換えててつらい...
	useEffect( () => {
		let frame: number;
		const animate = () => {
			setProgress( ( prev ) => {
				if ( isSphere && prev < 1 ) return Math.min( prev + 0.08, 1 );
				if ( ! isSphere && prev > 0 ) return Math.max( prev - 0.08, 0 );
				return prev;
			} );
			frame = requestAnimationFrame( animate );
		};
		animate();
		return () => cancelAnimationFrame( frame );
	}, [ isSphere ] );

	// 緯度経度をそのまま渡す
	const tokyo = TOKYO_LAT_LNG;

	return (
		<div className="relative w-full h-full">
			<button
				className="top-2 right-2 z-10 absolute bg-white shadow px-3 py-1 rounded text-sm"
				onClick={ async () => {

					// 形状モードの変更に応じて、CameraControlsの設定を変更
					// - 球体: 東京を中心に表示。minDistance: 1.2, maxDistance: 4
					// - 平面: 回転をリセットし、板ポリを正面に表示。板ポリ地図全体をfitさせる。回転無効
					const controls = cameraControlsRef.current;
					if ( ! controls ) return;

					if ( isSphere ) {
						controls.setTarget( 0, 0, 0, true );
						controls.rotateTo( 0, Math.PI / 2, true );
						await wait( 300 );
						setIsSphere( () => false );

						const rectWidth = 2;
						const rectHeight = 1;
						const distance = controls.getDistanceToFitBox( rectWidth, rectHeight, 0 );
						controls.minDistance = .1;
						controls.maxDistance = distance;
						await controls.dollyTo( distance, true );

						controls.dollyToCursor = true;
						controls.minAzimuthAngle = controls.maxAzimuthAngle = 0;
						controls.minPolarAngle = controls.maxPolarAngle = Math.PI / 2;

						return;

					} else {

						setIsSphere( () => true );
						const tokyoSpherical = getSphericalPositionFromLatLng( ...TOKYO_LAT_LNG, 2 );
						controls.dollyToCursor = false;
						controls.minAzimuthAngle = - Infinity;
						controls.maxAzimuthAngle = Infinity;
						controls.minPolarAngle = 0;
						controls.maxPolarAngle = Math.PI;
						controls.minDistance = 1.2;
						controls.maxDistance = 3;
						controls.setTarget( 0, 0, 0, true );
						controls.setPosition( ...tokyoSpherical, true );
					}

				} }
			>
				{ isSphere ? "地図に切替" : "地球儀に切替" }
			</button>
			<Canvas
				camera={{ position: cameraPos }}
				className="w-full h-full"
				onCreated={( { gl } ) => {
					gl.setClearColor( 0x000000 );
				} }
			>
				<EarthMorph progress={ progress } />
				{/* 軌道描画（球体:大円弧, 平面:直線） */}
				{ dest && ( isSphere
					? <FlightArc from={ tokyo } to={ dest } />
					: <FlightLine from={ tokyo } to={ dest } />
				)}
				{/* CameraControls: 日本（東京）が正面に来るよう初期角度を調整 */}
				<CameraControls
					ref={ cameraControlsRef }
					minDistance={ 1.2 }
					maxDistance={ 3 }
				/>
			</Canvas>
		</div>
	);
}



function B787( { position, quaternion }: { position: Position; quaternion: Quaternion } ) {
	// https://www.turbosquid.com/ja/3d-models/free-boeing-787-8-1-3d-model/858876
	const gltf = useLoader( GLTFLoader, '/b787.glb' );

	// ライト未設定環境のため、マテリアルをMeshBasicMaterialに置換
	gltf.scene.traverse( ( obj: Object3D ) => {
		if ( 'isMesh' in obj && 'material' in obj ) {
			const oldMat = obj.material as MeshPhysicalMaterial;
			obj.material = new MeshBasicMaterial( {
				map: oldMat.map ?? undefined,
				color: oldMat.color ?? 0xffffff,
				transparent: oldMat.transparent ?? false,
				opacity: oldMat.opacity ?? 1,
			} );
		}
	} );

	const scale = .0015;
	return (
		<primitive object={ gltf.scene } position={ position } quaternion={ quaternion } scale={ [ scale, scale, scale ] } />
	);
}

// polyline の総距離を計算
function getTotalDistance( points: Position[] ): number {

	let dist = 0;

	for ( let i = 1; i < points.length; i ++ ) {

		const dx = points[ i ][ 0 ] - points[ i - 1][ 0 ];
		const dy = points[ i ][ 1 ] - points[ i - 1][ 1 ];
		const dz = points[ i ][ 2 ] - points[ i - 1][ 2 ];
		dist += Math.sqrt( dx * dx + dy * dy + dz * dz );

	}

	return dist;
}
