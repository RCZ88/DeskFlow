/**
 * InstancedBuildings.tsx — Phase A R3F layer.
 *
 * Renders the 7 real building GLBs as GPU instances, replacing the old
 * BoxGeometry InstanceBuildings. One InstancedMesh is created per GLB submesh;
 * every building lot that uses that model becomes one instance.
 *
 * Fitting is measured, not guessed: each model's bounding box is computed once
 * with Box3().setFromObject, then every instance is scaled so the model's
 * footprint/height match the lot's `fit` dimensions from buildScene.ts, and
 * translated so the model base sits on the terrain at `position`.
 *
 * ⚠️ NOT render-verified in the sandbox (no GPU / no three deps there). The
 * data math is straightforward and mirrors the Node-tested buildScene output,
 * but eyeball it in the app after dropping it in. Phase B replaces the GLB
 * materials with the dark PBR + emissive 2a–2h window layer.
 */

import { useGLTF } from "@react-three/drei"
import { useLayoutEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { ALL_BUILDING_MODEL_URLS, type BuildingInstance } from "./buildScene"

// Preload all building GLBs so Phase A pops in without a stall.
for (const url of ALL_BUILDING_MODEL_URLS) useGLTF.preload(url)

interface SubmeshDef {
	geometry: THREE.BufferGeometry
	material: THREE.Material | THREE.Material[]
	/** model-local matrix already composed with the normalize transform */
	base: THREE.Matrix4
}

/** Instances of a single building GLB model. */
function ModelInstances({
	url,
	instances,
}: {
	url: string
	instances: BuildingInstance[]
}) {
	const { scene } = useGLTF(url)

	// Measure the GLB once and pre-compose each submesh's normalize matrix so
	// the model is centered on XZ and its base sits at y = 0.
	const { submeshes, size } = useMemo(() => {
		scene.updateWorldMatrix(true, true)
		const box = new THREE.Box3().setFromObject(scene)
		const sz = new THREE.Vector3()
		const center = new THREE.Vector3()
		box.getSize(sz)
		box.getCenter(center)
		// translate model so (centerX, baseY, centerZ) -> origin
		const normalize = new THREE.Matrix4().makeTranslation(
			-center.x,
			-box.min.y,
			-center.z,
		)
		const out: SubmeshDef[] = []
		scene.traverse((obj) => {
			const mesh = obj as THREE.Mesh
			if (!mesh.isMesh || !mesh.geometry) return
			const base = new THREE.Matrix4()
				.copy(normalize)
				.multiply(mesh.matrixWorld)
			out.push({ geometry: mesh.geometry, material: mesh.material, base })
		})
		// guard against a degenerate box (avoid divide-by-zero scale)
		const safe = (n: number) => (Math.abs(n) < 1e-4 ? 1 : n)
		return {
			submeshes: out,
			size: new THREE.Vector3(safe(sz.x), safe(sz.y), safe(sz.z)),
		}
	}, [scene])

	return (
		<>
			{submeshes.map((sm, i) => (
				<SubmeshInstanced
					key={i}
					submesh={sm}
					size={size}
					instances={instances}
				/>
			))}
		</>
	)
}

function SubmeshInstanced({
	submesh,
	size,
	instances,
}: {
	submesh: SubmeshDef
	size: THREE.Vector3
	instances: BuildingInstance[]
}) {
	const ref = useRef<THREE.InstancedMesh>(null)

	useLayoutEffect(() => {
		const mesh = ref.current
		if (!mesh) return
		const m = new THREE.Matrix4()
		const inst = new THREE.Matrix4()
		const pos = new THREE.Vector3()
		const quat = new THREE.Quaternion()
		const scl = new THREE.Vector3()
		const up = new THREE.Vector3(0, 1, 0)

		for (let i = 0; i < instances.length; i++) {
			const b = instances[i]
			// fit = desired final [w, h, d]; divide by measured native size
			scl.set(b.fit[0] / size.x, b.fit[1] / size.y, b.fit[2] / size.z)
			quat.setFromAxisAngle(up, b.rotationY)
			pos.set(b.position[0], b.position[1], b.position[2])
			inst.compose(pos, quat, scl)
			// final = instanceTransform * normalizedSubmeshBase
			m.multiplyMatrices(inst, submesh.base)
			mesh.setMatrixAt(i, m)
		}
		mesh.instanceMatrix.needsUpdate = true
		mesh.computeBoundingSphere()
	}, [submesh, size, instances])

	return (
		<instancedMesh
			ref={ref}
			args={[submesh.geometry, undefined as never, instances.length]}
			material={submesh.material}
			castShadow
			receiveShadow
			frustumCulled={false}
		/>
	)
}

export function InstancedBuildings({
	buildings,
}: {
	buildings: BuildingInstance[]
}) {
	// group instances by model so each GLB yields its own InstancedMesh set
	const groups = useMemo(() => {
		const map = new Map<string, BuildingInstance[]>()
		for (const b of buildings) {
			const arr = map.get(b.modelUrl)
			if (arr) arr.push(b)
			else map.set(b.modelUrl, [b])
		}
		return [...map.entries()]
	}, [buildings])

	return (
		<>
			{groups.map(([url, instances]) => (
				<ModelInstances key={url} url={url} instances={instances} />
			))}
		</>
	)
}

export default InstancedBuildings
