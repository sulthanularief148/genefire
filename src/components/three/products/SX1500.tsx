/*
  GENERATED — do not edit.
  Source: public/models/sx1500.glb
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
    sx1500_body_0: THREE.Mesh
    sx1500_body_1: THREE.Mesh
    sx1500_bracket_5: THREE.Mesh
  }
  materials: {
    GF_Stainless: THREE.MeshStandardMaterial
    GF_BlackPolymer: THREE.MeshStandardMaterial
    GF_Bracket: THREE.MeshStandardMaterial
  }
}

export function SX1500(props: ThreeElements['group']) {
  const { nodes, materials } = useGLTF('/models/sx1500.glb') as unknown as GLTFResult
  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes.sx1500_body_0.geometry} material={materials.GF_Stainless} />
      <mesh geometry={nodes.sx1500_body_1.geometry} material={materials.GF_BlackPolymer} />
      <mesh geometry={nodes.sx1500_bracket_5.geometry} material={materials.GF_Bracket} />
      <ProductDecals id="sx1500" />
    </group>
  )
}

useGLTF.preload('/models/sx1500.glb')

