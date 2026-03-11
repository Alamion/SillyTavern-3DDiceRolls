export interface DiceModifiers {
    keepHighest?: number
    keepLowest?: number
    dropHighest?: number
    dropLowest?: number
    explode?: number
    reroll?: number
    sort?: 'asc' | 'desc'
}

export interface DiceGroup {
    count: number
    sides: number
    modifiers: DiceModifiers
}

export interface ParsedExpression {
    type: 'dice' | 'number'
    value: DiceGroup | number
    operation: '+' | '-'
}

export interface ParseResult {
    expressions: ParsedExpression[]
    original: string
}

export interface DiceRoll {
    sides: number
    value: number
    dropped: boolean
    exploded?: boolean
}

export interface DiceGroupResult {
    notation: string
    sides: number
    rolls: DiceRoll[]
    keptRolls: DiceRoll[]
    droppedRolls: DiceRoll[]
    sum: number
    operation: '+' | '-'
}

export interface FullRollResult {
    notation: string
    diceGroups: DiceGroupResult[]
    total: number
    details: string
    formatted: string
}

export interface RollResult {
    notation: string
    diceGroups: DiceGroupResult[]
    total: number
    details: string
    formatted: string
}
