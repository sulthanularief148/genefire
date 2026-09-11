/*
  GENERATED — do not edit.
  Source: public/models/sx100.glb
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
    sx100_body_0: THREE.Mesh
    sx100_body_1: THREE.Mesh
  }
  materials: {
    GF_RedAnodized: THREE.MeshStandardMaterial
    GF_BlackPolymer: THREE.MeshStandardMaterial
  }
}

export function SX100(props: ThreeElements['group']) {
  const { nodes, materials } = useGLTF('/models/sx100.glb') as unknown as GLTFResult
  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes.sx100_body_0.geometry} material={materials.GF_RedAnodized} />
      <mesh geometry={nodes.sx100_body_1.geometry} material={materials.GF_BlackPolymer} />
      <ProductDecals id="sx100" />
    </group>
  )
}

useGLTF.preload('/models/sx100.glb')

