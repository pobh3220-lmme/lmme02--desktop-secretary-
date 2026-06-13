import React from 'react'
import { Tangyuan } from '../../assets/pets/tangyuan'
import { Cloud } from '../../assets/pets/cloud'
import { Sprite } from '../../assets/pets/sprite'
import type { PetAnimState } from '../../store/petStore'
import type { PetCharacter as PetCharacterType } from '../../../../shared/types/index'

interface Props {
  character: PetCharacterType
  animState: PetAnimState
  urgentCount: number
}

// Task 4.2 / 4.13 — 按当前角色渲染对应 SVG 组件
export function PetCharacter({ character, animState, urgentCount }: Props) {
  switch (character) {
    case 'cloud':
      return <Cloud animState={animState} urgentCount={urgentCount} />
    case 'sprite':
      return <Sprite animState={animState} urgentCount={urgentCount} />
    case 'tangyuan':
    default:
      return <Tangyuan animState={animState} urgentCount={urgentCount} />
  }
}
