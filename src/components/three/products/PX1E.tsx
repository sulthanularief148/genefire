/*
  GENERATED — do not edit.
  Source: public/models/px1e.glb
  Regenerate: node scripts/gen-product-components.mjs

  Origin is base centre, +Y up, metres. No scale correction belongs in JSX.
*/

import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import type { ThreeElements } from '@react-three/fiber'
import { GLTF } from 'three-stdlib'

import { ProductDecals } from '../ProductDecals'

type GLTFResult = GLTF & {
  nodes: {
    px1e_body_0: THREE.Mesh
    px1e_body_1: THREE.Mesh
    px1e_body_2: THREE.Mesh
  }
  materials: {
    GF_RedAnodized: THREE.MeshStandardMaterial
    GF_Grip: THREE.MeshStandardMaterial
    GF_BlackPolymer: THREE.MeshStandardMaterial
  }
}

export function PX1E(props: ThreeElements['group']) {
  const { nodes, materials } = useGLTF('/models/px1e.glb') as unknown as GLTFResult
  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes.px1e_body_0.geometry} material={materials.GF_RedAnodized} />
      <mesh geometry={nodes.px1e_body_1.geometry} material={materials.GF_Grip} />
      <mesh geometry={nodes.px1e_body_2.geometry} material={materials.GF_BlackPolymer} />
      <ProductDecals id="px1e" />
    </group>
  )
}

useGLTF.preload('/models/px1e.glb')

